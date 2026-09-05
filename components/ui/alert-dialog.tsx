"use client";
import * as Dialog from "@radix-ui/react-dialog";
import { Button } from "@/components/ui/button";

export function AlertDialog({ open, title, description, onCancel, onConfirm, loading }: { open: boolean; title: string; description: string; onCancel: () => void; onConfirm: () => void; loading?: boolean }) {
  return <Dialog.Root open={open} onOpenChange={(value) => { if (!value) onCancel(); }}><Dialog.Portal><Dialog.Overlay className="fixed inset-0 z-50 bg-black/50" /><Dialog.Content className="fixed left-1/2 top-1/2 z-50 w-[calc(100%-2rem)] max-w-md -translate-x-1/2 -translate-y-1/2 rounded-xl border bg-background p-6 shadow-xl"><Dialog.Title className="text-lg font-bold">{title}</Dialog.Title><Dialog.Description className="mt-2 text-sm text-muted-foreground">{description}</Dialog.Description><div className="mt-6 flex justify-end gap-2"><Button variant="outline" onClick={onCancel} disabled={loading}>Отказ</Button><Button onClick={onConfirm} disabled={loading} className="bg-red-600 hover:bg-red-700">{loading ? "Изтриване..." : "Изтрий"}</Button></div></Dialog.Content></Dialog.Portal></Dialog.Root>;
}
