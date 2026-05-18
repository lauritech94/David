import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Command, CommandEmpty, CommandGroup, CommandItem, CommandList } from '@/components/ui/command';
import { Search, FileText, User, Calendar, DollarSign } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';
import { Badge } from '@/components/ui/badge';
import { useKeyboardShortcuts } from '@/hooks/useKeyboardShortcuts';

interface SearchResult {
  id: string;
  title: string;
  description: string;
  type: 'budget' | 'offer' | 'project' | 'artist';
  route: string;
  metadata?: string;
}

interface GlobalSearchDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function GlobalSearchDialog({ open, onOpenChange }: GlobalSearchDialogProps) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSearch = async (searchQuery: string) => {
    if (!searchQuery.trim()) {
      setResults([]);
      return;
    }

    setLoading(true);
    try {
      const [budgetsResponse, offersResponse] = await Promise.all([
        supabase
          .from('budgets')
          .select('id, name, venue, city, type, artists(name)')
          .or(`name.ilike.%${searchQuery}%, venue.ilike.%${searchQuery}%, city.ilike.%${searchQuery}%`)
          .limit(5),
        supabase
          .from('booking_offers')
          .select('id, venue, promotor, ciudad, pais, fee')
          .or(`venue.ilike.%${searchQuery}%, promotor.ilike.%${searchQuery}%, ciudad.ilike.%${searchQuery}%`)
          .limit(5)
      ]);

      const searchResults: SearchResult[] = [];

      // Add budget results
      if (budgetsResponse.data) {
        budgetsResponse.data.forEach(budget => {
          searchResults.push({
            id: budget.id,
            title: budget.name,
            description: `${budget.venue || 'Sin venue'} - ${budget.city || 'Sin ciudad'}`,
            type: 'budget',
            route: `/budgets?budget=${budget.id}`,
            metadata: budget.type
          });
        });
      }

      // Add booking offer results
      if (offersResponse.data) {
        offersResponse.data.forEach(offer => {
          searchResults.push({
            id: offer.id,
            title: offer.venue || 'Sin venue',
            description: `${offer.promotor || 'Sin promotor'} - ${offer.ciudad || 'Sin ciudad'}`,
            type: 'offer',
            route: `/booking?offer=${offer.id}`,
            metadata: offer.fee ? `€${offer.fee.toLocaleString()}` : undefined
          });
        });
      }

      setResults(searchResults);
    } catch (error) {
      console.error('Error searching:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const debounced = setTimeout(() => {
      handleSearch(query);
    }, 300);

    return () => clearTimeout(debounced);
  }, [query]);

  const handleSelect = (result: SearchResult) => {
    navigate(result.route);
    onOpenChange(false);
    setQuery('');
  };

  const getIcon = (type: string) => {
    switch (type) {
      case 'budget': return <DollarSign className="h-4 w-4" />;
      case 'offer': return <Calendar className="h-4 w-4" />;
      case 'project': return <FileText className="h-4 w-4" />;
      case 'artist': return <User className="h-4 w-4" />;
      default: return <Search className="h-4 w-4" />;
    }
  };

  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'budget': return 'Presupuesto';
      case 'offer': return 'Oferta';
      case 'project': return 'Proyecto';
      case 'artist': return 'Artista';
      default: return 'Resultado';
    }
  };

  useKeyboardShortcuts([
    {
      key: 'Escape',
      callback: () => onOpenChange(false)
    }
  ]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Search className="h-5 w-5" />
            Búsqueda Global
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar presupuestos, ofertas, proyectos..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="pl-10"
              autoFocus
            />
          </div>

          <Command className="border rounded-lg">
            <CommandList>
              {loading ? (
                <div className="p-4 text-center text-sm text-muted-foreground">
                  Buscando...
                </div>
              ) : results.length === 0 && query ? (
                <CommandEmpty>No se encontraron resultados.</CommandEmpty>
              ) : (
                <CommandGroup>
                  {results.map((result) => (
                    <CommandItem
                      key={`${result.type}-${result.id}`}
                      onSelect={() => handleSelect(result)}
                      className="flex items-center gap-3 p-3 cursor-pointer"
                    >
                      <div className="flex items-center gap-2">
                        {getIcon(result.type)}
                        <Badge variant="outline" className="text-xs">
                          {getTypeLabel(result.type)}
                        </Badge>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-medium truncate">{result.title}</div>
                        <div className="text-sm text-muted-foreground truncate">
                          {result.description}
                        </div>
                      </div>
                      {result.metadata && (
                        <Badge variant="secondary" className="text-xs">
                          {result.metadata}
                        </Badge>
                      )}
                    </CommandItem>
                  ))}
                </CommandGroup>
              )}
            </CommandList>
          </Command>

          <div className="text-xs text-muted-foreground text-center">
            Usa <kbd className="px-1 py-0.5 bg-muted rounded text-xs">⌘K</kbd> o <kbd className="px-1 py-0.5 bg-muted rounded text-xs">Ctrl+K</kbd> para abrir búsqueda
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}