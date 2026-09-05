"use client";
import { cn } from "@/lib/utils";
export function Switch({ checked, onCheckedChange, disabled, id }: { checked: boolean; onCheckedChange: (value: boolean) => void; disabled?: boolean; id?: string }) {
  return <button id={id} type="button" role="switch" aria-checked={checked} disabled={disabled} onClick={() => onCheckedChange(!checked)} className={cn("relative h-6 w-11 rounded-full transition", checked ? "bg-primary" : "bg-muted-foreground/30")}><span className={cn("absolute top-1 h-4 w-4 rounded-full bg-white transition", checked ? "left-6" : "left-1")} /></button>;
}
