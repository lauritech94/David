import { useState } from 'react';
import { AlertTriangle, Ban, ChevronDown, ChevronUp, FileText, Send, Sparkles } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import type { ReorderImpact } from '@/lib/releases/trackOrderingGuards';

interface Props {
  impact: ReorderImpact;
  /** Texto corto de contexto sobre la acción ("renumerar" / "reordenar"). */
  action?: string;
}

const refIcon = (type: 'contract' | 'license' | 'pitch') => {
  if (type === 'pitch') return <Send className="w-3.5 h-3.5" />;
  if (type === 'license') return <Sparkles className="w-3.5 h-3.5" />;
  return <FileText className="w-3.5 h-3.5" />;
};

const refLabel = (type: 'contract' | 'license' | 'pitch') =>
  type === 'pitch' ? 'Pitch' : type === 'license' ? 'Licencia IP' : 'Contrato';

export function ReorderImpactNotice({ impact, action = 'renumerar' }: Props) {
  const [open, setOpen] = useState(false);

  if (!impact.blocked && !impact.publishedToDistro && impact.pitches === 0 && impact.draftContracts === 0) {
    return null;
  }

  const blocked = impact.blocked;
  const headerColor = blocked
    ? 'border-destructive/40 bg-destructive/10'
    : 'border-amber-500/30 bg-amber-500/10';
  const iconColor = blocked ? 'text-destructive' : 'text-amber-500';

  const summary = blocked
    ? `No se puede ${action}: hay ${impact.signedContracts + impact.signedLicenses} documento(s) firmado(s) que dependen del orden actual.`
    : impact.publishedToDistro
      ? `Este lanzamiento ya está publicado. ${capitalize(action)} cambiará metadatos enviados a distribución.`
      : `${capitalize(action)} afectará a ${impact.pitches + impact.draftContracts} elemento(s) vinculado(s) (pitches o borradores).`;

  return (
    <Alert className={headerColor}>
      {blocked ? (
        <Ban className={`h-4 w-4 ${iconColor}`} />
      ) : (
        <AlertTriangle className={`h-4 w-4 ${iconColor}`} />
      )}
      <AlertDescription className="text-sm space-y-2">
        <div className="flex items-start justify-between gap-2">
          <span>{summary}</span>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-7 px-2 -mt-1 -mr-1 shrink-0"
            onClick={() => setOpen((v) => !v)}
          >
            {open ? (
              <><ChevronUp className="w-3.5 h-3.5 mr-1" />Ver menos</>
            ) : (
              <><ChevronDown className="w-3.5 h-3.5 mr-1" />Ver más</>
            )}
          </Button>
        </div>

        {open && (
          <div className="pt-2 border-t border-border/40 space-y-3">
            <section>
              <p className="font-medium text-foreground/90 mb-1">Qué cambia al {action}</p>
              <ul className="list-disc pl-5 space-y-0.5 text-muted-foreground">
                <li>El número de pista (<code>track_number</code>) de cada canción.</li>
                <li>El orden del tracklist en pitches generados o exportados.</li>
                <li>El orden mostrado en contratos y splits PDF que se generen <em>a partir de ahora</em>.</li>
                <li>Los ficheros DDEX/CSV que envíes a la distribuidora a partir de ahora.</li>
              </ul>
            </section>

            <section>
              <p className="font-medium text-foreground/90 mb-1">Qué NO cambia</p>
              <ul className="list-disc pl-5 space-y-0.5 text-muted-foreground">
                <li>ISRC, título, audio, derechos, splits y créditos de cada track.</li>
                <li>Documentos PDF ya firmados o exportados (mantienen el orden antiguo).</li>
                <li>Lo ya enviado a tiendas: tendrás que reenviar el tracklist actualizado a tu distribuidora.</li>
              </ul>
            </section>

            {(impact.signedContracts > 0 || impact.signedLicenses > 0 || impact.draftContracts > 0 || impact.pitches > 0) && (
              <section>
                <p className="font-medium text-foreground/90 mb-1">Elementos vinculados</p>
                <div className="flex flex-wrap gap-1.5 mb-2">
                  {impact.signedContracts > 0 && (
                    <Badge variant="destructive">{impact.signedContracts} contrato(s) firmado(s)</Badge>
                  )}
                  {impact.signedLicenses > 0 && (
                    <Badge variant="destructive">{impact.signedLicenses} licencia(s) firmada(s)</Badge>
                  )}
                  {impact.draftContracts > 0 && (
                    <Badge variant="secondary">{impact.draftContracts} borrador(es)</Badge>
                  )}
                  {impact.pitches > 0 && (
                    <Badge variant="secondary">{impact.pitches} pitch(es)</Badge>
                  )}
                  {impact.publishedToDistro && (
                    <Badge variant="outline">Publicado en distribución</Badge>
                  )}
                </div>
                {impact.refs.length > 0 && (
                  <ul className="space-y-1 max-h-40 overflow-auto pr-1">
                    {impact.refs.map((r) => (
                      <li key={`${r.type}-${r.id}`} className="flex items-center gap-2 text-xs text-muted-foreground">
                        <span className="text-foreground/70">{refIcon(r.type)}</span>
                        <span className="font-medium text-foreground/80">{refLabel(r.type)}:</span>
                        <span className="truncate">{r.title}</span>
                        {r.status && <Badge variant="outline" className="ml-auto h-4 px-1 text-[10px]">{r.status}</Badge>}
                      </li>
                    ))}
                  </ul>
                )}
              </section>
            )}

            {blocked && (
              <p className="text-foreground/90">
                <strong>Por qué se bloquea:</strong> los contratos firmados citan el número de pista. Cambiarlo rompería la trazabilidad legal.
                Si necesitas reordenar, primero anula o sustituye los contratos firmados afectados.
              </p>
            )}

            {!blocked && impact.publishedToDistro && (
              <p className="text-foreground/90">
                <strong>Recomendación:</strong> tras {action}, contacta a tu distribuidora para reenviar el tracklist actualizado y evita inconsistencias en tiendas.
              </p>
            )}
          </div>
        )}
      </AlertDescription>
    </Alert>
  );
}

function capitalize(s: string) {
  return s.charAt(0).toUpperCase() + s.slice(1);
}
