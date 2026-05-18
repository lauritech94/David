import { useEffect, useMemo, useState } from "react";
import { Check, ChevronsUpDown, Plus, User, X } from "lucide-react";

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
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

export interface ProducerRef {
  type: "profile" | "contact";
  id: string;
  name: string;
}

// ─── Data fetching hook ───────────────────────────────────────────────────────

function useProducerItems(open: boolean, artistId?: string | null) {
  const [loading, setLoading] = useState(false);
  const [items, setItems] = useState<ProducerRef[]>([]);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      if (!open) return;
      try {
        setLoading(true);
        const allItems: ProducerRef[] = [];

        if (artistId) {
          // Contacts linked to artist
          const { data: assignments } = await supabase
            .from("contact_artist_assignments")
            .select("contact_id")
            .eq("artist_id", artistId);

          const contactIds = (assignments || []).map((a) => a.contact_id);

          if (contactIds.length > 0) {
            const { data: contacts } = await supabase
              .from("contacts")
              .select("id, name, stage_name")
              .in("id", contactIds)
              .order("name", { ascending: true });

            (contacts || []).forEach((c) => {
              allItems.push({ type: "contact", id: c.id, name: c.stage_name || c.name });
            });
          }

          // Workspace profiles with artist binding
          const { data: bindings } = await supabase
            .from("artist_role_bindings")
            .select("user_id")
            .eq("artist_id", artistId);

          const userIds = (bindings || []).map((b) => b.user_id);

          if (userIds.length > 0) {
            const { data: profiles } = await supabase
              .from("profiles")
              .select("user_id, full_name, stage_name")
              .in("user_id", userIds)
              .order("full_name", { ascending: true });

            (profiles || []).forEach((p) => {
              allItems.push({
                type: "profile",
                id: p.user_id,
                name: p.stage_name || p.full_name || "Usuario",
              });
            });
          }
        } else {
          // Fallback: no artistId
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

          (profilesRes.data || []).forEach((p) => {
            allItems.push({
              type: "profile",
              id: p.user_id,
              name: p.stage_name || p.full_name || "Usuario",
            });
          });

          (contactsRes.data || []).forEach((c) => {
            allItems.push({ type: "contact", id: c.id, name: c.stage_name || c.name });
          });
        }

        if (cancelled) return;
        allItems.sort((a, b) => a.name.localeCompare(b.name, "es"));
        setItems(allItems);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    void load();
    return () => { cancelled = true; };
  }, [open, artistId]);

  const addItem = (item: ProducerRef) => {
    setItems((prev) => {
      const exists = prev.some((i) => i.type === item.type && i.id === item.id);
      if (exists) return prev;
      return [...prev, item].sort((a, b) => a.name.localeCompare(b.name, "es"));
    });
  };

  const grouped = useMemo(() => ({
    perfiles: items.filter((i) => i.type === "profile"),
    contactos: items.filter((i) => i.type === "contact"),
  }), [items]);

  return { loading, grouped, addItem };
}

// ─── Multi-select ProducerSelector ───────────────────────────────────────────

interface ProducerSelectorProps {
  value: ProducerRef[];
  onChange: (value: ProducerRef[]) => void;
  artistId?: string | null;
  placeholder?: string;
  className?: string;
}

