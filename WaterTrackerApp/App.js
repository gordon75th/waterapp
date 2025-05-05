import React, { useState, useEffect, useRef, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, TextInput, Platform, Image, KeyboardAvoidingView, ScrollView, Modal, AppState } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Slider from '@react-native-community/slider';
import * as Notifications from 'expo-notifications';
import { Animated } from 'react-native';
import * as Haptics from 'expo-haptics';

// --- Constants ---
const DEFAULT_GOAL = 2000; // ml
const PRESET_AMOUNT_1 = 250; // ml
const PRESET_AMOUNT_2 = 500; // ml
const SLIDER_DEFAULT = 200; // ml
const SLIDER_MIN = 50; // ml
const SLIDER_MAX = 1000; // ml
const SLIDER_STEP = 50; // ml

const COLORS = {
  background: '#FEE1F1', // Light Pink
  primaryText: '#880e4f', // Dark Pink
  secondaryText: '#ad1457', // Medium Pink
  goalText: '#6a1b9a',  // Purple
  streakText: '#d81b60', // Bright Pink
  progressBarBackground: '#eee',
  progressBarFill: '#ab47bc', // Lilac
  buttonPresetBg: '#f06292', // Lighter Pink
  buttonCustomBg: '#ba68c8', // Lilac
  buttonResetBg: '#f48fb1', // Soft Pink
  buttonText: '#fff',
  modalBackground: 'rgba(0,0,0,0.4)',
  modalContentBg: '#FEE1F1',
  logItemBackground: '#fce4ec', // Very Light Pink
  logRemoveButton: '#e57373', // Reddish Pink
  inputBorder: 'gray',
  inputBackground: '#fff',
  sliderMinTrack: '#f06292',
  sliderMaxTrack: '#f8bbd0',
  sliderThumb: '#ec407a',
};

const STORAGE_KEYS = {
  WATER_INTAKE: '@waterIntake',
  WATER_GOAL: '@waterGoal',
  STREAK: '@streak',
  LAST_RESET_DATE: '@lastResetDate',
  DAILY_LOG_PREFIX: '@log_', // append date YYYY-MM-DD
  HISTORY_PREFIX: '@history_', // append date YYYY-MM-DD
};

// --- Motivational Messages ---
const getMotivationalMessage = (progress, streak) => {
  if (progress >= 1) return "🎉 Goal Achieved! Well done! 🎉";
  if (progress > 0.75) return "Almost there, keep it up! 💪";
  if (progress > 0.5) return "You're halfway there! 👍";
  if (progress > 0.25) return "Good start, keep drinking! 💧";
  if (streak > 3) return `Amazing ${streak}-day streak! Keep hydrated! 🔥`;
  return "Let's start hydrating for the day! ✨";
};

// --- Notification Setup ---
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true, // Changed to true for sound
    shouldSetBadge: false,
  }),
});

