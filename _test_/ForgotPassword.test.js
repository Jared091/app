import React from "react";
import { render, fireEvent, waitFor } from "@testing-library/react-native";
import ForgotPassword from "../components/ForgotPassword ";
import { Alert } from "react-native";

jest.mock("../api/index.js", () => ({
  post: jest.fn((url, data) => {
    if (url === "verify-email/") {
      return Promise.resolve({ data: { exists: data.email === "existe@correo.com" } });
    }
    if (url === "change-password/") {
      return Promise.resolve({ data: { success: true } });
    }
    return Promise.resolve({ data: {} });
  }),
}));

describe("ForgotPassword", () => {
  const navigation = { navigate: jest.fn(), goBack: jest.fn() };

  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(Alert, "alert").mockImplementation(() => {});
  });

  it("renderiza el campo de correo electrónico", () => {
    const { getByPlaceholderText } = render(<ForgotPassword navigation={navigation} />);
    expect(getByPlaceholderText("Ingresa tu correo electrónico")).toBeTruthy();
  });

  it("muestra error si no se ingresa correo", async () => {
    const { getByText } = render(<ForgotPassword navigation={navigation} />);
    fireEvent.press(getByText("Verificar correo"));
    await waitFor(() => {
      expect(Alert.alert).toHaveBeenCalledWith(
        "Error",
        "Por favor, ingresa tu correo electrónico."
      );
    });
  });

  it("muestra error si el correo no existe", async () => {
    const { getByPlaceholderText, getByText } = render(<ForgotPassword navigation={navigation} />);
    fireEvent.changeText(getByPlaceholderText("Ingresa tu correo electrónico"), "noexiste@correo.com");
    fireEvent.press(getByText("Verificar correo"));
    await waitFor(() => {
      expect(Alert.alert).toHaveBeenCalledWith(
        "Error",
        "No existe una cuenta con este correo electrónico."
      );
    });
  });

  it("avanza al paso 2 si el correo existe", async () => {
    const { getByPlaceholderText, getByText, queryByText } = render(<ForgotPassword navigation={navigation} />);
    fireEvent.changeText(getByPlaceholderText("Ingresa tu correo electrónico"), "existe@correo.com");
    fireEvent.press(getByText("Verificar correo"));
    await waitFor(() => {
      expect(queryByText("Nueva Contraseña")).toBeTruthy();
    });
  });

  it("muestra error si los campos de contraseña están vacíos", async () => {
    const { getByPlaceholderText, getByText } = render(<ForgotPassword navigation={navigation} />);
    // Paso 1
    fireEvent.changeText(getByPlaceholderText("Ingresa tu correo electrónico"), "existe@correo.com");
    fireEvent.press(getByText("Verificar correo"));
    // Paso 2
    await waitFor(() => {
      expect(getByText("Nueva Contraseña")).toBeTruthy();
    });
    fireEvent.press(getByText("Cambiar contraseña"));
    await waitFor(() => {
      expect(Alert.alert).toHaveBeenCalledWith(
        "Error",
        "Por favor, completa ambos campos de contraseña."
      );
    });
  });

  it("muestra error si las contraseñas no coinciden", async () => {
    const { getByPlaceholderText, getByText } = render(<ForgotPassword navigation={navigation} />);
    // Paso 1
    fireEvent.changeText(getByPlaceholderText("Ingresa tu correo electrónico"), "existe@correo.com");
    fireEvent.press(getByText("Verificar correo"));
    // Paso 2
    await waitFor(() => {
      expect(getByText("Nueva Contraseña")).toBeTruthy();
    });
    fireEvent.changeText(getByPlaceholderText("Ingresa tu nueva contraseña"), "123456");
    fireEvent.changeText(getByPlaceholderText("Confirma tu nueva contraseña"), "654321");
    fireEvent.press(getByText("Cambiar contraseña"));
    await waitFor(() => {
      expect(Alert.alert).toHaveBeenCalledWith(
        "Error",
        "Las contraseñas no coinciden."
      );
    });
  });

  it("muestra error si la contraseña es muy corta", async () => {
    const { getByPlaceholderText, getByText } = render(<ForgotPassword navigation={navigation} />);
    // Paso 1
    fireEvent.changeText(getByPlaceholderText("Ingresa tu correo electrónico"), "existe@correo.com");
    fireEvent.press(getByText("Verificar correo"));
    // Paso 2
    await waitFor(() => {
      expect(getByText("Nueva Contraseña")).toBeTruthy();
    });
    fireEvent.changeText(getByPlaceholderText("Ingresa tu nueva contraseña"), "123");
    fireEvent.changeText(getByPlaceholderText("Confirma tu nueva contraseña"), "123");
    fireEvent.press(getByText("Cambiar contraseña"));
    await waitFor(() => {
      expect(Alert.alert).toHaveBeenCalledWith(
        "Error",
        "La contraseña debe tener al menos 6 caracteres."
      );
    });
  });

  it("muestra éxito si la contraseña se cambia correctamente", async () => {
    const { getByPlaceholderText, getByText } = render(<ForgotPassword navigation={navigation} />);
    // Paso 1
    fireEvent.changeText(getByPlaceholderText("Ingresa tu correo electrónico"), "existe@correo.com");
    fireEvent.press(getByText("Verificar correo"));
    // Paso 2
    await waitFor(() => {
      expect(getByText("Nueva Contraseña")).toBeTruthy();
    });
    fireEvent.changeText(getByPlaceholderText("Ingresa tu nueva contraseña"), "123456");
    fireEvent.changeText(getByPlaceholderText("Confirma tu nueva contraseña"), "123456");
    fireEvent.press(getByText("Cambiar contraseña"));
    await waitFor(() => {
      expect(Alert.alert).toHaveBeenCalledWith(
        "Éxito",
        "Tu contraseña ha sido actualizada correctamente.",
        [{ text: "OK", onPress: expect.any(Function) }]
      );
    });
  });
});