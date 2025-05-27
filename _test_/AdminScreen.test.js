import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
 import AdminScreen from '../screens/administrador/AdminScreen.js';
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
  const { View } = require('react-native');
  function Picker(props) {
    return <View {...props}>{props.children}</View>;
  }
  Picker.Item = (props) => <View {...props}>{props.label}</View>;
  return { Picker };
});

// ¡NO mockees FlatList!

describe('AdminScreen', () => {
  beforeEach(() => {
    api.get.mockResolvedValue({
      data: [
        {
          id: 1,
          username: 'jdoe',
          first_name: 'John',
          last_name: 'Doe',
          email: 'john@example.com',
          role: 'admin',
        },
      ],
    });
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
    await waitFor(() => expect(queryByText('Cargando usuarios...')).toBeNull());
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
    fireEvent(getByTestId('picker-rol'), 'valueChange', 'usuario');
    fireEvent.press(getByText('Actualizar Rol'));
    await waitFor(() => {
      expect(api.put).toHaveBeenCalledWith('/updateUser/1/', { role: 'usuario' });
      expect(api.get.mock.calls.length).toBeGreaterThanOrEqual(2);
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