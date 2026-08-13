<script setup lang="ts">
import { ref, onMounted, computed } from "vue"
import api from "@/lib/api"
import { usePagination } from "@/composables/usePagination"
import PaginationBar from "@/components/shared/PaginationBar.vue"
import EmptyState from "@/components/shared/EmptyState.vue"
import { ScrollText, Pin, FileText, Inbox, Check, X } from "lucide-vue-next"
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
  } catch {
    // 接口错误由 Axios 响应拦截器统一提示。
  } finally {
    loading.value = false
  }
}

onMounted(loadLogs)
</script>

<template>
  <div class="space-y-4">
    <h2 class="flex items-center gap-2 text-lg font-semibold text-foreground">
      <ScrollText class="size-5" />
      通知日志
    </h2>
    <div v-if="loading" class="py-10 text-center text-muted-foreground">加载中...</div>
    <EmptyState v-else-if="totalItems === 0" :icon="Inbox" message="暂无通知记录" />
    <div v-else class="space-y-2">
      <div
        v-for="l in pagedData"
        :key="l.sent_at + l.channel"
        :class="[
          'rounded-lg border-l-4 rounded-lg p-3 text-sm',
          l.status === 'success'
            ? 'border-green-500 bg-green-50 dark:bg-green-950/20'
            : 'border-red-500 bg-red-50 dark:bg-red-950/20',
        ]"
      >
        <div class="text-xs text-muted-foreground">{{ l.sent_at }}</div>
        <div v-if="l.title" class="mt-1 flex items-center gap-1 font-semibold text-foreground">
          <Pin class="size-3.5" />
          {{ l.title }}
        </div>
        <div v-if="l.description" class="flex items-center gap-1 text-xs text-muted-foreground">
          <FileText class="size-3" />
          {{ l.description }}
        </div>
        <div class="mt-1 flex items-center gap-1 font-medium">
          <Check v-if="l.status === 'success'" class="size-4 text-green-600" />
          <X v-else class="size-4 text-red-600" />
          {{ l.channel.toUpperCase() }} - {{ l.status === 'success' ? '成功' : '失败' }}
        </div>
        <div v-if="l.error_message" class="mt-0.5 text-xs text-red-600 dark:text-red-400">{{ l.error_message }}</div>
      </div>
    </div>
    <PaginationBar :total-items="totalItems" :current-page="currentPage" :total-pages="totalPages" @update:current-page="goTo" />
  </div>
</template>
