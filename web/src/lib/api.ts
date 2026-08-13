import axios from "axios"
import { toast } from "vue-sonner"

interface ApiErrorBody {
  success?: boolean
  error?: string
  message?: string
}

let unauthorizedHandler: (() => void) | null = null

export function setUnauthorizedHandler(handler: () => void) {
  unauthorizedHandler = handler
}

const api = axios.create({
  baseURL: "/api",
  timeout: 15000,
  headers: { "Content-Type": "application/json" },
})

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("auth_token")
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

api.interceptors.response.use(
  (res) => {
    const data = res.data as ApiErrorBody | undefined
    if (data?.success === false) {
      toast.error(data.error || data.message || "请求失败，请稍后重试")
    }
    return res
  },
  (error) => {
    if (axios.isCancel(error)) return Promise.reject(error)

    let message = "请求失败，请稍后重试"
    if (axios.isAxiosError<ApiErrorBody>(error)) {
      if (error.code === "ECONNABORTED") {
        message = "请求超时，请稍后重试"
      } else if (!error.response) {
        message = "网络连接失败，请检查网络"
      } else {
        message = error.response.data?.error || error.response.data?.message || message
      }
    }
    toast.error(message)

    if (error.response?.status === 401) {
      localStorage.removeItem("auth_token")
      unauthorizedHandler?.()
      const onLoginRoute = window.location.hash === "#/login" || window.location.hash.startsWith("#/login?")
      if (!onLoginRoute) {
        window.location.hash = "#/login"
      }
    }
    return Promise.reject(error)
  }
)

export default api
