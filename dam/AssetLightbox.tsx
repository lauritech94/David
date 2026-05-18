import { useEffect, useState } from 'react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight, X, Download, Play } from 'lucide-react';
import { getVideoThumbnail } from '@/lib/video-thumbnails';
import type { DAMAsset } from './DAMTypes';

interface AssetLightboxProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  assets: DAMAsset[];
  initialIndex: number;
}

export default function AssetLightbox({ open, onOpenChange, assets, initialIndex }: AssetLightboxProps) {
  const [index, setIndex] = useState(initialIndex);

  useEffect(() => {
    setIndex(initialIndex);
  }, [initialIndex, open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight') setIndex(i => Math.min(i + 1, assets.length - 1));
      else if (e.key === 'ArrowLeft') setIndex(i => Math.max(i - 1, 0));
      else if (e.key === 'Escape') onOpenChange(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, assets.length, onOpenChange]);

  if (!assets.length) return null;
  const asset = assets[Math.max(0, Math.min(index, assets.length - 1))];
  if (!asset) return null;

  const isImage = asset.type === 'image';
  const isVideo = asset.type === 'video';
  const videoThumb = isVideo ? getVideoThumbnail(asset.external_url) : null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[100vw] w-screen h-screen p-0 bg-black/95 border-0 sm:rounded-none flex flex-col">
        {/* Top bar */}
        <div className="absolute top-0 left-0 right-0 z-20 flex items-center justify-between p-4 bg-gradient-to-b from-black/80 to-transparent">
          <div className="text-white text-sm">
            <p className="font-medium truncate max-w-[60vw]">{asset.title}</p>
            <p className="text-xs text-white/70">{index + 1} / {assets.length}</p>
          </div>
          <div className="flex items-center gap-2">
            {asset.file_url && (
              <Button
                size="icon"
                variant="ghost"
                className="text-white hover:bg-white/10"
                onClick={() => window.open(asset.file_url, '_blank')}
              >
                <Download className="h-5 w-5" />
              </Button>
            )}
            <Button
              size="icon"
              variant="ghost"
              className="text-white hover:bg-white/10"
              onClick={() => onOpenChange(false)}
            >
              <X className="h-5 w-5" />
            </Button>
          </div>
        </div>

        {/* Prev */}
        {index > 0 && (
          <Button
            size="icon"
            variant="ghost"
            className="absolute left-2 top-1/2 -translate-y-1/2 z-20 text-white hover:bg-white/10 h-12 w-12"
            onClick={() => setIndex(i => Math.max(i - 1, 0))}
          >
            <ChevronLeft className="h-8 w-8" />
          </Button>
        )}

        {/* Next */}
        {index < assets.length - 1 && (
          <Button
            size="icon"
            variant="ghost"
            className="absolute right-2 top-1/2 -translate-y-1/2 z-20 text-white hover:bg-white/10 h-12 w-12"
            onClick={() => setIndex(i => Math.min(i + 1, assets.length - 1))}
          >
            <ChevronRight className="h-8 w-8" />
          </Button>
        )}

        {/* Media */}
        <div className="flex-1 flex items-center justify-center p-8 overflow-hidden">
          {isImage && asset.file_url ? (
            <img
              src={asset.file_url}
              alt={asset.title}
              className="max-h-full max-w-full object-contain"
            />
          ) : isVideo && asset.external_url ? (
            videoThumb ? (
              <a
                href={asset.external_url}
                target="_blank"
                rel="noreferrer"
                className="relative block"
              >
                <img src={videoThumb} alt={asset.title} className="max-h-[80vh] max-w-full object-contain" />
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="bg-black/60 rounded-full p-5">
                    <Play className="h-10 w-10 text-white" />
                  </div>
                </div>
              </a>
            ) : (
              <iframe
                src={asset.external_url}
                title={asset.title}
                className="w-[90vw] h-[80vh] border-0"
                allow="autoplay; fullscreen"
              />
            )
          ) : isVideo && asset.file_url ? (
            <video src={asset.file_url} controls className="max-h-full max-w-full" />
          ) : (
            <p className="text-white">Sin vista previa</p>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
