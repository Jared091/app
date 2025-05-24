import React from "react";
import { render, fireEvent } from "@testing-library/react-native";
import NavBar from "../components/NavBar";

// Polyfill para clearImmediate en Jest (React Native)
if (typeof global.clearImmediate === 'undefined') {
  global.clearImmediate = (id) => clearTimeout(id);
}
if (typeof global.setImmediate === 'undefined') {
  global.setImmediate = (fn, ...args) => setTimeout(fn, 0, ...args);
}

describe("NavBar", () => {
  it("renderiza el título correctamente", () => {
    const { getByText } = render(<NavBar title="Mi Título" />);
    expect(getByText("Mi Título")).toBeTruthy();
  });

  it("llama a onLogout al presionar el botón", () => {
    const mockLogout = jest.fn();
    const { getByText } = render(<NavBar title="Test" onLogout={mockLogout} />);
    fireEvent.press(getByText("Cerrar sesión"));
    expect(mockLogout).toHaveBeenCalled();
  });

  it("no muestra el botón de cerrar sesión si no se pasa onLogout", () => {
    const { queryByText } = render(<NavBar title="Sin Logout" />);
    expect(queryByText("Cerrar sesión")).toBeNull();
  });
});