import axios from "axios";
import httpStatus from "http-status";
import { createContext, useContext, useState } from "react";
import { useNavigate } from "react-router-dom";
import server from "../environment";

export const AuthContext = createContext({});

const client = axios.create({
  baseURL: `${server}/api/v1/users`,
  headers: {
    "Content-Type": "application/json",
    Accept: "application/json",
  },
});

export const AuthProvider = ({ children }) => {
  const authContext = useContext(AuthContext);

  const [userData, setUserData] = useState(authContext);

  const router = useNavigate();

  const handleRegister = async (name, username, password) => {
    try {
      console.log("Attempting registration:", { name, username });
      let request = await client.post("/register", {
        name: name,
        username: username,
        password: password,
      });

      if (request.status === httpStatus.CREATED) {
        return request.data.message;
      }
    } catch (err) {
      console.error("Registration error:", err.response?.data || err.message);
      throw err;
    }
  };

  const handleLogin = async (username, password) => {
    try {
      console.log("Attempting login:", { username });
      let request = await client.post("/login", {
        username: username,
        password: password,
      });

      console.log("Login response:", request.data);

      if (request.status === httpStatus.OK) {
        localStorage.setItem("token", request.data.token);
        router("/home");
        return request.data.message;
      }
    } catch (err) {
      console.error("Login error:", err.response?.data || err.message);
      throw err;
    }
  };

  const getHistoryOfUser = async () => {
    try {
      let request = await client.get("/get_all_activity", {
        params: {
          token: localStorage.getItem("token"),
        },
      });
      return request.data;
    } catch (err) {
      throw err;
    }
  };

  const addToUserHistory = async (meetingCode) => {
    try {
      let request = await client.post("/add_to_activity", {
        token: localStorage.getItem("token"),
        meeting_code: meetingCode,
      });
      return request;
    } catch (e) {
      throw e;
    }
  };

  const data = {
    userData,
    setUserData,
    addToUserHistory,
    getHistoryOfUser,
    handleRegister,
    handleLogin,
  };

  return <AuthContext.Provider value={data}>{children}</AuthContext.Provider>;
};
