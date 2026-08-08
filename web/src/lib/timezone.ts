const BEIJING_OFFSET_MS = 8 * 3600 * 1000

function pad(n: number): string {
  return String(n).padStart(2, "0")
}

function parseBeijingDate(dateStr: string): Date | null {
  if (!dateStr) return null
  const m = dateStr.match(/(\d{4})-(\d{2})-(\d{2})[T ](\d{2}):(\d{2})(?::(\d{2}))?/)
  if (!m) return null
  const [, y, mo, d, h, mi, s] = m
  const utcMs = Date.UTC(+y, +mo - 1, +d, +h, +mi, +(s || 0)) - BEIJING_OFFSET_MS
  const date = new Date(utcMs)
  return isNaN(date.getTime()) ? null : date
}

function formatWithTimezone(date: Date, timezone: string, includeSeconds: boolean): string {
  const parts = new Intl.DateTimeFormat("zh-CN", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: includeSeconds ? "2-digit" : undefined,
    hour12: false,
  }).formatToParts(date)

  const gp = (type: string): string => parts.find((p) => p.type === type)?.value || "00"
  const y = gp("year")
  const mo = gp("month")
  const d = gp("day")
  const h = gp("hour") === "24" ? "00" : gp("hour")
  const mi = gp("minute")
  const result = `${y}-${mo}-${d} ${h}:${mi}`
  if (includeSeconds) return `${result}:${gp("second")}`
  return result
}

export function formatTime(dateStr: string, timezone: string): string {
  if (!dateStr) return "--"
  const date = parseBeijingDate(dateStr)
  if (!date) return dateStr
  const hasSeconds = dateStr.includes(":")
  return formatWithTimezone(date, timezone, hasSeconds)
}

export function formatStartDateTime(dateStr: string, timezone: string): string {
  return formatTime(dateStr, timezone)
}

export function tzToBeijing(dateStr: string, timezone: string): string {
  if (!dateStr) return ""
  const m = dateStr.match(/(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/)
  if (!m) return dateStr
  const [, y, mo, d, h, mi] = m
  const fakeUtc = Date.UTC(+y, +mo - 1, +d, +h, +mi)

  const tzFmt = new Intl.DateTimeFormat("zh-CN", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(new Date(fakeUtc))

  const tzGp = (type: string): string => tzFmt.find((p) => p.type === type)?.value || "00"
  const tzHour = tzGp("hour") === "24" ? "00" : tzGp("hour")

  const utcFmt = new Intl.DateTimeFormat("zh-CN", {
    timeZone: "UTC",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(new Date(fakeUtc))
  const utcGp = (type: string): string => utcFmt.find((p) => p.type === type)?.value || "00"

  const tzAsMs = Date.UTC(+tzGp("year"), +tzGp("month") - 1, +tzGp("day"), tzHour === "24" ? 0 : +tzHour, +tzGp("minute"))
  const utcAsMs = Date.UTC(+utcGp("year"), +utcGp("month") - 1, +utcGp("day"), utcGp("hour") === "24" ? 0 : +utcGp("hour"), +utcGp("minute"))

  const offsetMs = tzAsMs - utcAsMs
  const actualUtc = fakeUtc - offsetMs
  const bjDate = new Date(actualUtc + BEIJING_OFFSET_MS)

  return `${String(bjDate.getUTCFullYear())}-${pad(bjDate.getUTCMonth() + 1)}-${pad(bjDate.getUTCDate())}T${pad(bjDate.getUTCHours())}:${pad(bjDate.getUTCMinutes())}`
}

export function beijingToTz(dateStr: string, timezone: string): string {
  if (!dateStr) return ""
  const date = parseBeijingDate(dateStr)
  if (!date) return dateStr
  return formatWithTimezone(date, timezone, true).replace(" ", "T")
}

export function nowInTz(timezone: string): string {
  const parts = new Intl.DateTimeFormat("zh-CN", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(new Date())

  const gp = (type: string): string => parts.find((p) => p.type === type)?.value || "00"
  return `${gp("year")}-${gp("month")}-${gp("day")}T${gp("hour")}:${gp("minute")}`
}

export function getUnitLabel(unit: string): string {
  switch (unit) {
    case "minutes": return "分钟"
    case "hours": return "小时"
    case "months": return "个月"
    case "days":
    default: return "天"
  }
}

function addIntervalToDate(date: Date, value: number, unit: string): Date {
  const d = new Date(date.getTime())
  switch (unit) {
    case "minutes": d.setUTCMinutes(d.getUTCMinutes() + value); break
    case "hours": d.setUTCHours(d.getUTCHours() + value); break
    case "months": d.setUTCMonth(d.getUTCMonth() + value); break
    case "days":
    default: d.setUTCDate(d.getUTCDate() + value); break
  }
  return d
}

function formatNextDateStr(date: Date, unit: string, timezone: string): string {
  const parts = new Intl.DateTimeFormat("zh-CN", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(date)

  const gp = (type: string): string => parts.find((p) => p.type === type)?.value || "00"
  const y = gp("year")
  const mo = gp("month")
  const d = gp("day")
  const h = gp("hour") === "24" ? "00" : gp("hour")
  const mi = gp("minute")

  if (unit === "minutes" || unit === "hours") return `${y}-${mo}-${d} ${h}:${mi}`
  return `${y}-${mo}-${d}`
}

export function getNextReminderDate(
  startDateStr: string,
  intervalDays: number,
  enabled: number | boolean,
  unit: string,
  timezone: string
): string {
  if (!enabled) return "已暂停"
  const start = parseBeijingDate(startDateStr)
  if (!start || isNaN(start.getTime())) return "--"
  const now = new Date()
  const u = unit || "days"

  if (start > now) return formatNextDateStr(start, u, timezone)

  if (u === "months") {
    const monthDiff = (now.getUTCFullYear() - start.getUTCFullYear()) * 12 + (now.getUTCMonth() - start.getUTCMonth())
    let lastIndex = Math.floor(monthDiff / intervalDays)
    let lastDate = addIntervalToDate(start, lastIndex * intervalDays, "months")
    if (lastDate > now) {
      lastIndex = Math.max(0, lastIndex - 1)
      lastDate = addIntervalToDate(start, lastIndex * intervalDays, "months")
    }
    const next = addIntervalToDate(lastDate, intervalDays, "months")
    return formatNextDateStr(next, u, timezone)
  }

  let unitMs: number
  switch (u) {
    case "minutes": unitMs = 60_000; break
    case "hours": unitMs = 3_600_000; break
    case "days":
    default: unitMs = 86_400_000; break
  }

  const diffMs = now.getTime() - start.getTime()
  let lastIndex = Math.floor(diffMs / (intervalDays * unitMs))
  let lastDate = addIntervalToDate(start, lastIndex * intervalDays, u)
  if (lastDate > now) {
    lastIndex = Math.max(0, lastIndex - 1)
    lastDate = addIntervalToDate(start, lastIndex * intervalDays, u)
  }
  const next = addIntervalToDate(lastDate, intervalDays, u)
  return formatNextDateStr(next, u, timezone)
}
