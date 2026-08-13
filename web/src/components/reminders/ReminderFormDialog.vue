<script setup lang="ts">
import { ref, watch } from "vue"
import { useRemindersStore } from "@/stores/reminders"
import { useAuthStore } from "@/stores/auth"
import { SECRET_MASK, SECRET_FIELDS, type Reminder } from "@/types"
import { nowInTz, tzToBeijing, beijingToTz } from "@/lib/timezone"
import { useForm } from "vee-validate"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Button } from "@/components/ui/button"
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select"

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

const intervalMax = ref(3650)
const intervalPlaceholder = ref("例如：7")

const intervalUnitOptions = [
  { value: "minutes", label: "分钟" },
  { value: "hours", label: "小时" },
  { value: "days", label: "天" },
  { value: "months", label: "个月" },
]

function onUnitChange() {
  switch (intervalUnit.value) {
    case "minutes": intervalMax.value = 59; intervalPlaceholder.value = "例如：30"; break
    case "hours": intervalMax.value = 720; intervalPlaceholder.value = "例如：12"; break
    case "months": intervalMax.value = 120; intervalPlaceholder.value = "例如：3"; break
    default: intervalMax.value = 3650; intervalPlaceholder.value = "例如：7"; break
  }
}

// vee-validate 表单
const { handleSubmit, defineField, resetForm } = useForm({
  validationSchema: {
    title: (v: string) => {
      if (!v || !v.trim()) return "请输入事项标题"
      return true
    },
    startDate: (v: string) => {
      if (!v) return "请选择开始时间"
      return true
    },
    intervalDays: (v: number) => {
      if (v == null || v <= 0) return "间隔周期必须大于 0"
      return true
    },
  },
  initialValues: {
    title: "",
    description: "",
    startDate: nowInTz(auth.timezone),
    intervalDays: 7,
    intervalUnit: "days",
  },
})

const [title, titleAttrs] = defineField("title")
const [description] = defineField("description")
const [startDate, startDateAttrs] = defineField("startDate")
const [intervalDays, intervalDaysAttrs] = defineField("intervalDays")
const [intervalUnit] = defineField("intervalUnit")

// 渠道字段（不做校验）
const activeTab = ref("telegram")
const telegramBotToken = ref("")
const telegramChatId = ref("")
const emailHost = ref("")
const emailPort = ref<number | undefined>(undefined)
const emailUser = ref("")
const emailPass = ref("")
const emailTo = ref("")
const feishuAppId = ref("")
const feishuAppSecret = ref("")
const feishuReceiveId = ref("")
const barkUrl = ref("")
const submitting = ref(false)

