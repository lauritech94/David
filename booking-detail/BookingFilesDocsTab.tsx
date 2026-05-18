import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { FileText, FolderOpen } from 'lucide-react';
import { BookingDocumentsTab } from './BookingDocumentsTab';
import { BookingDriveTab } from './BookingDriveTab';

interface BookingFilesDocsTabProps {
  booking: {
    id: string;
    artist_id?: string;
    folder_url?: string;
    festival_ciclo?: string;
    lugar?: string;
    ciudad?: string;
    pais?: string;
    venue?: string;
    hora?: string;
    fee?: number;
    formato?: string;
    condiciones?: string;
    es_internacional?: boolean;
    fecha?: string;
    promotor?: string;
    contacto?: string;
    capacidad?: number;
    duracion?: string;
  };
  artistName?: string;
  onUpdate: () => void;
}

export function BookingFilesDocsTab({ booking, artistName, onUpdate }: BookingFilesDocsTabProps) {
  return (
    <Tabs defaultValue="docs" className="w-full">
      <TabsList className="grid w-full grid-cols-2 mb-4">
        <TabsTrigger value="docs" className="flex items-center gap-2 text-sm">
          <FileText className="h-3.5 w-3.5" />
          Contratos & Docs
        </TabsTrigger>
        <TabsTrigger value="explorer" className="flex items-center gap-2 text-sm">
          <FolderOpen className="h-3.5 w-3.5" />
          Explorador
        </TabsTrigger>
      </TabsList>

      <TabsContent value="docs">
        <BookingDocumentsTab booking={booking} artistName={artistName} onUpdate={onUpdate} />
      </TabsContent>

      <TabsContent value="explorer">
        <BookingDriveTab
          bookingId={booking.id}
          artistId={booking.artist_id}
          folderUrl={booking.folder_url}
          eventName={booking.festival_ciclo || booking.lugar || booking.ciudad || 'Evento'}
          eventDate={booking.fecha}
          bookingData={{
            ciudad: booking.ciudad,
            pais: booking.pais,
            venue: booking.venue,
            hora: booking.hora,
            fee: booking.fee,
            formato: booking.formato,
            festival_ciclo: booking.festival_ciclo,
            condiciones: booking.condiciones,
            es_internacional: booking.es_internacional,
          }}
        />
      </TabsContent>
    </Tabs>
  );
}
