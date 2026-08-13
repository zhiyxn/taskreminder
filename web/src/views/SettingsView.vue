<script setup lang="ts">
import { ref, onMounted } from "vue"
import { toast } from "vue-sonner"
import { useAuthStore } from "@/stores/auth"
import api from "@/lib/api"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select"
import { Clock3, ExternalLink, Info, ShieldCheck } from "lucide-vue-next"
import { useForm } from "vee-validate"
import { oneOf, optionalMinLength, required } from "@/lib/formValidation"

const auth = useAuthStore()

const savingAccount = ref(false)

const {
  handleSubmit: handleAccountSubmit,
  defineField: defineAccountField,
  errors: accountErrors,
  setFieldError: setAccountFieldError,
} = useForm({
  validationSchema: {
    currentPassword: required("请输入当前密码"),
    newUsername: (value: unknown) => String(value ?? "").length <= 100 ? true : "用户名不能超过 100 个字符",
    newPassword: optionalMinLength(6, "新密码至少需要 6 位"),
  },
  initialValues: {
    currentPassword: "",
    newUsername: "",
    newPassword: "",
  },
})

const [currentPassword, currentPasswordAttrs] = defineAccountField("currentPassword")
const [newUsername, newUsernameAttrs] = defineAccountField("newUsername")
const [newPassword, newPasswordAttrs] = defineAccountField("newPassword")

const saveAccount = handleAccountSubmit(async (values) => {
  const username = values.newUsername.trim()
  if (!username && !values.newPassword) {
    setAccountFieldError("newUsername", "请输入新用户名或新密码")
    return
  }
  savingAccount.value = true
  try {
    const res = await api.put("/auth/settings", {
      current_password: values.currentPassword,
      new_username: username || undefined,
      new_password: values.newPassword || undefined,
    })
    if (res.data.success) {
      toast.success(res.data.message || "设置已更新，请重新登录")
      auth.logout()
    }
  } catch {
    // 接口错误由 Axios 响应拦截器统一提示。
  }
  finally { savingAccount.value = false }
})

// 时区
const timezones = [
  { value: "Asia/Shanghai", label: "北京 (UTC+8)" },
  { value: "Asia/Tokyo", label: "东京 (UTC+9)" },
  { value: "Asia/Singapore", label: "新加坡 (UTC+8)" },
  { value: "Asia/Kolkata", label: "印度 (UTC+5:30)" },
  { value: "Asia/Dubai", label: "迪拜 (UTC+4)" },
  { value: "Europe/London", label: "伦敦 (UTC+0)" },
  { value: "Europe/Paris", label: "巴黎 (UTC+1)" },
  { value: "Europe/Moscow", label: "莫斯科 (UTC+3)" },
  { value: "America/New_York", label: "纽约 (UTC-5)" },
  { value: "America/Chicago", label: "芝加哥 (UTC-6)" },
  { value: "America/Denver", label: "丹佛 (UTC-7)" },
  { value: "America/Los_Angeles", label: "洛杉矶 (UTC-8)" },
  { value: "America/Sao_Paulo", label: "圣保罗 (UTC-3)" },
  { value: "Australia/Sydney", label: "悉尼 (UTC+10)" },
  { value: "Pacific/Auckland", label: "奥克兰 (UTC+12)" },
  { value: "UTC", label: "UTC" },
]

const savingTimezone = ref(false)

const {
  handleSubmit: handleTimezoneSubmit,
  defineField: defineTimezoneField,
  resetForm: resetTimezoneForm,
  errors: timezoneErrors,
} = useForm({
  validationSchema: {
    selectedTimezone: oneOf(timezones.map((timezone) => timezone.value), "请选择有效的时区"),
  },
  initialValues: { selectedTimezone: auth.timezone || "Asia/Shanghai" },
})

const [selectedTimezone] = defineTimezoneField("selectedTimezone")

const saveTimezone = handleTimezoneSubmit(async (values) => {
  savingTimezone.value = true
  try {
    const res = await api.put("/settings", { timezone: values.selectedTimezone })
    if (res.data.success) {
      auth.timezone = values.selectedTimezone
      toast.success(res.data.message || "时区已更新")
    }
  } catch {
    // 接口错误由 Axios 响应拦截器统一提示。
  }
  finally { savingTimezone.value = false }
})

onMounted(async () => {
  await auth.fetchMe()
  resetTimezoneForm({ values: { selectedTimezone: auth.timezone || "Asia/Shanghai" } })
})
</script>

