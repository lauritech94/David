import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Link, ExternalLink, Unlink, FileText, Image, File, Download } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { useFileLinks } from "@/hooks/useFileLinks";

interface LinkedResourcesSectionProps {
  projectId: string;
}

export function LinkedResourcesSection({ projectId }: LinkedResourcesSectionProps) {
  const { linkedFiles, isLoading, unlinkFile, isLinking } = useFileLinks(projectId);
  const [unlinkingId, setUnlinkingId] = useState<string | null>(null);

  const getFileIcon = (fileType: string | null) => {
    if (!fileType) return <File className="h-5 w-5" />;
    if (fileType.startsWith("image/")) return <Image className="h-5 w-5 text-purple-500" />;
    if (fileType.includes("pdf")) return <FileText className="h-5 w-5 text-red-500" />;
    return <File className="h-5 w-5 text-blue-500" />;
  };

  const handleUnlink = async () => {
    if (unlinkingId) {
      await unlinkFile(unlinkingId);
      setUnlinkingId(null);
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-48" />
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[1, 2].map((i) => (
              <Skeleton key={i} className="h-16 w-full" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (linkedFiles.length === 0) {
    return null;
  }

  return (
    <>
      <Card className="border-dashed border-primary/30 bg-primary/5">
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <Link className="h-5 w-5 text-primary" />
            <CardTitle className="text-lg">Recursos Vinculados</CardTitle>
            <Badge variant="secondary" className="ml-auto">
              {linkedFiles.length} archivo{linkedFiles.length !== 1 ? "s" : ""}
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground">Archivos vinculados desde carpetas de archivo</p>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {linkedFiles.map((link) => (
              <div
                key={link.id}
                className="flex items-center gap-3 p-3 rounded-lg bg-background border hover:border-primary/50 transition-colors"
              >
                {getFileIcon(link.source_file?.file_type || null)}
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm truncate">
                    {link.source_file?.file_name || "Archivo no disponible"}
                  </p>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Badge variant="outline" className="text-xs">
                      <Link className="h-3 w-3 mr-1" />
                      Vinculado
                    </Badge>
                    {link.source_file?.folder_type && <span>de {link.source_file.folder_type}</span>}
                    {link.linked_at && <span>• {format(new Date(link.linked_at), "d MMM yyyy", { locale: es })}</span>}
                  </div>
                  {link.notes && <p className="text-xs text-muted-foreground mt-1 italic">{link.notes}</p>}
                </div>
                <div className="flex items-center gap-1">
                  {link.source_file?.file_url && (
                    <>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => window.open(link.source_file?.file_url, "_blank")}
                      >
                        <ExternalLink className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8" asChild>
                        <a href={link.source_file.file_url} download>
                          <Download className="h-4 w-4" />
                        </a>
                      </Button>
                    </>
                  )}
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-destructive hover:text-destructive"
                    onClick={() => setUnlinkingId(link.id)}
                    disabled={isLinking}
                  >
                    <Unlink className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <AlertDialog open={!!unlinkingId} onOpenChange={() => setUnlinkingId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Desvincular archivo?</AlertDialogTitle>
            <AlertDialogDescription>
              El archivo seguirá disponible en su carpeta original, pero ya no será accesible desde este proyecto.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleUnlink}>Desvincular</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

