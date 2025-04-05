import React, { useState, useCallback } from "react";
import {
  Button,
  Image,
  View,
  ActivityIndicator,
  Alert,
  Text,
  Modal,
} from "react-native";
import * as ImagePicker from "expo-image-picker";
import api from "../../api/index.js";
import { Picker } from "@react-native-picker/picker";

const ClasificadorScreen = () => {
  const [image, setImage] = useState(null);
  const [loading, setLoading] = useState(false);
  const [predictedClass, setPredictedClass] = useState(null);
  const [showCorrectionModal, setShowCorrectionModal] = useState(false);
  const [selectedClass, setSelectedClass] = useState("");
  const class_labels = ["Clase1", "Clase2", "Clase3"]; // Reemplaza con tus etiquetas reales

  const handleClassification = useCallback(async () => {
    try {
      setLoading(true);
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
        setImage(selectedImage.uri);
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
      setLoading(false);
    }
  }, []);

  const sendCorrection = async () => {
    try {
      const formData = new FormData();
      formData.append("image", {
        uri: image,
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
    <View style={{ flex: 1, padding: 20, justifyContent: "center" }}>
      <Button
        title={loading ? "Procesando..." : "Seleccionar imagen"}
        onPress={handleClassification}
        disabled={loading}
        color="#2ecc71"
      />

      {loading && (
        <ActivityIndicator
          size="large"
          color="#3498db"
          style={{ marginVertical: 20 }}
        />
      )}

      {image && !loading && (
        <View style={{ alignItems: "center", marginTop: 20 }}>
          <Image
            source={{ uri: image }}
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

              <View style={{ marginTop: 20 }}>
                <Text style={styles.resultText}>
                  ¿Es correcta esta clasificación?
                </Text>
                <Button
                  title="Corregir predicción"
                  onPress={() => setShowCorrectionModal(true)}
                  color="#e74c3c"
                />
              </View>
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

          <View style={styles.modalButtons}>
            <Button
              title="Cancelar"
              onPress={() => setShowCorrectionModal(false)}
            />
            <Button title="Enviar corrección" onPress={sendCorrection} />
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = {
  modalContent: {
    flex: 1,
    justifyContent: "center",
    padding: 20,
    backgroundColor: "white",
  },
  modalButtons: {
    flexDirection: "row",
    justifyContent: "space-around",
    marginTop: 20,
  },
  resultText: {
    fontSize: 16,
    textAlign: "center",
    marginBottom: 10,
  },
};

export default ClasificadorScreen;
