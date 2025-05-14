import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  TouchableOpacity, 
  StyleSheet, 
  Alert, 
  Image, 
  ScrollView,
  Platform,
  ActivityIndicator,
  Modal,
  Picker
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { MoreVertical } from 'lucide-react-native';
import * as ImagePicker from 'expo-image-picker';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';

const DiseasesScreen = () => {
  const navigation = useNavigation();
  const [imagenUri, setImagenUri] = useState(null);
  const [plantaDetectada, setPlantaDetectada] = useState(null);
  const [enfermedadDetectada, setEnfermedadDetectada] = useState(null);
  const [cargando, setCargando] = useState(false);
  const [menuVisible, setMenuVisible] = useState(false);
  const [areaSeleccionada, setAreaSeleccionada] = useState('');
  const [mostrarSelectorArea, setMostrarSelectorArea] = useState(false);
  
  // Áreas de la planta que pueden estar afectadas
  const areasPlanta = [
    { label: 'Seleccione el área afectada', value: '' },
    { label: 'Hojas', value: 'hojas' },
    { label: 'Tallo', value: 'tallo' },
    { label: 'Raíces', value: 'raices' },
    { label: 'Flores', value: 'flores' },
    { label: 'Frutos', value: 'frutos' }
  ];

  // Solicitar permisos de cámara
  useEffect(() => {
    (async () => {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permisos requeridos', 'Se necesita acceso a la cámara para continuar');
      }
    })();
  }, []);

  // Tomar foto con la cámara
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
        setPlantaDetectada(null);
        setEnfermedadDetectada(null);
        await identificarPlanta(imagen.uri);
      }
    } catch (error) {
      Alert.alert('Error', 'No se pudo tomar la foto: ' + error.message);
    } finally {
      setCargando(false);
    }
  };

  // Identificar la planta
  const identificarPlanta = async (uri) => {
    try {
      setCargando(true);
      const token = await AsyncStorage.getItem('access_token');

      if (!token) {
        throw new Error('Debes iniciar sesión para continuar');
      }

      const formData = new FormData();
      formData.append('image', {
        uri: uri,
        type: 'image/jpeg',
        name: `identificacion_planta_${Date.now()}.jpg`,
      });

      const response = await axios.post('/classify-tree/', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
          'Authorization': `Bearer ${token}`,
        },
      });

      setPlantaDetectada({
        nombre: response.data.predicted_class,
        confianza: Math.round(response.data.confidence * 100)
      });

      // Mostrar selector de área afectada
      setMostrarSelectorArea(true);

    } catch (error) {
      Alert.alert(
        'Error', 
        error.response?.data?.error || 
        error.message || 
        'No se pudo identificar la planta. Intente nuevamente.'
      );
    } finally {
      setCargando(false);
    }
  };

  // Analizar la enfermedad en el área seleccionada
  const analizarEnfermedad = async () => {
    if (!areaSeleccionada) {
      Alert.alert('Error', 'Debes seleccionar el área afectada');
      return;
    }

    try {
      setCargando(true);
      const token = await AsyncStorage.getItem('access_token');

      const formData = new FormData();
      formData.append('image', {
        uri: imagenUri,
        type: 'image/jpeg',
        name: `analisis_enfermedad_${Date.now()}.jpg`,
      });
      formData.append('area_afectada', areaSeleccionada);

      const response = await axios.post('/classify-disease/', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
          'Authorization': `Bearer ${token}`,
        },
      });

      setEnfermedadDetectada({
        nombre: response.data.predicted_class,
        confianza: Math.round(response.data.confidence * 100),
        area: areaSeleccionada
      });

    } catch (error) {
      Alert.alert(
        'Error', 
        error.response?.data?.error || 
        error.message || 
        'No se pudo analizar la enfermedad. Intente nuevamente.'
      );
    } finally {
      setCargando(false);
    }
  };

  // Guardar los resultados
  const guardarResultados = async () => {
    try {
      setCargando(true);
      const token = await AsyncStorage.getItem('access_token');

      const response = await axios.post('/enfermedades/', {
        planta: plantaDetectada.nombre,
        enfermedad: enfermedadDetectada.nombre,
        area_afectada: enfermedadDetectada.area,
        imagen_url: imagenUri,
        confianza_planta: plantaDetectada.confianza,
        confianza_enfermedad: enfermedadDetectada.confianza
      }, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      Alert.alert(
        '✅ Análisis guardado', 
        `Se registró ${plantaDetectada.nombre} con ${enfermedadDetectada.nombre} en las ${enfermedadDetectada.area}`,
        [{ text: "Aceptar", onPress: () => navigation.goBack() }]
      );
    } catch (error) {
      Alert.alert('Error', 'No se pudo guardar el análisis: ' + error.message);
    } finally {
      setCargando(false);
    }
  };

  // Cerrar sesión
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
        <Text style={styles.headerText}>Detección de Enfermedades</Text>
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

      {/* Contenido principal */}
      <ScrollView contentContainerStyle={styles.scrollContainer}>
        <View style={styles.formContainer}>
          <Text style={styles.instructions}>
            Tome una foto de la planta enferma para analizar automáticamente:
          </Text>
          
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

          {/* Vista previa de imagen */}
          {imagenUri && (
            <View style={styles.imageContainer}>
              <Image 
                source={{ uri: imagenUri }} 
                style={styles.image} 
                resizeMode="cover"
              />
            </View>
          )}

          {/* Resultado de identificación de planta */}
          {plantaDetectada && (
            <View style={styles.resultsContainer}>
              <Text style={styles.resultTitle}>Planta identificada:</Text>
              
              <View style={styles.resultItem}>
                <Text style={styles.resultLabel}>Nombre:</Text>
                <Text style={styles.resultValue}>
                  {plantaDetectada.nombre} ({plantaDetectada.confianza}% de certeza)
                </Text>
              </View>
            </View>
          )}

          {/* Selector de área afectada */}
          {mostrarSelectorArea && (
            <View style={styles.areaContainer}>
              <Text style={styles.label}>Área afectada:</Text>
              <View style={styles.pickerContainer}>
                <Picker
                  selectedValue={areaSeleccionada}
                  onValueChange={(itemValue) => setAreaSeleccionada(itemValue)}
                  style={styles.picker}
                >
                  {areasPlanta.map((area) => (
                    <Picker.Item 
                      key={area.value} 
                      label={area.label} 
                      value={area.value} 
                    />
                  ))}
                </Picker>
              </View>

              <TouchableOpacity 
                style={[styles.button, styles.analyzeButton]}
                onPress={analizarEnfermedad}
                disabled={!areaSeleccionada || cargando}
              >
                <Text style={styles.buttonText}>
                  {cargando ? 'Analizando...' : 'Analizar Enfermedad'}
                </Text>
              </TouchableOpacity>
            </View>
          )}

          {/* Resultado de detección de enfermedad */}
          {enfermedadDetectada && (
            <View style={styles.resultsContainer}>
              <Text style={styles.resultTitle}>Enfermedad detectada:</Text>
              
              <View style={styles.resultItem}>
                <Text style={styles.resultLabel}>Nombre:</Text>
                <Text style={styles.resultValue}>
                  {enfermedadDetectada.nombre} ({enfermedadDetectada.confianza}% de certeza)
                </Text>
              </View>

              <View style={styles.resultItem}>
                <Text style={styles.resultLabel}>Área afectada:</Text>
                <Text style={styles.resultValue}>
                  {areasPlanta.find(a => a.value === enfermedadDetectada.area)?.label}
                </Text>
              </View>

              {/* Botón para guardar resultados */}
              <TouchableOpacity 
                style={[styles.button, styles.saveButton]}
                onPress={guardarResultados}
                disabled={cargando}
              >
                <Text style={styles.buttonText}>
                  {cargando ? 'Guardando...' : 'Guardar Diagnóstico'}
                </Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </ScrollView>
    </View>
  );
};

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
  instructions: {
    fontSize: 16,
    color: '#555',
    marginBottom: 20,
    textAlign: 'center',
  },
  button: {
    backgroundColor: '#006400',
    padding: 15,
    borderRadius: 5,
    alignItems: 'center',
    marginVertical: 10,
    justifyContent: 'center',
  },
  analyzeButton: {
    backgroundColor: '#1E88E5',
    marginTop: 15
  },
  saveButton: {
    backgroundColor: '#228B22',
    marginTop: 20,
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
  resultsContainer: {
    marginTop: 20,
    backgroundColor: '#FFFFFF',
    padding: 15,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  areaContainer: {
    marginTop: 20,
    backgroundColor: '#FFFFFF',
    padding: 15,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#ddd',
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
  label: {
    fontSize: 16,
    color: '#555',
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
});

export default DiseasesScreen;