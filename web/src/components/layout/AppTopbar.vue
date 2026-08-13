<script setup lang="ts">
import { useRoute, useRouter } from "vue-router"
import { useColorMode } from "@/composables/useColorMode"
import { useAuthStore } from "@/stores/auth"
import { Command, CommandGroup, CommandItem, CommandList, CommandSeparator } from "@/components/ui/command"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Check, ChevronDown, LogOut, Menu, Monitor, Moon, Sun, UserRound } from "@lucide/vue"
import { computed, ref } from "vue"

const route = useRoute()
const router = useRouter()
const auth = useAuthStore()
const { theme, setTheme } = useColorMode()
const themeMenuOpen = ref(false)
const userMenuOpen = ref(false)

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

const roleLabel = computed(() => auth.isAdmin ? "管理员" : "普通用户")

function selectTheme(value: "light" | "dark" | "system") {
  setTheme(value)
  themeMenuOpen.value = false
}

function logout() {
  userMenuOpen.value = false
  auth.logout()
  router.replace("/login")
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
    <Popover v-model:open="themeMenuOpen">
      <PopoverTrigger as-child>
        <button
          type="button"
          class="inline-flex items-center gap-2 rounded-md px-2.5 py-2 text-sm transition-colors hover:bg-muted"
          aria-label="选择主题"
        >
          <component :is="themeIcon" class="size-4" />
          <span class="hidden text-xs sm:inline">{{ themeLabel }}</span>
          <ChevronDown class="hidden size-3.5 text-muted-foreground sm:block" />
        </button>
      </PopoverTrigger>
      <PopoverContent align="end" class="w-44 p-0">
        <Command :model-value="theme">
          <CommandList>
            <CommandGroup heading="选择主题">
              <CommandItem value="light" @select="selectTheme('light')">
                <Sun />
                <span>亮色</span>
                <Check class="ml-auto" :class="theme === 'light' ? 'opacity-100' : 'opacity-0'" />
              </CommandItem>
              <CommandItem value="dark" @select="selectTheme('dark')">
                <Moon />
                <span>暗色</span>
                <Check class="ml-auto" :class="theme === 'dark' ? 'opacity-100' : 'opacity-0'" />
              </CommandItem>
              <CommandItem value="system" @select="selectTheme('system')">
                <Monitor />
                <span>跟随系统</span>
                <Check class="ml-auto" :class="theme === 'system' ? 'opacity-100' : 'opacity-0'" />
              </CommandItem>
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>

    <Popover v-model:open="userMenuOpen">
      <PopoverTrigger as-child>
        <button
          type="button"
          class="flex size-9 items-center justify-center rounded-full bg-primary text-sm font-semibold text-primary-foreground shadow-sm ring-offset-background transition hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          :aria-label="`打开 ${auth.username} 的用户菜单`"
        >
          {{ auth.username.charAt(0).toUpperCase() || "U" }}
        </button>
      </PopoverTrigger>
      <PopoverContent align="end" class="w-60 p-0">
        <Command>
          <div class="flex items-center gap-3 px-3 py-3">
            <div class="flex size-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
              <UserRound class="size-4" />
            </div>
            <div class="min-w-0">
              <p class="truncate text-sm font-medium">{{ auth.username }}</p>
              <p class="text-xs text-muted-foreground">{{ roleLabel }}</p>
            </div>
          </div>
          <CommandSeparator />
          <CommandList>
            <CommandGroup>
              <CommandItem
                value="logout"
                class="text-destructive data-[highlighted]:bg-destructive/10 data-[highlighted]:text-destructive"
                @select="logout"
              >
                <LogOut />
                <span>退出登录</span>
              </CommandItem>
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  </header>
</template>
