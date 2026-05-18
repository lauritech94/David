import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { UserPlus, X, Users, Crown, Calendar, Truck, Music } from 'lucide-react';
import type { ArtistFormData, TeamMember } from '../ArtistOnboardingWizard';

interface Step2TeamProps {
  formData: ArtistFormData;
  updateFormData: (updates: Partial<ArtistFormData>) => void;
  onValidationChange: (isValid: boolean) => void;
}

const ROLES = [
  { value: 'MANAGER', label: 'Manager', description: 'Acceso completo', icon: Crown },
  { value: 'BOOKER', label: 'Booker', description: 'Calendario y ofertas', icon: Calendar },
  { value: 'TOUR_MANAGER', label: 'Tour Manager', description: 'Logística y hojas de ruta', icon: Truck },
  { value: 'ARTIST', label: 'Artista', description: 'Solo lectura', icon: Music },
] as const;

export function Step2Team({ formData, updateFormData, onValidationChange }: Step2TeamProps) {
  const { user } = useAuth();
  const [newEmail, setNewEmail] = useState('');
  const [newRole, setNewRole] = useState<TeamMember['role']>('MANAGER');

  // Always valid (optional step)
  useEffect(() => {
    onValidationChange(true);
  }, [onValidationChange]);

  // Fetch workspace members
  const { data: workspaceMembers = [] } = useQuery({
    queryKey: ['workspace-members-onboarding'],
    queryFn: async () => {
      if (!user?.id) return [];

      const { data: membership } = await supabase
        .from('workspace_memberships')
        .select('workspace_id')
        .eq('user_id', user.id)
        .single();

      if (!membership) return [];

      const { data: members } = await supabase
        .from('workspace_memberships')
        .select(`
          user_id,
          role,
          profiles:profiles!workspace_memberships_user_id_fkey (
            id,
            full_name,
            email,
            avatar_url
          )
        `)
        .eq('workspace_id', membership.workspace_id);

      return (members || []).map((m: any) => ({
        userId: m.user_id,
        name: m.profiles?.full_name || '',
        email: m.profiles?.email || '',
        avatarUrl: m.profiles?.avatar_url,
      }));
    },
    enabled: !!user?.id,
  });

  const handleAddMember = () => {
    if (!newEmail.trim()) return;

    const existingMember = workspaceMembers.find(
      (m) => m.email?.toLowerCase() === newEmail.toLowerCase()
    );

    const member: TeamMember = {
      email: newEmail.trim(),
      role: newRole,
      name: existingMember?.name,
      isExisting: !!existingMember,
      userId: existingMember?.userId,
    };

    // Avoid duplicates
    if (formData.teamMembers.some((m) => m.email === member.email)) {
      return;
    }

    updateFormData({
      teamMembers: [...formData.teamMembers, member],
    });

    setNewEmail('');
  };

  const handleRemoveMember = (email: string) => {
    updateFormData({
      teamMembers: formData.teamMembers.filter((m) => m.email !== email),
    });
  };

  const handleSelectExisting = (member: typeof workspaceMembers[0]) => {
    if (formData.teamMembers.some((m) => m.email === member.email)) {
      return;
    }

    updateFormData({
      teamMembers: [
        ...formData.teamMembers,
        {
          email: member.email,
          role: 'MANAGER',
          name: member.name,
          isExisting: true,
          userId: member.userId,
        },
      ],
    });
  };

  const getRoleIcon = (role: TeamMember['role']) => {
    const roleConfig = ROLES.find((r) => r.value === role);
    return roleConfig?.icon || Users;
  };

  return (
    <div className="space-y-6">
      {/* Existing Workspace Members */}
      {workspaceMembers.length > 0 && (
        <div className="space-y-3">
          <Label className="text-base font-medium">Miembros del Workspace</Label>
          <p className="text-sm text-muted-foreground">
            Selecciona usuarios existentes para añadirlos al equipo del artista
          </p>
          
          <div className="flex flex-wrap gap-2">
            {workspaceMembers.map((member) => {
              const isAdded = formData.teamMembers.some((m) => m.email === member.email);
              
              return (
                <Button
                  key={member.userId}
                  type="button"
                  variant={isAdded ? 'secondary' : 'outline'}
                  size="sm"
                  onClick={() => !isAdded && handleSelectExisting(member)}
                  disabled={isAdded}
                  className="gap-2"
                >
                  <Avatar className="w-5 h-5">
                    <AvatarImage src={member.avatarUrl} />
                    <AvatarFallback className="text-xs">
                      {(member.name || member.email)?.[0]?.toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  {member.name || member.email}
                  {isAdded && <Badge variant="outline" className="ml-1">Añadido</Badge>}
                </Button>
              );
            })}
          </div>
        </div>
      )}

      {/* Add by Email */}
      <div className="space-y-3">
        <Label className="text-base font-medium">Invitar por Email</Label>
        <div className="flex gap-2">
          <Input
            placeholder="email@ejemplo.com"
            value={newEmail}
            onChange={(e) => setNewEmail(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleAddMember()}
            className="flex-1"
          />
          <Select value={newRole} onValueChange={(v) => setNewRole(v as TeamMember['role'])}>
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {ROLES.map((role) => (
                <SelectItem key={role.value} value={role.value}>
                  <div className="flex items-center gap-2">
                    <role.icon className="w-4 h-4" />
                    {role.label}
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button type="button" onClick={handleAddMember}>
            <UserPlus className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Team Members List */}
      {formData.teamMembers.length > 0 && (
        <div className="space-y-3">
          <Label className="text-base font-medium">Equipo del Artista</Label>
          <div className="space-y-2">
            {formData.teamMembers.map((member) => {
              const RoleIcon = getRoleIcon(member.role);
              const roleConfig = ROLES.find((r) => r.value === member.role);
              
              return (
                <Card key={member.email}>
                  <CardContent className="p-3 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Avatar className="w-10 h-10">
                        <AvatarFallback>
                          {(member.name || member.email)?.[0]?.toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="font-medium">{member.name || member.email}</p>
                        {member.name && (
                          <p className="text-sm text-muted-foreground">{member.email}</p>
                        )}
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <Select
                        value={member.role}
                        onValueChange={(value) => {
                          updateFormData({
                            teamMembers: formData.teamMembers.map((m) =>
                              m.email === member.email
                                ? { ...m, role: value as TeamMember['role'] }
                                : m
                            ),
                          });
                        }}
                      >
                        <SelectTrigger className="w-36">
                          <SelectValue>
                            <div className="flex items-center gap-2">
                              <RoleIcon className="w-4 h-4" />
                              {roleConfig?.label}
                            </div>
                          </SelectValue>
                        </SelectTrigger>
                        <SelectContent>
                          {ROLES.map((role) => (
                            <SelectItem key={role.value} value={role.value}>
                              <div className="flex items-center gap-2">
                                <role.icon className="w-4 h-4" />
                                <div>
                                  <p>{role.label}</p>
                                  <p className="text-xs text-muted-foreground">
                                    {role.description}
                                  </p>
                                </div>
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>

                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => handleRemoveMember(member.email)}
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      )}

      {formData.teamMembers.length === 0 && (
        <div className="text-center py-8 text-muted-foreground">
          <Users className="w-12 h-12 mx-auto mb-3 opacity-50" />
          <p>No hay miembros en el equipo aún</p>
          <p className="text-sm">Puedes añadir miembros ahora o hacerlo más tarde</p>
        </div>
      )}
    </div>
  );
}
