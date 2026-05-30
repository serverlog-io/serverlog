import api from "@/lib/axios";

const DashboardApi = {
  list: (projectId) => api.get(`/api/projects/${projectId}/dashboard`),
  get: (projectId, chartId) => api.get(`/api/projects/${projectId}/dashboard/${chartId}`),
  create: (projectId, data) => api.post(`/api/projects/${projectId}/dashboard`, data),
  update: (projectId, chartId, data) => api.put(`/api/projects/${projectId}/dashboard/${chartId}`, data),
  delete: (projectId, chartId) => api.delete(`/api/projects/${projectId}/dashboard/${chartId}`),
  reorder: (projectId, chartIds) => api.post(`/api/projects/${projectId}/dashboard/reorder`, { chartIds }),
};

export default DashboardApi;
