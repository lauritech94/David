import { useState, useMemo } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ChevronRight, Plus, Camera, Trash2, ArrowUpRight, ArrowDownLeft, Link2, X, CircleDot, Star } from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { STAGE_LABELS, PHOTO_STAGES, ASSET_STATUSES, STATUS_LABELS } from './DAMConstants';
import type { DAMAsset, PhotoSession } from './DAMTypes';
import DAMAssetCard from './DAMAssetCard';
import { cn } from '@/lib/utils';

const STAGE_LEVEL: Record<string, number> = {
  backup: 0,
  seleccionadas: 1,
  editadas: 2,
  compartir: 3,
};

const STAGE_BADGE_COLORS: Record<string, string> = {
  backup: 'bg-muted text-muted-foreground',
  seleccionadas: 'bg-blue-500/15 text-blue-600 dark:text-blue-400 border-blue-500/20',
  editadas: 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/20',
  compartir: 'bg-purple-500/15 text-purple-600 dark:text-purple-400 border-purple-500/20',
};

interface PhotoSessionPipelineProps {
  session: PhotoSession;
  assets: DAMAsset[];
  viewMode: 'grid' | 'list';
  onSelectAsset: (asset: DAMAsset) => void;
  onDeleteAsset: (asset: DAMAsset) => void;
  onUploadToStage: (sessionId: string, stage: string) => void;
  onDeleteSession: (session: PhotoSession) => void;
  onPromoteAsset?: (asset: DAMAsset, newStage: string) => void;
  onQuickStatusChange?: (asset: DAMAsset, status: string) => void;
  onSetAsCover?: (asset: DAMAsset) => void;
  onOpenLightbox?: (asset: DAMAsset, list: DAMAsset[]) => void;
  onBulkUpdate?: (assetIds: string[], patch: { status?: string; stage?: string }) => void;
  onBulkDelete?: (assetIds: string[]) => void;
}

