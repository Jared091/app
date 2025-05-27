import React from "react";
import { render, fireEvent, waitFor } from "@testing-library/react-native";
import ResearcherScreen from "../screens/investigador/ResearcherScreen";
import { Alert } from "react-native";

jest.mock("../api/index.js", () => ({
  post: jest.fn(() => Promise.resolve({ data: { message: "Planta guardada correctamente" } })),
}));

jest.mock("@react-native-async-storage/async-storage", () => ({
  getItem: jest.fn(() => Promise.resolve("1")),
}));

jest.mock("expo-image-picker", () => ({
  launchCameraAsync: jest.fn(() => Promise.resolve({ canceled: false, assets: [{ uri: "fakeuri.jpg" }] })),
  requestCameraPermissionsAsync: jest.fn(() => Promise.resolve({ status: "granted" })),
  MediaTypeOptions: { Images: "Images" },
}));

describe("ResearcherScreen", () => {
  const navigation = { navigate: jest.fn() };

  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(Alert, "alert").mockImplementation(() => {});
  });

  it("renderiza los campos principales", () => {
    const { getByPlaceholderText, getByText } = render(<ResearcherScreen navigation={navigation} />);
    expect(getByPlaceholderText("Ej. Solanum lycopersicum")).toBeTruthy();
    expect(getByPlaceholderText("Ej. Jardín trasero")).toBeTruthy();
    expect(getByText("Tomar Foto")).toBeTruthy();
  });

  it("el botón Guardar Planta está deshabilitado si faltan campos", () => {
    const { getByLabelText } = render(<ResearcherScreen navigation={navigation} />);
    const guardarBtn = getByLabelText("guardar-planta");
    expect(
      guardarBtn.props.disabled === true ||
      (guardarBtn.props.accessibilityState && guardarBtn.props.accessibilityState.disabled === true)
    ).toBe(true);
  });

  it("guarda la planta correctamente", async () => {
    const { getByText, getByPlaceholderText, getByLabelText, getByTestId } = render(<ResearcherScreen navigation={navigation} />);
    fireEvent(getByTestId("picker-plant"), "valueChange", "Pino"); // <-- Agrega esto si el picker es obligatorio
    fireEvent.changeText(getByPlaceholderText("Ej. Solanum lycopersicum"), "Solanum lycopersicum");
    fireEvent.changeText(getByPlaceholderText("Ej. Jardín trasero"), "Zona 2");
    fireEvent.press(getByText("Tomar Foto"));
    await waitFor(() => {});
    fireEvent.press(getByLabelText("guardar-planta"));
    await waitFor(() => {
      expect(Alert.alert).toHaveBeenCalledWith(
        "Éxito",
        expect.stringContaining("Planta guardada correctamente")
      );
    });
  });

  it("cambia el tipo de planta correctamente", () => {
    const { getByTestId } = render(<ResearcherScreen navigation={navigation} />);
    expect(() => {
      fireEvent(getByTestId("picker-plant"), "valueChange", "Pino");
    }).not.toThrow();
  });
});