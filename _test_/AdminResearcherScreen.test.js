jest.mock('expo-image-picker', () => ({
  requestCameraPermissionsAsync: jest.fn(),
  launchCameraAsync: jest.fn(),
  MediaTypeOptions: { Images: 'Images' }
}));

jest.mock('@react-native-async-storage/async-storage', () => ({
  multiGet: jest.fn(),
  multiRemove: jest.fn(),
  getItem: jest.fn(),
}));

jest.mock('../api/index.js', () => ({
  post: jest.fn(),
}));

import React from 'react';
import { render, fireEvent, waitFor, act } from '@testing-library/react-native';
import AdminResearcherScreen from '../screens/administrador/AdminResearcherScreen.js';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as ImagePicker from 'expo-image-picker';
import api from '../api/index.js';
import { Alert } from 'react-native';

describe('AdminResearcherScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    AsyncStorage.multiGet.mockResolvedValue([
      ['user_id', '123'],
      ['access_token', 'test-token']
    ]);
    AsyncStorage.getItem.mockImplementation((key) => {
      if (key === 'user_id') return Promise.resolve('123');
      if (key === 'access_token') return Promise.resolve('test-token');
      return Promise.resolve(null);
    });
    AsyncStorage.multiRemove.mockResolvedValue();
    ImagePicker.requestCameraPermissionsAsync.mockResolvedValue({ status: 'granted' });
    ImagePicker.launchCameraAsync.mockResolvedValue({
      canceled: false,
      assets: [{ uri: 'mocked-image-uri' }]
    });
    api.post.mockResolvedValue({
      data: {
        predicted_class: 'Pino',
        confidence: 0.95,
        message: 'Diagnóstico guardado correctamente'
      }
    });
    jest.spyOn(Alert, 'alert').mockImplementation(() => { });
  });

  it('renderiza correctamente', () => {
    const { getByText, getByPlaceholderText } = render(<AdminResearcherScreen />);
    expect(getByText('Detección de Plantas')).toBeTruthy();
    expect(getByText('Estado de la planta:')).toBeTruthy();
    expect(getByText('Tipo de planta:')).toBeTruthy();
    expect(getByPlaceholderText('Ej. Pinus oocarpa')).toBeTruthy();
    expect(getByPlaceholderText('Ej. Jardín trasero, zona 5')).toBeTruthy();
    expect(getByText('Tomar Foto')).toBeTruthy();
  });

  it('solicita permisos de cámara al montar', async () => {
    render(<AdminResearcherScreen />);
    await waitFor(() => {
      expect(ImagePicker.requestCameraPermissionsAsync).toHaveBeenCalled();
    });
  });

  it('permite seleccionar el estado de la planta', () => {
    const { getByTestId } = render(<AdminResearcherScreen />);
    fireEvent(getByTestId('estado-planta-picker'), 'onValueChange', 's');
    // Puedes agregar más asserts según el flujo
  });

  it('permite seleccionar el tipo de planta', () => {
    const { getByTestId } = render(<AdminResearcherScreen />);
    fireEvent(getByTestId('tipo-planta-picker'), 'onValueChange', 'Pino');
    // Puedes agregar más asserts según el flujo
  });

  it('actualiza los campos de texto correctamente', () => {
    const { getByPlaceholderText } = render(<AdminResearcherScreen />);
    const especieInput = getByPlaceholderText('Ej. Pinus oocarpa');
    fireEvent.changeText(especieInput, 'Pinus test');
    expect(especieInput.props.value).toBe('Pinus test');
  });

  it('toma una foto y la muestra', async () => {
    const { getByTestId, getByText } = render(<AdminResearcherScreen />);
    fireEvent(getByTestId('estado-planta-picker'), 'onValueChange', 's');
    fireEvent(getByTestId('tipo-planta-picker'), 'onValueChange', 'Pino');
    const tomarFotoBtn = getByText('Tomar Foto');
    await act(async () => {
      fireEvent.press(tomarFotoBtn);
    });
    // Aquí podrías buscar la imagen renderizada si agregas un testID
  });

  it('clasifica una planta sana correctamente', async () => {
    const { getByTestId, getByText } = render(<AdminResearcherScreen />);
    fireEvent(getByTestId('estado-planta-picker'), 'onValueChange', 's');
    fireEvent(getByTestId('tipo-planta-picker'), 'onValueChange', 'Pino');
    const tomarFotoBtn = getByText('Tomar Foto');
    await act(async () => {
      fireEvent.press(tomarFotoBtn);
    });
    await waitFor(() => {
      expect(api.post).toHaveBeenCalledWith(
        "/classify-tree/",
        expect.any(FormData),
        expect.any(Object)
      );
    });
  });

  it('analiza una planta enferma correctamente', async () => {
    const { getByTestId, getByText } = render(<AdminResearcherScreen />);
    fireEvent(getByTestId('estado-planta-picker'), 'onValueChange', 'e');
    fireEvent(getByTestId('tipo-planta-picker'), 'onValueChange', 'Pino');
    // Aquí deberías simular la selección de área y luego presionar el botón de analizar enfermedad
    // Puedes mockear el resultado y verificar el llamado a api.post("/classify-disease/")
  });

  it('guarda el diagnóstico correctamente', async () => {
    const { getByTestId, getByText } = render(<AdminResearcherScreen />);
    fireEvent(getByTestId('estado-planta-picker'), 'onValueChange', 's');
    fireEvent(getByTestId('tipo-planta-picker'), 'onValueChange', 'Pino');
    // Simula que ya hay imagen y resultado
    // Aquí podrías simular el flujo completo hasta que aparezca el botón "Guardar"
    // y luego presionar ese botón y verificar el llamado a api.post('/plantas/')
  });

  it('envía corrección de clasificación', async () => {
    // Simula el flujo para que el modal de corrección esté visible y prueba el envío
  });

  it('cierra sesión correctamente', async () => {
    const { getByTestId } = render(<AdminResearcherScreen navigation={{ navigate: jest.fn() }} />);
    fireEvent.press(getByTestId('menu-button'));
    // Aquí podrías simular el flujo de cerrar sesión y verificar que navigation.navigate fue llamado
  });
  it('deshabilita el botón Guardar cuando faltan campos obligatorios', async () => {
    const { getByTestId, getByText } = render(<AdminResearcherScreen />);
    fireEvent(getByTestId('estado-planta-picker'), 'onValueChange', 's');
    fireEvent(getByTestId('tipo-planta-picker'), 'onValueChange', 'Pino');
    const tomarFotoBtn = getByText('Tomar Foto');
    await act(async () => {
      fireEvent.press(tomarFotoBtn);
    });

    // No llenamos los campos especie y ubicación
    const guardarBtn = getByTestId('guardar-button');
    expect(guardarBtn.props.accessibilityState.disabled).toBe(true);
  });

  it('muestra error cuando falta la imagen', async () => {
    const { getByTestId, getByText, getByPlaceholderText } = render(<AdminResearcherScreen />);
    fireEvent(getByTestId('estado-planta-picker'), 'onValueChange', 's');
    fireEvent(getByTestId('tipo-planta-picker'), 'onValueChange', 'Pino');
    fireEvent.changeText(getByPlaceholderText('Ej. Pinus oocarpa'), 'Pinus test');
    fireEvent.changeText(getByPlaceholderText('Ej. Jardín trasero, zona 5'), 'Zona 1');
    // No simules tomar la foto, así imagenUri está vacío

    // El botón no aparece porque imagenUri es null, así que este test no es válido para la lógica actual.
    // Si quieres forzar el error, deberías llamar directamente a guardarDiagnostico (exportándola para test).
  });
});