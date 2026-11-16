"""Copyable text and shell-safe frontend import commands."""

import shlex
from contextlib import suppress

from textual.app import ComposeResult
from textual.containers import Horizontal, Vertical
from textual.screen import ModalScreen
from textual.widgets import Button, Label, RichLog, Static, TextArea


def frontend_import_command(path: str, native: bool) -> str:
    return shlex.join(
        ["./setup.sh", "--native" if native else "--docker", "--connection-file", path]
    )


def frontend_base64_import_command(native: bool) -> str:
    return "./setup.sh " + ("--native" if native else "--docker") + " --connection-base64"


class ResultsLog(RichLog):
    """Keep the complete plain text, independently of terminal wrapping."""

    def __init__(self, **kwargs) -> None:
        super().__init__(**kwargs)
        self.transcript: list[str] = []

    def write(self, content, *args, **kwargs):
        self.transcript.append(getattr(content, "plain", str(content)))
        return super().write(content, *args, **kwargs)

    def clear(self):
        self.transcript.clear()
        return super().clear()


class CopyText(ModalScreen[None]):
    def __init__(self, title: str, text: str, command: str = "", encoded: str = "") -> None:
        super().__init__()
        self.heading, self.text, self.command, self.encoded = title, text, command, encoded

    def compose(self) -> ComposeResult:
        with Vertical(id="dialog"):
            yield Label(self.heading, classes="dialog-title")
            yield TextArea(self.text, read_only=True, id="copy-text")
            yield Static(
                "可选中文字后 Ctrl+C。终端不支持剪贴板时，点“终端复制”再用鼠标选择。",
                markup=False,
            )
            with Horizontal(classes="buttons"):
                if self.encoded:
                    yield Button("复制 Base64", id="copy-base64", variant="primary")
                else:
                    yield Button("复制全部", id="copy-all", variant="primary")
                if self.command:
                    yield Button("复制导入命令", id="copy-command")
                yield Button("终端复制", id="terminal-copy")
                yield Button("返回", id="copy-close")

    def on_mount(self) -> None:
        self.query_one(TextArea).focus()

    def on_button_pressed(self, event: Button.Pressed) -> None:
        event.stop()
        if event.button.id == "copy-close":
            self.dismiss(None)
        elif event.button.id == "terminal-copy":
            # Restore normal terminal selection, even over SSH / docker attach.
            # No clipboard utilities, Docker socket or remote commands are needed.
            with self.app.suspend():
                print("\n" + self.heading + "\n" + self.text + "\n", flush=True)
                with suppress(EOFError, KeyboardInterrupt):
                    input("请使用终端选择并复制文字；按回车返回配置界面。")
        else:
            self.app.copy_to_clipboard(
                self.command
                if event.button.id == "copy-command"
                else self.encoded
                if event.button.id == "copy-base64"
                else self.text
            )
            self.notify("已发送复制请求；若剪贴板未变化，请使用“终端复制”。")

    def key_escape(self) -> None:
        self.dismiss(None)
