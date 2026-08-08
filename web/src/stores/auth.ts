import { defineStore } from "pinia"
import { ref, computed } from "vue"
import api from "@/lib/api"
import type { ApiResponse, AuthUser } from "@/types"
import router from "@/router"

export const useAuthStore = defineStore("auth", () => {
  const token = ref<string | null>(localStorage.getItem("auth_token"))
  const username = ref("")
  const role = ref<"admin" | "user">("user")
  const timezone = ref("Asia/Shanghai")

  const isAuthenticated = computed(() => !!token.value)
  const isAdmin = computed(() => role.value === "admin")

  function persistToken() {
    if (token.value) {
      localStorage.setItem("auth_token", token.value)
    } else {
      localStorage.removeItem("auth_token")
    }
  }

  async function login(usernameInput: string, password: string): Promise<ApiResponse> {
    try {
      const res = await api.post<ApiResponse<{ token: string; username: string; role: string }>>("/auth/login", {
        username: usernameInput,
        password,
      })
      if (res.data.success && res.data.data) {
        token.value = res.data.data.token
        username.value = res.data.data.username
        role.value = res.data.data.role as "admin" | "user"
        persistToken()
        await fetchMe()
      }
      return res.data
    } catch (err: any) {
      if (err.response?.status === 429) {
        const retryAfter = err.response.headers["retry-after"]
        return { success: false, error: `请求过于频繁，请 ${retryAfter ? retryAfter + " 秒" : ""}后重试` }
      }
      return { success: false, error: err.response?.data?.error || "登录失败" }
    }
  }

  async function register(email: string, password: string, captcha_id: string, captcha_code: string): Promise<ApiResponse> {
    try {
      const res = await api.post<ApiResponse>("/auth/register", { email, password, captcha_id, captcha_code })
      return res.data
    } catch (err: any) {
      return { success: false, error: err.response?.data?.error || "注册失败" }
    }
  }

  async function fetchMe(): Promise<ApiResponse<AuthUser>> {
    try {
      const res = await api.get<ApiResponse<AuthUser>>("/auth/me")
      if (res.data.success && res.data.data) {
        username.value = res.data.data.username
        role.value = res.data.data.role
        if (res.data.data.timezone) timezone.value = res.data.data.timezone
      }
      return res.data
    } catch {
      return { success: false }
    }
  }

  async function logout() {
    api.post("/auth/logout").catch(() => {})
    token.value = null
    username.value = ""
    role.value = "user"
    localStorage.removeItem("auth_token")
    router.push("/login")
  }

  return { token, username, role, timezone, isAuthenticated, isAdmin, login, register, fetchMe, logout, persistToken }
})
