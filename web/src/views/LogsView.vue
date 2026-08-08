<script setup lang="ts">
import { ref, onMounted, computed } from "vue"
import api from "@/lib/api"
import { usePagination } from "@/composables/usePagination"
import PaginationBar from "@/components/shared/PaginationBar.vue"
import EmptyState from "@/components/shared/EmptyState.vue"
import type { LogItem } from "@/types"

const logs = ref<LogItem[]>([])
const loading = ref(false)

const { pagedData, totalPages, currentPage, totalItems, goTo } = usePagination(
  computed(() => logs.value),
  10
)

async function loadLogs() {
  loading.value = true
  try {
    const res = await api.get("/logs?limit=500")
    if (res.data.success) logs.value = res.data.data || []
  } finally {
    loading.value = false
  }
}

onMounted(loadLogs)
</script>

<template>
  <div class="space-y-4">
    <h2 class="text-lg font-semibold text-foreground">📜 通知日志</h2>
    <div v-if="loading" class="py-10 text-center text-muted-foreground">加载中...</div>
    <EmptyState v-else-if="totalItems === 0" icon="📜" message="暂无通知记录" />
    <div v-else class="space-y-2">
      <div
        v-for="l in pagedData"
        :key="l.sent_at + l.channel"
        :class="[
          'rounded-lg border-l-4 p-3 text-sm',
          l.status === 'success' ? 'border-green-500 bg-green-50 dark:bg-green-950/20' : 'border-red-500 bg-red-50 dark:bg-red-950/20',
        ]"
      >
        <div class="text-xs text-muted-foreground">{{ l.sent_at }}</div>
        <div v-if="l.title" class="mt-1 font-semibold text-foreground">📌 {{ l.title }}</div>
        <div v-if="l.description" class="text-xs text-muted-foreground">📝 {{ l.description }}</div>
        <div class="mt-1 font-medium">{{ l.channel.toUpperCase() }} - {{ l.status === 'success' ? '✓ 成功' : '✗ 失败' }}</div>
        <div v-if="l.error_message" class="mt-0.5 text-xs text-red-600 dark:text-red-400">{{ l.error_message }}</div>
      </div>
    </div>
    <PaginationBar :total-items="totalItems" :current-page="currentPage" :total-pages="totalPages" @update:current-page="goTo" />
  </div>
</template>
