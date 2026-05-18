import React, { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { MapPin, Search, ExternalLink } from 'lucide-react';

interface LocationMapProps {
  onLocationSelect: (location: string, lat?: number, lng?: number) => void;
  initialLocation?: string;
  initialCoords?: { lat: number; lng: number };
}

export function LocationMap({ onLocationSelect, initialLocation }: LocationMapProps) {
  const [searchQuery, setSearchQuery] = useState(initialLocation || '');
  const [isLoading, setIsLoading] = useState(false);
  const [selectedLocation, setSelectedLocation] = useState(initialLocation || '');

  const searchLocation = async () => {
    if (!searchQuery.trim()) return;
    
    setIsLoading(true);
    try {
      // Simular búsqueda de geocodificación
      const locationName = searchQuery;
      
      // Coordenadas simuladas para Madrid
      const lat = 40.4165 + (Math.random() - 0.5) * 0.01;
      const lng = -3.7026 + (Math.random() - 0.5) * 0.01;
      
      setSelectedLocation(locationName);
      onLocationSelect(locationName, lat, lng);
    } catch (error) {
      console.error('Error searching location:', error);
      // Fallback: usar solo el texto
      onLocationSelect(searchQuery);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      searchLocation();
    }
  };

  const handleManualInput = () => {
    setSelectedLocation(searchQuery);
    onLocationSelect(searchQuery);
  };

  const openInGoogleMaps = () => {
    if (selectedLocation) {
      const url = `https://www.google.com/maps/search/${encodeURIComponent(selectedLocation)}`;
      window.open(url, '_blank');
    }
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <MapPin className="h-5 w-5" />
          Ubicación del Evento (Opcional)
        </CardTitle>
        <CardDescription>
          Introduce la dirección o lugar del evento. Puedes dejarlo vacío si no es necesario.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex gap-2">
          <Input
            placeholder="Ej: Teatro Real, Madrid o Virtual..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyPress={handleKeyPress}
            className="flex-1"
          />
          <Button onClick={handleManualInput} variant="outline">
            Usar
          </Button>
          <Button onClick={searchLocation} disabled={isLoading}>
            <Search className="h-4 w-4" />
            {isLoading ? 'Buscando...' : 'Buscar'}
          </Button>
        </div>

        {selectedLocation && (
          <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
            <div className="flex items-center gap-2">
              <MapPin className="h-4 w-4 text-green-600" />
              <span className="text-sm font-medium">{selectedLocation}</span>
            </div>
            <Button 
              size="sm" 
              variant="outline" 
              onClick={openInGoogleMaps}
            >
              <ExternalLink className="h-3 w-3 mr-1" />
              Ver en Maps
            </Button>
          </div>
        )}
        
        <p className="text-sm text-muted-foreground">
          💡 Tip: Escribe "Virtual" para eventos online, o deja vacío si no aplica
        </p>
      </CardContent>
    </Card>
  );
}