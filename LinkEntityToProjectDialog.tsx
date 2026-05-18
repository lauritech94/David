import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { ArrowLeft, Search, Link, Loader2 } from 'lucide-react';

const ENTITY_TYPES = [
  { type: 'show', emoji: '🎤', label: 'Show', table: 'budgets', nameField: 'name', statusField: 'show_status', dateField: 'event_date' },
  { type: 'release', emoji: '💿', label: 'Release', table: 'releases', nameField: 'title', statusField: 'status', dateField: 'release_date' },
  { type: 'sync', emoji: '🎬', label: 'Sincronización', table: 'sync_offers', nameField: 'production_title', statusField: 'phase', dateField: 'deadline' },
  { type: 'videoclip', emoji: '🎥', label: 'Videoclip', table: null, nameField: null, statusField: null, dateField: null },
  { type: 'prensa', emoji: '📰', label: 'Prensa', table: null, nameField: null, statusField: null, dateField: null },
  { type: 'merch', emoji: '👕', label: 'Merch', table: null, nameField: null, statusField: null, dateField: null },
] as const;

type EntityType = typeof ENTITY_TYPES[number];

interface LinkEntityToProjectDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectId: string;
  artistId?: string | null;
  userId: string;
  onLinked: () => void;
}

interface SearchResult {
  id: string;
  name: string;
  status?: string | null;
  date?: string | null;
}

export function LinkEntityToProjectDialog({
  open,
  onOpenChange,
  projectId,
  artistId,
  userId,
  onLinked,
}: LinkEntityToProjectDialogProps) {
  const [step, setStep] = useState<1 | 2>(1);
  const [selectedType, setSelectedType] = useState<EntityType | null>(null);
  const [search, setSearch] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [linking, setLinking] = useState<string | null>(null);
  // For free entities
  const [freeName, setFreeName] = useState('');

  useEffect(() => {
    if (!open) {
      setStep(1);
      setSelectedType(null);
      setSearch('');
      setResults([]);
      setFreeName('');
    }
  }, [open]);

  useEffect(() => {
    if (step !== 2 || !selectedType?.table) return;
    const fetchEntities = async () => {
      setLoading(true);
      try {
        const t = selectedType;
        let query = supabase.from(t.table as any).select('id, ' + [t.nameField, t.statusField, t.dateField].filter(Boolean).join(', '));
        
        if (artistId) {
          query = query.eq('artist_id', artistId);
        }
        
        const { data, error } = await query.order('created_at', { ascending: false }).limit(50);
        if (error) throw error;
        
        setResults((data || []).map((d: any) => ({
          id: d.id,
          name: d[t.nameField!] || 'Sin nombre',
          status: t.statusField ? d[t.statusField] : null,
          date: t.dateField ? d[t.dateField] : null,
        })));
      } catch (e) {
        console.error('Error fetching entities:', e);
      } finally {
        setLoading(false);
      }
    };
    fetchEntities();
  }, [step, selectedType, artistId]);

  const filteredResults = results.filter(r =>
    r.name.toLowerCase().includes(search.toLowerCase())
  );

  const handleLink = async (entityId: string | null, entityName: string, entityStatus?: string | null, entityDate?: string | null) => {
    if (!selectedType) return;
    setLinking(entityId || 'free');
    try {
      const { error } = await supabase.from('project_linked_entities' as any).insert({
        project_id: projectId,
        entity_type: selectedType.type,
        entity_id: entityId,
        entity_name: entityName,
        entity_status: entityStatus || null,
        entity_date: entityDate || null,
        linked_by: userId,
      });
      if (error) throw error;
      toast({ title: `${selectedType.label} vinculado al proyecto` });
      onLinked();
      onOpenChange(false);
    } catch (e: any) {
      if (e?.code === '23505') {
        toast({ title: 'Ya vinculado', description: 'Esta entidad ya está vinculada al proyecto', variant: 'destructive' });
      } else {
        console.error(e);
        toast({ title: 'Error', variant: 'destructive' });
      }
    } finally {
      setLinking(null);
    }
  };

  const isFreeType = selectedType && !selectedType.table;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Link className="w-5 h-5" />
            Vincular entidad al proyecto
          </DialogTitle>
        </DialogHeader>

        {step === 1 && (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 pt-2">
            {ENTITY_TYPES.map((et) => (
              <button
                key={et.type}
                className="flex flex-col items-center gap-2 p-4 rounded-lg border bg-card hover:bg-accent/50 hover:border-primary/50 transition-all cursor-pointer text-center"
                onClick={() => { setSelectedType(et); setStep(2); }}
              >
                <span className="text-2xl">{et.emoji}</span>
                <span className="text-sm font-medium text-foreground">{et.label}</span>
              </button>
            ))}
          </div>
        )}

        {step === 2 && selectedType && (
          <div className="space-y-4 pt-2">
            <Button variant="ghost" size="sm" onClick={() => { setStep(1); setSearch(''); setResults([]); setFreeName(''); }}>
              <ArrowLeft className="w-4 h-4 mr-1" />
              Cambiar tipo
            </Button>

            <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
              <span className="text-lg">{selectedType.emoji}</span>
              Vincular {selectedType.label}
            </div>

            {isFreeType ? (
              /* Free entity: just a name input */
              <div className="space-y-3">
                <Input
                  placeholder={`Nombre del ${selectedType.label.toLowerCase()}...`}
                  value={freeName}
                  onChange={(e) => setFreeName(e.target.value)}
                />
                <Button
                  className="w-full"
                  disabled={!freeName.trim() || linking === 'free'}
                  onClick={() => handleLink(null, freeName.trim())}
                >
                  {linking === 'free' ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Link className="w-4 h-4 mr-2" />}
                  Vincular al proyecto
                </Button>
              </div>
            ) : (
              /* DB entity: search + select */
              <>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    placeholder="Buscar..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="pl-9"
                  />
                </div>

                <div className="max-h-[300px] overflow-y-auto space-y-1">
                  {loading ? (
                    <div className="flex items-center justify-center py-8">
                      <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
                    </div>
                  ) : filteredResults.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-8">
                      {search ? 'Sin resultados' : 'No hay entidades disponibles'}
                    </p>
                  ) : (
                    filteredResults.map((r) => (
                      <div
                        key={r.id}
                        className="flex items-center justify-between p-3 rounded-lg border hover:bg-accent/50 transition-colors"
                      >
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium text-foreground truncate">{r.name}</p>
                          <div className="flex items-center gap-2 mt-0.5">
                            {r.date && (
                              <span className="text-xs text-muted-foreground">
                                {new Date(r.date).toLocaleDateString('es-ES')}
                              </span>
                            )}
                            {r.status && (
                              <Badge variant="outline" className="text-xs h-5">{r.status}</Badge>
                            )}
                          </div>
                        </div>
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={linking === r.id}
                          onClick={() => handleLink(r.id, r.name, r.status, r.date)}
                        >
                          {linking === r.id ? <Loader2 className="w-3 h-3 animate-spin" /> : 'Vincular'}
                        </Button>
                      </div>
                    ))
                  )}
                </div>
              </>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
