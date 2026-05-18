import { useState } from 'react';
import { PUBLIC_APP_URL } from '@/lib/public-url';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Copy,
  ExternalLink,
  Mail,
  MessageSquare,
  QrCode,
  Share2,
  Link,
  Check
} from 'lucide-react';
import { toast } from '@/hooks/use-toast';

interface EPKQuickActionsProps {
  epkSlug: string;
  epkTitle: string;
  artistName: string;
}

export function EPKQuickActions({ epkSlug, epkTitle, artistName }: EPKQuickActionsProps) {
  const [showQrDialog, setShowQrDialog] = useState(false);
  const [showShareDialog, setShowShareDialog] = useState(false);
  const [copied, setCopied] = useState(false);

  const epkUrl = `${PUBLIC_APP_URL}/epk/${epkSlug}`;

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(epkUrl);
      setCopied(true);
      toast({
        title: "Enlace copiado",
        description: "El enlace se ha copiado al portapapeles"
      });
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      toast({
        title: "Error",
        description: "No se pudo copiar el enlace",
        variant: "destructive"
      });
    }
  };

  const handleShareEmail = () => {
    const subject = encodeURIComponent(`EPK de ${artistName}`);
    const body = encodeURIComponent(
      `Hola,\n\nTe comparto el Electronic Press Kit de ${artistName}:\n\n${epkUrl}\n\nSaludos`
    );
    window.open(`mailto:?subject=${subject}&body=${body}`);
  };

  const handleShareWhatsApp = () => {
    const text = encodeURIComponent(`📄 EPK de ${artistName}\n\n${epkUrl}`);
    window.open(`https://wa.me/?text=${text}`);
  };

  const handleOpenEPK = () => {
    window.open(epkUrl, '_blank');
  };

  // Generate QR Code URL using a free API
  const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(epkUrl)}`;

  return (
    <>
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Share2 className="w-4 h-4" />
            Acciones rápidas
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {/* URL Display */}
          <div className="flex items-center gap-2 p-2 bg-muted rounded-lg">
            <Link className="w-4 h-4 text-muted-foreground flex-shrink-0" />
            <code className="text-xs flex-1 truncate">{epkUrl}</code>
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6 flex-shrink-0"
              onClick={handleCopyLink}
            >
              {copied ? (
                <Check className="w-3 h-3 text-green-500" />
              ) : (
                <Copy className="w-3 h-3" />
              )}
            </Button>
          </div>

          {/* Action Buttons */}
          <div className="grid grid-cols-2 gap-2">
            <Button variant="outline" size="sm" onClick={handleOpenEPK}>
              <ExternalLink className="w-4 h-4 mr-2" />
              Ver EPK
            </Button>
            <Button variant="outline" size="sm" onClick={handleCopyLink}>
              {copied ? (
                <Check className="w-4 h-4 mr-2 text-green-500" />
              ) : (
                <Copy className="w-4 h-4 mr-2" />
              )}
              {copied ? 'Copiado' : 'Copiar'}
            </Button>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <Button variant="outline" size="sm" onClick={handleShareEmail}>
              <Mail className="w-4 h-4 mr-2" />
              Email
            </Button>
            <Button variant="outline" size="sm" onClick={handleShareWhatsApp}>
              <MessageSquare className="w-4 h-4 mr-2" />
              WhatsApp
            </Button>
          </div>

          <Button 
            variant="secondary" 
            size="sm" 
            className="w-full"
            onClick={() => setShowQrDialog(true)}
          >
            <QrCode className="w-4 h-4 mr-2" />
            Código QR
          </Button>
        </CardContent>
      </Card>

      {/* QR Code Dialog */}
      <Dialog open={showQrDialog} onOpenChange={setShowQrDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Código QR del EPK</DialogTitle>
            <DialogDescription>
              Escanea este código para acceder al EPK de {artistName}
            </DialogDescription>
          </DialogHeader>
          
          <div className="flex flex-col items-center space-y-4 py-4">
            <div className="bg-white p-4 rounded-lg shadow-sm">
              <img
                src={qrCodeUrl}
                alt="QR Code"
                className="w-64 h-64"
              />
            </div>
            <div className="text-center space-y-1">
              <p className="font-medium">{epkTitle}</p>
              <code className="text-xs text-muted-foreground">{epkUrl}</code>
            </div>
          </div>

          <DialogFooter className="flex-col sm:flex-row gap-2">
            <Button variant="outline" onClick={handleCopyLink} className="flex-1">
              <Copy className="w-4 h-4 mr-2" />
              Copiar enlace
            </Button>
            <a 
              href={qrCodeUrl} 
              download={`qr-${epkSlug}.png`}
              className="flex-1"
            >
              <Button className="w-full">
                Descargar QR
              </Button>
            </a>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
