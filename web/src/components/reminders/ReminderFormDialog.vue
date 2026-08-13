<script setup lang="ts">
import { ref, watch } from "vue"
import { useRemindersStore } from "@/stores/reminders"
import { useAuthStore } from "@/stores/auth"
import { SECRET_MASK, SECRET_FIELDS, type Reminder } from "@/types"
import { nowInTz, tzToBeijing, beijingToTz } from "@/lib/timezone"
import {
  integerRange,
  intervalUnit as intervalUnitRule,
  optionalBarkTarget,
  optionalEmail,
  optionalHostname,
  optionalIntegerRange,
  optionalMaxLength,
  optionalNoWhitespace,
  required,
} from "@/lib/formValidation"
import { useForm } from "vee-validate"
import { toast } from "vue-sonner"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Button } from "@/components/ui/button"
import DateTimePicker from "@/components/shared/DateTimePicker.vue"
import {
  Dialog,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogScrollContent,
  DialogTitle,
} from "@/components/ui/dialog"
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
const { handleSubmit, defineField, resetForm, errors } = useForm({
  validationSchema: {
    title: required("请输入事项标题"),
    startDate: required("请选择开始时间"),
    intervalDays: integerRange(1, () => intervalMax.value, () => `请输入 1 到 ${intervalMax.value} 之间的整数`),
    intervalUnit: intervalUnitRule,
    telegramBotToken: optionalNoWhitespace("Bot Token 不能包含空格"),
    telegramChatId: optionalNoWhitespace("Chat ID 不能包含空格"),
    emailHost: optionalHostname(),
    emailPort: optionalIntegerRange(1, 65535, "请输入 1 到 65535 之间的端口"),
    emailUser: optionalNoWhitespace("SMTP 用户名不能包含空格"),
    emailPass: optionalMaxLength(512, "SMTP 密码不能超过 512 个字符"),
    emailTo: optionalEmail("请输入有效的收件邮箱"),
    feishuAppId: optionalNoWhitespace("App ID 不能包含空格"),
    feishuAppSecret: optionalNoWhitespace("App Secret 不能包含空格"),
    feishuReceiveId: optionalNoWhitespace("Open ID 不能包含空格"),
    barkUrl: optionalBarkTarget(),
  },
  initialValues: {
    title: "",
    description: "",
    startDate: nowInTz(auth.timezone),
    intervalDays: 7,
    intervalUnit: "days",
    telegramBotToken: "",
    telegramChatId: "",
    emailHost: "",
    emailPort: undefined as number | undefined,
    emailUser: "",
    emailPass: "",
    emailTo: "",
    feishuAppId: "",
    feishuAppSecret: "",
    feishuReceiveId: "",
    barkUrl: "",
  },
})

const [title, titleAttrs] = defineField("title")
const [description] = defineField("description")
const [startDate] = defineField("startDate")
const [intervalDays, intervalDaysAttrs] = defineField("intervalDays")
const [intervalUnit] = defineField("intervalUnit")

const activeTab = ref("telegram")
const [telegramBotToken, telegramBotTokenAttrs] = defineField("telegramBotToken")
const [telegramChatId, telegramChatIdAttrs] = defineField("telegramChatId")
const [emailHost, emailHostAttrs] = defineField("emailHost")
const [emailPort, emailPortAttrs] = defineField("emailPort")
const [emailUser, emailUserAttrs] = defineField("emailUser")
const [emailPass, emailPassAttrs] = defineField("emailPass")
const [emailTo, emailToAttrs] = defineField("emailTo")
const [feishuAppId, feishuAppIdAttrs] = defineField("feishuAppId")
const [feishuAppSecret, feishuAppSecretAttrs] = defineField("feishuAppSecret")
const [feishuReceiveId, feishuReceiveIdAttrs] = defineField("feishuReceiveId")
const [barkUrl, barkUrlAttrs] = defineField("barkUrl")
const submitting = ref(false)

