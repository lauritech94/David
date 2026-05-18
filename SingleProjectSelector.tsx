import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Check, ChevronsUpDown, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";

interface Project {
  id: string;
  name: string;
}

interface SingleProjectSelectorProps {
  value: string | null;
  onValueChange: (value: string | null) => void;
  placeholder?: string;
  className?: string;
  artistId?: string | null;
  onlyFolders?: boolean;
  /**
   * Si es false, ignora `artistId` para el filtro de la query (mostrará todos
   * los proyectos del workspace). Por defecto true para mantener el comportamiento
   * existente en el resto de la app.
   */
  filterByArtist?: boolean;
}

export default function SingleProjectSelector({
  value,
  onValueChange,
  placeholder = "Selecciona un proyecto",
  className,
  artistId,
  onlyFolders = false,
  filterByArtist = true,
}: SingleProjectSelectorProps) {
  const [open, setOpen] = useState(false);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");

  const selectedName = useMemo(() => {
    return projects.find((p) => p.id === value)?.name;
  }, [projects, value]);

  useEffect(() => {
    if (!open) return;
    const fetchProjects = async () => {
      try {
        setLoading(true);
        let qb = supabase
          .from("projects")
          .select("id,name,is_folder")
          .order("created_at", { ascending: false })
          .limit(100);
        if (onlyFolders) qb = qb.eq("is_folder", true);
        if (filterByArtist && artistId) qb = qb.eq("artist_id", artistId as any);
        if (search) qb = qb.ilike("name", `%${search}%`);
        const { data, error } = await qb;
        if (error) throw error;
        setProjects((data as any[]) || []);
      } catch (e) {
        console.error("Error fetching projects", e);
      } finally {
        setLoading(false);
      }
    };
    fetchProjects();
  }, [open, artistId, search, onlyFolders, filterByArtist]);

  // Ensure we can display a selected project even if not in the current page of results
  useEffect(() => {
    const loadSelectedIfMissing = async () => {
      if (!value) return;
      const exists = projects.some((p) => p.id === value);
      if (exists) return;
      try {
        const { data } = await supabase.from("projects").select("id,name").eq("id", value).limit(1).single();
        if (data) setProjects((prev) => [...prev, data as Project]);
      } catch {}
    };
    loadSelectedIfMissing();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className={cn("w-full justify-between", className)}
       >
          {selectedName || placeholder}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[--radix-popover-trigger-width] p-0 z-50 bg-popover">
        <Command shouldFilter={false}>
          <div className="p-2">
            <CommandInput
              placeholder="Buscar proyecto..."
              value={search}
              onValueChange={setSearch}
            />
          </div>
          <CommandList className="max-h-64">
            {loading ? (
              <div className="flex items-center gap-2 p-3 text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" /> Cargando...
              </div>
            ) : (
              <>
                <CommandEmpty>No se encontraron proyectos.</CommandEmpty>
                <CommandGroup heading="Proyectos">
                  {projects.map((project) => (
                    <CommandItem
                      key={project.id}
                      value={project.name}
                      onSelect={() => {
                        onValueChange(project.id);
                        setOpen(false);
                      }}
                    >
                      <Check
                        className={cn(
                          "mr-2 h-4 w-4",
                          value === project.id ? "opacity-100" : "opacity-0"
                        )}
                      />
                      {project.name}
                    </CommandItem>
                  ))}
                </CommandGroup>
              </>
            )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
