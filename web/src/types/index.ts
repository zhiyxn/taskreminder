export interface ApiResponse<T = any> {
  success: boolean
  data?: T
  error?: string
  message?: string
}

export interface Reminder {
  id: number
  title: string
  description?: string | null
  start_date: string
  interval_days: number
  interval_unit: "minutes" | "hours" | "days" | "months"
  enabled: number
  created_at: string
  updated_at?: string
  username?: string | null
  telegram_bot_token?: string | null
  telegram_chat_id?: string | null
  email_host?: string | null
  email_port?: number | null
  email_user?: string | null
  email_pass?: string | null
  email_to?: string | null
  feishu_app_id?: string | null
  feishu_app_secret?: string | null
  feishu_receive_id?: string | null
  bark_url?: string | null
  user_id?: number | null
}

export interface LogItem {
  id?: number
  reminder_id?: number
  sent_at: string
  title?: string | null
  description?: string | null
  channel: string
  status: "success" | "failed"
  error_message?: string | null
}

export interface UserItem {
  id: number
  username: string
  role: "admin" | "user"
  status: "active" | "disabled"
  reminder_count: number
  created_at: string
}

export interface AuthUser {
  username: string
  role: "admin" | "user"
  timezone?: string
}

export interface FireResult {
  success: boolean
  error?: string
}

export const SECRET_FIELDS = ["telegram_bot_token", "email_pass", "feishu_app_secret", "bark_url"] as const
export const SECRET_MASK = "********"
