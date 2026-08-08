<script setup lang="ts">
import AppSidebar from "./AppSidebar.vue"
import AppTopbar from "./AppTopbar.vue"
import { RouterView } from "vue-router"
import { ref } from "vue"

const sidebarOpen = ref(false)

function toggleSidebar() {
  sidebarOpen.value = !sidebarOpen.value
}
function closeSidebar() {
  sidebarOpen.value = false
}
</script>

<template>
  <div class="flex h-screen bg-white dark:bg-slate-950">
    <!-- 移动端遮罩 -->
    <div
      class="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm md:hidden"
      :class="{ hidden: !sidebarOpen }"
      @click="closeSidebar"
    />
    <!-- 侧边栏 -->
    <AppSidebar
      class="z-50 h-full w-64 shrink-0 transition-transform duration-300 max-md:fixed max-md:left-0 max-md:top-0"
      :class="sidebarOpen ? 'max-md:translate-x-0' : 'max-md:-translate-x-full'"
      @navigate="closeSidebar"
    />
    <!-- 主区域 -->
    <div class="flex flex-1 flex-col overflow-hidden">
      <AppTopbar @toggle="toggleSidebar" />
      <main class="flex-1 overflow-y-auto p-4 md:p-8">
        <RouterView />
      </main>
    </div>
  </div>
</template>
