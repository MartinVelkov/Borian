import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cn } from "@/lib/utils";

export function Button({ className, variant = "default", size = "default", asChild = false, ...props }: React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: "default" | "secondary" | "outline" | "ghost"; size?: "default" | "sm" | "lg" | "icon"; asChild?: boolean }) {
  const variants = {
    default: "bg-primary text-primary-foreground hover:opacity-90",
    secondary: "bg-secondary text-secondary-foreground hover:bg-secondary/80",
    outline: "border bg-background hover:bg-accent hover:text-accent-foreground",
    ghost: "hover:bg-accent hover:text-accent-foreground",
  };
  const sizes = { default: "h-10 px-4 py-2", sm: "h-9 px-3", lg: "h-11 px-8", icon: "h-10 w-10" };

  const Comp = asChild ? Slot : "button";
  return <Comp className={cn("inline-flex items-center justify-center rounded-md text-sm font-medium transition disabled:opacity-50", variants[variant], sizes[size], className)} {...props} />;
}
