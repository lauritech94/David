import { useState } from 'react';
import { Check, ChevronsUpDown, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import { OFFER_TYPES } from '@/lib/booking/offerTypes';

interface OfferTypeComboboxProps {
  value: string | null | undefined;
  onChange: (value: string | null) => void;
  placeholder?: string;
}

export function OfferTypeCombobox({
  value,
  onChange,
  placeholder = 'Selecciona o escribe…',
}: OfferTypeComboboxProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');

  const select = (v: string) => {
    const trimmed = v.trim();
    onChange(trimmed === '' ? null : trimmed);
    setSearch('');
    setOpen(false);
  };

  const trimmedSearch = search.trim();
  const matchesPredefined = OFFER_TYPES.some(
    (o) => o.value.toLowerCase() === trimmedSearch.toLowerCase()
  );
  const showCustomOption = trimmedSearch !== '' && !matchesPredefined;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-full justify-between font-normal"
        >
          <span className={cn('truncate', !value && 'text-muted-foreground')}>
            {value || placeholder}
          </span>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
        <Command>
          <CommandInput
            placeholder="Buscar tipo de oferta…"
            value={search}
            onValueChange={setSearch}
          />
          <CommandList>
            <CommandEmpty>
              {trimmedSearch
                ? 'Pulsa "Usar" abajo para crear esta opción'
                : 'No hay coincidencias'}
            </CommandEmpty>
            <CommandGroup>
              {OFFER_TYPES.map((opt) => (
                <CommandItem
                  key={opt.value}
                  value={opt.value}
                  onSelect={() => select(opt.value)}
                  className="flex items-start gap-2"
                >
                  <Check
                    className={cn(
                      'mt-0.5 h-4 w-4 shrink-0',
                      value === opt.value ? 'opacity-100' : 'opacity-0'
                    )}
                  />
                  <div className="flex flex-col">
                    <span className="font-medium">{opt.value}</span>
                    <span className="text-xs text-muted-foreground">
                      {opt.description}
                    </span>
                  </div>
                </CommandItem>
              ))}
              {showCustomOption && (
                <CommandItem
                  value={`__custom__${trimmedSearch}`}
                  onSelect={() => select(trimmedSearch)}
                  className="flex items-center gap-2 border-t mt-1 pt-2"
                >
                  <Plus className="h-4 w-4 shrink-0 text-primary" />
                  <span>
                    Usar <strong>"{trimmedSearch}"</strong>
                  </span>
                </CommandItem>
              )}
              {value && (
                <CommandItem
                  value="__clear__"
                  onSelect={() => select('')}
                  className="text-xs text-muted-foreground border-t mt-1 pt-2"
                >
                  Limpiar selección
                </CommandItem>
              )}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
