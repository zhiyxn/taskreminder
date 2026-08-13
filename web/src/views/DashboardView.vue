<script setup lang="ts">
import { ref, onMounted } from "vue"
import { toast } from "vue-sonner"
import { useRemindersStore } from "@/stores/reminders"
import { useAuthStore } from "@/stores/auth"
import { useIsMobile } from "@/composables/useMediaQuery"
import StatsCards from "@/components/reminders/StatsCards.vue"
import ReminderTable from "@/components/reminders/ReminderTable.vue"
import ReminderCards from "@/components/reminders/ReminderCards.vue"
import ReminderFormDialog from "@/components/reminders/ReminderFormDialog.vue"
import { Plus, ScrollText, X, Pin, FileText } from "@lucide/vue"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select"
import type { Reminder } from "@/types"

const store = useRemindersStore()
const auth = useAuthStore()
const { isMobile } = useIsMobile()

const formOpen = ref(false)
const editingId = ref<number | null>(null)
const editingReminder = ref<Reminder | null>(null)

// 日志模态框
const logsOpen = ref(false)
const logsReminderId = ref(0)
const logItems = ref<any[]>([])
const logLoading = ref(false)

async function loadData() {
  await store.fetchAll()
}

async function openCreate() {
  editingId.value = null
  editingReminder.value = null
  formOpen.value = true
}

async function openEdit(id: number) {
  const r = store.reminders.find((r) => r.id === id)
  if (r) {
    editingId.value = id
    editingReminder.value = r
    formOpen.value = true
  }
}

async function openClone(id: number) {
  const r = store.reminders.find((r) => r.id === id)
  if (r) {
    editingId.value = null
    editingReminder.value = r
    formOpen.value = true
  }
}

async function handleToggle(id: number, enabled: boolean) {
  try {
    await store.toggle(id, enabled)
    toast.success(enabled ? "事项已启用" : "事项已停用")
  } catch {
    // 接口错误由 Axios 响应拦截器统一提示。
  }
}

async function handleFire(id: number) {
  try {
    const results = await store.fire(id)
    const entries = Object.entries(results)
    if (entries.length === 0) {
      toast.info("未选择任何通知渠道")
      return
    }

    const description = entries
      .map(([channel, result]) =>
        `${channel}: ${result.success ? "发送成功" : (result.error || "失败")}`
      )
      .join("；")
    const successCount = entries.filter(([, result]) => result.success).length
    if (successCount === entries.length) {
      toast.success("通知发送成功", { description })
    } else if (successCount > 0) {
      toast.warning("部分通知发送失败", { description })
    } else {
      toast.error("通知发送失败", { description })
    }
  } catch {
    // 接口错误由 Axios 响应拦截器统一提示。
  }
}

async function handleDelete(id: number) {
  if (!confirm("确定删除这条提醒吗？")) return
  try {
    await store.remove(id)
    toast.success("事项删除成功")
  } catch {
    // 接口错误由 Axios 响应拦截器统一提示。
  }
}

async function openLogs(id: number) {
  logsReminderId.value = id
  logLoading.value = true
  logsOpen.value = true
  try {
    const api = await import("@/lib/api")
    const res = await api.default.get(`/reminders/${id}/logs?limit=500`)
    if (res.data.success) logItems.value = res.data.data || []
  } catch { logItems.value = [] }
  finally { logLoading.value = false }
}

function handleSaved() {
  loadData()
}

onMounted(loadData)
</script>

<template>
  <div class="space-y-6">
    <StatsCards />

    <!-- 工具条 -->
    <div class="flex flex-wrap items-center gap-3">
      <Input
        v-model="store.searchKeyword"
        placeholder="搜索提醒标题或详情..."
        class="flex-1"
      />
      <Select v-if="auth.isAdmin" v-model="store.userFilter">
        <SelectTrigger class="w-32">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">全部用户</SelectItem>
          <SelectItem value="mine">仅看自己</SelectItem>
        </SelectContent>
      </Select>
      <Button class="inline-flex items-center gap-1.5" @click="openCreate">
        <Plus class="size-4" />
        新建提醒
      </Button>
    </div>

    <!-- 列表 -->
    <ReminderTable
      v-if="!isMobile"
      @edit="openEdit"
      @clone="openClone"
      @fire="handleFire"
      @toggle="handleToggle"
      @remove="handleDelete"
      @view-logs="openLogs"
    />
    <ReminderCards
      v-else
      @edit="openEdit"
      @clone="openClone"
      @fire="handleFire"
      @toggle="handleToggle"
      @remove="handleDelete"
      @view-logs="openLogs"
    />

    <!-- 表单模态 -->
    <ReminderFormDialog
      :open="formOpen"
      :editing-id="editingId"
      :reminder="editingReminder"
      @update:open="formOpen = false"
      @saved="handleSaved"
    />

    <!-- 日志模态 -->
    <div v-if="logsOpen" class="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto px-4 py-10">
      <div class="fixed inset-0 bg-black/40 backdrop-blur-sm" @click="logsOpen = false" />
      <div class="relative z-10 w-full max-w-2xl rounded-lg border border-border bg-background/80 backdrop-blur-xl backdrop-saturate-150 p-6 shadow-2xl dark:bg-card/80">
        <div class="flex items-center justify-between mb-4">
          <h2 class="flex items-center gap-2 text-lg font-semibold text-foreground">
            <ScrollText class="size-5" />
            通知历史
          </h2>
          <button class="text-muted-foreground hover:text-foreground" @click="logsOpen = false">
            <X class="size-5" />
          </button>
        </div>
        <div v-if="logLoading" class="py-10 text-center text-muted-foreground">加载中...</div>
        <div v-else-if="logItems.length === 0" class="py-10 text-center text-muted-foreground">暂无通知记录</div>
        <div v-else class="max-h-96 space-y-3 overflow-y-auto">
          <div
            v-for="(l, i) in logItems"
            :key="i"
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
            <div class="mt-1 font-medium">{{ l.channel.toUpperCase() }} - {{ l.status === 'success' ? '成功' : '失败' }}</div>
            <div v-if="l.error_message" class="mt-0.5 text-xs text-red-600 dark:text-red-400">{{ l.error_message }}</div>
          </div>
        </div>
        <div class="mt-4 text-right">
          <button class="rounded-xl border border-border bg-background/50 px-4 py-2 text-sm hover:bg-muted dark:bg-background/30" @click="logsOpen = false">关闭</button>
        </div>
      </div>
    </div>
  </div>
</template>
