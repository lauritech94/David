import { useState } from 'react';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Zap, Sparkles } from 'lucide-react';
import { AUTOMATION_MODULES, AUTOMATIONS } from '@/lib/automationDefinitions';
import { useAutomationConfigs } from '@/hooks/useAutomationConfigs';
import { AutomationCard } from '@/components/AutomationCard';
import { toast } from '@/hooks/use-toast';
import { HubGate } from '@/components/permissions/HubGate';
import { IfCan } from '@/components/permissions/PermissionGuard';

function AutomatizacionesInner() {
  const { configs, isLoading, upsertConfig, enableAllRecommended, activeCount, totalCount, artists } = useAutomationConfigs();
  const [activeTab, setActiveTab] = useState('booking');

  const handleToggle = (key: string, enabled: boolean) => {
    upsertConfig.mutate({ automation_key: key, is_enabled: enabled });
  };

  const handleFieldChange = (key: string, field: string, value: unknown) => {
    upsertConfig.mutate({ automation_key: key, [field]: value } as any);
  };

  const handleEnableAll = () => {
    enableAllRecommended.mutate(undefined, {
      onSuccess: () => toast({ title: 'Automatizaciones recomendadas activadas' }),
    });
  };

  return (
    <div className="p-6 space-y-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold font-playfair flex items-center gap-2">
            <Zap className="w-6 h-6 text-primary" />
            Automatizaciones
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Configura los workflows de tu equipo según las mejores prácticas de la industria
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Badge variant="secondary" className="text-sm px-3 py-1">
            {activeCount} de {totalCount} activas
          </Badge>
          <IfCan module="automations" required="manage">
            <Button size="sm" onClick={handleEnableAll} disabled={enableAllRecommended.isPending}>
              <Sparkles className="w-4 h-4 mr-1" />
              Activar recomendadas
            </Button>
          </IfCan>
        </div>
      </div>

      {/* Tabs by module */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="flex-wrap h-auto gap-1">
          {AUTOMATION_MODULES.map(mod => {
            const count = configs.filter(c => c.module === mod.id && c.is_enabled).length;
            const total = AUTOMATIONS.filter(a => a.module === mod.id).length;
            return (
              <TabsTrigger key={mod.id} value={mod.id} className="gap-1.5">
                <mod.icon className="w-4 h-4" />
                {mod.label}
                {count > 0 && (
                  <span className="ml-1 text-[10px] bg-primary/20 text-primary rounded-full px-1.5">
                    {count}/{total}
                  </span>
                )}
              </TabsTrigger>
            );
          })}
        </TabsList>

        {AUTOMATION_MODULES.map(mod => (
          <TabsContent key={mod.id} value={mod.id} className="space-y-6 mt-4">
            {configs.filter(c => c.module === mod.id).length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <mod.icon className="w-12 h-12 mx-auto mb-3 opacity-30" />
                <p>No hay automatizaciones disponibles para este módulo todavía.</p>
              </div>
            ) : (
              [...new Set(configs.filter(c => c.module === mod.id).map(c => c.category))].map(cat => (
                <div key={cat} className="space-y-3">
                  <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">{cat}</h3>
                  <div className="grid gap-3">
                    {configs.filter(c => c.module === mod.id && c.category === cat).map(auto => (
                      <AutomationCard
                        key={auto.key}
                        automation={auto}
                        artists={artists}
                        onToggle={handleToggle}
                        onFieldChange={handleFieldChange}
                      />
                    ))}
                  </div>
                </div>
              ))
            )}
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
}

export default function Automatizaciones() {
  return (
    <HubGate module="automations" required="view">
      <AutomatizacionesInner />
    </HubGate>
  );
}
