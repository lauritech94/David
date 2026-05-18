import { Mail, Settings } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';
import { toast } from '@/hooks/use-toast';

export default function Correo() {
  return (
    <div className="flex h-full items-center justify-center p-8">
      <EmptyState
        icon={<Mail className="w-8 h-8 text-muted-foreground" />}
        title="Correo no configurado"
        description="Conecta tu cuenta de Gmail u Outlook para gestionar tus correos directamente desde MOODITA. Esta funcionalidad estará disponible próximamente."
        action={{
          label: 'Configurar cuenta de correo',
          onClick: () => toast({ 
            title: 'Próximamente', 
            description: 'La integración con proveedores de correo estará disponible pronto.' 
          }),
        }}
        size="lg"
      />
    </div>
  );
}