function fillFromReminder(r: Reminder) {
  resetForm({
    values: {
      title: r.title || "",
      description: r.description || "",
      startDate: beijingToTz(r.start_date, auth.timezone),
      intervalDays: r.interval_days || 7,
      intervalUnit: r.interval_unit || "days",
    },
  })
  onUnitChange()
  telegramBotToken.value = r.telegram_bot_token || ""
  telegramChatId.value = r.telegram_chat_id || ""
  emailHost.value = r.email_host || ""
  emailPort.value = r.email_port ?? undefined
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

function doResetForm() {
  resetForm({
    values: {
      title: "",
      description: "",
      startDate: nowInTz(auth.timezone),
      intervalDays: 7,
      intervalUnit: "days",
    },
  })
  onUnitChange()
  telegramBotToken.value = ""
  telegramChatId.value = ""
  emailHost.value = ""
  emailPort.value = undefined
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
      doResetForm()
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

const submit = handleSubmit(async () => {
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
})
</script>

<template>
  <div v-if="open" class="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto px-4 py-10">
    <!-- 遮罩 -->
    <div class="fixed inset-0 bg-black/40 backdrop-blur-sm" @click="$emit('update:open', false)" />
    <!-- 面板 -->
    <div class="relative z-10 w-full max-w-lg rounded-lg border border-border bg-background/80 backdrop-blur-xl backdrop-saturate-150 p-6 shadow-2xl dark:bg-card/80">
      <div class="mb-5">
        <h2 class="text-lg font-semibold text-foreground">
          {{ editingId ? (reminder && title === reminder.title + '（副本）' ? '克隆事项提醒' : '编辑事项提醒') : '新建事项提醒' }}
        </h2>
        <p class="mt-1 text-sm text-muted-foreground">设置提醒的时间、间隔和通知渠道</p>
      </div>

      <form @submit.prevent="submit" novalidate class="space-y-4">
        <div>
          <label for="title" class="mb-1.5 block text-sm font-medium text-foreground">事项标题 *</label>
          <Input
            id="title"
            v-model="title"
            v-bind="titleAttrs"
            placeholder="例如：周报提交"
          />
          <p v-if="titleAttrs.errorMessage" class="mt-1 text-xs text-destructive">{{ titleAttrs.errorMessage }}</p>
        </div>
        <div>
          <label for="desc" class="mb-1.5 block text-sm font-medium text-foreground">详细内容（选填）</label>
          <Textarea id="desc" v-model="description" rows="3" placeholder="可选的补充说明" />
        </div>
        <div class="grid grid-cols-2 gap-3">
          <div>
            <label for="start-date" class="mb-1.5 block text-sm font-medium text-foreground">开始时间 *</label>
            <Input
              id="start-date"
              v-model="startDate"
              v-bind="startDateAttrs"
              type="datetime-local"
            />
            <p v-if="startDateAttrs.errorMessage" class="mt-1 text-xs text-destructive">{{ startDateAttrs.errorMessage }}</p>
          </div>
          <div>
            <label for="interval" class="mb-1.5 block text-sm font-medium text-foreground">间隔周期 *</label>
            <div class="flex gap-2">
              <div class="flex-1">
                <Input
                  id="interval"
                  v-model.number="intervalDays"
                  v-bind="intervalDaysAttrs"
                  type="number"
                  :min="1"
                  :max="intervalMax"
                  :placeholder="intervalPlaceholder"
                />
              </div>
              <Select v-model="intervalUnit" @update:model-value="onUnitChange">
                <SelectTrigger class="w-24">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem v-for="opt in intervalUnitOptions" :key="opt.value" :value="opt.value">{{ opt.label }}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <p v-if="intervalDaysAttrs.errorMessage" class="mt-1 text-xs text-destructive">{{ intervalDaysAttrs.errorMessage }}</p>
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
                activeTab === t ? 'border-primary text-primary dark:text-primary' : 'border-transparent text-muted-foreground hover:text-foreground',
              ]"
              @click="activeTab = t"
            >{{ t === 'telegram' ? 'Telegram' : t === 'email' ? 'Email' : t === 'feishu' ? '飞书' : 'Bark' }}</button>
          </div>

          <!-- Telegram -->
          <div v-if="activeTab === 'telegram'" class="space-y-3 pt-3">
            <div class="rounded-lg border border-primary/20 bg-primary/5 p-3 text-xs text-primary dark:border-primary/30 dark:bg-primary/5 dark:text-primary">
              留空则使用全局环境变量配置
            </div>
            <div class="grid grid-cols-2 gap-3">
              <div>
                <label class="mb-1 block text-xs text-muted-foreground">Bot Token</label>
                <Input v-model="telegramBotToken" placeholder="留空则使用全局配置" />
              </div>
              <div>
                <label class="mb-1 block text-xs text-muted-foreground">Chat ID</label>
                <Input v-model="telegramChatId" placeholder="留空则使用全局配置" />
              </div>
            </div>
          </div>

          <!-- Email -->
          <div v-if="activeTab === 'email'" class="space-y-3 pt-3">
            <div class="rounded-lg border border-primary/20 bg-primary/5 p-3 text-xs text-primary dark:border-primary/30 dark:bg-primary/5 dark:text-primary">
              SMTP 配置，密码字段显示为 ******** 代表未修改
            </div>
            <div class="grid grid-cols-2 gap-3">
              <div><label class="mb-1 block text-xs text-muted-foreground">SMTP 主机</label><Input v-model="emailHost" placeholder="smtp.example.com" /></div>
              <div><label class="mb-1 block text-xs text-muted-foreground">端口</label><Input v-model.number="emailPort" type="number" min="1" max="65535" placeholder="465" /></div>
            </div>
            <div class="grid grid-cols-2 gap-3">
              <div><label class="mb-1 block text-xs text-muted-foreground">用户名</label><Input v-model="emailUser" placeholder="SMTP 登录用户名" /></div>
              <div><label class="mb-1 block text-xs text-muted-foreground">密码</label><Input v-model="emailPass" type="password" placeholder="不修改则留空" /></div>
            </div>
            <div><label class="mb-1 block text-xs text-muted-foreground">收件邮箱</label><Input v-model="emailTo" type="email" placeholder="通知发往的邮箱地址" /></div>
          </div>

          <!-- 飞书 -->
          <div v-if="activeTab === 'feishu'" class="space-y-3 pt-3">
            <div class="rounded-lg border border-primary/20 bg-primary/5 p-3 text-xs text-primary dark:border-primary/30 dark:bg-primary/5 dark:text-primary">
              飞书企业自建应用，App Secret 显示为 ******** 代表未修改
            </div>
            <div class="grid grid-cols-2 gap-3">
              <div><label class="mb-1 block text-xs text-muted-foreground">App ID</label><Input v-model="feishuAppId" placeholder="飞书 App ID" /></div>
              <div><label class="mb-1 block text-xs text-muted-foreground">App Secret</label><Input v-model="feishuAppSecret" type="password" placeholder="不修改则留空" /></div>
            </div>
            <div><label class="mb-1 block text-xs text-muted-foreground">接收者 Open ID</label><Input v-model="feishuReceiveId" placeholder="消息接收者的 Open ID" /></div>
          </div>

          <!-- Bark -->
          <div v-if="activeTab === 'bark'" class="space-y-3 pt-3">
            <div class="rounded-lg border border-primary/20 bg-primary/5 p-3 text-xs text-primary dark:border-primary/30 dark:bg-primary/5 dark:text-primary">
              填入 Bark 推送 URL 或 Device Key
            </div>
            <div><label class="mb-1 block text-xs text-muted-foreground">Bark URL / Device Key</label><Input v-model="barkUrl" placeholder="abc123 或 https://api.day.app/abc123" /></div>
          </div>
        </div>

        <div class="flex justify-end gap-3 pt-2">
          <Button type="button" variant="outline" @click="$emit('update:open', false)">取消</Button>
          <Button type="submit" :disabled="submitting">
            {{ submitting ? "保存中..." : editingId ? "保存修改" : "创建提醒" }}
          </Button>
        </div>
      </form>
    </div>
  </div>
</template>
