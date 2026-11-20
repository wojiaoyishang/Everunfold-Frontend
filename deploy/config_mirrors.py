"""Build-time package sources and base image overrides."""

import re
from collections.abc import Callable, Mapping
from pathlib import Path
from urllib.parse import urlsplit

PROFILE = "EVERUNFOLD_MIRROR_PROFILE"
APT = "EVERUNFOLD_APT_MIRROR"
APT_SECURITY = "EVERUNFOLD_APT_SECURITY_MIRROR"
PYPI = "EVERUNFOLD_PYPI_INDEX"
NPM = "EVERUNFOLD_NPM_REGISTRY"
PYTHON_IMAGE = "EVERUNFOLD_PYTHON_IMAGE"
UV_IMAGE = "EVERUNFOLD_UV_IMAGE"
NODE_IMAGE = "EVERUNFOLD_NODE_IMAGE"

PROFILES = (
    ("official", "官方源（默认）"),
    ("tuna", "清华 TUNA / npmmirror"),
    ("ustc", "中科大 USTC / npmmirror"),
    ("custom", "自定义"),
)
PRESETS = dict(
    line.split("=", 1)
    for line in Path(__file__).with_name("mirror-presets.env").read_text().splitlines()
    if line and not line.startswith("#")
)
PACKAGE_FIELDS = {
    APT: "Debian APT 主源",
    APT_SECURITY: "Debian APT 安全更新源",
    PYPI: "Python PyPI 索引",
    NPM: "npm Registry",
}
IMAGE_FIELDS = {
    PYTHON_IMAGE: "Python 3.12 基础镜像",
    UV_IMAGE: "uv 0.9.0 基础镜像",
    NODE_IMAGE: "Node.js 22 基础镜像",
}
BOOTSTRAP_KEYS = (PYTHON_IMAGE, UV_IMAGE, PYPI)


def source_keys(role: str) -> tuple[str, ...]:
    return {
        "backend": (PYPI, PYTHON_IMAGE, UV_IMAGE),
        "frontend": (APT, APT_SECURITY, PYPI, NPM, PYTHON_IMAGE, UV_IMAGE, NODE_IMAGE),
        "deploy": (*PACKAGE_FIELDS, *IMAGE_FIELDS),
    }[role]


def source_url(value: str) -> bool:
    if not re.fullmatch(r"https?://[A-Za-z0-9._:/%+\[\]~-]+", value):
        return False
    try:
        url = urlsplit(value)
        return bool(url.hostname) and (url.port is None or url.port > 0)
    except ValueError:
        return False


def image_ref(value: str) -> bool:
    return bool(
        re.fullmatch(r"[A-Za-z0-9][A-Za-z0-9._:/-]*(?:@sha256:[a-f0-9]{64})?", value)
    )


def resolve_sources(settings: Mapping[str, str], role: str) -> dict[str, str]:
    profile = settings.get(PROFILE, "official")
    if profile not in dict(PROFILES):
        raise ValueError("容器软件源方案无效，请选择官方、清华、中科大或自定义。")
    effective = {}
    for key in source_keys(role):
        if key in PACKAGE_FIELDS and profile != "custom":
            value = PRESETS.get(f"{profile}_{key}", "")
        else:
            value = settings.get(key, "")
        if value and not (
            source_url(value) if key in PACKAGE_FIELDS else image_ref(value)
        ):
            raise ValueError(f"{(PACKAGE_FIELDS | IMAGE_FIELDS)[key]}格式无效。")
        effective[key] = value
    return effective


def add_mirror_fields(
    add: Callable,
    value: Callable[[str], str],
    settings: Mapping[str, str],
    role: str,
    active: Callable[[], bool],
) -> Callable[[], dict[str, str]]:
    group = "容器软件源"
    add(
        PROFILE,
        "镜像源方案",
        settings.get(PROFILE, "official"),
        choices=PROFILES,
        group=group,
        active=active,
    )

    def custom_active() -> bool:
        return active() and value(PROFILE) == "custom"

    for key in source_keys(role):
        if key in PACKAGE_FIELDS:
            add(
                key,
                PACKAGE_FIELDS[key],
                settings.get(key, ""),
                valid=lambda text: not text or source_url(text),
                active=custom_active,
                empty="官方源",
                group=group,
                hint="填写镜像的 HTTP/HTTPS 地址。PyPI 需要 Simple API 根地址。留空使用官方源。",
            )
        else:
            add(
                key,
                IMAGE_FIELDS[key],
                settings.get(key, ""),
                valid=lambda text: not text or image_ref(text),
                active=active,
                empty="官方镜像",
                group=group,
                hint="填写含仓库地址的镜像引用，可带标签或 SHA-256 摘要。留空使用默认基础镜像。",
            )

    def saved() -> dict[str, str]:
        return (
            {key: value(key) for key in (PROFILE, *source_keys(role))}
            if active()
            else {}
        )

    return saved
