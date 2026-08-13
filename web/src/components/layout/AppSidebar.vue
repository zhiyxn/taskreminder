<script setup lang="ts">
import { useAuthStore } from "@/stores/auth"
import { useRoute } from "vue-router"
import { computed } from "vue"
import { Bell, LayoutDashboard, ScrollText, Users, Settings } from "@lucide/vue"

const auth = useAuthStore()
const route = useRoute()

defineEmits<{ navigate: [] }>()

const navItems = computed(() => {
  const items = [
    { path: "/reminders", label: "仪表盘", icon: LayoutDashboard },
    { path: "/logs", label: "通知日志", icon: ScrollText },
  ]
  if (auth.isAdmin) {
    items.push({ path: "/users", label: "用户管理", icon: Users })
  }
  items.push({ path: "/settings", label: "系统设置", icon: Settings })
  return items
})

function isActive(path: string) {
  return route.path === path || route.path.startsWith(path + "/")
}
</script>

<template>
  <aside class="flex flex-col bg-sidebar text-sidebar-foreground md:static">
    <!-- Logo -->
    <div class="flex h-[70px] items-center gap-3 border-b border-sidebar-border px-5">
      <div class="flex size-10 items-center justify-center rounded-xl bg-primary shadow-lg">
        <Bell class="size-5 text-primary-foreground" />
      </div>
      <div>
        <div class="text-sm font-bold text-sidebar-foreground">事项提醒系统</div>
        <div class="text-xs text-sidebar-muted">Reminder System</div>
      </div>
    </div>

    <!-- 导航 -->
    <nav class="flex-1 space-y-1 px-3 py-4">
      <div class="mb-2 px-3 text-xs font-semibold uppercase tracking-wider text-sidebar-muted">
        主菜单
      </div>
      <a
        v-for="item in navItems"
        :key="item.path"
        :href="'#' + item.path"
        :class="[
          'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors',
          isActive(item.path)
            ? 'bg-primary/15 text-primary'
            : 'text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-foreground',
        ]"
        @click="$emit('navigate')"
      >
        <component :is="item.icon" class="size-4" />
        {{ item.label }}
      </a>
    </nav>

    <!-- 底部 -->
    <div class="border-t border-sidebar-border px-5 py-3 text-center text-xs text-sidebar-muted">
      v1.0.0
    </div>
  </aside>
</template>