function fillFromReminder(r: Reminder) {
  resetForm({
    values: {
      title: r.title || "",
      description: r.description || "",
      startDate: beijingToTz(r.start_date, auth.timezone),
      intervalDays: r.interval_days || 7,
      intervalUnit: r.interval_unit || "days",
      telegramBotToken: r.telegram_bot_token || "",
      telegramChatId: r.telegram_chat_id || "",
      emailHost: r.email_host || "",
      emailPort: r.email_port ?? undefined,
      emailUser: r.email_user || "",
      emailPass: r.email_pass || "",
      emailTo: r.email_to || "",
      feishuAppId: r.feishu_app_id || "",
      feishuAppSecret: r.feishu_app_secret || "",
      feishuReceiveId: r.feishu_receive_id || "",
      barkUrl: r.bark_url || "",
    },
  })
  onUnitChange()

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
      telegramBotToken: "",
      telegramChatId: "",
      emailHost: "",
      emailPort: undefined,
      emailUser: "",
      emailPass: "",
      emailTo: "",
      feishuAppId: "",
      feishuAppSecret: "",
      feishuReceiveId: "",
      barkUrl: "",
    },
  })
  onUnitChange()
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
      toast.info("已复制配置，通知凭据出于安全考虑不会复制，请重新填写")
    } else {
      doResetForm()
    }
  }
)

function buildForm(): Record<string, any> {
  const isMask = (v: string, field: string) => SECRET_FIELDS.includes(field as any) && v === SECRET_MASK
  const clean = (v: string) => v.trim() || undefined
  return {
    title: title.value.trim(),
    description: description.value || undefined,
    start_date: tzToBeijing(startDate.value, auth.timezone),
    interval_days: intervalDays.value,
    interval_unit: intervalUnit.value,
    telegram_bot_token: isMask(telegramBotToken.value, "telegram_bot_token") ? undefined : clean(telegramBotToken.value),
    telegram_chat_id: clean(telegramChatId.value),
    email_host: clean(emailHost.value),
    email_port: emailPort.value || undefined,
    email_user: clean(emailUser.value),
    email_pass: isMask(emailPass.value, "email_pass") ? undefined : (emailPass.value || undefined),
    email_to: clean(emailTo.value),
    feishu_app_id: clean(feishuAppId.value),
    feishu_app_secret: isMask(feishuAppSecret.value, "feishu_app_secret") ? undefined : clean(feishuAppSecret.value),
    feishu_receive_id: clean(feishuReceiveId.value),
    bark_url: isMask(barkUrl.value, "bark_url") ? undefined : clean(barkUrl.value),
  }
}

const submit = handleSubmit(async () => {
  const form = buildForm()
  submitting.value = true
  try {
    const result = props.editingId
      ? await store.update(props.editingId, form)
      : await store.create(form)
    if (result.success) {
      toast.success(
        result.message || (props.editingId ? "事项更新成功" : "事项创建成功")
      )
      emit("update:open", false)
      emit("saved")
    }
  } catch {
    // 接口错误由 Axios 响应拦截器统一提示。
  } finally {
    submitting.value = false
  }
}, ({ errors: invalidErrors }) => {
  if (invalidErrors.telegramBotToken || invalidErrors.telegramChatId) activeTab.value = "telegram"
  else if (invalidErrors.emailHost || invalidErrors.emailPort || invalidErrors.emailUser || invalidErrors.emailPass || invalidErrors.emailTo) activeTab.value = "email"
  else if (invalidErrors.feishuAppId || invalidErrors.feishuAppSecret || invalidErrors.feishuReceiveId) activeTab.value = "feishu"
  else if (invalidErrors.barkUrl) activeTab.value = "bark"
})
</script>

