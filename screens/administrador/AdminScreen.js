import React, { useState, useEffect } from 'react';
import { View, Text, FlatList, TouchableOpacity, Modal, Button, Alert, Platform } from 'react-native';
import { MoreVertical } from 'lucide-react-native';
import { useNavigation } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import api from '../../api/index.js';
import { Picker } from '@react-native-picker/picker';
import styles from '../../styles/styles'; // <--- Importa los estilos globales

export default function AdminScreen() {
  const navigation = useNavigation();
  const [users, setUsers] = useState([]);
  const [selectedUser, setSelectedUser] = useState(null);
  const [newRole, setNewRole] = useState('');
  const [modalVisible, setModalVisible] = useState(false);
  const [menuVisible, setMenuVisible] = useState(false);
  const [loading, setLoading] = useState(true);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const response = await api.get("/getUsers/");
      setUsers(response.data);
    } catch (error) {
      console.error("Error:", error.response?.data);
      const errorMessage = error.response?.data?.error || "Error en el servidor";
      Alert.alert("Error", errorMessage);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      fetchUsers();
    });
    return unsubscribe;
  }, [navigation]);

  const handleEditUser = (user) => {
    setSelectedUser(user);
    setNewRole(user.role);
    setModalVisible(true);
  };

  const handleChangeRole = async () => {
    if (!newRole) {
      Alert.alert("Error", "Debes seleccionar un rol");
      return;
    }

    try {
      await api.put(`/updateUser/${selectedUser.id}/`, { role: newRole });
      Alert.alert("Éxito", "Rol actualizado correctamente");
      await fetchUsers();
      setModalVisible(false);
    } catch (error) {
      console.error("Error:", error.response?.data);
      const errorMessage = error.response?.data?.error || "Error al actualizar el rol";
      Alert.alert("Error", errorMessage);
    }
  };

  const handleLogout = async () => {
    try {
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
    } catch (error) {
      Alert.alert("Error", "No se pudo cerrar sesión.");
    }
  };

  const renderItem = ({ item }) => (
    <TouchableOpacity 
      style={styles.userItem} 
      onPress={() => handleEditUser(item)}
      activeOpacity={0.7}
      testID={`user-item-${item.id}`}
    >
      <Text style={styles.userName}>{item.username}</Text>
      <Text style={styles.userType}>Nombre: {item.first_name} {item.last_name}</Text>
      <Text style={styles.userType}>Correo: {item.email}</Text>
      <Text style={[styles.userType, { color: getRoleColor(item.role) }]}>
        Rol: {item.role}
      </Text>
    </TouchableOpacity>
  );

  const getRoleColor = (role) => {
    switch(role) {
      case 'admin': return '#FFD700'; // Dorado para admin
      case 'staff': return '#1E90FF'; // Azul para staff
      default: return '#BDBDBD'; // Gris para usuario
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerText}>Panel de Administrador</Text>
        <TouchableOpacity 
          onPress={() => setMenuVisible(!menuVisible)}
          hitSlop={{ top: 20, bottom: 20, left: 20, right: 20 }}
          testID="menu-toggle" // <-- Agrega esto
        >
          <MoreVertical size={24} color="white" />
        </TouchableOpacity>
        {menuVisible && (
          <View style={styles.menu}>
            <TouchableOpacity 
              onPress={() => {
                setMenuVisible(false);
                navigation.navigate('AdminResearcher');
              }}
              style={styles.menuButton}
            >
              <Text style={styles.menuItem}>Modo Investigador</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              onPress={() => {
                setMenuVisible(false);
                navigation.navigate('Galeria'); // <--- Nueva opción
              }}
              style={styles.menuButton}
            >
              <Text style={styles.menuItem}>Galería de Imágenes</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              onPress={() => {
                setMenuVisible(false);
                handleLogout();
              }}
              style={styles.menuButton}
              testID="logout-button"
            >
              <Text style={styles.menuItem}>Cerrar Sesión</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>

      {loading ? (
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Cargando usuarios...</Text>
        </View>
      ) : (
        <FlatList
          data={users}
          renderItem={renderItem}
          keyExtractor={(item) => item.id.toString()}
          contentContainerStyle={styles.listContainer}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>No hay usuarios registrados</Text>
            </View>
          }
          refreshing={loading}
          onRefresh={fetchUsers}
        />
      )}

      <Modal 
        visible={modalVisible} 
        animationType="slide" 
        transparent
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>
              Modificar Rol de {selectedUser?.username}
            </Text>
            <Picker
              testID="picker-rol"
              selectedValue={newRole}
              onValueChange={(itemValue) => setNewRole(itemValue)}
              style={styles.picker}
              dropdownIconColor="#006400"
            >
              <Picker.Item label="Administrador" value="admin" />
              <Picker.Item label="Staff" value="staff" />
              <Picker.Item label="Usuario" value="usuario" />
            </Picker>
            <View style={styles.buttonContainer}>
              <Button 
                title="Actualizar Rol" 
                onPress={handleChangeRole} 
                color="#228B22" 
              />
              <Button 
                title="Cancelar" 
                onPress={() => setModalVisible(false)} 
                color="#8B0000" 
              />
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}