import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Plus, Trash2 } from 'lucide-react';
import {
  SOCIAL_PLATFORMS,
  getSocialPlatform,
  type SocialLink,
} from '@/lib/social-platforms';

interface SocialLinksEditorProps {
  value: SocialLink[];
  onChange: (next: SocialLink[]) => void;
}

export function SocialLinksEditor({ value, onChange }: SocialLinksEditorProps) {
  const used = new Set(value.map((l) => l.platform));
  const available = SOCIAL_PLATFORMS.filter((p) => !used.has(p.key));

  const updateAt = (idx: number, patch: Partial<SocialLink>) => {
    const next = value.map((l, i) => (i === idx ? { ...l, ...patch } : l));
    onChange(next);
  };

  const removeAt = (idx: number) => {
    onChange(value.filter((_, i) => i !== idx));
  };

  const addPlatform = (key: string) => {
    onChange([...value, { platform: key, url: '' }]);
  };

  return (
    <div className="space-y-2">
      {value.map((link, idx) => {
        const platform = getSocialPlatform(link.platform);
        const Icon = platform.icon;
        return (
          <div key={`${link.platform}-${idx}`} className="flex items-center gap-2">
            <div className="flex items-center gap-2 px-3 h-10 rounded-md border bg-muted/30 text-sm min-w-[140px]">
              <Icon className="h-4 w-4 text-muted-foreground" />
              <span className="truncate">{platform.label}</span>
            </div>
            <Input
              value={link.url}
              onChange={(e) => updateAt(idx, { url: e.target.value })}
              placeholder={platform.placeholder}
              className="flex-1"
            />
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={() => removeAt(idx)}
              aria-label="Eliminar red social"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        );
      })}

      <Popover>
        <PopoverTrigger asChild>
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={available.length === 0}
          >
            <Plus className="h-4 w-4 mr-1" />
            Añadir red social
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-56 p-1" align="start">
          {available.length === 0 ? (
            <div className="p-2 text-sm text-muted-foreground">
              No quedan redes disponibles
            </div>
          ) : (
            <div className="flex flex-col">
              {available.map((p) => {
                const Icon = p.icon;
                return (
                  <button
                    key={p.key}
                    type="button"
                    onClick={() => addPlatform(p.key)}
                    className="flex items-center gap-2 px-2 py-1.5 text-sm rounded-sm hover:bg-accent text-left"
                  >
                    <Icon className="h-4 w-4 text-muted-foreground" />
                    {p.label}
                  </button>
                );
              })}
            </div>
          )}
        </PopoverContent>
      </Popover>
    </div>
  );
}
