<script setup lang="ts">
import { useAuthStore } from "@/stores/auth"
import { useRoute } from "vue-router"
import { computed } from "vue"
import { Bell, LayoutDashboard, ScrollText, Users, Settings, LogOut } from "lucide-vue-next"

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

      <div class="mb-2 px-3 pt-4 text-xs font-semibold uppercase tracking-wider text-sidebar-muted">
        系统
      </div>
      <button
        class="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-sidebar-foreground/80 transition-colors hover:bg-sidebar-accent hover:text-sidebar-foreground"
        @click="auth.logout()"
      >
        <LogOut class="size-4" />
        退出登录
      </button>
    </nav>

    <!-- 底部 -->
    <div class="border-t border-sidebar-border px-5 py-4">
      <div class="flex items-center gap-2">
        <div class="flex size-8 items-center justify-center rounded-full bg-sidebar-accent text-xs font-bold text-sidebar-foreground">
          {{ auth.username.charAt(0).toUpperCase() }}
        </div>
        <div>
          <div class="text-sm font-medium text-sidebar-foreground">{{ auth.username }}</div>
          <div class="text-xs text-sidebar-muted">v1.0.0</div>
        </div>
      </div>
    </div>
  </aside>
</template>
