import axios from "axios";
import AsyncStorage from "@react-native-async-storage/async-storage";

const api = axios.create({
  baseURL: "http://192.168.100.13:8000/api/",
  timeout: 30000,
});

// Función para construir la URL de las imágenes
export const getImageUrl = (imagePath) => {
  // Verifica si la ruta ya incluye "/media/"
  return imagePath.startsWith('/media/')
    ? `http://192.168.100.13:8000${imagePath}` // Usa directamente la ruta completa
    : `http://192.168.100.13:8000/media/${imagePath}`; // Agrega "/media/" si no está presente
};

// Interceptor para agregar el token automáticamente
api.interceptors.request.use(async (config) => {
  try {
    const token = await AsyncStorage.getItem("access_token");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
      console.log("Token encontrado:", token); // Para depuración
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
    const token = await AsyncStorage.getItem("access_token");
    if (error.response?.status === 401 && token) {
      console.log("Error 401 - No autorizado");
      await AsyncStorage.multiRemove(['access_token', 'refresh_token']);
    }
    return Promise.reject(error);
  }
);

export default api;