<template>
  <div class="w-full">
    <div class="overflow-hidden rounded-xl border border-border bg-card/40">
      <!-- 账号与安全 -->
      <section class="grid gap-6 p-5 sm:p-6 lg:grid-cols-[14rem_minmax(0,1fr)] lg:gap-10 lg:p-8" aria-labelledby="account-heading">
        <div class="flex items-start gap-3 lg:block">
          <div class="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary lg:mb-4">
            <ShieldCheck class="size-4" aria-hidden="true" />
          </div>
          <div>
            <h2 id="account-heading" class="font-semibold text-foreground">账号与安全</h2>
            <p class="mt-1 text-sm leading-6 text-muted-foreground">
              修改登录名或密码。保存后需要重新登录。
            </p>
          </div>
        </div>

        <form class="max-w-xl space-y-5" @submit.prevent="saveAccount">
          <div>
            <label for="current-username" class="mb-1.5 block text-sm font-medium text-foreground">当前用户名</label>
            <Input id="current-username" :model-value="auth.username" disabled />
          </div>
          <div>
            <label for="cur-pw" class="mb-1.5 block text-sm font-medium text-foreground">
              当前密码 <span class="text-destructive">*</span>
            </label>
            <Input id="cur-pw" v-model="currentPassword" v-bind="currentPasswordAttrs" :aria-invalid="!!accountErrors.currentPassword" aria-describedby="cur-pw-error" type="password" autocomplete="current-password" />
            <p v-if="accountErrors.currentPassword" id="cur-pw-error" class="mt-1 text-xs text-destructive">{{ accountErrors.currentPassword }}</p>
            <p class="mt-1.5 text-xs text-muted-foreground">用于验证本次敏感操作。</p>
          </div>
          <div class="grid gap-5 sm:grid-cols-2">
            <div>
              <label for="new-username" class="mb-1.5 block text-sm font-medium text-foreground">新用户名</label>
              <Input id="new-username" v-model="newUsername" v-bind="newUsernameAttrs" :aria-invalid="!!accountErrors.newUsername" aria-describedby="new-username-error" autocomplete="username" placeholder="留空则不修改" />
              <p v-if="accountErrors.newUsername" id="new-username-error" class="mt-1 text-xs text-destructive">{{ accountErrors.newUsername }}</p>
            </div>
            <div>
              <label for="new-pw" class="mb-1.5 block text-sm font-medium text-foreground">新密码</label>
              <Input id="new-pw" v-model="newPassword" v-bind="newPasswordAttrs" :aria-invalid="!!accountErrors.newPassword" aria-describedby="new-pw-error" type="password" autocomplete="new-password" placeholder="至少 6 位，留空则不修改" />
              <p v-if="accountErrors.newPassword" id="new-pw-error" class="mt-1 text-xs text-destructive">{{ accountErrors.newPassword }}</p>
            </div>
          </div>
          <div class="flex justify-end border-t border-border/70 pt-5">
            <Button type="submit" :disabled="savingAccount">
              {{ savingAccount ? "保存中..." : "更新账号" }}
            </Button>
          </div>
        </form>
      </section>

      <!-- 时区 -->
      <section class="grid gap-6 border-t border-border p-5 sm:p-6 lg:grid-cols-[14rem_minmax(0,1fr)] lg:gap-10 lg:p-8" aria-labelledby="timezone-heading">
        <div class="flex items-start gap-3 lg:block">
          <div class="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary lg:mb-4">
            <Clock3 class="size-4" aria-hidden="true" />
          </div>
          <div>
            <h2 id="timezone-heading" class="font-semibold text-foreground">日期与时间</h2>
            <p class="mt-1 text-sm leading-6 text-muted-foreground">
              决定提醒时间和日期在页面中的显示方式。
            </p>
          </div>
        </div>

        <form class="max-w-xl" @submit.prevent="saveTimezone">
          <label id="timezone-label" class="mb-1.5 block text-sm font-medium text-foreground">时区</label>
          <div class="flex flex-col gap-3 sm:flex-row sm:items-end">
            <Select v-model="selectedTimezone">
              <SelectTrigger class="w-full sm:flex-1" :aria-invalid="!!timezoneErrors.selectedTimezone" aria-labelledby="timezone-label" aria-describedby="timezone-error">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem v-for="tz in timezones" :key="tz.value" :value="tz.value">{{ tz.label }}</SelectItem>
              </SelectContent>
            </Select>
            <Button type="submit" class="sm:shrink-0" :disabled="savingTimezone">
              {{ savingTimezone ? "保存中..." : "保存时区" }}
            </Button>
          </div>
          <p v-if="timezoneErrors.selectedTimezone" id="timezone-error" class="mt-1 text-xs text-destructive">{{ timezoneErrors.selectedTimezone }}</p>
          <p class="mt-2 text-xs text-muted-foreground">已有提醒的时间会按所选时区自动换算。</p>
        </form>
      </section>

      <!-- 关于 -->
      <section class="grid gap-6 border-t border-border p-5 sm:p-6 lg:grid-cols-[14rem_minmax(0,1fr)] lg:gap-10 lg:p-8" aria-labelledby="about-heading">
        <div class="flex items-start gap-3 lg:block">
          <div class="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary lg:mb-4">
            <Info class="size-4" aria-hidden="true" />
          </div>
          <div>
            <h2 id="about-heading" class="font-semibold text-foreground">关于</h2>
            <p class="mt-1 text-sm leading-6 text-muted-foreground">版本与项目相关信息。</p>
          </div>
        </div>

        <dl class="max-w-xl divide-y divide-border/70 text-sm">
          <div class="flex items-center justify-between gap-4 py-3 first:pt-0">
            <dt class="text-muted-foreground">当前版本</dt>
            <dd class="font-medium text-foreground">v1.0.0</dd>
          </div>
          <div class="flex items-start justify-between gap-6 py-3">
            <dt class="shrink-0 text-muted-foreground">通知渠道</dt>
            <dd class="text-right text-foreground">Telegram、Email、飞书、Bark</dd>
          </div>
          <div class="flex items-center justify-between gap-4 py-3">
            <dt class="text-muted-foreground">检查频率</dt>
            <dd class="text-foreground">每分钟</dd>
          </div>
          <div class="flex items-center justify-between gap-4 pt-3">
            <dt class="text-muted-foreground">项目地址</dt>
            <dd>
              <a
                href="https://github.com/zhiyxn/TaskReminder"
                target="_blank"
                rel="noopener noreferrer"
                class="inline-flex items-center gap-1.5 font-medium text-primary hover:underline"
              >
                GitHub 仓库
                <ExternalLink class="size-3.5" aria-hidden="true" />
              </a>
            </dd>
          </div>
        </dl>
      </section>
    </div>
  </div>
</template>