export default function App() {
  const [waterIntake, setWaterIntake] = useState(0);
  const [customAmount, setCustomAmount] = useState('');
  const [sliderValue, setSliderValue] = useState(SLIDER_DEFAULT);
  const [intakeLog, setIntakeLog] = useState([]);
  const [goal, setGoal] = useState(DEFAULT_GOAL);
  const [goalInput, setGoalInput] = useState(String(DEFAULT_GOAL)); // For goal input modal
  const [modalVisible, setModalVisible] = useState(false);
  const [streak, setStreak] = useState(0);
  // Removed history state for now as it wasn't displayed - can be added back for visualization
  // const [history, setHistory] = useState({});
  const appState = useRef(AppState.currentState);

  const progress = goal > 0 ? Math.min(waterIntake / goal, 1) : 0;
  const fadeAnim = useRef(new Animated.Value(1)).current;

  // --- Data Loading ---
  const loadData = useCallback(async () => {
    try {
      const storedIntake = await AsyncStorage.getItem(STORAGE_KEYS.WATER_INTAKE);
      const storedGoal = await AsyncStorage.getItem(STORAGE_KEYS.WATER_GOAL);
      const storedStreak = await AsyncStorage.getItem(STORAGE_KEYS.STREAK);
      const today = new Date().toISOString().slice(0, 10);
      const storedLog = await AsyncStorage.getItem(`${STORAGE_KEYS.DAILY_LOG_PREFIX}${today}`);

      setWaterIntake(storedIntake !== null ? parseInt(storedIntake) : 0);
      const currentGoal = storedGoal !== null ? parseInt(storedGoal) : DEFAULT_GOAL;
      setGoal(currentGoal);
      setGoalInput(String(currentGoal)); // Sync input field
      setStreak(storedStreak !== null ? parseInt(storedStreak) : 0);
      setIntakeLog(storedLog ? JSON.parse(storedLog) : []);

      console.log("Data loaded.");
      // Removed history loading as it's not used in UI yet
      // loadHistory();

    } catch (e) {
      console.error('Failed to load data.', e);
      Alert.alert("Error", "Could not load saved data.");
    }
  }, []);

  // --- Check for Daily Reset on App Load/Foreground ---
  const checkDailyReset = useCallback(async () => {
    const todayStr = new Date().toISOString().slice(0, 10);
    try {
      const lastResetDate = await AsyncStorage.getItem(STORAGE_KEYS.LAST_RESET_DATE);

      if (lastResetDate !== todayStr) {
        console.log(`New day detected (last reset: ${lastResetDate}, today: ${todayStr}). Performing reset check.`);

        const previousIntakeStr = await AsyncStorage.getItem(STORAGE_KEYS.WATER_INTAKE);
        const previousGoalStr = await AsyncStorage.getItem(STORAGE_KEYS.WATER_GOAL);
        const previousStreakStr = await AsyncStorage.getItem(STORAGE_KEYS.STREAK);

        const previousIntake = previousIntakeStr ? parseInt(previousIntakeStr) : 0;
        const previousGoal = previousGoalStr ? parseInt(previousGoalStr) : DEFAULT_GOAL;
        let currentStreak = previousStreakStr ? parseInt(previousStreakStr) : 0;

        if (lastResetDate && previousIntake >= previousGoal) {
          // Only increment streak if goal was met *yesterday*
          currentStreak++;
          console.log("Goal met yesterday, incrementing streak to:", currentStreak);
        } else if (lastResetDate) {
           // Reset streak if goal was not met yesterday (and it wasn't the very first launch)
          currentStreak = 0;
          console.log("Goal not met yesterday, resetting streak.");
        } else {
            // Very first launch or data loss, start streak at 0
            currentStreak = 0;
            console.log("No previous date found, starting streak at 0.");
        }

        // Reset for the new day
        setWaterIntake(0);
        setIntakeLog([]);
        setStreak(currentStreak);

        // Save the reset state
        await AsyncStorage.setItem(STORAGE_KEYS.WATER_INTAKE, '0');
        await AsyncStorage.setItem(STORAGE_KEYS.STREAK, String(currentStreak));
        await AsyncStorage.setItem(STORAGE_KEYS.LAST_RESET_DATE, todayStr);
        await AsyncStorage.removeItem(`${STORAGE_KEYS.DAILY_LOG_PREFIX}${lastResetDate}`); // Optional: Clear old log entry
        await AsyncStorage.setItem(`${STORAGE_KEYS.DAILY_LOG_PREFIX}${todayStr}`, '[]');
        console.log("Daily values reset, streak updated.");

      } else {
        console.log("Still the same day, no reset needed.");
      }
    } catch (e) {
      console.error("Failed during daily reset check:", e);
    }
  }, []); // Dependencies will be managed by useEffect hooks

  // --- Initial Load and App State Handling ---
  useEffect(() => {
    checkDailyReset().then(() => {
        loadData(); // Load data *after* potential reset
    });

    const subscription = AppState.addEventListener('change', nextAppState => {
      if (
        appState.current.match(/inactive|background/) &&
        nextAppState === 'active'
      ) {
        console.log('App has come to the foreground!');
        checkDailyReset(); // Re-check reset when app comes to foreground
      }
      appState.current = nextAppState;
    });

    // Setup Notifications
    (async () => {
      const { status } = await Notifications.getPermissionsAsync();
      if (status !== 'granted') {
        await Notifications.requestPermissionsAsync();
      }
      // Schedule reminders (consider making this customizable later)
       scheduleReminder();
    })();


    return () => {
      subscription.remove();
    };
  }, [checkDailyReset, loadData]); // Add dependencies

  // --- Data Saving ---
  const saveData = useCallback(async () => {
    try {
      const today = new Date().toISOString().slice(0, 10);
      await AsyncStorage.setItem(STORAGE_KEYS.WATER_INTAKE, waterIntake.toString());
      await AsyncStorage.setItem(STORAGE_KEYS.WATER_GOAL, goal.toString());
      await AsyncStorage.setItem(STORAGE_KEYS.STREAK, streak.toString()); // Ensure streak is saved too
      await AsyncStorage.setItem(`${STORAGE_KEYS.DAILY_LOG_PREFIX}${today}`, JSON.stringify(intakeLog));
      // Update history - can be simple daily total or more complex
      await AsyncStorage.setItem(`${STORAGE_KEYS.HISTORY_PREFIX}${today}`, waterIntake.toString());
       console.log("Data saved:", { waterIntake, goal, streak: streak, logLength: intakeLog.length });

    } catch (e) {
      console.error("Failed to save data", e);
    }
  }, [waterIntake, goal, streak, intakeLog]); // Dependencies for saving

  // Debounced save effect
   useEffect(() => {
    const handler = setTimeout(() => {
      saveData();
    }, 1000); // Save 1 second after changes stop

    return () => {
      clearTimeout(handler);
    };
  }, [saveData]); // Depend on the memoized saveData function


  // --- Core Logic Functions ---
  const addWater = (amount) => {
    if (amount <= 0) return;
    const newIntake = waterIntake + amount;
    const newLogEntry = { amount, time: new Date().toISOString(), id: Date.now() }; // Added unique ID
    setWaterIntake(newIntake);
    setIntakeLog(prevLog => [...prevLog, newLogEntry]);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); // Use impact for a stronger feel
  };

  const removeLogEntry = (idToRemove) => {
    const entryToRemove = intakeLog.find(entry => entry.id === idToRemove);
    if (entryToRemove) {
        const amountToRemove = entryToRemove.amount;
        setWaterIntake(prev => Math.max(0, prev - amountToRemove)); // Ensure intake doesn't go below 0
        setIntakeLog(prevLog => prevLog.filter(entry => entry.id !== idToRemove));
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning); // Haptic feedback for removal
    }
  };

  const handleCustomAdd = () => {
    const amount = parseInt(customAmount);
    if (!isNaN(amount) && amount > 0) {
      addWater(amount);
      setCustomAmount('');
      // Optionally close modal or keep it open
      // setModalVisible(false);
    } else {
      Alert.alert('Invalid Input', 'Please enter a valid positive number for the amount.');
    }
  };

   const handleGoalChange = async () => {
    const newGoalAmount = parseInt(goalInput);
    if (!isNaN(newGoalAmount) && newGoalAmount > 0) {
        setGoal(newGoalAmount);
        try {
             await AsyncStorage.setItem(STORAGE_KEYS.WATER_GOAL, String(newGoalAmount));
             Alert.alert('Success', `Goal updated to ${newGoalAmount} ml.`);
             // Maybe close modal after setting goal?
             // setModalVisible(false);
        } catch (e) {
            console.error("Failed to save new goal", e);
            Alert.alert('Error', 'Could not save the new goal.');
        }
    } else {
      Alert.alert('Invalid Input', 'Please enter a valid positive number for the goal.');
      // Reset input to current goal if invalid
       setGoalInput(String(goal));
    }
  };


  const resetIntakeConfirmation = () => {
    Alert.alert(
      'Reset Daily Intake',
      'Are you sure you want to reset today\'s water intake to 0? This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Yes, Reset', onPress: () => {
            setWaterIntake(0);
            setIntakeLog([]); // Also clear the log for today
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            // Data will be saved automatically by the effect hook
        }, style: 'destructive' }
      ]
    );
  };

  const scheduleReminder = async () => {
    // Cancel previous reminders to avoid duplicates if scheduling logic changes
    await Notifications.cancelAllScheduledNotificationsAsync();
    console.log("Scheduling reminders...");

    const now = new Date();
    const notifications = [];
    const startHour = 9; // 9 AM
    const endHour = 21; // 9 PM

    // Example: Reminder every 2 hours between 9 AM and 9 PM
    for (let hour = startHour; hour <= endHour; hour += 2) {
      const trigger = new Date(now);
      trigger.setHours(hour, 0, 0, 0); // Set to the target hour, 0 minutes, 0 seconds

      // If the calculated time is in the past for today, schedule it for tomorrow *or* skip
       // For simplicity here, we'll just schedule future ones for today
      if (trigger > now) {
        notifications.push({
          content: {
            title: "💧 Stay Hydrated! 💧",
            body: `GEH WASSER TRINKEEENNN, ${progress < 1 ? 'Anika!' : 'heheheh!'} 💕 Ichh hab dich lieebb <3!`, // Personalized message
            sound: 'default', // Ensure sound plays
          },
          trigger, // Schedule based on the calculated date/time
        });
        console.log(`Scheduling notification for: ${trigger.toLocaleTimeString()}`);
      } else {
         console.log(`Skipping past schedule for: ${trigger.toLocaleTimeString()}`);
      }
    }

     // Schedule all future notifications for today
    for (const note of notifications) {
      try {
        await Notifications.scheduleNotificationAsync(note);
      } catch (e) {
         console.error("Error scheduling notification:", e);
      }
    }
    console.log(`${notifications.length} reminders scheduled.`);
  };


  // --- Render ---
  return (
    <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContainer} style={{ flex: 1 }}>
        <Animated.View style={[styles.contentView, { opacity: fadeAnim }]}>
          <Text style={styles.title}>Daily Water Tracker</Text>
          <Text style={styles.intake}>{waterIntake} ml</Text>

          {/* Progress Bar */}
          <View style={styles.progressContainer}>
            <Animated.View style={[styles.progressBar, { width: `${progress * 100}%` }]} />
          </View>
          <Text style={styles.progressText}>{Math.round(progress * 100)}% of {goal} ml goal</Text>

          {/* Motivational Message */}
          <Text style={styles.motivationalText}>{getMotivationalMessage(progress, streak)}</Text>

          {/* Streak Counter */}
          <Text style={styles.streak}>🔥 Streak: {streak} days</Text>

          {/* Preset Buttons */}
          <View style={styles.buttonGroup}>
            <TouchableOpacity style={styles.presetButton} onPress={() => addWater(PRESET_AMOUNT_1)}>
               {/* Using a simple text representation if images are problematic */}
               <Text style={styles.presetButtonText}>{PRESET_AMOUNT_1}ml</Text>
              {/* <Image source={{ uri: 'https://images.emojiterra.com/google/android-12l/512px/1f964.png' }} style={styles.imageIcon} /> */}
            </TouchableOpacity>
            <TouchableOpacity style={styles.presetButton} onPress={() => addWater(PRESET_AMOUNT_2)}>
               <Text style={styles.presetButtonText}>{PRESET_AMOUNT_2}ml</Text>
              {/* <Image source={{ uri: 'https://cdn-icons-png.flaticon.com/512/8576/8576345.png' }} style={styles.imageIcon} /> */}
            </TouchableOpacity>
          </View>

          {/* More Options Button */}
          <TouchableOpacity style={styles.actionButton} onPress={() => setModalVisible(true)}>
            <Text style={styles.actionButtonText}>More Options / Settings</Text>
          </TouchableOpacity>

           {/* Reset Button */}
          <TouchableOpacity style={styles.resetButton} onPress={resetIntakeConfirmation}>
            <Text style={styles.resetText}>Reset Today's Intake</Text>
          </TouchableOpacity>

          {/* Log Section */}
          <Text style={styles.sectionTitle}>Today’s Log</Text>
          {intakeLog.length === 0 ? (
             <Text style={styles.logPlaceholder}>No entries yet today.</Text>
          ) : (
            intakeLog.slice().reverse().map((entry) => ( // Show newest first
              <View key={entry.id} style={styles.logItem}>
                <View style={styles.logTextContainer}>
                  <Text style={styles.logAmountText}>{entry.amount} ml</Text>
                  <Text style={styles.logTimeText}>
                    {new Date(entry.time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </Text>
                </View>
                <TouchableOpacity
                  onPress={() => removeLogEntry(entry.id)}
                  style={styles.logRemoveButton}
                >
                  <Text style={styles.logRemoveText}>✕</Text>
                </TouchableOpacity>
              </View>
            ))
          )}

        </Animated.View>
      </ScrollView>

      {/* --- Modal for Custom Add / Slider / Goal Setting --- */}
      <Modal
        transparent={true}
        visible={modalVisible}
        animationType="slide"
        onRequestClose={() => setModalVisible(false)}
      >
        <TouchableOpacity style={styles.modalContainer} activeOpacity={1} onPressOut={() => setModalVisible(false)}>
             <TouchableOpacity style={styles.modalContent} activeOpacity={1} onPress={(e) => e.stopPropagation()}>
                {/* Custom Amount Input */}
                 <Text style={styles.modalSectionTitle}>Add Custom Amount</Text>
                <TextInput
                  style={styles.input}
                  keyboardType="numeric"
                  placeholder="Enter amount in ml"
                  value={customAmount}
                  onChangeText={setCustomAmount}
                  placeholderTextColor="#aaa" // Lighter placeholder
                />
                <TouchableOpacity style={styles.actionButton} onPress={handleCustomAdd}>
                  <Text style={styles.actionButtonText}>Add Amount</Text>
                </TouchableOpacity>

                 {/* Slider Input */}
                <Text style={styles.modalSectionTitle}>Add Amount with Slider: {sliderValue} ml</Text>
                <Slider
                  style={styles.slider}
                  minimumValue={SLIDER_MIN}
                  maximumValue={SLIDER_MAX}
                  step={SLIDER_STEP}
                  value={sliderValue}
                  onValueChange={setSliderValue}
                  minimumTrackTintColor={COLORS.sliderMinTrack}
                  maximumTrackTintColor={COLORS.sliderMaxTrack}
                  thumbTintColor={COLORS.sliderThumb}
                />
                <TouchableOpacity style={styles.actionButton} onPress={() => {
                  addWater(sliderValue);
                  // Optionally close modal or reset slider
                   setSliderValue(SLIDER_DEFAULT); // Reset slider after adding
                  // setModalVisible(false);
                }}>
                  <Text style={styles.actionButtonText}>Add from Slider</Text>
                </TouchableOpacity>

                 {/* Goal Setting Input */}
                <Text style={styles.modalSectionTitle}>Set Daily Goal</Text>
                 <TextInput
                  style={styles.input}
                  keyboardType="numeric"
                  placeholder="Enter goal in ml"
                  value={goalInput}
                  onChangeText={setGoalInput}
                   placeholderTextColor="#aaa"
                />
                <TouchableOpacity style={styles.actionButton} onPress={handleGoalChange}>
                  <Text style={styles.actionButtonText}>Set Goal</Text>
                </TouchableOpacity>


                {/* Close Modal Button */}
                <TouchableOpacity onPress={() => setModalVisible(false)} style={styles.closeButton}>
                  <Text style={styles.closeButtonText}>Close</Text>
                </TouchableOpacity>
             </TouchableOpacity>
        </TouchableOpacity>
      </Modal>
    </KeyboardAvoidingView>
  );
}

