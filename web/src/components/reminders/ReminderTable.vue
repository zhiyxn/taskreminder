<script setup lang="ts">
import { useRemindersStore } from "@/stores/reminders"
import { useAuthStore } from "@/stores/auth"
import { usePagination } from "@/composables/usePagination"
import { formatStartDateTime, getNextReminderDate, getUnitLabel } from "@/lib/timezone"
import { computed } from "vue"
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
  <div class="overflow-x-auto rounded-lg border border-border">
    <table v-if="totalItems > 0" class="w-full text-sm">
      <thead>
        <tr class="border-b border-border bg-muted/50 text-left text-xs font-semibold uppercase text-muted-foreground">
          <th class="px-4 py-3">事项</th>
          <th v-if="auth.isAdmin" class="px-4 py-3">所属用户</th>
          <th class="px-4 py-3">开始时间</th>
          <th class="px-4 py-3">间隔</th>
          <th class="px-4 py-3">下次提醒</th>
          <th class="px-4 py-3">状态</th>
          <th class="px-4 py-3">通知渠道</th>
          <th class="px-4 py-3">创建时间</th>
          <th class="px-4 py-3">操作</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="r in pagedData" :key="r.id" class="border-b border-border last:border-0 hover:bg-muted/30">
          <td class="px-4 py-3">
            <div class="font-medium text-foreground">{{ r.title }}</div>
            <div v-if="r.description" class="mt-0.5 text-xs text-muted-foreground line-clamp-2">{{ r.description }}</div>
            <div class="mt-0.5 text-xs text-slate-400">ID: #{{ r.id }}</div>
          </td>
          <td v-if="auth.isAdmin" class="px-4 py-3 text-sm text-muted-foreground">
            {{ r.username || "未知" }}
          </td>
          <td class="px-4 py-3 text-sm text-muted-foreground">{{ formatStartDateTime(r.start_date, auth.timezone) }}</td>
          <td class="px-4 py-3 text-sm text-muted-foreground">每 {{ r.interval_days }} {{ getUnitLabel(r.interval_unit) }}</td>
          <td class="px-4 py-3 text-sm text-muted-foreground">{{ nextDate(r) }}</td>
          <td class="px-4 py-3"><StatusBadge :active="!!r.enabled" /></td>
          <td class="px-4 py-3"><ChannelTags :reminder="r" /></td>
          <td class="px-4 py-3 text-sm text-muted-foreground">{{ formatStartDateTime(r.created_at, auth.timezone) }}</td>
          <td class="px-4 py-3">
            <div class="flex flex-wrap gap-1">
              <button class="rounded-md border border-border px-2 py-1 text-xs hover:bg-muted" @click="emit('toggle', r.id, !r.enabled)">{{ r.enabled ? "暂停" : "启用" }}</button>
              <button class="rounded-md border border-border px-2 py-1 text-xs text-green-600 hover:bg-muted" @click="emit('fire', r.id)">发送</button>
              <button class="rounded-md border border-border px-2 py-1 text-xs hover:bg-muted" @click="emit('edit', r.id)">编辑</button>
              <button class="rounded-md border border-border px-2 py-1 text-xs text-teal-600 hover:bg-muted" @click="emit('clone', r.id)">克隆</button>
              <button class="rounded-md border border-border px-2 py-1 text-xs hover:bg-muted" @click="emit('viewLogs', r.id)">日志</button>
              <button class="rounded-md border border-border px-2 py-1 text-xs text-red-600 hover:bg-muted" @click="emit('remove', r.id)">删除</button>
            </div>
          </td>
        </tr>
      </tbody>
    </table>
    <EmptyState v-else icon="📭" message="暂无事项提醒，点击右上角「新建提醒」开始吧！" />
  </div>
  <PaginationBar :total-items="totalItems" :current-page="currentPage" :total-pages="totalPages" @update:current-page="goTo" />
</template>
