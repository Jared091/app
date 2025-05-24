import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import AdminScreen from '../screens/administrador/AdminScreen.js'; // ajusta esta ruta si es necesario
import api from '../api/index.js';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useNavigation } from '@react-navigation/native';

// Mocks
jest.mock('@react-native-async-storage/async-storage', () => ({
  multiRemove: jest.fn(),
}));
jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({
    navigate: jest.fn(),
    reset: jest.fn(),
    addListener: jest.fn(() => jest.fn()),
  }),
}));
jest.mock('../api/index.js', () => ({
  get: jest.fn(),
  put: jest.fn(),
}));
jest.mock('@react-native-picker/picker', () => {
  const React = require('react');
  const { View, Text } = require('react-native');
  return {
    Picker: ({ selectedValue, onValueChange, children }) => (
      <View>
        <Text>Picker</Text>
        {children}
      </View>
    ),
    PickerItem: ({ label }) => <Text>{label}</Text>,
  };
});
jest.mock('react-native/Libraries/Lists/FlatList', () => {
  const React = require('react');
  const { View } = require('react-native');
  return ({ data = [], renderItem }) => (
    <View>
      {data.map((item, index) => renderItem({ item, index }))}
    </View>
  );
});
describe('AdminScreen', () => {
  const mockUsers = [
    {
      id: 1,
      username: 'jdoe',
      first_name: 'John',
      last_name: 'Doe',
      email: 'john@example.com',
      role: 'usuario',
    },
  ];

  beforeEach(() => {
    api.get.mockResolvedValue({ data: mockUsers });
  });

  it('muestra usuarios después de cargar', async () => {
    const { getByTestId, queryByText } = render(<AdminScreen />);
    expect(queryByText('Cargando usuarios...')).toBeTruthy();
    await waitFor(() => {
      expect(getByTestId('user-item-1')).toBeTruthy();
    }, { timeout: 2000 });
    expect(queryByText('Cargando usuarios...')).toBeNull();
  });

  it('abre el modal para editar rol', async () => {
    const { getByTestId, getByText, queryByText } = render(<AdminScreen />);
    // Espera a que desaparezca el loading
    await waitFor(() => expect(queryByText('Cargando usuarios...')).toBeNull());
    // Ahora sí busca el usuario
    fireEvent.press(getByTestId('user-item-1'));
    await waitFor(() => {
      expect(getByText('Modificar Rol de jdoe')).toBeTruthy();
    });
  });

  it('cambia el rol y actualiza usuarios', async () => {
    api.put.mockResolvedValue({});
    const { getByTestId, getByText, queryByText } = render(<AdminScreen />);
    await waitFor(() => expect(queryByText('Cargando usuarios...')).toBeNull());
    fireEvent.press(getByTestId('user-item-1'));
    await waitFor(() => getByText('Actualizar Rol'));
    fireEvent.press(getByText('Actualizar Rol'));
    await waitFor(() => {
      expect(api.put).toHaveBeenCalledWith('/updateUser/1/', { role: 'usuario' });
      expect(api.get).toHaveBeenCalledTimes(2);
    });
  });

  it('cierra sesión correctamente', async () => {
    const { getByTestId } = render(<AdminScreen />);
    fireEvent.press(getByTestId('menu-toggle'));
    fireEvent.press(getByTestId('logout-button'));
    await waitFor(() => {
      expect(AsyncStorage.multiRemove).toHaveBeenCalledWith([
        'access_token',
        'refresh_token',
        'user_role',
        'user_id',
      ]);
    });
  });
});
