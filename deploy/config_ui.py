"""Color terminal UI. Terminal drawing and restoration belong to Textual."""

import asyncio
import contextlib
import io
from urllib.parse import quote, unquote, urlsplit, urlunsplit

from config_model import Check, Configuration, Field
from rich.text import Text
from textual import work
from textual.app import App, ComposeResult
from textual.binding import Binding
from textual.containers import Horizontal, Vertical, VerticalScroll
from textual.screen import ModalScreen
from textual.widgets import Button, DataTable, Footer, Header, Input, Label, RichLog, Static

ACTIONS = {
    "save": 0,
    "build": 20,
    "deploy": 21,
    "init-deploy": 22,
    "init-db": 30,
    "migrate": 31,
    "export-node": 32,
}


class HistoryInput(Input):
    BINDINGS = [
        Binding("up", "previous", show=False),
        Binding("down", "following", show=False),
        Binding("ctrl+u", "clear", show=False),
    ]

    def __init__(self, value: str, history: list[str], **kwargs) -> None:
        super().__init__(value=value, **kwargs)
        self.entries = list(history)
        self.position = len(self.entries)
        self.pending = value

    def action_previous(self) -> None:
        if self.position == len(self.entries):
            self.pending = self.value
        if self.position:
            self.position -= 1
            self.value = self.entries[self.position]
            self.cursor_position = len(self.value)

    def action_following(self) -> None:
        if self.position < len(self.entries):
            self.position += 1
            self.value = (
                self.entries[self.position] if self.position < len(self.entries) else self.pending
            )
            self.cursor_position = len(self.value)

    def action_clear(self) -> None:
        self.value = ""


class Confirm(ModalScreen[bool]):
    def __init__(self, message: str) -> None:
        super().__init__()
        self.message = message

    def compose(self) -> ComposeResult:
        with Vertical(id="dialog"):
            yield Static(self.message, markup=False)
            with Horizontal(classes="buttons"):
                yield Button("继续", variant="primary", id="yes")
                yield Button("返回", id="no")

    def on_button_pressed(self, event: Button.Pressed) -> None:
        event.stop()
        self.dismiss(event.button.id == "yes")

    def key_escape(self) -> None:
        self.dismiss(False)


class DatabaseForm(ModalScreen[str | None]):
    def __init__(self, value: str, native: bool = False) -> None:
        super().__init__()
        host = "localhost" if native else "postgresql"
        self.original = urlsplit(value or f"postgresql+asyncpg://everunfold@{host}:5432/everunfold")
        _ = self.original.port  # Validate an unfinished port before opening the modal.

    def compose(self) -> ComposeResult:
        url = self.original
        with VerticalScroll(id="dialog"):
            yield Label("PostgreSQL · 分项填写", classes="dialog-title")
            for key, title, value in (
                ("dbhost", "主机", url.hostname or "localhost"),
                ("dbport", "端口", str(url.port or 5432)),
                ("dbname", "数据库", unquote(url.path.lstrip("/")) or "everunfold"),
                ("dbuser", "用户名", unquote(url.username or "")),
                ("dbpass", "密码（回显）", unquote(url.password or "")),
            ):
                yield Label(title)
                yield Input(value=value, id=key)
            yield Static("", id="error", markup=False)
            with Horizontal(classes="buttons"):
                yield Button("应用", id="apply", variant="primary")
                yield Button("返回", id="cancel")

    def on_button_pressed(self, event: Button.Pressed) -> None:
        event.stop()
        if event.button.id == "cancel":
            self.dismiss(None)
            return
        values = {
            key: self.query_one("#" + key, Input).value
            for key in ("dbhost", "dbport", "dbname", "dbuser", "dbpass")
        }
        try:
            port = int(values["dbport"])
            if not 1 <= port <= 65535 or not all(
                values[key].strip() for key in ("dbhost", "dbname", "dbuser")
            ):
                raise ValueError
            host = values["dbhost"].strip().strip("[]")
            if any(char in host for char in "/?#@") or any(char.isspace() for char in host):
                raise ValueError
            if ":" in host:
                host = "[" + host + "]"
            user = quote(values["dbuser"], safe="")
            password = quote(values["dbpass"], safe="")
            authority = f"{user}:{password}@{host}:{port}"
            self.dismiss(
                urlunsplit(
                    (
                        "postgresql+asyncpg",
                        authority,
                        "/" + quote(values["dbname"], safe=""),
                        self.original.query,
                        "",
                    )
                )
            )
        except ValueError:
            self.query_one("#error", Static).update("请检查主机、端口、数据库和用户名。")


