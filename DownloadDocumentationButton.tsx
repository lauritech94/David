import { FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { generateProjectDocumentation } from '@/utils/generateProjectDocumentation';
import { toast } from 'sonner';

export const DownloadDocumentationButton = () => {
  const handleDownload = () => {
    try {
      generateProjectDocumentation();
      toast.success('Documentación descargada correctamente');
    } catch (error) {
      console.error('Error generating documentation:', error);
      toast.error('Error al generar la documentación');
    }
  };

  return (
    <Button onClick={handleDownload} variant="outline" className="gap-2">
      <FileText className="h-4 w-4" />
      Descargar Documentación del Proyecto
    </Button>
  );
};
