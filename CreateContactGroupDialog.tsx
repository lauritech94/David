import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { Users, Music, Building2, Mic2, Wrench, Newspaper, Scale, Palette, Headphones, Video, DollarSign } from 'lucide-react';

interface CreateContactGroupDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onGroupCreated: () => void;
}

const COLORS = [
  { value: '#3b82f6', label: 'Azul' },
  { value: '#10b981', label: 'Verde' },
  { value: '#f59e0b', label: 'Naranja' },
  { value: '#ef4444', label: 'Rojo' },
  { value: '#8b5cf6', label: 'Morado' },
  { value: '#ec4899', label: 'Rosa' },
  { value: '#06b6d4', label: 'Cian' },
  { value: '#84cc16', label: 'Lima' },
];

export const GROUP_TYPES = [
  { value: 'general', label: 'General', icon: Users, description: 'Grupo personalizado' },
  { value: 'banda', label: 'Mi Banda', icon: Music, description: 'Músicos y artistas de tu proyecto' },
  { value: 'sello', label: 'Mi Sello', icon: Building2, description: 'Equipo del sello discográfico' },
  { value: 'management', label: 'Management', icon: Mic2, description: 'Mánagers y representantes' },
  { value: 'tecnico', label: 'Equipo Técnico', icon: Wrench, description: 'Técnicos de sonido, luz, backline' },
  { value: 'prensa', label: 'Prensa', icon: Newspaper, description: 'Periodistas y medios' },
  { value: 'legal', label: 'Legal', icon: Scale, description: 'Abogados y asesores legales' },
  { value: 'artistico', label: 'Equipo Artístico', icon: Palette, description: 'Diseñadores, fotógrafos, videógrafos' },
  { value: 'produccion', label: 'Producción', icon: Headphones, description: 'Productores e ingenieros' },
  { value: 'audiovisual', label: 'Audiovisual', icon: Video, description: 'Equipo de vídeo y streaming' },
  { value: 'contabilidad', label: 'Contabilidad', icon: DollarSign, description: 'Contables y gestores' },
];

export function CreateContactGroupDialog({ open, onOpenChange, onGroupCreated }: CreateContactGroupDialogProps) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [color, setColor] = useState(COLORS[0].value);
  const [groupType, setGroupType] = useState('general');
  const [loading, setLoading] = useState(false);

  const handleTypeChange = (type: string) => {
    setGroupType(type);
    const typeInfo = GROUP_TYPES.find(t => t.value === type);
    if (typeInfo && type !== 'general') {
      setName(typeInfo.label);
      setDescription(typeInfo.description);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!name.trim()) {
      toast({
        title: "Error",
        description: "El nombre del grupo es obligatorio",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('No user found');

      const typeInfo = GROUP_TYPES.find(t => t.value === groupType);

      const { error } = await supabase
        .from('contact_groups')
        .insert({
          name: name.trim(),
          description: description.trim() || null,
          color,
          group_type: groupType,
          icon: typeInfo?.icon.name || 'Users',
          created_by: user.id,
        });

      if (error) throw error;

      toast({
        title: "Grupo creado",
        description: "El grupo se ha creado correctamente",
      });

      setName('');
      setDescription('');
      setColor(COLORS[0].value);
      setGroupType('general');
      onGroupCreated();
      onOpenChange(false);
    } catch (error) {
      console.error('Error creating group:', error);
      toast({
        title: "Error",
        description: "No se pudo crear el grupo",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Crear Grupo de Contactos</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label>Tipo de grupo</Label>
            <Select value={groupType} onValueChange={handleTypeChange}>
              <SelectTrigger className="mt-1">
                <SelectValue placeholder="Selecciona un tipo" />
              </SelectTrigger>
              <SelectContent>
                {GROUP_TYPES.map((type) => {
                  const Icon = type.icon;
                  return (
                    <SelectItem key={type.value} value={type.value}>
                      <div className="flex items-center gap-2">
                        <Icon className="w-4 h-4" />
                        <span>{type.label}</span>
                      </div>
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground mt-1">
              {GROUP_TYPES.find(t => t.value === groupType)?.description}
            </p>
          </div>

          <div>
            <Label htmlFor="name">Nombre del grupo *</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ej: Equipo de Ana, Prensa Musical, Banda Principal..."
              maxLength={100}
            />
          </div>

          <div>
            <Label htmlFor="description">Descripción</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Descripción opcional del grupo"
              rows={3}
            />
          </div>

          <div>
            <Label>Color</Label>
            <div className="flex gap-2 mt-2">
              {COLORS.map((c) => (
                <button
                  key={c.value}
                  type="button"
                  onClick={() => setColor(c.value)}
                  className="w-8 h-8 rounded-full border-2 transition-all"
                  style={{
                    backgroundColor: c.value,
                    borderColor: color === c.value ? '#000' : 'transparent',
                    transform: color === c.value ? 'scale(1.2)' : 'scale(1)',
                  }}
                  title={c.label}
                />
              ))}
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? 'Creando...' : 'Crear Grupo'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
