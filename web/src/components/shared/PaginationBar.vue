<script setup lang="ts">
defineProps<{ totalItems: number; currentPage: number; totalPages: number }>()
const emit = defineEmits<{ "update:currentPage": [page: number] }>()
</script>

<template>
  <div v-if="totalItems > 10" class="flex items-center justify-between gap-4 py-3">
    <span class="text-sm text-muted-foreground dark:text-muted-foreground">
      共 {{ totalItems }} 条，第 {{ currentPage }} / {{ totalPages }} 页
    </span>
    <div class="flex items-center gap-1">
      <button
        class="inline-flex size-8 items-center justify-center rounded-md border border-border text-sm disabled:opacity-40"
        :disabled="currentPage <= 1"
        @click="currentPage > 1 && emit('update:currentPage', currentPage - 1)"
      >‹</button>
      <span
        v-for="p in totalPages"
        :key="p"
        :class="[
          'inline-flex size-8 cursor-pointer items-center justify-center rounded-md text-sm',
          p === currentPage ? 'border border-primary bg-primary/5 text-primary dark:bg-primary/10' : 'border border-transparent hover:bg-muted dark:hover:bg-muted',
        ]"
        @click="emit('update:currentPage', p)"
      >{{ p }}</span>
      <button
        class="inline-flex size-8 items-center justify-center rounded-md border border-border text-sm disabled:opacity-40"
        :disabled="currentPage >= totalPages"
        @click="currentPage < totalPages && emit('update:currentPage', currentPage + 1)"
      >›</button>
    </div>
  </div>
</template>