class Editor(ModalScreen[bool]):
    def __init__(self, config: Configuration, item: Field) -> None:
        super().__init__()
        self.config, self.item = config, item

    def compose(self) -> ComposeResult:
        item = self.item
        with Vertical(id="dialog"):
            yield Label(item.label, classes="dialog-title")
            yield Static(item.hint or "直接编辑当前值，回车应用。", markup=False)
            yield HistoryInput(item.value, item.history, id="value")
            yield Static("← → 移动 · ↑ ↓ 本项历史 · Ctrl+U 清空 · Esc 返回", classes="muted")
            yield Static("", id="error", markup=False)
            with Horizontal(classes="buttons"):
                yield Button("应用", id="apply", variant="primary")
                if item.generate:
                    yield Button("重新生成", id="generate", variant="warning")
                if item.key == "database":
                    yield Button("分项填写", id="parts")
                yield Button("返回", id="cancel")

    def on_mount(self) -> None:
        entry = self.query_one("#value", Input)
        entry.focus()
        entry.cursor_position = len(entry.value)

    def apply(self) -> None:
        try:
            self.config.edit(self.item, self.query_one("#value", Input).value)
        except ValueError as error:
            self.query_one("#error", Static).update(str(error))
        else:
            self.dismiss(True)

    def on_input_submitted(self) -> None:
        self.apply()

    def on_button_pressed(self, event: Button.Pressed) -> None:
        event.stop()
        if event.button.id == "apply":
            self.apply()
        elif event.button.id == "cancel":
            self.dismiss(False)
        elif event.button.id == "generate" and self.item.generate:
            self.query_one("#value", Input).value = self.item.generate()
        elif event.button.id == "parts":
            try:
                form = DatabaseForm(self.query_one("#value", Input).value, self.config.native)
            except ValueError:
                self.query_one("#error", Static).update("URL 格式无效，请修正或清空后分项填写。")
            else:
                self.app.push_screen(form, self.parts)

    def parts(self, result: str | None) -> None:
        if result is not None:
            self.query_one("#value", Input).value = result

    def key_escape(self) -> None:
        self.dismiss(False)


