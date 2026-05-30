import api from "@/lib/axios";

const ApiKeyApi = {
  list: (projectId, params) => api.get(`/api/projects/${projectId}/api-keys`, { params }),
  create: (projectId, body) => api.post(`/api/projects/${projectId}/api-keys`, body),
  update: (projectId, keyId, body) => api.put(`/api/projects/${projectId}/api-keys/${keyId}`, body),
  revoke: (projectId, keyId) => api.post(`/api/projects/${projectId}/api-keys/${keyId}/revoke`),
  delete: (projectId, keyId) => api.delete(`/api/projects/${projectId}/api-keys/${keyId}`),
};

export default ApiKeyApi;
