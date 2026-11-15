"""Shared field model for the two standalone deployment assistants."""

from collections.abc import Awaitable, Callable
from dataclasses import dataclass, field


@dataclass
class Check:
    name: str
    state: str
    detail: str
    code: str = ""


@dataclass
class Field:
    key: str
    label: str
    value: str = ""
    valid: Callable[[str], bool] = bool
    hint: str = ""
    empty: str = "待填写"
    secret: bool = False
    active: Callable[[], bool] = lambda: True
    resolve: Callable[[str], str] = lambda value: value
    group: str = "基本设置"
    generate: Callable[[], str] | None = None
    history: list[str] = field(default_factory=list)


class Configuration:
    def __init__(
        self,
        title: str,
        fields: list[Field],
        *,
        save: Callable[[], None],
        check: Callable[[], list[str]] = lambda: [],
        changed: Callable[[str], None] = lambda _: None,
        probe: Callable[[], Awaitable[list[Check]]] | None = None,
        export_node: Callable[[], Awaitable[str]] | None = None,
        native: bool = False,
        backend: bool = False,
        location: str = "",
        notice: str = "",
    ) -> None:
        self.title = title
        self.fields = fields
        self.save = save
        self.check = check
        self.changed = changed
        self.probe = probe
        self.export_node = export_node
        self.native = native
        self.backend = backend
        self.location = location
        self.notice = notice
        self.initial = self.snapshot()

    def snapshot(self) -> tuple[str, ...]:
        return tuple(item.value for item in self.fields)

    def get(self, key: str) -> str:
        return next(item.value for item in self.fields if item.key == key)

    def edit(self, item: Field, value: str) -> None:
        if not item.active():
            raise ValueError("当前模式不使用此项。")
        if not item.secret:
            value = value.strip()
        if any(ord(char) < 32 or ord(char) == 127 for char in value):
            raise ValueError("请输入单行文本。")
        resolved = item.resolve(value)
        if not item.valid(resolved):
            raise ValueError("格式不正确，请检查后重试。")
        item.value = resolved
        if not item.history or item.history[-1] != value:
            item.history.append(value)
            del item.history[:-30]
        self.changed(item.key)

    def errors(self) -> list[str]:
        return [
            f"{item.label}：尚未正确填写"
            for item in self.fields
            if item.active() and not item.valid(item.value)
        ] + self.check()
