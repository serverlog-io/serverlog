import api from "@/lib/axios";

const EventApi = {
  list: (projectId, params) =>
    api.get(`/api/projects/${projectId}/events`, { params }),
  getByProject: (projectId, params) =>
    api.get(`/api/projects/${projectId}/events`, { params }),
  getSuggestions: (projectId) =>
    api.get(`/api/projects/${projectId}/events/suggestions`),
  getStats: (projectId, params) =>
    api.get(`/api/projects/${projectId}/events/stats`, { params }),
  getTimeline: (projectId, params) =>
    api.get(`/api/projects/${projectId}/events/timeline`, { params }),
  getOnlineUsers: (projectId, minutes = 30) =>
    api.get(`/api/projects/${projectId}/events/online-users`, { params: { minutes } }),
  get: (projectId, eventId) =>
    api.get(`/api/projects/${projectId}/events/${eventId}`),
  create: (projectId, body) =>
    api.post(`/api/projects/${projectId}/events`, body),
  delete: (projectId, eventId) =>
    api.delete(`/api/projects/${projectId}/events/${eventId}`),
};

export default EventApi;
