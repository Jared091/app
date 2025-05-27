import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  Image,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Modal,
  ActivityIndicator
} from 'react-native';
import { Picker } from '@react-native-picker/picker';
import { MoreVertical } from 'lucide-react-native';
import * as ImagePicker from 'expo-image-picker';
import AsyncStorage from '@react-native-async-storage/async-storage';
import api from '../../api/index.js';

export default function AdminResearcherScreen({ navigation }) {
  // Estados principales
  const [nombrePlanta, setNombrePlanta] = useState('');
  const [especie, setEspecie] = useState('');
  const [ubicacion, setUbicacion] = useState('');
  const [imagenUri, setImagenUri] = useState(null);
  const [resultado, setResultado] = useState(null);
  const [cargando, setCargando] = useState(false);
  const [menuVisible, setMenuVisible] = useState(false);

  // Estados para el flujo de diagnóstico
  const [estadoPlanta, setEstadoPlanta] = useState(''); // 's' (sana) o 'e' (enferma)
  const [mostrarModalCorreccion, setMostrarModalCorreccion] = useState(false);
  const [claseSeleccionada, setClaseSeleccionada] = useState("");

  // Estados para la selección de área afectada
  const [selection, setSelection] = useState({
    x: 0,
    y: 0,
    width: 0,
    height: 0,
    visible: false
  });
  const [imageLayout, setImageLayout] = useState({ width: 0, height: 0 });

  // Datos fijos
  const tiposPlantas = ["Cedro Limon", "Ocote", "Pino"];
  const scrollViewRef = useRef();

  // Solicitar permisos de cámara
  useEffect(() => {
    (async () => {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permisos requeridos', 'Se necesita acceso a la cámara para continuar');
      }
    })();
  }, []);

  // Función para tomar foto con la cámara
  const tomarFoto = async () => {
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
        setResultado(null);
        setSelection({ x: 0, y: 0, width: 0, height: 0, visible: false });

        // Si está sana, clasificar directamente
        if (estadoPlanta === 's') {
          await clasificarPlanta(imagen.uri);
        }
      }
    } catch (error) {
      Alert.alert('Error', 'No se pudo tomar la foto: ' + error.message);
    } finally {
      setCargando(false);
    }
  };

  // Función para clasificar la planta (sana)
  const clasificarPlanta = async (uri) => {
    try {
      setCargando(true);

      const formData = new FormData();
      formData.append("image", {
        uri: uri,
        type: "image/jpeg",
        name: `clasificacion_${Date.now()}.jpg`,
      });

      const respuesta = await api.post("/classify-tree/", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      if (respuesta.data?.predicted_class && respuesta.data.confidence !== undefined) {
        const confianza = Math.round(respuesta.data.confidence * 100);
        setResultado({
          tipo: 'planta',
          nombre: respuesta.data.predicted_class,
          confianza: confianza
        });

        if (!nombrePlanta) {
          setNombrePlanta(respuesta.data.predicted_class);
        }
      }
    } catch (error) {
      Alert.alert("Error", error.message || "Error al clasificar la planta");
    } finally {
      setCargando(false);
    }
  };

  // Función para analizar enfermedad
  const analizarEnfermedad = async () => {
    if (!selection.visible) {
      Alert.alert('Error', 'Por favor selecciona el área afectada en la imagen.');
      return;
    }

    try {
      setCargando(true);

      const formData = new FormData();
      formData.append("image", {
        uri: imagenUri,
        type: "image/jpeg",
        name: `enfermedad_${Date.now()}.jpg`,
      });
      formData.append("area_afectada", JSON.stringify({
        x: selection.x,
        y: selection.y,
        width: selection.width,
        height: selection.height
      }));

      const respuesta = await api.post("/classify-disease/", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      if (respuesta.data?.predicted_class && respuesta.data.confidence !== undefined) {
        const confianza = Math.round(respuesta.data.confidence * 100);
        setResultado({
          tipo: 'enfermedad',
          nombre: respuesta.data.predicted_class,
          confianza: confianza,
          area: {
            x: selection.x,
            y: selection.y,
            width: selection.width,
            height: selection.height
          }
        });
      }
    } catch (error) {
      Alert.alert("Error", error.message || "Error al analizar la enfermedad");
    } finally {
      setCargando(false);
    }
  };

  // Función para guardar el diagnóstico
  const guardarDiagnostico = async () => {
    if (!nombrePlanta || !imagenUri) {
      Alert.alert('Error', 'El nombre y la imagen son obligatorios');
      return;
    }

    try {
      setCargando(true);
      const [userId, token] = await Promise.all([
        AsyncStorage.getItem('user_id'),
        AsyncStorage.getItem('access_token')
      ]);

      if (!userId || !token) {
        throw new Error('Debes iniciar sesión para continuar');
      }

      // Generar nombre de archivo
      const extension = imagenUri.split('.').pop() || 'jpg';
      const nombreArchivo = `planta_${Date.now()}.${extension}`;

      const formData = new FormData();
      formData.append('Nombre', nombrePlanta.trim());
      formData.append('Especie', especie.trim());
      formData.append('Ubicacion', ubicacion.trim());
      formData.append('usuario_id', userId);
      formData.append('estado', estadoPlanta);

      if (resultado) {
        formData.append('clasificacion', resultado.nombre);
        if (estadoPlanta === 'e' && resultado.area) {
          formData.append('area_afectada', JSON.stringify(resultado.area));
        }
      }

      formData.append('imagen', {
        uri: imagenUri,
        name: nombreArchivo,
        type: `image/${extension === 'jpg' ? 'jpeg' : extension}`,
      });

      const respuesta = await api.post('/plantas/', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
          'Authorization': `Bearer ${token}`,
        },
      });

      Alert.alert(
        '✅ Registro exitoso',
        respuesta.data?.message || `Diagnóstico guardado correctamente`,
        [
          {
            text: "Aceptar",
            onPress: () => {
              resetFormulario();
              scrollViewRef.current?.scrollTo({ y: 0, animated: true });
            }
          }
        ]
      );
    } catch (error) {
      Alert.alert(
        'Error',
        error.response?.data?.error ||
        error.message ||
        'No se pudo guardar el diagnóstico. Intente nuevamente.'
      );
    } finally {
      setCargando(false);
    }
  };

  // Función para enviar corrección
  const enviarCorreccion = async () => {
    if (!claseSeleccionada) {
      Alert.alert('Error', 'Debes seleccionar una clase válida');
      return;
    }

    try {
      setCargando(true);
      const formData = new FormData();
      formData.append("image", {
        uri: imagenUri,
        type: "image/jpeg",
        name: `correccion_${Date.now()}.jpg`,
      });
      formData.append("true_class", claseSeleccionada);

      const respuesta = await api.post("/train/", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      Alert.alert(
        "✅ Corrección enviada",
        respuesta.data?.message || "La corrección fue registrada exitosamente",
        [
          {
            text: "OK",
            onPress: () => {
              setMostrarModalCorreccion(false);
              resetFormulario();
            }
          }
        ]
      );
    } catch (error) {
      Alert.alert(
        "Error",
        error.response?.data?.error ||
        error.message ||
        "No se pudo enviar la corrección"
      );
    } finally {
      setCargando(false);
    }
  };

  // Función para resetear el formulario
  const resetFormulario = () => {
    setNombrePlanta('');
    setEspecie('');
    setUbicacion('');
    setImagenUri(null);
    setResultado(null);
    setEstadoPlanta('');
    setSelection({ x: 0, y: 0, width: 0, height: 0, visible: false });
    setClaseSeleccionada("");
  };

  // Función para cerrar sesión
  const cerrarSesion = async () => {
    try {
      await AsyncStorage.multiRemove(['access_token', 'refresh_token', 'user_role', 'user_id']);
      navigation.navigate('Login');
    } catch (error) {
      Alert.alert('Error', 'No se pudo cerrar sesión: ' + error.message);
    }
  };

  // Manejar el toque en la imagen para selección de área
  const handleImageTouch = useCallback((e) => {
    if (estadoPlanta !== 'e') return;

    const { locationX, locationY } = e.nativeEvent;
    setSelection({
      x: locationX,
      y: locationY,
      width: 0,
      height: 0,
      visible: true
    });
  }, [estadoPlanta]);

  // Manejar el movimiento en la imagen para selección de área
  const handleImageMove = useCallback((e) => {
    if (estadoPlanta !== 'e' || !selection.visible) return;

    const { locationX, locationY } = e.nativeEvent;
    setSelection(prev => ({
      ...prev,
      width: Math.max(0, Math.min(locationX - prev.x, imageLayout.width - prev.x)),
      height: Math.max(0, Math.min(locationY - prev.y, imageLayout.height - prev.y))
    }));
  }, [estadoPlanta, selection.visible, imageLayout]);

  // Manejar la liberación del toque en la imagen
  const handleImageRelease = useCallback(() => {
    if (estadoPlanta !== 'e') return;

    if (selection.width < 10 || selection.height < 10) {
      setSelection({ ...selection, visible: false });
    }
  }, [estadoPlanta, selection]);

  return (
    <View style={styles.container}>
      {/* Header con título y menú */}
      <View style={styles.header}>
        <Text style={styles.headerText}>Detección de Plantas</Text>
        <TouchableOpacity
          accessible={true}
          testID="menu-button"
          onPress={() => setMenuVisible(true)}
        >
          <MoreVertical size={24} color="white" />
        </TouchableOpacity>
      </View>

      {/* Menú desplegable */}
      <Modal
        transparent={true}
        visible={menuVisible}
        animationType="fade"
        onRequestClose={() => setMenuVisible(false)}
      >
        <TouchableOpacity
          style={styles.menuOverlay}
          activeOpacity={1}
          onPress={() => setMenuVisible(false)}
        >
          <View style={styles.menuContainer}>
            <TouchableOpacity
              style={styles.menuItem}
              onPress={cerrarSesion}
            >
              <Text style={styles.menuItemText}>Cerrar Sesión</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Modal de corrección */}
      <Modal
        transparent={true}
        visible={mostrarModalCorreccion}
        animationType="fade"
        onRequestClose={() => setMostrarModalCorreccion(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Selecciona la clase correcta</Text>
            <Picker
              selectedValue={claseSeleccionada}
              onValueChange={setClaseSeleccionada}
              style={styles.modalPicker}
            >
              <Picker.Item label="Seleccione clase" value="" />
              {tiposPlantas.map((planta) => (
                <Picker.Item label={planta} value={planta} key={planta} />
              ))}
            </Picker>
            <View style={styles.modalButtonGroup}>
              <TouchableOpacity
                style={[styles.button, styles.cancelButton]}
                onPress={() => setMostrarModalCorreccion(false)}
              >
                <Text style={styles.buttonText}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.button, styles.confirmButton]}
                onPress={enviarCorreccion}
              >
                <Text style={styles.buttonText}>Enviar</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Contenido principal */}
      <ScrollView
        ref={scrollViewRef}
        contentContainerStyle={styles.scrollContainer}
        keyboardShouldPersistTaps="handled"
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : null}
          style={styles.keyboardAvoidingView}
        >
          <View style={styles.formContainer}>
            {/* Selector de estado de la planta */}
            <Text style={styles.label} accessibilityLabel="Estado de la planta:">
              Estado de la planta:
            </Text>
            <View style={styles.pickerContainer}>
              <Picker
                testID="estado-planta-picker" // Agregado para pruebas
                selectedValue={estadoPlanta}
                onValueChange={(value) => {
                  setEstadoPlanta(value);
                  setSelection({ x: 0, y: 0, width: 0, height: 0, visible: false });
                  setResultado(null);
                }}
                style={styles.picker}
                accessibilityLabel="Estado de la planta"
              >
                <Picker.Item label="Seleccione estado" value="" />
                <Picker.Item testID='Sana' label="Sana" value="s" />
                <Picker.Item label="Enferma" value="e" />
              </Picker>
            </View>

            {/* Selector de planta */}
            <Text style={styles.label} accessibilityLabel="Tipo de planta:">
              Tipo de planta:
            </Text>
            <View style={styles.pickerContainer}>
              <Picker
                testID="tipo-planta-picker" // Agregado para pruebas
                selectedValue={nombrePlanta}
                onValueChange={(value) => {
                  setNombrePlanta(value);
                  if (!imagenUri && value) {
                    // Sugerir especie automáticamente
                    setEspecie(
                      value === "Cedro Limon" ? "Citrus medica" :
                        value === "Ocote" ? "Pinus oocarpa" :
                          value === "Pino" ? "Pinus spp" : ""
                    );
                  }
                }}
                style={styles.picker}
                accessibilityLabel="Tipo de planta"
              >
                <Picker.Item label="Seleccione planta" value="" />
                {tiposPlantas.map((planta) => (
                  <Picker.Item label={planta} value={planta} key={planta} />
                ))}
              </Picker>
            </View>

            {/* Campo Especie */}
            <Text style={styles.label}>Especie:</Text>
            <TextInput
              style={styles.input}
              placeholder="Ej. Pinus oocarpa"
              value={especie}
              onChangeText={setEspecie}
              placeholderTextColor="#A7C4A0"
            />

            {/* Campo Ubicación */}
            <Text style={styles.label}>Ubicación:</Text>
            <TextInput
              style={styles.input}
              placeholder="Ej. Jardín trasero, zona 5"
              value={ubicacion}
              onChangeText={setUbicacion}
              placeholderTextColor="#A7C4A0"
            />

            {/* Botón para tomar foto */}
            <TouchableOpacity
              style={styles.button}
              onPress={tomarFoto}
              disabled={cargando || !estadoPlanta || !nombrePlanta}
              testID="tomar-foto-button" // <-- Agregado para pruebas
            >
              {cargando ? (
                <ActivityIndicator color="white" />
              ) : (
                <Text style={styles.buttonText}>Tomar Foto</Text>
              )}
            </TouchableOpacity>

            {/* Vista previa de imagen */}
            {imagenUri && (
              <View style={styles.imageContainer}>
                <Image
                  source={{ uri: imagenUri }}
                  style={styles.image}
                  resizeMode="cover"
                  onLoad={(e) => {
                    const { width, height } = e.nativeEvent.source;
                    setImageLayout({ width, height });
                  }}
                />

                {/* Recuadro de selección solo para plantas enfermas */}
                {estadoPlanta === 'e' && selection.visible && (
                  <View style={[
                    styles.selectionBox,
                    {
                      left: selection.x,
                      top: selection.y,
                      width: selection.width,
                      height: selection.height,
                    }
                  ]}>
                    <Text style={styles.selectionText}>Área afectada</Text>
                  </View>
                )}

                {/* Área táctil para selección solo en plantas enfermas */}
                {estadoPlanta === 'e' && (
                  <View
                    style={styles.touchableImageArea}
                    onStartShouldSetResponder={() => true}
                    onResponderGrant={handleImageTouch}
                    onResponderMove={handleImageMove}
                    onResponderRelease={handleImageRelease}
                  />
                )}

                {/* Resultados del análisis */}
                <View>
                  {resultado ? (
                    <View style={styles.resultsContainer}>
                      <Text style={styles.resultTitle}>
                        {resultado.tipo === 'planta' ? 'Planta identificada:' : 'Enfermedad detectada:'}
                      </Text>

                      <View style={styles.resultItem}>
                        <Text style={styles.resultLabel}>Nombre:</Text>
                        <Text style={styles.resultValue}>
                          {resultado.nombre} ({resultado.confianza}% de confianza)
                        </Text>
                      </View>

                      {resultado.tipo === 'enfermedad' && resultado.area && (
                        <View style={styles.resultItem}>
                          <Text style={styles.resultLabel}>Área afectada:</Text>
                          <Text style={styles.resultValue}>
                            {resultado.area.width.toFixed(0)}x{resultado.area.height.toFixed(0)} px
                          </Text>
                        </View>
                      )}

<<<<<<< HEAD
                      <TouchableOpacity
                        testID="guardar-button"
                        style={[styles.button, styles.saveButton]}
                        onPress={guardarDiagnostico}
                        disabled={
                          cargando ||
                          !nombrePlanta ||
                          !especie ||
                          !ubicacion ||
                          !imagenUri
                        }
                      >
                        {cargando ? (
                          <ActivityIndicator color="white" />
                        ) : (
                          <Text style={styles.buttonText}>Guardar</Text>
                        )}
                      </TouchableOpacity>
=======
                      {/* Botones de acciones */}
                      <View style={styles.buttonGroup}>
                        <TouchableOpacity
                          style={[styles.button, styles.correctButton]}
                          onPress={() => setMostrarModalCorreccion(true)}
                        >
                          <Text style={styles.buttonText}>Corregir</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                          testID="guardar-button"
                          style={[styles.button, styles.saveButton]}
                          onPress={guardarDiagnostico}
                          disabled={
                            cargando ||
                            !estadoPlanta ||
                            !nombrePlanta ||
                            !especie.trim() ||
                            !ubicacion.trim()
                          }
                        >
                          {cargando ? (
                            <ActivityIndicator color="white" />
                          ) : (
                            <Text style={styles.buttonText}>Guardar</Text>
                          )}
                        </TouchableOpacity>
                      </View>
>>>>>>> 5c3b70799fb3d55b248d864c9bafc502e679577d
                    </View>
                  ) : estadoPlanta === 'e' && selection.visible ? (
                    <TouchableOpacity
                      style={[styles.button, styles.analyzeButton]}
                      onPress={analizarEnfermedad}
                      disabled={cargando}
                    >
                      <Text style={styles.buttonText}>
                        {cargando ? 'Analizando...' : 'Analizar Enfermedad'}
                      </Text>
                    </TouchableOpacity>
                  ) : (
                    // Mostrar el botón guardar aunque no haya resultado, pero esté la imagen cargada
                    <TouchableOpacity
                      testID="guardar-button"
                      style={[styles.button, styles.saveButton]}
                      onPress={guardarDiagnostico}
                      disabled={
                        cargando ||
                        !estadoPlanta ||
                        !nombrePlanta ||
                        !especie.trim() ||
                        !ubicacion.trim()
                      }
                    >
                      {cargando ? (
                        <ActivityIndicator color="white" />
                      ) : (
                        <Text style={styles.buttonText}>Guardar</Text>
                      )}
                    </TouchableOpacity>
                  )}
                </View>
              </View>
            )}
          </View>
        </KeyboardAvoidingView>
      </ScrollView>
    </View>
  );
}

