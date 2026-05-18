import { useState } from 'react';
import { X, AlertTriangle, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface AlertBanner {
  type: 'error' | 'warning';
  message: string;
  action: string;
  count: number;
  total?: number;
}

interface BookingAlertBannersProps {
  banners: AlertBanner[];
  onAction: (action: string) => void;
}

export function BookingAlertBanners({ banners, onAction }: BookingAlertBannersProps) {
  const [dismissed, setDismissed] = useState<Set<number>>(new Set());

  if (banners.length === 0) return null;

  const visibleBanners = banners.filter((_, i) => !dismissed.has(i));
  if (visibleBanners.length === 0) return null;

  return (
    <div className="space-y-2">
      {banners.map((banner, i) => {
        if (dismissed.has(i)) return null;

        const isError = banner.type === 'error';
        return (
          <div
            key={i}
            className={`flex items-center gap-3 rounded-lg border px-4 py-2.5 text-sm ${
              isError
                ? 'border-destructive/30 bg-destructive/5 text-destructive'
                : 'border-border bg-muted/50 text-foreground'
            }`}
          >
            {isError ? (
              <AlertCircle className="h-4 w-4 shrink-0" />
            ) : (
              <AlertTriangle className="h-4 w-4 shrink-0 text-primary" />
            )}
            <span className="flex-1 font-medium">{banner.message}</span>
            <Button
              variant={isError ? 'destructive' : 'outline'}
              size="sm"
              className="h-7 text-xs"
              onClick={() => onAction(banner.action)}
            >
              {banner.action === 'cobros' ? 'Gestionar cobros' : banner.action === 'viabilidad' ? 'Revisar' : 'Ver eventos'}
            </Button>
            <button
              onClick={() => setDismissed(prev => new Set([...prev, i]))}
              className="text-muted-foreground hover:text-foreground"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        );
      })}
    </div>
  );
}
