import { useState, useEffect } from 'react';
import { Check, ChevronsUpDown, Plus } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { getStatusBadgeColor } from '@/lib/statusColors';

interface StatusOption {
  id: string;
  status_value: string;
  is_default: boolean;
}

interface BookingStatusComboboxProps {
  value: string;
  onValueChange: (value: string) => void;
  placeholder?: string;
}

export function BookingStatusCombobox({ 
  value, 
  onValueChange, 
  placeholder = "Selecciona estado..." 
}: BookingStatusComboboxProps) {
  const [open, setOpen] = useState(false);
  const [statusOptions, setStatusOptions] = useState<StatusOption[]>([]);
  const [newStatus, setNewStatus] = useState("");

  useEffect(() => {
    fetchStatusOptions();
  }, []);

  const fetchStatusOptions = async () => {
    try {
      const { data, error } = await supabase
        .from('booking_status_options')
        .select('*')
        .order('is_default', { ascending: false })
        .order('status_value');

      if (error) throw error;
      setStatusOptions(data || []);
    } catch (error) {
      console.error('Error fetching status options:', error);
    }
  };

  const addNewStatus = async (statusValue: string) => {
    if (!statusValue.trim()) return;

    try {
      const { error } = await supabase
        .from('booking_status_options')
        .insert([
          {
            status_value: statusValue.trim(),
            is_default: false,
            created_by: (await supabase.auth.getUser()).data.user?.id || '',
          }
        ]);

      if (error) throw error;

      toast({
        title: "Estado añadido",
        description: `"${statusValue}" se ha añadido como opción disponible.`,
      });

      await fetchStatusOptions();
      onValueChange(statusValue.trim());
      setNewStatus("");
      setOpen(false);
    } catch (error) {
      console.error('Error adding status:', error);
      toast({
        title: "Error",
        description: "No se pudo añadir el nuevo estado.",
        variant: "destructive",
      });
    }
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-full justify-between"
        >
          {value ? (
            <span className={`px-2 py-1 rounded-md text-xs border ${getStatusBadgeColor(value)}`}>
              {value}
            </span>
          ) : (
            placeholder
          )}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-full p-0 bg-background border shadow-md z-50">
        <Command>
          <CommandInput 
            placeholder="Buscar estado..." 
            value={newStatus}
            onValueChange={setNewStatus}
          />
          <CommandList>
            <CommandEmpty>
              {newStatus ? (
                <div className="flex flex-col items-center gap-2 p-2">
                  <span className="text-sm text-muted-foreground">
                    Estado no encontrado
                  </span>
                  <Button
                    size="sm"
                    onClick={() => addNewStatus(newStatus)}
                    className="flex items-center gap-2"
                  >
                    <Plus className="h-4 w-4" />
                    Añadir "{newStatus}"
                  </Button>
                </div>
              ) : (
                "No se encontraron estados."
              )}
            </CommandEmpty>
            <CommandGroup>
              {statusOptions.map((option) => (
                <CommandItem
                  key={option.id}
                  value={option.status_value}
                  onSelect={(currentValue) => {
                    onValueChange(currentValue === value ? "" : currentValue);
                    setOpen(false);
                  }}
                >
                  <Check
                    className={cn(
                      "mr-2 h-4 w-4",
                      value === option.status_value ? "opacity-100" : "opacity-0"
                    )}
                  />
                  <span className={`px-2 py-1 rounded-md text-xs border ${getStatusBadgeColor(option.status_value)}`}>
                    {option.status_value}
                  </span>
                  {option.is_default && (
                    <span className="ml-auto text-xs text-muted-foreground">
                      Por defecto
                    </span>
                  )}
                </CommandItem>
              ))}
            </CommandGroup>
            {newStatus && !statusOptions.find(opt => opt.status_value.toLowerCase() === newStatus.toLowerCase()) && (
              <CommandGroup>
                <CommandItem
                  onSelect={() => addNewStatus(newStatus)}
                  className="flex items-center gap-2"
                >
                  <Plus className="h-4 w-4" />
                  Añadir "{newStatus}"
                </CommandItem>
              </CommandGroup>
            )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}