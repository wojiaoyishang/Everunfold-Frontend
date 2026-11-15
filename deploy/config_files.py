"""Read existing instance files and preserve unedited settings when saving."""

import json
import os
import re
import secrets
import tempfile
import tomllib
from datetime import date, datetime, time
from pathlib import Path
from typing import Any


def env_values(source: str) -> dict[str, str]:
    result = {}
    for line in source.splitlines():
        match = re.match(r"\s*(?:export\s+)?([A-Z_][A-Z0-9_]*)=(.*)$", line)
        if match is None:
            continue
        name, raw = match.groups()
        raw = raw.strip()
        try:
            if raw.startswith('"'):
                value, _ = json.JSONDecoder().raw_decode(raw)
                value = value.replace("$$", "$")
            elif raw.startswith("'"):
                quoted = re.fullmatch(r"'((?:\\'|[^'])*)'\s*(?:#.*)?", raw)
                if quoted is None:
                    raise ValueError
                value = quoted[1].replace("\\'", "'")
            else:
                value = re.split(r"\s+#", raw, maxsplit=1)[0].replace("$$", "$")
        except (ValueError, AttributeError):
            raise ValueError(f"环境变量 {name} 格式无效，请先检查原文件。") from None
        if not isinstance(value, str) or any(ord(char) < 32 or ord(char) == 127 for char in value):
            raise ValueError(f"环境变量 {name} 必须是单行文本。")
        result[name] = value
    return result


def update_env(source: str, values: dict[str, str]) -> str:
    existing = env_values(source)
    values = {name: value for name, value in values.items() if existing.get(name) != value}
    remaining = dict(values)
    lines = []
    for line in source.splitlines():
        match = re.match(r"\s*(?:export\s+)?([A-Z_][A-Z0-9_]*)=", line)
        if match and match[1] in values:
            name = match[1]
            if name in remaining:
                encoded = json.dumps(remaining.pop(name).replace("$", "$$"), ensure_ascii=False)
                lines.append(f"{name}={encoded}")
        else:
            lines.append(line)
    for name, value in remaining.items():
        lines.append(f"{name}={json.dumps(value.replace('$', '$$'), ensure_ascii=False)}")
    return "\n".join(lines) + "\n"


def toml_text(value: dict[str, Any]) -> str:
    def key(name: str) -> str:
        return (
            name if re.fullmatch(r"[A-Za-z0-9_-]+", name) else json.dumps(name, ensure_ascii=False)
        )

    def literal(item: Any) -> str:
        if isinstance(item, str):
            return json.dumps(item, ensure_ascii=False)
        if isinstance(item, bool):
            return "true" if item else "false"
        if isinstance(item, (datetime, date, time)):
            return item.isoformat()
        if isinstance(item, (int, float)):
            return str(item)
        if isinstance(item, list):
            return "[" + ", ".join(literal(part) for part in item) + "]"
        if isinstance(item, dict):
            return "{ " + ", ".join(f"{key(k)} = {literal(v)}" for k, v in item.items()) + " }"
        raise ValueError("配置中包含无法保存的 TOML 值。")

    lines: list[str] = []

    def table(data: dict[str, Any], path: tuple[str, ...] = ()) -> None:
        if path:
            lines.extend(("", "[" + ".".join(key(part) for part in path) + "]"))
        for name, item in data.items():
            if not isinstance(item, dict):
                lines.append(f"{key(name)} = {literal(item)}")
        for name, item in data.items():
            if isinstance(item, dict):
                table(item, (*path, name))

    table(value)
    text = "\n".join(lines).lstrip("\n") + "\n"
    tomllib.loads(text)
    return text


class Files:
    def __init__(self) -> None:
        self.originals: dict[Path, bytes | None] = {}

    def read(self, path: Path) -> str:
        if path.is_symlink():
            raise ValueError(f"请直接编辑符号链接的目标文件：{path.name}")
        content = path.read_bytes() if path.exists() else None
        self.originals[path] = content
        return content.decode("utf-8") if content is not None else ""

    def toml(self, path: Path) -> dict[str, Any]:
        try:
            return tomllib.loads(self.read(path))
        except tomllib.TOMLDecodeError:
            raise ValueError(f"{path.name} TOML 格式无效，请先检查原文件。") from None

    def write(self, values: dict[Path, str]) -> None:
        temporary: dict[Path, Path] = {}
        replaced: list[Path] = []
        backup_id = secrets.token_hex(6)
        try:
            for path, text in values.items():
                original = self.originals[path]
                current = path.read_bytes() if path.exists() else None
                if current != original or path.is_symlink():
                    raise ValueError("配置文件已被其他程序修改，请退出后重新打开向导。")
                if current == text.encode():
                    continue
                path.parent.mkdir(parents=True, exist_ok=True)
                fd, name = tempfile.mkstemp(prefix=f".{path.name}.", dir=path.parent)
                temporary[path] = Path(name)
                with os.fdopen(fd, "w", encoding="utf-8") as stream:
                    stream.write(text)
                if original is not None:
                    backup = path.with_name(f"{path.name}.{backup_id}.bak")
                    fd = os.open(backup, os.O_WRONLY | os.O_CREAT | os.O_EXCL, 0o600)
                    with os.fdopen(fd, "wb") as stream:
                        stream.write(original)
                    print(f"  已备份 {backup}")
            for path, staged in temporary.items():
                os.replace(staged, path)
                replaced.append(path)
            for path in values:
                print(f"  已保存 {path}")
        except BaseException:
            for path in reversed(replaced):
                original = self.originals[path]
                if original is None:
                    path.unlink()
                else:
                    path.write_bytes(original)
            raise
        finally:
            for staged in temporary.values():
                staged.unlink(missing_ok=True)
