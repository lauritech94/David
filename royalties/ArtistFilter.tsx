import { useState } from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Users } from 'lucide-react';

interface ArtistFilterProps {
  value: string;
  onChange: (artistId: string) => void;
}

export function ArtistFilter({ value, onChange }: ArtistFilterProps) {
  const { data: artists = [] } = useQuery({
    queryKey: ['artists'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('artists')
        .select('id, name, stage_name')
        .order('name');
      if (error) throw error;
      return data;
    },
  });

  if (artists.length === 0) return null;

  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger className="w-48">
        <Users className="h-4 w-4 mr-2" />
        <SelectValue placeholder="Todos los artistas" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="all">Todos los artistas</SelectItem>
        {artists.map(artist => (
          <SelectItem key={artist.id} value={artist.id}>
            {artist.stage_name || artist.name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