// Estilos
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5DC',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    width: '100%',
    padding: 15,
    backgroundColor: '#006400',
    paddingTop: Platform.OS === 'android' ? 40 : 15,
  },
  headerText: {
    color: 'white',
    fontSize: 20,
    fontWeight: 'bold',
  },
  menuOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-start',
    alignItems: 'flex-end',
    paddingTop: Platform.OS === 'android' ? 70 : 60,
    paddingRight: 10,
  },
  menuContainer: {
    backgroundColor: 'white',
    borderRadius: 5,
    padding: 10,
    minWidth: 150,
  },
  menuItem: {
    paddingVertical: 10,
  },
  menuItemText: {
    fontSize: 16,
    color: '#006400',
  },
  scrollContainer: {
    flexGrow: 1,
    paddingBottom: 30,
  },
  keyboardAvoidingView: {
    flex: 1,
  },
  formContainer: {
    width: '90%',
    alignSelf: 'center',
    backgroundColor: '#FFFFF0',
    padding: 20,
    borderRadius: 10,
    marginTop: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  label: {
    fontSize: 16,
    color: '#8B7765',
    marginBottom: 8,
    fontWeight: '500',
  },
  pickerContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 5,
    marginBottom: 15,
    borderWidth: 1,
    borderColor: '#ddd',
    overflow: 'hidden',
  },
  picker: {
    height: 50,
    width: '100%',
    color: '#4d4d4d',
  },
  input: {
    backgroundColor: '#FFFFFF',
    padding: 12,
    borderRadius: 5,
    fontSize: 16,
    color: '#4d4d4d',
    marginBottom: 15,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  button: {
    backgroundColor: '#006400',
    padding: 15,
    borderRadius: 5,
    alignItems: 'center',
    marginVertical: 10,
    justifyContent: 'center',
    minHeight: 50,
  },
  analyzeButton: {
    backgroundColor: '#1E88E5',
    marginTop: 15,
  },
  correctButton: {
    backgroundColor: '#3498db',
    flex: 1,
  },
  saveButton: {
    backgroundColor: '#2E7D32',
    flex: 1,
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  imageContainer: {
    marginTop: 20,
    borderRadius: 5,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#ddd',
    height: 300,
    position: 'relative',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  touchableImageArea: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 1,
  },
  selectionBox: {
    position: 'absolute',
    backgroundColor: 'rgba(255, 0, 0, 0.3)',
    borderWidth: 2,
    borderColor: 'rgba(255, 0, 0, 0.8)',
    justifyContent: 'flex-end',
    alignItems: 'center',
    zIndex: 2,
  },
  selectionText: {
    color: 'white',
    backgroundColor: 'rgba(255, 0, 0, 0.6)',
    padding: 2,
    fontSize: 12,
  },
  resultsContainer: {
    backgroundColor: '#FFFFFF',
    padding: 15,
    borderTopWidth: 1,
    borderTopColor: '#ddd',
  },
  resultTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#228B22',
    marginBottom: 15,
    textAlign: 'center',
  },
  resultItem: {
    marginBottom: 10,
  },
  resultLabel: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#555',
  },
  resultValue: {
    fontSize: 16,
    color: '#333',
    marginTop: 3,
  },
  buttonGroup: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 10,
    marginTop: 15,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: 'white',
    width: '100%',
    borderRadius: 10,
    padding: 20,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 20,
    textAlign: 'center',
    color: '#333',
  },
  modalPicker: {
    width: '100%',
    marginBottom: 30,
  },
  modalButtonGroup: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 10,
  },
  cancelButton: {
    backgroundColor: '#8B0000',
    flex: 1,
  },
  confirmButton: {
    backgroundColor: '#006400',
    flex: 1,
  },
});