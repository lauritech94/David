import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useTracks } from '@/hooks/useReleases';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';

import { X, Download, Share2, Video, Image, ExternalLink, Send, Copy, Play, Music, Maximize2 } from 'lucide-react';
import { getVideoThumbnail } from '@/lib/video-thumbnails';
import { toast } from '@/hooks/use-toast';
import {
  STATUS_LABELS, STATUS_COLORS, ASSET_STATUSES,
  ARTWORK_TYPES, VIDEO_TYPES, DIGITAL_ASSET_TYPES, PHYSICAL_TYPES,
  PLATFORM_OPTIONS, FORMAT_SPECS, RESOLUTION_OPTIONS,
} from './DAMConstants';
import type { DAMAsset, AssetComment } from './DAMTypes';
import { cn } from '@/lib/utils';
import { detectImageDimensionsFromUrl } from './utils/detectImageDimensions';
import { syncCoverIfNeeded } from './utils/coverSync';

interface AssetDetailPanelProps {
  asset: DAMAsset;
  onClose: () => void;
  onUpdate: () => void;
  onOpenLightbox?: () => void;
}

export default function AssetDetailPanel({ asset, onClose, onUpdate, onOpenLightbox }: AssetDetailPanelProps) {
  const { user } = useAuth();
  const { data: tracks } = useTracks(asset.release_id);
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({
    title: asset.title,
    description: asset.description || '',
    sub_type: asset.sub_type || '',
    status: asset.status || 'en_produccion',
    format_spec: asset.format_spec || '',
    resolution: asset.resolution || '',
    platform_tags: asset.platform_tags || [],
    delivery_date: asset.delivery_date || '',
    external_url: asset.external_url || '',
    track_id: asset.track_id || '',
  });
  const [comments, setComments] = useState<AssetComment[]>([]);
  const [newComment, setNewComment] = useState('');
  const [saving, setSaving] = useState(false);
  const [detectedDims, setDetectedDims] = useState<{ resolution: string; formatSpec: string } | null>(null);

  // Reset form when switching assets
  useEffect(() => {
    setForm({
      title: asset.title,
      description: asset.description || '',
      sub_type: asset.sub_type || '',
      status: asset.status || 'en_produccion',
      format_spec: asset.format_spec || '',
      resolution: asset.resolution || '',
      platform_tags: asset.platform_tags || [],
      delivery_date: asset.delivery_date || '',
      external_url: asset.external_url || '',
      track_id: asset.track_id || '',
    });
    setEditing(false);
    setDetectedDims(null);
    fetchComments();
  }, [asset.id]);

  // Auto-detect dimensions for images missing resolution
  useEffect(() => {
    if (asset.type === 'image' && !asset.resolution && asset.file_url) {
      detectImageDimensionsFromUrl(asset.file_url)
        .then(dims => {
          setDetectedDims({ resolution: dims.resolution, formatSpec: dims.formatSpec });
          // Pre-fill form with detected values
          setForm(f => ({
            ...f,
            resolution: f.resolution || dims.resolution,
            format_spec: f.format_spec || dims.formatSpec,
          }));
        })
        .catch(() => { /* ignore */ });
    }
  }, [asset.id, asset.type, asset.resolution, asset.file_url]);

  const fetchComments = async () => {
    const { data } = await supabase
      .from('release_asset_comments')
      .select('*')
      .eq('asset_id', asset.id)
      .order('created_at', { ascending: true });

    // Resolve author names from profiles
    const comments = (data as AssetComment[]) || [];
    if (comments.length > 0) {
      const authorIds = [...new Set(comments.map(c => c.author_id))];
      const { data: profiles } = await supabase
        .from('profiles')
        .select('user_id, full_name')
        .in('user_id', authorIds);
      const nameMap = new Map((profiles || []).map(p => [p.user_id, p.full_name]));
      comments.forEach(c => { c.author_name = nameMap.get(c.author_id) || undefined; });
    }
    setComments(comments);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const { error } = await supabase
        .from('release_assets')
        .update({
          title: form.title,
          description: form.description || null,
          sub_type: form.sub_type || null,
          status: form.status,
          format_spec: form.format_spec || null,
          resolution: form.resolution || null,
          platform_tags: form.platform_tags.length > 0 ? form.platform_tags : null,
          delivery_date: form.delivery_date || null,
          external_url: form.external_url || null,
          track_id: form.track_id || null,
        } as any)
        .eq('id', asset.id);
      if (error) throw error;
      // Auto-sync cover to release — only for Cover Álbum, never for Cover Single
      await syncCoverIfNeeded(asset, form.sub_type || null, form.status);

      toast({ title: 'Asset actualizado' });
      setEditing(false);
      onUpdate();
    } catch (e) {
      console.error(e);
      toast({ title: 'Error al guardar', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const handleAddComment = async () => {
    if (!newComment.trim() || !user) return;
    const { error } = await supabase.from('release_asset_comments').insert({
      asset_id: asset.id,
      author_id: user.id,
      message: newComment.trim(),
    } as any);
    if (error) {
      toast({ title: 'Error al comentar', variant: 'destructive' });
    } else {
      setNewComment('');
      fetchComments();
    }
  };

  const getSubTypeOptions = () => {
    switch (asset.section) {
      case 'artwork': return ARTWORK_TYPES;
      case 'video': return VIDEO_TYPES;
      case 'assets_digitales': return DIGITAL_ASSET_TYPES;
      case 'formatos_fisicos': return PHYSICAL_TYPES;
      default: return [];
    }
  };

  const togglePlatform = (p: string) => {
    setForm(f => ({
      ...f,
      platform_tags: f.platform_tags.includes(p)
        ? f.platform_tags.filter(t => t !== p)
        : [...f.platform_tags, p],
    }));
  };

  const isImage = asset.type === 'image';
  const isVideo = asset.type === 'video';
  const statusColor = STATUS_COLORS[asset.status || 'en_produccion'] || '';

  return (
    <div className="w-[420px] border-l bg-background flex flex-col h-screen overflow-hidden">
      <div className="sticky top-0 z-10 flex items-center justify-between border-b bg-background p-4">
        <h3 className="font-semibold text-sm truncate flex-1">{asset.title}</h3>
        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onClose}>
          <X className="h-4 w-4" />
        </Button>
      </div>

      <div className="flex-1 overflow-y-auto overscroll-contain touch-pan-y" style={{ WebkitOverflowScrolling: 'touch' }}>
        <div className="p-4 space-y-4">
          {/* Preview */}
          <div
            className={cn(
              'rounded-lg bg-muted overflow-hidden relative group',
              (isImage || isVideo) && onOpenLightbox && 'cursor-zoom-in',
            )}
            onClick={() => (isImage || isVideo) && onOpenLightbox?.()}
          >
            {isImage ? (
              <>
                <img src={asset.file_url} alt={asset.title} className="w-full max-h-64 object-contain" />
                {onOpenLightbox && (
                  <div className="absolute top-2 right-2 bg-black/60 rounded p-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Maximize2 className="h-3.5 w-3.5 text-white" />
                  </div>
                )}
              </>
            ) : isVideo ? (
              (() => {
                const thumb = getVideoThumbnail(asset.external_url);
                return thumb ? (
                  <div className="relative">
                    <img src={thumb} alt={asset.title} className="w-full max-h-64 object-contain" />
                    <div className="absolute inset-0 flex items-center justify-center">
                      <a href={asset.external_url || '#'} target="_blank" rel="noreferrer" onClick={e => e.stopPropagation()} className="bg-black/50 rounded-full p-3 hover:bg-black/70 transition-colors">
                        <Play className="h-8 w-8 text-white" />
                      </a>
                    </div>
                  </div>
                ) : asset.external_url ? (
                  <div className="flex flex-col items-center justify-center py-8 gap-2">
                    <Video className="h-10 w-10 text-muted-foreground" />
                    <a href={asset.external_url} target="_blank" rel="noreferrer" onClick={e => e.stopPropagation()} className="text-xs text-primary flex items-center gap-1">
                      <ExternalLink className="h-3 w-3" /> Ver enlace externo
                    </a>
                  </div>
                ) : (
                  <video src={asset.file_url} controls className="w-full max-h-64" onClick={e => e.stopPropagation()} />
                );
              })()
            ) : (
              <div className="flex items-center justify-center py-8">
                <Image className="h-10 w-10 text-muted-foreground" />
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="flex gap-2">
            <Button size="sm" variant="outline" className="flex-1" onClick={() => window.open(asset.file_url, '_blank')}>
              <Download className="h-3.5 w-3.5 mr-1" /> Descargar
            </Button>
            <Button size="sm" variant="outline" className="flex-1" onClick={() => { navigator.clipboard.writeText(asset.file_url); toast({ title: 'Enlace copiado' }); }}>
              <Copy className="h-3.5 w-3.5 mr-1" /> Copiar enlace
            </Button>
          </div>

          <Separator />

          {/* Metadata */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-muted-foreground uppercase">Metadatos</span>
              <Button size="sm" variant={editing ? 'default' : 'ghost'} className="h-6 text-xs" onClick={() => editing ? handleSave() : setEditing(true)} disabled={saving}>
                {editing ? 'Guardar' : 'Editar'}
              </Button>
            </div>

            {editing ? (
              <div className="space-y-3">
                <div>
                  <Label className="text-xs">Título</Label>
                  <Input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} className="h-8 text-sm" />
                </div>
                <div>
                  <Label className="text-xs">Descripción</Label>
                  <Textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} rows={2} className="text-sm" />
                </div>
                <div>
                  <Label className="text-xs">Tipo</Label>
                  <Select value={form.sub_type} onValueChange={v => setForm(f => ({ ...f, sub_type: v }))}>
                    <SelectTrigger className="h-8 text-sm"><SelectValue placeholder="Seleccionar" /></SelectTrigger>
                    <SelectContent>
                      {getSubTypeOptions().map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-xs">Estado</Label>
                  <Select value={form.status} onValueChange={v => setForm(f => ({ ...f, status: v }))}>
                    <SelectTrigger className="h-8 text-sm"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {ASSET_STATUSES.map(s => <SelectItem key={s} value={s}>{STATUS_LABELS[s]}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-xs">Formato</Label>
                  <Select value={form.format_spec} onValueChange={v => setForm(f => ({ ...f, format_spec: v }))}>
                    <SelectTrigger className="h-8 text-sm"><SelectValue placeholder="Seleccionar" /></SelectTrigger>
                    <SelectContent>
                      {Array.from(new Set([
                        ...FORMAT_SPECS,
                        ...(detectedDims?.formatSpec ? [detectedDims.formatSpec] : []),
                        ...(form.format_spec ? [form.format_spec] : []),
                      ].filter(Boolean))).map(f => <SelectItem key={f} value={f}>{f}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-xs flex items-center justify-between">
                    <span>Resolución</span>
                    {detectedDims?.resolution && form.resolution !== detectedDims.resolution && (
                      <button
                        type="button"
                        className="text-[10px] text-primary hover:underline"
                        onClick={() => setForm(f => ({ ...f, resolution: detectedDims.resolution }))}
                      >
                        Usar {detectedDims.resolution} (auto)
                      </button>
                    )}
                  </Label>
                  <Input
                    value={form.resolution}
                    onChange={e => setForm(f => ({ ...f, resolution: e.target.value }))}
                    placeholder={detectedDims?.resolution ? `Sugerido: ${detectedDims.resolution}` : 'Ej: 3000×3000'}
                    className="h-8 text-sm"
                  />
                  <div className="flex flex-wrap gap-1 mt-1">
                    {RESOLUTION_OPTIONS.map(r => (
                      <Badge
                        key={r}
                        variant={form.resolution === r ? 'default' : 'outline'}
                        className="text-[10px] cursor-pointer"
                        onClick={() => setForm(f => ({ ...f, resolution: r }))}
                      >
                        {r}
                      </Badge>
                    ))}
                  </div>
                </div>
                <div>
                  <Label className="text-xs">Fecha entrega</Label>
                  <Input type="date" value={form.delivery_date} onChange={e => setForm(f => ({ ...f, delivery_date: e.target.value }))} className="h-8 text-sm" />
                </div>
                <div>
                  <Label className="text-xs">URL externa</Label>
                  <Input value={form.external_url} onChange={e => setForm(f => ({ ...f, external_url: e.target.value }))} className="h-8 text-sm" placeholder="YouTube, Vimeo..." />
                </div>
                <div>
                  <Label className="text-xs">Plataformas</Label>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {PLATFORM_OPTIONS.map(p => (
                      <Badge
                        key={p}
                        variant={form.platform_tags.includes(p) ? 'default' : 'outline'}
                        className="text-[10px] cursor-pointer"
                        onClick={() => togglePlatform(p)}
                      >
                        {p}
                      </Badge>
                    ))}
                  </div>
                </div>
                <div>
                  <Label className="text-xs flex items-center gap-1"><Music className="h-3 w-3" /> Track asociado</Label>
                  <Select value={form.track_id} onValueChange={v => setForm(f => ({ ...f, track_id: v === '_none' ? '' : v }))}>
                    <SelectTrigger className="h-8 text-sm"><SelectValue placeholder="Sin asociar" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="_none">Álbum completo</SelectItem>
                      {(tracks || []).map(t => (
                        <SelectItem key={t.id} value={t.id}>
                          {t.track_number}. {t.title}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            ) : (
              <div className="space-y-2 text-sm">
                <div className="flex justify-between"><span className="text-muted-foreground">Estado</span><Badge className={cn('text-[10px]', statusColor)}>{STATUS_LABELS[asset.status || 'en_produccion']}</Badge></div>
                {asset.sub_type && <div className="flex justify-between"><span className="text-muted-foreground">Tipo</span><span>{asset.sub_type}</span></div>}
                {(asset.format_spec || detectedDims?.formatSpec) && <div className="flex justify-between"><span className="text-muted-foreground">Formato</span><span className={!asset.format_spec ? 'text-muted-foreground italic' : ''}>{asset.format_spec || detectedDims?.formatSpec}{!asset.format_spec && ' (auto)'}</span></div>}
                {(asset.resolution || detectedDims?.resolution) && <div className="flex justify-between"><span className="text-muted-foreground">Resolución</span><span className={!asset.resolution ? 'text-muted-foreground italic' : ''}>{asset.resolution || detectedDims?.resolution}{!asset.resolution && ' (auto)'}</span></div>}
                {asset.delivery_date && <div className="flex justify-between"><span className="text-muted-foreground">Entrega</span><span>{asset.delivery_date}</span></div>}
                {asset.platform_tags && asset.platform_tags.length > 0 && (
                  <div className="flex justify-between items-start"><span className="text-muted-foreground">Plataformas</span><div className="flex flex-wrap gap-1 justify-end">{asset.platform_tags.map(p => <Badge key={p} variant="outline" className="text-[10px]">{p}</Badge>)}</div></div>
                )}
                {asset.external_url && (
                  <div className="flex justify-between"><span className="text-muted-foreground">URL externa</span><a href={asset.external_url} target="_blank" rel="noreferrer" className="text-primary text-xs flex items-center gap-1"><ExternalLink className="h-3 w-3" /> Abrir</a></div>
                )}
                {asset.track_id && tracks && (() => {
                  const track = tracks.find(t => t.id === asset.track_id);
                  return track ? (
                    <div className="flex justify-between"><span className="text-muted-foreground">Track</span><span className="flex items-center gap-1"><Music className="h-3 w-3" />{track.track_number}. {track.title}</span></div>
                  ) : null;
                })()}
              </div>
            )}
          </div>

          <Separator />

          {/* Comments */}
          <div className="space-y-3 pb-4">
            <span className="text-xs font-medium text-muted-foreground uppercase">Comentarios</span>
            {comments.length === 0 && <p className="text-xs text-muted-foreground">Sin comentarios</p>}
            {comments.map(c => (
              <div key={c.id} className="bg-muted rounded-lg p-2.5">
                {c.author_name && <p className="text-xs font-medium text-foreground mb-0.5">{c.author_name}</p>}
                <p className="text-sm">{c.message}</p>
                <p className="text-[10px] text-muted-foreground mt-1">{new Date(c.created_at).toLocaleDateString('es-ES')}</p>
              </div>
            ))}
            <div className="flex gap-2">
              <Input
                value={newComment}
                onChange={e => setNewComment(e.target.value)}
                placeholder="Escribe un comentario..."
                className="h-8 text-sm"
                onKeyDown={e => e.key === 'Enter' && handleAddComment()}
              />
              <Button size="icon" className="h-8 w-8" onClick={handleAddComment} disabled={!newComment.trim()}>
                <Send className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
