import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import ClasificadorScreen from '../screens/administrador/ClasificadorScreen';
import api from '../api/index.js';
import * as ImagePicker from 'expo-image-picker';
import { Alert } from 'react-native';

// Mocks
jest.mock('expo-image-picker', () => ({
  requestMediaLibraryPermissionsAsync: jest.fn(),
  launchImageLibraryAsync: jest.fn(),
  MediaTypeOptions: { Images: 'Images' },
}));
jest.mock('../api/index.js', () => ({
  post: jest.fn(),
}));
jest.spyOn(Alert, 'alert').mockImplementation(() => {});

describe('ClasificadorScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renderiza correctamente', () => {
    const { getByText } = render(<ClasificadorScreen />);
    expect(getByText('Seleccionar imagen')).toBeTruthy();
  });

  it('muestra el ActivityIndicator cuando loading es true', async () => {
    ImagePicker.requestMediaLibraryPermissionsAsync.mockResolvedValue({ granted: true });
    ImagePicker.launchImageLibraryAsync.mockResolvedValue({
      canceled: false,
      assets: [{ uri: 'fakeuri.jpg' }],
    });
    api.post.mockResolvedValue({
      data: { predicted_class: 'Pino', confidence: 0.9 },
    });

    const { getByText } = render(<ClasificadorScreen />);
    fireEvent.press(getByText('Seleccionar imagen'));
    await waitFor(() => {
      expect(Alert.alert).toHaveBeenCalledWith(
        'Resultado',
        expect.stringContaining('Clasificación: Pino')
      );
    });
  });

  it('muestra el resultado de la clasificación', async () => {
    ImagePicker.requestMediaLibraryPermissionsAsync.mockResolvedValue({ granted: true });
    ImagePicker.launchImageLibraryAsync.mockResolvedValue({
      canceled: false,
      assets: [{ uri: 'fakeuri.jpg' }],
    });
    api.post.mockResolvedValue({
      data: { predicted_class: 'Pino', confidence: 0.9 },
    });

    const { getByText, findByText } = render(<ClasificadorScreen />);
    fireEvent.press(getByText('Seleccionar imagen'));
    await findByText(/Árbol clasificado como: Pino/i);
    expect(getByText(/Confianza: 90%/i)).toBeTruthy();
    expect(getByText('¿Es correcta esta clasificación?')).toBeTruthy();
  });

  it('abre y cierra el modal de corrección', async () => {
    ImagePicker.requestMediaLibraryPermissionsAsync.mockResolvedValue({ granted: true });
    ImagePicker.launchImageLibraryAsync.mockResolvedValue({
      canceled: false,
      assets: [{ uri: 'fakeuri.jpg' }],
    });
    api.post.mockResolvedValue({
      data: { predicted_class: 'Pino', confidence: 0.9 },
    });

    const { getByText, findByText, queryByText } = render(<ClasificadorScreen />);
    fireEvent.press(getByText('Seleccionar imagen'));
    await findByText(/¿Es correcta esta clasificación?/i);
    fireEvent.press(getByText('Corregir predicción'));
    expect(getByText('Selecciona la clase correcta:')).toBeTruthy();
    fireEvent.press(getByText('Cancelar'));
    await waitFor(() => {
      expect(queryByText('Selecciona la clase correcta:')).toBeNull();
    });
  });

  it('envía la corrección correctamente', async () => {
    ImagePicker.requestMediaLibraryPermissionsAsync.mockResolvedValue({ granted: true });
    ImagePicker.launchImageLibraryAsync.mockResolvedValue({
      canceled: false,
      assets: [{ uri: 'fakeuri.jpg' }],
    });
    api.post
      .mockResolvedValueOnce({
        data: { predicted_class: 'Pino', confidence: 0.9 },
      })
      .mockResolvedValueOnce({}); // Para la corrección

    const { getByText, findByText, getByTestId } = render(<ClasificadorScreen />);
    fireEvent.press(getByText('Seleccionar imagen'));
    await findByText(/¿Es correcta esta clasificación?/i);
    fireEvent.press(getByText('Corregir predicción'));
    fireEvent(getByTestId('picker-correccion'), 'valueChange', 'Pino'); // <--- aquí el cambio
    fireEvent.press(getByText('Enviar corrección'));
    await waitFor(() => {
      expect(Alert.alert).toHaveBeenCalledWith(
        'Corrección enviada',
        'Gracias por mejorar el modelo!'
      );
    });
  });
});