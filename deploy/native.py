"""Native runner: private environment files are parsed, never sourced."""

import argparse
import asyncio
import os
import signal
import subprocess
from pathlib import Path

from config_context import Context

DOCKER = Path(__file__).resolve().parents[1] / "docker"
ROOT = DOCKER.parent
BACKEND = (ROOT / "app").is_dir()


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("action")
    action = parser.parse_args().action
    if action == "configure":
        from config_ui import run
        from configure import configure

        result = run(configure(native=True))
        action = {
            0: "saved",
            10: "cancelled",
            20: "build",
            21: "deploy",
            30: "init-db",
            31: "migrate",
            32: "export-node",
        }.get(result, "failed")
        if action in ("saved", "cancelled"):
            print("配置已保存。" if action == "saved" else "已退出，未保存本次修改。")
            return
        if action == "failed":
            raise SystemExit(1)
    ctx = Context(DOCKER, "backend" if BACKEND else "frontend", native=True)
    ctx.materialize()
    if not ctx.config_path.exists() or not ctx.env_path.exists():
        raise SystemExit("请先运行 ./setup.sh --native 完成配置。")
    environment = {
        **os.environ,
        **ctx.env,
        "CONFIG_FILE": str(ctx.config_path),
        "PYTHONUNBUFFERED": "1",
        "NEXT_TELEMETRY_DISABLED": "1",
    }
    python = str(ROOT / ".venv/bin/python")

    def execute(command: list[str]) -> None:
        print(
            "Everunfold · " + ("Backend" if BACKEND else "Frontend") + " · " + command[0],
            flush=True,
        )
        subprocess.run(command, cwd=ROOT, env=environment, check=True)

    def build() -> None:
        if BACKEND:
            execute(["uv", "sync", "--locked", "--no-dev"])
        else:
            environment["NODE_OPTIONS"] = ctx.compose.get(
                "FRONTEND_BUILD_NODE_OPTIONS", "--max-old-space-size=3072"
            )
            environment["FRONTEND_BUILD_WORKERS"] = ctx.compose.get("FRONTEND_BUILD_WORKERS", "2")
            execute(["npm", "ci", "--ignore-scripts"])
            execute(["npm", "run", "build:host"])
            execute(["npm", "run", "plugins:build", "--", "--output", str(ctx.data / "plugins")])

    def check() -> None:
        if BACKEND:
            execute([python, "deploy/runtime_check.py"])
        else:
            execute(["node", "--import", "tsx", "deploy/check.mjs"])

    if action in ("build", "deploy"):
        build()
        if action == "build":
            print("构建完成。运行 ./setup.sh --native start 启动。")
            return
        action = "start"
    if action in ("init-db", "migrate", "export-node"):
        if not BACKEND:
            raise SystemExit("此操作请在后端仓库执行。")
        if not Path(python).exists():
            build()
        if action == "init-db":
            execute([python, "deploy/runtime_check.py", "--require-empty"])
            execute(
                [
                    python,
                    "init.database.py",
                    "--config",
                    str(ctx.config_path),
                    "--no-create-database",
                ]
            )
        elif action == "migrate":
            execute([python, "-m", "alembic", "-c", "migrations/alembic.ini", "upgrade", "head"])
        else:
            execute([python, "deploy/node_bundle.py"])
            return
        execute(
            [
                python,
                "-m",
                "tools.register_backend_plugins",
                "--config",
                str(ctx.config_path),
                "--apply",
            ]
        )
        check()
        return
    if action == "check":
        check()
        return
    if action == "start":
        check()
    if BACKEND:
        commands = {
            "api": [
                python,
                "-m",
                "uvicorn",
                "app.entrypoints.api:app",
                "--host",
                environment.get("API_HOST", "127.0.0.1"),
                "--port",
                environment.get("API_PORT", "8001"),
                "--workers",
                environment.get("API_WORKERS", "1"),
                "--no-proxy-headers",
            ],
            "worker": [
                python,
                "-m",
                "celery",
                "-A",
                "app.entrypoints.worker:celery_app",
                "worker",
                "--pool",
                environment.get("WORKER_POOL", "solo"),
                "--concurrency",
                environment.get("WORKER_CONCURRENCY", "1"),
                "--loglevel=INFO",
            ],
            "scheduler": [python, "-m", "app.entrypoints.scheduler"],
        }
    else:
        environment.update(NODE_ENV="production", PLUGINS_DIRECTORY=str(ctx.data / "plugins"))
        commands = {
            "web": [
                "node",
                "--import",
                "tsx",
                "tools/plugins/run.mts",
                "start",
                "--port",
                environment.get("FRONTEND_PORT", "3000"),
            ],
            "receiver": ["node", "--import", "tsx", "tools/settings-receiver.mts"],
        }
    if action in commands:
        os.chdir(ROOT)
        os.execvpe(commands[action][0], commands[action], environment)
    if action != "start":
        raise SystemExit("未知操作。")
    processes: list[subprocess.Popen] = []

    def stop(*_: object) -> None:
        for process in processes:
            if process.poll() is None:
                os.killpg(process.pid, signal.SIGTERM)

    signal.signal(signal.SIGTERM, stop)
    signal.signal(signal.SIGINT, stop)
    try:
        for command in commands.values():
            processes.append(
                subprocess.Popen(command, cwd=ROOT, env=environment, start_new_session=True)
            )

        async def supervise() -> int:
            while True:
                for process in processes:
                    status = process.poll()
                    if status is not None:
                        return status
                await asyncio.sleep(0.25)

        status = asyncio.run(supervise())
    finally:
        stop()
        for process in processes:
            try:
                process.wait(timeout=130)
            except subprocess.TimeoutExpired:
                os.killpg(process.pid, signal.SIGKILL)
                process.wait()
    raise SystemExit(status)


if __name__ == "__main__":
    try:
        main()
    except subprocess.CalledProcessError as error:
        raise SystemExit(error.returncode) from None
    except (OSError, ValueError) as error:
        raise SystemExit(str(error)) from None
