"""Run with uv run --project deploy/assistant --locked python deploy/test_configure.py."""

import asyncio
import json
import os
import pty
import select
import shutil
import signal
import stat
import struct
import sys
import tempfile
import termios
import time
import unittest
from pathlib import Path
from unittest.mock import patch

import configure
from config_files import Files, env_values, update_env
from config_model import Check
from config_ui import Confirm, DatabaseForm, Editor, HistoryInput, SetupApp
from connection_bundle import decode_bundle, encode_bundle
from textual.widgets import Button, DataTable, Input, RichLog

BACKEND = hasattr(configure, "node_token_names")
DOCKER = Path(__file__).resolve().parent


def connection_bundle():
    return {
        "format": "everunfold-node-connection/v1",
        "node_id": "second-node",
        "source_epoch": "00000000-0000-0000-0000-000000000002",
        "backend_public_url": "https://api.example.test",
        "tokens": {
            "inbound": {"name": "NODE_IN", "value": "i" * 43},
            "outbound": {"name": "NODE_OUT", "value": "o" * 43},
        },
    }


class Fixtures:
    def setUp(self) -> None:
        temporary = tempfile.TemporaryDirectory(prefix="everunfold-setup-test-")
        self.addCleanup(temporary.cleanup)
        self.root = Path(temporary.name)
        self.docker = self.root / "docker"
        self.docker.mkdir()
        patched = patch.object(configure, "DOCKER", self.docker)
        patched.start()
        self.addCleanup(patched.stop)
        quiet = patch("config_files.print", create=True)
        quiet.start()
        self.addCleanup(quiet.stop)

    def model(self, native=False):
        return configure.configure(native=native)

    def materialize(self, native=False):
        from config_context import Context

        ctx = Context(self.docker, "backend" if BACKEND else "frontend", native=native)
        ctx.materialize()
        return ctx

    def edit(self, model, key, value):
        model.edit(next(item for item in model.fields if item.key == key), value)

    def complete(self, native=False):
        model = self.model(native)
        values = (
            {
                "database": "postgresql+asyncpg://user:visible@db:5432/everunfold",
                "redis": "redis://:visible@redis:6379/0",
                "receiver": "https://receiver.example.test",
            }
            if BACKEND
            else {
                "api": "https://api.example.test",
                "epoch": "00000000-0000-0000-0000-000000000001",
                "inbound": "i" * 43,
                "outbound": "o" * 43,
            }
        )
        for key, value in values.items():
            self.edit(model, key, value)
        self.assertEqual(model.errors(), [])
        return model


