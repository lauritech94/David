import React, { useState } from 'react';
import { PUBLIC_APP_URL } from '@/lib/public-url';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Copy, Link, Download, FileText } from 'lucide-react';
import { CopyButton } from '@/components/ui/copy-button';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

interface Contact {
  id: string;
  name: string;
  stage_name?: string;
  legal_name?: string;
  email?: string;
  phone?: string;
  address?: string;
  bank_info?: string;
  iban?: string;
  clothing_size?: string;
  shoe_size?: string;
  allergies?: string;
  special_needs?: string;
  contract_url?: string;
  preferred_hours?: string;
  company?: string;
  role?: string;
  city?: string;
  country?: string;
  category: string;
  notes?: string;
  field_config: Record<string, boolean>;
  is_public: boolean;
  public_slug?: string;
}

interface ContactShareDialogProps {
  contact: Contact;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ContactShareDialog({ contact, open, onOpenChange }: ContactShareDialogProps) {
  const [loading, setLoading] = useState(false);
  const [publicLinkEnabled, setPublicLinkEnabled] = useState(contact.is_public);

  const publicUrl = contact.public_slug 
    ? `${PUBLIC_APP_URL}/contact/${contact.public_slug}`
    : '';

  const handleTogglePublicLink = async () => {
    setLoading(true);
    try {
      const { error } = await supabase
        .from('contacts')
        .update({ is_public: !publicLinkEnabled })
        .eq('id', contact.id);

      if (error) throw error;

      setPublicLinkEnabled(!publicLinkEnabled);
      
      toast({
        title: "Éxito",
        description: !publicLinkEnabled 
          ? "Enlace público activado" 
          : "Enlace público desactivado",
      });
    } catch (error) {
      console.error('Error toggling public link:', error);
      toast({
        title: "Error",
        description: "No se pudo actualizar el enlace público",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const generateVCard = () => {
    const vCardLines = [
      'BEGIN:VCARD',
      'VERSION:3.0',
      `FN:${contact.name}`,
    ];

    if (contact.field_config?.legal_name && contact.legal_name) {
      vCardLines.push(`N:${contact.legal_name}`);
    }

    if (contact.field_config?.email && contact.email) {
      vCardLines.push(`EMAIL:${contact.email}`);
    }

    if (contact.field_config?.phone && contact.phone) {
      vCardLines.push(`TEL:${contact.phone}`);
    }

    if (contact.field_config?.company && contact.company) {
      vCardLines.push(`ORG:${contact.company}`);
    }

    if (contact.field_config?.role && contact.role) {
      vCardLines.push(`TITLE:${contact.role}`);
    }

    if (contact.field_config?.address && contact.address) {
      vCardLines.push(`ADR:;;${contact.address};;;;`);
    }

    if (contact.field_config?.notes && contact.notes) {
      vCardLines.push(`NOTE:${contact.notes}`);
    }

    vCardLines.push('END:VCARD');

    return vCardLines.join('\n');
  };

  const downloadVCard = () => {
    const vCardContent = generateVCard();
    const blob = new Blob([vCardContent], { type: 'text/vcard;charset=utf-8' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${contact.name.replace(/\s+/g, '_')}.vcf`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);

    toast({
      title: "Descargado",
      description: "vCard descargada correctamente",
    });
  };

  const exportToPDF = async () => {
    toast({
      title: "Próximamente",
      description: "La exportación a PDF estará disponible pronto",
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Compartir Contacto</DialogTitle>
          <DialogDescription>
            Comparte la información de {contact.name} mediante enlace público o exportación
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Public Link Section */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Link className="w-5 h-5" />
                Enlace Público
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">Hacer público este contacto</p>
                  <p className="text-sm text-muted-foreground">
                    Genera un enlace que cualquiera puede ver (solo lectura)
                  </p>
                </div>
                <Button
                  variant={publicLinkEnabled ? "destructive" : "default"}
                  onClick={handleTogglePublicLink}
                  disabled={loading}
                >
                  {loading ? "..." : publicLinkEnabled ? "Desactivar" : "Activar"}
                </Button>
              </div>

              {publicLinkEnabled && publicUrl && (
                <div className="space-y-2">
                  <Label>Enlace público</Label>
                  <div className="flex gap-2">
                    <Input value={publicUrl} readOnly className="flex-1" />
                    <CopyButton 
                      text={publicUrl}
                      successMessage="Enlace copiado al portapapeles"
                    />
                  </div>
                  <Badge variant="secondary" className="text-xs">
                    Solo lectura • No requiere autenticación
                  </Badge>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Export Options */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Download className="w-5 h-5" />
                Opciones de Exportación
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Button variant="outline" onClick={downloadVCard} className="flex items-center gap-2">
                  <Copy className="w-4 h-4" />
                  Descargar vCard
                </Button>
                
                <Button variant="outline" onClick={exportToPDF} className="flex items-center gap-2">
                  <FileText className="w-4 h-4" />
                  Exportar PDF
                </Button>
              </div>
              
              <div className="mt-4 text-sm text-muted-foreground">
                <p className="flex items-start gap-2">
                  <Copy className="w-4 h-4 mt-0.5 flex-shrink-0" />
                  <span>
                    <strong>vCard:</strong> Formato estándar para contactos, compatible con la mayoría de aplicaciones de agenda y correo electrónico.
                  </span>
                </p>
                
                <p className="flex items-start gap-2 mt-2">
                  <FileText className="w-4 h-4 mt-0.5 flex-shrink-0" />
                  <span>
                    <strong>PDF:</strong> Documento con formato profesional que incluye toda la información visible del contacto.
                  </span>
                </p>
              </div>
            </CardContent>
          </Card>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cerrar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}