import axios from "axios";

export const api = axios.create({
  baseURL: "/api/backend",
  headers: {
    Accept: "application/json",
  },
  timeout: 10_000,
});