"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  CalendarDays,
  ChevronRight,
  Home,
  ListChecks,
  MonitorPlay,
  Trophy,
  UserPlus,
  Users,
  Table,
  Tags,
  ClipboardCheck,
} from "lucide-react";
import { cn } from "@/lib/utils";

const steps = [
  {
    href: "/dashboard",
    label: "Начало",
    description: "Общ преглед",
    icon: Home,
  },
  {
    href: "/dashboard/tournaments",
    label: "Турнири",
    description: "Основни данни",
    icon: Trophy,
  },
  {
    href: "/dashboard/category",
    label: "Категории",
    description: "Категории по турнир",
    icon: Tags,
  },
  {
    href: "/dashboard/registrations",
    label: "Регистрации",
    description: "Одобрение на заявки",
    icon: ClipboardCheck,
  },
  {
    href: "/dashboard/teams",
    label: "Отбори",
    description: "Създай отбори",
    icon: Users,
  },
  {
    href: "/dashboard/players",
    label: "Играчи",
    description: "До 4 играчи в отбор",
    icon: UserPlus,
  },
  {
    href: "/dashboard/schedule",
    label: "Игрова програма",
    description: "Генерирай мачове",
    icon: CalendarDays,
  },
  {
    href: "/dashboard/match-control",
    label: "Контролен панел",
    description: "Голове, фалове, корнери",
    icon: MonitorPlay,
  },
  {
    href: "/dashboard/bracket",
    label: "Схема на турнира",
    description: "Гледай турнира",
    icon: Table,
  },
];

export function StepSidebar() {
  const pathname = usePathname();

  return (
    <aside className="hidden min-h-screen w-80 border-r bg-white p-6 lg:block">
      <Link href="/" className="mb-8 block">
        <div className="text-xl font-black tracking-tight">3x3 Футбол</div>
        <div className="text-sm text-muted-foreground">Турнир Мениджър</div>
      </Link>

      <div className="mb-4 rounded-xl border bg-muted/40 p-4">
        <div className="flex items-center gap-2 text-sm font-semibold">
          <ListChecks className="h-4 w-4" />
          Процес по стъпки
        </div>
        <p className="mt-1 text-xs text-muted-foreground">
          Виждаш само избраната стъпка, за да не се смесват формите.
        </p>
      </div>

      <nav className="space-y-2">
        {steps.map((item) => {
          const isActive =
            item.href === "/dashboard"
              ? pathname === "/dashboard"
              : pathname.startsWith(item.href);
          const Icon = item.icon;

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center justify-between rounded-xl border px-3 py-3 text-sm transition",
                isActive
                  ? "border-primary bg-primary text-primary-foreground shadow-sm"
                  : "border-transparent text-muted-foreground hover:border-border hover:bg-accent hover:text-accent-foreground",
              )}
            >
              <span className="flex items-center gap-3">
                <Icon className="h-4 w-4" />
                <span>
                  <span className="block font-semibold">{item.label}</span>
                  <span
                    className={cn(
                      "block text-xs",
                      isActive ? "text-primary-foreground/75" : "text-muted-foreground",
                    )}
                  >
                    {item.description}
                  </span>
                </span>
              </span>
              {isActive && <ChevronRight className="h-4 w-4" />}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
