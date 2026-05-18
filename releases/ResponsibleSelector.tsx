import { useEffect, useMemo, useState } from "react";
import { Check, ChevronsUpDown, User } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";

export type ResponsibleRefType = "profile" | "contact";

export interface ResponsibleRef {
  type: ResponsibleRefType;
  id: string;
  name: string;
}

interface ResponsibleSelectorProps {
  value: ResponsibleRef | null;
  onChange: (value: ResponsibleRef | null) => void;
  artistId?: string | null; // Filter contacts/profiles linked to this artist
  placeholder?: string;
  className?: string;
  compact?: boolean; // Show icon only when no value
}

export function ResponsibleSelector({
  value,
  onChange,
  artistId,
  placeholder = "Asignar...",
  className,
  compact = false,
}: ResponsibleSelectorProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [items, setItems] = useState<ResponsibleRef[]>([]);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      if (!open) return;

      try {
        setLoading(true);
        const allItems: ResponsibleRef[] = [];

        // 1. Get contacts linked to artist via contact_artist_assignments
        if (artistId) {
          const { data: assignments, error: assignErr } = await supabase
            .from("contact_artist_assignments")
            .select("contact_id")
            .eq("artist_id", artistId);

          if (assignErr) console.error("ResponsibleSelector assignments error", assignErr);

          const contactIds = (assignments || []).map((a) => a.contact_id);

          if (contactIds.length > 0) {
            const { data: contacts, error: contactsErr } = await supabase
              .from("contacts")
              .select("id, name, stage_name")
              .in("id", contactIds)
              .order("name", { ascending: true });

            if (contactsErr) console.error("ResponsibleSelector contacts error", contactsErr);

            (contacts || []).forEach((c) => {
              allItems.push({
                type: "contact",
                id: c.id,
                name: c.stage_name || c.name,
              });
            });
          }

          // 2. Get profiles that are workspace members with bindings to this artist
          const { data: bindings, error: bindErr } = await supabase
            .from("artist_role_bindings")
            .select("user_id")
            .eq("artist_id", artistId);

          if (bindErr) console.error("ResponsibleSelector bindings error", bindErr);

          const userIds = (bindings || []).map((b) => b.user_id);

          if (userIds.length > 0) {
            const { data: profiles, error: profilesErr } = await supabase
              .from("profiles")
              .select("user_id, full_name, stage_name")
              .in("user_id", userIds)
              .order("full_name", { ascending: true });

            if (profilesErr) console.error("ResponsibleSelector profiles error", profilesErr);

            (profiles || []).forEach((p) => {
              allItems.push({
                type: "profile",
                id: p.user_id,
                name: p.stage_name || p.full_name || "Usuario",
              });
            });
          }
        } else {
          // Fallback: no artistId provided – fetch all (limited)
          const [profilesRes, contactsRes] = await Promise.all([
            supabase
              .from("profiles")
              .select("user_id, full_name, stage_name")
              .order("full_name", { ascending: true })
              .limit(50),
            supabase
              .from("contacts")
              .select("id, name, stage_name")
              .order("name", { ascending: true })
              .limit(100),
          ]);

          if (profilesRes.error) console.error("ResponsibleSelector profiles error", profilesRes.error);
          if (contactsRes.error) console.error("ResponsibleSelector contacts error", contactsRes.error);

          (profilesRes.data || []).forEach((p) => {
            allItems.push({
              type: "profile",
              id: p.user_id,
              name: p.stage_name || p.full_name || "Usuario",
            });
          });

          (contactsRes.data || []).forEach((c) => {
            allItems.push({
              type: "contact",
              id: c.id,
              name: c.stage_name || c.name,
            });
          });
        }

        if (cancelled) return;

        // Sort merged items
        allItems.sort((a, b) => a.name.localeCompare(b.name, "es"));
        setItems(allItems);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    void load();

    return () => {
      cancelled = true;
    };
  }, [open, artistId]);

  const grouped = useMemo(() => {
    return {
      perfiles: items.filter((i) => i.type === "profile"),
      contactos: items.filter((i) => i.type === "contact"),
    };
  }, [items]);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          role="combobox"
          aria-expanded={open}
          className={cn(
            "h-8 justify-between border-0 bg-transparent px-2 font-normal hover:bg-muted/50 focus:bg-muted text-xs",
            compact ? "w-auto min-w-0" : "w-full",
            !value && "text-muted-foreground",
            className
          )}
        >
          <span className="truncate flex items-center gap-1.5">
            <User className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
            {compact && !value ? null : (
              <span className="truncate max-w-[80px]">{value?.name || placeholder}</span>
            )}
          </span>
          <ChevronsUpDown className="ml-1 h-3.5 w-3.5 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-72 p-0" align="start">
        <Command>
          <CommandInput placeholder="Buscar responsable..." className="h-9" />
          <CommandList className="max-h-72">
            <CommandEmpty>{loading ? "Cargando..." : "Sin resultados"}</CommandEmpty>

            <CommandGroup heading="Acciones">
              <CommandItem
                value="sin_asignar"
                onSelect={() => {
                  onChange(null);
                  setOpen(false);
                }}
              >
                <span className="truncate">Sin asignar</span>
                <Check className={cn("ml-auto h-4 w-4", !value ? "opacity-100" : "opacity-0")} />
              </CommandItem>
            </CommandGroup>

            {grouped.perfiles.length > 0 && (
              <CommandGroup heading="Perfiles">
                {grouped.perfiles.map((item) => (
                  <CommandItem
                    key={`profile:${item.id}`}
                    value={item.name}
                    onSelect={() => {
                      onChange(item);
                      setOpen(false);
                    }}
                  >
                    <span className="truncate">{item.name}</span>
                    <Check
                      className={cn(
                        "ml-auto h-4 w-4",
                        value?.type === item.type && value?.id === item.id
                          ? "opacity-100"
                          : "opacity-0"
                      )}
                    />
                  </CommandItem>
                ))}
              </CommandGroup>
            )}

            {grouped.contactos.length > 0 && (
              <CommandGroup heading="Contactos">
                {grouped.contactos.map((item) => (
                  <CommandItem
                    key={`contact:${item.id}`}
                    value={item.name}
                    onSelect={() => {
                      onChange(item);
                      setOpen(false);
                    }}
                  >
                    <span className="truncate">{item.name}</span>
                    <Check
                      className={cn(
                        "ml-auto h-4 w-4",
                        value?.type === item.type && value?.id === item.id
                          ? "opacity-100"
                          : "opacity-0"
                      )}
                    />
                  </CommandItem>
                ))}
              </CommandGroup>
            )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
