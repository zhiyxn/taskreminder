<script setup lang="ts">
import { ref, watch } from "vue"
import { useRemindersStore } from "@/stores/reminders"
import { useAuthStore } from "@/stores/auth"
import { SECRET_MASK, SECRET_FIELDS, type Reminder } from "@/types"
import { nowInTz, tzToBeijing, beijingToTz } from "@/lib/timezone"

const props = defineProps<{
  open: boolean
  editingId?: number | null
  reminder?: Reminder | null
}>()

const emit = defineEmits<{
  "update:open": [value: boolean]
  saved: []
}>()

const store = useRemindersStore()
const auth = useAuthStore()

const title = ref("")
const description = ref("")
const startDate = ref("")
const intervalDays = ref(7)
const intervalUnit = ref("days")

const telegramBotToken = ref("")
const telegramChatId = ref("")

const emailHost = ref("")
const emailPort = ref<number | null>(null)
const emailUser = ref("")
const emailPass = ref("")
const emailTo = ref("")

const feishuAppId = ref("")
const feishuAppSecret = ref("")
const feishuReceiveId = ref("")

const barkUrl = ref("")

const activeTab = ref("telegram")
const submitting = ref(false)

const intervalUnitOptions = [
  { value: "minutes", label: "分钟" },
  { value: "hours", label: "小时" },
  { value: "days", label: "天" },
  { value: "months", label: "个月" },
]

const intervalMax = ref(3650)
const intervalPlaceholder = ref("例如：7")

function onUnitChange() {
  switch (intervalUnit.value) {
    case "minutes": intervalMax.value = 59; intervalPlaceholder.value = "例如：30"; break
    case "hours": intervalMax.value = 720; intervalPlaceholder.value = "例如：12"; break
    case "months": intervalMax.value = 120; intervalPlaceholder.value = "例如：3"; break
    default: intervalMax.value = 3650; intervalPlaceholder.value = "例如：7"; break
  }
}

function fillFromReminder(r: Reminder) {
  title.value = r.title || ""
  description.value = r.description || ""
  startDate.value = beijingToTz(r.start_date, auth.timezone)
  intervalDays.value = r.interval_days || 7
  intervalUnit.value = r.interval_unit || "days"
  onUnitChange()
  telegramBotToken.value = r.telegram_bot_token || ""
  telegramChatId.value = r.telegram_chat_id || ""
  emailHost.value = r.email_host || ""
  emailPort.value = r.email_port || null
  emailUser.value = r.email_user || ""
  emailPass.value = r.email_pass || ""
  emailTo.value = r.email_to || ""
  feishuAppId.value = r.feishu_app_id || ""
  feishuAppSecret.value = r.feishu_app_secret || ""
  feishuReceiveId.value = r.feishu_receive_id || ""
  barkUrl.value = r.bark_url || ""

  if (barkUrl.value) activeTab.value = "bark"
  else if (feishuAppId.value || feishuReceiveId.value) activeTab.value = "feishu"
  else if (emailHost.value || emailTo.value) activeTab.value = "email"
  else activeTab.value = "telegram"
}

function resetForm() {
  title.value = ""
  description.value = ""
  startDate.value = nowInTz(auth.timezone)
  intervalDays.value = 7
  intervalUnit.value = "days"
  onUnitChange()
  telegramBotToken.value = ""
  telegramChatId.value = ""
  emailHost.value = ""
  emailPort.value = null
  emailUser.value = ""
  emailPass.value = ""
  emailTo.value = ""
  feishuAppId.value = ""
  feishuAppSecret.value = ""
  feishuReceiveId.value = ""
  barkUrl.value = ""
  activeTab.value = "telegram"
}

watch(
  () => props.open,
  (val) => {
    if (!val) return
    if (props.editingId && props.reminder) {
      fillFromReminder(props.reminder)
    } else if (props.editingId === null && props.reminder) {
      fillFromReminder(props.reminder)
      title.value = props.reminder.title + "（副本）"
      telegramBotToken.value = ""
      emailPass.value = ""
      feishuAppSecret.value = ""
      barkUrl.value = ""
      alert("已复制配置，通知凭据出于安全考虑不会复制，请重新填写")
    } else {
      resetForm()
    }
  }
)

