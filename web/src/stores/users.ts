import { defineStore } from "pinia"
import { ref, computed } from "vue"
import api from "@/lib/api"
import type { ApiResponse, UserItem } from "@/types"

export const useUsersStore = defineStore("users", () => {
  const users = ref<UserItem[]>([])
  const searchKeyword = ref("")
  const loading = ref(false)

  const filteredUsers = computed(() => {
    const kw = searchKeyword.value.trim().toLowerCase()
    if (!kw) return users.value
    return users.value.filter((u) => u.username && u.username.toLowerCase().includes(kw))
  })

  async function fetchAll() {
    loading.value = true
    try {
      const res = await api.get<ApiResponse<UserItem[]>>("/users")
      if (res.data.success) users.value = res.data.data || []
    } finally {
      loading.value = false
    }
  }

  async function updateUser(id: number, form: Record<string, any>): Promise<ApiResponse> {
    const res = await api.put<ApiResponse>(`/users/${id}`, form)
    if (res.data.success) await fetchAll()
    return res.data
  }

  async function toggleStatus(id: number): Promise<ApiResponse> {
    const res = await api.post<ApiResponse>(`/users/${id}/toggle-status`)
    if (res.data.success) await fetchAll()
    return res.data
  }

  async function deleteUser(id: number): Promise<void> {
    await api.delete(`/users/${id}`)
    await fetchAll()
  }

  return { users, searchKeyword, loading, filteredUsers, fetchAll, updateUser, toggleStatus, deleteUser }
})
