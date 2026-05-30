import { createContext, useContext, useReducer, useEffect, useMemo, useCallback } from "react";
import Cookies from "js-cookie";
import UserApi from "@/api/user.api";

const UserContext = createContext(undefined);

const initialState = {
  data: null,
  status: "idle",
  error: null,
};

const reducer = (state, action) => {
  switch (action.type) {
    case "SET_LOADING":
      return { ...state, status: "loading", error: null };
    case "SET_USER":
      return { ...state, data: action.payload, status: "success", error: null };
    case "SET_ERROR":
      return { ...state, status: "error", error: action.payload };
    case "LOGOUT":
      return { ...initialState, status: "idle" };
    default:
      return state;
  }
};

function useProvideUser() {
  const [state, dispatch] = useReducer(reducer, initialState);

  const getUser = useCallback(async () => {
    const token = Cookies.get("token");
    if (!token) {
      dispatch({ type: "LOGOUT" });
      return;
    }

    dispatch({ type: "SET_LOADING" });
    try {
      const { data } = await UserApi.getMe();
      dispatch({ type: "SET_USER", payload: data });
    } catch (error) {
      dispatch({ type: "SET_ERROR", payload: error.message });
      Cookies.remove("token");
    }
  }, []);

  const login = useCallback(async (email, password) => {
    dispatch({ type: "SET_LOADING" });
    try {
      const { data } = await UserApi.login({ email, password });
      Cookies.set("token", data.token, { expires: 7 });
      dispatch({ type: "SET_USER", payload: data.user });
      return data;
    } catch (error) {
      dispatch({ type: "SET_ERROR", payload: error.response?.data?.message || "Login failed" });
      throw error;
    }
  }, []);

  const setup = useCallback(async (email, password) => {
    dispatch({ type: "SET_LOADING" });
    try {
      const { data } = await UserApi.setup({ email, password });
      Cookies.set("token", data.token, { expires: 7 });
      dispatch({ type: "SET_USER", payload: data.user });
      return data;
    } catch (error) {
      dispatch({ type: "SET_ERROR", payload: error.response?.data?.message || "Setup failed" });
      throw error;
    }
  }, []);

  const logout = useCallback(() => {
    Cookies.remove("token");
    dispatch({ type: "LOGOUT" });
  }, []);

  useEffect(() => {
    getUser();
  }, [getUser]);

  const isLogged = useMemo(() => !!state.data, [state.data]);
  const isAdmin = useMemo(() => state.data?.role === "ADMIN", [state.data]);

  return {
    user: state.data,
    status: state.status,
    error: state.error,
    isLogged,
    isAdmin,
    login,
    setup,
    logout,
    getUser,
  };
}

export function ProvideUser({ children }) {
  const user = useProvideUser();
  return <UserContext.Provider value={user}>{children}</UserContext.Provider>;
}

export function useUser() {
  const context = useContext(UserContext);
  if (context === undefined) {
    throw new Error("useUser must be used within a ProvideUser");
  }
  return context;
}
