/** Read the password twice from a terminal without echoing it. */
import { randomBytes, scryptSync } from "node:crypto";
import { createInterface } from "node:readline/promises";
import { Writable } from "node:stream";

if (!process.stdin.isTTY) {
  console.error("请在终端运行此命令。");
  process.exit(1);
}
const silent = new Writable({
  write(_chunk, _encoding, done) {
    done();
  },
});
const terminal = createInterface({
  input: process.stdin,
  output: silent,
  terminal: true,
  historySize: 0,
});
async function password(prompt) {
  process.stderr.write(prompt);
  try {
    return await terminal.question("");
  } finally {
    process.stderr.write("\n");
  }
}
try {
  const first = await password("本机诊断密码：");
  const second = await password("再次输入：");
  if (first !== second || first.length < 12 || first.length > 1024) {
    console.error("两次密码须一致，长度须为 12–1024 字符。");
    process.exitCode = 1;
  } else {
    const salt = randomBytes(16);
    const digest = scryptSync(first, salt, 32).toString("hex");
    console.log(`password_hash = "scrypt$${salt.toString("hex")}$${digest}"`);
  }
} finally {
  terminal.close();
}
