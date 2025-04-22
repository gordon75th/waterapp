// App.js
import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, TextInput, Platform, Image } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Slider from '@react-native-community/slider';

export default function App() {
  const [waterIntake, setWaterIntake] = useState(0);
  const [customAmount, setCustomAmount] = useState('');
  const [sliderValue, setSliderValue] = useState(200);

  useEffect(() => {
    loadWaterIntake();
  }, []);

  useEffect(() => {
    saveWaterIntake();
  }, [waterIntake]);

  const loadWaterIntake = async () => {
    try {
      const value = await AsyncStorage.getItem('@waterIntake');
      if (value !== null) {
        setWaterIntake(parseInt(value));
      }
    } catch (e) {
      console.error('Failed to load intake.', e);
    }
  };

  const saveWaterIntake = async () => {
    try {
      await AsyncStorage.setItem('@waterIntake', waterIntake.toString());
    } catch (e) {
      console.error('Failed to save intake.', e);
    }
  };

  const addWater = (amount) => {
    setWaterIntake(prev => prev + amount);
  };

  const handleCustomAdd = () => {
    const amount = parseInt(customAmount);
    if (!isNaN(amount) && amount > 0) {
      addWater(amount);
      setCustomAmount('');
    } else {
      Alert.alert('Invalid Input', 'Please enter a valid number greater than 0.');
    }
  };

  const resetIntake = () => {
    Alert.alert(
      'Reset Intake',
      'Are you sure you want to reset your daily water intake?',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Yes', onPress: () => setWaterIntake(0) }
      ]
    );
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Daily Water Tracker</Text>
      <Text style={styles.intake}>{waterIntake} ml</Text>

      <View style={styles.buttonGroup}>
        <TouchableOpacity style={styles.button} onPress={() => addWater(250)}>
          <Image source={{ uri: 'https://images.emojiterra.com/google/android-12l/512px/1f964.png' }} style={styles.imageIcon} />
        </TouchableOpacity>
        <TouchableOpacity style={styles.button} onPress={() => addWater(500)}>
          <Image source={{ uri: 'https://cdn-icons-png.flaticon.com/512/8576/8576345.png' }} style={styles.imageIcon} />
        </TouchableOpacity>
      </View>

      <Text style={styles.sectionTitle}>Add Custom Amount</Text>
      <TextInput
        style={styles.input}
        keyboardType="numeric"
        placeholder="Enter amount in ml"
        value={customAmount}
        onChangeText={setCustomAmount}
      />
      <TouchableOpacity style={styles.customButton} onPress={handleCustomAdd}>
        <Text style={styles.buttonText}>Add Custom Amount</Text>
      </TouchableOpacity>

      <Text style={styles.sectionTitle}>Or Use Slider: {sliderValue} ml</Text>
      <Slider
        style={{ width: 300, height: 40 }}
        minimumValue={50}
        maximumValue={1000}
        step={50}
        value={sliderValue}
        onValueChange={setSliderValue}
        minimumTrackTintColor="#f06292"
        maximumTrackTintColor="#f8bbd0"
        thumbTintColor="#ec407a"
      />
      <TouchableOpacity style={styles.customButton} onPress={() => addWater(sliderValue)}>
        <Text style={styles.buttonText}>Add from Slider</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.resetButton} onPress={resetIntake}>
        <Text style={styles.resetText}>Reset</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FEE1F1',
    padding: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 20,
    color: '#880e4f'
  },
  intake: {
    fontSize: 48,
    fontWeight: 'bold',
    marginBottom: 30,
    color: '#ad1457'
  },
  buttonGroup: {
    flexDirection: 'row',
    marginBottom: 20,
  },
  button: {
    backgroundColor: '#f06292',
    padding: 10,
    borderRadius: 10,
    marginHorizontal: 10,
  },
  imageIcon: {
    width: 50,
    height: 50,
    resizeMode: 'contain'
  },
  buttonText: {
    color: '#fff',
    fontSize: 28,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginTop: 20,
    color: '#6a1b9a'
  },
  input: {
    height: 40,
    borderColor: 'gray',
    borderWidth: 1,
    width: 200,
    borderRadius: 8,
    marginVertical: 10,
    paddingHorizontal: 10,
    backgroundColor: '#fff',
  },
  customButton: {
    backgroundColor: '#ba68c8',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 10,
    marginTop: 10,
  },
  resetButton: {
    marginTop: 30,
    padding: 10,
    backgroundColor: '#f48fb1',
    borderRadius: 10,
  },
  resetText: {
    color: 'white',
    fontSize: 16,
  },
});