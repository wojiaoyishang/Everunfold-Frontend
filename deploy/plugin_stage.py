"""Place a successful source build in the inbox shared with prebuilt packages."""

import argparse
import fcntl
import os
import re
from contextlib import contextmanager
from pathlib import Path


@contextmanager
def lock_plugins(data: Path):
    data.mkdir(parents=True, exist_ok=True)
    with (data / ".plugin-release.lock").open("a") as handle:
        try:
            fcntl.flock(handle, fcntl.LOCK_EX | fcntl.LOCK_NB)
        except BlockingIOError:
            raise ValueError("另一个 setup 正在更新前端插件，请稍后重试。") from None
        yield


def stage_plugins(source: Path, data: Path) -> None:
    inbox = data / "plugin-inbox"
    inbox.mkdir(exist_ok=True)
    if inbox.is_symlink():
        raise ValueError(f"插件待发布目录不能是符号链接：{inbox}")
    candidates = sorted(source.iterdir())
    if not candidates:
        raise ValueError("未找到已编译的前端插件。")
    for candidate in candidates:
        if (
            not re.fullmatch(r"[a-z][a-z0-9-]*", candidate.name)
            or not candidate.is_dir()
            or not (candidate / "manifest.json").is_file()
        ):
            raise ValueError(f"插件构建产物不完整：{candidate.name}")
        target = inbox / candidate.name
        if target.is_symlink() or (target.exists() and not target.is_dir()):
            raise ValueError(f"插件待发布目录无效：{target}")
    for candidate in candidates:
        target = inbox / candidate.name
        if not target.exists():
            os.replace(candidate, target)
            continue
        for file in sorted(candidate.iterdir(), key=lambda path: path.name == "manifest.json"):
            os.replace(file, target / file.name)
    print(f"已编译 {len(candidates)} 个前端插件，绝对路径：{inbox.resolve()}", flush=True)
    print("选择「热更新前端」应用待发布的插件。", flush=True)


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("source", type=Path)
    parser.add_argument("data", type=Path)
    args = parser.parse_args()
    try:
        stage_plugins(args.source, args.data)
    except (OSError, ValueError) as error:
        raise SystemExit(str(error)) from None
