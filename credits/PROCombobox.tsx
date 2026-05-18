import { useMemo, useState } from 'react';
import { Check, ChevronsUpDown, Globe, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from '@/components/ui/command';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import { DEFAULT_PROS, sortPROsByCountry, type ProEntry } from '@/lib/pros';
import { useCustomPros } from '@/hooks/useCustomPros';

interface PROComboboxProps {
  value: string;
  onValueChange: (value: string) => void;
  /** Workspace para almacenar sociedades personalizadas. */
  workspaceId?: string | null;
  /** País preferido (ISO-2) para priorizar sociedades sugeridas. */
  preferredCountry?: string | null;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
}

export function PROCombobox({
  value,
  onValueChange,
  workspaceId,
  preferredCountry,
  placeholder = 'Buscar o añadir sociedad…',
  className,
  disabled,
}: PROComboboxProps) {
  const [open, setOpen] = useState(false);
  const [showAdd, setShowAdd] = useState(false);
  const [newName, setNewName] = useState('');
  const [newCountry, setNewCountry] = useState('');
  const { data: customPros = [], create } = useCustomPros(workspaceId);

  const sortedDefaults = useMemo(
    () => sortPROsByCountry(DEFAULT_PROS, preferredCountry),
    [preferredCountry],
  );
  const sortedCustom = useMemo(
    () => sortPROsByCountry(customPros, preferredCountry),
    [customPros, preferredCountry],
  );

  const handleSelect = (name: string) => {
    onValueChange(name);
    setOpen(false);
  };

  const handleCreate = async () => {
    const name = newName.trim();
    if (!name) return;
    try {
      const created = await create.mutateAsync({
        name,
        country: newCountry.trim() || null,
      });
      onValueChange(created.name);
      setShowAdd(false);
      setNewName('');
      setNewCountry('');
      setOpen(false);
    } catch {
      // toast handled in hook
    }
  };

  const renderItem = (pro: ProEntry | (typeof customPros)[number], custom: boolean) => (
    <CommandItem
      key={`${custom ? 'c' : 'd'}-${'code' in pro ? pro.code : pro.id}-${pro.name}`}
      value={pro.name}
      onSelect={() => handleSelect(pro.name)}
      className="cursor-pointer"
    >
      <Check
        className={cn(
          'mr-2 h-4 w-4',
          value.toLowerCase() === pro.name.toLowerCase() ? 'opacity-100' : 'opacity-0',
        )}
      />
      <span className="flex-1">{pro.name}</span>
      {pro.country && (
        <span className="ml-2 text-[10px] uppercase tracking-wide text-muted-foreground">
          {pro.country}
        </span>
      )}
    </CommandItem>
  );

  return (
    <>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            type="button"
            variant="outline"
            role="combobox"
            disabled={disabled}
            className={cn('w-full justify-between font-normal', !value && 'text-muted-foreground', className)}
          >
            <span className="flex items-center gap-2 truncate">
              <Globe className="h-3.5 w-3.5 shrink-0" />
              {value || placeholder}
            </span>
            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[320px] p-0" align="start">
          <Command>
            <CommandInput placeholder="Buscar sociedad…" />
            <CommandList className="max-h-[280px]">
              <CommandEmpty>No se encontraron coincidencias.</CommandEmpty>
              {sortedCustom.length > 0 && (
                <>
                  <CommandGroup heading="Personalizadas del workspace">
                    {sortedCustom.map((p) => renderItem(p, true))}
                  </CommandGroup>
                  <CommandSeparator />
                </>
              )}
              <CommandGroup heading="Sociedades habituales">
                {sortedDefaults.map((p) => renderItem(p, false))}
              </CommandGroup>
              <CommandSeparator />
              <CommandGroup>
                <CommandItem
                  value="__add_new_pro__"
                  onSelect={() => {
                    setShowAdd(true);
                    setOpen(false);
                  }}
                  className="cursor-pointer text-primary"
                >
                  <Plus className="mr-2 h-4 w-4" />
                  Añadir nueva sociedad…
                </CommandItem>
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>

      <Dialog open={showAdd} onOpenChange={setShowAdd}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Nueva sociedad de gestión</DialogTitle>
            <DialogDescription>
              Quedará registrada en este workspace para futuros créditos.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor="new-pro-name">Nombre *</Label>
              <Input
                id="new-pro-name"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="Ej: AGADU, COMPASS…"
                maxLength={100}
                autoFocus
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="new-pro-country">País (ISO-2, opcional)</Label>
              <Input
                id="new-pro-country"
                value={newCountry}
                onChange={(e) => setNewCountry(e.target.value.toUpperCase())}
                placeholder="ES, US, MX…"
                maxLength={2}
                className="uppercase"
              />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setShowAdd(false)}>
              Cancelar
            </Button>
            <Button type="button" onClick={handleCreate} disabled={!newName.trim() || create.isPending}>
              {create.isPending ? 'Guardando…' : 'Añadir'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