export function ProducerSelector({
  value,
  onChange,
  artistId,
  placeholder = "Seleccionar productor/es...",
  className,
}: ProducerSelectorProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [creating, setCreating] = useState(false);
  const { loading, grouped, addItem } = useProducerItems(open, artistId);

  const isSelected = (item: ProducerRef) =>
    value.some((v) => v.type === item.type && v.id === item.id);

  const toggle = (item: ProducerRef) => {
    if (isSelected(item)) {
      onChange(value.filter((v) => !(v.type === item.type && v.id === item.id)));
    } else {
      onChange([...value, item]);
    }
  };

  const remove = (item: ProducerRef) => {
    onChange(value.filter((v) => !(v.type === item.type && v.id === item.id)));
  };

  const allItems = [...grouped.perfiles, ...grouped.contactos];
  const trimmed = search.trim();
  const nameExists = allItems.some(
    (i) => i.name.toLowerCase() === trimmed.toLowerCase()
  );
  const showCreate = trimmed.length > 1 && !nameExists && !loading;

  const handleCreate = async () => {
    if (!trimmed) return;
    setCreating(true);
    try {
      const { data, error } = await supabase
        .from("contacts")
        .insert({ name: trimmed, created_by: (await supabase.auth.getUser()).data.user?.id ?? "" })
        .select("id, name, stage_name")
        .single();
      if (error) throw error;
      const newItem: ProducerRef = { type: "contact", id: data.id, name: data.stage_name || data.name };
      addItem(newItem);
      toggle(newItem);
      setSearch("");
      toast.success(`Productor "${trimmed}" creado`);
    } catch {
      toast.error("No se pudo crear el productor");
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className={cn("space-y-2", className)}>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            type="button"
            variant="outline"
            role="combobox"
            aria-expanded={open}
            className="h-9 w-full justify-between text-sm font-normal"
          >
            <span className="flex items-center gap-1.5 truncate text-muted-foreground">
              <User className="h-3.5 w-3.5 shrink-0" />
              {value.length === 0
                ? placeholder
                : `${value.length} seleccionado${value.length > 1 ? "s" : ""}`}
            </span>
            <ChevronsUpDown className="ml-1 h-3.5 w-3.5 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-72 p-0" align="start">
          <Command>
            <CommandInput
              placeholder="Buscar o crear..."
              className="h-9"
              value={search}
              onValueChange={setSearch}
            />
            <CommandList className="max-h-64" onWheel={(e) => e.stopPropagation()}>
              <CommandEmpty>
                {loading ? "Cargando..." : "Sin resultados"}
              </CommandEmpty>

              {showCreate && (
                <CommandGroup>
                  <CommandItem
                    value={`__create__${trimmed}`}
                    onSelect={handleCreate}
                    disabled={creating}
                    className="text-primary"
                  >
                    <Plus className="mr-2 h-4 w-4 shrink-0" />
                    <span>Crear &ldquo;{trimmed}&rdquo;</span>
                  </CommandItem>
                </CommandGroup>
              )}

              {grouped.perfiles.length > 0 && (
                <CommandGroup heading="Equipo del artista">
                  {grouped.perfiles.map((item) => (
                    <CommandItem
                      key={`profile:${item.id}`}
                      value={item.name}
                      onSelect={() => toggle(item)}
                    >
                      <Check className={cn("mr-2 h-4 w-4 shrink-0", isSelected(item) ? "opacity-100" : "opacity-0")} />
                      <span className="truncate">{item.name}</span>
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
                      onSelect={() => toggle(item)}
                    >
                      <Check className={cn("mr-2 h-4 w-4 shrink-0", isSelected(item) ? "opacity-100" : "opacity-0")} />
                      <span className="truncate">{item.name}</span>
                    </CommandItem>
                  ))}
                </CommandGroup>
              )}
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>

      {value.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {value.map((item) => (
            <Badge
              key={`${item.type}:${item.id}`}
              variant="secondary"
              className="flex items-center gap-1 pr-1 text-xs"
            >
              <span className="max-w-[120px] truncate">{item.name}</span>
              <button
                type="button"
                onClick={() => remove(item)}
                className="ml-0.5 rounded-sm hover:text-destructive transition-colors"
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Single-select variant ────────────────────────────────────────────────────

interface SingleProducerSelectorProps {
  value: ProducerRef | null;
  onChange: (value: ProducerRef | null) => void;
  artistId?: string | null;
  placeholder?: string;
  className?: string;
}

export function SingleProducerSelector({
  value,
  onChange,
  artistId,
  placeholder = "Seleccionar...",
  className,
}: SingleProducerSelectorProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [creating, setCreating] = useState(false);
  const { loading, grouped, addItem } = useProducerItems(open, artistId);

  const select = (item: ProducerRef) => {
    onChange(value?.type === item.type && value?.id === item.id ? null : item);
    setOpen(false);
  };

  const allItems = [...grouped.perfiles, ...grouped.contactos];
  const trimmed = search.trim();
  const nameExists = allItems.some(
    (i) => i.name.toLowerCase() === trimmed.toLowerCase()
  );
  const showCreate = trimmed.length > 1 && !nameExists && !loading;

  const handleCreate = async () => {
    if (!trimmed) return;
    setCreating(true);
    try {
      const { data, error } = await supabase
        .from("contacts")
        .insert({ name: trimmed, created_by: (await supabase.auth.getUser()).data.user?.id ?? "" })
        .select("id, name, stage_name")
        .single();
      if (error) throw error;
      const newItem: ProducerRef = { type: "contact", id: data.id, name: data.stage_name || data.name };
      addItem(newItem);
      select(newItem);
      setSearch("");
      toast.success(`Productor "${trimmed}" creado`);
    } catch {
      toast.error("No se pudo crear el productor");
    } finally {
      setCreating(false);
    }
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className={cn("h-8 w-full justify-between text-xs font-normal", className)}
        >
          <span className="flex items-center gap-1.5 truncate text-muted-foreground">
            <User className="h-3 w-3 shrink-0" />
            <span className="truncate">{value?.name || placeholder}</span>
          </span>
          <ChevronsUpDown className="ml-1 h-3 w-3 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-64 p-0" align="start">
        <Command>
          <CommandInput
            placeholder="Buscar o crear..."
            className="h-9"
            value={search}
            onValueChange={setSearch}
          />
          <CommandList className="max-h-56" onWheel={(e) => e.stopPropagation()}>
            <CommandEmpty>{loading ? "Cargando..." : "Sin resultados"}</CommandEmpty>

            {showCreate && (
              <CommandGroup>
                <CommandItem
                  value={`__create__${trimmed}`}
                  onSelect={handleCreate}
                  disabled={creating}
                  className="text-primary"
                >
                  <Plus className="mr-2 h-4 w-4 shrink-0" />
                  <span>Crear &ldquo;{trimmed}&rdquo;</span>
                </CommandItem>
              </CommandGroup>
            )}

            <CommandGroup heading="Acciones">
              <CommandItem value="sin_asignar" onSelect={() => { onChange(null); setOpen(false); }}>
                <span className="text-muted-foreground">Sin asignar</span>
                <Check className={cn("ml-auto h-4 w-4", !value ? "opacity-100" : "opacity-0")} />
              </CommandItem>
            </CommandGroup>

            {grouped.perfiles.length > 0 && (
              <CommandGroup heading="Equipo del artista">
                {grouped.perfiles.map((item) => (
                  <CommandItem key={`profile:${item.id}`} value={item.name} onSelect={() => select(item)}>
                    <Check className={cn("mr-2 h-4 w-4 shrink-0", value?.id === item.id ? "opacity-100" : "opacity-0")} />
                    <span className="truncate">{item.name}</span>
                  </CommandItem>
                ))}
              </CommandGroup>
            )}

            {grouped.contactos.length > 0 && (
              <CommandGroup heading="Contactos">
                {grouped.contactos.map((item) => (
                  <CommandItem key={`contact:${item.id}`} value={item.name} onSelect={() => select(item)}>
                    <Check className={cn("mr-2 h-4 w-4 shrink-0", value?.id === item.id ? "opacity-100" : "opacity-0")} />
                    <span className="truncate">{item.name}</span>
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
