export type ValidationResult = true | string
export type ValidationRule<T = unknown> = (value: T) => ValidationResult

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const INTERVAL_UNITS = new Set(["minutes", "hours", "days", "months"])

function isEmpty(value: unknown): boolean {
  return value === undefined || value === null || String(value).trim() === ""
}

function isMissing(value: unknown): boolean {
  return value === undefined || value === null || value === ""
}

export function required(message: string): ValidationRule {
  return (value) => isEmpty(value) ? message : true
}

export function email(message = "请输入有效的邮箱地址"): ValidationRule {
  return (value) => {
    if (isEmpty(value)) return message
    return EMAIL_PATTERN.test(String(value).trim()) ? true : message
  }
}

export function optionalEmail(message = "请输入有效的邮箱地址"): ValidationRule {
  return (value) => isMissing(value) || EMAIL_PATTERN.test(String(value).trim()) ? true : message
}

export function minLength(min: number, message: string): ValidationRule {
  return (value) => !isEmpty(value) && String(value).length >= min ? true : message
}

export function optionalMinLength(min: number, message: string): ValidationRule {
  return (value) => isMissing(value) || (!isEmpty(value) && String(value).length >= min) ? true : message
}

export function optionalMaxLength(max: number, message: string): ValidationRule {
  return (value) => isMissing(value) || String(value).length <= max ? true : message
}

export function exactLength(length: number, message: string): ValidationRule {
  return (value) => String(value ?? "").trim().length === length ? true : message
}

export function optionalNoWhitespace(message: string): ValidationRule {
  return (value) => isMissing(value) || !/\s/.test(String(value)) ? true : message
}

export function optionalIntegerRange(min: number, max: number, message: string): ValidationRule {
  return (value) => {
    if (isMissing(value)) return true
    const number = typeof value === "number" ? value : Number(value)
    return Number.isFinite(number) && Number.isInteger(number) && number >= min && number <= max
      ? true
      : message
  }
}

export function integerRange(min: number, getMax: () => number, message: () => string): ValidationRule {
  return (value) => {
    const number = typeof value === "number" ? value : Number(value)
    return Number.isFinite(number) && Number.isInteger(number) && number >= min && number <= getMax()
      ? true
      : message()
  }
}

export function optionalHostname(message = "请输入有效的 SMTP 主机地址"): ValidationRule {
  return (value) => {
    if (isMissing(value)) return true
    const host = String(value).trim()
    if (host.length > 253 || /\s|:\/\//.test(host)) return message
    return /^[\p{L}\p{N}._:[\]-]+$/u.test(host) ? true : message
  }
}

export function optionalBarkTarget(message = "请输入有效的 Bark URL 或 Device Key"): ValidationRule {
  return (value) => {
    if (isMissing(value) || value === "********") return true
    const target = String(value).trim()
    if (!target || /\s/.test(String(value))) return message
    if (!target.startsWith("http")) return /^[A-Za-z0-9_-]+$/.test(target) ? true : message
    try {
      const url = new URL(target)
      return (url.protocol === "http:" || url.protocol === "https:") && !!url.hostname ? true : message
    } catch {
      return message
    }
  }
}

export function intervalUnit(value: unknown): ValidationResult {
  return INTERVAL_UNITS.has(String(value)) ? true : "请选择有效的间隔单位"
}

export function oneOf(values: readonly string[], message: string): ValidationRule {
  const allowed = new Set(values)
  return (value) => allowed.has(String(value)) ? true : message
}
