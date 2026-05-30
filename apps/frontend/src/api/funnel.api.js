import api from "@/lib/axios";

const FunnelApi = {
  list: (projectId) => api.get(`/api/projects/${projectId}/funnels`),
  get: (projectId, funnelId) => api.get(`/api/projects/${projectId}/funnels/${funnelId}`),
  create: (projectId, data) => api.post(`/api/projects/${projectId}/funnels`, data),
  update: (projectId, funnelId, data) => api.put(`/api/projects/${projectId}/funnels/${funnelId}`, data),
  delete: (projectId, funnelId) => api.delete(`/api/projects/${projectId}/funnels/${funnelId}`),
  calculate: (projectId, funnelId, params = {}) =>
    api.get(`/api/projects/${projectId}/funnels/${funnelId}/calculate`, { params }),
};

export default FunnelApi;