function buildForm(): Record<string, any> {
  const isMask = (v: string, field: string) => SECRET_FIELDS.includes(field as any) && v === SECRET_MASK
  return {
    title: title.value,
    description: description.value || undefined,
    start_date: tzToBeijing(startDate.value, auth.timezone),
    interval_days: intervalDays.value,
    interval_unit: intervalUnit.value,
    telegram_bot_token: isMask(telegramBotToken.value, "telegram_bot_token") ? undefined : (telegramBotToken.value || undefined),
    telegram_chat_id: telegramChatId.value || undefined,
    email_host: emailHost.value || undefined,
    email_port: emailPort.value || undefined,
    email_user: emailUser.value || undefined,
    email_pass: isMask(emailPass.value, "email_pass") ? undefined : (emailPass.value || undefined),
    email_to: emailTo.value || undefined,
    feishu_app_id: feishuAppId.value || undefined,
    feishu_app_secret: isMask(feishuAppSecret.value, "feishu_app_secret") ? undefined : (feishuAppSecret.value || undefined),
    feishu_receive_id: feishuReceiveId.value || undefined,
    bark_url: isMask(barkUrl.value, "bark_url") ? undefined : (barkUrl.value || undefined),
  }
}

async function submit() {
  if (!title.value || !startDate.value || !intervalDays.value) {
    alert("标题、开始时间和间隔天数为必填项")
    return
  }
  const form = buildForm()
  submitting.value = true
  let result
  if (props.editingId) {
    result = await store.update(props.editingId, form)
  } else {
    result = await store.create(form)
  }
  submitting.value = false
  if (result.success) {
    emit("update:open", false)
    emit("saved")
  } else {
    alert(result.error || "操作失败")
  }
}
</script>

