import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { BookingStatusCombobox } from './BookingStatusCombobox';
import { FormatoCombobox } from './FormatoCombobox';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { validateBookingOffer, ValidationResult } from '@/lib/bookingValidations';
import { AlertsBadge } from './AlertsBadge';
import { useBookingCalendarSync } from '@/hooks/useBookingCalendarSync';
import { useAuth } from '@/hooks/useAuth';
import { useBookingFolders } from '@/hooks/useBookingFolders';

interface TemplateField {
  id: string;
  field_name: string;
  field_label: string;
  field_type: string;
  field_order: number;
  is_required: boolean;
  is_active: boolean;
}

interface BookingOffer {
  id: string;
  fecha?: string;
  festival_ciclo?: string;
  ciudad?: string;
  lugar?: string;
  capacidad?: number;
  estado?: string;
  oferta?: string;
  formato?: string;
  contacto?: string;
  tour_manager?: string;
  tour_manager_new?: string;
  hora?: string;
  info_comentarios?: string;
  condiciones?: string;
  link_venta?: string;
  inicio_venta?: string;
  contratos?: string;
  artist_id?: string;
  project_id?: string;
  event_id?: string;
  created_at: string;
}

interface EditBookingOfferDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  offer: BookingOffer;
  onOfferUpdated: () => void;
  templateFields: TemplateField[];
}

