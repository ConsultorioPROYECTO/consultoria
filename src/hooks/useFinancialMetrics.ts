import { useState, useEffect, useCallback } from 'react';

interface FinancialMetrics {
  scheduledAppointments: number;
  completedAppointments: number;
}

interface UseFinancialMetricsOptions {
  organizationId?: number;
  dateFrom?: string; // YYYY-MM-DD
  dateTo?: string;   // YYYY-MM-DD
}

export function useFinancialMetrics(options: UseFinancialMetricsOptions = {}) {
  const { organizationId = 1, dateFrom, dateTo } = options;
  const [data, setData] = useState<FinancialMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const params = new URLSearchParams();
      params.append('organizationId', String(organizationId));
      if (dateFrom) params.append('dateFrom', dateFrom);
      if (dateTo) params.append('dateTo', dateTo);

      const res = await fetch(`/api/dashboard/financial-metrics?${params.toString()}`);
      if (!res.ok) throw new Error(`Error ${res.status}`);
      const json = await res.json();
      setData(json);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  }, [organizationId, dateFrom, dateTo]);

  useEffect(() => {
    load();
  }, [load]);

  return { data, loading, error, refetch: load };
}