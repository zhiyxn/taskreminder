import { ref, computed, type Ref } from "vue"

export function usePagination<T>(data: Ref<T[]>, pageSize = 10) {
  const currentPage = ref(1)

  const totalPages = computed(() => Math.max(1, Math.ceil(data.value.length / pageSize)))
  const totalItems = computed(() => data.value.length)

  const pagedData = computed(() => {
    const total = totalPages.value
    if (currentPage.value > total) currentPage.value = total
    const start = (currentPage.value - 1) * pageSize
    return data.value.slice(start, start + pageSize)
  })

  function goTo(page: number) {
    if (page >= 1 && page <= totalPages.value) currentPage.value = page
  }

  function reset() {
    currentPage.value = 1
  }

  const showPagination = computed(() => totalItems.value > pageSize)

  return { currentPage, totalPages, totalItems, pagedData, goTo, reset, showPagination }
}
