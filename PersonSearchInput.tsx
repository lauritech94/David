import { useState, useRef, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { supabase } from '@/integrations/supabase/client';
import { User, Search } from 'lucide-react';

export interface PersonData {
  id: string;
  name: string;
  legal_name?: string | null;
  stage_name?: string | null;
  nif?: string | null;
  address?: string | null;
  email?: string | null;
  source: 'artist' | 'contact';
}

interface PersonSearchInputProps {
  value: string;
  onChange: (value: string) => void;
  onSelect: (person: PersonData) => void;
  placeholder?: string;
}

export function PersonSearchInput({ value, onChange, onSelect, placeholder }: PersonSearchInputProps) {
  const [open, setOpen] = useState(false);
  const [results, setResults] = useState<PersonData[]>([]);
  const [loading, setLoading] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<NodeJS.Timeout>();

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const search = async (query: string) => {
    if (query.length < 2) { setResults([]); setOpen(false); return; }
    setLoading(true);
    try {
      const [artistsRes, contactsRes] = await Promise.all([
        supabase.from('artists').select('id, name, legal_name, stage_name, nif, address, email').or(`name.ilike.%${query}%,legal_name.ilike.%${query}%,stage_name.ilike.%${query}%`).limit(5),
        supabase.from('contacts').select('id, name, legal_name, stage_name, address, email').or(`name.ilike.%${query}%,legal_name.ilike.%${query}%,stage_name.ilike.%${query}%`).limit(5),
      ]);
      const allItems: PersonData[] = [
        ...(artistsRes.data || []).map(a => ({ ...a, source: 'artist' as const })),
        ...(contactsRes.data || []).map(c => ({ ...c, nif: null, source: 'contact' as const })),
      ];
      // Deduplicate by (displayName + source), keep the one with most fields filled
      const deduped = new Map<string, PersonData>();
      for (const item of allItems) {
        const key = `${(item.legal_name || item.name || '').toLowerCase().trim()}|${item.source}`;
        const existing = deduped.get(key);
        if (!existing) { deduped.set(key, item); continue; }
        const score = (p: PersonData) => [p.nif, p.address, p.email, p.stage_name].filter(Boolean).length;
        if (score(item) > score(existing)) deduped.set(key, item);
      }
      const items = Array.from(deduped.values());
      setResults(items);
      setOpen(items.length > 0);
    } catch { setResults([]); }
    setLoading(false);
  };

  const handleChange = (val: string) => {
    onChange(val);
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => search(val), 300);
  };

  return (
    <div ref={containerRef} className="relative">
      <div className="relative">
        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
        <Input
          value={value}
          onChange={e => handleChange(e.target.value)}
          onFocus={() => { if (results.length > 0) setOpen(true); }}
          placeholder={placeholder || "Buscar o escribir nombre..."}
          className="pl-8"
        />
      </div>
      {open && (
        <div className="absolute z-50 w-full mt-1 bg-popover border rounded-md shadow-md max-h-48 overflow-y-auto">
          {results.map(person => (
            <button
              key={`${person.source}-${person.id}`}
              type="button"
              className="w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-accent text-left"
              onClick={() => { onSelect(person); setOpen(false); }}
            >
              <User className="h-4 w-4 shrink-0 text-muted-foreground" />
              <div className="flex flex-col min-w-0">
                <span className="truncate">{person.legal_name || person.name}</span>
                {person.stage_name && (
                  <span className="text-xs text-muted-foreground truncate">{person.stage_name}</span>
                )}
              </div>
              <span className="ml-auto text-xs text-muted-foreground shrink-0">
                {person.source === 'artist' ? 'Artista' : 'Contacto'}
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
