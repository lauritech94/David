import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Progress } from '@/components/ui/progress';
import { Checkbox } from '@/components/ui/checkbox';
import { Card, CardContent } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { FileArchive, FileText, Image, FileType, Download, AlertCircle } from 'lucide-react';
import { EPKData, EPKPhoto, EPKDocument } from '@/hooks/useEPK';
import { toast } from 'sonner';
import JSZip from 'jszip';
import { cn } from '@/lib/utils';

interface PressKitDownloaderProps {
  epk: Partial<EPKData>;
  photos: EPKPhoto[];
  documents: EPKDocument[];
  onDownloadStart?: () => void;
  onDownloadComplete?: () => void;
}

interface FileSelection {
  pressRelease: boolean;
  photos: string[];
  documents: string[];
  contacts: boolean;
}

const PressKitDownloader: React.FC<PressKitDownloaderProps> = ({
  epk,
  photos,
  documents,
  onDownloadStart,
  onDownloadComplete
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [downloadProgress, setDownloadProgress] = useState(0);
  const [estimatedSize, setEstimatedSize] = useState<string>('');
  const [downloadError, setDownloadError] = useState<string>('');
  
  const [selection, setSelection] = useState<FileSelection>({
    pressRelease: !!epk.nota_prensa_pdf,
    photos: photos.map(p => p.id),
    documents: documents.map(d => d.id),
    contacts: true
  });

  // Normalize filename helper
  const normalizeFileName = (filename: string): string => {
    return filename
      .replace(/[^a-zA-Z0-9._-]/g, '_')
      .replace(/_+/g, '_')
      .replace(/^_|_$/g, '');
  };

  // Estimate file size
  const estimateSize = React.useCallback(() => {
    let totalSize = 0;
    
    // Press release PDF (estimated 500KB)
    if (selection.pressRelease && epk.nota_prensa_pdf) {
      totalSize += 500 * 1024;
    }
    
    // Photos (estimated 2MB each)
    const selectedPhotos = photos.filter(p => selection.photos.includes(p.id));
    totalSize += selectedPhotos.length * 2 * 1024 * 1024;
    
    // Documents (estimated 1MB each)
    const selectedDocs = documents.filter(d => selection.documents.includes(d.id));
    totalSize += selectedDocs.length * 1024 * 1024;
    
    // Contacts VCF (estimated 5KB)
    if (selection.contacts) {
      totalSize += 5 * 1024;
    }
    
    const mb = totalSize / (1024 * 1024);
    if (mb < 1) {
      setEstimatedSize(`${Math.round(totalSize / 1024)} KB`);
    } else {
      setEstimatedSize(`${mb.toFixed(1)} MB`);
    }
  }, [selection, epk, photos, documents]);

  React.useEffect(() => {
    estimateSize();
  }, [estimateSize]);

  // Generate VCF contact file
  const generateVCF = (): string => {
    const contacts = [];
    
    // Add each contact type
    const contactTypes = [
      { key: 'booking', label: 'Booking' },
      { key: 'management', label: 'Management' },
      { key: 'prensa', label: 'Prensa' },
      { key: 'tour_manager', label: 'Tour Manager' },
      { key: 'label', label: 'Label' },
      { key: 'contacto_general', label: 'General' }
    ];

    contactTypes.forEach(({ key, label }) => {
      const contact = epk[`contacto_${key}` as keyof EPKData] as any;
      if (contact?.mostrar && (contact.nombre || contact.email || contact.telefono)) {
        let vcf = 'BEGIN:VCARD\nVERSION:3.0\n';
        
        if (contact.nombre) {
          vcf += `FN:${contact.nombre}\n`;
          vcf += `N:${contact.nombre};;;;\n`;
        }
        
        if (contact.email) {
          vcf += `EMAIL:${contact.email}\n`;
        }
        
        if (contact.telefono) {
          vcf += `TEL:${contact.telefono}\n`;
        }
        
        if (contact.empresa) {
          vcf += `ORG:${contact.empresa}\n`;
        }
        
        vcf += `TITLE:${label} - ${epk.artista_proyecto || 'Artist'}\n`;
        vcf += 'END:VCARD\n\n';
        
        contacts.push(vcf);
      }
    });

    return contacts.join('');
  };

  // Download file as blob
  const downloadFile = async (url: string): Promise<Blob> => {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Failed to download ${url}`);
    }
    return response.blob();
  };

  // Generate and download ZIP
  const handleDownload = async () => {
    setIsDownloading(true);
    setDownloadProgress(0);
    setDownloadError('');
    onDownloadStart?.();

    try {
      const zip = new JSZip();
      const selectedPhotos = photos.filter(p => selection.photos.includes(p.id));
      const selectedDocs = documents.filter(d => selection.documents.includes(d.id));
      const totalFiles = (selection.pressRelease ? 1 : 0) + 
                        selectedPhotos.length + 
                        selectedDocs.length + 
                        (selection.contacts ? 1 : 0);
      
      let processedFiles = 0;

      // Add press release PDF
      if (selection.pressRelease && epk.nota_prensa_pdf) {
        try {
          const blob = await downloadFile(epk.nota_prensa_pdf);
          const filename = normalizeFileName(`${epk.artista_proyecto}_Nota_de_Prensa.pdf`);
          zip.file(filename, blob);
          processedFiles++;
          setDownloadProgress((processedFiles / totalFiles) * 100);
        } catch (error) {
          console.error('Error downloading press release:', error);
            toast.error("No se pudo descargar la nota de prensa");
        }
      }

      // Add photos folder
      if (selectedPhotos.length > 0) {
        const photosFolder = zip.folder("Fotos");
        for (const photo of selectedPhotos) {
          try {
            const blob = await downloadFile(photo.url);
            const extension = photo.url.split('.').pop() || 'jpg';
            const filename = normalizeFileName(`${photo.titulo || `foto_${photo.id}`}.${extension}`);
            photosFolder?.file(filename, blob);
            processedFiles++;
            setDownloadProgress((processedFiles / totalFiles) * 100);
          } catch (error) {
            console.error('Error downloading photo:', error);
            toast.error(`No se pudo descargar la foto: ${photo.titulo}`);
          }
        }
      }

      // Add documents folder
      if (selectedDocs.length > 0) {
        const docsFolder = zip.folder("Documentos");
        for (const doc of selectedDocs) {
          try {
            const blob = await downloadFile(doc.url);
            const extension = doc.url.split('.').pop() || 'pdf';
            const filename = normalizeFileName(`${doc.titulo}.${extension}`);
            docsFolder?.file(filename, blob);
            processedFiles++;
            setDownloadProgress((processedFiles / totalFiles) * 100);
          } catch (error) {
            console.error('Error downloading document:', error);
            toast.error(`No se pudo descargar el documento: ${doc.titulo}`);
          }
        }
      }

      // Add contacts VCF
      if (selection.contacts) {
        const vcfContent = generateVCF();
        if (vcfContent.trim()) {
          const filename = normalizeFileName(`${epk.artista_proyecto}_Contactos.vcf`);
          zip.file(filename, vcfContent);
        }
        processedFiles++;
        setDownloadProgress((processedFiles / totalFiles) * 100);
      }

      // Generate and download ZIP
      const content = await zip.generateAsync({ type: "blob" });
      const url = URL.createObjectURL(content);
      const link = document.createElement('a');
      link.href = url;
      link.download = normalizeFileName(`${epk.artista_proyecto}_Press_Kit.zip`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      toast.success("El Press Kit se ha descargado correctamente");

      setIsOpen(false);
      onDownloadComplete?.();

    } catch (error) {
      console.error('Error generating ZIP:', error);
      setDownloadError('Error al generar el archivo ZIP. Inténtalo de nuevo.');
      toast.error("No se pudo generar el Press Kit completo");
    } finally {
      setIsDownloading(false);
      setDownloadProgress(0);
    }
  };

  const handlePhotoToggle = (photoId: string, checked: boolean) => {
    setSelection(prev => ({
      ...prev,
      photos: checked 
        ? [...prev.photos, photoId]
        : prev.photos.filter(id => id !== photoId)
    }));
  };

  const handleDocumentToggle = (docId: string, checked: boolean) => {
    setSelection(prev => ({
      ...prev,
      documents: checked 
        ? [...prev.documents, docId]
        : prev.documents.filter(id => id !== docId)
    }));
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button size="lg" variant="outline" className="btn-secondary">
          <FileArchive className="w-5 h-5 mr-2" />
          Descargar Press Kit (ZIP)
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileArchive className="w-5 h-5" />
            Descargar Press Kit Completo
          </DialogTitle>
        </DialogHeader>

        {isDownloading ? (
          <div className="space-y-4">
            <div className="text-center">
              <p className="text-sm text-muted-foreground mb-2">
                Generando Press Kit...
              </p>
              <Progress value={downloadProgress} className="w-full" />
              <p className="text-xs text-muted-foreground mt-1">
                {Math.round(downloadProgress)}% completado
              </p>
            </div>
            {downloadError && (
              <div className="flex items-center gap-2 p-3 bg-destructive/10 rounded-lg">
                <AlertCircle className="w-4 h-4 text-destructive" />
                <p className="text-sm text-destructive">{downloadError}</p>
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-6">
            {/* Size estimate */}
            <Card>
              <CardContent className="p-4">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium">Tamaño estimado:</span>
                  <span className="text-sm font-bold">{estimatedSize}</span>
                </div>
              </CardContent>
            </Card>

            {/* Press release selection */}
            {epk.nota_prensa_pdf && (
              <div className="space-y-3">
                <h4 className="font-medium flex items-center gap-2">
                  <FileText className="w-4 h-4" />
                  Nota de Prensa
                </h4>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="pressRelease"
                    checked={selection.pressRelease}
                    onCheckedChange={(checked) => 
                      setSelection(prev => ({ ...prev, pressRelease: !!checked }))
                    }
                  />
                  <label htmlFor="pressRelease" className="text-sm">
                    Incluir nota de prensa PDF
                  </label>
                </div>
              </div>
            )}

            {/* Photos selection */}
            {photos.length > 0 && (
              <div className="space-y-3">
                <h4 className="font-medium flex items-center gap-2">
                  <Image className="w-4 h-4" />
                  Fotos ({photos.length})
                </h4>
                <div className="space-y-2 max-h-40 overflow-y-auto">
                  <div className="flex items-center space-x-2 mb-2">
                    <Checkbox
                      id="allPhotos"
                      checked={selection.photos.length === photos.length}
                      onCheckedChange={(checked) => 
                        setSelection(prev => ({
                          ...prev,
                          photos: checked ? photos.map(p => p.id) : []
                        }))
                      }
                    />
                    <label htmlFor="allPhotos" className="text-sm font-medium">
                      Seleccionar todas
                    </label>
                  </div>
                  <Separator />
                  {photos.map((photo) => (
                    <div key={photo.id} className="flex items-center space-x-2">
                      <Checkbox
                        id={`photo-${photo.id}`}
                        checked={selection.photos.includes(photo.id)}
                        onCheckedChange={(checked) => 
                          handlePhotoToggle(photo.id, !!checked)
                        }
                      />
                      <label htmlFor={`photo-${photo.id}`} className="text-sm">
                        {photo.titulo || `Foto ${photo.id}`}
                      </label>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Documents selection */}
            {documents.length > 0 && (
              <div className="space-y-3">
                <h4 className="font-medium flex items-center gap-2">
                  <FileType className="w-4 h-4" />
                  Documentos ({documents.length})
                </h4>
                <div className="space-y-2 max-h-40 overflow-y-auto">
                  <div className="flex items-center space-x-2 mb-2">
                    <Checkbox
                      id="allDocs"
                      checked={selection.documents.length === documents.length}
                      onCheckedChange={(checked) => 
                        setSelection(prev => ({
                          ...prev,
                          documents: checked ? documents.map(d => d.id) : []
                        }))
                      }
                    />
                    <label htmlFor="allDocs" className="text-sm font-medium">
                      Seleccionar todos
                    </label>
                  </div>
                  <Separator />
                  {documents.map((doc) => (
                    <div key={doc.id} className="flex items-center space-x-2">
                      <Checkbox
                        id={`doc-${doc.id}`}
                        checked={selection.documents.includes(doc.id)}
                        onCheckedChange={(checked) => 
                          handleDocumentToggle(doc.id, !!checked)
                        }
                      />
                      <label htmlFor={`doc-${doc.id}`} className="text-sm">
                        {doc.titulo}
                      </label>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Contacts selection */}
            <div className="space-y-3">
              <h4 className="font-medium">Información de Contacto</h4>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="contacts"
                  checked={selection.contacts}
                  onCheckedChange={(checked) => 
                    setSelection(prev => ({ ...prev, contacts: !!checked }))
                  }
                />
                <label htmlFor="contacts" className="text-sm">
                  Incluir archivo de contactos (VCF)
                </label>
              </div>
            </div>

            {/* Download button */}
            <div className="flex justify-end gap-3">
              <Button variant="outline" onClick={() => setIsOpen(false)}>
                Cancelar
              </Button>
              <Button 
                onClick={handleDownload}
                disabled={
                  !selection.pressRelease && 
                  selection.photos.length === 0 && 
                  selection.documents.length === 0 && 
                  !selection.contacts
                }
                className="btn-primary"
              >
                <Download className="w-4 h-4 mr-2" />
                Descargar ZIP
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default PressKitDownloader;