"""Persistent TUI actions, connection probes and host action isolation."""

import asyncio
import os
import shlex
import socket
import subprocess
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch

from config_actions import export_node
from config_copy import frontend_import_command
from config_probes import frontend_checks
from config_validation import internal_url
from connection_bundle import encode_bundle
from test_configure import connection_bundle


class ActionTests(unittest.IsolatedAsyncioTestCase):
    async def test_docker_export_bridge_retries_and_returns_base64_without_shared_file(self):
        with tempfile.TemporaryDirectory(prefix="everunfold-action-test-") as temp:
            root = Path(temp)
            bridge = root / "bridge"
            bridge.mkdir()
            encoded = encode_bundle(connection_bundle())
            launcher = root / "launcher.sh"
            launcher.write_text(
                '#!/bin/bash\nset -eu\n[[ "$1" == export-node ]]\n'
                '[[ ! -f "${TEST_EXPORT_ROOT}/fail" ]] || exit 23\n'
                'printf "%s" "$TEST_EXPORT_BASE64"'
                ' >"$EVERUNFOLD_SETUP_RESULT_FILE"\n'
            )
            process = subprocess.Popen(
                [
                    "bash",
                    str(Path(__file__).with_name("action_bridge.sh")),
                    str(bridge),
                    str(launcher),
                ],
                env={**os.environ, "TEST_EXPORT_ROOT": str(root), "TEST_EXPORT_BASE64": encoded},
            )
            try:
                for _ in range(50):
                    if (bridge / "alive").exists():
                        break
                    await asyncio.sleep(0.02)
                with patch.dict(os.environ, EVERUNFOLD_SETUP_ACTION_DIR=str(bridge)):
                    (root / "fail").touch()
                    with self.assertRaisesRegex(ValueError, "export-node"):
                        await asyncio.wait_for(export_node(root, False), 5)
                    (root / "fail").unlink()
                    for _ in range(2):
                        self.assertEqual(
                            await asyncio.wait_for(export_node(root, False), 5), encoded
                        )
                        self.assertFalse((root / "external data").exists())
                    (bridge / "status").unlink()
                    (bridge / "request").write_text("touch should-not-exist")
                    for _ in range(50):
                        if (bridge / "status").exists():
                            break
                        await asyncio.sleep(0.02)
                    self.assertEqual((bridge / "status").read_text().strip(), "2")
            finally:
                process.terminate()
                await asyncio.to_thread(process.wait, timeout=5)

    async def test_frontend_probe_contacts_only_the_internal_url(self):
        from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
        from threading import Thread

        paths = []

        class Handler(BaseHTTPRequestHandler):
            def do_GET(self):
                paths.append(self.path)
                self.send_response(302 if redirect else 200)
                if redirect:
                    self.send_header("Location", "/must-not-follow")
                self.end_headers()

            def log_message(self, *args):
                pass

        redirect = False
        server = ThreadingHTTPServer(("127.0.0.1", 0), Handler)
        thread = Thread(target=server.serve_forever)
        thread.start()
        internal = f"http://127.0.0.1:{server.server_port}"
        try:
            results = await frontend_checks("https://unreachable.invalid", internal)
            self.assertEqual([(r.name, r.state) for r in results], [("后端内部入口", "ok")])
            self.assertEqual(paths, ["/health/ready"])
            self.assertIn("GET " + internal + "/health/ready", results[0].detail)
            self.assertTrue(internal_url("http://everunfold-backend:8001"))
            self.assertFalse(internal_url("http://user:password@backend:8001"))
            redirect = True
            result = (await frontend_checks("https://unreachable.invalid", internal))[0]
            self.assertEqual(result.state, "error")
            self.assertIn("302", result.detail)
            self.assertEqual(paths, ["/health/ready", "/health/ready"])
        finally:
            await asyncio.to_thread(server.shutdown)
            server.server_close()
            thread.join()

    async def test_probe_failure_shows_actual_target_and_sanitized_dns_reason(self):
        import urllib.error

        with patch(
            "urllib.request.OpenerDirector.open",
            side_effect=urllib.error.URLError(socket.gaierror("private detail")),
        ):
            result = (
                await frontend_checks("https://public.invalid", "http://everunfold-backend:8001")
            )[0]
        self.assertEqual(result.state, "error")
        self.assertIn("GET http://everunfold-backend:8001/health/ready", result.detail)
        self.assertIn("主机名无法解析", result.detail)
        self.assertNotIn("private detail", result.detail)
        self.assertNotIn("public.invalid", result.detail)

    def test_import_commands_round_trip_paths_without_shell_interpolation(self):
        path = "/opt/my data/quotes' $(touch should-not-exist) `echo no`/web.json"
        for native in (True, False):
            self.assertEqual(
                shlex.split(frontend_import_command(path, native)),
                [
                    "./setup.sh",
                    "--native" if native else "--docker",
                    "--connection-file",
                    path,
                ],
            )
