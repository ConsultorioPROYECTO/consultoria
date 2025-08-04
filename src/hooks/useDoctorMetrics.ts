import { useState, useEffect, useCallback } from 'react';

export interface DoctorMetric {
  doctorName: string;
  citas: number;
  horas_ocupadas: number;
}

interface Options {
  organizationId?: number;
  dateFrom?: string;
  dateTo?: string;
}

export function useDoctorMetrics(options: Options = {}) {
  const { organizationId = 1, dateFrom, dateTo } = options;
  const [data, setData] = useState<DoctorMetric[]>([]);
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

      const res = await fetch(`/api/dashboard/doctor-metrics?${params.toString()}`);
      if (!res.ok) throw new Error(`Error ${res.status}`);
      const json = await res.json();
      setData(json.data || []);
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