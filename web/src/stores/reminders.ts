import { defineStore } from "pinia"
import { ref, computed } from "vue"
import api from "@/lib/api"
import type { ApiResponse, Reminder, FireResult } from "@/types"
import { useAuthStore } from "./auth"

export const useRemindersStore = defineStore("reminders", () => {
  const reminders = ref<Reminder[]>([])
  const searchKeyword = ref("")
  const userFilter = ref<"all" | "mine">("all")
  const loading = ref(false)

  const filteredReminders = computed(() => {
    let data = reminders.value
    const auth = useAuthStore()
    if (auth.isAdmin && userFilter.value === "mine" && auth.username) {
      data = data.filter((r) => r.username === auth.username)
    }
    const kw = searchKeyword.value.trim().toLowerCase()
    if (kw) {
      data = data.filter(
        (r) =>
          (r.title && r.title.toLowerCase().includes(kw)) ||
          (r.description && r.description.toLowerCase().includes(kw))
      )
    }
    return data
  })

  const stats = computed(() => ({
    total: reminders.value.length,
    active: reminders.value.filter((r) => r.enabled).length,
    inactive: reminders.value.filter((r) => !r.enabled).length,
  }))

  async function fetchAll() {
    loading.value = true
    try {
      const res = await api.get<ApiResponse<Reminder[]>>("/reminders")
      if (res.data.success) reminders.value = res.data.data || []
    } finally {
      loading.value = false
    }
  }

  async function create(form: Record<string, any>): Promise<ApiResponse<Reminder>> {
    const res = await api.post<ApiResponse<Reminder>>("/reminders", form)
    if (res.data.success) await fetchAll()
    return res.data
  }

  async function update(id: number, form: Record<string, any>): Promise<ApiResponse<Reminder>> {
    const res = await api.put<ApiResponse<Reminder>>(`/reminders/${id}`, form)
    if (res.data.success) await fetchAll()
    return res.data
  }

  async function remove(id: number): Promise<void> {
    await api.delete(`/reminders/${id}`)
    await fetchAll()
  }

  async function toggle(id: number, enabled: boolean): Promise<void> {
    await api.post(`/reminders/${id}/toggle`, { enabled })
    await fetchAll()
  }

  async function fire(id: number): Promise<Record<string, FireResult>> {
    const res = await api.post<ApiResponse<Record<string, FireResult>>>(`/reminders/${id}/fire`)
    return res.data.data || {}
  }

  return { reminders, searchKeyword, userFilter, loading, filteredReminders, stats, fetchAll, create, update, remove, toggle, fire }
})
