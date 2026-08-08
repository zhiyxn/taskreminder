import { createApp } from "vue"
import { createPinia } from "pinia"
import App from "./App.vue"
import router from "./router"
import "./assets/main.css"

const app = createApp(App)
const pinia = createPinia()

app.use(pinia)
app.use(router)

// 初始化深色模式
const theme = localStorage.getItem("taskreminder-theme") || "system"
function resolveTheme(t: string): "light" | "dark" {
  if (t === "system") return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light"
  return t as "light" | "dark"
}
document.documentElement.classList.toggle("dark", resolveTheme(theme) === "dark")

router.isReady().then(() => {
  app.mount("#app")
})
