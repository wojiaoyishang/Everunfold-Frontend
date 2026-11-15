"""Run node export without ending the configuration screen."""

import asyncio
import os
import tempfile
from pathlib import Path


async def export_node(root: Path, native: bool) -> str:
    if native:
        with tempfile.TemporaryDirectory(prefix="everunfold-export-") as temporary:
            result = Path(temporary) / "path"
            process = await asyncio.create_subprocess_exec(
                str(root / "setup.sh"),
                "--native",
                "export-node",
                cwd=root,
                env={**os.environ, "EVERUNFOLD_SETUP_RESULT_FILE": str(result)},
                stdout=asyncio.subprocess.DEVNULL,
                stderr=asyncio.subprocess.DEVNULL,
            )
            if await process.wait() or not result.is_file():
                raise ValueError(
                    "请检查数据库迁移和节点配置，或运行 ./setup.sh --native export-node 查看详情。"
                )
            return result.read_text().strip()
    # The host performs Docker operations. The tool container never receives
    # docker.sock or general-purpose command execution through this mailbox.
    directory = os.environ.get("EVERUNFOLD_SETUP_ACTION_DIR")
    if not directory:
        raise ValueError("请通过项目根目录的 ./setup.sh --docker 启动助手。")
    bridge = Path(directory)
    status, result = bridge / "status", bridge / "path"
    status.unlink(missing_ok=True)
    result.unlink(missing_ok=True)
    (bridge / "request.tmp").write_text("export-node\n")
    (bridge / "request.tmp").replace(bridge / "request")
    while not status.is_file():
        await asyncio.sleep(0.2)
        if not (bridge / "alive").exists():
            raise ValueError("宿主导出任务已停止，请重新打开助手。")
    if status.read_text().strip() != "0" or not result.is_file():
        raise ValueError(
            "请检查数据库迁移和节点配置，或运行 ./setup.sh --docker export-node 查看详情。"
        )
    path = result.read_text().strip()
    if not Path(path).is_absolute():
        raise ValueError("导出结果缺少文件绝对路径。")
    return path
