import { useEffect, useRef, useState } from 'react';
import { ImageCropperDialog } from '@/components/ui/image-cropper-dialog';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Camera, Upload, User, Music, Instagram, Loader2 } from 'lucide-react';
import type { ArtistFormData } from '../ArtistOnboardingWizard';

interface Step1IdentityProps {
  formData: ArtistFormData;
  updateFormData: (updates: Partial<ArtistFormData>) => void;
  onValidationChange: (isValid: boolean) => void;
}

const GENRES = [
  'Pop', 'Rock', 'Hip-Hop', 'R&B', 'Electrónica', 'Reggaeton', 
  'Indie', 'Jazz', 'Clásica', 'Folk', 'Metal', 'Latina', 'Otro'
];

export function Step1Identity({ formData, updateFormData, onValidationChange }: Step1IdentityProps) {
  const avatarInputRef = useRef<HTMLInputElement>(null);
  const headerInputRef = useRef<HTMLInputElement>(null);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const [isUploadingHeader, setIsUploadingHeader] = useState(false);
  const [cropFile, setCropFile] = useState<File | null>(null);
  const [cropType, setCropType] = useState<'avatar' | 'header'>('avatar');

  // Validate step
  useEffect(() => {
    const isValid = formData.name.trim().length >= 2;
    onValidationChange(isValid);
  }, [formData.name, onValidationChange]);

  const handleImageUpload = async (
    blob: Blob,
    type: 'avatar' | 'header'
  ) => {
    const setLoading = type === 'avatar' ? setIsUploadingAvatar : setIsUploadingHeader;
    setLoading(true);

    try {
      const fileName = `${type}-${Date.now()}.jpg`;
      const filePath = `temp/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('artist-assets')
        .upload(filePath, blob, { contentType: 'image/jpeg' });

      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage
        .from('artist-assets')
        .getPublicUrl(filePath);

      if (type === 'avatar') {
        updateFormData({ avatarUrl: urlData.publicUrl });
      } else {
        updateFormData({ headerImageUrl: urlData.publicUrl });
      }

      toast({ title: 'Imagen subida correctamente' });
    } catch (error: any) {
      toast({
        title: 'Error al subir imagen',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Avatar & Header */}
      <div className="flex flex-col md:flex-row gap-6">
        {/* Avatar Upload */}
        <div className="flex flex-col items-center gap-3">
          <Label className="text-sm font-medium">Avatar / Logo</Label>
          <div className="relative group">
            <Avatar className="w-24 h-24 border-2 border-dashed border-muted-foreground/30">
              <AvatarImage src={formData.avatarUrl || undefined} />
              <AvatarFallback className="bg-muted">
                <User className="w-10 h-10 text-muted-foreground" />
              </AvatarFallback>
            </Avatar>
            <Button
              type="button"
              size="icon"
              variant="secondary"
              className="absolute bottom-0 right-0 rounded-full w-8 h-8"
              onClick={() => avatarInputRef.current?.click()}
              disabled={isUploadingAvatar}
            >
              {isUploadingAvatar ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Camera className="w-4 h-4" />
              )}
            </Button>
          </div>
          <input
            ref={avatarInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) {
                setCropType('avatar');
                setCropFile(file);
              }
            }}
          />
        </div>

        {/* Header Image Upload */}
        <div className="flex-1">
          <Label className="text-sm font-medium">Imagen de Cabecera (EPK)</Label>
          <div
            className="mt-2 h-32 border-2 border-dashed border-muted-foreground/30 rounded-lg flex items-center justify-center cursor-pointer hover:border-primary/50 transition-colors overflow-hidden relative"
            onClick={() => headerInputRef.current?.click()}
          >
            {formData.headerImageUrl ? (
              <img
                src={formData.headerImageUrl}
                alt="Header"
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="text-center text-muted-foreground">
                {isUploadingHeader ? (
                  <Loader2 className="w-8 h-8 mx-auto animate-spin" />
                ) : (
                  <>
                    <Upload className="w-8 h-8 mx-auto mb-2" />
                    <p className="text-sm">Click para subir</p>
                  </>
                )}
              </div>
            )}
          </div>
          <input
            ref={headerInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) {
                setCropType('header');
                setCropFile(file);
              }
            }}
          />
        </div>
      </div>

      <ImageCropperDialog
        file={cropFile}
        open={!!cropFile}
        onCancel={() => setCropFile(null)}
        onConfirm={(blob) => {
          const type = cropType;
          setCropFile(null);
          handleImageUpload(blob, type);
        }}
        aspectRatio={cropType === 'avatar' ? 1 : 16 / 9}
        circular={cropType === 'avatar'}
        title={cropType === 'avatar' ? 'Ajustar avatar' : 'Ajustar cabecera'}
      />

      {/* Name Fields */}
      <div className="grid md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="name">Nombre Artístico *</Label>
          <Input
            id="name"
            placeholder="Nombre del artista"
            value={formData.name}
            onChange={(e) => updateFormData({ name: e.target.value })}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="legalName">Nombre Legal (contratos)</Label>
          <Input
            id="legalName"
            placeholder="Nombre completo para contratos"
            value={formData.legalName}
            onChange={(e) => updateFormData({ legalName: e.target.value })}
          />
        </div>
      </div>

      {/* Genre */}
      <div className="space-y-2">
        <Label htmlFor="genre">Género Musical</Label>
        <div className="flex flex-wrap gap-2">
          {GENRES.map((genre) => (
            <Button
              key={genre}
              type="button"
              variant={formData.genre === genre ? 'default' : 'outline'}
              size="sm"
              onClick={() => updateFormData({ genre })}
            >
              {genre}
            </Button>
          ))}
        </div>
      </div>

      {/* Social Links */}
      <div className="space-y-4">
        <Label className="text-base font-medium">Redes Sociales</Label>
        
        <div className="grid md:grid-cols-3 gap-4">
          <div className="space-y-2">
            <Label htmlFor="spotify" className="flex items-center gap-2 text-sm">
              <Music className="w-4 h-4 text-green-500" />
              Spotify
            </Label>
            <Input
              id="spotify"
              placeholder="https://open.spotify.com/artist/..."
              value={formData.spotifyUrl}
              onChange={(e) => updateFormData({ spotifyUrl: e.target.value })}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="instagram" className="flex items-center gap-2 text-sm">
              <Instagram className="w-4 h-4 text-pink-500" />
              Instagram
            </Label>
            <Input
              id="instagram"
              placeholder="https://instagram.com/..."
              value={formData.instagramUrl}
              onChange={(e) => updateFormData({ instagramUrl: e.target.value })}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="tiktok" className="flex items-center gap-2 text-sm">
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                <path d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-5.2 1.74 2.89 2.89 0 012.31-4.64 2.93 2.93 0 01.88.13V9.4a6.84 6.84 0 00-1-.05A6.33 6.33 0 005 20.1a6.34 6.34 0 0010.86-4.43v-7a8.16 8.16 0 004.77 1.52v-3.4a4.85 4.85 0 01-1-.1z" />
              </svg>
              TikTok
            </Label>
            <Input
              id="tiktok"
              placeholder="https://tiktok.com/@..."
              value={formData.tiktokUrl}
              onChange={(e) => updateFormData({ tiktokUrl: e.target.value })}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
