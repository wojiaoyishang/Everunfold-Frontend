"""Terminal editing and a review-first menu, using only the Python standard library."""

import codecs
import copy
import os
import select
import sys
import termios
import unicodedata
from collections.abc import Callable
from dataclasses import dataclass


class Terminal:
    def __init__(self) -> None:
        self.history: dict[str, list[str]] = {}

    def __enter__(self) -> "Terminal":
        if not sys.stdin.isatty() or not sys.stdout.isatty():
            raise ValueError("请从交互式终端运行此向导。")
        self.fd = sys.stdin.fileno()
        self.original = termios.tcgetattr(self.fd)
        attributes = copy.deepcopy(self.original)
        attributes[0] &= ~(termios.ICRNL | termios.INLCR | termios.IGNCR | termios.IXON)
        attributes[1] |= termios.OPOST | termios.ONLCR
        attributes[3] &= ~(termios.ICANON | termios.ECHO | termios.IEXTEN)
        attributes[3] |= termios.ISIG
        attributes[6][termios.VMIN] = 1
        attributes[6][termios.VTIME] = 0
        termios.tcsetattr(self.fd, termios.TCSANOW, attributes)
        sys.stdout.write("\x1b[?2004h")
        sys.stdout.flush()
        return self

    def __exit__(self, *_: object) -> None:
        try:
            sys.stdout.write("\x1b[?2004l")
            sys.stdout.flush()
        finally:
            termios.tcsetattr(self.fd, termios.TCSANOW, self.original)
            self.history.clear()

    def key(self) -> str:
        decoder = codecs.getincrementaldecoder(sys.stdin.encoding or "utf-8")("replace")
        while True:
            raw = os.read(self.fd, 1)
            if not raw:
                raise EOFError
            if raw == b"\x1b":
                sequence = raw
                while select.select([self.fd], [], [], 0.05)[0]:
                    char = os.read(self.fd, 1)
                    if not char:
                        break
                    sequence += char
                    if len(sequence) > 2 and (char.isalpha() or char == b"~"):
                        break
                    if len(sequence) >= 16:
                        break
                if sequence == b"\x1b[200~":
                    pasted = bytearray()
                    while not pasted.endswith(b"\x1b[201~"):
                        chunk = os.read(self.fd, 1)
                        if not chunk:
                            raise EOFError
                        pasted.extend(chunk)
                        if len(pasted) > 65536:
                            raise ValueError("粘贴内容过长。")
                    text = pasted[:-6].decode(sys.stdin.encoding or "utf-8", errors="replace")
                    return "".join(
                        char if ord(char) >= 32 and ord(char) != 127 else " " for char in text
                    )
                return sequence.decode("ascii", errors="ignore")
            text = decoder.decode(raw)
            if text:
                return text

    @staticmethod
    def width(text: str) -> int:
        return sum(
            0
            if unicodedata.combining(char)
            else 2
            if unicodedata.east_asian_width(char) in "WF"
            else 1
            for char in text
        )

    def read(self, label: str, current: str = "", *, key: str = "menu", trim: bool = True) -> str:
        print(f"  {label}: ")
        buffer = current
        cursor, start = len(buffer), 0
        history = self.history.setdefault(key, [])
        index, pending = len(history), current
        while True:
            columns = os.get_terminal_size(sys.stdout.fileno()).columns or 80
            available = max(4, columns - 6)
            start = min(start, cursor)
            while self.width(buffer[start:cursor]) >= available:
                start += 1
            end = start
            while end < len(buffer) and self.width(buffer[start : end + 1]) <= available:
                end += 1
            position = 4 + self.width(buffer[start:cursor])
            sys.stdout.write(f"\r\x1b[2K  > {buffer[start:end]}\r\x1b[{position}C")
            sys.stdout.flush()
            pressed = self.key()
            if pressed in ("\r", "\n"):
                print()
                value = buffer.strip() if trim else buffer
                if value and (not history or history[-1] != value):
                    history.append(value)
                    del history[:-30]
                return value
            if pressed == "\x03":
                raise KeyboardInterrupt
            if pressed == "\x04" and not buffer:
                raise EOFError
            if pressed in ("\x1b[A", "\x1bOA", "\x10"):
                if index == len(history):
                    pending = buffer
                if index:
                    index -= 1
                    buffer = history[index]
                    cursor = len(buffer)
            elif pressed in ("\x1b[B", "\x1bOB", "\x0e"):
                if index < len(history):
                    index += 1
                    buffer = history[index] if index < len(history) else pending
                    cursor = len(buffer)
            elif pressed in ("\x1b[D", "\x1bOD", "\x02"):
                cursor = max(0, cursor - 1)
            elif pressed in ("\x1b[C", "\x1bOC", "\x06"):
                cursor = min(len(buffer), cursor + 1)
            elif pressed in ("\x1b[H", "\x1bOH", "\x1b[1~", "\x01"):
                cursor = 0
            elif pressed in ("\x1b[F", "\x1bOF", "\x1b[4~", "\x05"):
                cursor = len(buffer)
            elif pressed in ("\x7f", "\b"):
                if cursor:
                    buffer = buffer[: cursor - 1] + buffer[cursor:]
                    cursor -= 1
            elif pressed in ("\x1b[3~", "\x04"):
                buffer = buffer[:cursor] + buffer[cursor + 1 :]
            elif pressed == "\x15":
                buffer, cursor = "", 0
            elif pressed == "\x0b":
                buffer = buffer[:cursor]
            elif pressed and all(ord(char) >= 32 and ord(char) != 127 for char in pressed):
                if len(buffer) + len(pressed) <= 8192:
                    buffer = buffer[:cursor] + pressed + buffer[cursor:]
                    cursor += len(pressed)


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


