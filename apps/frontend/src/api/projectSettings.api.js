import api from "@/lib/axios";

const ProjectSettingsApi = {
  list: (projectId) => api.get(`/api/projects/${projectId}/settings`),
  update: (projectId, body) => api.patch(`/api/projects/${projectId}/settings`, body),
  reset: (projectId, key) => api.post(`/api/projects/${projectId}/settings/reset/${key}`),
};

export default ProjectSettingsApi;
