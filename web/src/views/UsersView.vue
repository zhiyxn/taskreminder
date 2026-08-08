<script setup lang="ts">
import { ref, onMounted, computed } from "vue"
import { useUsersStore } from "@/stores/users"
import { useIsMobile } from "@/composables/useMediaQuery"
import { usePagination } from "@/composables/usePagination"
import PaginationBar from "@/components/shared/PaginationBar.vue"
import EmptyState from "@/components/shared/EmptyState.vue"
import type { UserItem } from "@/types"

const store = useUsersStore()
const { isMobile } = useIsMobile()

const { pagedData, totalPages, currentPage, totalItems, goTo } = usePagination(
  computed(() => store.filteredUsers),
  10
)

// 编辑模态
const editOpen = ref(false)
const editUser = ref<UserItem | null>(null)
const editUsername = ref("")
const editPassword = ref("")
const editRole = ref("user")
const editStatus = ref("active")

function openEdit(user: UserItem) {
  editUser.value = user
  editUsername.value = user.username
  editPassword.value = ""
  editRole.value = user.role
  editStatus.value = user.status
  editOpen.value = true
}

async function saveEdit() {
  if (!editUser.value) return
  const result = await store.updateUser(editUser.value.id, {
    username: editUsername.value,
    password: editPassword.value || undefined,
    role: editRole.value,
    status: editStatus.value,
  })
  if (result.success) {
    editOpen.value = false
  } else {
    alert(result.error || "更新失败")
  }
}

// 删除确认
const deleteOpen = ref(false)
const deleteTarget = ref<UserItem | null>(null)

function openDelete(user: UserItem) {
  deleteTarget.value = user
  deleteOpen.value = true
}

async function confirmDelete() {
  if (!deleteTarget.value) return
  await store.deleteUser(deleteTarget.value.id)
  deleteOpen.value = false
}

async function handleToggleStatus(user: UserItem) {
  const newStatus = user.status === "disabled" ? "active" : "disabled"
  if (!confirm(`确定要${newStatus === 'disabled' ? '停用' : '启用'}用户「${user.username}」吗？`)) return
  await store.toggleStatus(user.id)
}

onMounted(() => store.fetchAll())
</script>