class ModelTests(Fixtures, unittest.TestCase):
    def test_base64_is_bounded_and_checks_all_credentials_without_echoing_input(self):
        import base64
        import copy

        bundle = connection_bundle()
        encoded = encode_bundle(bundle)
        self.assertEqual(decode_bundle(encoded), bundle)
        self.assertEqual(decode_bundle("\n" + encoded[:40] + "\n" + encoded[40:]), bundle)
        rejected = ["", "i-am-not-base64", encoded[:-1], encoded + "=", "A" * 90000]
        for field, bad in (("format", "invalid"), ("source_epoch", "secret-do-not-echo")):
            document = copy.deepcopy(bundle)
            document[field] = bad
            rejected.append(base64.b64encode(json.dumps(document).encode()).decode())
        document = copy.deepcopy(bundle)
        document["tokens"]["outbound"]["value"] = document["tokens"]["inbound"]["value"]
        rejected.append(base64.b64encode(json.dumps(document).encode()).decode())
        for source in rejected:
            with self.assertRaises(ValueError) as raised:
                decode_bundle(source)
            self.assertNotIn("secret-do-not-echo", str(raised.exception))
            self.assertNotIn(encoded, str(raised.exception))

    @unittest.skipIf(BACKEND, "frontend Base64 import")
    def test_base64_import_is_atomic_preserves_internal_url_and_requires_save(self):
        bundle = connection_bundle()
        encoded = encode_bundle(bundle)
        model = self.complete()
        self.edit(model, "internal", "http://backend:8001")
        self.edit(model, "connection_base64", encoded)
        self.assertEqual(model.get("api"), bundle["backend_public_url"])
        self.assertEqual(model.get("node"), bundle["node_id"])
        self.assertEqual(model.get("internal"), "http://backend:8001")
        self.assertEqual(model.get("connection_base64"), "")
        self.assertFalse((self.root / "config.yaml").exists())
        before = model.snapshot()
        with self.assertRaises(ValueError):
            self.edit(model, "connection_base64", "not-valid")
        self.assertEqual(model.snapshot(), before)
        model.save()
        saved = (self.root / "config.yaml").read_text()
        self.assertNotIn(encoded, saved)
        self.assertEqual(self.model().get("inbound"), bundle["tokens"]["inbound"]["value"])
        with patch.dict(os.environ, {"EVERUNFOLD_CONNECTION_BASE64": encoded}):
            auto = self.model(native=True)
            self.assertIn("Base64 已导入", auto.notice)
            self.assertEqual(auto.get("node"), "second-node")
            self.assertNotIn("EVERUNFOLD_CONNECTION_BASE64", os.environ)

    def test_explicit_configuration_path_and_writer_lock(self):
        selected = self.root / "external config" / "site.yaml"
        with patch.dict(os.environ, {"CONFIG_FILE": str(selected)}):
            model = self.complete()
            self.assertEqual(model.location, str(selected))
            model.save()
            self.assertTrue(selected.exists())
            self.assertFalse((self.root / "config.yaml").exists())
            self.materialize()
            reopened = self.model()
            self.assertEqual(reopened.get("inbound"), model.get("inbound"))
            lock = selected.with_name(selected.name + ".switch.lock")
            before = selected.read_bytes()
            lock.touch()
            with self.assertRaisesRegex(ValueError, "其他页面"):
                reopened.save()
            self.assertEqual(selected.read_bytes(), before)
            lock.unlink()
        for path in ("", " ", "legacy.toml"):
            with patch.dict(os.environ, {"CONFIG_FILE": path}), self.assertRaises(ValueError):
                self.model()

    @unittest.skipIf(BACKEND, "frontend browser-edited profiles")
    def test_browser_profiles_are_read_and_updated_without_losing_other_connections(self):
        import yaml

        self.complete().save()
        filename = self.root / "config.yaml"
        doc = yaml.safe_load(filename.read_text())
        app = doc["application"]
        profile = {
            "FRONTEND_NODE_ID": "browser-node",
            "BACKEND_BASE_URL": app.pop("BACKEND_BASE_URL"),
            "source_epoch": app["settings"].pop("source_epoch"),
            "backend": app.pop("backend"),
        }
        doc["connection_profiles"] = {
            "active": "browser",
            "profiles": {"browser": profile, "other": dict(profile)},
        }
        filename.write_text(yaml.safe_dump(doc))
        model = self.model()
        self.assertEqual(model.get("node"), "browser-node")
        self.edit(model, "internal", "http://everunfold-backend:8001")
        self.edit(model, "outbound", "new-browser-outbound-" + "x" * 32)
        model.save()
        saved = yaml.safe_load(filename.read_text())
        self.assertEqual(saved["connection_profiles"]["profiles"]["other"], profile)
        self.assertEqual(
            saved["connection_profiles"]["profiles"]["browser"]["backend"]["base_url"],
            "http://everunfold-backend:8001",
        )
        self.assertEqual(self.model().get("outbound"), "new-browser-outbound-" + "x" * 32)
        self.materialize()
        self.assertEqual(yaml.safe_load(filename.read_text()), saved)

    @unittest.skipUnless(BACKEND, "Backend process log levels")
    def test_process_log_levels_round_trip_and_validate(self):
        import yaml

        model = self.complete()
        self.assertEqual(model.get("API_LOG_LEVEL"), "INFO")
        self.assertEqual(model.get("WORKER_LOG_LEVEL"), "WARNING")
        self.assertEqual(model.get("SCHEDULER_LOG_LEVEL"), "INFO")
        for key, level in (
            ("API_LOG_LEVEL", "warning"),
            ("WORKER_LOG_LEVEL", "error"),
            ("SCHEDULER_LOG_LEVEL", "debug"),
        ):
            self.edit(model, key, level)
        with self.assertRaises(ValueError):
            self.edit(model, "WORKER_LOG_LEVEL", "quiet")
        model.save()
        document = yaml.safe_load((self.root / "config.yaml").read_text())
        self.materialize()
        restored = self.model()
        for key, level in (
            ("API_LOG_LEVEL", "WARNING"),
            ("WORKER_LOG_LEVEL", "ERROR"),
            ("SCHEDULER_LOG_LEVEL", "DEBUG"),
        ):
            self.assertEqual(document["environment"][key], level)
            self.assertEqual(restored.get(key), level)

    def test_node_console_switch_password_and_url_are_saved_in_root_configuration(self):
        import hashlib

        import yaml

        model = self.complete()
        self.assertEqual(model.get("monitor_enabled"), "1")
        self.assertGreaterEqual(len(model.get("monitor_password")), 12)
        self.edit(model, "monitor_password", "")
        self.assertGreaterEqual(len(model.get("monitor_password")), 12)
        self.edit(model, "monitor_password", "operator password 123")
        self.edit(model, "monitor_enabled", "0")
        model.save()
        root = self.root / "config.yaml"
        document = yaml.safe_load(root.read_text())
        monitor = document["application"]["nodes_monitor"]
        self.assertFalse(monitor["enabled"])
        self.assertNotIn("origin", monitor)
        password_hash = monitor["password_hash"]
        if BACKEND:
            from argon2 import PasswordHasher

            self.assertTrue(PasswordHasher().verify(password_hash, "operator password 123"))
        else:
            algorithm, salt, digest = password_hash.split("$")
            self.assertEqual(algorithm, "scrypt")
            self.assertEqual(
                hashlib.scrypt(
                    b"operator password 123", salt=bytes.fromhex(salt), n=16384, r=8, p=1, dklen=32
                ).hex(),
                digest,
            )
        secret = document["environment"][monitor["session_secret_env"]]
        self.assertRegex(secret, r"^[A-Za-z0-9_-]{43,128}$")
        self.edit(model, "monitor_enabled", "1")
        model.save()
        self.assertEqual(
            yaml.safe_load(root.read_text())["application"]["nodes_monitor"]["password_hash"],
            password_hash,
        )
        # A legacy pinned local address is removed when saving the new published URL.
        document = yaml.safe_load(root.read_text())
        document["application"]["nodes_monitor"]["origin"] = "http://127.0.0.1:8001"
        password_key = (
            "EVERUNFOLD_SETUP_NODES_PASSWORD"
            if BACKEND
            else "EVERUNFOLD_SETUP_FRONTEND_NODES_PASSWORD"
        )
        document["environment"].pop(password_key)
        root.write_text(yaml.safe_dump(document))
        second = self.model()
        self.assertEqual(second.get("monitor_password"), "")
        self.edit(second, "monitor_password", "")
        self.edit(second, "api" if BACKEND else "site", "https://published.example.test")
        second.save()
        monitor = yaml.safe_load(root.read_text())["application"]["nodes_monitor"]
        self.assertTrue(monitor["enabled"])
        self.assertNotIn("origin", monitor)
        self.assertEqual(monitor["password_hash"], password_hash)
        third = self.model()
        self.edit(third, "monitor_password", "new operator password")
        third.save()
        self.assertNotEqual(
            yaml.safe_load(root.read_text())["application"]["nodes_monitor"]["password_hash"],
            password_hash,
        )

    def test_save_preserves_existing_values_and_backups(self):
        model = self.complete()
        before = model.get("inbound")
        model.save()
        self.materialize()
        (self.root / "config.yaml").unlink()  # Exercise legacy migration, before YAML exists.
        config = self.root / "config.runtime.toml"
        env = self.docker / "runtime.env"
        config.write_text(config.read_text() + "\n[custom]\nkeep = '中文'\n")
        env.write_text(env.read_text() + "EXTRA='literal-$$-value' # keep\n")
        original_config, original_env = config.read_bytes(), env.read_bytes()
        second = self.model()
        self.assertEqual(second.get("inbound"), before)
        self.edit(second, "api", "https://api.changed.test")
        self.edit(second, "host", "127.0.0.2")
        second.save()
        self.materialize()
        import tomllib

        self.assertEqual(tomllib.loads(config.read_text())["custom"]["keep"], "中文")
        self.assertEqual(env_values(env.read_text())["EXTRA"], "literal-$$-value")
        self.assertEqual(
            next(config.parent.glob("config.runtime.toml.*.bak")).read_bytes(), original_config
        )
        self.assertIn(original_env, [p.read_bytes() for p in env.parent.glob("runtime.env.*.bak")])
        self.assertEqual(stat.S_IMODE(env.stat().st_mode), 0o600)

    def test_repeated_save_preserves_last_saved_values_and_detects_external_edits(self):
        model = self.complete()
        model.save()
        first = (self.root / "config.yaml").read_bytes()
        self.edit(model, "api", "https://second.example.test")
        model.save()
        self.assertEqual(self.model().get("api"), "https://second.example.test")
        self.assertIn(first, [p.read_bytes() for p in self.root.glob("config.yaml.*.bak")])
        if BACKEND:
            original_token = model.get("inbound")
            self.edit(model, "node", "second-node")
            model.save()
            self.edit(model, "node", "web-main")
            model.save()
            self.assertEqual(self.model().get("inbound"), original_token)
        path = self.root / "config.yaml"
        external = path.read_text() + "# external change\n"
        path.write_text(external)
        with self.assertRaisesRegex(ValueError, "其他程序"):
            model.save()
        self.assertEqual(path.read_text(), external)

    def test_no_files_until_save_and_native_paths(self):
        model = self.complete(native=True)
        self.assertFalse((self.root / "var").exists())
        model.save()
        self.assertFalse((self.root / "var").exists())
        self.assertTrue((self.root / "config.yaml").is_file())
        self.materialize(native=True)
        instance = self.root / "var/instance"
        self.assertTrue((instance / "runtime.env").is_file())
        self.assertIn(str(instance), (self.root / "config.runtime.toml").read_text())
        self.assertFalse((self.docker / ".env").exists())

    def test_secrets_or_import_are_stable_and_scoped(self):
        model = self.model()
        if BACKEND:
            master = model.get("EVERUNFOLD_API_APPLICATION_MASTER_KEY")
            self.assertGreaterEqual(len(master), 43)
            self.edit(model, "inbound", "")
            first = model.get("inbound")
            self.assertGreaterEqual(len(first), 43)
            self.edit(model, "node", "second-node")
            self.assertNotEqual(first, model.get("inbound"))
            self.edit(model, "node", "web-main")
            self.assertEqual(first, model.get("inbound"))
            self.assertEqual(master, model.get("EVERUNFOLD_API_APPLICATION_MASTER_KEY"))
            self.edit(model, "mode", "2")
            self.assertEqual(model.get("EVERUNFOLD_API_APPLICATION_MASTER_KEY"), "")
        else:
            document = {
                "format": "everunfold-node-connection/v1",
                "node_id": "second-node",
                "source_epoch": "00000000-0000-0000-0000-000000000002",
                "backend_public_url": "https://api.example.test",
                "tokens": {
                    "inbound": {"name": "NODE_IN", "value": "i" * 43},
                    "outbound": {"name": "NODE_OUT", "value": "o" * 43},
                },
            }
            filename = self.root / "connection.json"
            filename.write_text(json.dumps(document))
            self.edit(model, "connection_file", str(filename))
            self.assertEqual(model.get("node"), "second-node")
            model.save()
            self.materialize()
            self.assertEqual(
                env_values((self.docker / "runtime.env").read_text())["NODE_IN"], "i" * 43
            )
            document["tokens"]["outbound"]["value"] = "i" * 43
            filename.write_text(json.dumps(document))
            snapshot = model.snapshot()
            with self.assertRaises(ValueError):
                self.edit(model, "connection_file", str(filename))
            self.assertEqual(snapshot, model.snapshot())

    def test_root_yaml_drives_both_modes_and_generated_files(self):
        import yaml
        from config_context import Context

        self.complete().save()
        root_file = self.root / "config.yaml"
        document = yaml.safe_load(root_file.read_text())
        self.assertEqual(stat.S_IMODE(root_file.stat().st_mode), 0o600)
        document["application"]["custom"] = {"keep": "中文"}
        document["environment"]["EXTRA"] = "literal-$$-value"
        root_file.write_text(yaml.safe_dump(document))
        canonical = root_file.read_bytes()
        (self.docker / "runtime.env").write_text("EXTRA=outdated\n")
        model = self.model(native=True)
        self.assertFalse(model.errors())
        self.assertEqual(root_file.read_bytes(), canonical)
        model.save()
        native = Context(self.docker, "backend" if BACKEND else "frontend", native=True)
        native.materialize()
        self.assertIn(str(self.root / "var/instance"), native.config_path.read_text())
        self.assertEqual(native.env["EXTRA"], "literal-$$-value")
        self.assertEqual(native.config["custom"]["keep"], "中文")
        self.assertEqual(model.get("inbound"), self.model().get("inbound"))
        docker = Context(self.docker, "backend" if BACKEND else "frontend")
        docker.materialize()
        self.assertIn("/data/", docker.config_path.read_text())
        self.assertNotIn(str(self.root / "var/instance"), docker.config_path.read_text())
        root_file.write_text("version: 1\nversion: 2\n")
        with self.assertRaisesRegex(ValueError, "config.yaml"):
            self.model()

    @unittest.skipIf(BACKEND, "frontend active connection profiles")
    def test_only_active_profile_is_edited_and_saved_in_root_yaml(self):
        import tomllib

        import yaml

        data = self.docker / "data"
        data.mkdir()
        (data / "config.toml").write_text('backend_node_file = "profiles.toml"\n')
        inactive = {"BACKEND_BASE_URL": "https://keep.example.test", "custom": "keep"}
        from config_files import toml_text

        (data / "profiles.toml").write_text(
            toml_text({"active": "first", "profiles": {"first": {}, "second": inactive}})
        )
        model = self.complete()
        model.save()
        self.materialize()
        result = tomllib.loads((data / "profiles.toml").read_text())
        self.assertEqual(result["profiles"]["second"], inactive)
        self.assertEqual(result["profiles"]["first"]["BACKEND_BASE_URL"], model.get("api"))
        document = yaml.safe_load((self.root / "config.yaml").read_text())
        self.assertEqual(document["connection_profiles"], result)

    @unittest.skipUnless(BACKEND, "backend initialization preference")
    def test_auto_init_defaults_on_and_can_be_disabled_without_rotating_keys(self):
        model = self.complete()
        master = model.get("EVERUNFOLD_API_APPLICATION_MASTER_KEY")
        self.assertEqual(model.get("auto_init_empty_db"), "1")
        self.edit(model, "auto_init_empty_db", "0")
        model.save()
        reopened = self.model()
        self.assertEqual(reopened.get("auto_init_empty_db"), "0")
        self.assertEqual(reopened.get("EVERUNFOLD_API_APPLICATION_MASTER_KEY"), master)

    def test_network_subnets_are_runtime_grants_and_manual_lists_stay_editable(self):
        with patch.dict(os.environ, EVERUNFOLD_NETWORK_CIDRS="172.25.0.0/16,"):
            model = self.complete()
        self.assertIn("127.0.0.1", model.get("peers"))
        self.assertNotIn("172.25.0.0/16", model.get("peers"))
        self.assertEqual(model.get("network_peers"), "1")
        self.assertIn(
            "172.25.0.0/16", next(f.hint for f in model.fields if f.key == "network_peers")
        )
        self.edit(model, "peers", "192.0.2.15")
        model.save()
        self.assertEqual(self.model().get("peers"), "192.0.2.15")

    def test_container_network_options_are_saved_and_validated(self):
        model = self.complete()
        self.edit(model, "network_alias", "everunfold-custom")
        self.edit(model, "host_gateway", "1")
        self.edit(model, "network_peers", "0")
        with self.assertRaises(ValueError):
            self.edit(model, "network_alias", "--alias=bad")
        with self.assertRaises(ValueError):
            self.edit(model, "host_gateway", "yes")
        model.save()
        reopened = self.model()
        self.assertEqual(reopened.get("network_alias"), "everunfold-custom")
        self.assertEqual(reopened.get("host_gateway"), "1")
        self.assertEqual(reopened.get("network_peers"), "0")

    def test_custom_mounts_are_applied_after_root_save(self):
        model = self.complete()
        data = self.root / "external data"
        source = self.root / "other source"
        source.mkdir()
        for key, value in {
            "data_dir": str(data),
            "source_dir": str(source),
            "container_name": "my-everunfold",
            "network": "bridge",
            "extra_networks": "1panel-network",
            "publish_port": "3434",
        }.items():
            self.edit(model, key, value)
        self.assertFalse(model.errors())
        model.save()
        self.assertFalse(data.exists())
        context = self.materialize()
        self.assertEqual(context.data, data)
        self.assertTrue(data.is_dir())
        if not BACKEND:
            cache = data / "npm-cache"
            self.assertTrue(cache.is_dir())
            (cache / "retained-download").write_text("cached package")
            self.materialize()
            self.assertEqual((cache / "retained-download").read_text(), "cached package")
        self.assertFalse((data / "config.toml").exists())
        self.assertFalse((source / "config.yaml").exists())
        rendered = env_values(context.compose_path.read_text())
        self.assertEqual(rendered["EVERUNFOLD_CONFIG_DIR"], str(self.root))
        self.assertEqual(rendered["EVERUNFOLD_CONFIG_NAME"], "config.yaml")
        self.assertEqual(context.compose["EVERUNFOLD_EXTRA_NETWORKS"], "1panel-network")
        self.assertEqual(self.model().get("data_dir"), str(data))
        raw = context.env_path.with_name(context.env_path.name + ".docker").read_text()
        for name, value in context.env.items():
            self.assertIn(f"{name}={value}\n", raw)
        self.edit(model, "source_dir", str(data))
        self.assertIn("代码目录和数据目录必须不同。", model.errors())

    def test_unmodified_env_expressions_and_quoted_values(self):
        source = (
            "export DATABASE_URL=postgresql+asyncpg://u:${PASSWORD}@db/app\n"
            "TOKEN='literal-$$-value' # keep\n"
        )
        parsed = env_values(source)
        self.assertEqual(parsed["TOKEN"], "literal-$$-value")
        self.assertEqual(update_env(source, parsed), source)

    def test_concurrent_file_change_and_failed_write_rollback(self):
        a, b = self.root / "a", self.root / "b"
        a.write_text("before-a")
        b.write_text("before-b")
        files = Files()
        files.read(a)
        files.read(b)
        replace, count = os.replace, 0

        def failing(source, target):
            nonlocal count
            count += 1
            if count == 2:
                raise OSError("simulated failure")
            return replace(source, target)

        with patch("config_files.os.replace", side_effect=failing), self.assertRaises(OSError):
            files.write({a: "after-a", b: "after-b"})
        self.assertEqual(a.read_text(), "before-a")
        self.assertEqual(b.read_text(), "before-b")
        b.write_text("external edit")
        with self.assertRaises(ValueError):
            files.write({a: "after-a", b: "after-b"})
        self.assertEqual(b.read_text(), "external edit")

    @unittest.skipIf(BACKEND, "frontend single listener and connection import")
    def test_legacy_receiver_settings_are_removed_on_save_and_import_errors_are_specific(self):
        import yaml

        self.complete().save()
        path = self.root / "config.yaml"
        document = yaml.safe_load(path.read_text())
        document["application"].setdefault("settings", {}).update(
            receiver_host="127.0.0.2", receiver_port=3001
        )
        document["environment"].update(FRONTEND_PORT="3250", FRONTEND_RECEIVER_PORT="3001")
        document["docker"]["FRONTEND_RECEIVER_PUBLISH_PORT"] = "3001"
        path.write_text(yaml.safe_dump(document))
        model = self.model()
        self.assertEqual(model.get("port"), "3250")
        self.assertFalse(any("receiver" in field.key for field in model.fields))
        with self.assertRaisesRegex(ValueError, "--connection-file"):
            self.edit(model, "connection_file", str(self.root / "missing.json"))
        model.save()
        self.assertNotIn("RECEIVER", path.read_text())
        self.assertNotIn("receiver_port", path.read_text())

    @unittest.skipIf(BACKEND, "frontend release handling")
    def test_failed_artifact_activation_preserves_previous_release(self):
        import bootstrap

        self.complete().save()
        target = self.docker / "data/plugins/example"
        target.mkdir(parents=True)
        (target / "manifest.json").write_text("old")
        stage = self.docker / "data/plugin-builds/new/example"
        stage.mkdir(parents=True)
        (stage / "manifest.json").write_text("new")
        artifact = self.docker / "output/new/.next"
        artifact.mkdir(parents=True)
        (artifact / "BUILD_ID").write_text("new-build")
        self.materialize()
        before = (self.docker / ".env").read_bytes()
        with patch.object(bootstrap, "DOCKER", self.docker):
            with (
                patch.object(Files, "write", side_effect=OSError("disk full")),
                self.assertRaises(OSError),
            ):
                bootstrap.activate("new")
            self.assertEqual((target / "manifest.json").read_text(), "old")
            self.assertEqual((self.docker / ".env").read_bytes(), before)
            bootstrap.activate("new")
            self.materialize()
        self.assertEqual((target / "manifest.json").read_text(), "new")
        self.assertIn("output/new", (self.docker / ".env").read_text())


