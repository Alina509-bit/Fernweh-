import { ref } from "vue";

export interface Toast {
  id: number;
  kind: "success" | "error";
  message: string;
}

// Modulweiter Zustand: ein Toast-Stapel für die ganze App
const toasts = ref<Toast[]>([]);
let nextId = 1;

export function useToasts() {
  function push(kind: Toast["kind"], message: string, timeout = 3500) {
    const id = nextId++;
    toasts.value.push({ id, kind, message });
    setTimeout(() => dismiss(id), timeout);
  }
  function dismiss(id: number) {
    toasts.value = toasts.value.filter((t) => t.id !== id);
  }
  return {
    toasts,
    success: (m: string) => push("success", m),
    error: (m: string) => push("error", m, 6000),
    dismiss,
  };
}
