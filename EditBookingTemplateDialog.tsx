import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Plus, Trash2, GripVertical } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from '@/hooks/use-toast';

interface TemplateField {
  id: string;
  field_name: string;
  field_label: string;
  field_type: string;
  field_order: number;
  is_required: boolean;
  is_active: boolean;
}

interface EditBookingTemplateDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onTemplateUpdated: () => void;
}

export function EditBookingTemplateDialog({ 
  open, 
  onOpenChange, 
  onTemplateUpdated 
}: EditBookingTemplateDialogProps) {
  const { profile } = useAuth();
  const [fields, setFields] = useState<TemplateField[]>([]);
  const [loading, setLoading] = useState(false);
  const [newField, setNewField] = useState({
    field_name: '',
    field_label: '',
    field_type: 'text',
    is_required: false,
  });

  useEffect(() => {
    if (open) {
      fetchFields();
    }
  }, [open]);

  const fetchFields = async () => {
    try {
      const { data, error } = await supabase
        .from('booking_template_config')
        .select('*')
        .order('field_order');

      if (error) throw error;
      setFields(data || []);
    } catch (error) {
      console.error('Error fetching fields:', error);
    }
  };

  const handleSave = async () => {
    setLoading(true);
    try {
      // Update existing fields
      const updates = fields.map((field, index) => ({
        ...field,
        field_order: index + 1,
      }));

      for (const field of updates) {
        const { error } = await supabase
          .from('booking_template_config')
          .update({
            field_label: field.field_label,
            field_type: field.field_type,
            field_order: field.field_order,
            is_required: field.is_required,
            is_active: field.is_active,
          })
          .eq('id', field.id);

        if (error) throw error;
      }

      toast({
        title: "Plantilla actualizada",
        description: "Los cambios se han guardado correctamente.",
      });

      onTemplateUpdated();
      onOpenChange(false);
    } catch (error) {
      console.error('Error updating template:', error);
      toast({
        title: "Error",
        description: "No se pudo actualizar la plantilla.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleAddField = async () => {
    if (!newField.field_name || !newField.field_label) {
      toast({
        title: "Error",
        description: "El nombre del campo y la etiqueta son obligatorios.",
        variant: "destructive",
      });
      return;
    }

    try {
      const { data, error } = await supabase
        .from('booking_template_config')
        .insert([{
          ...newField,
          field_order: fields.length + 1,
          created_by: profile?.user_id,
        }])
        .select()
        .single();

      if (error) throw error;

      setFields([...fields, data]);
      setNewField({
        field_name: '',
        field_label: '',
        field_type: 'text',
        is_required: false,
      });

      toast({
        title: "Campo agregado",
        description: "El nuevo campo se ha agregado correctamente.",
      });
    } catch (error) {
      console.error('Error adding field:', error);
      toast({
        title: "Error",
        description: "No se pudo agregar el campo.",
        variant: "destructive",
      });
    }
  };

  const handleDeleteField = async (fieldId: string) => {
    try {
      const { error } = await supabase
        .from('booking_template_config')
        .delete()
        .eq('id', fieldId);

      if (error) throw error;

      setFields(fields.filter(f => f.id !== fieldId));

      toast({
        title: "Campo eliminado",
        description: "El campo se ha eliminado correctamente.",
      });
    } catch (error) {
      console.error('Error deleting field:', error);
      toast({
        title: "Error",
        description: "No se pudo eliminar el campo.",
        variant: "destructive",
      });
    }
  };

  const updateField = (index: number, updates: Partial<TemplateField>) => {
    const newFields = [...fields];
    newFields[index] = { ...newFields[index], ...updates };
    setFields(newFields);
  };

  const fieldTypes = [
    { value: 'text', label: 'Texto' },
    { value: 'textarea', label: 'Área de texto' },
    { value: 'number', label: 'Número' },
    { value: 'date', label: 'Fecha' },
    { value: 'url', label: 'URL' },
    { value: 'select', label: 'Lista desplegable' },
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Editar Plantilla de Booking</DialogTitle>
          <DialogDescription>
            Personaliza los campos de la plantilla de ofertas de booking
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Existing Fields */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Campos Actuales</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12"></TableHead>
                    <TableHead>Nombre del Campo</TableHead>
                    <TableHead>Etiqueta</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Requerido</TableHead>
                    <TableHead>Activo</TableHead>
                    <TableHead className="w-20">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {fields.map((field, index) => (
                    <TableRow key={field.id}>
                      <TableCell>
                        <GripVertical className="h-4 w-4 text-muted-foreground" />
                      </TableCell>
                      <TableCell>
                        <Input
                          value={field.field_name}
                          onChange={(e) => updateField(index, { field_name: e.target.value })}
                          className="min-w-32"
                        />
                      </TableCell>
                      <TableCell>
                        <Input
                          value={field.field_label}
                          onChange={(e) => updateField(index, { field_label: e.target.value })}
                          className="min-w-32"
                        />
                      </TableCell>
                      <TableCell>
                        <Select
                          value={field.field_type}
                          onValueChange={(value) => updateField(index, { field_type: value })}
                        >
                          <SelectTrigger className="min-w-32">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {fieldTypes.map((type) => (
                              <SelectItem key={type.value} value={type.value}>
                                {type.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell>
                        <Switch
                          checked={field.is_required}
                          onCheckedChange={(checked) => updateField(index, { is_required: checked })}
                        />
                      </TableCell>
                      <TableCell>
                        <Switch
                          checked={field.is_active}
                          onCheckedChange={(checked) => updateField(index, { is_active: checked })}
                        />
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDeleteField(field.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          {/* Add New Field */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Agregar Nuevo Campo</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-4 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="field_name">Nombre del Campo</Label>
                  <Input
                    id="field_name"
                    value={newField.field_name}
                    onChange={(e) => setNewField({ ...newField, field_name: e.target.value })}
                    placeholder="nombre_campo"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="field_label">Etiqueta</Label>
                  <Input
                    id="field_label"
                    value={newField.field_label}
                    onChange={(e) => setNewField({ ...newField, field_label: e.target.value })}
                    placeholder="Etiqueta del Campo"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="field_type">Tipo</Label>
                  <Select
                    value={newField.field_type}
                    onValueChange={(value) => setNewField({ ...newField, field_type: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {fieldTypes.map((type) => (
                        <SelectItem key={type.value} value={type.value}>
                          {type.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2 flex flex-col justify-end">
                  <Label className="flex items-center space-x-2">
                    <Switch
                      checked={newField.is_required}
                      onCheckedChange={(checked) => setNewField({ ...newField, is_required: checked })}
                    />
                    <span>Requerido</span>
                  </Label>
                  <Button onClick={handleAddField} className="w-full">
                    <Plus className="h-4 w-4 mr-2" />
                    Agregar
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="flex justify-between">
            <Button 
              type="button" 
              variant="outline" 
              onClick={() => onOpenChange(false)}
              disabled={loading}
            >
              Cancelar
            </Button>
            <Button onClick={handleSave} disabled={loading}>
              {loading ? 'Guardando...' : 'Guardar Cambios'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