export default function PhotoSessionPipeline({
  session,
  assets,
  viewMode,
  onSelectAsset,
  onDeleteAsset,
  onUploadToStage,
  onDeleteSession,
  onPromoteAsset,
  onQuickStatusChange,
  onSetAsCover,
  onOpenLightbox,
  onBulkUpdate,
  onBulkDelete,
}: PhotoSessionPipelineProps) {
  const [expanded, setExpanded] = useState(false);
  const [activeTab, setActiveTab] = useState<string>('backup');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const counts = useMemo(() => ({
    backup: assets.length,
    seleccionadas: assets.filter(a => STAGE_LEVEL[a.stage || 'backup'] >= 1).length,
    editadas: assets.filter(a => STAGE_LEVEL[a.stage || 'backup'] >= 2).length,
    compartir: assets.filter(a => STAGE_LEVEL[a.stage || 'backup'] >= 3).length,
  }), [assets]);

  const filteredAssets = useMemo(() => {
    const minLevel = STAGE_LEVEL[activeTab] || 0;
    if (minLevel === 0) return assets;
    return assets.filter(a => STAGE_LEVEL[a.stage || 'backup'] >= minLevel);
  }, [assets, activeTab]);

  const toggleSelect = (asset: DAMAsset, e: React.MouseEvent) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (e.shiftKey && next.size > 0) {
        // Range select from last selected to this one in current filtered list
        const ids = filteredAssets.map(a => a.id);
        const lastId = Array.from(next).pop()!;
        const start = ids.indexOf(lastId);
        const end = ids.indexOf(asset.id);
        if (start !== -1 && end !== -1) {
          const [from, to] = [Math.min(start, end), Math.max(start, end)];
          for (let i = from; i <= to; i++) next.add(ids[i]);
          return next;
        }
      }
      if (next.has(asset.id)) next.delete(asset.id);
      else next.add(asset.id);
      return next;
    });
  };

  const clearSelection = () => setSelectedIds(new Set());
  const selectedCount = selectedIds.size;
  const selectedAssets = useMemo(() => assets.filter(a => selectedIds.has(a.id)), [assets, selectedIds]);

  return (
    <Card className="border-dashed">
      <div
        className="flex items-center justify-between p-3 cursor-pointer hover:bg-muted/50 transition-colors"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex items-center gap-2">
          <Camera className="h-4 w-4 text-muted-foreground" />
          <span className="font-medium text-sm">{session.name}</span>
          {session.photographer && <span className="text-xs text-muted-foreground">por {session.photographer}</span>}
          <Badge variant="outline" className="text-[10px]">{assets.length} archivos</Badge>
        </div>
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={e => { e.stopPropagation(); onDeleteSession(session); }}>
            <Trash2 className="h-3.5 w-3.5 text-muted-foreground" />
          </Button>
        </div>
      </div>

      {expanded && (
        <CardContent className="pt-0 pb-4">
          {/* Bulk action bar */}
          {selectedCount > 0 && (
            <div className="sticky top-0 z-20 -mx-6 px-6 py-2 mb-3 bg-primary/10 border-y border-primary/30 flex items-center justify-between flex-wrap gap-2">
              <div className="flex items-center gap-2">
                <Badge variant="default">{selectedCount} seleccionada{selectedCount !== 1 ? 's' : ''}</Badge>
                <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={clearSelection}>
                  <X className="h-3 w-3 mr-1" /> Limpiar
                </Button>
              </div>
              <div className="flex items-center gap-1.5 flex-wrap">
                {onBulkUpdate && (
                  <>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button size="sm" variant="outline" className="h-7 text-xs">
                          <CircleDot className="h-3 w-3 mr-1" /> Estado
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent>
                        <DropdownMenuLabel className="text-[10px] uppercase">Cambiar a</DropdownMenuLabel>
                        {ASSET_STATUSES.map(s => (
                          <DropdownMenuItem key={s} onClick={() => { onBulkUpdate(Array.from(selectedIds), { status: s }); clearSelection(); }}>
                            {STATUS_LABELS[s]}
                          </DropdownMenuItem>
                        ))}
                      </DropdownMenuContent>
                    </DropdownMenu>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button size="sm" variant="outline" className="h-7 text-xs">
                          <ArrowUpRight className="h-3 w-3 mr-1" /> Mover a etapa
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent>
                        {PHOTO_STAGES.map(s => (
                          <DropdownMenuItem key={s} onClick={() => { onBulkUpdate(Array.from(selectedIds), { stage: s }); clearSelection(); }}>
                            {STAGE_LABELS[s]}
                          </DropdownMenuItem>
                        ))}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </>
                )}
                {onBulkDelete && (
                  <Button size="sm" variant="destructive" className="h-7 text-xs" onClick={() => { onBulkDelete(Array.from(selectedIds)); clearSelection(); }}>
                    <Trash2 className="h-3 w-3 mr-1" /> Eliminar
                  </Button>
                )}
              </div>
            </div>
          )}

          {/* Pipeline tabs */}
          <div className="flex items-center gap-1 mb-4 overflow-x-auto pb-2">
            {PHOTO_STAGES.map((stage, idx) => (
              <div key={stage} className="flex items-center">
                <button
                  type="button"
                  className={cn(
                    'px-3 py-1.5 rounded-md text-xs font-medium transition-colors border',
                    activeTab === stage
                      ? 'bg-primary/10 border-primary/30 text-primary ring-1 ring-primary/20'
                      : counts[stage] > 0
                        ? 'bg-muted/80 border-border text-foreground hover:bg-muted'
                        : 'bg-muted border-border text-muted-foreground hover:bg-muted/80'
                  )}
                  onClick={() => setActiveTab(stage)}
                >
                  {STAGE_LABELS[stage]}
                  <Badge variant="secondary" className="ml-1.5 text-[10px] h-4">{counts[stage]}</Badge>
                </button>
                {idx < PHOTO_STAGES.length - 1 && <ChevronRight className="h-4 w-4 text-muted-foreground mx-1 flex-shrink-0" />}
              </div>
            ))}
          </div>

          {/* Upload button */}
          <div className="flex items-center justify-between mb-3">
            <p className="text-[11px] text-muted-foreground italic">Pulsa el checkbox para selección múltiple. Shift+click para rangos.</p>
            <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => onUploadToStage(session.id, 'backup')}>
              <Plus className="h-3 w-3 mr-1" /> Añadir
            </Button>
          </div>

          {/* Filtered assets */}
          {filteredAssets.length > 0 ? (
            viewMode === 'grid' ? (
              <div className="grid grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2">
                {filteredAssets.map(a => (
                  <div key={a.id} className="space-y-1">
                    <DAMAssetCard
                      asset={a}
                      onSelect={onSelectAsset}
                      onDelete={onDeleteAsset}
                      viewMode="grid"
                      onQuickStatusChange={onQuickStatusChange}
                      onSetAsCover={onSetAsCover}
                      onOpenLightbox={(asset) => onOpenLightbox?.(asset, filteredAssets)}
                      onToggleSelect={toggleSelect}
                      selected={selectedIds.has(a.id)}
                    />
                    <Badge className={cn('text-[10px] w-full justify-center', STAGE_BADGE_COLORS[a.stage || 'backup'])}>
                      {STAGE_LABELS[a.stage || 'backup']}
                    </Badge>
                    <StageActionButton asset={a} onPromote={onPromoteAsset} onUploadEdited={() => onUploadToStage(session.id, 'editadas')} />
                  </div>
                ))}
              </div>
            ) : (
              <div className="space-y-1">
                {filteredAssets.map(a => (
                  <div key={a.id} className="flex items-center gap-2">
                    <div className="flex-1">
                      <DAMAssetCard
                        asset={a}
                        onSelect={onSelectAsset}
                        onDelete={onDeleteAsset}
                        viewMode="list"
                        onQuickStatusChange={onQuickStatusChange}
                        onSetAsCover={onSetAsCover}
                        onOpenLightbox={(asset) => onOpenLightbox?.(asset, filteredAssets)}
                        onToggleSelect={toggleSelect}
                        selected={selectedIds.has(a.id)}
                      />
                    </div>
                    <Badge className={cn('text-[10px] flex-shrink-0', STAGE_BADGE_COLORS[a.stage || 'backup'])}>
                      {STAGE_LABELS[a.stage || 'backup']}
                    </Badge>
                    <StageActionButton asset={a} onPromote={onPromoteAsset} onUploadEdited={() => onUploadToStage(session.id, 'editadas')} />
                  </div>
                ))}
              </div>
            )
          ) : (
            <p className="text-sm text-muted-foreground text-center py-4">
              {assets.length === 0
                ? 'Sin fotos. Haz clic en "+ Añadir" para subir archivos.'
                : 'No hay imágenes en esta etapa.'}
            </p>
          )}
        </CardContent>
      )}
    </Card>
  );
}

