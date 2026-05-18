import { LucideIcon } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export type SubTabBadgeVariant = "destructive" | "warning" | "secondary";

export type SubTab = {
  value: string;
  label: string;
  icon?: LucideIcon;
  badge?: { count: number; variant: SubTabBadgeVariant };
};

export type TabGroup = {
  id: string;
  label: string;
  icon?: LucideIcon;
  subs: SubTab[];
};

interface ProjectTabsNavProps {
  groups: TabGroup[];
  activeTab: string;
  onChange: (value: string) => void;
  rightSlot?: React.ReactNode;
}

function NavBadge({
  count,
  variant,
}: {
  count: number;
  variant: SubTabBadgeVariant;
}) {
  return (
    <Badge
      variant={variant}
      className="ml-1 h-5 min-w-5 px-1.5 text-[11px] rounded-full font-medium tabular-nums flex items-center justify-center"
    >
      {count > 99 ? "99+" : count}
    </Badge>
  );
}

export default function ProjectTabsNav({
  groups,
  activeTab,
  onChange,
  rightSlot,
}: ProjectTabsNavProps) {
  const currentGroup =
    groups.find((g) => g.subs.some((s) => s.value === activeTab)) || groups[0];

  return (
    <div className="space-y-0">
      {/* Nivel 1 — Pestañas principales (segmented) */}
      <div className="flex items-center justify-between gap-3">
        <div
          role="tablist"
          aria-label="Secciones del proyecto"
          className="flex-1 min-w-0 overflow-x-auto"
        >
          <div className="inline-flex items-center gap-1 bg-muted/60 p-1 rounded-xl border border-border/60 shadow-inner">
            {groups.map((g) => {
              const isActive = g.id === currentGroup.id;
              const Icon = g.icon;
              const aggBadge = g.subs.reduce(
                (acc, s) => acc + (s.badge?.count || 0),
                0,
              );
              const aggVariant: SubTabBadgeVariant =
                g.subs.find((s) => s.badge?.variant === "destructive")?.badge
                  ?.variant ||
                g.subs.find((s) => s.badge?.variant === "warning")?.badge
                  ?.variant ||
                "secondary";
              return (
                <button
                  key={g.id}
                  role="tab"
                  aria-selected={isActive}
                  type="button"
                  onClick={() => {
                    if (!isActive) onChange(g.subs[0].value);
                  }}
                  className={cn(
                    "relative inline-flex items-center gap-2 h-9 px-3.5 rounded-lg text-sm transition-all whitespace-nowrap",
                    isActive
                      ? "bg-background text-foreground font-semibold shadow-sm"
                      : "text-muted-foreground hover:text-foreground hover:bg-background/50 font-medium",
                  )}
                >
                  {Icon && <Icon className="w-4 h-4" />}
                  <span>{g.label}</span>
                  {aggBadge > 0 && !isActive && (
                    <NavBadge count={aggBadge} variant={aggVariant} />
                  )}
                </button>
              );
            })}
          </div>
        </div>
        {rightSlot && (
          <div className="flex items-center gap-2 flex-shrink-0 pl-3 border-l border-border/60">
            {rightSlot}
          </div>
        )}
      </div>

      {/* Nivel 2 — Subpestañas (underline) */}
      {currentGroup.subs.length > 1 && (
        <div className="mt-3 border-b border-border">
          <div
            role="tablist"
            aria-label={`Subsecciones de ${currentGroup.label}`}
            className="flex items-center gap-1 overflow-x-auto -mb-px"
          >
            {currentGroup.subs.map((s) => {
              const isActive = s.value === activeTab;
              return (
                <button
                  key={s.value}
                  role="tab"
                  aria-selected={isActive}
                  type="button"
                  onClick={() => onChange(s.value)}
                  className={cn(
                    "inline-flex items-center gap-1.5 px-3 h-8 text-[13px] whitespace-nowrap border-b-2 transition-colors -mb-px",
                    isActive
                      ? "border-primary text-foreground font-medium"
                      : "border-transparent text-muted-foreground hover:text-foreground hover:border-border",
                  )}
                >
                  <span>{s.label}</span>
                  {s.badge && (
                    <NavBadge
                      count={s.badge.count}
                      variant={s.badge.variant}
                    />
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