class TerminalTests(Fixtures, unittest.IsolatedAsyncioTestCase):
    async def test_node_console_switch_and_password_can_be_edited_and_generated(self):
        model = self.complete()
        app = SetupApp(model)
        async with app.run_test(size=(80, 24)) as pilot:
            table = app.query_one(DataTable)
            table.move_cursor(
                row=next(
                    i for i, field in enumerate(model.fields) if field.key == "monitor_enabled"
                )
            )
            await pilot.press("enter")
            app.screen.query_one("#value", Input).value = "0"
            await pilot.press("enter")
            self.assertEqual(model.get("monitor_enabled"), "0")
            table.move_cursor(
                row=next(
                    i for i, field in enumerate(model.fields) if field.key == "monitor_password"
                )
            )
            await pilot.press("enter")
            app.screen.query_one("#value", Input).value = "a custom console password"
            await pilot.click("#apply")
            self.assertEqual(model.get("monitor_password"), "a custom console password")
            await pilot.press("enter")
            await pilot.click("#generate")
            generated = app.screen.query_one("#value", Input).value
            self.assertGreaterEqual(len(generated), 12)
            self.assertNotEqual(generated, "a custom console password")
            await pilot.click("#apply")
            self.assertEqual(model.get("monitor_password"), generated)

    async def test_edit_history_and_compact_layout(self):
        model = self.complete()
        app = SetupApp(model)
        async with app.run_test(size=(110, 38)) as pilot:
            table = app.query_one(DataTable)
            table.move_cursor(
                row=next(i for i, item in enumerate(model.fields) if item.key == "api")
            )
            await pilot.press("2")
            self.assertIsInstance(app.screen, Editor)
            entry = app.screen.query_one(HistoryInput)
            entry.value = "https://api.example.test"
            entry.cursor_position = len(entry.value)
            await pilot.press("left", "left", "left", "left", "x")
            self.assertEqual(entry.value, "https://api.example.xtest")
            entry.value = "https://first.example.test"
            await pilot.press("enter", "2")
            app.screen.query_one(Input).value = "https://second.example.test"
            await pilot.press("enter", "2", "up", "up")
            self.assertEqual(app.screen.query_one(Input).value, "https://first.example.test")
            await pilot.press("down")
            self.assertEqual(app.screen.query_one(Input).value, "https://second.example.test")
            await pilot.press("escape")
            await pilot.resize_terminal(80, 24)
            await pilot.pause()
            for name in ("build", "deploy", "save"):
                self.assertLessEqual(app.query_one("#" + name, Button).region.bottom, 24)
            self.assertLessEqual(sum(column.width + 2 for column in table.columns.values()), 78)
            app.exit(10)

    async def test_save_stays_open_and_can_save_again_then_discard_only_unsaved_edits(self):
        model = self.complete()
        app = SetupApp(model)
        async with app.run_test(size=(80, 24)) as pilot:
            await pilot.click("#save")
            await pilot.pause()
            self.assertTrue(app.is_running)
            self.assertIn("保存成功", "".join(line.text for line in app.query_one(RichLog).lines))
            self.edit(model, "api", "https://saved-again.example.test")
            await pilot.press("ctrl+s")
            await pilot.pause()
            self.assertEqual(self.model().get("api"), "https://saved-again.example.test")
            saved = (self.root / "config.yaml").read_bytes()
            self.edit(model, "api", "https://discard.example.test")
            await pilot.press("3")
            self.assertIsInstance(app.screen, Confirm)
            await pilot.click("#yes")
        self.assertEqual(app.return_value, 0)
        self.assertEqual((self.root / "config.yaml").read_bytes(), saved)

    @unittest.skipUnless(BACKEND, "backend node export action")
    async def test_export_stays_open_copies_base64_and_handles_retry(self):
        model = self.complete()
        encoded = encode_bundle(connection_bundle())
        exports = 0

        async def export():
            nonlocal exports
            exports += 1
            if exports == 1:
                raise ValueError("数据库尚未初始化")
            return encoded

        model.export_node = export
        app = SetupApp(model)
        async with app.run_test(size=(80, 24)) as pilot:
            for attempt in (1, 2, 3):
                await pilot.click("#export-node")
                await pilot.pause()
                self.assertIsInstance(app.screen, Confirm)
                await pilot.click("#yes")
                await pilot.pause()
                self.assertTrue(app.is_running)
                if attempt > 1:
                    from config_copy import CopyText, frontend_base64_import_command
                    from textual.widgets import TextArea

                    self.assertIsInstance(app.screen, CopyText)
                    command = frontend_base64_import_command(False)
                    self.assertIn(command, app.screen.query_one(TextArea).text)
                    self.assertNotIn(encoded, command)
                    await pilot.click("#copy-base64")
                    self.assertEqual(app.clipboard, encoded)
                    await pilot.click("#copy-command")
                    self.assertEqual(app.clipboard, command)
                    await pilot.press("escape")
                    await pilot.pause()
                lines = "".join(line.text for line in app.query_one(RichLog).lines)
                self.assertIn("导出失败" if attempt == 1 else "导出成功", lines)
                if attempt > 1:
                    self.assertIn(encoded, lines)
                self.assertFalse(app.query_one("#export-node", Button).disabled)
            await pilot.press("3")
        self.assertEqual(app.return_value, 0)
        self.assertEqual(exports, 3)

    async def test_copy_value_preserves_complete_text_and_returns_to_editor(self):
        from config_copy import CopyText
        from textual.widgets import TextArea

        model = self.complete()
        app = SetupApp(model)
        async with app.run_test(size=(80, 24)) as pilot:
            table = app.query_one(DataTable)
            row = next(i for i, field in enumerate(model.fields) if field.key == "api")
            table.move_cursor(row=row)
            await pilot.press("ctrl+c")
            await pilot.pause()
            self.assertIsInstance(app.screen, CopyText)
            self.assertEqual(app.screen.query_one(TextArea).text, model.get("api"))
            await pilot.click("#copy-all")
            self.assertEqual(app.clipboard, model.get("api"))
            await pilot.press("escape")
            await pilot.pause()
            await pilot.press("2")
            await pilot.pause()
            self.assertIsInstance(app.screen, Editor)
            await pilot.click("#copy-value")
            await pilot.pause()
            self.assertIsInstance(app.screen, CopyText)
            await pilot.press("escape")
            await pilot.pause()
            self.assertIsInstance(app.screen, Editor)
            app.exit(0)

    async def test_network_change_still_requires_reopening_after_save(self):
        model = self.complete()
        self.edit(model, "network", "another-network")
        model.save()
        results = await model.probe()
        self.assertEqual(results[0].name, "容器网络")
        self.assertEqual(results[0].state, "warning")

    async def test_save_returns_action_and_exit_is_read_only(self):
        app = SetupApp(self.complete())
        async with app.run_test() as pilot:
            await pilot.click("#build")
            await pilot.pause()
        self.assertEqual(app.return_value, 20)
        env = self.root / "config.yaml"
        self.assertTrue(env.exists())
        self.assertFalse((self.docker / "runtime.env").exists())
        app = SetupApp(self.model())
        before = env.read_bytes()
        async with app.run_test() as pilot:
            await pilot.press("3")
        self.assertEqual(app.return_value, 10)
        self.assertEqual(env.read_bytes(), before)

    @unittest.skipUnless(BACKEND, "backend initialization action")
    async def test_saved_config_can_confirm_initialization_without_changing_deployment_type(self):
        self.complete().save()
        model = self.model()
        self.assertEqual(model.get("mode"), "2")
        app = SetupApp(model)
        async with app.run_test(size=(80, 24)) as pilot:
            await pilot.click("#init-db")
            await pilot.pause()
            self.assertIsInstance(app.screen, Confirm)
            await pilot.click("#no")
            self.assertNotIsInstance(app.screen, Confirm)
            await pilot.click("#init-db")
            await pilot.pause()
            await pilot.click("#yes")
        self.assertEqual(app.return_value, 30)

    @unittest.skipUnless(BACKEND, "backend combined initialization action")
    async def test_initialize_and_deploy_confirms_without_changing_auto_init_preference(self):
        model = self.complete()
        self.edit(model, "auto_init_empty_db", "0")
        model.save()
        saved = (self.root / "config.yaml").read_bytes()
        app = SetupApp(self.model())
        async with app.run_test(size=(80, 24)) as pilot:
            await pilot.click("#init-deploy")
            await pilot.pause()
            self.assertIsInstance(app.screen, Confirm)
            await pilot.click("#no")
            self.assertEqual((self.root / "config.yaml").read_bytes(), saved)
            await pilot.click("#init-deploy")
            await pilot.pause()
            await pilot.click("#yes")
        self.assertEqual(app.return_value, 22)
        self.assertEqual(self.model().get("auto_init_empty_db"), "0")

    @unittest.skipUnless(BACKEND, "PostgreSQL form")
    async def test_database_parts_encode_password(self):
        model = self.complete()
        app = SetupApp(model)
        async with app.run_test(size=(110, 40)) as pilot:
            app.query_one(DataTable).move_cursor(
                row=next(i for i, item in enumerate(model.fields) if item.key == "database")
            )
            await pilot.press("2")
            await pilot.click("#parts")
            self.assertIsInstance(app.screen, DatabaseForm)
            app.screen.query_one("#dbpass", Input).value = "p@ss/%: 中文"
            await pilot.click("#apply")
            self.assertIsInstance(app.screen, Editor)
            await pilot.click("#apply")
            from urllib.parse import unquote, urlsplit

            self.assertEqual(unquote(urlsplit(model.get("database")).password), "p@ss/%: 中文")
            app.exit(10)

    async def test_probe_is_async_and_edits_invalidate_results(self):
        model = self.complete()
        started, finish = asyncio.Event(), asyncio.Event()

        async def probe():
            started.set()
            await finish.wait()
            return [Check("数据库", "ok", "通过")]

        model.probe = probe
        app = SetupApp(model)
        async with app.run_test() as pilot:
            await pilot.click("#test")
            await asyncio.wait_for(started.wait(), 2)
            app.query_one(DataTable).focus()
            app.query_one(DataTable).move_cursor(
                row=next(i for i, item in enumerate(model.fields) if item.key == "api")
            )
            await pilot.press("2")
            app.screen.query_one(Input).value = "https://changed.example.test"
            await pilot.press("enter")
            finish.set()
            await pilot.pause()
            self.assertEqual(app.results, [])
            app.exit(10)


