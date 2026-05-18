import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Label } from '@/components/ui/label';
import { Settings2 } from 'lucide-react';

export interface ColumnConfig {
  id: string;
  label: string;
  visible: boolean;
  default: boolean;
}

const ALL_COLUMNS: ColumnConfig[] = [
  // Default visible columns
  { id: 'fecha', label: 'FECHA', visible: true, default: true },
  { id: 'festival_ciclo', label: 'FESTIVAL', visible: true, default: true },
  { id: 'ciudad', label: 'CIUDAD', visible: true, default: true },
  { id: 'lugar', label: 'LUGAR', visible: true, default: true },
  { id: 'estado', label: 'STATUS', visible: true, default: true },
  { id: 'fee', label: 'OFERTA', visible: true, default: true },
  { id: 'contratos', label: 'CONTRATO', visible: true, default: true },
  
  // Secondary columns (hidden by default)
  { id: 'hora', label: 'HORA', visible: false, default: false },
  { id: 'capacidad', label: 'CAPACIDAD', visible: false, default: false },
  { id: 'duracion', label: 'DURACIÓN', visible: false, default: false },
  { id: 'formato', label: 'FORMATO', visible: false, default: false },
  { id: 'pvp', label: 'PVP', visible: false, default: false },
  { id: 'contacto', label: 'CONTACTO', visible: false, default: false },
  { id: 'invitaciones', label: 'INVITACIONES', visible: false, default: false },
  { id: 'inicio_venta', label: 'INICIO VENTA', visible: false, default: false },
  { id: 'link_venta', label: 'LINK VENTA', visible: false, default: false },
  { id: 'publico', label: 'PÚBLICO', visible: false, default: false },
  { id: 'logistica', label: 'LOGÍSTICA', visible: false, default: false },
  { id: 'notas', label: 'COMENTARIOS', visible: false, default: false },
];

interface BookingTableColumnsProps {
  columns: ColumnConfig[];
  onColumnsChange: (columns: ColumnConfig[]) => void;
}

export function BookingTableColumns({ columns, onColumnsChange }: BookingTableColumnsProps) {
  const toggleColumn = (columnId: string) => {
    const newColumns = columns.map(col => 
      col.id === columnId ? { ...col, visible: !col.visible } : col
    );
    onColumnsChange(newColumns);
  };

  const resetToDefaults = () => {
    onColumnsChange(ALL_COLUMNS.map(col => ({ ...col, visible: col.default })));
  };

  const showAll = () => {
    onColumnsChange(columns.map(col => ({ ...col, visible: true })));
  };

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <Settings2 className="h-4 w-4" />
          Columnas
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-64" align="end">
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="font-medium text-sm">Columnas visibles</h4>
            <div className="flex gap-1">
              <Button variant="ghost" size="sm" onClick={resetToDefaults} className="h-7 text-xs">
                Reset
              </Button>
              <Button variant="ghost" size="sm" onClick={showAll} className="h-7 text-xs">
                Todas
              </Button>
            </div>
          </div>
          
          <div className="grid gap-2 max-h-64 overflow-y-auto">
            {columns.map((column) => (
              <div key={column.id} className="flex items-center space-x-2">
                <Checkbox
                  id={column.id}
                  checked={column.visible}
                  onCheckedChange={() => toggleColumn(column.id)}
                />
                <Label 
                  htmlFor={column.id} 
                  className="text-sm font-normal cursor-pointer flex-1"
                >
                  {column.label}
                </Label>
              </div>
            ))}
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}

export function useBookingColumns() {
  const [columns, setColumns] = useState<ColumnConfig[]>(
    ALL_COLUMNS.map(col => ({ ...col }))
  );

  return {
    columns,
    setColumns,
    visibleColumns: columns.filter(c => c.visible),
    getColumnVisibility: (id: string) => columns.find(c => c.id === id)?.visible ?? false,
  };
}

export { ALL_COLUMNS };
