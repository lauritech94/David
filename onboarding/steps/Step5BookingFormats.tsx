import { useEffect, useRef, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Plus, Trash2, Package, Upload, Loader2, Users, Clock, Euro } from 'lucide-react';
import type { ArtistFormData, BookingProduct } from '../ArtistOnboardingWizard';

interface Step5BookingFormatsProps {
  formData: ArtistFormData;
  updateFormData: (updates: Partial<ArtistFormData>) => void;
  onValidationChange: (isValid: boolean) => void;
}

const DEFAULT_FORMATS = [
  { name: 'Full Band', crewSize: 6, performanceDurationMinutes: 90 },
  { name: 'Acústico', crewSize: 3, performanceDurationMinutes: 60 },
  { name: 'DJ Set', crewSize: 2, performanceDurationMinutes: 120 },
];

export function Step5BookingFormats({
  formData,
  updateFormData,
  onValidationChange,
}: Step5BookingFormatsProps) {
  const fileInputRefs = useRef<Record<number, HTMLInputElement | null>>({});
  const [uploadingIndex, setUploadingIndex] = useState<number | null>(null);

  // Always valid (optional step)
  useEffect(() => {
    onValidationChange(true);
  }, [onValidationChange]);

  const handleAddFormat = (preset?: typeof DEFAULT_FORMATS[0]) => {
    const newProduct: BookingProduct = {
      name: preset?.name || '',
      crewSize: preset?.crewSize || 1,
      performanceDurationMinutes: preset?.performanceDurationMinutes || 60,
    };

    updateFormData({
      bookingProducts: [...formData.bookingProducts, newProduct],
    });
  };

  const handleRemoveFormat = (index: number) => {
    updateFormData({
      bookingProducts: formData.bookingProducts.filter((_, i) => i !== index),
    });
  };

  const handleUpdateFormat = (index: number, updates: Partial<BookingProduct>) => {
    updateFormData({
      bookingProducts: formData.bookingProducts.map((p, i) =>
        i === index ? { ...p, ...updates } : p
      ),
    });
  };

  const handleRiderUpload = async (index: number, file: File) => {
    setUploadingIndex(index);

    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `rider-${Date.now()}.${fileExt}`;
      const filePath = `riders/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('artist-assets')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage
        .from('artist-assets')
        .getPublicUrl(filePath);

      handleUpdateFormat(index, { riderUrl: urlData.publicUrl });
      toast({ title: 'Rider subido correctamente' });
    } catch (error: any) {
      toast({
        title: 'Error al subir rider',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setUploadingIndex(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <Package className="w-5 h-5 text-primary" />
        <Label className="text-base font-medium">Formatos de Booking</Label>
      </div>

      <p className="text-sm text-muted-foreground">
        Define los diferentes formatos que ofreces (Full Band, Acústico, DJ Set, etc.). 
        Al crear una oferta de booking, podrás seleccionar el formato y autorellenar los datos.
      </p>

      {/* Quick Add Presets */}
      <div className="flex flex-wrap gap-2">
        <span className="text-sm text-muted-foreground py-2">Añadir rápido:</span>
        {DEFAULT_FORMATS.map((preset) => (
          <Button
            key={preset.name}
            type="button"
            variant="outline"
            size="sm"
            onClick={() => handleAddFormat(preset)}
          >
            <Plus className="w-3 h-3 mr-1" />
            {preset.name}
          </Button>
        ))}
      </div>

      {/* Formats List */}
      <div className="space-y-4">
        {formData.bookingProducts.map((product, index) => (
          <Card key={index}>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <Input
                  value={product.name}
                  onChange={(e) => handleUpdateFormat(index, { name: e.target.value })}
                  placeholder="Nombre del formato"
                  className="text-lg font-semibold border-none shadow-none p-0 h-auto focus-visible:ring-0"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => handleRemoveFormat(index)}
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Fee Range */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="flex items-center gap-2 text-sm">
                    <Euro className="w-4 h-4" />
                    Caché Mínimo
                  </Label>
                  <Input
                    type="number"
                    placeholder="0"
                    value={product.feeMin || ''}
                    onChange={(e) =>
                      handleUpdateFormat(index, { feeMin: parseFloat(e.target.value) || undefined })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label className="flex items-center gap-2 text-sm">
                    <Euro className="w-4 h-4" />
                    Caché Máximo
                  </Label>
                  <Input
                    type="number"
                    placeholder="0"
                    value={product.feeMax || ''}
                    onChange={(e) =>
                      handleUpdateFormat(index, { feeMax: parseFloat(e.target.value) || undefined })
                    }
                  />
                </div>
              </div>

              {/* Crew & Duration */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="flex items-center gap-2 text-sm">
                    <Users className="w-4 h-4" />
                    Tamaño del Crew
                  </Label>
                  <Input
                    type="number"
                    min="1"
                    value={product.crewSize}
                    onChange={(e) =>
                      handleUpdateFormat(index, { crewSize: parseInt(e.target.value) || 1 })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label className="flex items-center gap-2 text-sm">
                    <Clock className="w-4 h-4" />
                    Duración (min)
                  </Label>
                  <Input
                    type="number"
                    min="15"
                    step="15"
                    value={product.performanceDurationMinutes || ''}
                    onChange={(e) =>
                      handleUpdateFormat(index, {
                        performanceDurationMinutes: parseInt(e.target.value) || undefined,
                      })
                    }
                  />
                </div>
              </div>

              {/* Rider Upload */}
              <div className="space-y-2">
                <Label className="text-sm">Rider Técnico (PDF)</Label>
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => fileInputRefs.current[index]?.click()}
                    disabled={uploadingIndex === index}
                    className="flex-1"
                  >
                    {uploadingIndex === index ? (
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    ) : (
                      <Upload className="w-4 h-4 mr-2" />
                    )}
                    {product.riderUrl ? 'Cambiar Rider' : 'Subir Rider'}
                  </Button>
                  {product.riderUrl && (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => window.open(product.riderUrl, '_blank')}
                    >
                      Ver
                    </Button>
                  )}
                </div>
                <input
                  ref={(el) => (fileInputRefs.current[index] = el)}
                  type="file"
                  accept=".pdf"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) handleRiderUpload(index, file);
                  }}
                />
              </div>

              {/* Hospitality */}
              <div className="space-y-2">
                <Label className="text-sm">Requerimientos de Hospitalidad</Label>
                <Textarea
                  placeholder="Catering, camerinos, transporte..."
                  value={product.hospitalityRequirements || ''}
                  onChange={(e) =>
                    handleUpdateFormat(index, { hospitalityRequirements: e.target.value })
                  }
                  rows={3}
                />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Add Custom Format */}
      <Button
        type="button"
        variant="outline"
        onClick={() => handleAddFormat()}
        className="w-full"
      >
        <Plus className="w-4 h-4 mr-2" />
        Añadir Formato Personalizado
      </Button>

      {formData.bookingProducts.length === 0 && (
        <div className="text-center py-6 text-muted-foreground border-2 border-dashed rounded-lg">
          <Package className="w-10 h-10 mx-auto mb-2 opacity-50" />
          <p>No hay formatos configurados</p>
          <p className="text-sm">Puedes añadirlos ahora o más tarde</p>
        </div>
      )}
    </div>
  );
}
