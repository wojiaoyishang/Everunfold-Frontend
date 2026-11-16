"""Portable, bounded node credential handoff; Base64 is encoding, not encryption."""

import base64
import binascii
import json
import re

from config_validation import identifier, public_url, token, uuid_value

FORMAT = "everunfold-node-connection/v1"
MAX_BYTES = 65536
MAX_ENCODED = 4 * ((MAX_BYTES + 2) // 3)
MARKER = "EVERUNFOLD_NODE_CONNECTION_BASE64="
ERROR = "连接编码无效：请粘贴完整 Base64，检查格式、发布 URL、来源 UUID 和双向令牌。"


def validate_bundle(document: object) -> dict:
    try:
        if not isinstance(document, dict) or document.get("format") != FORMAT:
            raise ValueError
        node, url, epoch = (
            document["node_id"],
            document["backend_public_url"],
            document["source_epoch"],
        )
        if not all(isinstance(value, str) for value in (node, url, epoch)):
            raise ValueError
        if not identifier(node) or len(url) > 2048 or not public_url(url) or not uuid_value(epoch):
            raise ValueError
        credentials = [document["tokens"][key] for key in ("inbound", "outbound")]
        for credential in credentials:
            name, value = credential["name"], credential["value"]
            if not isinstance(name, str) or not re.fullmatch(r"[A-Z_][A-Z0-9_]{0,127}", name):
                raise ValueError
            if not isinstance(value, str) or len(value) > 4096 or not token(value):
                raise ValueError
        if any(credentials[0][key] == credentials[1][key] for key in ("name", "value")):
            raise ValueError
    except (ValueError, KeyError, TypeError):
        raise ValueError(ERROR) from None
    return document


def encode_bundle(document: object) -> str:
    raw = json.dumps(validate_bundle(document), ensure_ascii=False, separators=(",", ":")).encode()
    if len(raw) > MAX_BYTES:
        raise ValueError(ERROR)
    return base64.b64encode(raw).decode("ascii")


def decode_bundle(encoded: str) -> dict:
    try:
        if len(encoded) > MAX_ENCODED + 2048:
            raise ValueError
        compact = re.sub(r"[ \t\r\n]", "", encoded)
        if not compact or len(compact) > MAX_ENCODED:
            raise ValueError
        raw = base64.b64decode(compact, validate=True)
        if len(raw) > MAX_BYTES or base64.b64encode(raw).decode("ascii") != compact:
            raise ValueError
        document = json.loads(raw.decode("utf-8"))
        return validate_bundle(document)
    except (ValueError, TypeError, binascii.Error, UnicodeError, RecursionError):
        raise ValueError(ERROR) from None


def exported_connection(output: str) -> str:
    lines = [line[len(MARKER) :] for line in output.splitlines() if line.startswith(MARKER)]
    if len(lines) != 1:
        raise ValueError("导出结果缺少有效的节点连接 Base64。")
    decode_bundle(lines[0])
    return lines[0]