class Menu:
    def __init__(
        self,
        title: str,
        fields: list[Field],
        *,
        save: Callable[[], None],
        check: Callable[[], list[str]] = lambda: [],
        changed: Callable[[str], None] = lambda _: None,
    ) -> None:
        self.title = title
        self.fields = fields
        self.save = save
        self.check = check
        self.changed = changed
        self.initial = [field.value for field in fields]

    def show(self) -> None:
        print(f"\n── {self.title} · 配置总览 ──")
        for index, field in enumerate(self.fields, 1):
            value = field.value or f"（{field.empty}）"
            if field.value and field.secret:
                value = "********（已设置，编辑时可查看）"
            if not field.active():
                value = "（当前模式不使用）"
            print(f"  {index:2}. {field.label}: {value}")
        print("\n  1.按次序配置  2.修改某配置项  3.退出")

    def edit(self, terminal: Terminal, field: Field) -> None:
        if not field.active():
            print("  当前模式不使用此项。")
            return
        if field.hint:
            print(f"\n  {field.hint}")
        while True:
            value = terminal.read(field.label, field.value, key=field.key, trim=not field.secret)
            if any(ord(char) < 32 or ord(char) == 127 for char in value):
                print("  输入不能包含控制字符。")
                continue
            try:
                value = field.resolve(value)
                if not field.valid(value):
                    raise ValueError("格式不正确，请修改后重试。")
                field.value = value
                self.changed(field.key)
                return
            except ValueError as error:
                print(f"  {error}")

    def run(self) -> None:
        with Terminal() as terminal:
            print("  输入均回显；←/→ 移动光标，↑/↓ 调取本项会话历史，Ctrl+U 清空。")
            print("  已有值可直接编辑，回车保留；密钥留空的处理见各项提示。")
            while True:
                self.show()
                choice = terminal.read("请选择 1/2/3", key="menu")
                if choice == "1":
                    for field in self.fields:
                        if field.active():
                            self.edit(terminal, field)
                elif choice == "2":
                    selected = terminal.read("配置项编号（留空返回）", key="selection")
                    if not selected:
                        continue
                    if not selected.isdigit() or not 1 <= int(selected) <= len(self.fields):
                        print("  请输入总览中的有效编号。")
                        continue
                    self.edit(terminal, self.fields[int(selected) - 1])
                elif choice == "3":
                    if self.initial == [field.value for field in self.fields]:
                        print("  已退出，未写入配置。")
                        return
                    decision = terminal.read("保存后退出？（y 保存 / n 放弃 / c 返回）", key="save")
                    if decision.lower() == "n":
                        print("  已放弃修改，未写入配置。")
                        return
                    if decision.lower() != "y":
                        continue
                    errors = [
                        f"{index}. {field.label} 尚未正确配置"
                        for index, field in enumerate(self.fields, 1)
                        if field.active() and not field.valid(field.value)
                    ] + self.check()
                    if errors:
                        print("  请先完成以下配置：\n  " + "\n  ".join(errors))
                        continue
                    try:
                        self.save()
                    except (OSError, ValueError) as error:
                        detail = error.strerror if isinstance(error, OSError) else str(error)
                        print(f"  未能保存配置：{detail}")
                        continue
                    return
                else:
                    print("  请输入 1、2 或 3。")
