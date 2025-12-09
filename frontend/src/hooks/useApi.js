import { useState, useCallback } from 'react';
import { API_URL } from '../config/wagmi';

export function useApi() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const request = useCallback(async (endpoint, options = {}) => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`${API_URL}${endpoint}`, {
        headers: {
          'Content-Type': 'application/json',
          ...options.headers,
        },
        ...options,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Request failed');
      }

      return data;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const getAgents = useCallback((type) => {
    const params = type !== undefined ? `?type=${type}` : '';
    return request(`/api/agents${params}`);
  }, [request]);

  const getAgent = useCallback((id) => {
    return request(`/api/agents/${id}`);
  }, [request]);

  const getTopAgents = useCallback((type, limit = 10) => {
    return request(`/api/agents/top/${type}?limit=${limit}`);
  }, [request]);

  const getTasks = useCallback((requester) => {
    const params = requester ? `?requester=${requester}` : '';
    return request(`/api/tasks${params}`);
  }, [request]);

  const getTask = useCallback((id) => {
    return request(`/api/tasks/${id}`);
  }, [request]);

  const processTask = useCallback((taskId, async = true) => {
    return request(`/api/tasks/${taskId}/process?async=${async}`, {
      method: 'POST'
    });
  }, [request]);

  const getJobStatus = useCallback((jobId) => {
    return request(`/api/tasks/jobs/${jobId}`);
  }, [request]);

  return {
    loading,
    error,
    getAgents,
    getAgent,
    getTopAgents,
    getTasks,
    getTask,
    processTask,
    getJobStatus,
  };
}
