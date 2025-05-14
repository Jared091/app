import React from 'react';
import { render, fireEvent, waitFor, act } from '@testing-library/react-native';
import AdminResearcherScreen from '../screens/administrador/AdminResearcherScreen.js';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as ImagePicker from 'expo-image-picker';
import api from '../api/index.js';

// Mocks
jest.mock('expo-image-picker');
jest.mock('@react-native-async-storage/async-storage');
jest.mock('../api/index.js');

describe('AdminResearcherScreen', () => {
  beforeEach(() => {
    // Resetear todos los mocks antes de cada prueba
    jest.clearAllMocks();
    
    // Mock de AsyncStorage
    AsyncStorage.multiGet.mockResolvedValue([
      ['user_id', '123'],
      ['access_token', 'test-token']
    ]);
    
    // Mock de ImagePicker
    ImagePicker.requestCameraPermissionsAsync.mockResolvedValue({ status: 'granted' });
    ImagePicker.launchCameraAsync.mockResolvedValue({
      canceled: false,
      assets: [{ uri: 'mocked-image-uri' }]
    });
    
    // Mock de la API
    api.post.mockImplementation((endpoint) => {
      if (endpoint === '/classify-tree/') {
        return Promise.resolve({
          data: {
            predicted_class: 'Pino',
            confidence: 0.95
          }
        });
      }
      if (endpoint === '/classify-disease/') {
        return Promise.resolve({
          data: {
            predicted_class: 'roya',
            confidence: 0.87
          }
        });
      }
      if (endpoint === '/plantas/') {
        return Promise.resolve({
          data: { message: 'Diagnóstico guardado correctamente' }
        });
      }
      if (endpoint === '/train/') {
        return Promise.resolve({
          data: { message: 'Corrección enviada' }
        });
      }
      return Promise.reject(new Error('Endpoint no mockeado'));
    });
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

  it('permite seleccionar el estado de la planta', async () => {
    const { getByText, getByTestId } = render(<AdminResearcherScreen />);
    
    const picker = getByTestId('estado-planta-picker'); // Necesitarás agregar testID al Picker
    fireEvent(picker, 'onValueChange', 's');
    
    expect(getByText('Sana')).toBeTruthy();
  });

  it('permite seleccionar el tipo de planta', async () => {
    const { getByText, getByTestId } = render(<AdminResearcherScreen />);
    
    const picker = getByTestId('tipo-planta-picker'); // Necesitarás agregar testID al Picker
    fireEvent(picker, 'onValueChange', 'Pino');
    
    expect(getByText('Pino')).toBeTruthy();
  });

  it('actualiza los campos de texto correctamente', async () => {
    const { getByPlaceholderText } = render(<AdminResearcherScreen />);
    
    const especieInput = getByPlaceholderText('Ej. Pinus oocarpa');
    fireEvent.changeText(especieInput, 'Pinus oocarpa');
    
    const ubicacionInput = getByPlaceholderText('Ej. Jardín trasero, zona 5');
    fireEvent.changeText(ubicacionInput, 'Jardín trasero');
    
    expect(especieInput.props.value).toBe('Pinus oocarpa');
    expect(ubicacionInput.props.value).toBe('Jardín trasero');
  });

  it('toma una foto y la muestra', async () => {
    const { getByText, getByTestId, findByTestId } = render(<AdminResearcherScreen />);
    
    // Seleccionar estado y tipo de planta primero
    const estadoPicker = getByTestId('estado-planta-picker');
    fireEvent(estadoPicker, 'onValueChange', 's');
    
    const tipoPicker = getByTestId('tipo-planta-picker');
    fireEvent(tipoPicker, 'onValueChange', 'Pino');
    
    // Presionar el botón de tomar foto
    const fotoButton = getByText('Tomar Foto');
    fireEvent.press(fotoButton);
    
    // Verificar que se llamó a la cámara
    await waitFor(() => {
      expect(ImagePicker.launchCameraAsync).toHaveBeenCalled();
    });
    
    // Verificar que se muestra la imagen
    const image = await findByTestId('plant-image');
    expect(image.props.source.uri).toBe('mocked-image-uri');
  });

  it('clasifica una planta sana correctamente', async () => {
    const { getByText, getByTestId, findByText } = render(<AdminResearcherScreen />);
    
    // Configurar estado y tipo
    const estadoPicker = getByTestId('estado-planta-picker');
    fireEvent(estadoPicker, 'onValueChange', 's');
    
    const tipoPicker = getByTestId('tipo-planta-picker');
    fireEvent(tipoPicker, 'onValueChange', 'Pino');
    
    // Tomar foto
    const fotoButton = getByText('Tomar Foto');
    fireEvent.press(fotoButton);
    
    // Verificar clasificación
    const resultado = await findByText('Planta identificada:');
    expect(resultado).toBeTruthy();
    expect(getByText('Nombre:')).toBeTruthy();
    expect(getByText('Pino (95% de confianza)')).toBeTruthy();
  });

  it('analiza una planta enferma correctamente', async () => {
    const { getByText, getByTestId, findByText } = render(<AdminResearcherScreen />);
    
    // Configurar estado y tipo
    const estadoPicker = getByTestId('estado-planta-picker');
    fireEvent(estadoPicker, 'onValueChange', 'e');
    
    const tipoPicker = getByTestId('tipo-planta-picker');
    fireEvent(tipoPicker, 'onValueChange', 'Pino');
    
    // Tomar foto
    const fotoButton = getByText('Tomar Foto');
    await act(async () => {
      fireEvent.press(fotoButton);
    });
    
    // Simular selección de área afectada
    const touchableArea = getByTestId('touchable-image-area');
    fireEvent(touchableArea, 'responderGrant', {
      nativeEvent: { locationX: 50, locationY: 50 }
    });
    fireEvent(touchableArea, 'responderMove', {
      nativeEvent: { locationX: 100, locationY: 100 }
    });
    fireEvent(touchableArea, 'responderRelease');
    
    // Analizar enfermedad
    const analyzeButton = getByText('Analizar Enfermedad');
    await act(async () => {
      fireEvent.press(analyzeButton);
    });
    
    // Verificar resultados
    const resultado = await findByText('Enfermedad detectada:');
    expect(resultado).toBeTruthy();
    expect(getByText('Nombre:')).toBeTruthy();
    expect(getByText('roya (87% de confianza)')).toBeTruthy();
  });

  it('guarda el diagnóstico correctamente', async () => {
    const { getByText, getByTestId } = render(<AdminResearcherScreen />);
    
    // Configurar estado y tipo
    const estadoPicker = getByTestId('estado-planta-picker');
    fireEvent(estadoPicker, 'onValueChange', 's');
    
    const tipoPicker = getByTestId('tipo-planta-picker');
    fireEvent(tipoPicker, 'onValueChange', 'Pino');
    
    // Tomar foto
    const fotoButton = getByText('Tomar Foto');
    await act(async () => {
      fireEvent.press(fotoButton);
    });
    
    // Guardar diagnóstico
    const saveButton = getByText('Guardar');
    await act(async () => {
      fireEvent.press(saveButton);
    });
    
    // Verificar llamada a la API
    expect(api.post).toHaveBeenCalledWith('/plantas/', expect.any(FormData), {
      headers: {
        'Content-Type': 'multipart/form-data',
        'Authorization': 'Bearer test-token',
      },
    });
  });

  it('envía corrección de clasificación', async () => {
    const { getByText, getByTestId } = render(<AdminResearcherScreen />);
    
    // Configurar estado y tipo
    const estadoPicker = getByTestId('estado-planta-picker');
    fireEvent(estadoPicker, 'onValueChange', 's');
    
    const tipoPicker = getByTestId('tipo-planta-picker');
    fireEvent(tipoPicker, 'onValueChange', 'Pino');
    
    // Tomar foto
    const fotoButton = getByText('Tomar Foto');
    await act(async () => {
      fireEvent.press(fotoButton);
    });
    
    // Abrir modal de corrección
    const correctButton = getByText('Corregir');
    await act(async () => {
      fireEvent.press(correctButton);
    });
    
    // Seleccionar clase correcta
    const modalPicker = getByTestId('modal-picker');
    fireEvent(modalPicker, 'onValueChange', 'Cedro Limon');
    
    // Confirmar corrección
    const confirmButton = getByText('Confirmar');
    await act(async () => {
      fireEvent.press(confirmButton);
    });
    
    // Verificar llamada a la API
    expect(api.post).toHaveBeenCalledWith('/train/', expect.any(FormData), {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  });

  it('cierra sesión correctamente', async () => {
    const { getByText, getByTestId } = render(<AdminResearcherScreen />);
    
    // Abrir menú
    const menuButton = getByTestId('menu-button');
    fireEvent.press(menuButton);
    
    // Cerrar sesión
    const logoutButton = getByText('Cerrar Sesión');
    await act(async () => {
      fireEvent.press(logoutButton);
    });
    
    // Verificar que se borraron los tokens
    expect(AsyncStorage.multiRemove).toHaveBeenCalledWith(
      ['access_token', 'refresh_token', 'user_role', 'user_id']
    );
  });

  it('muestra error cuando faltan campos obligatorios', async () => {
    const { getByText } = render(<AdminResearcherScreen />);
    
    // Intentar guardar sin datos
    const saveButton = getByText('Guardar');
    await act(async () => {
      fireEvent.press(saveButton);
    });
    
    expect(getByText('Error')).toBeTruthy();
    expect(getByText('El nombre y la imagen son obligatorios')).toBeTruthy();
  }
);
});