class SetupApp(App[int]):
    TITLE = "Everunfold · 部署助手"
    ENABLE_COMMAND_PALETTE = False
    CSS = """
    Screen { background: $background; }
    #intro { height: auto; padding: 1 2; color: $text; }
    #configuration { height: 1fr; min-height: 8; margin: 0 2; border: round $primary; }
    #checks { height: 7; margin: 0 2; border: round $secondary; }
    .buttons { height: auto; min-height: 3; align: center middle; }
    .buttons Button { min-width: 10; margin: 0 1; }
    #actions { height: auto; }
    #dialog { width: 86%; max-width: 100; height: auto; max-height: 95%;
              padding: 1 2; border: thick $primary; background: $surface; }
    ModalScreen { align: center middle; background: $background 65%; }
    .dialog-title { text-style: bold; color: $accent; margin-bottom: 1; }
    #error { color: $error; height: auto; min-height: 1; }
    .muted { color: $text-muted; height: auto; }
    Screen.compact #intro { padding: 0 1; height: 2; }
    Screen.compact #configuration { min-height: 4; margin: 0 1; }
    Screen.compact #checks { height: 4; margin: 0 1; }
    Screen.compact .buttons { height: 1; min-height: 1; }
    Screen.compact .buttons Button { height: 1; min-height: 1; border: none; padding: 0 1; }
    """
    BINDINGS = [
        Binding("1", "sequential", "顺序配置"),
        Binding("2", "edit", "修改选中项"),
        Binding("3", "leave", "退出"),
        Binding("ctrl+t", "test", "检测连接"),
        Binding("ctrl+s", "save", "保存"),
        Binding("ctrl+q", "leave", "退出"),
        Binding("ctrl+c", "leave", show=False),
    ]

    def __init__(self, config: Configuration) -> None:
        super().__init__()
        self.config = config
        self.sequence: list[Field] = []
        self.results: list[Check] = []
        self.testing = False
        self.theme = "textual-dark"

    def compose(self) -> ComposeResult:
        yield Header()
        yield Static(
            f"{self.config.title}  ·  {'不使用 Docker' if self.config.native else 'Docker'}\n"
            f"配置文件：{self.config.location}",
            id="intro",
            markup=False,
        )
        yield DataTable(id="configuration", cursor_type="row", zebra_stripes=True)
        yield RichLog(id="checks", wrap=True, markup=False)
        with Vertical(id="actions"):
            with Horizontal(classes="buttons"):
                yield Button("1 顺序配置", id="sequential")
                yield Button("2 修改选中项", id="edit")
                yield Button("检测连接", id="test", variant="primary")
                yield Button("3 退出", id="leave")
            with Horizontal(classes="buttons"):
                yield Button("仅保存", id="save")
                yield Button("保存并构建", id="build", variant="success")
                yield Button("构建并启动", id="deploy", variant="success")
            if self.config.backend:
                with Horizontal(classes="buttons"):
                    yield Button("初始化数据库并构建启动", id="init-deploy", variant="success")
                    yield Button("初始化新库", id="init-db")
                with Horizontal(classes="buttons"):
                    yield Button("升级迁移", id="migrate")
                    yield Button("登记并导出节点", id="export-node")
        yield Footer()

    def on_mount(self) -> None:
        self.sub_title = self.config.title
        table = self.query_one(DataTable)
        self.refresh_fields()
        if self.config.backend:
            message = (
                "启动时会自动初始化空库；检测连接不会修改数据库。"
                if self.config.get("auto_init_empty_db") == "1"
                else "空库自动初始化已关闭；可点“初始化新库”单独执行。"
            )
        else:
            message = "导入后端连接文件可自动填写节点信息和令牌。"
        self.query_one("#checks", RichLog).write("尚未检测。" + message)
        table.focus()

    def on_resize(self, event) -> None:
        self.screen.set_class(event.size.height < 34, "compact")
        if self.is_mounted:
            self.refresh_fields(event.size.width)

    def refresh_fields(self, width: int | None = None) -> None:
        table = self.query_one(DataTable)
        row = table.cursor_row
        table.clear(columns=True)
        available = max(48, (width or self.size.width) - 12)
        label_width = min(42, max(23, int(available * 0.45)))
        table.add_column("分组 / 配置项", width=label_width)
        table.add_column("当前值", width=max(15, available - label_width - 12))
        table.add_column("状态", width=6)
        for item in self.config.fields:
            active = item.active()
            ok = not active or item.valid(item.value)
            text = item.value or f"（{item.empty}）"
            if item.secret and item.value:
                text = "••••••••  编辑可查看"
            if not active:
                text = "当前模式不使用"
            table.add_row(
                f"{item.group} / {item.label}",
                Text(text),
                Text(
                    "已填写" if ok and active else "不使用" if not active else "待填写",
                    style="green" if ok and active else "dim" if not active else "yellow",
                ),
                key=item.key,
            )
        table.move_cursor(row=min(row, len(self.config.fields) - 1))

    def on_data_table_row_selected(self) -> None:
        self.action_edit()

    def action_edit(self) -> None:
        item = self.config.fields[self.query_one(DataTable).cursor_row]
        if item.active():
            self.push_screen(Editor(self.config, item), self.edited)

    def action_sequential(self) -> None:
        self.sequence = list(self.config.fields)
        self.next_item()

    def next_item(self) -> None:
        while self.sequence:
            item = self.sequence.pop(0)
            if item.active():
                self.push_screen(Editor(self.config, item), self.edited)
                return

    def edited(self, applied: bool) -> None:
        self.refresh_fields()
        if applied:
            self.results = []
            self.query_one("#checks", RichLog).clear()
            self.query_one("#checks", RichLog).write("配置已修改，检测结果已失效。")
            self.next_item()
        else:
            self.sequence = []

    def action_leave(self) -> None:
        if self.config.snapshot() == self.config.initial:
            self.exit(10)
        else:
            self.push_screen(
                Confirm("放弃本次尚未保存的修改并退出？"),
                lambda yes: self.exit(10) if yes else None,
            )

    def action_test(self) -> None:
        self.test_connections()

    @work(exclusive=True, group="connections")
    async def test_connections(self) -> None:
        self.testing = True
        log = self.query_one("#checks", RichLog)
        log.clear()
        log.write("正在从当前运行环境检测连接…")
        snapshot = self.config.snapshot()
        try:
            self.results = await self.config.probe() if self.config.probe else []
            if snapshot != self.config.snapshot():
                self.results = []
                log.write("检测期间配置已变化，请重新检测。")
                return
            for result in self.results:
                style = {"ok": "green", "warning": "yellow", "error": "red"}[result.state]
                log.write(Text(f"{result.name} · {result.detail}", style=style))
        except asyncio.CancelledError:
            raise
        except Exception:
            log.write(Text("检测未完成，请检查配置后重试。", style="red"))
        finally:
            self.testing = False

    def action_save(self) -> None:
        self.finish("save")

    @work(exclusive=True, group="finish")
    async def finish(self, action: str) -> None:
        errors = self.config.errors()
        if action == "export-node" and not self.config.get("receiver"):
            errors.append("请填写该节点的内部接收器 URL。")
        if errors:
            log = self.query_one("#checks", RichLog)
            log.clear()
            for error in errors:
                log.write(Text(error, style="red"))
            return
        if action in ("init-db", "init-deploy", "migrate", "export-node"):
            description = {
                "init-db": (
                    "保存配置并检查数据库；仅空库会初始化和创建管理员，已初始化则跳过。继续？"
                ),
                "init-deploy": (
                    "保存配置并构建，初始化空库后启动服务。此操作不受自动初始化开关限制；"
                    "已有库不重置，旧版本仍需升级迁移。继续？"
                ),
                "migrate": "保存配置，并执行数据库迁移？请先完成数据库备份。",
                "export-node": "保存配置，登记所选节点的内部连接并导出配对文件？",
            }[action]
            if not await self.push_screen_wait(Confirm(description)):
                return
        try:
            with contextlib.redirect_stdout(io.StringIO()):
                self.config.save()
        except (OSError, ValueError) as error:
            message = error.strerror if isinstance(error, OSError) else str(error)
            self.query_one("#checks", RichLog).write(Text(f"未保存：{message}", style="red"))
            return
        self.exit(ACTIONS[action])

    def on_button_pressed(self, event: Button.Pressed) -> None:
        action = event.button.id
        if action in ACTIONS:
            self.finish(action)
        elif action:
            getattr(self, "action_" + action)()


def run(config: Configuration) -> int:
    return SetupApp(config).run() or 0
