import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Modal,
  Button,
  Platform,
  Alert,
} from 'react-native';
import { MoreVertical } from 'lucide-react-native';
import { useNavigation } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import api from '../../api/index.js';
import { Picker } from '@react-native-picker/picker';

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
    fetchUsers(); // <-- Esto asegura que siempre se cargan los usuarios al montar el componente
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
      testID={`user-item-${item.id}`}
      onPress={() => handleEditUser(item)}
      style={styles.userItem}
    >
      <Text style={styles.userName}>{item.username}</Text>
      <Text style={styles.userType} testID={`name-${item.id}`}>Nombre: {item.first_name} {item.last_name}</Text>
      <Text style={styles.userType} testID={`email-${item.id}`}>Correo: {item.email}</Text>
      <Text
        style={[styles.userType, { color: getRoleColor(item.role) }]}
        testID={`role-${item.id}`}
      >
        Rol: {item.role}
      </Text>
    </TouchableOpacity>
  );

  const getRoleColor = (role) => {
    switch (role) {
      case 'admin': return '#FFD700';
      case 'staff': return '#1E90FF';
      default: return '#BDBDBD';
    }
  };

  return (
    <View style={styles.container} testID="admin-screen">
      <View style={styles.header} testID="admin-header">
        <Text style={styles.headerText} testID="header-title">Panel de Administrador</Text>
        <TouchableOpacity
          testID="menu-toggle"
          onPress={() => setMenuVisible(true)}
        >
          <MoreVertical size={24} color="white" />
        </TouchableOpacity>
        {menuVisible && (
          <View style={styles.menu} testID="menu-dropdown">
            <TouchableOpacity
              testID="nav-admin-researcher"
              onPress={() => {
                setMenuVisible(false);
                navigation.navigate('AdminResearcher');
              }}
              style={styles.menuButton}
            >
              <Text style={styles.menuItem}>Modo Investigador</Text>
            </TouchableOpacity>
            <TouchableOpacity
              testID="nav-clasificador"
              onPress={() => {
                setMenuVisible(false);
                navigation.navigate('Clasificador');
              }}
              style={styles.menuButton}
            >
              <Text style={styles.menuItem}>Modo Clasificador</Text>
            </TouchableOpacity>
            <TouchableOpacity
              testID="nav-diseases"
              onPress={() => {
                setMenuVisible(false);
                navigation.navigate('Diseases');
              }}
              style={styles.menuButton}
            >
              <Text style={styles.menuItem}>Ver Enfermedades</Text>
            </TouchableOpacity>
            <TouchableOpacity
              testID="logout-button"
              onPress={handleLogout}
            >
              <Text>Cerrar Sesión</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>

      {loading ? (
        <View style={styles.loadingContainer} testID="loading-container">
          <Text style={styles.loadingText}>Cargando usuarios...</Text>
        </View>
      ) : (
        <FlatList
          data={users}
          renderItem={renderItem}
          keyExtractor={(item) => item.id.toString()}
          contentContainerStyle={styles.listContainer}
          ListEmptyComponent={
            <View style={styles.emptyContainer} testID="empty-user-list">
              <Text style={styles.emptyText}>No hay usuarios registrados</Text>
            </View>
          }
          refreshing={loading}
          onRefresh={fetchUsers}
          testID="user-list"
        />
      )}

      <Modal
        visible={modalVisible}
        animationType="slide"
        transparent
        onRequestClose={() => setModalVisible(false)}
        testID="role-modal"
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle} testID="modal-title">
              Modificar Rol de {selectedUser?.username}
            </Text>
            <Picker
              testID="role-picker"
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
                testID="submit-role-change"
              />
              <Button
                title="Cancelar"
                onPress={() => setModalVisible(false)}
                color="#8B0000"
                testID="cancel-role-change"
              />
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5DC',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#006400',
    padding: 15,
    paddingTop: Platform.OS === 'android' ? 40 : 15,
    zIndex: 1,
  },
  headerText: {
    color: 'white',
    fontSize: 20,
    fontWeight: 'bold',
  },
  menu: {
    position: 'absolute',
    top: 50,
    right: 10,
    backgroundColor: 'white',
    borderRadius: 5,
    padding: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
    zIndex: 100,
    minWidth: 180,
  },
  menuButton: {
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  menuItem: {
    fontSize: 16,
    color: '#004d00',
  },
  listContainer: {
    flexGrow: 1,
    padding: 20,
  },
  userItem: {
    backgroundColor: '#2E7D32',
    padding: 15,
    borderRadius: 8,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#66BB6A',
  },
  userName: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  userType: {
    fontSize: 14,
    marginBottom: 2,
  },
  modalContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    padding: 20,
    borderRadius: 10,
    width: '90%',
    maxWidth: 400,
    alignItems: 'center',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 15,
    color: '#333',
    textAlign: 'center',
  },
  picker: {
    width: '100%',
    marginVertical: 15,
    backgroundColor: '#F5F5F5',
    borderRadius: 5,
  },
  buttonContainer: {
    width: '100%',
    marginTop: 10,
    gap: 10,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 16,
    color: '#006400',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  emptyText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
  },
});
