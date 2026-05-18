import { useEffect, useRef, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Building2, CreditCard, FileText, Upload, Trash2, Loader2, CheckCircle } from 'lucide-react';
import type { ArtistFormData, LegalDocument } from '../ArtistOnboardingWizard';

interface Step3BusinessProps {
  formData: ArtistFormData;
  updateFormData: (updates: Partial<ArtistFormData>) => void;
  onValidationChange: (isValid: boolean) => void;
}

const DOCUMENT_TYPES = [
  { value: 'management_agreement', label: 'Contrato de Management' },
  { value: 'label_deal', label: 'Contrato Discográfico' },
  { value: 'publishing', label: 'Contrato Editorial' },
  { value: 'distribution', label: 'Contrato de Distribución' },
  { value: 'other', label: 'Otro' },
];

export function Step3Business({ formData, updateFormData, onValidationChange }: Step3BusinessProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [newDocType, setNewDocType] = useState('management_agreement');

  // Always valid (optional step)
  useEffect(() => {
    onValidationChange(true);
  }, [onValidationChange]);

  const handleDocumentUpload = async (file: File) => {
    setIsUploading(true);

    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `legal-${Date.now()}.${fileExt}`;
      const filePath = `legal/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('artist-assets')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage
        .from('artist-assets')
        .getPublicUrl(filePath);

      const newDoc: LegalDocument = {
        id: `temp-${Date.now()}`,
        title: file.name.replace(/\.[^/.]+$/, ''),
        documentType: newDocType,
        fileUrl: urlData.publicUrl,
        fileName: file.name,
        isActive: true,
      };

      updateFormData({
        legalDocuments: [...formData.legalDocuments, newDoc],
      });

      toast({ title: 'Documento subido correctamente' });
    } catch (error: any) {
      toast({
        title: 'Error al subir documento',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setIsUploading(false);
    }
  };

  const handleRemoveDocument = (docId: string) => {
    updateFormData({
      legalDocuments: formData.legalDocuments.filter((d) => d.id !== docId),
    });
  };

  const handleToggleActive = (docId: string) => {
    updateFormData({
      legalDocuments: formData.legalDocuments.map((d) =>
        d.id === docId ? { ...d, isActive: !d.isActive } : d
      ),
    });
  };

  return (
    <div className="space-y-8">
      {/* Fiscal Entity */}
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <Building2 className="w-5 h-5 text-primary" />
          <Label className="text-base font-medium">Datos Fiscales</Label>
        </div>

        <div className="grid md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="companyName">Nombre de la Empresa / Razón Social</Label>
            <Input
              id="companyName"
              placeholder="Ej: Artist Music SL"
              value={formData.companyName}
              onChange={(e) => updateFormData({ companyName: e.target.value })}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="taxId">CIF / NIF / VAT</Label>
            <Input
              id="taxId"
              placeholder="Ej: B12345678"
              value={formData.taxId}
              onChange={(e) => updateFormData({ taxId: e.target.value })}
            />
          </div>
        </div>
      </div>

      {/* Bank Details */}
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <CreditCard className="w-5 h-5 text-primary" />
          <Label className="text-base font-medium">Datos Bancarios</Label>
        </div>

        <div className="grid md:grid-cols-3 gap-4">
          <div className="space-y-2 md:col-span-2">
            <Label htmlFor="iban">IBAN</Label>
            <Input
              id="iban"
              placeholder="ES00 0000 0000 0000 0000 0000"
              value={formData.iban}
              onChange={(e) => updateFormData({ iban: e.target.value })}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="swiftCode">SWIFT / BIC</Label>
            <Input
              id="swiftCode"
              placeholder="XXXXESXX"
              value={formData.swiftCode}
              onChange={(e) => updateFormData({ swiftCode: e.target.value })}
            />
          </div>

          <div className="space-y-2 md:col-span-3">
            <Label htmlFor="bankName">Nombre del Banco</Label>
            <Input
              id="bankName"
              placeholder="Ej: BBVA, Santander, CaixaBank..."
              value={formData.bankName}
              onChange={(e) => updateFormData({ bankName: e.target.value })}
            />
          </div>
        </div>
      </div>

      {/* Legal Documents */}
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <FileText className="w-5 h-5 text-primary" />
          <Label className="text-base font-medium">Documentos Legales</Label>
        </div>

        <p className="text-sm text-muted-foreground">
          Sube contratos y documentos legales. Los marcados como "Activos" generarán alertas de renovación.
        </p>

        {/* Upload Area */}
        <div className="flex gap-2">
          <Select value={newDocType} onValueChange={setNewDocType}>
            <SelectTrigger className="w-48">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {DOCUMENT_TYPES.map((type) => (
                <SelectItem key={type.value} value={type.value}>
                  {type.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Button
            type="button"
            variant="outline"
            onClick={() => fileInputRef.current?.click()}
            disabled={isUploading}
            className="flex-1"
          >
            {isUploading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Subiendo...
              </>
            ) : (
              <>
                <Upload className="w-4 h-4 mr-2" />
                Subir Documento
              </>
            )}
          </Button>
        </div>

        <input
          ref={fileInputRef}
          type="file"
          accept=".pdf,.doc,.docx"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) handleDocumentUpload(file);
          }}
        />

        {/* Documents List */}
        {formData.legalDocuments.length > 0 && (
          <div className="space-y-2">
            {formData.legalDocuments.map((doc) => (
              <Card key={doc.id}>
                <CardContent className="p-3 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <FileText className="w-8 h-8 text-muted-foreground" />
                    <div>
                      <p className="font-medium">{doc.title}</p>
                      <p className="text-sm text-muted-foreground">
                        {DOCUMENT_TYPES.find((t) => t.value === doc.documentType)?.label}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2">
                      <Switch
                        checked={doc.isActive}
                        onCheckedChange={() => handleToggleActive(doc.id!)}
                      />
                      <Label className="text-sm">
                        {doc.isActive ? (
                          <Badge variant="default" className="gap-1">
                            <CheckCircle className="w-3 h-3" />
                            Activo
                          </Badge>
                        ) : (
                          <Badge variant="secondary">Inactivo</Badge>
                        )}
                      </Label>
                    </div>

                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => handleRemoveDocument(doc.id!)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {formData.legalDocuments.length === 0 && (
          <div className="text-center py-6 text-muted-foreground border-2 border-dashed rounded-lg">
            <FileText className="w-10 h-10 mx-auto mb-2 opacity-50" />
            <p>No hay documentos subidos</p>
            <p className="text-sm">Puedes añadirlos ahora o más tarde</p>
          </div>
        )}
      </div>
    </div>
  );
}
