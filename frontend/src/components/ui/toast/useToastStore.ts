import { create } from "zustand";

export type ToastTone = "success" | "warning" | "danger" | "info";

export interface Toast {
  id: string;
  title: string;
  description?: string;
  tone: ToastTone;
}

interface ToastState {
  toasts: Toast[];
  push: (toast: Omit<Toast, "id">) => string;
  dismiss: (id: string) => void;
}

export const useToastStore = create<ToastState>((set) => ({
  toasts: [],
  push: (toast) => {
    const id = crypto.randomUUID();
    set((state) => ({ toasts: [...state.toasts, { ...toast, id }] }));
    return id;
  },
  dismiss: (id) => set((state) => ({ toasts: state.toasts.filter((t) => t.id !== id) })),
}));

export const toast = {
  success: (title: string, description?: string) =>
    useToastStore.getState().push({ title, description, tone: "success" }),
  warning: (title: string, description?: string) =>
    useToastStore.getState().push({ title, description, tone: "warning" }),
  danger: (title: string, description?: string) =>
    useToastStore.getState().push({ title, description, tone: "danger" }),
  info: (title: string, description?: string) =>
    useToastStore.getState().push({ title, description, tone: "info" }),
};
