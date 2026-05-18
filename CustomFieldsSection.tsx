import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Plus, Trash2, Loader2, Puzzle } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { CustomField, FIELD_TYPE_OPTIONS } from '@/hooks/useCustomFields';

interface CustomFieldsSectionProps {
  fields: CustomField[];
  customData: Record<string, string>;
  onCustomDataChange: (key: string, value: string) => void;
  onCreateField?: (label: string, fieldType: string) => Promise<void>;
  onDeleteField?: (fieldId: string) => Promise<void>;
  isEditing?: boolean;
  isLoading?: boolean;
}

export function CustomFieldsSection({
  fields,
  customData,
  onCustomDataChange,
  onCreateField,
  onDeleteField,
  isEditing = true,
  isLoading = false,
}: CustomFieldsSectionProps) {
  const [showAddForm, setShowAddForm] = useState(false);
  const [newLabel, setNewLabel] = useState('');
  const [newType, setNewType] = useState('text');
  const [creating, setCreating] = useState(false);

  const handleAdd = async () => {
    const trimmed = newLabel.trim();
    if (!trimmed) {
      toast({ title: 'Error', description: 'El nombre del campo es obligatorio.', variant: 'destructive' });
      return;
    }
    if (trimmed.length > 100) {
      toast({ title: 'Error', description: 'El nombre no puede superar los 100 caracteres.', variant: 'destructive' });
      return;
    }
    if (!onCreateField) return;
    setCreating(true);
    try {
      await onCreateField(trimmed, newType);
      setNewLabel('');
      setNewType('text');
      setShowAddForm(false);
      toast({ title: 'Campo creado', description: `"${trimmed}" añadido correctamente.` });
    } catch {
      toast({ title: 'Error', description: 'No se pudo crear el campo.', variant: 'destructive' });
    } finally {
      setCreating(false);
    }
  };

  const handleDelete = async (field: CustomField) => {
    if (!onDeleteField) return;
    try {
      await onDeleteField(field.id);
      toast({ title: 'Campo eliminado', description: `"${field.label}" eliminado.` });
    } catch {
      toast({ title: 'Error', description: 'No se pudo eliminar.', variant: 'destructive' });
    }
  };

  const renderInput = (field: CustomField) => {
    const value = customData[field.field_key] || '';
    const onChange = (v: string) => onCustomDataChange(field.field_key, v);

    if (field.field_type === 'textarea') {
      return <Textarea value={value} onChange={(e) => onChange(e.target.value)} placeholder={field.label} rows={3} disabled={!isEditing} />;
    }
    const inputType = field.field_type === 'number' ? 'number' : field.field_type === 'date' ? 'date' : field.field_type === 'email' ? 'email' : field.field_type === 'url' ? 'url' : field.field_type === 'phone' ? 'tel' : 'text';
    return <Input type={inputType} value={value} onChange={(e) => onChange(e.target.value)} placeholder={field.label} disabled={!isEditing} />;
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="py-6 flex justify-center">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  if (fields.length === 0 && !onCreateField) return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Puzzle className="h-5 w-5" />
          Campos personalizados
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {fields.map((field) => (
          <div key={field.id} className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>{field.label}</Label>
              {onDeleteField && isEditing && (
                <Button variant="ghost" size="icon" className="h-6 w-6 text-muted-foreground hover:text-destructive" onClick={() => handleDelete(field)}>
                  <Trash2 className="h-3 w-3" />
                </Button>
              )}
            </div>
            {renderInput(field)}
          </div>
        ))}

        {fields.length === 0 && (
          <p className="text-sm text-muted-foreground text-center py-2">No hay campos personalizados aún.</p>
        )}

        {onCreateField && isEditing && (
          <>
            {showAddForm ? (
              <div className="border rounded-md p-3 space-y-3 bg-muted/30">
                <div className="space-y-2">
                  <Label>Nombre del campo</Label>
                  <Input value={newLabel} onChange={(e) => setNewLabel(e.target.value)} placeholder="Ej: DNI cónyuge" maxLength={100} />
                </div>
                <div className="space-y-2">
                  <Label>Tipo</Label>
                  <Select value={newType} onValueChange={setNewType}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {FIELD_TYPE_OPTIONS.map((opt) => (
                        <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex gap-2">
                  <Button size="sm" onClick={handleAdd} disabled={creating}>
                    {creating ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : null}
                    Crear
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => { setShowAddForm(false); setNewLabel(''); }}>
                    Cancelar
                  </Button>
                </div>
              </div>
            ) : (
              <Button variant="outline" size="sm" className="w-full" onClick={() => setShowAddForm(true)}>
                <Plus className="h-4 w-4 mr-2" />Añadir campo
              </Button>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
