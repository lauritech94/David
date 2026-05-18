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
import { useAuth } from '@/hooks/useAuth';
import { toast } from '@/hooks/use-toast';
import { validateBookingOffer, ValidationResult } from '@/lib/bookingValidations';
import { AlertsBadge } from './AlertsBadge';
import { useBookingCalendarSync } from '@/hooks/useBookingCalendarSync';
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

interface CreateBookingOfferDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onOfferCreated: () => void;
  templateFields: TemplateField[];
}

export function CreateBookingOfferDialog({ 
  open, 
  onOpenChange, 
  onOfferCreated, 
  templateFields 
}: CreateBookingOfferDialogProps) {
  const { profile } = useAuth();
  const { syncBookingWithCalendar } = useBookingCalendarSync();
  const { createEventFolder } = useBookingFolders();
  const [formData, setFormData] = useState<Record<string, any>>({});
  const [loading, setLoading] = useState(false);
  const [validationResult, setValidationResult] = useState<ValidationResult | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, boolean>>({});

  useEffect(() => {
    if (open) {
      setFormData({});
      setValidationResult(null);
      setFieldErrors({});
    }
  }, [open]);

  useEffect(() => {
    if (Object.keys(formData).length > 0) {
      validateForm();
    }
  }, [formData]);

  const validateForm = async () => {
    try {
      const result = await validateBookingOffer(formData, true);
      setValidationResult(result);
    } catch (error) {
      console.error('Error validating form:', error);
    }
  };

  const resetForm = () => {
    setFormData({});
    setValidationResult(null);
    setFieldErrors({});
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Check required fields and mark errors
    const errors: Record<string, boolean> = {};
    const requiredFields = templateFields.filter(field => field.is_required);
    
    requiredFields.forEach(field => {
      const value = formData[field.field_name];
      if (!value || (typeof value === 'string' && !value.trim())) {
        errors[field.field_name] = true;
      }
    });
    
    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      toast({
        title: "Campos obligatorios",
        description: "Por favor, completa todos los campos obligatorios marcados en rojo.",
        variant: "destructive",
      });
      return;
    }
    
    setFieldErrors({});
    
    // Validate before submission
    const validation = await validateBookingOffer(formData, true);
    
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
      const offerData = {
        ...formData,
        created_by: profile?.user_id,
      };

      const { data, error } = await supabase
        .from('booking_offers')
        .insert([offerData])
        .select()
        .single();

      if (error) throw error;

      // Sync with calendar if the offer is created as "confirmado"
      if (data && data.estado === 'confirmado' && profile?.user_id) {
        await syncBookingWithCalendar(null, data, profile.user_id);
      }

      // Create event folder if the offer is saved or marked as "confirmado"
      if (data && (data.estado === 'confirmado' || data.estado === 'pendiente')) {
        await createEventFolder(data);
      }

      toast({
        title: "Oferta creada",
        description: "La oferta se ha creado correctamente.",
      });

      onOfferCreated();
      onOpenChange(false);
      resetForm();
    } catch (error) {
      console.error('Error creating offer:', error);
      toast({
        title: "Error",
        description: "No se pudo crear la oferta.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const renderField = (field: TemplateField) => {
    const value = formData[field.field_name] || '';
    const hasError = fieldErrors[field.field_name];
    const errorClass = hasError ? "border-destructive ring-destructive" : "";

    const handleChange = (newValue: string | number) => {
      setFormData({ ...formData, [field.field_name]: newValue });
      if (hasError) {
        setFieldErrors(prev => ({ ...prev, [field.field_name]: false }));
      }
    };

    switch (field.field_type) {
      case 'textarea':
        return (
          <Textarea
            id={field.field_name}
            value={value}
            onChange={(e) => handleChange(e.target.value)}
            placeholder={`Ingresa ${field.field_label.toLowerCase()}`}
            rows={3}
            className={errorClass}
          />
        );

      case 'select':
        if (field.field_name === 'estado') {
          return (
            <BookingStatusCombobox
              value={value}
              onValueChange={(newValue) => handleChange(newValue)}
              placeholder={`Selecciona ${field.field_label.toLowerCase()}`}
            />
          );
        }
        if (field.field_name === 'formato') {
          return (
            <FormatoCombobox
              value={value}
              onValueChange={(newValue) => handleChange(newValue)}
              placeholder={`Ingresa ${field.field_label.toLowerCase()}`}
            />
          );
        }
        const options = getSelectOptions(field.field_name);
        return (
          <Select
            value={value}
            onValueChange={(newValue) => handleChange(newValue)}
          >
            <SelectTrigger className={errorClass}>
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
            onChange={(e) => handleChange(parseInt(e.target.value) || '')}
            placeholder={`Ingresa ${field.field_label.toLowerCase()}`}
            className={errorClass}
          />
        );

      case 'date':
        return (
          <Input
            id={field.field_name}
            type="date"
            value={value}
            onChange={(e) => handleChange(e.target.value)}
            className={errorClass}
          />
        );

      case 'time':
        return (
          <Input
            id={field.field_name}
            type="time"
            value={value}
            onChange={(e) => handleChange(e.target.value)}
            className={errorClass}
          />
        );

      case 'url':
        return (
          <Input
            id={field.field_name}
            type="url"
            value={value}
            onChange={(e) => handleChange(e.target.value)}
            placeholder={`https://ejemplo.com`}
            className={errorClass}
          />
        );

      default:
        return (
          <Input
            id={field.field_name}
            value={value}
            onChange={(e) => handleChange(e.target.value)}
            placeholder={`Ingresa ${field.field_label.toLowerCase()}`}
            className={errorClass}
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
          <DialogTitle>Nueva Oferta de Booking</DialogTitle>
          <DialogDescription>
            Completa la información de la nueva oferta de concierto
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
                  <Label 
                    htmlFor={field.field_name}
                    className={fieldErrors[field.field_name] ? "text-destructive" : ""}
                  >
                    {field.field_label}
                    {field.is_required && <span className="text-red-500 ml-1">*</span>}
                    {fieldErrors[field.field_name] && <span className="text-xs block text-destructive mt-1">Campo obligatorio</span>}
                  </Label>
                  <div className={fieldErrors[field.field_name] ? "has-error" : ""}>
                    {renderField(field)}
                  </div>
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
            <Button type="submit" disabled={loading || (validationResult && !validationResult.isValid)}>
              {loading ? 'Creando...' : 'Crear Oferta'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}