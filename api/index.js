import axios from "axios";
import AsyncStorage from "@react-native-async-storage/async-storage";

const api = axios.create({
  baseURL: "http://192.168.98.39:8000/api/",
  timeout: 30000,
});

// Interceptor para agregar el token automáticamentew
api.interceptors.request.use(async (config) => {
  try {
    const token = await AsyncStorage.getItem("access_token");
    console.log("Token encontrado:", token); // Para depuración
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  } catch (error) {
    console.error("Error en interceptor:", error);
    return config;
  }
});

// Interceptor para manejar errores de autenticación
api.interceptors.response.use(
  response => response,
  async error => {
    if (error.response?.status === 401) {
      console.log("Error 401 - No autorizado");
      await AsyncStorage.multiRemove(['access_token', 'refresh_token']);
      // Opcional: Redirigir a pantalla de login
    }
    return Promise.reject(error);
  }
);

export default api;