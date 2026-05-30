import api from "@/lib/axios";

const ChannelApi = {
  list: (projectId, params) => api.get(`/api/projects/${projectId}/channels`, { params }),
  get: (projectId, channelId) => api.get(`/api/projects/${projectId}/channels/${channelId}`),
  update: (projectId, channelId, data) => api.put(`/api/projects/${projectId}/channels/${channelId}`, data),
  getEvents: (projectId, channelSlug, params) =>
    api.get(`/api/projects/${projectId}/events`, { params: { ...params, channel: channelSlug } }),
  delete: (projectId, channelId) =>
    api.delete(`/api/projects/${projectId}/channels/${channelId}`),
};

export default ChannelApi;