export function EditBookingOfferDialog({ 
  open, 
  onOpenChange, 
  offer,
  onOfferUpdated, 
  templateFields 
}: EditBookingOfferDialogProps) {
  const { profile } = useAuth();
  const { syncBookingWithCalendar } = useBookingCalendarSync();
  const { createEventFolder, checkFolderExists, updateFolderMetadata, renameEventFolder } = useBookingFolders();
  const [formData, setFormData] = useState<Record<string, any>>({});
  const [loading, setLoading] = useState(false);
  const [validationResult, setValidationResult] = useState<ValidationResult | null>(null);
  const [originalOffer, setOriginalOffer] = useState<BookingOffer | null>(null);

  useEffect(() => {
    if (open && offer) {
      setFormData({ ...offer });
      setOriginalOffer({ ...offer });
      validateForm(offer);
    }
  }, [open, offer]);

  useEffect(() => {
    if (Object.keys(formData).length > 0) {
      validateForm(formData);
    }
  }, [formData]);

  const validateForm = async (data: Record<string, any>) => {
    try {
      const result = await validateBookingOffer(data);
      console.log('Validation result:', result);
      setValidationResult(result);
    } catch (error) {
      console.error('Error validating form:', error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate before submission
    const validation = await validateBookingOffer(formData);
    
    if (!validation.isValid) {
      toast({
        title: "Errores de validación",
        description: "Por favor, corrige los errores antes de continuar.",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);

    try {
      const { error } = await supabase
        .from('booking_offers')
        .update(formData)
        .eq('id', offer.id);

      if (error) throw error;

      // Sync with calendar if needed
      if (profile?.user_id) {
        await syncBookingWithCalendar(originalOffer, formData as BookingOffer, profile.user_id);
      }

      // Handle folder creation/update when saving or changing to "confirmado"
      const updatedOffer = formData as BookingOffer;
      
      // Check if folder renaming is needed (when fecha, ciudad, or festival_ciclo changes)
      const needsFolderRename = originalOffer && (
        originalOffer.fecha !== updatedOffer.fecha ||
        originalOffer.ciudad !== updatedOffer.ciudad ||
        originalOffer.festival_ciclo !== updatedOffer.festival_ciclo
      );

      if (needsFolderRename && originalOffer) {
        const folderExists = await checkFolderExists(originalOffer);
        if (folderExists) {
          await renameEventFolder(originalOffer, updatedOffer);
        } else {
          // Create new folder if original doesn't exist
          if (updatedOffer.estado === 'confirmado' || updatedOffer.estado === 'pendiente') {
            await createEventFolder(updatedOffer);
          }
        }
      } else {
        // Standard folder handling when no renaming is needed
        const folderExists = await checkFolderExists(updatedOffer);
        if (!folderExists && (updatedOffer.estado === 'confirmado' || updatedOffer.estado === 'pendiente')) {
          await createEventFolder(updatedOffer);
        } else if (folderExists) {
          await updateFolderMetadata(updatedOffer);
        }
      }

      toast({
        title: "Oferta actualizada",
        description: "La oferta se ha actualizado correctamente.",
      });

      onOfferUpdated();
      onOpenChange(false);
    } catch (error) {
      console.error('Error updating offer:', error);
      toast({
        title: "Error",
        description: "No se pudo actualizar la oferta.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const renderField = (field: TemplateField) => {
    const value = formData[field.field_name] || '';

    switch (field.field_type) {
      case 'textarea':
        return (
          <Textarea
            id={field.field_name}
            value={value}
            onChange={(e) => setFormData({ ...formData, [field.field_name]: e.target.value })}
            placeholder={`Ingresa ${field.field_label.toLowerCase()}`}
            rows={3}
          />
        );

      case 'select':
        if (field.field_name === 'estado') {
          return (
            <BookingStatusCombobox
              value={value}
              onValueChange={(newValue) => setFormData({ ...formData, [field.field_name]: newValue })}
              placeholder={`Selecciona ${field.field_label.toLowerCase()}`}
            />
          );
        }
        if (field.field_name === 'formato') {
          return (
            <FormatoCombobox
              value={value}
              onValueChange={(newValue) => setFormData({ ...formData, [field.field_name]: newValue })}
              placeholder={`Ingresa ${field.field_label.toLowerCase()}`}
            />
          );
        }
        const options = getSelectOptions(field.field_name);
        return (
          <Select
            value={value}
            onValueChange={(newValue) => setFormData({ ...formData, [field.field_name]: newValue })}
          >
            <SelectTrigger>
              <SelectValue placeholder={`Selecciona ${field.field_label.toLowerCase()}`} />
            </SelectTrigger>
            <SelectContent>
              {options.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        );

      case 'number':
        return (
          <Input
            id={field.field_name}
            type="number"
            value={value}
            onChange={(e) => setFormData({ ...formData, [field.field_name]: parseInt(e.target.value) || '' })}
            placeholder={`Ingresa ${field.field_label.toLowerCase()}`}
          />
        );

      case 'date':
        return (
          <Input
            id={field.field_name}
            type="date"
            value={value}
            onChange={(e) => setFormData({ ...formData, [field.field_name]: e.target.value })}
          />
        );

      case 'time':
        return (
          <Input
            id={field.field_name}
            type="time"
            value={value}
            onChange={(e) => setFormData({ ...formData, [field.field_name]: e.target.value })}
          />
        );

      case 'url':
        return (
          <Input
            id={field.field_name}
            type="url"
            value={value}
            onChange={(e) => setFormData({ ...formData, [field.field_name]: e.target.value })}
            placeholder={`https://ejemplo.com`}
          />
        );

      default:
        return (
          <Input
            id={field.field_name}
            value={value}
            onChange={(e) => setFormData({ ...formData, [field.field_name]: e.target.value })}
            placeholder={`Ingresa ${field.field_label.toLowerCase()}`}
          />
        );
    }
  };

  const getSelectOptions = (fieldName: string) => {
    switch (fieldName) {
      case 'estado':
        return [
          { value: 'pendiente', label: 'Pendiente' },
          { value: 'confirmado', label: 'Confirmado' },
          { value: 'interest', label: 'Interest' },
          { value: 'cancelado', label: 'Cancelado' },
        ];
      case 'formato':
        return [
          { value: 'duo', label: 'Dúo' },
          { value: 'trio', label: 'Trío' },
          { value: 'cuarteto', label: 'Cuarteto' },
          { value: 'quinteto', label: 'Quinteto' },
          { value: 'banda_completa', label: 'Banda Completa' },
        ];
      default:
        return [];
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Editar Oferta de Booking</DialogTitle>
          <DialogDescription>
            Modifica la información de la oferta de concierto
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {validationResult && (validationResult.errors.length > 0 || validationResult.warnings.length > 0) && (
            <div className="p-4 border rounded-lg bg-muted/50">
              <div className="flex items-center gap-2 mb-2">
                <AlertsBadge 
                  errors={validationResult.errors}
                  warnings={validationResult.warnings}
                  showAttachButton={validationResult.errors.some(e => e.field === 'contratos' || e.field === 'contacto')}
                  onAttachDocuments={() => {
                    // Open file picker for documents
                    const input = document.createElement('input');
                    input.type = 'file';
                    input.multiple = true;
                    input.accept = '.pdf,.doc,.docx,.txt';
                    input.onchange = (e) => {
                      const files = (e.target as HTMLInputElement).files;
                      if (files && files.length > 0) {
                        toast({
                          title: "Documentos adjuntados",
                          description: `Se han seleccionado ${files.length} archivo(s)`,
                        });
                        // Here you would handle the file upload logic
                      }
                    };
                    input.click();
                  }}
                />
                <span className="text-sm font-medium">Estado de validación</span>
              </div>
              {validationResult.errors.length > 0 && (
                <div className="text-sm text-destructive space-y-1">
                  {validationResult.errors.map((error, index) => (
                    <div key={index}>• {error.message}</div>
                  ))}
                </div>
              )}
            </div>
          )}
          
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Información de la Oferta</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {templateFields.map((field) => (
                <div key={field.id} className="space-y-2">
                  <Label htmlFor={field.field_name}>
                    {field.field_label}
                    {field.is_required && <span className="text-red-500 ml-1">*</span>}
                  </Label>
                  {renderField(field)}
                </div>
              ))}
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
            <Button 
              type="submit" 
              disabled={loading || (validationResult?.errors && validationResult.errors.length > 0)}
              onClick={() => {
                console.log('Button clicked - disabled?', loading || (validationResult?.errors && validationResult.errors.length > 0));
                console.log('Loading:', loading, 'Errors:', validationResult?.errors?.length);
                console.log('Validation result:', validationResult);
              }}
            >
              {loading ? 'Actualizando...' : 'Actualizar Oferta'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}