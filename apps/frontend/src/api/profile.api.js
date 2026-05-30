import api from "@/lib/axios";

const ProfileApi = {
  list: (projectId, params) =>
    api.get(`/api/projects/${projectId}/users`, { params }),
  get: (projectId, profileId) =>
    api.get(`/api/projects/${projectId}/users/${profileId}`),
  getByUserId: (projectId, userId) =>
    api.get(`/api/projects/${projectId}/users/user/${userId}`),
  getActivity: (projectId, profileId, params) =>
    api.get(`/api/projects/${projectId}/users/${profileId}/activity`, { params }),
  getEvents: (projectId, profileId, params) =>
    api.get(`/api/projects/${projectId}/users/${profileId}/events`, { params }),
  getBreakdown: (projectId, profileId, params) =>
    api.get(`/api/projects/${projectId}/users/${profileId}/breakdown`, { params }),
  delete: (projectId, profileId) =>
    api.delete(`/api/projects/${projectId}/users/${profileId}`),
};

export default ProfileApi;
