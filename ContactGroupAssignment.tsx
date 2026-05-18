import { useState, useEffect } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { Loader2 } from 'lucide-react';

interface ContactGroup {
  id: string;
  name: string;
  color: string | null;
}

interface ContactGroupAssignmentProps {
  contactId: string;
}

export function ContactGroupAssignment({ contactId }: ContactGroupAssignmentProps) {
  const [groups, setGroups] = useState<ContactGroup[]>([]);
  const [assignedGroups, setAssignedGroups] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchData();
  }, [contactId]);

  const fetchData = async () => {
    setLoading(true);
    try {
      // Fetch all groups
      const { data: groupsData, error: groupsError } = await supabase
        .from('contact_groups')
        .select('id, name, color')
        .order('name');

      if (groupsError) throw groupsError;

      // Fetch assigned groups for this contact
      const { data: assignedData, error: assignedError } = await supabase
        .from('contact_group_members')
        .select('group_id')
        .eq('contact_id', contactId);

      if (assignedError) throw assignedError;

      setGroups(groupsData || []);
      setAssignedGroups(new Set(assignedData?.map(a => a.group_id) || []));
    } catch (error) {
      console.error('Error fetching groups:', error);
      toast({
        title: "Error",
        description: "No se pudieron cargar los grupos",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleToggleGroup = async (groupId: string, isChecked: boolean) => {
    setSaving(true);
    try {
      if (isChecked) {
        // Add to group
        const { error } = await supabase
          .from('contact_group_members')
          .insert({
            group_id: groupId,
            contact_id: contactId,
          });

        if (error) throw error;

        setAssignedGroups(prev => new Set([...prev, groupId]));
        toast({
          title: "Añadido al grupo",
          description: "El contacto se ha añadido al grupo",
        });
      } else {
        // Remove from group
        const { error } = await supabase
          .from('contact_group_members')
          .delete()
          .eq('group_id', groupId)
          .eq('contact_id', contactId);

        if (error) throw error;

        setAssignedGroups(prev => {
          const newSet = new Set(prev);
          newSet.delete(groupId);
          return newSet;
        });
        toast({
          title: "Eliminado del grupo",
          description: "El contacto se ha eliminado del grupo",
        });
      }
    } catch (error) {
      console.error('Error updating group:', error);
      toast({
        title: "Error",
        description: "No se pudo actualizar el grupo",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="w-6 h-6 animate-spin" />
      </div>
    );
  }

  if (groups.length === 0) {
    return (
      <div className="text-center py-4 text-muted-foreground text-sm">
        No hay grupos creados. Crea grupos para organizar tus contactos.
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <Label>Grupos</Label>
      <div className="space-y-2 max-h-48 overflow-y-auto border rounded-md p-3">
        {groups.map((group) => (
          <div key={group.id} className="flex items-center space-x-2">
            <Checkbox
              id={`group-${group.id}`}
              checked={assignedGroups.has(group.id)}
              onCheckedChange={(checked) => handleToggleGroup(group.id, checked as boolean)}
              disabled={saving}
            />
            <Label
              htmlFor={`group-${group.id}`}
              className="flex items-center gap-2 cursor-pointer"
            >
              <div
                className="w-3 h-3 rounded-full"
                style={{ backgroundColor: group.color || '#3b82f6' }}
              />
              {group.name}
            </Label>
          </div>
        ))}
      </div>
    </div>
  );
}