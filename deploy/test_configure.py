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
from config_ui import DatabaseForm, Editor, HistoryInput, SetupApp
from textual.widgets import Button, DataTable, Input

BACKEND = hasattr(configure, "node_token_names")
DOCKER = Path(__file__).resolve().parent


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
    def test_save_preserves_existing_values_and_backups(self):
        model = self.complete()
        before = model.get("inbound")
        model.save()
        (self.root / "config.yaml").unlink()  # Exercise legacy migration, before YAML exists.
        config = self.docker / "data/config.toml"
        env = self.docker / "runtime.env"
        config.write_text(config.read_text() + "\n[custom]\nkeep = '中文'\n")
        env.write_text(env.read_text() + "EXTRA='literal-$$-value' # keep\n")
        original_config, original_env = config.read_bytes(), env.read_bytes()
        second = self.model()
        self.assertEqual(second.get("inbound"), before)
        self.edit(second, "api", "https://api.changed.test")
        self.edit(second, "host", "127.0.0.2")
        second.save()
        import tomllib

        self.assertEqual(tomllib.loads(config.read_text())["custom"]["keep"], "中文")
        self.assertIn("EXTRA='literal-$$-value' # keep", env.read_text())
        self.assertEqual(
            next(config.parent.glob("config.toml.*.bak")).read_bytes(), original_config
        )
        self.assertEqual(next(env.parent.glob("runtime.env.*.bak")).read_bytes(), original_env)
        self.assertEqual(stat.S_IMODE(env.stat().st_mode), 0o600)

    def test_no_files_until_save_and_native_paths(self):
        model = self.complete(native=True)
        self.assertFalse((self.root / "var").exists())
        model.save()
        instance = self.root / "var/instance"
        self.assertTrue((instance / "runtime.env").is_file())
        self.assertIn(str(instance), (instance / "config.toml").read_text())
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
        result = tomllib.loads((data / "profiles.toml").read_text())
        self.assertEqual(result["profiles"]["second"], inactive)
        self.assertEqual(result["profiles"]["first"]["BACKEND_BASE_URL"], model.get("api"))
        document = yaml.safe_load((self.root / "config.yaml").read_text())
        self.assertEqual(document["connection_profiles"], result)

    def test_network_defaults_only_apply_to_new_lists(self):
        with patch.dict(os.environ, EVERUNFOLD_NETWORK_CIDRS="172.25.0.0/16,"):
            model = self.complete()
        self.assertIn("127.0.0.1", model.get("peers"))
        self.assertIn("172.25.0.0/16", model.get("peers"))
        self.edit(model, "peers", "192.0.2.15")
        model.save()
        self.assertEqual(self.model().get("peers"), "192.0.2.15")

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
        self.assertEqual((target / "manifest.json").read_text(), "new")
        self.assertIn("output/new", (self.docker / ".env").read_text())


class TerminalTests(Fixtures, unittest.IsolatedAsyncioTestCase):
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

    async def test_save_returns_action_and_exit_is_read_only(self):
        app = SetupApp(self.complete())
        async with app.run_test() as pilot:
            await pilot.click("#build")
            await pilot.pause()
        self.assertEqual(app.return_value, 20)
        env = self.docker / "runtime.env"
        self.assertTrue(env.exists())
        app = SetupApp(self.model())
        before = env.read_bytes()
        async with app.run_test() as pilot:
            await pilot.press("3")
        self.assertEqual(app.return_value, 10)
        self.assertEqual(env.read_bytes(), before)

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