class PtyTests(Fixtures, unittest.TestCase):
    def test_real_terminal_color_and_attribute_restore(self):
        import fcntl

        for filename in DOCKER.glob("*.py"):
            if filename.name != Path(__file__).name:
                shutil.copy(filename, self.docker / filename.name)
        master, slave = pty.openpty()
        fcntl.ioctl(slave, termios.TIOCSWINSZ, struct.pack("HHHH", 38, 110, 0, 0))
        original = termios.tcgetattr(slave)
        original[3] &= ~(termios.ECHO | termios.ICANON)
        termios.tcsetattr(slave, termios.TCSANOW, original)
        original = termios.tcgetattr(slave)
        pid = os.fork()
        if pid == 0:
            os.close(master)
            os.setsid()
            fcntl.ioctl(slave, termios.TIOCSCTTY, 0)
            for fd in (0, 1, 2):
                os.dup2(slave, fd)
            os.close(slave)
            env = {**os.environ, "TERM": "xterm-256color", "COLORTERM": "truecolor"}
            env.pop("NO_COLOR", None)
            os.execve(sys.executable, [sys.executable, str(self.docker / "configure.py")], env)
        finished = False
        try:
            output, deadline = b"", time.monotonic() + 12
            while b"Everunfold" not in output and time.monotonic() < deadline:
                if select.select([master], [], [], 0.1)[0]:
                    output += os.read(master, 65536)
            self.assertIn(b"Everunfold", output)
            os.write(master, b"3")
            while time.monotonic() < deadline:
                if select.select([master], [], [], 0.05)[0]:
                    output += os.read(master, 65536)
                result, status = os.waitpid(pid, os.WNOHANG)
                if result:
                    finished = True
                    self.assertEqual(os.waitstatus_to_exitcode(status), 10)
                    break
            self.assertTrue(finished, output[-500:])
            self.assertRegex(output, rb"\x1b\[(?:[0-9]+;)*(?:38|48);")
            self.assertEqual(termios.tcgetattr(slave), original)
            self.assertFalse((self.docker / "data").exists())
        finally:
            if not finished:
                os.kill(pid, signal.SIGKILL)
                os.waitpid(pid, 0)
            os.close(master)
            os.close(slave)


if __name__ == "__main__":
    unittest.main()
