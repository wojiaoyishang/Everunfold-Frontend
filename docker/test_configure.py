"""Run with python3 docker/test_configure.py; uses real POSIX pseudo-terminals."""

import fcntl
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
import tomllib
import unittest
from pathlib import Path
from unittest.mock import patch

import configure
from config_files import Files, env_values, toml_text, update_env

DOCKER = Path(__file__).resolve().parent
BACKEND = hasattr(configure, "db_url")


class Session:
    def __init__(self, folder: Path, columns: int = 160) -> None:
        self.master, self.slave = pty.openpty()
        fcntl.ioctl(self.slave, termios.TIOCSWINSZ, struct.pack("HHHH", 50, columns, 0, 0))
        attributes = termios.tcgetattr(self.slave)
        attributes[3] &= ~(termios.ECHO | termios.ICANON)
        termios.tcsetattr(self.slave, termios.TCSANOW, attributes)
        self.original = termios.tcgetattr(self.slave)
        self.pid = os.fork()
        if self.pid == 0:
            os.close(self.master)
            os.setsid()
            fcntl.ioctl(self.slave, termios.TIOCSCTTY, 0)
            for descriptor in (0, 1, 2):
                os.dup2(self.slave, descriptor)
            if self.slave > 2:
                os.close(self.slave)
            os.chdir(folder)
            os.execve(
                sys.executable, [sys.executable, "configure.py"], {**os.environ, "TERM": "xterm"}
            )
        self.buffer = b""
        self.finished = False

    def until(self, text: str) -> str:
        expected = text.encode()
        deadline = time.monotonic() + 10
        while expected not in self.buffer:
            if time.monotonic() >= deadline:
                raise AssertionError(f"Missing prompt: {text}; tail={self.buffer[-1000:]!r}")
            readable, _, _ = select.select([self.master], [], [], 0.1)
            if readable:
                self.buffer += os.read(self.master, 65536)
        before, self.buffer = self.buffer.split(expected, 1)
        return before.decode(errors="replace")

    def send(self, text: str) -> None:
        os.write(self.master, text.encode())

    def menu(self, choice: str) -> str:
        before = self.until("请选择 1/2/3: ")
        self.send(choice + "\n")
        return before

    def edit(self, number: int, label: str, text: str) -> None:
        self.menu("2")
        self.until("配置项编号（留空返回）: ")
        self.send(str(number) + "\n")
        self.until(label + ": ")
        self.send(text + "\n")

    def close(self, code: int = 0) -> None:
        deadline = time.monotonic() + 10
        try:
            while time.monotonic() < deadline:
                pid, status = os.waitpid(self.pid, os.WNOHANG)
                if pid:
                    self.finished = True
                    assert os.waitstatus_to_exitcode(status) == code, status
                    assert termios.tcgetattr(self.slave) == self.original, "terminal not restored"
                    return
                time.sleep(0.02)
            raise AssertionError("Wizard did not exit")
        finally:
            if not self.finished:
                os.kill(self.pid, signal.SIGKILL)
                os.waitpid(self.pid, 0)
            os.close(self.master)
            os.close(self.slave)


