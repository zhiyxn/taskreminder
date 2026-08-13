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
import { Plus, ScrollText, Pin, FileText } from "@lucide/vue"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select"
import type { Reminder } from "@/types"

const store = useRemindersStore()
const auth = useAuthStore()
const { isMobile } = useIsMobile()

const formOpen = ref(false)
const editingId = ref<number | null>(null)
const editingReminder = ref<Reminder | null>(null)
const deleteOpen = ref(false)
const deleteTarget = ref<Reminder | null>(null)

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

function handleDelete(id: number) {
  deleteTarget.value = store.reminders.find((reminder) => reminder.id === id) || null
  deleteOpen.value = true
}

async function confirmDelete() {
  if (!deleteTarget.value) return
  try {
    await store.remove(deleteTarget.value.id)
    toast.success("事项删除成功")
    deleteOpen.value = false
    deleteTarget.value = null
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
      @update:open="formOpen = $event"
      @saved="handleSaved"
    />

    <!-- 日志弹框 -->
    <Dialog v-model:open="logsOpen">
      <DialogContent class="max-w-2xl">
        <DialogHeader>
          <DialogTitle class="flex items-center gap-2">
            <ScrollText class="size-5" />
            通知历史
          </DialogTitle>
          <DialogDescription>查看该事项的通知发送记录</DialogDescription>
        </DialogHeader>
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
        <DialogFooter>
          <DialogClose as-child>
            <Button type="button" variant="outline">关闭</Button>
          </DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>

    <!-- 删除确认 -->
    <AlertDialog v-model:open="deleteOpen">
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>确认删除事项</AlertDialogTitle>
          <AlertDialogDescription>
            确定要删除事项「{{ deleteTarget?.title }}」吗？相关通知日志也会被删除，此操作不可撤销。
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>取消</AlertDialogCancel>
          <AlertDialogAction
            class="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            @click="confirmDelete"
          >
            确认删除
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  </div>
</template>
