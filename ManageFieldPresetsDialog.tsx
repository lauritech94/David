import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import {
  FIELD_PRESETS,
  FieldConfig,
  getCustomPresets,
  saveCustomPreset,
  deleteCustomPreset,
  reorderCustomPresets,
  isSystemPreset,
} from '@/lib/fieldConfigPresets';
import { Lock, GripVertical, Trash2, Plus } from 'lucide-react';
import { toast } from '@/hooks/use-toast';

interface ManageFieldPresetsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentFieldConfig: FieldConfig;
  onPresetsChanged: () => void;
}

export function ManageFieldPresetsDialog({
  open,
  onOpenChange,
  currentFieldConfig,
  onPresetsChanged,
}: ManageFieldPresetsDialogProps) {
  const [newPresetName, setNewPresetName] = useState('');
  const [customPresets, setCustomPresets] = useState(() => getCustomPresets());
  const [draggedKey, setDraggedKey] = useState<string | null>(null);

  const customKeys = Object.keys(customPresets);

  const handleSaveNew = () => {
    if (!newPresetName.trim()) return;
    saveCustomPreset(newPresetName.trim(), currentFieldConfig);
    setCustomPresets(getCustomPresets());
    setNewPresetName('');
    onPresetsChanged();
    toast({ title: 'Plantilla guardada', description: `"${newPresetName.trim()}" creada correctamente.` });
  };

  const handleDelete = (key: string) => {
    const label = customPresets[key]?.label;
    deleteCustomPreset(key);
    setCustomPresets(getCustomPresets());
    onPresetsChanged();
    toast({ title: 'Plantilla eliminada', description: `"${label}" eliminada.` });
  };

  const handleDragStart = (key: string) => {
    setDraggedKey(key);
  };

  const handleDragOver = (e: React.DragEvent, targetKey: string) => {
    e.preventDefault();
    if (!draggedKey || draggedKey === targetKey) return;

    const keys = [...customKeys];
    const fromIdx = keys.indexOf(draggedKey);
    const toIdx = keys.indexOf(targetKey);
    if (fromIdx === -1 || toIdx === -1) return;

    keys.splice(fromIdx, 1);
    keys.splice(toIdx, 0, draggedKey);

    reorderCustomPresets(keys);
    setCustomPresets(getCustomPresets());
    onPresetsChanged();
  };

  const handleDragEnd = () => {
    setDraggedKey(null);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Gestionar Plantillas</DialogTitle>
        </DialogHeader>

        {/* Save current as new */}
        <div className="space-y-2">
          <Label className="text-sm font-medium">Guardar configuración actual como nueva plantilla</Label>
          <div className="flex gap-2">
            <Input
              value={newPresetName}
              onChange={(e) => setNewPresetName(e.target.value)}
              placeholder="Nombre de la plantilla"
              className="h-9 text-sm"
              onKeyDown={(e) => e.key === 'Enter' && handleSaveNew()}
            />
            <Button size="sm" className="h-9 px-3" onClick={handleSaveNew} disabled={!newPresetName.trim()}>
              <Plus className="w-4 h-4 mr-1" />
              Guardar
            </Button>
          </div>
        </div>

        <Separator />

        {/* System presets */}
        <div className="space-y-1">
          <Label className="text-xs text-muted-foreground uppercase tracking-wider">Plantillas del sistema</Label>
          <div className="space-y-1">
            {Object.entries(FIELD_PRESETS).map(([key, preset]) => (
              <div
                key={key}
                className="flex items-center gap-2 px-3 py-2 rounded-md bg-muted/40 text-sm"
              >
                <Lock className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                <span className="flex-1">{preset.label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Custom presets */}
        {customKeys.length > 0 && (
          <>
            <Separator />
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground uppercase tracking-wider">Plantillas personalizadas</Label>
              <div className="space-y-1">
                {customKeys.map((key) => (
                  <div
                    key={key}
                    draggable
                    onDragStart={() => handleDragStart(key)}
                    onDragOver={(e) => handleDragOver(e, key)}
                    onDragEnd={handleDragEnd}
                    className={`flex items-center gap-2 px-3 py-2 rounded-md border text-sm transition-colors ${
                      draggedKey === key ? 'opacity-50 border-primary bg-primary/5' : 'bg-background border-border hover:bg-muted/30'
                    }`}
                  >
                    <GripVertical className="w-4 h-4 text-muted-foreground cursor-grab shrink-0" />
                    <span className="flex-1">{customPresets[key]?.label}</span>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-7 w-7 p-0 text-destructive hover:text-destructive hover:bg-destructive/10"
                      onClick={() => handleDelete(key)}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cerrar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
