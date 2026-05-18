import { useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Calendar, Palette, Link, CheckCircle } from 'lucide-react';
import type { ArtistFormData } from '../ArtistOnboardingWizard';

interface Step6CalendarProps {
  formData: ArtistFormData;
  updateFormData: (updates: Partial<ArtistFormData>) => void;
  onValidationChange: (isValid: boolean) => void;
}

const BRAND_COLORS = [
  '#8B5CF6', // Purple
  '#EC4899', // Pink
  '#EF4444', // Red
  '#F97316', // Orange
  '#EAB308', // Yellow
  '#22C55E', // Green
  '#14B8A6', // Teal
  '#06B6D4', // Cyan
  '#3B82F6', // Blue
  '#6366F1', // Indigo
  '#A855F7', // Violet
  '#64748B', // Slate
];

export function Step6Calendar({ formData, updateFormData, onValidationChange }: Step6CalendarProps) {
  // Always valid (optional step)
  useEffect(() => {
    onValidationChange(true);
  }, [onValidationChange]);

  return (
    <div className="space-y-8">
      {/* Calendar Integration */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="w-5 h-5" />
            Integración de Calendario
          </CardTitle>
          <CardDescription>
            Conecta un calendario externo para sincronizar eventos del artista
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="calendarUrl">URL de iCal / Google Calendar</Label>
            <div className="flex gap-2">
              <Input
                id="calendarUrl"
                placeholder="https://calendar.google.com/calendar/ical/..."
                value={formData.calendarUrl}
                onChange={(e) => updateFormData({ calendarUrl: e.target.value })}
                className="flex-1"
              />
              {formData.calendarUrl && (
                <Button variant="outline" size="icon">
                  <CheckCircle className="w-4 h-4 text-green-500" />
                </Button>
              )}
            </div>
            <p className="text-xs text-muted-foreground">
              Puedes obtener la URL de iCal desde la configuración de Google Calendar
            </p>
          </div>

          <div className="flex gap-2">
            <Button variant="outline" className="flex-1" disabled>
              <svg className="w-4 h-4 mr-2" viewBox="0 0 24 24">
                <path
                  fill="currentColor"
                  d="M12.48 10.92v3.28h7.84c-.24 1.84-.853 3.187-1.787 4.133-1.147 1.147-2.933 2.4-6.053 2.4-4.827 0-8.6-3.893-8.6-8.72s3.773-8.72 8.6-8.72c2.6 0 4.507 1.027 5.907 2.347l2.307-2.307C18.747 1.44 16.133 0 12.48 0 5.867 0 .307 5.387.307 12s5.56 12 12.173 12c3.573 0 6.267-1.173 8.373-3.36 2.16-2.16 2.84-5.213 2.84-7.667 0-.76-.053-1.467-.173-2.053H12.48z"
                />
              </svg>
              Conectar Google Calendar
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Brand Color */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Palette className="w-5 h-5" />
            Color de Marca
          </CardTitle>
          <CardDescription>
            Este color se usará para identificar los eventos del artista en el calendario global
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap gap-3">
            {BRAND_COLORS.map((color) => (
              <button
                key={color}
                type="button"
                onClick={() => updateFormData({ brandColor: color })}
                className={`w-10 h-10 rounded-full transition-all ${
                  formData.brandColor === color
                    ? 'ring-2 ring-offset-2 ring-primary scale-110'
                    : 'hover:scale-105'
                }`}
                style={{ backgroundColor: color }}
              />
            ))}
          </div>

          <div className="flex items-center gap-3">
            <Label htmlFor="customColor">Color personalizado:</Label>
            <Input
              id="customColor"
              type="color"
              value={formData.brandColor}
              onChange={(e) => updateFormData({ brandColor: e.target.value })}
              className="w-16 h-10 p-1 cursor-pointer"
            />
            <Input
              value={formData.brandColor}
              onChange={(e) => updateFormData({ brandColor: e.target.value })}
              placeholder="#8B5CF6"
              className="w-28"
            />
          </div>

          {/* Preview */}
          <div className="mt-4 p-4 rounded-lg border">
            <p className="text-sm text-muted-foreground mb-2">Vista previa en calendario:</p>
            <div className="flex items-center gap-2">
              <div
                className="w-4 h-4 rounded"
                style={{ backgroundColor: formData.brandColor }}
              />
              <span className="font-medium">{formData.name || 'Nombre del Artista'}</span>
              <span className="text-muted-foreground">- Concierto en Madrid</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Summary */}
      <Card className="bg-primary/5 border-primary/20">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CheckCircle className="w-5 h-5 text-green-500" />
            Resumen de Configuración
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-muted-foreground">Artista</p>
              <p className="font-medium">{formData.name || '-'}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Género</p>
              <p className="font-medium">{formData.genre || '-'}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Miembros del equipo</p>
              <p className="font-medium">{formData.teamMembers.length}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Documentos legales</p>
              <p className="font-medium">{formData.legalDocuments.length}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Canciones</p>
              <p className="font-medium">{formData.songs.length}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Formatos de booking</p>
              <p className="font-medium">{formData.bookingProducts.length}</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
