import { ref, watchEffect } from "vue"

type Theme = "light" | "dark" | "system"

const STORAGE_KEY = "taskreminder-theme"
const stored = (localStorage.getItem(STORAGE_KEY) || "system") as Theme
const theme = ref<Theme>(stored)

function apply(t: Theme) {
  const root = document.documentElement
  let resolved: "light" | "dark" = "light"
  if (t === "system") {
    resolved = window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light"
  } else {
    resolved = t
  }
  root.classList.toggle("dark", resolved === "dark")
}

watchEffect(() => {
  localStorage.setItem(STORAGE_KEY, theme.value)
  apply(theme.value)
})

window.matchMedia("(prefers-color-scheme: dark)").addEventListener("change", () => {
  if (theme.value === "system") apply("system")
})

export function useColorMode() {
  function setTheme(t: Theme) {
    theme.value = t
  }
  function cycle() {
    const order: Theme[] = ["light", "dark", "system"]
    const idx = order.indexOf(theme.value)
    theme.value = order[(idx + 1) % order.length]
  }
  return { theme, setTheme, cycle }
}
