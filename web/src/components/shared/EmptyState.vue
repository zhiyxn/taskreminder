<script setup lang="ts">
defineProps<{ icon?: string; message?: string }>()
</script>

<template>
  <div class="flex flex-col items-center justify-center px-5 py-16 text-center">
    <div class="text-5xl">{{ icon || "📭" }}</div>
    <p class="mt-4 text-sm text-slate-400 dark:text-slate-500">{{ message || "暂无数据" }}</p>
  </div>
</template>
