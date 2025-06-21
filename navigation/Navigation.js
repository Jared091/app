import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import LoginForm from '../components/LoginForm';
import ForgotPassword from '../components/ForgotPassword ';
import ResearcherScreen from '../screens/investigador/ResearcherScreen';
import ClientScreen from '../screens/cliente/ClientScreen';
import RegisterScreen from '../components/RegisterScreen';
import AdminScreen from '../screens/administrador/AdminScreen';
import AdminResearcherScreen from '../screens/administrador/AdminResearcherScreen';
import DiseasesScreen from '../screens/administrador/DiseasesScreen'; 
import TreatmentScreen from '../screens/administrador/TreatmentScreen';
import ClasificadorScreen from '../screens/administrador/ClasificadorScreen';
import GaleriaScreen from '../screens/administrador/GaleriaScreen'; // <--- Agrega esto

const Stack = createStackNavigator();

export default function Navigation() {
  return (
    <Stack.Navigator initialRouteName="Login" screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Login" component={LoginForm} />
      <Stack.Screen name="Register" component={RegisterScreen} />
      <Stack.Screen name="ForgotPassword" component={ForgotPassword}/>
      <Stack.Screen name="Researcher" component={ResearcherScreen} />
      <Stack.Screen name="Client" component={ClientScreen} />
      <Stack.Screen name="Admin" component={AdminScreen} />
      <Stack.Screen name="AdminResearcher" component={AdminResearcherScreen} />
      <Stack.Screen name="Diseases" component={DiseasesScreen} />
      <Stack.Screen name="Treatment" component={TreatmentScreen} />
      <Stack.Screen name="Clasificador" component={ClasificadorScreen} />
      <Stack.Screen name="Galeria" component={GaleriaScreen} />
    </Stack.Navigator>
  );
}