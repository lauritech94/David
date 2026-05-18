import { useEffect, useState } from 'react';
import { Input } from '@/components/ui/input';
import { parseDuration, formatDuration } from '@/lib/duration';

interface DurationInputProps {
  value: string | null | undefined;
  onChange: (value: string | null) => void;
  className?: string;
}

export function DurationInput({ value, onChange, className }: DurationInputProps) {
  const initial = parseDuration(value);
  const [horas, setHoras] = useState<number>(initial.horas);
  const [minutos, setMinutos] = useState<number>(initial.minutos);

  // Re-sincronizar si el valor externo cambia (apertura del diálogo, reset, etc.)
  useEffect(() => {
    const parsed = parseDuration(value);
    setHoras(parsed.horas);
    setMinutos(parsed.minutos);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  const emit = (h: number, m: number) => {
    const formatted = formatDuration(h, m);
    onChange(formatted === '' ? null : formatted);
  };

  const handleHoras = (raw: string) => {
    const parsed = raw === '' ? 0 : parseInt(raw, 10);
    const h = isNaN(parsed) ? 0 : Math.max(0, Math.min(99, parsed));
    setHoras(h);
    emit(h, minutos);
  };

  const handleMinutos = (raw: string) => {
    const parsed = raw === '' ? 0 : parseInt(raw, 10);
    let m = isNaN(parsed) ? 0 : Math.max(0, Math.min(59, parsed));
    setMinutos(m);
    emit(horas, m);
  };

  return (
    <div className={`flex items-center gap-2 ${className || ''}`}>
      <div className="flex items-center gap-1 flex-1">
        <Input
          type="number"
          min={0}
          max={99}
          step={1}
          value={horas === 0 ? '' : horas}
          onChange={(e) => handleHoras(e.target.value)}
          placeholder="0"
          className="text-center"
          aria-label="Horas"
        />
        <span className="text-sm text-muted-foreground">h</span>
      </div>
      <div className="flex items-center gap-1 flex-1">
        <Input
          type="number"
          min={0}
          max={59}
          step={5}
          value={minutos === 0 ? '' : minutos}
          onChange={(e) => handleMinutos(e.target.value)}
          placeholder="0"
          className="text-center"
          aria-label="Minutos"
        />
        <span className="text-sm text-muted-foreground">min</span>
      </div>
    </div>
  );
}
