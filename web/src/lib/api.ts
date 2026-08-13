import axios from "axios"

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
  (res) => res,
  (error) => {
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
