import { ref, onMounted, onUnmounted } from "vue"

export function useIsMobile(breakpoint = 768) {
  const isMobile = ref(false)
  const query = `(max-width: ${breakpoint}px)`

  function onChange(e: MediaQueryListEvent | MediaQueryList) {
    isMobile.value = e.matches
  }

  let mql: MediaQueryList | null = null

  onMounted(() => {
    mql = window.matchMedia(query)
    isMobile.value = mql.matches
    mql.addEventListener("change", onChange)
  })

  onUnmounted(() => {
    mql?.removeEventListener("change", onChange)
  })

  return { isMobile }
}
