<script setup lang="ts">
import { computed, ref } from "vue"
import { CalendarDate, type DateValue } from "@internationalized/date"
import { CalendarDays, Clock3 } from "@lucide/vue"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import { Input } from "@/components/ui/input"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { cn } from "@/lib/utils"

const props = defineProps<{
  id?: string
  modelValue?: string
  placeholder?: string
  ariaInvalid?: boolean
  ariaDescribedby?: string
}>()

const emit = defineEmits<{
  "update:modelValue": [value: string]
}>()

const open = ref(false)

function parseValue(value?: string) {
  return value?.match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/)
}

function pad(value: number) {
  return String(value).padStart(2, "0")
}

function updateValue(date: DateValue, time: string) {
  emit(
    "update:modelValue",
    `${date.year}-${pad(date.month)}-${pad(date.day)}T${time}`,
  )
}

const calendarValue = computed<DateValue | undefined>({
  get() {
    const match = parseValue(props.modelValue)
    if (!match) return undefined
    return new CalendarDate(Number(match[1]), Number(match[2]), Number(match[3]))
  },
  set(date) {
    if (!date) return
    const match = parseValue(props.modelValue)
    updateValue(date, match ? `${match[4]}:${match[5]}` : "09:00")
  },
})

const timeValue = computed({
  get() {
    const match = parseValue(props.modelValue)
    return match ? `${match[4]}:${match[5]}` : "09:00"
  },
  set(time: string | number) {
    const date = calendarValue.value
    if (!date) return
    updateValue(date, String(time))
  },
})

const displayValue = computed(() => {
  const match = parseValue(props.modelValue)
  if (!match) return ""
  return `${match[1]}年${match[2]}月${match[3]}日 ${match[4]}:${match[5]}`
})
</script>

<template>
  <Popover v-model:open="open">
    <PopoverTrigger as-child>
      <Button
        :id="id"
        type="button"
        variant="outline"
        :aria-invalid="ariaInvalid"
        :aria-describedby="ariaDescribedby"
        :class="cn(
          'w-full justify-start text-left font-normal',
          !displayValue && 'text-muted-foreground',
          ariaInvalid && 'border-destructive',
        )"
      >
        <CalendarDays class="mr-2 size-4 shrink-0" />
        <span class="truncate">
          {{ displayValue || placeholder || "选择日期和时间" }}
        </span>
      </Button>
    </PopoverTrigger>
    <PopoverContent align="start" class="w-auto p-0">
      <Calendar
        v-model="calendarValue"
        locale="zh-CN"
        :week-starts-on="1"
        initial-focus
      />
      <div class="flex items-end gap-2 border-t border-border p-3">
        <div class="flex-1">
          <label for="reminder-start-time" class="mb-1.5 flex items-center gap-1 text-xs font-medium text-muted-foreground">
            <Clock3 class="size-3.5" />
            时间
          </label>
          <Input
            id="reminder-start-time"
            v-model="timeValue"
            type="time"
            step="60"
          />
        </div>
        <Button type="button" size="sm" @click="open = false">完成</Button>
      </div>
    </PopoverContent>
  </Popover>
</template>