class ConfigureTests(unittest.TestCase):
    def setUp(self) -> None:
        self.temporary = tempfile.TemporaryDirectory(prefix="everunfold-menu-test-")
        self.addCleanup(self.temporary.cleanup)
        self.folder = Path(self.temporary.name)
        for name in ("configure.py", "config_ui.py", "config_files.py"):
            shutil.copy(DOCKER / name, self.folder / name)

    def seed(self) -> None:
        child = Session(self.folder)
        overview = child.menu("1")
        self.assertIn("配置总览", overview)
        self.assertIn("宿主机映射端口", overview)
        if BACKEND:
            self.assertIn("127.0.0.1, ::1", overview)
            steps = [
                ("部署类型（1 新站点 / 2 迁移或已有站点）", None),
                ("后端发布 URL", "https://api.old.test"),
                ("API 绑定 IP（容器内）", None),
                ("API 监听端口（容器内）", "8081"),
                ("宿主机映射监听 IP", None),
                ("宿主机映射端口", "18081"),
                ("前端内部调用后端的来源 IP/CIDR", None),
                ("项目标识", None),
                ("Redis 命名空间", "menu-test"),
                ("PostgreSQL URL", "postgresql+asyncpg://test:visible@postgresql:5432/menu_test"),
                ("运行 Redis URL", "redis://:visible@redis:6379/0"),
                ("Celery Broker URL", None),
                ("应用主密钥", None),
                ("TOTP 主密钥", None),
                ("前端 → 后端令牌", None),
                ("后端 → 前端令牌", None),
                ("初始管理员密码", None),
                ("API worker 数量", None),
                ("Celery worker 池", None),
            ]
        else:
            tokens = self.folder / "tokens.env"
            tokens.write_text(
                "\n".join(
                    f"{name}={'a' if i == 0 else 'b'}" + "x" * 40
                    for i, name in enumerate(configure.TOKEN_NAMES)
                )
            )
            steps = [
                ("后端发布 URL", "https://api.old.test"),
                ("前端发布 URL", "https://blog.test"),
                ("后端内部连接 URL", "https://backend.internal.test"),
                ("前端节点 ID", None),
                ("后端来源 UUID", "00000000-0000-0000-0000-000000000001"),
                ("后端调用前端接收器的来源 IP/CIDR", "127.0.0.1"),
                ("导入后端令牌文件路径", str(tokens)),
                ("前端 → 后端令牌", None),
                ("后端 → 前端令牌", None),
                ("Web 绑定 IP（容器内）", None),
                ("Web 监听端口（容器内）", "3080"),
                ("接收器绑定 IP（容器内）", None),
                ("接收器监听端口（容器内）", "3081"),
                ("宿主机映射监听 IP", None),
                ("宿主机映射端口", "13080"),
            ]
        for label, value in steps:
            child.until(label + ": ")
            child.send(("\x15" + value if value is not None else "") + "\n")
        review = child.menu("3")
        if BACKEND:
            self.assertIn("postgresql+asyncpg://test:visible@postgresql:5432/menu_test", review)
            self.assertIn("redis://:visible@redis:6379/0", review)
        child.until("保存后退出？（y 保存 / n 放弃 / c 返回）: ")
        child.send("y\n")
        child.close()
        for name in ("data/config.toml", "runtime.env", ".env"):
            self.assertEqual(stat.S_IMODE((self.folder / name).stat().st_mode), 0o600)

    def test_overview_precedes_input_and_exit_writes_nothing(self) -> None:
        child = Session(self.folder)
        overview = child.menu("3")
        self.assertIn("后端发布 URL: （待填写）", overview)
        self.assertIn("1.按次序配置  2.修改某配置项  3.退出", overview)
        child.close()
        self.assertFalse((self.folder / "runtime.env").exists())

    def test_arrow_editing_history_reload_and_backup_preserve_other_settings(self) -> None:
        self.seed()
        config_path = self.folder / "data/config.toml"
        config = tomllib.loads(config_path.read_text())
        config["nodes_monitor"] = {"enabled": False, "origin": "https://ops.test"}
        config_path.write_text("# Preserve this comment in the backup.\n" + toml_text(config))
        env_path = self.folder / "runtime.env"
        env_path.write_text(env_path.read_text() + 'UNTOUCHED="literal-$$-value"\n')
        if BACKEND:
            env_path.write_text(
                update_env(
                    env_path.read_text(), {"EVERUNFOLD_TOTP_MASTER_KEY": "  " + "x" * 43 + "  "}
                )
            )
        original = config_path.read_bytes()
        original_env = env_path.read_bytes()
        child = Session(self.folder)
        number = 2 if BACKEND else 1
        if BACKEND:
            child.edit(14, "TOTP 主密钥", "")
        child.edit(
            number,
            "后端发布 URL",
            "\x15https://api.exampl.test" + "\x1b[D" * 5 + "e" + "\x1b[C" * 5,
        )
        child.edit(number, "后端发布 URL", "\x15https://api.second.test")
        child.edit(number, "后端发布 URL", "\x1b[A\x1b[A\x1b[B\x1b[A")
        review = child.menu("3")
        self.assertIn("https://api.example.test", review)
        child.until("保存后退出？（y 保存 / n 放弃 / c 返回）: ")
        child.send("y\n")
        child.close()
        updated = tomllib.loads(config_path.read_text())
        self.assertEqual(updated, {**config, "BACKEND_BASE_URL": "https://api.example.test"})
        self.assertEqual(env_path.read_bytes(), original_env)
        backups = list(config_path.parent.glob("config.toml.*.bak"))
        self.assertTrue(any(path.read_bytes() == original for path in backups))
        self.assertTrue(all(stat.S_IMODE(path.stat().st_mode) == 0o600 for path in backups))
        if BACKEND:
            self.assertEqual(updated["internal_auth"]["allowed_peer_ips"], ["127.0.0.1", "::1"])

    def test_discard_and_interrupt_restore_terminal_and_preserve_files(self) -> None:
        self.seed()
        paths = [self.folder / name for name in ("data/config.toml", "runtime.env", ".env")]
        before = [path.read_bytes() for path in paths]
        child = Session(self.folder)
        child.edit(2 if BACKEND else 1, "后端发布 URL", "\x15https://discard.test")
        child.menu("3")
        child.until("保存后退出？（y 保存 / n 放弃 / c 返回）: ")
        child.send("n\n")
        child.close()
        self.assertEqual([path.read_bytes() for path in paths], before)
        child = Session(self.folder)
        child.menu("2")
        child.until("配置项编号（留空返回）: ")
        child.send("\x03")
        child.close(code=1)
        self.assertEqual([path.read_bytes() for path in paths], before)

    def test_incomplete_configuration_cannot_be_saved(self) -> None:
        child = Session(self.folder)
        child.edit(2 if BACKEND else 1, "后端发布 URL", "https://api.example.test")
        child.menu("3")
        child.until("保存后退出？（y 保存 / n 放弃 / c 返回）: ")
        child.send("y\n")
        child.until("尚未正确配置")
        child.menu("3")
        child.until("保存后退出？（y 保存 / n 放弃 / c 返回）: ")
        child.send("n\n")
        child.close()
        self.assertFalse((self.folder / "runtime.env").exists())

    def test_narrow_terminal_unicode_paste_and_eof(self) -> None:
        child = Session(self.folder, columns=32)
        child.edit(
            2 if BACKEND else 1,
            "后端发布 URL",
            "\x1b[200~https://very-long-example.test\x1b[201~" + "\x01" + "\x1b[C" * 8 + "新",
        )
        review = child.menu("3")
        self.assertIn("https://新very-long-example.test", review)
        child.until("保存后退出？（y 保存 / n 放弃 / c 返回）: ")
        child.send("n\n")
        child.close()
        child = Session(self.folder)
        child.until("请选择 1/2/3: ")
        child.send("\x04")
        child.close(code=1)
        self.assertFalse((self.folder / "runtime.env").exists())

    def test_unmodified_environment_expressions_and_quoted_values_are_preserved(self) -> None:
        source = (
            "export DATABASE_URL=postgresql+asyncpg://u:${PASSWORD}@db/app\n"
            "TOKEN='literal-$$-value' # keep\n"
        )
        values = env_values(source)
        self.assertEqual(values["TOKEN"], "literal-$$-value")
        self.assertEqual(update_env(source, values), source)
        self.assertEqual(
            update_env(source, {**values, "API_HOST": "0.0.0.0"}), source + 'API_HOST="0.0.0.0"\n'
        )

    def test_file_save_detects_concurrent_changes_and_rolls_back_io_errors(self) -> None:
        first, second = self.folder / "a", self.folder / "b"
        first.write_text("old-a")
        second.write_text("old-b")
        files = Files()
        files.read(first)
        files.read(second)
        replace = os.replace

        def fail(source, target):
            if target == second:
                raise OSError("simulated I/O failure")
            replace(source, target)

        with patch("config_files.os.replace", side_effect=fail), self.assertRaises(OSError):
            files.write({first: "new-a", second: "new-b"})
        self.assertEqual(first.read_text(), "old-a")
        self.assertEqual(second.read_text(), "old-b")
        second.write_text("external-edit")
        with self.assertRaisesRegex(ValueError, "其他程序"):
            files.write({first: "new-a", second: "new-b"})
        self.assertEqual(first.read_text(), "old-a")
        self.assertEqual(second.read_text(), "external-edit")


if __name__ == "__main__":
    unittest.main()
