import assert from "node:assert/strict"
import test from "node:test"
import {
  email,
  exactLength,
  integerRange,
  intervalUnit,
  minLength,
  optionalBarkTarget,
  optionalEmail,
  optionalHostname,
  optionalIntegerRange,
  optionalMaxLength,
  optionalMinLength,
  optionalNoWhitespace,
  oneOf,
  required,
} from "../src/lib/formValidation.ts"

test("必填规则拒绝空值和纯空格", () => {
  const rule = required("必填")
  assert.equal(rule(""), "必填")
  assert.equal(rule("   "), "必填")
  assert.equal(rule("内容"), true)
})

test("邮箱规则校验必填与可选邮箱", () => {
  assert.equal(email()("bad-email"), "请输入有效的邮箱地址")
  assert.equal(email()("user@example.com"), true)
  assert.equal(optionalEmail()(""), true)
  assert.equal(optionalEmail()("   "), "请输入有效的邮箱地址")
  assert.equal(optionalEmail()("user@"), "请输入有效的邮箱地址")
})

test("密码长度规则区分必填和可选密码", () => {
  assert.equal(minLength(6, "至少 6 位")("12345"), "至少 6 位")
  assert.equal(minLength(6, "至少 6 位")("123456"), true)
  assert.equal(optionalMinLength(6, "至少 6 位")(""), true)
  assert.equal(optionalMinLength(6, "至少 6 位")("      "), "至少 6 位")
  assert.equal(optionalMinLength(6, "至少 6 位")("123"), "至少 6 位")
})

test("验证码必须为指定长度", () => {
  const rule = exactLength(4, "请输入 4 位验证码")
  assert.equal(rule("123"), "请输入 4 位验证码")
  assert.equal(rule("A1B2"), true)
})

test("提醒周期必须是范围内的整数", () => {
  const rule = integerRange(1, () => 59, () => "请输入 1 到 59 之间的整数")
  assert.equal(rule(Number.NaN), "请输入 1 到 59 之间的整数")
  assert.equal(rule(1.5), "请输入 1 到 59 之间的整数")
  assert.equal(rule(60), "请输入 1 到 59 之间的整数")
  assert.equal(rule(59), true)
  assert.equal(intervalUnit("weeks"), "请选择有效的间隔单位")
  assert.equal(intervalUnit("days"), true)
  assert.equal(oneOf(["admin", "user"], "角色无效")("owner"), "角色无效")
})

test("SMTP 端口和主机规则允许空配置但拒绝无效值", () => {
  const port = optionalIntegerRange(1, 65535, "端口无效")
  assert.equal(port(""), true)
  assert.equal(port(0), "端口无效")
  assert.equal(port(65536), "端口无效")
  assert.equal(port(465), true)
  assert.equal(optionalHostname()("smtp.example.com"), true)
  assert.equal(optionalHostname()("https://smtp.example.com"), "请输入有效的 SMTP 主机地址")
})

test("渠道标识不允许空白字符", () => {
  const rule = optionalNoWhitespace("不能包含空格")
  assert.equal(rule(""), true)
  assert.equal(rule("abc_123"), true)
  assert.equal(rule("abc 123"), "不能包含空格")
  assert.equal(rule("   "), "不能包含空格")
  assert.equal(optionalMaxLength(5, "过长")("123456"), "过长")
})

test("Bark 支持 Device Key 和 HTTP(S) URL", () => {
  const rule = optionalBarkTarget()
  assert.equal(rule(""), true)
  assert.equal(rule("********"), true)
  assert.equal(rule("device-key"), true)
  assert.equal(rule("device/key"), "请输入有效的 Bark URL 或 Device Key")
  assert.equal(rule("https://api.day.app/device-key"), true)
  assert.equal(rule("ftp://api.day.app/device-key"), "请输入有效的 Bark URL 或 Device Key")
  assert.equal(rule("https://bad host/device-key"), "请输入有效的 Bark URL 或 Device Key")
})