<template>
  <div class="space-y-4">
    <div class="flex flex-wrap items-center gap-3">
      <h2 class="text-lg font-semibold text-foreground">👥 用户管理</h2>
      <input
        v-model="store.searchKeyword"
        placeholder="搜索用户名..."
        class="flex-1 rounded-lg border border-border bg-background px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
      />
    </div>

    <!-- 桌面表格 -->
    <div v-if="!isMobile" class="overflow-x-auto rounded-lg border border-border">
      <table v-if="totalItems > 0" class="w-full text-sm">
        <thead>
          <tr class="border-b border-border bg-muted/50 text-left text-xs font-semibold uppercase text-muted-foreground">
            <th class="px-4 py-3">ID</th>
            <th class="px-4 py-3">用户名</th>
            <th class="px-4 py-3">角色</th>
            <th class="px-4 py-3">状态</th>
            <th class="px-4 py-3">提醒数</th>
            <th class="px-4 py-3">注册时间</th>
            <th class="px-4 py-3">操作</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="u in pagedData" :key="u.id" class="border-b border-border last:border-0 hover:bg-muted/30">
            <td class="px-4 py-3 text-muted-foreground">{{ u.id }}</td>
            <td class="px-4 py-3 font-medium text-foreground">{{ u.username }}</td>
            <td class="px-4 py-3">
              <span :class="['inline-flex rounded-md px-2 py-0.5 text-xs font-medium', u.role === 'admin' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400']">{{ u.role === 'admin' ? '管理员' : '用户' }}</span>
            </td>
            <td class="px-4 py-3">
              <span :class="['inline-flex rounded-md px-2 py-0.5 text-xs font-medium', u.status !== 'disabled' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400']">{{ u.status !== 'disabled' ? '正常' : '停用' }}</span>
            </td>
            <td class="px-4 py-3 text-muted-foreground">{{ u.reminder_count }}</td>
            <td class="px-4 py-3 text-muted-foreground text-xs">{{ u.created_at }}</td>
            <td class="px-4 py-3">
              <div class="flex flex-wrap gap-1">
                <button class="rounded-md border border-border px-2 py-1 text-xs hover:bg-muted" @click="handleToggleStatus(u)">
                  {{ u.status === 'disabled' ? '启用' : '停用' }}
                </button>
                <button class="rounded-md border border-border px-2 py-1 text-xs text-blue-600 hover:bg-muted" @click="openEdit(u)">编辑</button>
                <button v-if="u.role !== 'admin'" class="rounded-md border border-border px-2 py-1 text-xs text-red-600 hover:bg-muted" @click="openDelete(u)">删除</button>
              </div>
            </td>
          </tr>
        </tbody>
      </table>
      <EmptyState v-else icon="🔍" message="未找到匹配的用户" />
    </div>

    <!-- 移动端卡片 -->
    <div v-else class="flex flex-col gap-4">
      <EmptyState v-if="totalItems === 0" icon="🔍" message="未找到匹配的用户" />
      <div v-for="u in pagedData" :key="u.id" class="rounded-xl border border-border bg-card p-4 shadow-sm">
        <div class="font-semibold text-foreground">{{ u.username }}</div>
        <div class="mt-2 grid grid-cols-2 gap-2 text-sm">
          <div><span class="text-muted-foreground">角色</span> <span class="ml-1">{{ u.role === 'admin' ? '管理员' : '用户' }}</span></div>
          <div><span class="text-muted-foreground">状态</span> <span :class="['ml-1', u.status !== 'disabled' ? 'text-green-600' : 'text-red-600']">{{ u.status !== 'disabled' ? '正常' : '停用' }}</span></div>
          <div><span class="text-muted-foreground">提醒数</span> <span class="ml-1">{{ u.reminder_count }}</span></div>
          <div><span class="text-muted-foreground">注册</span> <span class="ml-1 text-xs">{{ u.created_at }}</span></div>
        </div>
        <div class="mt-3 flex flex-wrap gap-1">
          <button class="rounded-md border border-border px-2 py-1 text-xs hover:bg-muted" @click="handleToggleStatus(u)">{{ u.status === 'disabled' ? '启用' : '停用' }}</button>
          <button class="rounded-md border border-border px-2 py-1 text-xs text-blue-600 hover:bg-muted" @click="openEdit(u)">编辑</button>
          <button v-if="u.role !== 'admin'" class="rounded-md border border-border px-2 py-1 text-xs text-red-600 hover:bg-muted" @click="openDelete(u)">删除</button>
        </div>
      </div>
    </div>

    <PaginationBar :total-items="totalItems" :current-page="currentPage" :total-pages="totalPages" @update:current-page="goTo" />

    <!-- 编辑模态 -->
    <div v-if="editOpen" class="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto px-4 py-10">
      <div class="fixed inset-0 bg-black/40 backdrop-blur-sm" @click="editOpen = false" />
      <div class="relative z-10 w-full max-w-md rounded-2xl border border-border bg-card p-6 shadow-2xl">
        <h2 class="mb-4 text-lg font-semibold text-foreground">编辑用户</h2>
        <form @submit.prevent="saveEdit" class="space-y-4">
          <div>
            <label class="mb-1.5 block text-sm font-medium text-foreground">用户名</label>
            <input v-model="editUsername" required class="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500" />
          </div>
          <div>
            <label class="mb-1.5 block text-sm font-medium text-foreground">密码（留空不改）</label>
            <input v-model="editPassword" type="password" class="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500" />
          </div>
          <div>
            <label class="mb-1.5 block text-sm font-medium text-foreground">角色</label>
            <select v-model="editRole" class="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none">
              <option value="user">用户</option>
              <option value="admin">管理员</option>
            </select>
          </div>
          <div>
            <label class="mb-1.5 block text-sm font-medium text-foreground">状态</label>
            <select v-model="editStatus" class="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none">
              <option value="active">正常</option>
              <option value="disabled">停用</option>
            </select>
          </div>
          <div class="flex justify-end gap-3 pt-2">
            <button type="button" class="rounded-lg border border-border bg-background px-4 py-2 text-sm hover:bg-muted" @click="editOpen = false">取消</button>
            <button type="submit" class="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-500">保存</button>
          </div>
        </form>
      </div>
    </div>

    <!-- 删除确认 -->
    <div v-if="deleteOpen" class="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto px-4 py-10">
      <div class="fixed inset-0 bg-black/40 backdrop-blur-sm" @click="deleteOpen = false" />
      <div class="relative z-10 w-full max-w-sm rounded-2xl border border-border bg-card p-6 shadow-2xl">
        <h2 class="text-lg font-semibold text-foreground">确认删除</h2>
        <p class="mt-2 text-sm text-muted-foreground">确定要删除用户「{{ deleteTarget?.username }}」吗？该用户的所有提醒和日志将被一并删除，此操作不可撤销。</p>
        <div class="mt-5 flex justify-end gap-3">
          <button class="rounded-lg border border-border bg-background px-4 py-2 text-sm hover:bg-muted" @click="deleteOpen = false">取消</button>
          <button class="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-500" @click="confirmDelete">确认删除</button>
        </div>
      </div>
    </div>
  </div>
</template>
