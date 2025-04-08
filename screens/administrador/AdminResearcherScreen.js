import React, { useState, useRef, useEffect } from 'react';
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

export default function PantallaInvestigadorAdmin({ navigation }) {
  // Estados para el formulario
  const [nombrePlanta, setNombrePlanta] = useState('');
  const [especie, setEspecie] = useState('');
  const [ubicacion, setUbicacion] = useState('');
  const [imagenUri, setImagenUri] = useState(null);
  const [clasePredicha, setClasePredicha] = useState(null);
  const [mostrarModalCorreccion, setMostrarModalCorreccion] = useState(false);
  const [claseSeleccionada, setClaseSeleccionada] = useState("");
  const [cargando, setCargando] = useState(false);
  const [menuVisible, setMenuVisible] = useState(false);
  
  const etiquetasClases = ["Cedro Limon", "Ocote", "Pino"];
  const scrollViewRef = useRef();

  // Solicitar permisos de cámara al montar el componente
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
        setClasePredicha(null);
        await clasificarImagen(imagen.uri);
      }
    } catch (error) {
      Alert.alert('Error', 'No se pudo tomar la foto: ' + error.message);
    } finally {
      setCargando(false);
    }
  };

  // Función para clasificar la imagen
  const clasificarImagen = async (uri) => {
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
        setClasePredicha({
          clase: respuesta.data.predicted_class,
          confianza: confianza
        });
        
        if (!nombrePlanta) {
          setNombrePlanta(respuesta.data.predicted_class);
        }
      }
    } catch (error) {
      Alert.alert("Error", error.message || "Error al clasificar la imagen");
    } finally {
      setCargando(false);
    }
  };

  // Función para enviar corrección de clasificación
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

  // Función para guardar una nueva planta
  const guardarPlanta = async () => {
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

      const extension = imagenUri.split('.').pop() || 'jpg';
      const nombreArchivo = `${nombrePlanta.replace(/\s+/g, '_')}_${Date.now()}.${extension}`;

      const formData = new FormData();
      formData.append('Nombre', nombrePlanta.trim());
      formData.append('Especie', especie.trim());
      formData.append('Ubicacion', ubicacion.trim());
      formData.append('usuario_id', userId);
      
      if (clasePredicha) {
        formData.append('clasificacion', clasePredicha.clase);
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
        respuesta.data?.message || `La planta "${nombrePlanta}" ha sido registrada`,
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
        'No se pudo guardar la planta. Intente nuevamente.'
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
    setClasePredicha(null);
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

  return (
    <View style={styles.container}>
      {/* Header con título y menú */}
      <View style={styles.header}>
        <Text style={styles.headerText}>Modo Investigador (Admin)</Text>
        <TouchableOpacity onPress={() => setMenuVisible(true)}>
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

      {/* Contenido principal con formulario */}
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
            {/* Campo Nombre */}
            <Text style={styles.label}>Nombre de la planta:</Text>
            <View style={styles.pickerContainer}>
              <Picker
                selectedValue={nombrePlanta}
                onValueChange={(value) => {
                  setNombrePlanta(value);
                  if (!imagenUri && value) {
                    // Sugerir automáticamente la especie si el usuario selecciona del picker
                    setEspecie(value === "Cedro Limon" ? "Citrus medica" : 
                              value === "Ocote" ? "Pinus oocarpa" : 
                              value === "Pino" ? "Pinus spp" : "");
                  }
                }}
                style={styles.picker}
                dropdownIconColor="#8B7765"
              >
                <Picker.Item label="Seleccione una planta" value="" />
                {etiquetasClases.map((planta) => (
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
              disabled={cargando}
            >
              {cargando ? (
                <ActivityIndicator color="white" />
              ) : (
                <Text style={styles.buttonText}>Tomar Foto</Text>
              )}
            </TouchableOpacity>

            {/* Vista previa de imagen y resultados */}
            {imagenUri && (
              <View style={styles.imageContainer}>
                <Image 
                  source={{ uri: imagenUri }} 
                  style={styles.image} 
                  resizeMode="cover"
                />
                
                {clasePredicha ? (
                  <View style={styles.classificationContainer}>
                    <Text style={styles.classificationText}>
                      Clasificación: {clasePredicha.clase} ({clasePredicha.confianza}% de confianza)
                    </Text>
                    
                    <View style={styles.buttonGroup}>
                      <TouchableOpacity 
                        style={[styles.button, styles.correctButton]}
                        onPress={() => setMostrarModalCorreccion(true)}
                      >
                        <Text style={styles.buttonText}>Corregir</Text>
                      </TouchableOpacity>
                      
                      <TouchableOpacity 
                        style={[styles.button, styles.saveButton]}
                        onPress={guardarPlanta}
                        disabled={cargando}
                      >
                        {cargando ? (
                          <ActivityIndicator color="white" />
                        ) : (
                          <Text style={styles.buttonText}>Guardar Planta</Text>
                        )}
                      </TouchableOpacity>
                    </View>
                  </View>
                ) : cargando ? (
                  <ActivityIndicator size="large" color="#006400" style={{ marginVertical: 15 }} />
                ) : null}
              </View>
            )}
          </View>
        </KeyboardAvoidingView>
      </ScrollView>

      {/* Modal para corrección de clasificación */}
      <Modal visible={mostrarModalCorreccion} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Seleccione la clase correcta</Text>
            
            <Picker
              selectedValue={claseSeleccionada}
              onValueChange={setClaseSeleccionada}
              style={styles.modalPicker}
            >
              <Picker.Item label="Seleccione una clase" value="" />
              {etiquetasClases.map((clase) => (
                <Picker.Item label={clase} value={clase} key={clase} />
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
                disabled={!claseSeleccionada || cargando}
              >
                {cargando ? (
                  <ActivityIndicator color="white" />
                ) : (
                  <Text style={styles.buttonText}>Confirmar</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
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
    backgroundColor: '#228B22',
    padding: 15,
    borderRadius: 5,
    alignItems: 'center',
    marginTop: 10,
    justifyContent: 'center',
    minHeight: 50,
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
  },
  image: {
    width: '100%',
    height: 250,
  },
  classificationContainer: {
    backgroundColor: '#FFFFFF',
    padding: 15,
    borderTopWidth: 1,
    borderTopColor: '#ddd',
  },
  classificationText: {
    fontSize: 16,
    color: '#333',
    marginBottom: 10,
    textAlign: 'center',
    fontWeight: '500',
  },
  buttonGroup: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 10,
  },
  correctButton: {
    backgroundColor: '#3498db',
    flex: 1,
  },
  saveButton: {
    backgroundColor: '#2E7D32',
    flex: 1,
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