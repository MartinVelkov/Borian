import type { ReactNode } from "react";
import { Badge } from "@/components/ui/badge";

export function PageHeader({
  eyebrow,
  title,
  description,
  children,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  children?: ReactNode;
}) {
  return (
    <div className="mb-8 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
      <div>
        {eyebrow && <Badge className="mb-3 bg-accent text-accent-foreground">{eyebrow}</Badge>}
        <h1 className="text-3xl font-black tracking-tight md:text-4xl">{title}</h1>
        {description && <p className="mt-2 max-w-3xl text-muted-foreground">{description}</p>}
      </div>
      {children}
    </div>
  );
}
