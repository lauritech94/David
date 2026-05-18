import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { ChevronDown, Plus, Camera, Palette, Video, Smartphone, Disc3 } from 'lucide-react';
import { SECTION_LABELS } from './DAMConstants';
import type { DAMAsset } from './DAMTypes';
import DAMAssetCard from './DAMAssetCard';
import { cn } from '@/lib/utils';

const SECTION_ICONS: Record<string, React.ReactNode> = {
  fotografia: <Camera className="h-4 w-4" />,
  artwork: <Palette className="h-4 w-4" />,
  video: <Video className="h-4 w-4" />,
  assets_digitales: <Smartphone className="h-4 w-4" />,
  formatos_fisicos: <Disc3 className="h-4 w-4" />,
};

const EMPTY_MESSAGES: Record<string, { title: string; desc: string }> = {
  fotografia: { title: 'Sin sesiones de fotos', desc: 'Crea tu primera sesión para organizar el material fotográfico.' },
  artwork: { title: 'Sin artwork', desc: 'Sube las portadas y variantes gráficas del lanzamiento.' },
  video: { title: 'Sin vídeos', desc: 'Sube un archivo o pega un enlace externo (YouTube, Vimeo, etc.).' },
  assets_digitales: { title: 'Sin assets digitales', desc: 'Sube banners, stories y material para redes sociales.' },
  formatos_fisicos: { title: 'Sin formatos físicos', desc: 'Añade archivos de imprenta para vinilo, CD o merchandising.' },
};

interface DAMSectionProps {
  sectionKey: string;
  assets: DAMAsset[];
  viewMode: 'grid' | 'list';
  onSelectAsset: (asset: DAMAsset) => void;
  onDeleteAsset: (asset: DAMAsset) => void;
  onAddAsset: (section: string) => void;
  defaultOpen?: boolean;
  children?: React.ReactNode;
  onQuickStatusChange?: (asset: DAMAsset, status: string) => void;
  onSetAsCover?: (asset: DAMAsset) => void;
  onOpenLightbox?: (asset: DAMAsset, list: DAMAsset[]) => void;
}

export default function DAMSectionComponent({
  sectionKey,
  assets,
  viewMode,
  onSelectAsset,
  onDeleteAsset,
  onAddAsset,
  defaultOpen = true,
  children,
  onQuickStatusChange,
  onSetAsCover,
  onOpenLightbox,
}: DAMSectionProps) {
  const [open, setOpen] = useState(defaultOpen);
  const label = SECTION_LABELS[sectionKey] || sectionKey;
  const empty = EMPTY_MESSAGES[sectionKey] || { title: 'Sin contenido', desc: 'Añade archivos a esta sección.' };

  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <Card>
        <CollapsibleTrigger asChild>
          <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ChevronDown className={cn('h-4 w-4 transition-transform', open && 'rotate-180')} />
                {SECTION_ICONS[sectionKey]}
                <CardTitle className="text-base">{label}</CardTitle>
                <Badge variant="outline" className="text-xs">{assets.length}</Badge>
              </div>
              <Button
                size="sm"
                variant="default"
                className="h-7 text-xs"
                onClick={e => { e.stopPropagation(); onAddAsset(sectionKey); }}
              >
                <Plus className="h-3.5 w-3.5 mr-1" />
                Añadir
              </Button>
            </div>
          </CardHeader>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <CardContent className="pt-0">
            {children}
            {assets.length === 0 && !children ? (
              <div className="text-center py-8">
                <div className="mx-auto mb-3 text-muted-foreground/50">{SECTION_ICONS[sectionKey]}</div>
                <h4 className="text-sm font-medium mb-1">{empty.title}</h4>
                <p className="text-xs text-muted-foreground mb-3">{empty.desc}</p>
                <Button size="sm" variant="outline" onClick={() => onAddAsset(sectionKey)}>
                  <Plus className="h-3.5 w-3.5 mr-1" /> Añadir
                </Button>
              </div>
            ) : assets.length > 0 ? (
              viewMode === 'grid' ? (
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                  {assets.map(a => (
                    <DAMAssetCard
                      key={a.id}
                      asset={a}
                      onSelect={onSelectAsset}
                      onDelete={onDeleteAsset}
                      viewMode="grid"
                      onQuickStatusChange={onQuickStatusChange}
                      onSetAsCover={onSetAsCover}
                      onOpenLightbox={(asset) => onOpenLightbox?.(asset, assets)}
                    />
                  ))}
                </div>
              ) : (
                <div className="space-y-2">
                  {assets.map(a => (
                    <DAMAssetCard
                      key={a.id}
                      asset={a}
                      onSelect={onSelectAsset}
                      onDelete={onDeleteAsset}
                      viewMode="list"
                      onQuickStatusChange={onQuickStatusChange}
                      onSetAsCover={onSetAsCover}
                      onOpenLightbox={(asset) => onOpenLightbox?.(asset, assets)}
                    />
                  ))}
                </div>
              )
            ) : null}
          </CardContent>
        </CollapsibleContent>
      </Card>
    </Collapsible>
  );
}

