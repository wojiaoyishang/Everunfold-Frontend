"""Root config.yaml is authoritative; runtime TOML/env files are derived outputs."""

import copy
import json
import os
import tomllib
from pathlib import Path

import yaml
from config_files import Files, env_values, toml_text, update_env


class ConfigLoader(yaml.SafeLoader):
    pass


def unique_mapping(loader, node, deep=False):
    result = {}
    for key_node, value_node in node.value:
        key = loader.construct_object(key_node, deep=deep)
        if not isinstance(key, str) or key in result:
            raise ValueError("config.yaml 含有重复或非文本键。")
        result[key] = loader.construct_object(value_node, deep=deep)
    return result


ConfigLoader.add_constructor(yaml.resolver.BaseResolver.DEFAULT_MAPPING_TAG, unique_mapping)


class Context:
    def __init__(self, docker: Path, role: str, native: bool = False) -> None:
        self.docker, self.role, self.native = docker, role, native
        self.files = Files()
        selected = os.environ.get("CONFIG_FILE", "config.yaml")
        if not selected.strip():
            raise ValueError("CONFIG_FILE 不能为空。")
        self.root_path = (docker.parent / Path(selected).expanduser()).resolve()
        if self.root_path.suffix.lower() not in {".yaml", ".yml"}:
            raise ValueError(
                "setup 的 CONFIG_FILE 必须指向部署 YAML；旧 TOML 请使用运行入口显式读取。"
            )
        source = self.files.read(self.root_path)
        self.document = {}
        if source:
            try:
                self.document = yaml.load(source, Loader=ConfigLoader)
                json.dumps(self.document)  # Reject recursive aliases and non-JSON scalar types.
                if not isinstance(self.document, dict) or self.document.get("version") != 1:
                    raise ValueError
                if self.document.get("component") != role:
                    raise ValueError
                for name in ("application", "environment", "docker", "assistant"):
                    if not isinstance(self.document.get(name), dict):
                        raise ValueError
                for name in ("environment", "docker"):
                    if not all(isinstance(v, str) for v in self.document[name].values()):
                        raise ValueError
            except (yaml.YAMLError, ValueError, TypeError, RecursionError):
                raise ValueError(
                    "config.yaml 格式无效；请检查版本、组件、重复键及字符串值。"
                ) from None
        self.compose_path = (
            Path(
                os.environ.get("EVERUNFOLD_INSTANCE_DIR", docker.parent / "var/instance")
            ).resolve()
            / "deploy.env"
            if native
            else docker / ".env"
        )
        self.compose_source = self.files.read(self.compose_path)
        self.compose = copy.deepcopy(self.document.get("docker", env_values(self.compose_source)))
        if self.document:
            self.compose_source = update_env("", self.compose)
        prefix = role.upper()
        self.data = (
            self.compose_path.parent
            if native
            else (docker / self.compose.get(prefix + "_DATA_DIR", "data")).resolve()
        )
        self.config_path = docker.parent / "config.runtime.toml"
        self.legacy_config_path = self.data / "config.toml"
        self.env_path = (
            self.data / "runtime.env"
            if native
            else (docker / self.compose.get(prefix + "_ENV_FILE", "runtime.env")).resolve()
        )
        legacy = self.files.read(self.config_path)
        self.imported_from_data = not legacy and not self.document
        if not legacy and not self.document:
            legacy = self.files.read(self.legacy_config_path)
        try:
            self.config = copy.deepcopy(
                self.document["application"] if self.document else tomllib.loads(legacy)
            )
        except tomllib.TOMLDecodeError:
            raise ValueError("原 config.toml 格式无效，请先检查原文件。") from None
        self.env_source = self.files.read(self.env_path)
        self.env = copy.deepcopy(self.document.get("environment", env_values(self.env_source)))
        if self.document:
            self.env_source = update_env("", self.env)
        self.meta_path = self.data / "setup.json"
        legacy_meta = self.files.read(self.meta_path)
        try:
            self.meta = copy.deepcopy(
                self.document["assistant"] if self.document else json.loads(legacy_meta or "{}")
            )
            if not isinstance(self.meta, dict):
                raise ValueError
        except ValueError:
            raise ValueError("setup.json 格式无效。") from None

    def connection_profile(self) -> Path:
        selected = Path(self.config["backend_node_file"])
        if not self.native and selected.is_relative_to("/data"):
            selected = selected.relative_to("/data")
        resolved = (self.data / selected).resolve()
        if not self.native and not resolved.is_relative_to(self.data):
            raise ValueError("Docker 的独立连接文件须位于数据目录内，使用相对路径或 /data 路径。")
        return resolved

    def read_profiles(self, path: Path) -> dict:
        legacy = self.files.read(path)
        if "connection_profiles" in self.document:
            return copy.deepcopy(self.document["connection_profiles"])
        try:
            return tomllib.loads(legacy)
        except tomllib.TOMLDecodeError:
            raise ValueError("独立后端连接文件格式无效。") from None

    def runtime_path(self, directory: str) -> str:
        return str(self.data / directory) if self.native else "/data/" + directory

    def directories(self) -> list[tuple[str, str, str]]:
        return (
            [("media", "uploads_path", "uploads")]
            if self.role == "backend"
            else [("settings", "directory", "settings"), ("cache", "directory", "public-snapshots")]
        )

    def materialize(self) -> None:
        """Apply root YAML edits before any build/start/check operation."""
        if not self.document:
            return
        config = copy.deepcopy(self.config)
        if (
            self.role == "frontend"
            and "connection_profiles" in self.document
            and not config.get("backend_node_file")
        ):
            profiles = self.document["connection_profiles"]
            selected = copy.deepcopy(profiles["profiles"][profiles["active"]])
            epoch = selected.pop("source_epoch", None)
            config.update(selected)
            if epoch:
                config.setdefault("settings", {})["source_epoch"] = epoch
        for section, key, directory in self.directories():
            config.setdefault(section, {}).setdefault(key, self.runtime_path(directory))
        # Process ports have one source: root environment. Compose names are derived.
        mapping = dict(self.compose)
        mapping["EVERUNFOLD_CONFIG_DIR"] = str(self.root_path.parent)
        mapping["EVERUNFOLD_CONFIG_NAME"] = self.root_path.name
        port_names = (
            {"API_PORT": "BACKEND_API_PORT"}
            if self.role == "backend"
            else {"FRONTEND_PORT": "FRONTEND_WEB_PORT"}
        )
        for variable, compose_name in port_names.items():
            if variable in self.env:
                mapping[compose_name] = self.env[variable]
        outputs = {
            self.config_path: toml_text(config),
            self.env_path: self.env_source,
            self.compose_path: update_env(self.compose_source, mapping),
            self.meta_path: json.dumps(self.meta, indent=2) + "\n",
        }
        if self.config.get("backend_node_file"):
            profile = self.connection_profile()
            outputs[profile] = toml_text(self.read_profiles(profile))
            config["backend_node_file"] = (
                str(profile) if self.native else "/data/" + str(profile.relative_to(self.data))
            )
            outputs[self.config_path] = toml_text(config)
        raw_env = self.env_path.with_name(self.env_path.name + ".docker")
        self.files.read(raw_env)
        if any("\n" in v or "\r" in v for v in self.env.values()):
            raise ValueError("环境变量必须是单行值。")
        outputs[raw_env] = "".join(f"{key}={value}\n" for key, value in self.env.items())
        self.files.write(outputs)
        for _, _, directory in self.directories():
            (self.data / directory).mkdir(parents=True, exist_ok=True)
        if self.role == "frontend":
            (self.data / "plugins").mkdir(parents=True, exist_ok=True)
            if not self.native:
                (self.data / "npm-cache").mkdir(parents=True, exist_ok=True)

    def write(self, outputs: dict[Path, str], *, connection_profiles: dict | None = None) -> None:
        document = copy.deepcopy(self.document)
        config = tomllib.loads(outputs.get(self.config_path, toml_text(self.config)))
        if self.role == "backend" and self.imported_from_data and config.get("frontend_nodes_file"):
            nodes_file = Path(config["frontend_nodes_file"])
            if not nodes_file.is_absolute():
                config["frontend_nodes_file"] = (
                    str(self.data / nodes_file) if self.native else "/data/" + str(nodes_file)
                )
        # Omitted directories follow the selected deployment's /data or native instance.
        for section, key, directory in self.directories():
            if config.get(section, {}).get(key) == self.runtime_path(directory):
                config[section].pop(key)
        document.update(
            version=1,
            component=self.role,
            application=config,
            environment=env_values(outputs.get(self.env_path, self.env_source)),
            docker=env_values(outputs.get(self.compose_path, self.compose_source)),
            assistant=json.loads(outputs.get(self.meta_path, json.dumps(self.meta))),
        )
        if self.role == "frontend":
            for name in (
                "FRONTEND_RECEIVER_HOST",
                "FRONTEND_RECEIVER_PORT",
                "FRONTEND_RECEIVER_PUBLISH_PORT",
            ):
                document["environment"].pop(name, None)
                document["docker"].pop(name, None)
            for name in ("receiver_host", "receiver_port"):
                document["application"].get("settings", {}).pop(name, None)
        for derived in ("BACKEND_API_PORT", "FRONTEND_WEB_PORT"):
            variable = {
                "BACKEND_API_PORT": "API_PORT",
                "FRONTEND_WEB_PORT": "FRONTEND_PORT",
            }[derived]
            if variable in document["environment"]:
                document["docker"].pop(derived, None)
        if connection_profiles is not None:
            document["connection_profiles"] = copy.deepcopy(connection_profiles)
        elif config.get("backend_node_file"):
            profile = self.connection_profile()
            document["connection_profiles"] = (
                tomllib.loads(outputs[profile])
                if profile in outputs
                else self.read_profiles(profile)
            )
        header = (
            "# Everunfold 部署配置：请在项目根目录运行 ./setup.sh 编辑。\n"
            "# Docker 与原生部署共用；派生运行文件由助手生成。\n"
            "# 包含私有凭据，请备份并保持权限 0600，不要提交到 Git。\n"
        )
        outputs[self.root_path] = header + yaml.safe_dump(
            document, allow_unicode=True, sort_keys=False, default_flow_style=False
        )
        self.root_path.parent.mkdir(parents=True, exist_ok=True)
        lock_path = self.root_path.with_name(self.root_path.name + ".switch.lock")
        try:
            descriptor = os.open(lock_path, os.O_CREAT | os.O_EXCL | os.O_WRONLY, 0o600)
        except FileExistsError:
            raise ValueError("配置正在由其他页面或 setup 保存，请稍后重试。") from None
        try:
            self.files.write({self.root_path: outputs[self.root_path]})
        finally:
            os.close(descriptor)
            lock_path.unlink()
        self.document = document
        self.env.clear()
        self.env.update(document["environment"])
        self.env_source = update_env("", self.env)
        self.compose.clear()
        self.compose.update(document["docker"])
        self.compose_source = update_env("", self.compose)
        self.meta.clear()
        self.meta.update(document["assistant"])
        self.imported_from_data = False

    def peers(self) -> list[str]:
        # Docker subnets are derived afresh at launch, not persisted as manual grants.
        return ["127.0.0.1", "::1"]
