<script setup lang="ts">
import { useRoute } from "vue-router"
import { useColorMode } from "@/composables/useColorMode"
import { Menu, Sun, Moon, Monitor } from "lucide-vue-next"
import { computed } from "vue"

const route = useRoute()
const { theme, setTheme } = useColorMode()

defineEmits<{ toggle: [] }>()

const themeIcon = computed(() => {
  switch (theme.value) {
    case "dark": return Moon
    case "light": return Sun
    default: return Monitor
  }
})

const themeLabel = computed(() => {
  switch (theme.value) {
    case "dark": return "暗色"
    case "light": return "亮色"
    default: return "系统"
  }
})

function cycleTheme() {
  if (theme.value === "light") setTheme("dark")
  else if (theme.value === "dark") setTheme("system")
  else setTheme("light")
}
</script>

<template>
  <header class="sticky top-0 z-30 flex h-[70px] items-center gap-4 border-b border-border bg-background/80 px-4 backdrop-blur md:px-6">
    <button class="inline-flex items-center justify-center rounded-md p-2 hover:bg-muted md:hidden" @click="$emit('toggle')">
      <Menu class="size-5" />
    </button>
    <div class="flex-1">
      <h1 class="text-lg font-semibold">{{ (route.meta.title as string) || "仪表盘" }}</h1>
      <p class="text-xs text-muted-foreground">首页 / {{ (route.meta.title as string) || "仪表盘" }}</p>
    </div>
    <button class="inline-flex items-center gap-2 rounded-md px-3 py-1.5 text-sm hover:bg-muted" @click="cycleTheme">
      <component :is="themeIcon" class="size-4" />
      <span class="hidden sm:inline text-xs">{{ themeLabel }}</span>
    </button>
  </header>
</template>
