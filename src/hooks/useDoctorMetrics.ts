import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../app/context/AuthContext';

export interface DoctorMetric {
  doctorName: string;
  citas: number;
  horas_ocupadas: number;
}

interface Options {
  dateFrom?: string;
  dateTo?: string;
}

export function useDoctorMetrics(options: Options = {}) {
  const { dateFrom, dateTo } = options;
  const { organizationId, getAuthToken, isLoadingRole } = useAuth();
  const [data, setData] = useState<DoctorMetric[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (organizationId === null || isLoadingRole) return;
    
    try {
      setLoading(true);
      setError(null);
      
      const token = await getAuthToken();
      if (!token) {
        throw new Error('No authentication token available');
      }
      
      const params = new URLSearchParams();
      params.append('organizationId', String(organizationId));
      if (dateFrom) params.append('dateFrom', dateFrom);
      if (dateTo) params.append('dateTo', dateTo);

      const res = await fetch(`/api/dashboard/doctor-metrics?${params.toString()}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (!res.ok) throw new Error(`Error ${res.status}`);
      const json = await res.json();
      setData(json.data || []);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  }, [organizationId, dateFrom, dateTo, getAuthToken, isLoadingRole]);

  useEffect(() => {
    if (organizationId !== null && !isLoadingRole) {
      load();
    }
  }, [load, organizationId, isLoadingRole]);

  return { data, loading, error, refetch: load };
}