<template>
  <div v-if="open" class="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto px-4 py-10">
    <!-- 遮罩 -->
    <div class="fixed inset-0 bg-black/40 backdrop-blur-sm" @click="$emit('update:open', false)" />
    <!-- 面板 -->
    <div class="relative z-10 w-full max-w-lg rounded-2xl border border-border bg-card p-6 shadow-2xl">
      <div class="mb-5">
        <h2 class="text-lg font-semibold text-foreground">
          {{ editingId ? (reminder && title === reminder.title + '（副本）' ? '克隆事项提醒' : '编辑事项提醒') : '新建事项提醒' }}
        </h2>
        <p class="mt-1 text-sm text-muted-foreground">设置提醒的时间、间隔和通知渠道</p>
      </div>

      <form @submit.prevent="submit" class="space-y-4">
        <div>
          <label for="title" class="mb-1.5 block text-sm font-medium text-foreground">事项标题 *</label>
          <input id="title" v-model="title" required placeholder="例如：周报提交" class="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500" />
        </div>
        <div>
          <label for="desc" class="mb-1.5 block text-sm font-medium text-foreground">详细内容（选填）</label>
          <textarea id="desc" v-model="description" rows="3" placeholder="可选的补充说明" class="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500" />
        </div>
        <div class="grid grid-cols-2 gap-3">
          <div>
            <label for="start-date" class="mb-1.5 block text-sm font-medium text-foreground">开始时间 *</label>
            <input id="start-date" v-model="startDate" type="datetime-local" required class="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500" />
          </div>
          <div>
            <label for="interval" class="mb-1.5 block text-sm font-medium text-foreground">间隔周期 *</label>
            <div class="flex gap-2">
              <input id="interval" v-model.number="intervalDays" type="number" :min="1" :max="intervalMax" :placeholder="intervalPlaceholder" class="flex-1 rounded-lg border border-border bg-background px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500" />
              <select v-model="intervalUnit" @change="onUnitChange" class="w-24 rounded-lg border border-border bg-background px-2 py-2 text-sm focus:border-indigo-500 focus:outline-none">
                <option v-for="opt in intervalUnitOptions" :key="opt.value" :value="opt.value">{{ opt.label }}</option>
              </select>
            </div>
          </div>
        </div>

        <!-- 通知渠道 Tabs -->
        <div>
          <div class="flex border-b border-border">
            <button
              v-for="t in ['telegram','email','feishu','bark']"
              :key="t"
              type="button"
              :class="[
                'flex-1 border-b-2 px-2 py-2 text-sm font-medium transition-colors',
                activeTab === t ? 'border-indigo-500 text-indigo-600 dark:text-indigo-400' : 'border-transparent text-muted-foreground hover:text-foreground',
              ]"
              @click="activeTab = t"
            >{{ t === 'telegram' ? 'Telegram' : t === 'email' ? 'Email' : t === 'feishu' ? '飞书' : 'Bark' }}</button>
          </div>

          <!-- Telegram -->
          <div v-if="activeTab === 'telegram'" class="space-y-3 pt-3">
            <div class="rounded-lg border border-indigo-100 bg-indigo-50/50 p-3 text-xs text-indigo-800 dark:border-indigo-800 dark:bg-indigo-950/30 dark:text-indigo-300">
              留空则使用全局环境变量配置
            </div>
            <div class="grid grid-cols-2 gap-3">
              <div>
                <label class="mb-1 block text-xs text-muted-foreground">Bot Token</label>
                <input v-model="telegramBotToken" placeholder="留空则使用全局配置" class="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500" />
              </div>
              <div>
                <label class="mb-1 block text-xs text-muted-foreground">Chat ID</label>
                <input v-model="telegramChatId" placeholder="留空则使用全局配置" class="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500" />
              </div>
            </div>
          </div>

          <!-- Email -->
          <div v-if="activeTab === 'email'" class="space-y-3 pt-3">
            <div class="rounded-lg border border-indigo-100 bg-indigo-50/50 p-3 text-xs text-indigo-800 dark:border-indigo-800 dark:bg-indigo-950/30 dark:text-indigo-300">
              SMTP 配置，密码字段显示为 ******** 代表未修改
            </div>
            <div class="grid grid-cols-2 gap-3">
              <div><label class="mb-1 block text-xs text-muted-foreground">SMTP 主机</label><input v-model="emailHost" placeholder="smtp.example.com" class="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500" /></div>
              <div><label class="mb-1 block text-xs text-muted-foreground">端口</label><input v-model.number="emailPort" type="number" min="1" max="65535" placeholder="465" class="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500" /></div>
            </div>
            <div class="grid grid-cols-2 gap-3">
              <div><label class="mb-1 block text-xs text-muted-foreground">用户名</label><input v-model="emailUser" placeholder="SMTP 登录用户名" class="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500" /></div>
              <div><label class="mb-1 block text-xs text-muted-foreground">密码</label><input v-model="emailPass" type="password" placeholder="不修改则留空" class="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500" /></div>
            </div>
            <div><label class="mb-1 block text-xs text-muted-foreground">收件邮箱</label><input v-model="emailTo" type="email" placeholder="通知发往的邮箱地址" class="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500" /></div>
          </div>

          <!-- 飞书 -->
          <div v-if="activeTab === 'feishu'" class="space-y-3 pt-3">
            <div class="rounded-lg border border-indigo-100 bg-indigo-50/50 p-3 text-xs text-indigo-800 dark:border-indigo-800 dark:bg-indigo-950/30 dark:text-indigo-300">
              飞书企业自建应用，App Secret 显示为 ******** 代表未修改
            </div>
            <div class="grid grid-cols-2 gap-3">
              <div><label class="mb-1 block text-xs text-muted-foreground">App ID</label><input v-model="feishuAppId" placeholder="飞书 App ID" class="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500" /></div>
              <div><label class="mb-1 block text-xs text-muted-foreground">App Secret</label><input v-model="feishuAppSecret" type="password" placeholder="不修改则留空" class="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500" /></div>
            </div>
            <div><label class="mb-1 block text-xs text-muted-foreground">接收者 Open ID</label><input v-model="feishuReceiveId" placeholder="消息接收者的 Open ID" class="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500" /></div>
          </div>

          <!-- Bark -->
          <div v-if="activeTab === 'bark'" class="space-y-3 pt-3">
            <div class="rounded-lg border border-indigo-100 bg-indigo-50/50 p-3 text-xs text-indigo-800 dark:border-indigo-800 dark:bg-indigo-950/30 dark:text-indigo-300">
              填入 Bark 推送 URL 或 Device Key
            </div>
            <div><label class="mb-1 block text-xs text-muted-foreground">Bark URL / Device Key</label><input v-model="barkUrl" placeholder="abc123 或 https://api.day.app/abc123" class="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500" /></div>
          </div>
        </div>

        <div class="flex justify-end gap-3 pt-2">
          <button type="button" class="rounded-lg border border-border bg-background px-4 py-2 text-sm hover:bg-muted" @click="$emit('update:open', false)">取消</button>
          <button type="submit" :disabled="submitting" class="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-500 disabled:opacity-50">
            {{ submitting ? "保存中..." : editingId ? "保存修改" : "创建提醒" }}
          </button>
        </div>
      </form>
    </div>
  </div>
</template>
