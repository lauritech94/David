import { Button } from '@/components/ui/button';
import { Contact } from 'lucide-react';
import { ContactInfo } from '@/hooks/useEPK';

interface VCardDownloadProps {
  contacts: Array<{
    role: string;
    data: ContactInfo;
  }>;
  artistName: string;
}

export const VCardDownload: React.FC<VCardDownloadProps> = ({ contacts, artistName }) => {
  const generateVCard = () => {
    const vCardData = contacts
      .filter(contact => contact.data?.mostrar && contact.data.nombre)
      .map(contact => {
        const lines = [
          'BEGIN:VCARD',
          'VERSION:3.0',
          `FN:${contact.data.nombre}`,
          `TITLE:${contact.role}`,
          `ORG:${artistName}`,
          ...(contact.data.email ? [`EMAIL:${contact.data.email}`] : []),
          ...(contact.data.telefono ? [`TEL:${contact.data.telefono}`] : []),
          ...(contact.data.whatsapp ? [`TEL;TYPE=CELL:${contact.data.whatsapp}`] : []),
          'END:VCARD'
        ];
        
        return lines.join('\n');
      });
    
    return vCardData.join('\n\n');
  };

  const downloadVCard = () => {
    const visibleContacts = contacts.filter(contact => contact.data?.mostrar && contact.data.nombre);
    
    if (visibleContacts.length === 0) return;

    const vCardContent = generateVCard();
    const blob = new Blob([vCardContent], { type: 'text/vcard;charset=utf-8' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${artistName}_contactos.vcf`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
  };

  const visibleContactsCount = contacts.filter(contact => contact.data?.mostrar && contact.data.nombre).length;

  if (visibleContactsCount === 0) return null;

  return (
    <Button 
      variant="outline" 
      onClick={downloadVCard}
      className="flex items-center gap-2"
    >
      <Contact className="w-4 h-4" />
      Descargar Contactos ({visibleContactsCount})
    </Button>
  );
};