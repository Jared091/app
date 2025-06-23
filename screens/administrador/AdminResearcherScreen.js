import React, { useState, useRef, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  Image,
  Platform,
  ScrollView,
  Modal,
  ActivityIndicator,
} from "react-native";
import { Picker } from "@react-native-picker/picker";
import { MoreVertical } from "lucide-react-native";
import * as ImagePicker from "expo-image-picker";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as FileSystem from "expo-file-system";
import api from "../../api/index.js";
import { Feather } from "@expo/vector-icons";
import styles from "../../styles/styles"; // Ajusta la ruta según la ubicación del archivo
import axios from "axios"; // Asegúrate de tener axios instalado

const estados = [
  { id: 1, nombre: "Sana" },
  { id: 2, nombre: "Enferma" },
];

export default function AdminResearcherScreen({ navigation }) {
  // Estados principales
  const [nombrePlanta, setNombrePlanta] = useState("");
  const [especie, setEspecie] = useState("");
  const [ubicacion, setUbicacion] = useState("");
  const [imagenUri, setImagenUri] = useState(null);
  const [resultado, setResultado] = useState(null);
  const [cargando, setCargando] = useState(false);
  const [menuVisible, setMenuVisible] = useState(false);

  // Estados para el flujo de diagnóstico
  const [estadoPlanta, setEstadoPlanta] = useState(""); // 's' (sana) o 'e' (enferma)
  const [mostrarModalCorreccion, setMostrarModalCorreccion] = useState(false);
  const [claseSeleccionada, setClaseSeleccionada] = useState("");

  // Nuevo estado para controlar el guardado
  const [guardando, setGuardando] = useState(false);
  const [userId, setUserId] = useState(null);
  const [estadoId, setEstadoId] = useState(null);

  // Datos fijos
  const tiposPlantas = ["Pino", "Ocote"];
  const scrollViewRef = useRef();

  // Solicitar permisos de cámara
  useEffect(() => {
    (async () => {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== "granted") {
        Alert.alert(
          "Permisos requeridos",
          "Se necesita acceso a la cámara para continuar"
        );
      }
    })();
  }, []);

  useEffect(() => {
    AsyncStorage.getItem("user_id").then((id) => setUserId(id));
  }, []);

  const validarCampos = () => {
    if (!estadoPlanta) {
      Alert.alert("Validación", "Selecciona el estado de la planta.");
      return false;
    }
    if (!nombrePlanta) {
      Alert.alert("Validación", "Selecciona el tipo de planta.");
      return false;
    }
    if (!especie.trim()) {
      Alert.alert("Validación", "Ingresa la especie.");
      return false;
    }
    if (!ubicacion.trim()) {
      Alert.alert("Validación", "Ingresa la ubicación.");
      return false;
    }
    return true;
  };

  // Función para tomar foto con la cámara
  const tomarFoto = async () => {
    if (!validarCampos()) return;
    try {
      setCargando(true);
      const resultado = await ImagePicker.launchCameraAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
      });

      if (!resultado.canceled && resultado.assets?.[0]) {
        const imagen = resultado.assets[0];
        setImagenUri(imagen.uri);

        const formData = new FormData();
        formData.append("image", {
          uri: imagen.uri,
          type: "image/jpeg",
          name: `clasificacion_${Date.now()}.jpg`,
        });

        const respuesta = await api.post(
          estadoPlanta === "s" ? "/classify-tree/" : "/classify-disease/",
          formData,
          { headers: { "Content-Type": "multipart/form-data" } }
        );
        if (
          respuesta.data?.predicted_class &&
          respuesta.data.confidence !== undefined
        ) {
          const confianza = Math.round(respuesta.data.confidence);
          setResultado({
            nombre: respuesta.data.predicted_class,
            confianza: confianza,
          });

          // 🆕 Registrar la clasificación en el backend
          await registrarClasificacion(
            respuesta.data.predicted_class,
            confianza,
            imagen.uri
          );
        }
      }
    } catch (error) {
      Alert.alert(
        "Error",
        error.message || "No se pudo tomar o clasificar la foto"
      );
    } finally {
      setCargando(false);
    }
  };

  const cargarGaleria = async () => {
    if (!validarCampos()) return;
    try {
      setCargando(true);
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        quality: 0.8,
      });

      if (!result.canceled && result.assets?.[0]) {
        const imagen = result.assets[0];
        setImagenUri(imagen.uri);

        // Clasificar la imagen (igual que tomarFoto)
        const formData = new FormData();
        formData.append("image", {
          uri: imagen.uri,
          type: "image/jpeg",
          name: `clasificacion_${Date.now()}.jpg`,
        });

        const respuesta = await api.post(
          estadoPlanta === "s" ? "/classify-tree/" : "/classify-disease/",
          formData,
          { headers: { "Content-Type": "multipart/form-data" } }
        );

        if (
          respuesta.data?.predicted_class &&
          respuesta.data.confidence !== undefined
        ) {
          const confianza = Math.round(respuesta.data.confidence);
          setResultado({
            nombre: respuesta.data.predicted_class,
            confianza: confianza,
          });
        }
      }
    } catch (error) {
      Alert.alert(
        "Error",
        error.message || "No se pudo cargar o clasificar la imagen"
      );
    } finally {
      setCargando(false);
    }
  };

  // Nueva función para guardar la planta
  const guardarPlanta = async () => {
    const formData = new FormData();
    formData.append("Nombre", nombrePlanta);
    formData.append("especie", especie);
    formData.append("ubicacion", ubicacion);
    formData.append("usuario", Number(userId)); // ID del usuario
    formData.append("estado", estadoPlanta === "s" ? 1 : 2); // ID del estado
    formData.append("confianza", resultado?.confianza ?? 0); // Confianza de la clasificación
    formData.append("imagen", {
      uri: imagenUri, // URI de la imagen seleccionada
      type: "image/jpeg", // Tipo de archivo
      name: `planta_${Date.now()}.jpg`, // Nombre del archivo
    });

    try {
      const response = await api.post("/plantas/", formData, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      });

      if (response.status === 201 || response.status === 200) {
        Alert.alert("Éxito", "Planta guardada correctamente.");
        navigation.navigate("Galeria"); // Redirige a la pantalla de galería
      } else {
        Alert.alert("Error", "No se pudo guardar la planta.");
      }
    } catch (error) {
      console.error(error.response?.data || error.message);
      Alert.alert("Error", error.message || "No se pudo guardar la planta.");
    }
  };

  // Nueva función para registrar clasificación en Django
  const registrarClasificacion = async (predictedClass, confidence, uri) => {
    try {
      const formData = new FormData();
      formData.append("usuario", Number(userId));
      formData.append("clase_predicha", predictedClass);
      formData.append("confianza", confidence);
      formData.append("imagen", {
        uri,
        type: "image/jpeg",
        name: `registro_${Date.now()}.jpg`,
      });

      await api.post("/clasificaciones/", formData, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      });
      console.log("Clasificación registrada en backend.");
    } catch (error) {
      console.error(
        "Error al registrar clasificación:",
        error?.response?.data || error.message
      );
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: "#F5F5DC" }}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerText}>Detección de Plantas</Text>
        <TouchableOpacity
          onPress={() => setMenuVisible(!menuVisible)}
          hitSlop={{ top: 20, bottom: 20, left: 20, right: 20 }}
          testID="menu-toggle"
        >
          <MoreVertical size={24} color="white" />
        </TouchableOpacity>
        {menuVisible && (
          <View style={styles.menu}>
            <TouchableOpacity
              onPress={() => {
                setMenuVisible(false);
                navigation.navigate("Admin");
              }}
              style={styles.menuButton}
            >
              <Text style={styles.menuItem}>Ir al Panel Principal</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => {
                setMenuVisible(false);
                navigation.navigate("Galeria"); // <--- Nueva opción
              }}
              style={styles.menuButton}
            >
              <Text style={styles.menuItem}>Galería de Imágenes</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={async () => {
                setMenuVisible(false);
                await AsyncStorage.multiRemove([
                  "access_token",
                  "refresh_token",
                  "user_role",
                  "user_id",
                ]);
                navigation.reset({
                  index: 0,
                  routes: [{ name: "Login" }],
                });
              }}
              style={styles.menuButton}
              testID="logout-button"
            >
              <Text style={styles.menuItem}>Cerrar Sesión</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>

      <ScrollView contentContainerStyle={styles.scrollContainer}>
        <View style={styles.formContainer}>
          <Text style={styles.label}>Estado de la planta:</Text>
          <View style={styles.pickerContainer}>
            <Picker
              selectedValue={estadoPlanta}
              onValueChange={setEstadoPlanta}
              style={styles.picker}
            >
              <Picker.Item label="Selecciona estado" value="" />
              <Picker.Item label="Sana" value="s" />
              <Picker.Item label="Enferma" value="e" />
            </Picker>
          </View>

          <Text style={styles.label}>Tipo de planta:</Text>
          <View style={styles.pickerContainer}>
            <Picker
              selectedValue={nombrePlanta}
              onValueChange={setNombrePlanta}
              style={styles.picker}
              enabled={!!estadoPlanta}
            >
              <Picker.Item label="Selecciona tipo" value="" />
              {tiposPlantas.map((tipo) => (
                <Picker.Item key={tipo} label={tipo} value={tipo} />
              ))}
            </Picker>
          </View>

          <Text style={styles.label}>Especie:</Text>
          <TextInput
            style={styles.input}
            placeholder="Ej. Pinus oocarpa"
            value={especie}
            onChangeText={setEspecie}
            editable={!!nombrePlanta}
          />

          <Text style={styles.label}>Ubicación:</Text>
          <TextInput
            style={styles.input}
            placeholder="Ej. Jardín trasero, zona 5"
            value={ubicacion}
            onChangeText={setUbicacion}
            editable={!!especie.trim()} // Solo habilitado si ya puso especie
          />

          <View style={styles.botonesContainer}>
            <TouchableOpacity
              style={[
                styles.cameraButton,
                (cargando ||
                  !estadoPlanta ||
                  !nombrePlanta ||
                  !especie.trim() ||
                  !ubicacion.trim()) &&
                  styles.cameraButtonDisabled,
              ]}
              onPress={tomarFoto}
              disabled={
                cargando ||
                !estadoPlanta ||
                !nombrePlanta ||
                !especie.trim() ||
                !ubicacion.trim()
              }
            >
              <Feather name="camera" size={32} color="#fff" />
              <Text style={styles.cameraButtonText}>
                {cargando ? "Procesando..." : "Tomar Foto"}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.cameraButton,
                (cargando ||
                  !estadoPlanta ||
                  !nombrePlanta ||
                  !especie.trim() ||
                  !ubicacion.trim()) &&
                  styles.cameraButtonDisabled,
              ]}
              onPress={cargarGaleria}
              disabled={
                cargando ||
                !estadoPlanta ||
                !nombrePlanta ||
                !especie.trim() ||
                !ubicacion.trim()
              }
            >
              <Feather name="image" size={32} color="#fff" />
              <Text style={styles.cameraButtonText}>
                {cargando ? "Procesando..." : "Galería"}
              </Text>
            </TouchableOpacity>
          </View>

          {/* Botón para guardar la planta */}
          <TouchableOpacity
            style={[
              styles.cameraButton,
              (!imagenUri ||
                guardando ||
                cargando ||
                !estadoPlanta ||
                !nombrePlanta ||
                !especie.trim() ||
                !ubicacion.trim()) &&
                styles.cameraButtonDisabled,
              { marginTop: 20, backgroundColor: "#27ae60" },
            ]}
            onPress={guardarPlanta}
            disabled={
              !imagenUri ||
              guardando ||
              cargando ||
              !estadoPlanta ||
              !nombrePlanta ||
              !especie.trim() ||
              !ubicacion.trim()
            }
          >
            <Feather name="save" size={28} color="#fff" />
            <Text style={styles.cameraButtonText}>
              {guardando ? "Guardando..." : "Guardar Planta"}
            </Text>
          </TouchableOpacity>

          {cargando && (
            <ActivityIndicator
              size="large"
              color="#3498db"
              style={{ marginVertical: 20 }}
            />
          )}

          {imagenUri && !cargando && (
            <View style={styles.resultadoContainer}>
              <Image
                source={{ uri: imagenUri }}
                style={styles.resultadoImagen}
                resizeMode="contain"
              />
              {resultado && (
                <View style={styles.resultadoBox}>
                  <Feather
                    name="check-circle"
                    size={32}
                    color="#2ecc71"
                    style={{ marginBottom: 8 }}
                  />
                  <Text style={styles.resultadoTitulo}>
                    ¡Clasificación exitosa!
                  </Text>
                  <Text style={styles.resultadoTexto}>
                    {estadoPlanta === "s" ? (
                      <>
                        Planta clasificada como:{" "}
                        <Text style={{ fontWeight: "bold", color: "#006400" }}>
                          {resultado.nombre}
                        </Text>
                      </>
                    ) : (
                      <>
                        Enfermedad detectada:{" "}
                        <Text style={{ fontWeight: "bold", color: "#8B0000" }}>
                          {resultado.nombre}
                        </Text>
                      </>
                    )}
                  </Text>
                  <Text style={styles.resultadoTexto}>
                    Confianza:{" "}
                    <Text style={{ fontWeight: "bold", color: "#1E88E5" }}>
                      {resultado.confianza}%
                    </Text>
                  </Text>
                  <TouchableOpacity
                    style={[
                      styles.cameraButton,
                      { backgroundColor: "#e74c3c", marginTop: 10 },
                    ]}
                    onPress={() => setMostrarModalCorreccion(true)}
                  >
                    <Feather name="edit-2" size={22} color="#fff" />
                    <Text style={styles.cameraButtonText}>
                      Corregir clasificación
                    </Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>
          )}
        </View>
      </ScrollView>

      <Modal visible={mostrarModalCorreccion} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>
              Selecciona la{" "}
              {estadoPlanta === "s" ? "clase correcta" : "enfermedad correcta"}:
            </Text>
            <Picker
              selectedValue={claseSeleccionada}
              onValueChange={setClaseSeleccionada}
              style={styles.modalPicker}
            >
              {tiposPlantas.map((tipo) => (
                <Picker.Item key={tipo} label={tipo} value={tipo} />
              ))}
            </Picker>
            <View style={styles.modalButtonGroup}>
              <TouchableOpacity
                style={[styles.cancelButton, styles.cameraButton]}
                onPress={() => setMostrarModalCorreccion(false)}
              >
                <Text style={styles.cameraButtonText}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.confirmButton, styles.cameraButton]}
                onPress={async () => {
                  try {
                    const formData = new FormData();
                    formData.append("image", {
                      uri: imagenUri,
                      type: "image/jpeg",
                      name: `correccion_${Date.now()}.jpg`,
                    });
                    formData.append("true_class", claseSeleccionada);

                    await api.post(
                      estadoPlanta === "s" ? "/train/" : "/train-disease/",
                      formData,
                      { headers: { "Content-Type": "multipart/form-data" } }
                    );
                    Alert.alert("¡Gracias!", "Corrección enviada.");
                    setMostrarModalCorreccion(false);
                  } catch (error) {
                    Alert.alert("Error", "No se pudo enviar la corrección");
                  }
                }}
              >
                <Text style={styles.cameraButtonText}>Enviar corrección</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}
