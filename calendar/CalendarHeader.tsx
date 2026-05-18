import { Button } from '@/components/ui/button';
import { CalendarIcon, Upload, Plus, Loader2 } from 'lucide-react';
import { ImportConcerts2025Dialog } from '@/components/ImportConcerts2025Dialog';
import { DownloadDocumentationButton } from '@/components/DownloadDocumentationButton';
interface CalendarHeaderProps {
  onCreateEvent: () => void;
  onImportCsv: () => void;
  onSyncGoogle: () => void;
  isImporting: boolean;
  googleConnected?: boolean;
}
export function CalendarHeader({
  onCreateEvent,
  onImportCsv,
  isImporting
}: CalendarHeaderProps) {
  return <div className="flex items-center justify-between">
      {/* Left: Title */}
      <div className="flex items-center gap-3">
        <div className="p-2 bg-gradient-primary rounded-xl">
          <CalendarIcon className="h-6 w-6 text-primary-foreground" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-gradient-primary tracking-tight">Calendario</h1>
          <p className="text-sm text-muted-foreground">Organiza y visualiza tu agenda </p>
        </div>
      </div>

      {/* Right: Action Buttons */}
      <div className="flex items-center gap-2">
        {/* Download Documentation */}
        <DownloadDocumentationButton />
        
        {/* Import Concerts */}
        <ImportConcerts2025Dialog />
        
        {/* Import CSV */}
        <Button variant="outline" size="sm" disabled={isImporting} onClick={onImportCsv}>
          {isImporting ? <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Importando...
            </> : <>
              <Upload className="mr-2 h-4 w-4" />
              Importar CSV
            </>}
        </Button>

        {/* Create Event - Primary */}
        <Button onClick={onCreateEvent} size="sm">
          <Plus className="mr-2 h-4 w-4" />
          Crear Evento
        </Button>
      </div>
    </div>;
}