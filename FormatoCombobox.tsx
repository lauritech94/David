import { useState, useEffect } from 'react';
import { Check, ChevronsUpDown } from 'lucide-react';
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
import { Input } from '@/components/ui/input';

interface FormatoComboboxProps {
  value: string;
  onValueChange: (value: string) => void;
  placeholder?: string;
}

const defaultFormatos = [
  'Dúo',
  'Trío', 
  'Quinteto',
  'Cuarteto',
  'Banda Completa',
  'Solo acústico',
  'Orquesta sinfónica'
];

export function FormatoCombobox({ 
  value, 
  onValueChange, 
  placeholder = "Ingresa formato..." 
}: FormatoComboboxProps) {
  const [open, setOpen] = useState(false);
  const [inputValue, setInputValue] = useState(value || '');

  useEffect(() => {
    setInputValue(value || '');
  }, [value]);

  const filteredFormatos = defaultFormatos.filter(formato =>
    formato.toLowerCase().includes(inputValue.toLowerCase())
  );

  const handleInputChange = (newValue: string) => {
    setInputValue(newValue);
    onValueChange(newValue);
  };

  const handleSelect = (selectedValue: string) => {
    setInputValue(selectedValue);
    onValueChange(selectedValue);
    setOpen(false);
  };

  return (
    <div className="relative">
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <div className="relative">
            <Input
              value={inputValue}
              onChange={(e) => handleInputChange(e.target.value)}
              placeholder={placeholder}
              className="pr-10"
            />
            <Button
              variant="ghost"
              size="sm"
              className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
              onClick={() => setOpen(!open)}
            >
              <ChevronsUpDown className="h-4 w-4 shrink-0 opacity-50" />
            </Button>
          </div>
        </PopoverTrigger>
        <PopoverContent className="w-full p-0 bg-background border shadow-md z-50" align="start">
          <Command>
            <CommandInput 
              placeholder="Buscar formato..." 
              value={inputValue}
              onValueChange={setInputValue}
            />
            <CommandList>
              <CommandEmpty>
                <div className="p-2 text-sm text-muted-foreground">
                  Escribe tu formato personalizado
                </div>
              </CommandEmpty>
              <CommandGroup heading="Formatos sugeridos">
                {filteredFormatos.map((formato) => (
                  <CommandItem
                    key={formato}
                    value={formato}
                    onSelect={() => handleSelect(formato)}
                  >
                    <Check
                      className={cn(
                        "mr-2 h-4 w-4",
                        value === formato ? "opacity-100" : "opacity-0"
                      )}
                    />
                    {formato}
                  </CommandItem>
                ))}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
    </div>
  );
}