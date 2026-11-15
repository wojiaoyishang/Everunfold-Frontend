"""Persistent TUI actions, connection probes and host action isolation."""

import asyncio
import os
import subprocess
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch

from config_actions import export_node
from config_probes import frontend_checks
from config_validation import internal_url


class ActionTests(unittest.IsolatedAsyncioTestCase):
    async def test_docker_export_bridge_retries_and_returns_host_absolute_path(self):
        with tempfile.TemporaryDirectory(prefix="everunfold-action-test-") as temp:
            root = Path(temp)
            bridge = root / "bridge"
            bridge.mkdir()
            target = root / "external data/connections/web-main.json"
            launcher = root / "launcher.sh"
            launcher.write_text(
                '#!/bin/bash\nset -eu\n[[ "$1" == export-node ]]\n'
                '[[ ! -f "${TEST_EXPORT_ROOT}/fail" ]] || exit 23\n'
                'mkdir -p "${TEST_EXPORT_ROOT}/external data/connections"\n'
                'printf "{}" >"${TEST_EXPORT_ROOT}/external data/connections/web-main.json"\n'
                'printf "%s" "${TEST_EXPORT_ROOT}/external data/connections/web-main.json"'
                ' >"$EVERUNFOLD_SETUP_RESULT_FILE"\n'
            )
            process = subprocess.Popen(
                [
                    "bash",
                    str(Path(__file__).with_name("action_bridge.sh")),
                    str(bridge),
                    str(launcher),
                ],
                env={**os.environ, "TEST_EXPORT_ROOT": str(root)},
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
                            await asyncio.wait_for(export_node(root, False), 5), str(target)
                        )
                        self.assertTrue(target.is_file())
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
                self.send_response(200)
                self.end_headers()

            def log_message(self, *args):
                pass

        server = ThreadingHTTPServer(("127.0.0.1", 0), Handler)
        thread = Thread(target=server.serve_forever)
        thread.start()
        internal = f"http://127.0.0.1:{server.server_port}"
        try:
            results = await frontend_checks("https://unreachable.invalid", internal)
            self.assertEqual([(r.name, r.state) for r in results], [("后端内部入口", "ok")])
            self.assertEqual(paths, ["/health/ready"])
            self.assertTrue(internal_url("http://everunfold-backend:8001"))
            self.assertFalse(internal_url("http://user:password@backend:8001"))
        finally:
            await asyncio.to_thread(server.shutdown)
            server.server_close()
            thread.join()
