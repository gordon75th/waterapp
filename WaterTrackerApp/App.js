import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, TextInput, Platform, Image, KeyboardAvoidingView, ScrollView, Modal } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Slider from '@react-native-community/slider';
import * as Notifications from 'expo-notifications';
import { Animated } from 'react-native';
import * as Haptics from 'expo-haptics';


export default function App() {
  const [waterIntake, setWaterIntake] = useState(0);
  const [customAmount, setCustomAmount] = useState('');
  const [sliderValue, setSliderValue] = useState(200);
  const [intakeLog, setIntakeLog] = useState([]);
  const [goal, setGoal] = useState(2000);
  const [modalVisible, setModalVisible] = useState(false);
  const [streak, setStreak] = useState(0);
  const progress = Math.min(waterIntake / goal, 1);
  const fadeAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    loadWaterIntake();
    loadGoal();
    loadStreak();
    setupDailyReset();
    loadTodayLog();
    loadHistory();
  
    (async () => {
      const { status } = await Notifications.getPermissionsAsync();
      if (status !== 'granted') {
        await Notifications.requestPermissionsAsync();
      }
      scheduleReminder();
    })();
  }, []);

  const removeLogEntry = (index) => {
    const newLog = [...intakeLog];
    const removed = newLog.splice(index, 1)[0];
    setIntakeLog(newLog);
    setWaterIntake(prev => prev - removed.amount);
  };

  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,
      shouldPlaySound: false,
      shouldSetBadge: false,
    }),
  });
  
  
  

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      saveWaterIntake();
      saveTodayLog();
      updateHistory();
    }, 500);
    return () => clearTimeout(timeoutId);
  }, [waterIntake]);

  const saveTodayLog = async () => {
    const today = new Date().toISOString().slice(0, 10);
    try {
      await AsyncStorage.setItem(`@log_${today}`, JSON.stringify(intakeLog));
    } catch (e) {
      console.error("Failed to save log", e);
    }
  };
  
  const updateHistory = async () => {
    const today = new Date().toISOString().slice(0, 10);
    try {
      await AsyncStorage.setItem(`@history_${today}`, waterIntake.toString());
    } catch (e) {
      console.error("Failed to update history", e);
    }
  };

  const loadTodayLog = async () => {
    const today = new Date().toISOString().slice(0, 10);
    try {
      const val = await AsyncStorage.getItem(`@log_${today}`);
      if (val) setIntakeLog(JSON.parse(val));
    } catch (e) {
      console.error("Log load failed", e);
    }
  };
  
  const loadHistory = async () => {
    const days = [...Array(7)].map((_, i) => {
      const d = new Date();
      d.setDate(d.getDate() - i);
      return d.toISOString().slice(0, 10);
    });
  
    const historyData = {};
    for (const day of days) {
      const val = await AsyncStorage.getItem(`@history_${day}`);
      historyData[day] = parseInt(val) || 0;
    }
    setHistory(historyData);
  };
  

  const setupDailyReset = () => {
    const now = new Date();
    const nextMidnight = new Date(now);
    nextMidnight.setHours(24, 0, 0, 0);
  
    const timeUntilMidnight = nextMidnight - now;
  
    setTimeout(async () => {
      if (waterIntake >= goal) {
        const newStreak = streak + 1;
        setStreak(newStreak);
        await saveStreak(newStreak);
      } else {
        setStreak(0);
        await saveStreak(0);
      }
      setWaterIntake(0);
      await saveWaterIntake();
      setupDailyReset(); // 🪄 Reschedule for next day
    }, timeUntilMidnight);
    
  };
  

  const scheduleReminder = async () => {
    await Notifications.cancelAllScheduledNotificationsAsync();
  
    const now = new Date();
    const notifications = [];
  
    for (let i = 1; i <= 12; i++) { // from 9 AM to 9 PM, every hour
      const hour = 8 + i; // 9 AM to 9 PM
      const trigger = new Date(now);
      trigger.setHours(hour, 0, 0, 0);
  
      // Skip if this time already passed today
      if (trigger > now) {
        notifications.push({
          content: {
            title: "💧Time to drink water!",
            body: "GEEHEEE WASSERR TRINKEENN ANIKAA! 💕",
          },
          trigger,
        });
      }
    }
  
    for (const note of notifications) {
      await Notifications.scheduleNotificationAsync(note);
    }
  };
  

  const loadWaterIntake = async () => {
    try {
      const value = await AsyncStorage.getItem('@waterIntake');
      if (value !== null) setWaterIntake(parseInt(value));
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

  const loadGoal = async () => {
    try {
      const value = await AsyncStorage.getItem('@waterGoal');
      if (value !== null) setGoal(parseInt(value));
    } catch (e) {
      console.error('Failed to load goal.', e);
    }
  };

  const loadStreak = async () => {
    try {
      const value = await AsyncStorage.getItem('@streak');
      if (value !== null) setStreak(parseInt(value));
    } catch (e) {
      console.error('Failed to load streak.', e);
    }
  };

  const saveStreak = async (value) => {
    try {
      await AsyncStorage.setItem('@streak', value.toString());
    } catch (e) {
      console.error('Failed to save streak.', e);
    }
  };

  const addWater = (amount) => {
  setWaterIntake(prev => prev + amount);
  const newLog = [...intakeLog, { amount, time: new Date().toISOString() }];
  setIntakeLog(newLog);
  Haptics.selectionAsync(); // 💥 haptic
};


  const handleCustomAdd = () => {
    const amount = parseInt(customAmount);
    if (!isNaN(amount) && amount > 0) {
      addWater(amount);
      setCustomAmount('');
      setModalVisible(false);
    } else {
      Alert.alert('Invalid Input', 'Please enter a valid number greater than 0.');
    }
  };

  const resetIntake = () => {
    Alert.alert('Reset Intake', 'Are you sure you want to reset your daily water intake?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Yes', onPress: () => setWaterIntake(0) }
    ]);
  };

  return (
    <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={{ flex: 1, backgroundColor: '#FEE1F1' }}>
      <ScrollView contentContainerStyle={styles.scrollContainer} style={{ flex: 1 }}>
        <Animated.View style={{ opacity: fadeAnim }}>
          <Text style={styles.title}>Daily Water Tracker</Text>
          <Text style={styles.intake}>{waterIntake} ml</Text>

          <View style={styles.progressContainer}>
            <View style={[styles.progressBar, { width: `${progress * 100}%` }]} />
          </View>
          <Text style={styles.progressText}>{Math.round(progress * 100)}% of {goal} ml goal</Text>
          <Text style={styles.streak}>🔥 Streak: {streak} days</Text>

          <View style={styles.buttonGroup}>
            <TouchableOpacity style={styles.button} onPress={() => addWater(250)}>
              <Image source={{ uri: 'https://images.emojiterra.com/google/android-12l/512px/1f964.png' }} style={styles.imageIcon} />
            </TouchableOpacity>
            <TouchableOpacity style={styles.button} onPress={() => addWater(500)}>
              <Image source={{ uri: 'https://cdn-icons-png.flaticon.com/512/8576/8576345.png' }} style={styles.imageIcon} />
            </TouchableOpacity>
          </View>

          <TouchableOpacity style={styles.customButton} onPress={() => setModalVisible(true)}>
            <Text style={styles.buttonText}>More Options</Text>
          </TouchableOpacity>

          <Modal
            transparent={true}
            visible={modalVisible}
            animationType="slide"
            onRequestClose={() => setModalVisible(false)}
          >
            <View style={styles.modalContainer}>
              <View style={styles.modalContent}>
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
                  style={{ width: 250, height: 40 }}
                  minimumValue={50}
                  maximumValue={1000}
                  step={50}
                  value={sliderValue}
                  onValueChange={setSliderValue}
                  minimumTrackTintColor="#f06292"
                  maximumTrackTintColor="#f8bbd0"
                  thumbTintColor="#ec407a"
                />
                <TouchableOpacity style={styles.customButton} onPress={() => {
                  addWater(sliderValue);
                  setModalVisible(false);
                }}>
                  <Text style={styles.buttonText}>Add from Slider</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => setModalVisible(false)} style={styles.resetButton}>
                  <Text style={styles.resetText}>Close</Text>
                </TouchableOpacity>
              </View>
            </View>
          </Modal>

          <TouchableOpacity style={styles.resetButton} onPress={resetIntake}>
            <Text style={styles.resetText}>Reset</Text>
          </TouchableOpacity>
          <Text style={styles.sectionTitle}>Today’s Log</Text>
          {intakeLog.map((entry, index) => (
  <View key={index} style={styles.logItem}>
    <View style={styles.logTextContainer}>
      <Text style={{ fontSize: 16, fontWeight: '600' }}>{entry.amount} ml</Text>
      <Text style={{ fontSize: 12, color: '#555' }}>
        {new Date(entry.time).toLocaleTimeString()}
      </Text>
    </View>
    <TouchableOpacity
      onPress={() => removeLogEntry(index)}
      style={styles.logRemoveButton}
    >
      <Text style={styles.logRemoveText}>✕</Text>
    </TouchableOpacity>
  </View>
))}



        </Animated.View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  scrollContainer: {
    flexGrow: 1,
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
    marginBottom: 10,
    color: '#ad1457'
  },
  progressContainer: {
    height: 20,
    width: '80%',
    backgroundColor: '#eee',
    borderRadius: 10,
    overflow: 'hidden',
    marginBottom: 10
  },
  progressBar: {
    height: '100%',
    backgroundColor: '#ab47bc',
  },
  progressText: {
    marginBottom: 10,
    color: '#6a1b9a',
    fontWeight: 'bold'
  },
  streak: {
    marginBottom: 20,
    color: '#d81b60',
    fontWeight: 'bold',
    fontSize: 16
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
    fontSize: 20,
    textAlign: 'center'
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
    marginTop: 20,
    padding: 10,
    backgroundColor: '#f48fb1',
    borderRadius: 10,
  },
  resetText: {
    color: 'white',
    fontSize: 16,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.3)',
    justifyContent: 'center',
    alignItems: 'center'
  },
  modalContent: {
    backgroundColor: '#FEE1F1',
    padding: 20,
    borderRadius: 15,
    alignItems: 'center'
  },
  logItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#fce4ec',
    padding: 12,
    marginVertical: 6,
    borderRadius: 10,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 4,
    elevation: 2,
  },
  logTextContainer: {
    flexDirection: 'column',
  },
  logRemoveButton: {
    padding: 4,
    backgroundColor: '#e57373',
    borderRadius: 8,
  },
  logRemoveText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 16,
  }
  
});