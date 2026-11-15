"""Host orchestration tests with a Docker protocol stub, not a container test."""

import json
import os
import shutil
import subprocess
import sys
import tempfile
import unittest
from pathlib import Path

DEPLOY = Path(__file__).resolve().parent
DOCKER = DEPLOY.parent / "docker"
BACKEND = (DOCKER.parent / "app").is_dir()

STUB = r"""
import json, os, subprocess, sys
from pathlib import Path
args = sys.argv[1:]
with open(os.environ["DOCKER_TEST_LOG"], "a") as output:
    output.write(json.dumps(args) + "\n")
if args[:2] == ["network", "inspect"] and "--format" in args:
    print("172.25.0.0/16,")
if args and args[0] == "run":
    mounts = [args[i+1] for i, arg in enumerate(args) if arg == "--mount"]
    targets = [next(p for p in mount.split(",") if p.startswith("target=")) for mount in mounts]
    assert len(targets) == len(set(targets)), targets
    assert all("docker.sock" not in mount for mount in mounts)
    script = next((i for i, arg in enumerate(args) if arg.endswith("/bootstrap.py")), None)
    if script is not None:
        raise SystemExit(subprocess.call([sys.executable, *args[script:]]))
if args and args[0] == "compose":
    failure = os.environ.get("DOCKER_TEST_FAIL")
    if failure and failure in args:
        raise SystemExit(23)
    if "builder" in args:
        pos = args.index("builder")
        if args[pos+1] == "build":
            target = Path(os.environ["DOCKER_TEST_OUTPUT"]) / args[pos+2] / ".next"
            target.mkdir(parents=True)
            (target / "BUILD_ID").write_text("built")
        elif args[pos+1] == "build-plugins":
            target = Path(os.environ["FRONTEND_PLUGIN_OUTPUT_DIR"]) / "test-plugin"
            target.mkdir(parents=True)
            (target / "manifest.json").write_text('{"id":"test-plugin"}')
"""


class LauncherTests(unittest.TestCase):
    def setUp(self):
        temporary = tempfile.TemporaryDirectory(prefix="everunfold-launcher-")
        self.addCleanup(temporary.cleanup)
        self.root = Path(temporary.name)
        self.repo = self.root / "source with spaces"
        self.docker = self.repo / "docker"
        shutil.copytree(
            DOCKER,
            self.docker,
            ignore=shutil.ignore_patterns(
                ".venv", "__pycache__", "data", "output", "runtime.env", ".env"
            ),
        )
        shutil.copytree(
            DEPLOY, self.repo / "deploy", ignore=shutil.ignore_patterns(".venv", "__pycache__")
        )
        shutil.copy2(DEPLOY.parent / "setup.sh", self.repo / "setup.sh")
        if BACKEND:
            (self.repo / "app").mkdir()
        self.bin = self.root / "bin"
        self.bin.mkdir()
        stub = self.bin / "docker"
        stub.write_text("#!" + sys.executable + "\n" + STUB)
        stub.chmod(0o755)
        self.data = self.root / "external data"
        self.data.mkdir()
        self.output = self.root / "external output"
        self.log = self.root / "calls.jsonl"
        prefix = "BACKEND" if BACKEND else "FRONTEND"
        # ENV_FILE's parent equals the source mount: must not add a duplicate target.
        (self.docker / ".env").write_text(
            f"{prefix}_DATA_DIR='{self.data}'\n"
            f"{prefix}_ENV_FILE='../runtime.env'\n"
            f"FRONTEND_OUTPUT_DIR='{self.output}'\n"
            "FRONTEND_ARTIFACT_DIR='./previous'\n"
        )
        self.env = {
            **os.environ,
            "PATH": str(self.bin) + ":" + os.environ["PATH"],
            "DOCKER_TEST_LOG": str(self.log),
            "DOCKER_TEST_OUTPUT": str(self.output),
        }
        if not BACKEND:
            (self.data / "profiles").mkdir()
            (self.data / "config.toml").write_text(
                'backend_node_file = "/data/profiles/backend.toml"\n'
            )
            (self.data / "profiles/backend.toml").write_text('active="test"\n[profiles.test]\n')

    def run_action(self, action, failure=None):
        environment = dict(self.env)
        if failure:
            environment["DOCKER_TEST_FAIL"] = failure
        result = subprocess.run(
            [str(self.repo / "setup.sh"), "--docker", action],
            env=environment,
            capture_output=True,
            text=True,
        )
        calls = [json.loads(line) for line in self.log.read_text().splitlines()]
        return result, calls

    def test_build_then_start_without_rebuilding(self):
        result, calls = self.run_action("build")
        self.assertEqual(result.returncode, 0, result.stderr)
        self.assertTrue(any("build" in call and call[0] == "compose" for call in calls))
        self.assertFalse(any("up" in call for call in calls))
        if not BACKEND:
            self.assertIn("release-", (self.docker / ".env").read_text())
            self.assertTrue((self.data / "plugins/test-plugin/manifest.json").exists())
        self.log.write_text("")
        result, calls = self.run_action("start")
        self.assertEqual(result.returncode, 0, result.stderr)
        self.assertFalse(any("build" in call or "build-plugins" in call for call in calls))
        self.assertTrue(any("up" in call for call in calls))

    def test_failure_stops_before_activation_or_initialization(self):
        before = (self.docker / ".env").read_bytes()
        action = "init-db" if BACKEND else "deploy"
        failure = "--require-empty" if BACKEND else "build-plugins"
        result, calls = self.run_action(action, failure)
        self.assertEqual(result.returncode, 23, result.stderr)
        self.assertEqual((self.docker / ".env").read_bytes(), before)
        self.assertFalse(any("up" in call or "init.database.py" in call for call in calls))

    def test_failed_runtime_check_does_not_start(self):
        failure = "deploy/runtime_check.py" if BACKEND else "/usr/local/lib/everunfold-check.mjs"
        result, calls = self.run_action("start", failure)
        self.assertEqual(result.returncode, 23, result.stderr)
        self.assertFalse(any("up" in call for call in calls))


if __name__ == "__main__":
    unittest.main()
