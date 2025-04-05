import React, { useState, useRef, useEffect, useCallback } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  Image,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Modal,
  ActivityIndicator,
  Button,
} from "react-native";
import { Picker } from "@react-native-picker/picker";
import { MoreVertical } from "lucide-react-native";
import * as ImagePicker from "expo-image-picker";
import AsyncStorage from "@react-native-async-storage/async-storage";
import api from "../../api/index.js";

export default function AdminResearcherScreen({ navigation }) {
  const [plantName, setPlantName] = useState("");
  const [species, setSpecies] = useState("");
  const [location, setLocation] = useState("");
  const [imageUri, setImageUri] = useState(null);
  const [predictedClass, setPredictedClass] = useState(null);
  const [showCorrectionModal, setShowCorrectionModal] = useState(false);
  const [selectedClass, setSelectedClass] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const class_labels = ["Clase1", "Clase2", "Clase3"]; // Reemplaza con tus etiquetas reales
  const scrollViewRef = useRef();

  useEffect(() => {
    const requestPermissions = async () => {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== "granted") {
        Alert.alert(
          "Permisos requeridos",
          "Se necesitan permisos para acceder a la cámara."
        );
      }
    };

    requestPermissions();
  }, []);

  const handleClassification = useCallback(async () => {
    try {
      setIsLoading(true);
      const permissionResult =
        await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permissionResult.granted) {
        Alert.alert("Permiso denegado", "Se necesita acceso a tus fotos.");
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        quality: 0.7,
      });

      if (result.canceled) {
        Alert.alert("Selección cancelada");
        return;
      }

      if (result.assets?.[0]) {
        const selectedImage = result.assets[0];
        setImageUri(selectedImage.uri);
        setPredictedClass(null);

        const formData = new FormData();
        formData.append("image", {
          uri: selectedImage.uri,
          type: "image/jpeg",
          name: `image_${Date.now()}.jpg`,
        });

        const response = await api.post("/classify-tree/", formData, {
          headers: { "Content-Type": "multipart/form-data" },
        });

        if (
          !response.data?.predicted_class ||
          response.data.confidence === undefined
        ) {
          throw new Error("Formato de respuesta inválido");
        }

        const confidencePercent = Math.round(response.data.confidence * 100);
        setPredictedClass({
          predicted_class: response.data.predicted_class,
          confidence: confidencePercent,
        });

        Alert.alert(
          "Resultado",
          `Clasificación: ${response.data.predicted_class} (${confidencePercent}%)`
        );
      }
    } catch (error) {
      Alert.alert("Error", error.message || "Error procesando imagen.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  const sendCorrection = async () => {
    try {
      const formData = new FormData();
      formData.append("image", {
        uri: imageUri,
        type: "image/jpeg",
        name: `corrected_${Date.now()}.jpg`,
      });
      formData.append("true_class", selectedClass);

      await api.post("/train/", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      Alert.alert("Corrección enviada", "Gracias por mejorar el modelo!");
      setShowCorrectionModal(false);
    } catch (error) {
      Alert.alert("Error", "No se pudo enviar la corrección");
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerText}>Modo Investigador (Admin)</Text>
        <TouchableOpacity onPress={() => navigation.navigate("Admin")}>
          <MoreVertical size={24} color="white" />
        </TouchableOpacity>
      </View>

      <ScrollView
        ref={scrollViewRef}
        contentContainerStyle={styles.scrollContainer}
        keyboardShouldPersistTaps="handled"
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : null}
          style={styles.keyboardAvoidingView}
        >
          <View style={styles.formContainer}>
            <Text style={styles.label}>Nombre de la planta:</Text>
            <TextInput
              style={styles.input}
              placeholder="Ej. Cedro limón"
              value={plantName}
              onChangeText={setPlantName}
            />

            <Text style={styles.label}>Especie:</Text>
            <TextInput
              style={styles.input}
              placeholder="Ej. Solanum lycopersicum"
              value={species}
              onChangeText={setSpecies}
            />

            <Text style={styles.label}>Ubicación:</Text>
            <TextInput
              style={styles.input}
              placeholder="Ej. Jardín trasero"
              value={location}
              onChangeText={setLocation}
            />

            <Button
              title={isLoading ? "Procesando..." : "Seleccionar imagen"}
              onPress={handleClassification}
              disabled={isLoading}
              color="#2ecc71"
            />

            {isLoading && (
              <ActivityIndicator
                size="large"
                color="#3498db"
                style={{ marginVertical: 20 }}
              />
            )}

            {imageUri && (
              <View style={{ alignItems: "center", marginTop: 20 }}>
                <Image
                  source={{ uri: imageUri }}
                  style={{
                    width: 300,
                    height: 300,
                    borderRadius: 10,
                    marginBottom: 20,
                  }}
                  resizeMode="contain"
                />
                {predictedClass && (
                  <View>
                    <Text
                      style={{
                        fontSize: 18,
                        fontWeight: "bold",
                        color: "#333",
                        textAlign: "center",
                      }}
                    >
                      Árbol clasificado como: {predictedClass.predicted_class}
                      {"\n"}
                      Confianza: {predictedClass.confidence}%
                    </Text>

                    <Button
                      title="Corregir predicción"
                      onPress={() => setShowCorrectionModal(true)}
                      color="#e74c3c"
                    />
                  </View>
                )}
              </View>
            )}

            <Modal visible={showCorrectionModal} animationType="slide">
              <View style={styles.modalContent}>
                <Text>Selecciona la clase correcta:</Text>

                <Picker
                  selectedValue={selectedClass}
                  onValueChange={(itemValue) => setSelectedClass(itemValue)}
                >
                  {class_labels.map((cls) => (
                    <Picker.Item label={cls} value={cls} key={cls} />
                  ))}
                </Picker>

                <Button
                  title="Cancelar"
                  onPress={() => setShowCorrectionModal(false)}
                />
                <Button title="Enviar corrección" onPress={sendCorrection} />
              </View>
            </Modal>
          </View>
        </KeyboardAvoidingView>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F5F5DC",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    width: "100%",
    padding: 15,
    backgroundColor: "#006400",
    paddingTop: Platform.OS === "android" ? 40 : 15,
  },
  headerText: {
    color: "white",
    fontSize: 20,
    fontWeight: "bold",
  },
  formContainer: {
    width: "90%",
    alignSelf: "center",
    backgroundColor: "#FFFFF0",
    padding: 20,
    borderRadius: 10,
    marginTop: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  label: {
    fontSize: 16,
    color: "#8B7765",
    marginBottom: 8,
  },
  input: {
    backgroundColor: "#FFFFFF",
    padding: 12,
    borderRadius: 5,
    fontSize: 16,
    color: "#4d4d4d",
    marginBottom: 15,
    borderWidth: 1,
    borderColor: "#ddd",
  },
  modalContent: {
    flex: 1,
    justifyContent: "center",
    padding: 20,
    backgroundColor: "white",
  },
});