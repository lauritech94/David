import { useMemo } from 'react';
import { Info, Users, User } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useTeamMembersByArtist } from '@/hooks/useTeamMembersByArtist';

interface CommissionSectionProps {
  fee?: number | null;
  artistId?: string | null;
  porcentaje?: number | null;
  euros?: number | null;
  profileId?: string | null;
  contactId?: string | null;
  concepto?: string | null;
  onChange: (patch: {
    comision_porcentaje?: number | null;
    comision_euros?: number | null;
    comision_beneficiario_profile_id?: string | null;
    comision_beneficiario_contact_id?: string | null;
    comision_concepto?: string | null;
  }) => void;
}

const NONE = '__none__';

/**
 * Sección Comisión adicional en el tab Financiero.
 * Reglas:
 * - Acepta `0` como valor explícito (distinto de null).
 * - El beneficiario es un profile (equipo) o un contact (agenda), nunca ambos.
 * - Las comisiones de management/agencia ya viven en el presupuesto; este campo
 *   sirve únicamente para comisiones extra puntuales (finder fee, agente externo…).
 */
export function CommissionSection({
  fee,
  artistId,
  porcentaje,
  euros,
  profileId,
  contactId,
  concepto,
  onChange,
}: CommissionSectionProps) {
  const { filteredMembers } = useTeamMembersByArtist(artistId ? [artistId] : []);

  const profiles = useMemo(
    () => filteredMembers.filter((m) => m.type === 'workspace'),
    [filteredMembers],
  );
  const contacts = useMemo(
    () => filteredMembers.filter((m) => m.type === 'contact'),
    [filteredMembers],
  );

  // El valor del Select combina tipo + id para distinguir profile vs contact.
  const selectedValue = profileId
    ? `profile:${profileId}`
    : contactId
      ? `contact:${contactId}`
      : NONE;

  const handleBeneficiaryChange = (val: string) => {
    if (val === NONE) {
      onChange({
        comision_beneficiario_profile_id: null,
        comision_beneficiario_contact_id: null,
      });
      return;
    }
    const [kind, id] = val.split(':');
    if (kind === 'profile') {
      onChange({
        comision_beneficiario_profile_id: id,
        comision_beneficiario_contact_id: null,
      });
    } else if (kind === 'contact') {
      onChange({
        comision_beneficiario_profile_id: null,
        comision_beneficiario_contact_id: id,
      });
    }
  };

  // Parser que respeta '' → null y '0' → 0
  const parseNumber = (raw: string): number | null => {
    if (raw === '' || raw === null || raw === undefined) return null;
    const n = parseFloat(raw);
    return isNaN(n) ? null : n;
  };

  const handlePorcentajeChange = (raw: string) => {
    const pct = parseNumber(raw);
    const patch: Parameters<CommissionSectionProps['onChange']>[0] = {
      comision_porcentaje: pct,
    };
    // Auto-calcular euros si hay fee y un porcentaje válido (incluido 0)
    if (pct !== null && typeof fee === 'number' && fee !== null) {
      patch.comision_euros = Number(((fee * pct) / 100).toFixed(2));
    } else if (pct === null) {
      patch.comision_euros = null;
    }
    onChange(patch);
  };

  const handleEurosChange = (raw: string) => {
    const eur = parseNumber(raw);
    const patch: Parameters<CommissionSectionProps['onChange']>[0] = {
      comision_euros: eur,
    };
    // Auto-calcular % si hay fee
    if (eur !== null && typeof fee === 'number' && fee && fee > 0) {
      patch.comision_porcentaje = Number(((eur / fee) * 100).toFixed(2));
    } else if (eur === null) {
      patch.comision_porcentaje = null;
    }
    onChange(patch);
  };

  return (
    <div className="space-y-3 rounded-lg border border-border/60 bg-muted/30 p-4">
      <div className="flex items-center justify-between">
        <div>
          <h4 className="text-sm font-semibold">Comisión adicional</h4>
          <p className="text-xs text-muted-foreground">Opcional · solo para comisiones extra al evento</p>
        </div>
      </div>

      <Alert className="border-blue-200 bg-blue-50 dark:border-blue-900/50 dark:bg-blue-950/30 py-2">
        <Info className="h-4 w-4 text-blue-600 dark:text-blue-400" />
        <AlertDescription className="text-xs text-blue-900 dark:text-blue-200">
          Las comisiones de <strong>management</strong> y <strong>agencia de booking</strong> ya están
          incluidas en el presupuesto. Usa este campo solo para comisiones extra (finder fee, agente
          externo, colaborador puntual…). Acepta <strong>0&nbsp;€</strong> si no hay comisión extra.
        </AlertDescription>
      </Alert>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="space-y-1.5 sm:col-span-1">
          <Label className="text-xs">Beneficiario</Label>
          <Select value={selectedValue} onValueChange={handleBeneficiaryChange}>
            <SelectTrigger>
              <SelectValue placeholder="Sin asignar" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={NONE}>
                <span className="text-muted-foreground">Sin asignar</span>
              </SelectItem>
              {profiles.length > 0 && (
                <SelectGroup>
                  <SelectLabel className="flex items-center gap-1.5">
                    <Users className="h-3 w-3" /> Equipo
                  </SelectLabel>
                  {profiles.map((p) => (
                    <SelectItem key={`profile:${p.id}`} value={`profile:${p.id}`}>
                      {p.name}
                      {p.role ? <span className="text-muted-foreground"> · {p.role}</span> : null}
                    </SelectItem>
                  ))}
                </SelectGroup>
              )}
              {contacts.length > 0 && (
                <SelectGroup>
                  <SelectLabel className="flex items-center gap-1.5">
                    <User className="h-3 w-3" /> Agenda
                  </SelectLabel>
                  {contacts.map((c) => (
                    <SelectItem key={`contact:${c.id}`} value={`contact:${c.id}`}>
                      {c.name}
                      {c.role ? <span className="text-muted-foreground"> · {c.role}</span> : null}
                    </SelectItem>
                  ))}
                </SelectGroup>
              )}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1.5">
          <Label className="text-xs">% sobre fee</Label>
          <Input
            type="number"
            step="0.01"
            min="0"
            placeholder="0"
            value={porcentaje ?? ''}
            onChange={(e) => handlePorcentajeChange(e.target.value)}
          />
        </div>

        <div className="space-y-1.5">
          <Label className="text-xs">Importe (€)</Label>
          <Input
            type="number"
            step="0.01"
            min="0"
            placeholder="0"
            value={euros ?? ''}
            onChange={(e) => handleEurosChange(e.target.value)}
          />
        </div>
      </div>

      <div className="space-y-1.5">
        <Label className="text-xs">Concepto (opcional)</Label>
        <Input
          placeholder="Ej: finder fee, agente externo, colaborador puntual…"
          value={concepto ?? ''}
          onChange={(e) => onChange({ comision_concepto: e.target.value || null })}
          maxLength={200}
        />
      </div>
    </div>
  );
}
