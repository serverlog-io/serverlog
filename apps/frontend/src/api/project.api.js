import api from "@/lib/axios";

const ProjectApi = {
  list: (params) => api.get("/api/projects", { params }),
  get: (id) => api.get(`/api/projects/${id}`),
  getById: (id) => api.get(`/api/projects/${id}`),
  getStats: (id) => api.get(`/api/projects/${id}/stats`),
  create: (body) => api.post("/api/projects", body),
  update: (id, body) => api.put(`/api/projects/${id}`, body),
  delete: (id) => api.delete(`/api/projects/${id}`),
};

export default ProjectApi;
