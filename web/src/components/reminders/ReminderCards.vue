<script setup lang="ts">
import { useRemindersStore } from "@/stores/reminders"
import { useAuthStore } from "@/stores/auth"
import { usePagination } from "@/composables/usePagination"
import { formatStartDateTime, getNextReminderDate, getUnitLabel } from "@/lib/timezone"
import { computed } from "vue"
import { Inbox } from "lucide-vue-next"
import StatusBadge from "@/components/shared/StatusBadge.vue"
import ChannelTags from "@/components/shared/ChannelTags.vue"
import EmptyState from "@/components/shared/EmptyState.vue"
import PaginationBar from "@/components/shared/PaginationBar.vue"

const store = useRemindersStore()
const auth = useAuthStore()

const { pagedData, totalPages, currentPage, totalItems, goTo } = usePagination(
  computed(() => store.filteredReminders),
  10
)

const emit = defineEmits<{
  edit: [id: number]
  clone: [id: number]
  fire: [id: number]
  toggle: [id: number, enabled: boolean]
  remove: [id: number]
  viewLogs: [id: number]
}>()

function nextDate(r: any) {
  return getNextReminderDate(r.start_date, r.interval_days, r.enabled, r.interval_unit || "days", auth.timezone)
}
</script>

<template>
  <div class="flex flex-col gap-4">
    <EmptyState v-if="totalItems === 0" :icon="Inbox" message="暂无事项提醒" />
    <div
      v-for="r in pagedData"
      :key="r.id"
      class="rounded-xl border border-border bg-card p-4 shadow-sm dark:bg-card"
    >
      <div class="flex items-start justify-between gap-3">
        <div class="min-w-0 flex-1">
          <div class="font-semibold text-foreground truncate">{{ r.title }}</div>
          <div v-if="r.description" class="mt-1 text-xs text-muted-foreground line-clamp-2">{{ r.description }}</div>
          <div class="mt-1 text-xs text-muted-foreground">ID: #{{ r.id }}</div>
        </div>
        <StatusBadge :active="!!r.enabled" />
      </div>
      <div class="mt-3 grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
        <div v-if="auth.isAdmin">
          <span class="text-muted-foreground">所属</span>
          <span class="ml-2 text-foreground">{{ r.username || "未知" }}</span>
        </div>
        <div><span class="text-muted-foreground">开始</span><span class="ml-2 text-foreground">{{ formatStartDateTime(r.start_date, auth.timezone) }}</span></div>
        <div><span class="text-muted-foreground">间隔</span><span class="ml-2 text-foreground">每 {{ r.interval_days }} {{ getUnitLabel(r.interval_unit) }}</span></div>
        <div><span class="text-muted-foreground">下次</span><span class="ml-2 text-foreground">{{ nextDate(r) }}</span></div>
        <div><span class="text-muted-foreground">创建</span><span class="ml-2 text-muted-foreground">{{ formatStartDateTime(r.created_at, auth.timezone) }}</span></div>
        <div class="col-span-2"><ChannelTags :reminder="r" /></div>
      </div>
      <div class="mt-3 flex flex-wrap gap-1 pt-1">
        <button class="rounded-md border border-border px-2 py-1 text-xs hover:bg-muted" @click="emit('toggle', r.id, !r.enabled)">{{ r.enabled ? "暂停" : "启用" }}</button>
        <button class="rounded-md border border-border px-2 py-1 text-xs text-green-600 hover:bg-muted" @click="emit('fire', r.id)">发送</button>
        <button class="rounded-md border border-border px-2 py-1 text-xs hover:bg-muted" @click="emit('edit', r.id)">编辑</button>
        <button class="rounded-md border border-border px-2 py-1 text-xs text-teal-600 hover:bg-muted" @click="emit('clone', r.id)">克隆</button>
        <button class="rounded-md border border-border px-2 py-1 text-xs hover:bg-muted" @click="emit('viewLogs', r.id)">日志</button>
        <button class="rounded-md border border-border px-2 py-1 text-xs text-red-600 hover:bg-muted" @click="emit('remove', r.id)">删除</button>
      </div>
    </div>
    <PaginationBar :total-items="totalItems" :current-page="currentPage" :total-pages="totalPages" @update:current-page="goTo" />
  </div>
</template>
