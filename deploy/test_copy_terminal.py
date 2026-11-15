"""Exercise OSC 52 and the normal-terminal copy fallback in a real PTY."""

import base64
import os
import pty
import select
import struct
import subprocess
import sys
import termios
import time
import unittest
from pathlib import Path

from config_copy import frontend_import_command


class CopyTerminalTests(unittest.TestCase):
    def test_copy_command_and_return_from_plain_terminal(self):
        command = frontend_import_command("/opt/my data/connections/web.json", False)
        code = """
import sys
from config_copy import CopyText
from config_model import Configuration, Field
from config_ui import SetupApp
class Demo(SetupApp):
    def on_mount(self):
        super().on_mount()
        self.push_screen(CopyText('COPY-FIXTURE', sys.argv[1], sys.argv[1]))
sys.exit(Demo(Configuration('Fixture', [Field('demo', 'Demo', 'value')], save=lambda: None)).run())
"""
        master, slave = pty.openpty()
        original = termios.tcgetattr(slave)
        import fcntl

        fcntl.ioctl(slave, termios.TIOCSWINSZ, struct.pack("HHHH", 38, 110, 0, 0))
        environment = {
            **os.environ,
            "TERM": "xterm-256color",
            "PYTHONPATH": str(Path(__file__).parent),
        }
        process = subprocess.Popen(
            [sys.executable, "-c", code, command],
            stdin=slave,
            stdout=slave,
            stderr=slave,
            env=environment,
            start_new_session=True,
        )
        output = bytearray()

        def until(marker: bytes):
            deadline = time.monotonic() + 10
            while marker not in output:
                self.assertLess(time.monotonic(), deadline, repr(bytes(output[-2500:])))
                if select.select([master], [], [], 0.05)[0]:
                    output.extend(os.read(master, 65536))

        try:
            until(b"COPY-FIXTURE")
            os.write(master, b"\t\t\r")  # Text area -> copy all -> copy command.
            until(b"\x1b]52;c;" + base64.b64encode(command.encode()) + b"\a")
            os.write(master, b"\t\r")  # Normal terminal copy, with mouse reporting suspended.
            until("按回车返回配置界面".encode())
            self.assertIn(command.encode(), output)
            self.assertIsNone(process.poll())
            os.write(master, b"\r")
            time.sleep(0.2)
            os.write(master, b"\x1b")
            time.sleep(0.2)
            os.write(master, b"\x11")  # Ctrl+Q still exits, Ctrl+C now copies.
            deadline = time.monotonic() + 10
            while process.poll() is None:
                self.assertLess(time.monotonic(), deadline, repr(bytes(output[-2500:])))
                if select.select([master], [], [], 0.05)[0]:
                    output.extend(os.read(master, 65536))
                if len(output) > 2_000_000:
                    self.fail("Unexpected terminal output loop")
            self.assertEqual(process.returncode, 10)
            self.assertEqual(termios.tcgetattr(slave), original)
        finally:
            if process.poll() is None:
                process.kill()
            process.wait(timeout=5)
            os.close(master)
            os.close(slave)