<template>
  <Dialog :open="open" @update:open="emit('update:open', $event)">
    <DialogScrollContent class="max-w-lg">
      <DialogHeader>
        <DialogTitle>
          {{ editingId ? (reminder && title === reminder.title + '（副本）' ? '克隆事项提醒' : '编辑事项提醒') : '新建事项提醒' }}
        </DialogTitle>
        <DialogDescription>设置提醒的时间、间隔和通知渠道</DialogDescription>
      </DialogHeader>

      <form @submit.prevent="submit" novalidate class="space-y-4">
        <div>
          <label for="title" class="mb-1.5 block text-sm font-medium text-foreground">事项标题 *</label>
          <Input
            id="title"
            v-model="title"
            v-bind="titleAttrs"
            :aria-invalid="!!errors.title"
            aria-describedby="title-error"
            placeholder="例如：周报提交"
          />
          <p v-if="errors.title" id="title-error" class="mt-1 text-xs text-destructive">{{ errors.title }}</p>
        </div>
        <div>
          <label for="desc" class="mb-1.5 block text-sm font-medium text-foreground">详细内容（选填）</label>
          <Textarea id="desc" v-model="description" rows="3" placeholder="可选的补充说明" />
        </div>
        <div class="grid grid-cols-2 gap-3">
          <div>
            <label for="start-date" class="mb-1.5 block text-sm font-medium text-foreground">开始时间 *</label>
            <DateTimePicker
              id="start-date"
              v-model="startDate"
              :aria-invalid="!!errors.startDate"
              aria-describedby="start-date-error"
              placeholder="选择开始日期和时间"
            />
            <p v-if="errors.startDate" id="start-date-error" class="mt-1 text-xs text-destructive">{{ errors.startDate }}</p>
          </div>
          <div>
            <label for="interval" class="mb-1.5 block text-sm font-medium text-foreground">间隔周期 *</label>
            <div class="flex gap-2">
              <div class="flex-1">
                <Input
                  id="interval"
                  v-model.number="intervalDays"
                  v-bind="intervalDaysAttrs"
                  :aria-invalid="!!errors.intervalDays"
                  aria-describedby="interval-error"
                  type="number"
                  :min="1"
                  :max="intervalMax"
                  :placeholder="intervalPlaceholder"
                />
              </div>
              <Select v-model="intervalUnit" @update:model-value="onUnitChange">
                <SelectTrigger class="w-24" :aria-invalid="!!errors.intervalUnit" aria-describedby="interval-unit-error">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem v-for="opt in intervalUnitOptions" :key="opt.value" :value="opt.value">{{ opt.label }}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <p v-if="errors.intervalDays" id="interval-error" class="mt-1 text-xs text-destructive">{{ errors.intervalDays }}</p>
            <p v-if="errors.intervalUnit" id="interval-unit-error" class="mt-1 text-xs text-destructive">{{ errors.intervalUnit }}</p>
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
                <label for="telegram-token" class="mb-1 block text-xs text-muted-foreground">Bot Token</label>
                <Input id="telegram-token" v-model="telegramBotToken" v-bind="telegramBotTokenAttrs" :aria-invalid="!!errors.telegramBotToken" aria-describedby="telegram-token-error" placeholder="留空则使用全局配置" />
                <p v-if="errors.telegramBotToken" id="telegram-token-error" class="mt-1 text-xs text-destructive">{{ errors.telegramBotToken }}</p>
              </div>
              <div>
                <label for="telegram-chat-id" class="mb-1 block text-xs text-muted-foreground">Chat ID</label>
                <Input id="telegram-chat-id" v-model="telegramChatId" v-bind="telegramChatIdAttrs" :aria-invalid="!!errors.telegramChatId" aria-describedby="telegram-chat-id-error" placeholder="留空则使用全局配置" />
                <p v-if="errors.telegramChatId" id="telegram-chat-id-error" class="mt-1 text-xs text-destructive">{{ errors.telegramChatId }}</p>
              </div>
            </div>
          </div>

          <!-- Email -->
          <div v-if="activeTab === 'email'" class="space-y-3 pt-3">
            <div class="rounded-lg border border-primary/20 bg-primary/5 p-3 text-xs text-primary dark:border-primary/30 dark:bg-primary/5 dark:text-primary">
              SMTP 配置，密码字段显示为 ******** 代表未修改
            </div>
            <div class="grid grid-cols-2 gap-3">
              <div>
                <label for="email-host" class="mb-1 block text-xs text-muted-foreground">SMTP 主机</label>
                <Input id="email-host" v-model="emailHost" v-bind="emailHostAttrs" :aria-invalid="!!errors.emailHost" aria-describedby="email-host-error" placeholder="smtp.example.com" />
                <p v-if="errors.emailHost" id="email-host-error" class="mt-1 text-xs text-destructive">{{ errors.emailHost }}</p>
              </div>
              <div>
                <label for="email-port" class="mb-1 block text-xs text-muted-foreground">端口</label>
                <Input id="email-port" v-model.number="emailPort" v-bind="emailPortAttrs" :aria-invalid="!!errors.emailPort" aria-describedby="email-port-error" type="number" min="1" max="65535" placeholder="465" />
                <p v-if="errors.emailPort" id="email-port-error" class="mt-1 text-xs text-destructive">{{ errors.emailPort }}</p>
              </div>
            </div>
            <div class="grid grid-cols-2 gap-3">
              <div>
                <label for="email-user" class="mb-1 block text-xs text-muted-foreground">用户名</label>
                <Input id="email-user" v-model="emailUser" v-bind="emailUserAttrs" :aria-invalid="!!errors.emailUser" aria-describedby="email-user-error" placeholder="SMTP 登录用户名" />
                <p v-if="errors.emailUser" id="email-user-error" class="mt-1 text-xs text-destructive">{{ errors.emailUser }}</p>
              </div>
              <div>
                <label for="email-pass" class="mb-1 block text-xs text-muted-foreground">密码</label>
                <Input id="email-pass" v-model="emailPass" v-bind="emailPassAttrs" :aria-invalid="!!errors.emailPass" aria-describedby="email-pass-error" type="password" placeholder="不修改则留空" />
                <p v-if="errors.emailPass" id="email-pass-error" class="mt-1 text-xs text-destructive">{{ errors.emailPass }}</p>
              </div>
            </div>
            <div>
              <label for="email-to" class="mb-1 block text-xs text-muted-foreground">收件邮箱</label>
              <Input id="email-to" v-model="emailTo" v-bind="emailToAttrs" :aria-invalid="!!errors.emailTo" aria-describedby="email-to-error" type="email" placeholder="通知发往的邮箱地址" />
              <p v-if="errors.emailTo" id="email-to-error" class="mt-1 text-xs text-destructive">{{ errors.emailTo }}</p>
            </div>
          </div>

          <!-- 飞书 -->
          <div v-if="activeTab === 'feishu'" class="space-y-3 pt-3">
            <div class="rounded-lg border border-primary/20 bg-primary/5 p-3 text-xs text-primary dark:border-primary/30 dark:bg-primary/5 dark:text-primary">
              飞书企业自建应用，App Secret 显示为 ******** 代表未修改
            </div>
            <div class="grid grid-cols-2 gap-3">
              <div>
                <label for="feishu-app-id" class="mb-1 block text-xs text-muted-foreground">App ID</label>
                <Input id="feishu-app-id" v-model="feishuAppId" v-bind="feishuAppIdAttrs" :aria-invalid="!!errors.feishuAppId" aria-describedby="feishu-app-id-error" placeholder="飞书 App ID" />
                <p v-if="errors.feishuAppId" id="feishu-app-id-error" class="mt-1 text-xs text-destructive">{{ errors.feishuAppId }}</p>
              </div>
              <div>
                <label for="feishu-app-secret" class="mb-1 block text-xs text-muted-foreground">App Secret</label>
                <Input id="feishu-app-secret" v-model="feishuAppSecret" v-bind="feishuAppSecretAttrs" :aria-invalid="!!errors.feishuAppSecret" aria-describedby="feishu-app-secret-error" type="password" placeholder="不修改则留空" />
                <p v-if="errors.feishuAppSecret" id="feishu-app-secret-error" class="mt-1 text-xs text-destructive">{{ errors.feishuAppSecret }}</p>
              </div>
            </div>
            <div>
              <label for="feishu-receive-id" class="mb-1 block text-xs text-muted-foreground">接收者 Open ID</label>
              <Input id="feishu-receive-id" v-model="feishuReceiveId" v-bind="feishuReceiveIdAttrs" :aria-invalid="!!errors.feishuReceiveId" aria-describedby="feishu-receive-id-error" placeholder="消息接收者的 Open ID" />
              <p v-if="errors.feishuReceiveId" id="feishu-receive-id-error" class="mt-1 text-xs text-destructive">{{ errors.feishuReceiveId }}</p>
            </div>
          </div>

          <!-- Bark -->
          <div v-if="activeTab === 'bark'" class="space-y-3 pt-3">
            <div class="rounded-lg border border-primary/20 bg-primary/5 p-3 text-xs text-primary dark:border-primary/30 dark:bg-primary/5 dark:text-primary">
              填入 Bark 推送 URL 或 Device Key
            </div>
            <div>
              <label for="bark-url" class="mb-1 block text-xs text-muted-foreground">Bark URL / Device Key</label>
              <Input id="bark-url" v-model="barkUrl" v-bind="barkUrlAttrs" :aria-invalid="!!errors.barkUrl" aria-describedby="bark-url-error" placeholder="abc123 或 https://api.day.app/abc123" />
              <p v-if="errors.barkUrl" id="bark-url-error" class="mt-1 text-xs text-destructive">{{ errors.barkUrl }}</p>
            </div>
          </div>
        </div>

        <DialogFooter class="pt-2">
          <Button type="button" variant="outline" @click="emit('update:open', false)">取消</Button>
          <Button type="submit" :disabled="submitting">
            {{ submitting ? "保存中..." : editingId ? "保存修改" : "创建提醒" }}
          </Button>
        </DialogFooter>
      </form>
    </DialogScrollContent>
  </Dialog>
</template>
