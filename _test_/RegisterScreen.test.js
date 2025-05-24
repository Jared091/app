import React from "react";
import { render, fireEvent, waitFor } from "@testing-library/react-native";
import RegisterScreen from "../components/RegisterScreen";
import { Alert } from "react-native";

jest.mock("../api/index.js", () => ({
  post: jest.fn(() => Promise.resolve({ status: 201, data: {} })),
}));

describe("RegisterScreen", () => {
  const navigation = { navigate: jest.fn() };

  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(Alert, "alert").mockImplementation(() => {});
  });

  it("renderiza los campos de registro", () => {
    const { getByPlaceholderText } = render(<RegisterScreen navigation={navigation} />);
    expect(getByPlaceholderText("Ingresa tu nombre de usuario")).toBeTruthy();
    expect(getByPlaceholderText("Ingresa tu nombre")).toBeTruthy();
    expect(getByPlaceholderText("Ingresa tu apellido")).toBeTruthy();
    expect(getByPlaceholderText("Ingresa tu correo electrónico")).toBeTruthy();
    expect(getByPlaceholderText("Ingresa tu contraseña")).toBeTruthy();
    expect(getByPlaceholderText("Ingresa tu confirmar contraseña")).toBeTruthy();
  });

  it("muestra error si faltan campos", async () => {
    const { getByText } = render(<RegisterScreen navigation={navigation} />);
    fireEvent.press(getByText("Crear Cuenta"));
    await waitFor(() => {
      expect(Alert.alert).toHaveBeenCalledWith("Error", "Todos los campos son obligatorios");
    });
  });

  it("muestra error si el correo no es válido", async () => {
    const { getByPlaceholderText, getByText } = render(<RegisterScreen navigation={navigation} />);
    fireEvent.changeText(getByPlaceholderText("Ingresa tu nombre de usuario"), "usuario");
    fireEvent.changeText(getByPlaceholderText("Ingresa tu nombre"), "Nombre");
    fireEvent.changeText(getByPlaceholderText("Ingresa tu apellido"), "Apellido");
    fireEvent.changeText(getByPlaceholderText("Ingresa tu correo electrónico"), "correo-invalido");
    fireEvent.changeText(getByPlaceholderText("Ingresa tu contraseña"), "123456");
    fireEvent.changeText(getByPlaceholderText("Ingresa tu confirmar contraseña"), "123456");
    fireEvent.press(getByText("Crear Cuenta"));
    await waitFor(() => {
      expect(Alert.alert).toHaveBeenCalledWith("Error", "Correo electrónico no válido");
    });
  });

  it("muestra error si las contraseñas no coinciden", async () => {
    const { getByPlaceholderText, getByText } = render(<RegisterScreen navigation={navigation} />);
    fireEvent.changeText(getByPlaceholderText("Ingresa tu nombre de usuario"), "usuario");
    fireEvent.changeText(getByPlaceholderText("Ingresa tu nombre"), "Nombre");
    fireEvent.changeText(getByPlaceholderText("Ingresa tu apellido"), "Apellido");
    fireEvent.changeText(getByPlaceholderText("Ingresa tu correo electrónico"), "correo@correo.com");
    fireEvent.changeText(getByPlaceholderText("Ingresa tu contraseña"), "123456");
    fireEvent.changeText(getByPlaceholderText("Ingresa tu confirmar contraseña"), "654321");
    fireEvent.press(getByText("Crear Cuenta"));
    await waitFor(() => {
      expect(Alert.alert).toHaveBeenCalledWith("Error", "Las contraseñas no coinciden");
    });
  });

  it("muestra éxito si el registro es correcto", async () => {
    const { getByPlaceholderText, getByText } = render(<RegisterScreen navigation={navigation} />);
    fireEvent.changeText(getByPlaceholderText("Ingresa tu nombre de usuario"), "usuario");
    fireEvent.changeText(getByPlaceholderText("Ingresa tu nombre"), "Nombre");
    fireEvent.changeText(getByPlaceholderText("Ingresa tu apellido"), "Apellido");
    fireEvent.changeText(getByPlaceholderText("Ingresa tu correo electrónico"), "correo@correo.com");
    fireEvent.changeText(getByPlaceholderText("Ingresa tu contraseña"), "123456");
    fireEvent.changeText(getByPlaceholderText("Ingresa tu confirmar contraseña"), "123456");
    fireEvent.press(getByText("Crear Cuenta"));
    await waitFor(() => {
      expect(Alert.alert).toHaveBeenCalledWith(
        "Éxito",
        "Cuenta creada correctamente",
        [{ text: "OK", onPress: expect.any(Function) }]
      );
    });
  });
});