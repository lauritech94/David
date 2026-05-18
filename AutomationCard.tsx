import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Lightbulb, Clock, User, Megaphone, ChevronDown, Users } from 'lucide-react';
import { Slider } from '@/components/ui/slider';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { NOTIFY_ROLE_OPTIONS, CHANNEL_OPTIONS } from '@/lib/automationDefinitions';
import type { useAutomationConfigs } from '@/hooks/useAutomationConfigs';
import type { WorkspaceArtist } from '@/hooks/useAutomationConfigs';
import { ArtistSelector } from '@/components/ArtistSelector';

interface AutomationCardProps {
  automation: ReturnType<typeof useAutomationConfigs>['configs'][number];
  artists: WorkspaceArtist[];
  onToggle: (key: string, enabled: boolean) => void;
  onFieldChange: (key: string, field: string, value: unknown) => void;
}

export function AutomationCard({ automation: a, artists, onToggle, onFieldChange }: AutomationCardProps) {
  const [expanded, setExpanded] = useState(false);
  const [forceSelectedMode, setForceSelectedMode] = useState(false);

  const artistMode = forceSelectedMode || a.artist_ids.length > 0 ? 'selected' : 'all';

  const getArtistLabel = () => {
    if (a.artist_ids.length === 0) return 'Todos';
    if (a.artist_ids.length === 1) {
      const artist = artists.find(ar => ar.id === a.artist_ids[0]);
      return artist?.stage_name || artist?.name || '1 artista';
    }
    return `${a.artist_ids.length} artistas`;
  };

  return (
    <Card className={`transition-opacity ${!a.is_enabled ? 'opacity-60' : ''}`}>
      <CardContent className="p-4 space-y-3">
        {/* Row 1: Title + Toggle */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <h4 className="font-medium text-sm">{a.title}</h4>
              {a.recommended && (
                <Badge variant="outline" className="text-[10px] px-1.5 py-0 border-primary/30 text-primary">
                  Recomendada
                </Badge>
              )}
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">{a.description}</p>
          </div>
          <Switch
            checked={a.is_enabled}
            onCheckedChange={(v) => onToggle(a.key, v)}
          />
        </div>

        {/* Row 2: Quick config (always visible) */}
        <div className="flex flex-wrap items-center gap-3 text-xs">
          <div className="flex items-center gap-1.5 text-muted-foreground">
            <Clock className="w-3.5 h-3.5" />
            <span>{a.trigger_days === null ? 'Inmediato' : `${a.trigger_days} días`}</span>
          </div>
          <div className="flex items-center gap-1.5 text-muted-foreground">
            <User className="w-3.5 h-3.5" />
            <span>{NOTIFY_ROLE_OPTIONS.find(r => r.value === a.notify_role)?.label || a.notify_role}</span>
          </div>
          <div className="flex items-center gap-1.5 text-muted-foreground">
            <Megaphone className="w-3.5 h-3.5" />
            <span>{CHANNEL_OPTIONS.find(c => c.value === a.notify_channel)?.label || a.notify_channel}</span>
          </div>
          <div className="flex items-center gap-1.5 text-muted-foreground">
            <Users className="w-3.5 h-3.5" />
            <span>{getArtistLabel()}</span>
          </div>
        </div>

        {/* Artist chips when limited */}
        {a.artist_ids.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {a.artist_ids.map(id => {
              const artist = artists.find(ar => ar.id === id);
              return (
                <Badge key={id} variant="secondary" className="text-[10px]">
                  {artist?.stage_name || artist?.name || id.slice(0, 8)}
                </Badge>
              );
            })}
          </div>
        )}

        {/* Industry tip */}
        {a.industryTip && (
          <div className="flex items-start gap-2 bg-primary/5 rounded-md px-3 py-2 text-xs text-primary">
            <Lightbulb className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" />
            <span>{a.industryTip}</span>
          </div>
        )}

        {/* Expandable config */}
        <Collapsible open={expanded} onOpenChange={setExpanded}>
          <CollapsibleTrigger asChild>
            <Button variant="ghost" size="sm" className="w-full justify-center text-xs h-7 text-muted-foreground">
              <ChevronDown className={`w-3.5 h-3.5 mr-1 transition-transform ${expanded ? 'rotate-180' : ''}`} />
              {expanded ? 'Ocultar' : 'Configuración avanzada'}
            </Button>
          </CollapsibleTrigger>
          <CollapsibleContent className="pt-3 space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {/* Trigger days */}
              {a.defaultTriggerDays !== null && a.triggerDaysRange && (
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-muted-foreground">Días de espera</label>
                  <div className="flex items-center gap-2">
                    <Slider
                      min={a.triggerDaysRange[0]}
                      max={a.triggerDaysRange[1]}
                      step={1}
                      value={[a.trigger_days ?? a.defaultTriggerDays]}
                      onValueChange={([v]) => onFieldChange(a.key, 'trigger_days', v)}
                      className="flex-1"
                    />
                    <span className="text-xs font-mono w-8 text-right">{a.trigger_days ?? a.defaultTriggerDays}d</span>
                  </div>
                </div>
              )}

              {/* Notify role */}
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground">Notificar a</label>
                <Select
                  value={a.notify_role}
                  onValueChange={(v) => onFieldChange(a.key, 'notify_role', v)}
                >
                  <SelectTrigger className="h-8 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {NOTIFY_ROLE_OPTIONS.map(r => (
                      <SelectItem key={r.value} value={r.value} className="text-xs">{r.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Channel */}
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground">Canal</label>
                <Select
                  value={a.notify_channel}
                  onValueChange={(v) => onFieldChange(a.key, 'notify_channel', v)}
                >
                  <SelectTrigger className="h-8 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {CHANNEL_OPTIONS.map(c => (
                      <SelectItem key={c.value} value={c.value} className="text-xs">{c.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Artist scope */}
            <div className="space-y-2">
              <label className="text-xs font-medium text-muted-foreground">Aplica a</label>
              <RadioGroup
                value={artistMode}
              onValueChange={(v) => {
                  if (v === 'all') {
                    onFieldChange(a.key, 'artist_ids', []);
                    setForceSelectedMode(false);
                  } else {
                    setForceSelectedMode(true);
                  }
                }}
                className="flex gap-4"
              >
                <div className="flex items-center gap-1.5">
                  <RadioGroupItem value="all" id={`${a.key}-all`} />
                  <Label htmlFor={`${a.key}-all`} className="text-xs cursor-pointer">Todos los artistas</Label>
                </div>
                <div className="flex items-center gap-1.5">
                  <RadioGroupItem value="selected" id={`${a.key}-selected`} />
                  <Label htmlFor={`${a.key}-selected`} className="text-xs cursor-pointer">Seleccionar artistas</Label>
                </div>
              </RadioGroup>

              {artistMode === 'selected' && (
                <ArtistSelector
                  selectedArtists={a.artist_ids}
                  onSelectionChange={(ids) => onFieldChange(a.key, 'artist_ids', ids)}
                  placeholder="Seleccionar artistas..."
                  showSelfOption={false}
                />
              )}
            </div>
          </CollapsibleContent>
        </Collapsible>
      </CardContent>
    </Card>
  );
}
