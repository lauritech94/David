import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, FileText, Trash2, Copy, Check, X, Clock, Zap } from 'lucide-react';
import { toast } from '@/hooks/use-toast';

interface ResponseTemplate {
  id: string;
  name: string;
  type: 'aprobacion' | 'denegacion' | 'pendiente';
  solicitudType?: 'entrevista' | 'booking' | 'consulta' | 'informacion' | 'otro' | 'all';
  content: string;
}

// Plantillas predefinidas del sistema
const defaultTemplates: ResponseTemplate[] = [
  {
    id: 'approval-booking',
    name: 'Aprobación Booking',
    type: 'aprobacion',
    solicitudType: 'booking',
    content: `¡Genial! Confirmamos la participación en {{festival}}.

Próximos pasos:
- Enviar rider técnico
- Confirmar horarios de soundcheck
- Coordinar logística de viaje

Responsable: {{responsable}}`,
  },
  {
    id: 'approval-interview',
    name: 'Aprobación Entrevista',
    type: 'aprobacion',
    solicitudType: 'entrevista',
    content: `Confirmamos la entrevista para {{programa}}.

Detalles acordados:
- Fecha y hora: {{fecha}}
- Duración estimada: 30 minutos
- Formato: {{medio}}

Por favor, enviar preguntas previas si es posible.`,
  },
  {
    id: 'approval-general',
    name: 'Aprobación General',
    type: 'aprobacion',
    solicitudType: 'all',
    content: `Solicitud aprobada.

Se procede según lo acordado. Para cualquier duda, contactar con el equipo.`,
  },
  {
    id: 'denial-schedule',
    name: 'Denegación - Agenda',
    type: 'denegacion',
    solicitudType: 'all',
    content: `Lamentablemente no es posible confirmar esta solicitud debido a compromisos previos en la agenda.

Agradecemos el interés y quedamos abiertos a futuras oportunidades.`,
  },
  {
    id: 'denial-conditions',
    name: 'Denegación - Condiciones',
    type: 'denegacion',
    solicitudType: 'booking',
    content: `Tras revisar la propuesta, las condiciones ofrecidas no se ajustan a nuestros requerimientos actuales.

Estaríamos encantados de reconsiderar si hay margen para ajustar la oferta.`,
  },
  {
    id: 'pending-info',
    name: 'Pendiente - Más información',
    type: 'pendiente',
    solicitudType: 'all',
    content: `Necesitamos información adicional para tomar una decisión:

- {{info_requerida}}

Por favor, enviar los datos solicitados para continuar con la evaluación.`,
  },
  {
    id: 'pending-review',
    name: 'Pendiente - En revisión',
    type: 'pendiente',
    solicitudType: 'all',
    content: `La solicitud está siendo revisada por el equipo.

Tiempo estimado de respuesta: {{dias}} días hábiles.

Nos pondremos en contacto en breve.`,
  },
];

interface ResponseTemplatesProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelectTemplate: (content: string) => void;
  solicitudType?: 'entrevista' | 'booking' | 'consulta' | 'informacion' | 'otro';
  filterByStatus?: 'aprobacion' | 'denegacion' | 'pendiente';
}

