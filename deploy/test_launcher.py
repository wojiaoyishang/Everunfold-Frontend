"""Host orchestration tests with a Docker protocol stub, not a container test."""

import json
import os
import shutil
import subprocess
import sys
import tempfile
import unittest
from pathlib import Path

import yaml

DEPLOY = Path(__file__).resolve().parent
DOCKER = DEPLOY.parent / "docker"
BACKEND = (DOCKER.parent / "app").is_dir()

STUB = r"""
import json, os, subprocess, sys
from pathlib import Path
args = sys.argv[1:]
log = Path(os.environ["DOCKER_TEST_LOG"])
with log.open("a") as output:
    output.write(json.dumps(args) + "\n")
statefile = log.with_suffix(".state")
state = json.loads(statefile.read_text()) if statefile.exists() else {"next": 0, "containers": {}}
containers = state["containers"]
def save(): statefile.write_text(json.dumps(state))
def execute(arguments):
    failure = os.environ.get("DOCKER_TEST_FAIL")
    if failure and failure in arguments: return 23
    script = next((i for i, arg in enumerate(arguments) if arg.endswith("/bootstrap.py")), None)
    if script is not None:
        return subprocess.call([sys.executable, *arguments[script:]])
    return 0
if args[:2] == ["network", "inspect"] and "--format" in args:
    print("172.25.0.0/16,")
if args[:2] == ["network", "connect"]:
    containers[args[-1]]["networks"].append(args[-2]); save()
if args[0] in {"run", "create"}:
    mounts = [args[i+1] for i, arg in enumerate(args) if arg == "--mount"]
    targets = [next(p for p in mount.split(",") if p.startswith("target=")) for mount in mounts]
    assert len(targets) == len(set(targets)), targets
    assert all("docker.sock" not in mount for mount in mounts)
    assert args.count("--network") == 1
    if args[0] == "run": raise SystemExit(execute(args))
    state["next"] += 1
    name = args[args.index("--name")+1] if "--name" in args else "temp-"+str(state["next"])
    containers[name] = {"args": args, "status": 0, "networks": [args[args.index("--network")+1]]}
    save(); print(name)
if args[0] == "start":
    target = args[-1]
    container = containers[target]
    assert container["networks"] == ["bridge", "1panel-network"], container
    if "--attach" in args:
        container["status"] = execute(container["args"]); save()
        raise SystemExit(container["status"])
    print(target)
if args[0] == "inspect":
    if args[-1] in containers:
        print(containers[args[-1]]["status"])
    elif os.environ.get("DOCKER_TEST_OLD"):
        expression = args[args.index("--format")+1]
        matching = os.environ["DOCKER_TEST_OLD"] == "matching"
        if "Labels" in expression: print("another-project")
        elif '"/workspace"' in expression:
            print(os.environ["DOCKER_TEST_WORKSPACE"] if matching else "/other/source")
        elif '"/data"' in expression:
            print(os.environ["DOCKER_TEST_DATA"] if matching else "/other/data")
    else: raise SystemExit(1)
if args[:2] == ["container", "inspect"]:
    raise SystemExit(0 if args[-1] in containers or os.environ.get("DOCKER_TEST_OLD") else 1)
if args[0] == "rm":
    containers.pop(args[-1], None); save()
if args[0] == "compose":
    failure = os.environ.get("DOCKER_TEST_FAIL")
    if failure and failure in args: raise SystemExit(23)
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
                ".venv", "__pycache__", "data", "output", "runtime.env*", ".env*"
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
        self.output = self.root / "external output"
        self.artifact = self.output / "previous"
        if not BACKEND:
            (self.artifact / ".next").mkdir(parents=True)
            (self.artifact / ".next/BUILD_ID").write_text("previous")
        self.log = self.root / "calls.jsonl"
        prefix = "BACKEND" if BACKEND else "FRONTEND"
        document = {
            "version": 1,
            "component": prefix.lower(),
            "application": {},
            "assistant": {},
            "environment": {"SPECIAL_VALUE": "literal-$$-'quote'"},
            "docker": {
                prefix + "_SOURCE_DIR": str(self.repo),
                prefix + "_DATA_DIR": str(self.data),
                prefix + "_ENV_FILE": "../runtime.env",
                prefix + "_CONTAINER_NAME": "custom-everunfold",
                prefix + "_BIND_ADDRESS": "0.0.0.0",
                prefix + "_PUBLISH_PORT": "3434",
                "EVERUNFOLD_NETWORK": "bridge",
                "EVERUNFOLD_EXTRA_NETWORKS": " 1panel-network ,bridge,1panel-network",
                "FRONTEND_OUTPUT_DIR": str(self.output),
                "FRONTEND_ARTIFACT_DIR": str(self.artifact),
            },
        }
        (self.repo / "config.yaml").write_text(yaml.safe_dump(document))
        self.env = {
            **os.environ,
            "PATH": str(self.bin) + ":" + os.environ["PATH"],
            "DOCKER_TEST_LOG": str(self.log),
            "DOCKER_TEST_OUTPUT": str(self.output),
            "DOCKER_TEST_WORKSPACE": str(self.repo if BACKEND else self.artifact),
            "DOCKER_TEST_DATA": str(self.data),
        }

    def run_action(self, action, failure=None, old=None):
        environment = dict(self.env)
        if failure:
            environment["DOCKER_TEST_FAIL"] = failure
        if old:
            environment["DOCKER_TEST_OLD"] = old
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
        self.assertFalse(any("--name" in call for call in calls))
        if not BACKEND:
            self.assertIn("release-", (self.docker / ".env").read_text())
            self.assertTrue((self.data / "plugins/test-plugin/manifest.json").exists())
        self.log.write_text("")
        result, calls = self.run_action("start")
        self.assertEqual(result.returncode, 0, result.stderr)
        self.assertFalse(any("build" in call or "build-plugins" in call for call in calls))
        create = next(c for c in calls if c[0] == "create" and "--name" in c)
        self.assertIn("0.0.0.0:3434:" + ("8001" if BACKEND else "3000"), create)
        self.assertIn(f"type=bind,source={self.data},target=/data", create)
        config = (
            "CONFIG_FILE=/workspace/config.yaml"
            if BACKEND
            else "CONFIG_FILE=/workspace/config.runtime.toml"
        )
        self.assertIn(config, create)
        self.assertFalse((self.data / "config.toml").exists())
        self.assertLess(
            calls.index(["network", "connect", "1panel-network", "custom-everunfold"]),
            calls.index(["start", "custom-everunfold"]),
        )

    def test_root_process_port_controls_mapping_without_duplicate_edits(self):
        path = self.repo / "config.yaml"
        document = yaml.safe_load(path.read_text())
        document["environment"]["API_PORT" if BACKEND else "FRONTEND_PORT"] = "9201"
        document["docker"]["BACKEND_API_PORT" if BACKEND else "FRONTEND_WEB_PORT"] = "8001"
        path.write_text(yaml.safe_dump(document))
        result, calls = self.run_action("start")
        self.assertEqual(result.returncode, 0, result.stderr)
        create = next(c for c in calls if c[0] == "create" and "--name" in c)
        self.assertIn("0.0.0.0:3434:9201", create)
        self.assertIn("9201", (self.docker / ".env").read_text())

    def test_failure_stops_before_activation_or_initialization(self):
        before = (self.repo / "config.yaml").read_bytes()
        result, calls = self.run_action(
            "init-db" if BACKEND else "deploy", "--require-empty" if BACKEND else "build-plugins"
        )
        self.assertEqual(result.returncode, 23, result.stderr)
        self.assertEqual((self.repo / "config.yaml").read_bytes(), before)
        self.assertFalse(any("--name" in call or "init.database.py" in call for call in calls))

    def test_failed_runtime_check_does_not_stop_old_container(self):
        failure = "deploy/runtime_check.py" if BACKEND else "/usr/local/lib/everunfold-check.mjs"
        result, calls = self.run_action("start", failure, old="matching")
        self.assertEqual(result.returncode, 23, result.stderr)
        self.assertFalse(any("--name" in call or call[0] == "stop" for call in calls))

    def test_foreign_container_name_is_not_replaced(self):
        result, calls = self.run_action("start", old="foreign")
        self.assertNotEqual(result.returncode, 0)
        self.assertIn("同名容器", result.stderr)
        self.assertFalse(any(call[0] == "stop" for call in calls))

    def test_manual_container_with_matching_mounts_can_be_recreated(self):
        result, calls = self.run_action("start", old="matching")
        self.assertEqual(result.returncode, 0, result.stderr)
        stop = next(i for i, call in enumerate(calls) if call[0] == "stop")
        create = next(i for i, call in enumerate(calls) if "--name" in call)
        self.assertLess(stop, create)
        self.assertFalse(any("-v" in call for call in calls))


if __name__ == "__main__":
    unittest.main()
