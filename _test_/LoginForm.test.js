import React from "react";
import { render, fireEvent, waitFor } from "@testing-library/react-native";
import LoginScreen from "../components/LoginForm";
import { Alert } from "react-native";

jest.mock("../api/index.js", () => ({
  post: jest.fn((url, data) => {
    if (url === "/login/") {
      if (data.email === "admin@correo.com") {
        return Promise.resolve({
          data: {
            access: "token",
            refresh: "refresh",
            role: "admin",
            user_id: 1,
          },
        });
      }
      return Promise.reject({
        response: { data: { error: "Credenciales inválidas" } },
      });
    }
    return Promise.resolve({ data: {} });
  }),
}));
jest.mock("@react-native-async-storage/async-storage", () => ({
  multiSet: jest.fn(),
}));

describe("LoginScreen", () => {
  const navigation = { navigate: jest.fn(), reset: jest.fn() };

  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(Alert, "alert").mockImplementation(() => {});
  });

  it("renderiza los campos de correo y contraseña", () => {
    const { getByPlaceholderText } = render(<LoginScreen navigation={navigation} />);
    expect(getByPlaceholderText("Ingresa tu correo")).toBeTruthy();
    expect(getByPlaceholderText("Ingresa tu contraseña")).toBeTruthy();
  });

  it("muestra error si los campos están vacíos", async () => {
    const { getByText } = render(<LoginScreen navigation={navigation} />);
    fireEvent.press(getByText("Iniciar Sesión"));
    await waitFor(() => {
      expect(getByText("Por favor, completa todos los campos")).toBeTruthy();
    });
  });

  it("muestra error si las credenciales son inválidas", async () => {
    const { getByPlaceholderText, getByText } = render(<LoginScreen navigation={navigation} />);
    fireEvent.changeText(getByPlaceholderText("Ingresa tu correo"), "otro@correo.com");
    fireEvent.changeText(getByPlaceholderText("Ingresa tu contraseña"), "123456");
    fireEvent.press(getByText("Iniciar Sesión"));
    await waitFor(() => {
      expect(Alert.alert).toHaveBeenCalledWith("Error", "Credenciales inválidas");
    });
  });

  it("navega correctamente si el login es exitoso", async () => {
    const { getByPlaceholderText, getByText } = render(<LoginScreen navigation={navigation} />);
    fireEvent.changeText(getByPlaceholderText("Ingresa tu correo"), "admin@correo.com");
    fireEvent.changeText(getByPlaceholderText("Ingresa tu contraseña"), "123456");
    fireEvent.press(getByText("Iniciar Sesión"));
    await waitFor(() => {
      expect(navigation.reset).toHaveBeenCalledWith({
        index: 0,
        routes: [{ name: "Admin" }],
      });
    });
  });
});