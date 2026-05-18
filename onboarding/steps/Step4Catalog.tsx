import { useEffect, useState } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Slider } from '@/components/ui/slider';
import { Textarea } from '@/components/ui/textarea';
import { Plus, Trash2, Music, Users, Percent } from 'lucide-react';
import type { ArtistFormData, RoyaltySplit, SongEntry } from '../ArtistOnboardingWizard';

interface Step4CatalogProps {
  formData: ArtistFormData;
  updateFormData: (updates: Partial<ArtistFormData>) => void;
  onValidationChange: (isValid: boolean) => void;
}

const ROLES = [
  { value: 'artist', label: 'Artista' },
  { value: 'manager', label: 'Manager' },
  { value: 'producer', label: 'Productor' },
  { value: 'writer', label: 'Compositor' },
  { value: 'publisher', label: 'Editorial' },
];

export function Step4Catalog({ formData, updateFormData, onValidationChange }: Step4CatalogProps) {
  const [songInput, setSongInput] = useState('');
  const [bulkInput, setBulkInput] = useState('');

  // Always valid (optional step)
  useEffect(() => {
    onValidationChange(true);
  }, [onValidationChange]);

  // Calculate total percentage
  const totalPercentage = formData.defaultSplits.reduce((sum, s) => sum + s.percentage, 0);

  // Add single song
  const handleAddSong = () => {
    if (!songInput.trim()) return;
    
    updateFormData({
      songs: [...formData.songs, { title: songInput.trim() }],
    });
    setSongInput('');
  };

  // Add songs in bulk
  const handleBulkAdd = () => {
    if (!bulkInput.trim()) return;
    
    const lines = bulkInput.split('\n').filter((l) => l.trim());
    const newSongs: SongEntry[] = lines.map((line) => {
      const [title, isrc] = line.split(',').map((s) => s.trim());
      return { title, isrc: isrc || undefined };
    });

    updateFormData({
      songs: [...formData.songs, ...newSongs],
    });
    setBulkInput('');
  };

  // Remove song
  const handleRemoveSong = (index: number) => {
    updateFormData({
      songs: formData.songs.filter((_, i) => i !== index),
    });
  };

  // Update split percentage
  const handleSplitChange = (index: number, percentage: number) => {
    updateFormData({
      defaultSplits: formData.defaultSplits.map((s, i) =>
        i === index ? { ...s, percentage } : s
      ),
    });
  };

  // Add new split
  const handleAddSplit = () => {
    updateFormData({
      defaultSplits: [
        ...formData.defaultSplits,
        { recipientName: '', recipientRole: 'artist', percentage: 0 },
      ],
    });
  };

  // Remove split
  const handleRemoveSplit = (index: number) => {
    updateFormData({
      defaultSplits: formData.defaultSplits.filter((_, i) => i !== index),
    });
  };

  // Update split name/role
  const handleSplitFieldChange = (
    index: number,
    field: 'recipientName' | 'recipientRole',
    value: string
  ) => {
    updateFormData({
      defaultSplits: formData.defaultSplits.map((s, i) =>
        i === index ? { ...s, [field]: value } : s
      ),
    });
  };

  return (
    <div className="space-y-8">
      {/* Default Royalty Splits */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Percent className="w-5 h-5 text-primary" />
            <Label className="text-base font-medium">Splits por Defecto</Label>
          </div>
          <div
            className={`text-sm font-medium ${
              totalPercentage === 100
                ? 'text-green-600'
                : totalPercentage > 100
                ? 'text-red-600'
                : 'text-yellow-600'
            }`}
          >
            Total: {totalPercentage}%
          </div>
        </div>

        <p className="text-sm text-muted-foreground">
          Define los splits por defecto para royalties. Se aplicarán automáticamente a nuevos ingresos.
        </p>

        <div className="space-y-3">
          {formData.defaultSplits.map((split, index) => (
            <Card key={index}>
              <CardContent className="p-4 space-y-3">
                <div className="flex gap-3">
                  <Input
                    placeholder="Nombre"
                    value={split.recipientName}
                    onChange={(e) =>
                      handleSplitFieldChange(index, 'recipientName', e.target.value)
                    }
                    className="flex-1"
                  />
                  <select
                    value={split.recipientRole}
                    onChange={(e) =>
                      handleSplitFieldChange(index, 'recipientRole', e.target.value)
                    }
                    className="px-3 py-2 border rounded-md bg-background"
                  >
                    {ROLES.map((role) => (
                      <option key={role.value} value={role.value}>
                        {role.label}
                      </option>
                    ))}
                  </select>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => handleRemoveSplit(index)}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>

                <div className="flex items-center gap-4">
                  <Slider
                    value={[split.percentage]}
                    onValueChange={([value]) => handleSplitChange(index, value)}
                    max={100}
                    step={1}
                    className="flex-1"
                  />
                  <div className="w-16 text-right font-medium">
                    {split.percentage}%
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}

          <Button type="button" variant="outline" onClick={handleAddSplit} className="w-full">
            <Plus className="w-4 h-4 mr-2" />
            Añadir Split
          </Button>
        </div>
      </div>

      {/* Songs Catalog */}
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <Music className="w-5 h-5 text-primary" />
          <Label className="text-base font-medium">Catálogo de Canciones</Label>
        </div>

        <p className="text-sm text-muted-foreground">
          Añade canciones individualmente o en bulk (una por línea, opcionalmente con ISRC separado por coma).
        </p>

        {/* Single Song Input */}
        <div className="flex gap-2">
          <Input
            placeholder="Título de la canción"
            value={songInput}
            onChange={(e) => setSongInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleAddSong()}
            className="flex-1"
          />
          <Button type="button" onClick={handleAddSong}>
            <Plus className="w-4 h-4" />
          </Button>
        </div>

        {/* Bulk Input */}
        <div className="space-y-2">
          <Label className="text-sm">Añadir en bulk (una canción por línea)</Label>
          <Textarea
            placeholder="Canción 1, ESXXX0000001&#10;Canción 2, ESXXX0000002&#10;Canción 3"
            value={bulkInput}
            onChange={(e) => setBulkInput(e.target.value)}
            rows={4}
          />
          <Button
            type="button"
            variant="outline"
            onClick={handleBulkAdd}
            disabled={!bulkInput.trim()}
          >
            Importar Canciones
          </Button>
        </div>

        {/* Songs List */}
        {formData.songs.length > 0 && (
          <div className="space-y-2 max-h-48 overflow-y-auto">
            {formData.songs.map((song, index) => (
              <div
                key={index}
                className="flex items-center justify-between p-2 bg-muted/50 rounded-lg"
              >
                <div>
                  <p className="font-medium">{song.title}</p>
                  {song.isrc && (
                    <p className="text-xs text-muted-foreground">ISRC: {song.isrc}</p>
                  )}
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => handleRemoveSong(index)}
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            ))}
          </div>
        )}

        {formData.songs.length === 0 && (
          <div className="text-center py-6 text-muted-foreground border-2 border-dashed rounded-lg">
            <Music className="w-10 h-10 mx-auto mb-2 opacity-50" />
            <p>No hay canciones añadidas</p>
            <p className="text-sm">Puedes añadirlas ahora o más tarde</p>
          </div>
        )}
      </div>
    </div>
  );
}