// --- Styles --- (Using constants defined above)
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  scrollContainer: {
    flexGrow: 1,
    justifyContent: 'flex-start', // Align content top
    alignItems: 'center',
    paddingTop: 60, // More space at the top
    paddingBottom: 40, // Space at the bottom
    paddingHorizontal: 20,
  },
   contentView: {
    width: '100%',
    alignItems: 'center', // Center items horizontally in the view
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 15,
    color: COLORS.primaryText,
    textAlign: 'center',
  },
  intake: {
    fontSize: 48,
    fontWeight: 'bold',
    marginBottom: 10,
    color: COLORS.secondaryText,
  },
  progressContainer: {
    height: 25, // Slightly thicker bar
    width: '90%', // Wider bar
    backgroundColor: COLORS.progressBarBackground,
    borderRadius: 12.5, // Rounded ends
    overflow: 'hidden',
    marginBottom: 5,
  },
  progressBar: {
    height: '100%',
    backgroundColor: COLORS.progressBarFill,
    borderRadius: 12.5, // Match container
  },
  progressText: {
    marginBottom: 10,
    color: COLORS.goalText,
    fontWeight: '600', // Slightly bolder
    fontSize: 14,
  },
   motivationalText: {
    fontSize: 16,
    color: COLORS.secondaryText,
    marginBottom: 15,
    fontStyle: 'italic',
    textAlign: 'center',
  },
  streak: {
    marginBottom: 25,
    color: COLORS.streakText,
    fontWeight: 'bold',
    fontSize: 18, // Larger streak text
  },
  buttonGroup: {
    flexDirection: 'row',
    justifyContent: 'space-around', // Space out buttons
    width: '80%', // Control width of the group
    marginBottom: 20,
  },
   presetButton: {
    backgroundColor: COLORS.buttonPresetBg,
    paddingVertical: 15,
    paddingHorizontal: 20,
    borderRadius: 15, // More rounded
    marginHorizontal: 10,
    minWidth: 100, // Ensure minimum size
    alignItems: 'center', // Center text/icon
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
    elevation: 4,
  },
  presetButtonText: {
     color: COLORS.buttonText,
     fontSize: 18,
     fontWeight: 'bold',
  },
  // imageIcon: { // Keep if you use images
  //   width: 50,
  //   height: 50,
  //   resizeMode: 'contain'
  // },
   actionButton: { // Renamed from customButton for clarity
    backgroundColor: COLORS.buttonCustomBg,
    paddingVertical: 12,
    paddingHorizontal: 25,
    borderRadius: 10,
    marginTop: 15, // Consistent margin
    marginBottom: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.18,
    shadowRadius: 2,
    elevation: 3,
  },
  actionButtonText: { // Renamed from buttonText
    color: COLORS.buttonText,
    fontSize: 18, // Slightly smaller for action buttons
    textAlign: 'center',
    fontWeight: '500',
  },
  resetButton: {
    marginTop: 20,
    marginBottom: 20,
    paddingVertical: 10,
    paddingHorizontal: 20,
    backgroundColor: COLORS.buttonResetBg,
    borderRadius: 10,
  },
  resetText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '500',
  },
  sectionTitle: {
    fontSize: 20, // Larger section titles
    fontWeight: 'bold',
    marginTop: 30, // More space before log
    marginBottom: 10, // Space after title
    color: COLORS.goalText,
    alignSelf: 'flex-start', // Align to the left
    paddingLeft: '5%', // Indent slightly
  },
   logPlaceholder: {
      fontSize: 16,
      color: '#888',
      marginTop: 10,
      fontStyle: 'italic',
  },
  logItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: COLORS.logItemBackground,
    padding: 12,
    marginVertical: 6,
    borderRadius: 10,
    width: '90%', // Make log items consistent width
    shadowColor: '#000',
    shadowOpacity: 0.08, // Subtle shadow
    shadowOffset: { width: 0, height: 1 },
    shadowRadius: 3,
    elevation: 2,
  },
  logTextContainer: {
    flexDirection: 'column',
    flex: 1, // Take available space
    marginRight: 10, // Space before remove button
  },
   logAmountText: {
      fontSize: 16,
      fontWeight: '600',
      color: COLORS.secondaryText,
  },
   logTimeText: {
      fontSize: 12,
      color: '#555', // Dark grey for time
  },
  logRemoveButton: {
    paddingVertical: 5,
    paddingHorizontal: 10,
    backgroundColor: COLORS.logRemoveButton,
    borderRadius: 8,
  },
  logRemoveText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 14,
  },
  // --- Modal Styles ---
  modalContainer: {
    flex: 1,
    backgroundColor: COLORS.modalBackground,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: COLORS.modalContentBg,
    padding: 25, // More padding
    borderRadius: 15,
    alignItems: 'center',
    width: '90%', // Wider modal
    maxWidth: 400, // Max width for larger screens
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
   modalSectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginTop: 15,
    marginBottom: 8,
    color: COLORS.goalText,
  },
  input: {
    height: 45, // Taller input
    borderColor: COLORS.inputBorder,
    borderWidth: 1,
    width: '90%', // Relative width
    borderRadius: 8,
    marginVertical: 10,
    paddingHorizontal: 15, // More padding
    backgroundColor: COLORS.inputBackground,
    fontSize: 16, // Larger font in input
  },
  slider: {
     width: '90%', // Relative width
     height: 40,
     marginVertical: 10, // Spacing around slider
  },
   closeButton: {
     marginTop: 25, // More space before close button
     paddingVertical: 10,
     paddingHorizontal: 20,
     backgroundColor: COLORS.buttonResetBg, // Use reset button color
     borderRadius: 10,
  },
  closeButtonText: {
     color: 'white',
     fontSize: 16,
     fontWeight: '500',
  },
});