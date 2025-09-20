import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, TouchableOpacity, Image, Modal, Alert, Dimensions } from 'react-native';
import { MoreVertical } from 'lucide-react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getImageUrl } from '../../api/index';
import api from '../../api/index.js';
import styles from '../../styles/styles';
import { Picker } from '@react-native-picker/picker';

const { width } = Dimensions.get('window');
const ITEM_SIZE = (width - 60) / 2; // 2 columnas, con margen

export default function GaleriaScreen({ navigation }) {
  const [imagenes, setImagenes] = useState([]);
  const [menuVisible, setMenuVisible] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedImagen, setSelectedImagen] = useState(null);
  const [nuevoNombre, setNuevoNombre] = useState('');
  const [loading, setLoading] = useState(true);

  const fetchImagenes = async () => {
    try {
      setLoading(true);
      const response = await api.get('/imagenes/');
      setImagenes(response.data);
    } catch (error) {
      Alert.alert('Error', 'No se pudieron cargar las imágenes');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchImagenes();
  }, []);

  const handleEditarNombre = (imagen) => {
    setSelectedImagen(imagen); // imagen debe tener el campo id correcto
    setNuevoNombre(imagen.Nombre); // o el campo correcto
    setModalVisible(true);
  };

  const handleGuardarNombre = async () => {
    if (!nuevoNombre.trim()) {
      Alert.alert('Error', 'Debes seleccionar un tipo de planta');
      return;
    }
    try {
      await api.put(`/imagenes/${selectedImagen.Id_Planta}/`, { Nombre: nuevoNombre });
      Alert.alert('Éxito', 'Nombre actualizado');
      setModalVisible(false);
      fetchImagenes();
    } catch (error) {
      Alert.alert('Error', 'No se pudo actualizar el nombre');
    }
  };

  const handleLogout = async () => {
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
  };

  const renderItem = ({ item }) => {
    const imageUrl = getImageUrl(item.imagen); // Usa la función para construir la URL

    console.log(`URL generada: ${imageUrl}`); // Imprime la URL generada para depuración

    return (
      <View style={{
        backgroundColor: '#e8f5e9',
        borderRadius: 10,
        margin: 10,
        padding: 10,
        alignItems: 'center',
        width: ITEM_SIZE,
        borderWidth: 1,
        borderColor: '#2ecc71',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.08,
        shadowRadius: 4,
        elevation: 2,
      }}>
        <Image
          source={{ uri: imageUrl }}
          style={{
            width: ITEM_SIZE - 20,
            height: ITEM_SIZE - 20,
            borderRadius: 8,
            marginBottom: 8,
            borderWidth: 1,
            borderColor: '#2ecc71',
          }}
          resizeMode="cover"
        />
        <Text style={[styles.userName, { color: '#006400', marginBottom: 6, textAlign: 'center' }]}>
          {item.Nombre}
        </Text>
        <Text style={{ color: '#2c3e50', marginBottom: 6, fontSize: 13 }}>
          Precisión: {item.confianza}%
        </Text>
        <TouchableOpacity
          style={[styles.cameraButton, { backgroundColor: 'green', alignSelf: 'center', minWidth: 100, paddingVertical: 8, paddingHorizontal: 10 }]}
          onPress={() => handleEditarNombre(item)}
        >
          <Text style={[styles.cameraButtonText, { fontSize: 16 }]}>Editar nombre</Text>
        </TouchableOpacity>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      {/* Encabezado */}
      <View style={styles.header}>
        <Text style={styles.headerText}>Galería de Imágenes</Text>
        <TouchableOpacity
          onPress={() => setMenuVisible(!menuVisible)}
          hitSlop={{ top: 20, bottom: 20, left: 20, right: 20 }}
        >
          <MoreVertical size={24} color="white" />
        </TouchableOpacity>
        {menuVisible && (
          <View style={styles.menu}>
            <TouchableOpacity
              onPress={() => {
                setMenuVisible(false);
                navigation.navigate('Admin');
              }}
              style={styles.menuButton}
            >
              <Text style={styles.menuItem}>Ir al Panel Principal</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={async () => {
                setMenuVisible(false);
                handleLogout();
              }}
              style={styles.menuButton}
            >
              <Text style={styles.menuItem}>Cerrar Sesión</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>

      <FlatList
        data={imagenes}
        keyExtractor={item => item.Id_Planta.toString()}
        renderItem={renderItem}
        numColumns={2}
        contentContainerStyle={{ padding: 10, paddingBottom: 30 }}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>No hay imágenes subidas</Text>
          </View>
        }
        refreshing={loading}
        onRefresh={fetchImagenes}
      />

      {/* Modal para editar nombre */}
      <Modal
        visible={modalVisible}
        animationType="slide"
        transparent
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { minHeight: 220, justifyContent: 'flex-start' }]}>
            <Text style={styles.modalTitle}>Editar nombre de la planta</Text>
            {/* Picker en vez de TextInput */}
            <View style={{ borderWidth: 1, borderColor: '#ccc', borderRadius: 8, marginVertical: 18, backgroundColor: '#fff', overflow: 'hidden' }}>
              <Picker
                selectedValue={nuevoNombre}
                onValueChange={setNuevoNombre}
                style={{ width: 220, height: 50, color: '#333', fontSize: 13 }} // más pequeño
                dropdownIconColor="#27ae60"
                mode="dropdown"
              >
                <Picker.Item label="Selecciona tipo" value="" />
                {[
                  "Arbusto",
                  "Capulin",
                  "Malvon",
                  "Ocote",
                  "Pasto",
                  "Pera",
                  "Pino",
                  "Trebol",
                ].map((tipo) => (
                  <Picker.Item key={tipo} label={tipo} value={tipo} />
                ))}
              </Picker>
            </View>
            <View style={styles.modalButtonGroup}>
              <TouchableOpacity
                style={[styles.cancelButton, styles.cameraButton]}
                onPress={() => setModalVisible(false)}
              >
                <Text style={styles.cameraButtonText}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.confirmButton, styles.cameraButton]}
                onPress={handleGuardarNombre}
              >
                <Text style={styles.cameraButtonText}>Guardar</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}