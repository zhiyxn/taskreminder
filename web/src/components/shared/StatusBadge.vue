<script setup lang="ts">
defineProps<{ active: boolean }>()
</script>

<template>
  <span
    :class="[
      'inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold',
      active ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' : 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400',
    ]"
  >
    <span :class="['size-1.5 rounded-full', active ? 'bg-green-500' : 'bg-slate-400']" />
    {{ active ? "启用" : "暂停" }}
  </span>
</template>
