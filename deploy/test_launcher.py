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
    if "deploy/node_bundle.py" in arguments:
        print("EVERUNFOLD_NODE_CONNECTION_BASE64=" + os.environ.get("DOCKER_TEST_BASE64", ""))
    return 0
if args[:2] == ["network", "inspect"] and "--format" in args:
    index = args.index("--format") + 1
    template = args[index]
    networks = json.loads(os.environ.get("DOCKER_TEST_IPAM", "{}"))
    for name in args[index + 1:]:
        network = networks.get(name, {"subnet": "172.25.0.0/16", "gateway": "172.25.0.1"})
        if ".Gateway" in template:
            bridge = network.get("driver", "bridge") == "bridge"
            value = network.get("gateway", "") if bridge else ""
        else:
            value = network.get("subnet", "")
        print(value + "," if value else "")
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
    expected = os.environ.get("DOCKER_TEST_NETWORKS", '["bridge", "1panel-network"]')
    assert container["networks"] == json.loads(expected), container
    if "--attach" in args:
        container["status"] = execute(container["args"]); save()
        raise SystemExit(container["status"])
    print(target)
if args[0] == "inspect":
    if args[-1] in containers:
        container = containers[args[-1]]
        expression = args[args.index("--format")+1]
        if "Labels" in expression:
            print(next(value.split("=", 1)[1] for value in container["args"]
                       if value.startswith("org.everunfold.project=")))
        elif ".Mounts" in expression:
            destination = "/workspace" if '"/workspace"' in expression else "/data"
            mounts = [container["args"][i+1] for i, arg in enumerate(container["args"])
                      if arg == "--mount"]
            mount = next(value for value in mounts if "target="+destination in value.split(","))
            print(next(value.split("=", 1)[1] for value in mount.split(",")
                       if value.startswith("source=")))
        else: print(container["status"])
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
        layout = yaml.safe_load((self.repo / "config.yaml").read_text())["docker"]
        networks = [
            layout["EVERUNFOLD_NETWORK"],
            *[v.strip() for v in layout["EVERUNFOLD_EXTRA_NETWORKS"].split(",") if v.strip()],
        ]
        environment["DOCKER_TEST_NETWORKS"] = json.dumps(list(dict.fromkeys(networks)))
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

    def test_custom_config_is_shared_with_runtime_without_a_shadow_copy(self):
        selected = self.root / "private config" / "selected.yaml"
        selected.parent.mkdir()
        document = yaml.safe_load((self.repo / "config.yaml").read_text())
        document["environment"]["API_PORT" if BACKEND else "FRONTEND_PORT"] = "3210"
        selected.write_text(yaml.safe_dump(document))
        self.env["CONFIG_FILE"] = str(selected)
        result, calls = self.run_action("start")
        self.assertEqual(result.returncode, 0, result.stderr)
        create = next(call for call in calls if call[0] == "create" and "--name" in call)
        self.assertIn("CONFIG_FILE=/config/selected.yaml", create)
        suffix = ",readonly" if BACKEND else ""
        self.assertIn(f"type=bind,source={selected.parent},target=/config{suffix}", create)
        self.assertIn("0.0.0.0:3434:3210", create)
        self.assertNotIn("3210", (self.repo / "config.yaml").read_text())
        self.assertIn(str(selected), result.stdout)

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
        config = "CONFIG_FILE=/config/config.yaml"
        suffix = ",readonly" if BACKEND else ""
        self.assertIn(f"type=bind,source={self.repo},target=/config{suffix}", create)
        if not BACKEND:
            self.assertNotIn("--env-file", create)
        self.assertEqual(create.count("-p"), 1)
        self.assertIn(config, create)
        self.assertFalse((self.data / "config.toml").exists())
        self.assertLess(
            calls.index(
                [
                    "network",
                    "connect",
                    "--alias",
                    "everunfold-" + ("backend" if BACKEND else "frontend"),
                    "1panel-network",
                    "custom-everunfold",
                ]
            ),
            calls.index(["start", "custom-everunfold"]),
        )

    def test_host_mapping_applies_to_tools_and_runtime_but_aliases_only_to_runtime(self):
        path = self.repo / "config.yaml"
        document = yaml.safe_load(path.read_text())
        document["docker"].update(
            EVERUNFOLD_HOST_GATEWAY="1", EVERUNFOLD_NETWORK_ALIAS="custom-node"
        )
        path.write_text(yaml.safe_dump(document))
        result, calls = self.run_action("start")
        self.assertEqual(result.returncode, 0, result.stderr)
        creates = [call for call in calls if call[0] == "create"]
        self.assertTrue(all("host.docker.internal:host-gateway" in call for call in creates))
        for call in calls:
            if call[:2] == ["network", "connect"]:
                self.assertEqual("--alias" in call, call[-1] == "custom-everunfold")
        runtime = next(call for call in creates if "--name" in call)
        self.assertTrue(
            any(
                value.startswith("EVERUNFOLD_INTERNAL_PEER_CIDRS=172.25.0.0/16")
                for value in runtime
            )
        )
        self.log.write_text("")
        document["docker"]["EVERUNFOLD_ALLOW_NETWORK_PEERS"] = "0"
        path.write_text(yaml.safe_dump(document))
        result, calls = self.run_action("start")
        self.assertEqual(result.returncode, 0, result.stderr)
        runtime = next(call for call in calls if call[0] == "create" and "--name" in call)
        self.assertIn("EVERUNFOLD_INTERNAL_PEER_CIDRS=", runtime)

    def test_custom_primary_network_registers_alias_only_on_application_create(self):
        path = self.repo / "config.yaml"
        document = yaml.safe_load(path.read_text())
        document["docker"].update(
            EVERUNFOLD_NETWORK="1panel-network", EVERUNFOLD_EXTRA_NETWORKS="bridge"
        )
        path.write_text(yaml.safe_dump(document))
        result, calls = self.run_action("start")
        self.assertEqual(result.returncode, 0, result.stderr)
        for call in calls:
            if call[0] == "create":
                self.assertEqual("--network-alias" in call, "--name" in call)
            if call[:2] == ["network", "connect"]:
                self.assertNotIn("--alias", call)  # Built-in bridge never receives aliases.

    def test_explicit_networks_resolve_on_each_start_and_keep_tls_separate_from_sync(self):
        path = self.repo / "config.yaml"
        document = yaml.safe_load(path.read_text())
        document["docker"].update(
            EVERUNFOLD_EXTRA_NETWORKS="1panel-network,edge",
            EVERUNFOLD_INTERNAL_PEER_NETWORKS=" 1panel-network , 1panel-network ",
            EVERUNFOLD_TLS_PROXY_NETWORK="edge",
            EVERUNFOLD_HOST_GATEWAY="1",
        )
        path.write_text(yaml.safe_dump(document))
        source = path.read_bytes()
        for peer_subnet, proxy_ip in (
            ("172.18.0.0/16", "172.22.0.1"),
            ("172.28.0.0/16", "172.30.0.1"),
        ):
            self.log.write_text("")
            self.env["DOCKER_TEST_IPAM"] = json.dumps(
                {
                    "bridge": {"subnet": "172.17.0.0/16", "gateway": "172.17.0.1"},
                    "1panel-network": {"subnet": peer_subnet},
                    "edge": {"subnet": proxy_ip.rsplit(".", 1)[0] + ".0/24", "gateway": proxy_ip},
                }
            )
            result, calls = self.run_action("start")
            self.assertEqual(result.returncode, 0, result.stderr)
            runtime = next(call for call in calls if call[0] == "create" and "--name" in call)
            self.assertIn(f"EVERUNFOLD_INTERNAL_PEER_CIDRS={peer_subnet},", runtime)
            self.assertIn(f"EVERUNFOLD_NODES_TLS_PROXY_IPS={proxy_ip},", runtime)
            self.assertIn(f"宿主机反代网络 edge → {proxy_ip}", result.stdout)
            self.assertEqual(path.read_bytes(), source)

    def test_unusable_proxy_network_does_not_stop_running_container(self):
        path = self.repo / "config.yaml"
        document = yaml.safe_load(path.read_text())
        for selected in ("detached", "1panel-network"):
            with self.subTest(selected=selected):
                self.log.write_text("")
                document["docker"]["EVERUNFOLD_TLS_PROXY_NETWORK"] = selected
                path.write_text(yaml.safe_dump(document))
                self.env["DOCKER_TEST_IPAM"] = (
                    '{"1panel-network":{"gateway":"172.18.0.1","driver":"overlay"}}'
                )
                result, calls = self.run_action("start", old="matching")
                self.assertNotEqual(result.returncode, 0)
                self.assertIn(selected, result.stderr)
                self.assertFalse(any(call[0] == "stop" for call in calls))

    @unittest.skipUnless(BACKEND, "backend export")
    def test_export_prints_base64_without_requiring_a_shared_connection_file(self):
        from config_copy import frontend_base64_import_command
        from connection_bundle import encode_bundle
        from test_configure import connection_bundle

        path = self.repo / "config.yaml"
        document = yaml.safe_load(path.read_text())
        document["assistant"] = {"node": "web-main"}
        path.write_text(yaml.safe_dump(document))
        encoded = encode_bundle(connection_bundle())
        self.env["DOCKER_TEST_BASE64"] = encoded
        result_file = self.root / "private-result"
        self.env["EVERUNFOLD_SETUP_RESULT_FILE"] = str(result_file)
        result, _ = self.run_action("export-node")
        self.assertEqual(result.returncode, 0, result.stderr)
        self.assertIn(encoded, result.stdout)
        self.assertIn(frontend_base64_import_command(False), result.stdout)
        self.assertEqual(result_file.read_text().strip(), encoded)
        self.assertEqual(result_file.stat().st_mode & 0o777, 0o600)
        self.assertFalse((self.data / "connections").exists())

    @unittest.skipIf(BACKEND, "frontend Base64 import environment")
    def test_base64_goes_only_to_the_configurator_without_file_mounts_or_command_value(self):
        import pty

        from connection_bundle import encode_bundle
        from test_configure import connection_bundle

        encoded = encode_bundle(connection_bundle())
        master, slave = pty.openpty()
        try:
            result = subprocess.run(
                [str(self.repo / "setup.sh"), "--docker", "--connection-base64"],
                env={**self.env, "EVERUNFOLD_CONNECTION_BASE64": encoded},
                stdin=slave,
                stdout=slave,
                stderr=subprocess.PIPE,
                timeout=20,
            )
            self.assertEqual(result.returncode, 0, result.stderr)
        finally:
            os.close(master)
            os.close(slave)
        calls = [json.loads(line) for line in self.log.read_text().splitlines()]
        recipients = [call for call in calls if "EVERUNFOLD_CONNECTION_BASE64" in call]
        self.assertEqual(len(recipients), 1)
        self.assertIn(str(self.repo / "deploy/configure.py"), recipients[0])
        self.assertNotIn(encoded, self.log.read_text())

    @unittest.skipIf(BACKEND, "frontend host connection bundle")
    def test_connection_file_is_mounted_read_only_only_in_the_configurator(self):
        import pty

        connection = self.root / "backend data/connections/web-main.json"
        connection.parent.mkdir(parents=True)
        connection.write_text("{}")
        master, slave = pty.openpty()
        try:
            result = subprocess.run(
                [str(self.repo / "setup.sh"), "--docker", "--connection-file", str(connection)],
                env=self.env,
                stdin=slave,
                stdout=slave,
                stderr=subprocess.PIPE,
                timeout=20,
            )
            self.assertEqual(result.returncode, 0, result.stderr)
        finally:
            os.close(master)
            os.close(slave)
        calls = [json.loads(line) for line in self.log.read_text().splitlines()]
        mount = f"type=bind,source={connection},target={connection},readonly"
        recipients = [call for call in calls if mount in call]
        self.assertEqual(len(recipients), 1)
        self.assertIn(str(self.repo / "deploy/configure.py"), recipients[0])
        self.assertIn("EVERUNFOLD_CONNECTION_FILE=" + str(connection), recipients[0])

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
            "init-db" if BACKEND else "deploy", "--initialize" if BACKEND else "build-plugins"
        )
        self.assertEqual(result.returncode, 23, result.stderr)
        self.assertEqual((self.repo / "config.yaml").read_bytes(), before)
        self.assertFalse(any("--name" in call or "init.database.py" in call for call in calls))

    def test_failed_runtime_check_does_not_stop_old_container(self):
        failure = "deploy/runtime_check.py" if BACKEND else "/usr/local/lib/everunfold-check.mjs"
        result, calls = self.run_action("start", failure, old="matching")
        self.assertEqual(result.returncode, 23, result.stderr)
        self.assertFalse(any("--name" in call or call[0] == "stop" for call in calls))

    @unittest.skipUnless(BACKEND, "backend startup preparation")
    def test_build_and_start_prepares_database_before_creating_service(self):
        result, calls = self.run_action("deploy")
        self.assertEqual(result.returncode, 0, result.stderr)
        prep = next(i for i, c in enumerate(calls) if "--prepare" in c)
        service = next(i for i, c in enumerate(calls) if "--name" in c)
        self.assertLess(prep, service)
        self.assertFalse(any("--initialize" in c for c in calls))

    @unittest.skipUnless(BACKEND, "backend initialization action")
    def test_manual_initialization_reports_next_start_command(self):
        result, calls = self.run_action("init-db")
        self.assertEqual(result.returncode, 0, result.stderr)
        self.assertTrue(any("--initialize" in c for c in calls))
        self.assertFalse(any("--name" in c for c in calls))
        self.assertIn("./setup.sh --docker start", result.stdout)

    @unittest.skipUnless(BACKEND, "backend combined initialization action")
    def test_initialize_and_deploy_builds_once_then_initializes_and_starts(self):
        config = self.repo / "config.yaml"
        document = yaml.safe_load(config.read_text())
        document["environment"]["EVERUNFOLD_AUTO_INIT_EMPTY_DB"] = "0"
        config.write_text(yaml.safe_dump(document))
        result, calls = self.run_action("init-deploy")
        self.assertEqual(result.returncode, 0, result.stderr)
        builds = [i for i, c in enumerate(calls) if c[0] == "compose" and "build" in c]
        self.assertEqual(len(builds), 1)
        initialize = next(i for i, c in enumerate(calls) if "--initialize" in c)
        service = next(i for i, c in enumerate(calls) if "--name" in c)
        self.assertLess(builds[0], initialize)
        self.assertLess(initialize, service)
        self.assertFalse(any("--prepare" in c for c in calls))
        self.assertEqual(
            yaml.safe_load(config.read_text())["environment"]["EVERUNFOLD_AUTO_INIT_EMPTY_DB"], "0"
        )

    @unittest.skipUnless(BACKEND, "backend combined initialization action")
    def test_combined_initialization_failure_leaves_previous_container_running(self):
        result, calls = self.run_action("init-deploy", "--initialize", old="matching")
        self.assertEqual(result.returncode, 23, result.stderr)
        self.assertFalse(any("--name" in c or c[0] == "stop" for c in calls))

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