function StageActionButton({
  asset,
  onPromote,
  onUploadEdited,
}: {
  asset: DAMAsset;
  onPromote?: (asset: DAMAsset, newStage: string) => void;
  onUploadEdited?: () => void;
}) {
  const stage = asset.stage || 'backup';
  if (!onPromote) return null;

  switch (stage) {
    case 'backup':
      return (
        <Button size="sm" variant="ghost" className="h-6 text-[10px] w-full" onClick={e => { e.stopPropagation(); onPromote(asset, 'seleccionadas'); }}>
          <ArrowUpRight className="h-3 w-3 mr-1" /> Marcar seleccionada
        </Button>
      );
    case 'seleccionadas':
      return (
        <div className="flex gap-0.5 w-full">
          <Button size="sm" variant="ghost" className="h-6 text-[10px] flex-1" onClick={e => { e.stopPropagation(); onPromote(asset, 'backup'); }}>
            <ArrowDownLeft className="h-3 w-3 mr-0.5" /> Backup
          </Button>
          <Button size="sm" variant="ghost" className="h-6 text-[10px] flex-1" onClick={e => { e.stopPropagation(); onUploadEdited?.(); }}>
            <ArrowUpRight className="h-3 w-3 mr-0.5" /> Subir editada
          </Button>
        </div>
      );
    case 'editadas':
      return (
        <div className="flex gap-0.5 w-full">
          <Button size="sm" variant="ghost" className="h-6 text-[10px] flex-1" onClick={e => { e.stopPropagation(); onPromote(asset, 'seleccionadas'); }}>
            <ArrowDownLeft className="h-3 w-3 mr-0.5" /> Selec.
          </Button>
          <Button size="sm" variant="ghost" className="h-6 text-[10px] flex-1" onClick={e => { e.stopPropagation(); onPromote(asset, 'compartir'); }}>
            <ArrowUpRight className="h-3 w-3 mr-0.5" /> Compartir
          </Button>
        </div>
      );
    case 'compartir':
      return (
        <div className="flex gap-0.5 w-full">
          <Button size="sm" variant="ghost" className="h-6 text-[10px] flex-1" onClick={e => { e.stopPropagation(); onPromote(asset, 'editadas'); }}>
            <ArrowDownLeft className="h-3 w-3 mr-0.5" /> Quitar
          </Button>
          <Button size="sm" variant="ghost" className="h-6 text-[10px] flex-1" onClick={e => { e.stopPropagation(); navigator.clipboard.writeText(asset.file_url); }}>
            <Link2 className="h-3 w-3 mr-0.5" /> Enlace
          </Button>
        </div>
      );
    default:
      return null;
  }
}
