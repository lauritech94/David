import { useEffect, useState, useCallback, useRef } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Plus, Trash2, FileText, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { cn } from "@/lib/utils";

interface ProjectNote {
  id: string;
  project_id: string;
  title: string;
  content: string;
  created_by: string | null;
  updated_by: string | null;
  created_at: string;
  updated_at: string;
}

interface Props {
  projectId: string;
  userId?: string | null;
}

export function ProjectNotesTab({ projectId, userId }: Props) {
  const [notes, setNotes] = useState<ProjectNote[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [draft, setDraft] = useState<{ title: string; content: string }>({ title: "", content: "" });
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("project_notes")
      .select("*")
      .eq("project_id", projectId)
      .order("updated_at", { ascending: false });
    if (error) {
      console.error("Error loading notes", error);
      toast({ title: "Error", description: "No se pudieron cargar las notas.", variant: "destructive" });
    } else {
      setNotes(data || []);
      if (data && data.length > 0 && !activeId) {
        setActiveId(data[0].id);
        setDraft({ title: data[0].title, content: data[0].content });
      }
    }
    setLoading(false);
  }, [projectId]); // eslint-disable-line

  useEffect(() => { load(); }, [load]);

  // Realtime sync
  useEffect(() => {
    const channel = supabase
      .channel(`project_notes:${projectId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "project_notes", filter: `project_id=eq.${projectId}` },
        () => { load(); }
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [projectId, load]);

  const activeNote = notes.find((n) => n.id === activeId) || null;

  // Sync draft when active note changes externally
  useEffect(() => {
    if (activeNote) {
      setDraft({ title: activeNote.title, content: activeNote.content });
    }
  }, [activeId]); // eslint-disable-line

  const persist = useCallback(async (next: { title: string; content: string }) => {
    if (!activeId) return;
    setSaving(true);
    const { error } = await supabase
      .from("project_notes")
      .update({ title: next.title, content: next.content, updated_by: userId || null })
      .eq("id", activeId);
    setSaving(false);
    if (error) {
      toast({ title: "Error guardando", description: error.message, variant: "destructive" });
    }
  }, [activeId, userId]);

  const handleChange = (field: "title" | "content", value: string) => {
    const next = { ...draft, [field]: value };
    setDraft(next);
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => persist(next), 700);
  };

  const createNote = async () => {
    const { data, error } = await supabase
      .from("project_notes")
      .insert({
        project_id: projectId,
        title: "Nueva nota",
        content: "",
        created_by: userId || null,
        updated_by: userId || null,
      })
      .select()
      .single();
    if (error) {
      toast({ title: "Error", description: "No se pudo crear la nota.", variant: "destructive" });
      return;
    }
    if (data) {
      setNotes((prev) => [data as ProjectNote, ...prev]);
      setActiveId(data.id);
      setDraft({ title: data.title, content: data.content });
    }
  };

  const deleteNote = async (id: string) => {
    if (!confirm("¿Eliminar esta nota?")) return;
    const { error } = await supabase.from("project_notes").delete().eq("id", id);
    if (error) {
      toast({ title: "Error", description: "No se pudo eliminar.", variant: "destructive" });
      return;
    }
    setNotes((prev) => prev.filter((n) => n.id !== id));
    if (activeId === id) {
      setActiveId(null);
      setDraft({ title: "", content: "" });
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16 text-muted-foreground">
        <Loader2 className="w-5 h-5 mr-2 animate-spin" /> Cargando notas...
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-[260px_1fr] gap-4 min-h-[500px]">
      {/* Sidebar list */}
      <Card>
        <CardContent className="p-3 space-y-2">
          <Button onClick={createNote} className="w-full" size="sm">
            <Plus className="w-4 h-4 mr-2" /> Nueva nota
          </Button>
          <div className="space-y-1 max-h-[600px] overflow-y-auto">
            {notes.length === 0 ? (
              <p className="text-xs text-muted-foreground text-center py-6">
                Aún no hay notas. Crea la primera.
              </p>
            ) : (
              notes.map((n) => (
                <button
                  key={n.id}
                  onClick={() => setActiveId(n.id)}
                  className={cn(
                    "w-full text-left p-2 rounded-md border text-sm hover:bg-muted transition",
                    activeId === n.id ? "bg-muted border-primary/40" : "border-transparent"
                  )}
                >
                  <div className="font-medium truncate">{n.title || "Sin título"}</div>
                  <div className="text-[10px] text-muted-foreground mt-0.5">
                    {format(new Date(n.updated_at), "d MMM HH:mm", { locale: es })}
                  </div>
                </button>
              ))
            )}
          </div>
        </CardContent>
      </Card>

      {/* Editor */}
      <Card>
        <CardContent className="p-4 space-y-3">
          {!activeNote ? (
            <div className="text-center py-16 text-muted-foreground">
              <FileText className="w-10 h-10 mx-auto mb-3 opacity-40" />
              <p className="text-sm">Selecciona o crea una nota para empezar a editar.</p>
            </div>
          ) : (
            <>
              <div className="flex items-center gap-2">
                <Input
                  value={draft.title}
                  onChange={(e) => handleChange("title", e.target.value)}
                  placeholder="Título de la nota"
                  className="text-lg font-semibold border-0 px-0 focus-visible:ring-0"
                />
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => deleteNote(activeNote.id)}
                  title="Eliminar nota"
                >
                  <Trash2 className="w-4 h-4 text-destructive" />
                </Button>
              </div>
              <Textarea
                value={draft.content}
                onChange={(e) => handleChange("content", e.target.value)}
                placeholder="Escribe aquí. Los cambios se guardan automáticamente y se sincronizan en tiempo real con tu equipo..."
                className="min-h-[460px] resize-none border-0 px-0 focus-visible:ring-0"
              />
              <div className="flex items-center justify-between text-xs text-muted-foreground border-t pt-2">
                <span>
                  Actualizado {format(new Date(activeNote.updated_at), "d MMM yyyy HH:mm", { locale: es })}
                </span>
                <span>{saving ? "Guardando..." : "Guardado ✓"}</span>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