export function ResponseTemplates({
  open,
  onOpenChange,
  onSelectTemplate,
  solicitudType,
  filterByStatus,
}: ResponseTemplatesProps) {
  const [templates] = useState<ResponseTemplate[]>(defaultTemplates);
  const [selectedType, setSelectedType] = useState<'all' | 'aprobacion' | 'denegacion' | 'pendiente'>(
    filterByStatus || 'all'
  );
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [newTemplate, setNewTemplate] = useState<{ name: string; type: 'aprobacion' | 'denegacion' | 'pendiente'; content: string }>({ name: '', type: 'aprobacion', content: '' });

  const filteredTemplates = templates.filter(t => {
    const matchesType = selectedType === 'all' || t.type === selectedType;
    const matchesSolicitud = !solicitudType || t.solicitudType === 'all' || t.solicitudType === solicitudType;
    return matchesType && matchesSolicitud;
  });

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'aprobacion':
        return <Check className="w-4 h-4 text-green-600" />;
      case 'denegacion':
        return <X className="w-4 h-4 text-red-600" />;
      case 'pendiente':
        return <Clock className="w-4 h-4 text-yellow-600" />;
      default:
        return <FileText className="w-4 h-4" />;
    }
  };

  const getTypeBadge = (type: string) => {
    switch (type) {
      case 'aprobacion':
        return <Badge className="bg-green-100 text-green-800 border-green-200">Aprobación</Badge>;
      case 'denegacion':
        return <Badge className="bg-red-100 text-red-800 border-red-200">Denegación</Badge>;
      case 'pendiente':
        return <Badge className="bg-yellow-100 text-yellow-800 border-yellow-200">Pendiente</Badge>;
      default:
        return <Badge variant="outline">{type}</Badge>;
    }
  };

  const handleSelectTemplate = (template: ResponseTemplate) => {
    onSelectTemplate(template.content);
    onOpenChange(false);
    toast({
      title: 'Plantilla aplicada',
      description: `Se ha cargado la plantilla "${template.name}"`,
    });
  };

  const handleCopyTemplate = (content: string, e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(content);
    toast({
      title: 'Copiado',
      description: 'Plantilla copiada al portapapeles',
    });
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Zap className="w-5 h-5 text-primary" />
              Plantillas de Respuesta Rápida
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            {/* Filtros */}
            <div className="flex gap-2">
              <Button
                variant={selectedType === 'all' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setSelectedType('all')}
              >
                Todas
              </Button>
              <Button
                variant={selectedType === 'aprobacion' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setSelectedType('aprobacion')}
                className="gap-1"
              >
                <Check className="w-3 h-3" />
                Aprobación
              </Button>
              <Button
                variant={selectedType === 'denegacion' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setSelectedType('denegacion')}
                className="gap-1"
              >
                <X className="w-3 h-3" />
                Denegación
              </Button>
              <Button
                variant={selectedType === 'pendiente' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setSelectedType('pendiente')}
                className="gap-1"
              >
                <Clock className="w-3 h-3" />
                Pendiente
              </Button>
            </div>

            {/* Lista de plantillas */}
            <div className="grid gap-3">
              {filteredTemplates.map(template => (
                <Card
                  key={template.id}
                  className="cursor-pointer hover:border-primary transition-colors"
                  onClick={() => handleSelectTemplate(template)}
                >
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex items-start gap-3 flex-1">
                        {getTypeIcon(template.type)}
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <h4 className="font-medium text-foreground">{template.name}</h4>
                            {getTypeBadge(template.type)}
                            {template.solicitudType && template.solicitudType !== 'all' && (
                              <Badge variant="outline" className="text-xs">
                                {template.solicitudType}
                              </Badge>
                            )}
                          </div>
                          <p className="text-sm text-muted-foreground line-clamp-2">
                            {template.content.replace(/\{\{[^}]+\}\}/g, '[...]')}
                          </p>
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={(e) => handleCopyTemplate(template.content, e)}
                      >
                        <Copy className="w-4 h-4" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}

              {filteredTemplates.length === 0 && (
                <div className="text-center py-8 text-muted-foreground">
                  No hay plantillas disponibles para estos filtros
                </div>
              )}
            </div>

            {/* Botón crear plantilla */}
            <Button
              variant="outline"
              className="w-full gap-2"
              onClick={() => setShowCreateDialog(true)}
            >
              <Plus className="w-4 h-4" />
              Crear plantilla personalizada
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Diálogo para crear plantilla */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nueva Plantilla</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Nombre</Label>
              <Input
                value={newTemplate.name}
                onChange={(e) => setNewTemplate(prev => ({ ...prev, name: e.target.value }))}
                placeholder="Ej: Aprobación Festival"
              />
            </div>
            <div>
              <Label>Tipo</Label>
              <Select
                value={newTemplate.type}
                onValueChange={(v: 'aprobacion' | 'denegacion' | 'pendiente') => 
                  setNewTemplate(prev => ({ ...prev, type: v }))
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="aprobacion">Aprobación</SelectItem>
                  <SelectItem value="denegacion">Denegación</SelectItem>
                  <SelectItem value="pendiente">Pendiente</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Contenido</Label>
              <Textarea
                value={newTemplate.content}
                onChange={(e) => setNewTemplate(prev => ({ ...prev, content: e.target.value }))}
                placeholder="Usa {{variable}} para campos dinámicos"
                rows={5}
              />
              <p className="text-xs text-muted-foreground mt-1">
                Variables disponibles: {'{{festival}}'}, {'{{programa}}'}, {'{{fecha}}'}, {'{{responsable}}'}
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
              Cancelar
            </Button>
            <Button onClick={() => {
              toast({
                title: 'Plantilla guardada',
                description: 'La plantilla se ha creado correctamente (demo)',
              });
              setShowCreateDialog(false);
              setNewTemplate({ name: '', type: 'aprobacion', content: '' });
            }}>
              Guardar Plantilla
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
