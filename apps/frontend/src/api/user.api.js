import api from "@/lib/axios";

const UserApi = {
  getSetupStatus: () => api.get("/api/users/setup-status"),
  setup: (body) => api.post("/api/users/setup", body),
  login: (body) => api.post("/api/users/login", body),
  getMe: () => api.get("/api/users/me"),
  changePassword: (body) => api.post("/api/users/change-password", body),
  updateProfile: (body) => api.put("/api/users/me", body),
};

export default UserApi;
