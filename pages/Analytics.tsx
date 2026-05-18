import { useState } from 'react';
import { usePageTitle } from '@/hooks/useCommon';
import { useAnalyticsFilters } from '@/hooks/useAnalyticsFilters';
import { useAnalyticsData } from '@/hooks/useAnalyticsData';
import { AnalyticsFilters } from '@/components/analytics/AnalyticsFilters';
import { AnalyticsAlerts } from '@/components/analytics/AnalyticsAlerts';
import { KPICards } from '@/components/analytics/KPICards';
import { RevenueTimeChart } from '@/components/analytics/RevenueTimeChart';
import { ArtistBreakdownChart } from '@/components/analytics/ArtistBreakdownChart';
import { SourceDistributionChart } from '@/components/analytics/SourceDistributionChart';
import { BookingPipelineFunnel } from '@/components/analytics/BookingPipelineFunnel';
import { EventProfitabilityTable } from '@/components/analytics/EventProfitabilityTable';
import { AnalyticsEmptyState } from '@/components/analytics/AnalyticsEmptyState';
import { BarChart3 } from 'lucide-react';
import { HubGate } from '@/components/permissions/HubGate';

function AnalyticsInner() {
  usePageTitle('Analytics');
  const {
    filters, dateRange, previousRange,
    setPeriod, setCustomRange, setArtistIds, setSource, setStatus,
  } = useAnalyticsFilters();

  const [granularity, setGranularity] = useState<'month' | 'quarter' | 'year'>('month');

  const { data, isLoading } = useAnalyticsData(dateRange, previousRange, filters, granularity);

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="p-2 bg-gradient-primary rounded-xl">
          <BarChart3 className="h-6 w-6 text-primary-foreground" />
        </div>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Analytics</h1>
          <p className="text-muted-foreground">
            Cuadro de mando de tu negocio musical
          </p>
        </div>
      </div>

      {/* Filters */}
      <AnalyticsFilters
        period={filters.period}
        setPeriod={setPeriod}
        customStart={filters.customStart}
        customEnd={filters.customEnd}
        setCustomRange={setCustomRange}
        artistIds={filters.artistIds}
        setArtistIds={setArtistIds}
        artists={data?.artists || []}
        source={filters.source}
        setSource={setSource}
        status={filters.status}
        setStatus={setStatus}
      />

      {/* Empty State */}
      {!isLoading && data?.isEmpty && <AnalyticsEmptyState />}

      {/* Content */}
      {(isLoading || !data?.isEmpty) && (
        <>
          {/* Alerts */}
          {data?.alerts && <AnalyticsAlerts alerts={data.alerts} />}

          {/* KPIs */}
          <KPICards
            current={data?.currentKPIs || {} as any}
            previous={data?.previousKPIs || {} as any}
            isLoading={isLoading}
          />

          {/* Revenue Chart */}
          <RevenueTimeChart
            data={data?.timeSeries || []}
            isLoading={isLoading}
            granularity={granularity}
            onGranularityChange={setGranularity}
          />

          {/* Breakdown Row */}
          <div className="grid gap-6 lg:grid-cols-2">
            <ArtistBreakdownChart
              data={data?.artistBreakdown || []}
              isLoading={isLoading}
            />
            <SourceDistributionChart
              data={data?.sourceDistribution || []}
              isLoading={isLoading}
              onSourceClick={setSource}
            />
          </div>

          {/* Pipeline + Profitability */}
          <div className="grid gap-6 lg:grid-cols-2">
            <BookingPipelineFunnel
              data={data?.pipeline || []}
              isLoading={isLoading}
            />
            <EventProfitabilityTable
              data={data?.profitability || []}
              isLoading={isLoading}
            />
          </div>
        </>
      )}
    </div>
  );
}

export default function Analytics() {
  return (
    <HubGate module="analytics" required="view">
      <AnalyticsInner />
    </HubGate>
  );
}
