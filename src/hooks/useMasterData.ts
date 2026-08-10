import { useState, useEffect } from 'react';
import api from '../services/api';
import type { MasterData } from '../types/report';

const useMasterData = (reportType?: string) => {
  const [masterData, setMasterData] = useState<MasterData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState<string | null>(null);

  useEffect(() => {
    const fetch = async () => {
      try {
        const params = reportType ? { type: reportType } : {};
        const res = await api.get('/master', { params });
        setMasterData(res.data.data);
      } catch (err: any) {
        setError(err.response?.data?.message || 'Failed to load master data');
      } finally {
        setLoading(false);
      }
    };
    fetch();
  }, [reportType]);

  return { masterData, loading, error };
};

export default useMasterData;