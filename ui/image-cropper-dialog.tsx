import { useState, useRef, useEffect, useCallback } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { ZoomIn, ZoomOut, Check, X } from 'lucide-react';

interface ImageCropperDialogProps {
  file: File | null;
  open: boolean;
  onConfirm: (croppedBlob: Blob) => void;
  onCancel: () => void;
  aspectRatio?: number; // width/height, e.g. 1 for square, 16/9 for landscape
  circular?: boolean;
  title?: string;
}

const MIN_ZOOM = 1;
const MAX_ZOOM = 3;
const INITIAL_ZOOM = 1.2;
const OUTPUT_SIZE = 800; // max output dimension in px

export function ImageCropperDialog({
  file,
  open,
  onConfirm,
  onCancel,
  aspectRatio = 1,
  circular = false,
  title = 'Ajustar imagen',
}: ImageCropperDialogProps) {
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [zoom, setZoom] = useState(INITIAL_ZOOM);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [dragging, setDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [imgNaturalSize, setImgNaturalSize] = useState({ w: 0, h: 0 });
  const [processing, setProcessing] = useState(false);

  const containerRef = useRef<HTMLDivElement>(null);
  const imgRef = useRef<HTMLImageElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Load image URL from file
  useEffect(() => {
    if (file) {
      const url = URL.createObjectURL(file);
      setImageUrl(url);
      setZoom(INITIAL_ZOOM);
      setPan({ x: 0, y: 0 });
      return () => URL.revokeObjectURL(url);
    } else {
      setImageUrl(null);
    }
  }, [file]);

  const handleImageLoad = useCallback(() => {
    if (imgRef.current) {
      setImgNaturalSize({
        w: imgRef.current.naturalWidth,
        h: imgRef.current.naturalHeight,
      });
    }
  }, []);

  // Pointer handlers for pan
  const handlePointerDown = useCallback(
    (e: React.PointerEvent) => {
      e.preventDefault();
      setDragging(true);
      setDragStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
      (e.target as HTMLElement).setPointerCapture(e.pointerId);
    },
    [pan]
  );

  const handlePointerMove = useCallback(
    (e: React.PointerEvent) => {
      if (!dragging) return;
      setPan({ x: e.clientX - dragStart.x, y: e.clientY - dragStart.y });
    },
    [dragging, dragStart]
  );

  const handlePointerUp = useCallback(() => {
    setDragging(false);
  }, []);

  // Wheel zoom
  const handleWheel = useCallback(
    (e: React.WheelEvent) => {
      e.preventDefault();
      const delta = e.deltaY > 0 ? -0.1 : 0.1;
      setZoom((z) => Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, z + delta)));
    },
    []
  );

  // Crop and export
  const handleConfirm = useCallback(async () => {
    if (!imgRef.current || !containerRef.current || !canvasRef.current) return;
    setProcessing(true);

    try {
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d')!;
      const container = containerRef.current;
      const img = imgRef.current;

      const containerRect = container.getBoundingClientRect();
      const imgRect = img.getBoundingClientRect();

      // Output dimensions
      const outW = aspectRatio >= 1 ? OUTPUT_SIZE : Math.round(OUTPUT_SIZE * aspectRatio);
      const outH = aspectRatio >= 1 ? Math.round(OUTPUT_SIZE / aspectRatio) : OUTPUT_SIZE;
      canvas.width = outW;
      canvas.height = outH;

      // Calculate which part of the natural image is visible in the container
      const scaleRendered = imgRect.width / imgNaturalSize.w;
      const srcX = (containerRect.left - imgRect.left) / scaleRendered;
      const srcY = (containerRect.top - imgRect.top) / scaleRendered;
      const srcW = containerRect.width / scaleRendered;
      const srcH = containerRect.height / scaleRendered;

      if (circular) {
        ctx.beginPath();
        ctx.arc(outW / 2, outH / 2, outW / 2, 0, Math.PI * 2);
        ctx.clip();
      }

      ctx.drawImage(img, srcX, srcY, srcW, srcH, 0, 0, outW, outH);

      canvas.toBlob(
        (blob) => {
          if (blob) onConfirm(blob);
          setProcessing(false);
        },
        'image/jpeg',
        0.92
      );
    } catch {
      setProcessing(false);
    }
  }, [imgNaturalSize, aspectRatio, circular, onConfirm]);

  // Compute container style based on aspect ratio
  const containerStyle: React.CSSProperties = {
    aspectRatio: `${aspectRatio}`,
    maxWidth: '100%',
    maxHeight: '60vh',
    overflow: 'hidden',
    position: 'relative',
    cursor: dragging ? 'grabbing' : 'grab',
    touchAction: 'none',
    borderRadius: circular ? '50%' : '0.5rem',
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onCancel()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>Arrastra para mover, usa el slider para ampliar</DialogDescription>
        </DialogHeader>

        <div className="flex flex-col items-center gap-4">
          {/* Crop area */}
          <div
            ref={containerRef}
            style={containerStyle}
            className="w-full border-2 border-muted bg-muted/30 select-none"
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onWheel={handleWheel}
          >
            {imageUrl && (
              <img
                ref={imgRef}
                src={imageUrl}
                alt="Preview"
                onLoad={handleImageLoad}
                draggable={false}
                className="pointer-events-none"
                style={{
                  position: 'absolute',
                  top: '50%',
                  left: '50%',
                  transform: `translate(-50%, -50%) translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
                  minWidth: '100%',
                  minHeight: '100%',
                  objectFit: 'cover',
                  transformOrigin: 'center center',
                }}
              />
            )}
          </div>

          {/* Zoom controls */}
          <div className="flex items-center gap-3 w-full px-2">
            <ZoomOut className="h-4 w-4 text-muted-foreground shrink-0" />
            <Slider
              value={[zoom]}
              min={MIN_ZOOM}
              max={MAX_ZOOM}
              step={0.05}
              onValueChange={([v]) => setZoom(v)}
              className="flex-1"
            />
            <ZoomIn className="h-4 w-4 text-muted-foreground shrink-0" />
          </div>
        </div>

        {/* Hidden canvas for export */}
        <canvas ref={canvasRef} className="hidden" />

        <DialogFooter className="flex-row gap-2 sm:gap-0">
          <Button variant="outline" onClick={onCancel} disabled={processing}>
            <X className="h-4 w-4 mr-1" />
            Cancelar
          </Button>
          <Button onClick={handleConfirm} disabled={processing}>
            <Check className="h-4 w-4 mr-1" />
            {processing ? 'Procesando...' : 'Confirmar'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
