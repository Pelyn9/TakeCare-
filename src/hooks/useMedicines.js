import { useState, useCallback, useRef, useMemo, useEffect } from 'react';
import storageService from '../services/storage';
import alarmService from '../services/alarmService';
import {
  buildTodayDoses,
  buildUpcomingAlarmOccurrences,
  isDoseReadyToTake,
} from '../utils/medicineSchedule';

export const useMedicines = () => {
  const [medicines, setMedicines] = useState(() => storageService.getMedicines());
  const [history, setHistory] = useState(() => storageService.getHistory());
  const isMounted = useRef(true);

  // Generate today's doses from medicines (computed value)
  const todayDoses = useMemo(() => {
    return buildTodayDoses(medicines, history);
  }, [medicines, history]);

  // Schedule alarms for all upcoming doses (now async)
  const scheduleAlarms = useCallback(async (allMedicines) => {
    const history = storageService.getHistory();
    const upcomingOccurrences = buildUpcomingAlarmOccurrences(allMedicines, history);

    // Cancel existing alarms first
    await alarmService.cancelAllAlarms();
    
    for (const occurrence of upcomingOccurrences) {
      await alarmService.scheduleAlarm(occurrence);
    }
  }, []);

  // Schedule alarms when doses change
  useEffect(() => {
    scheduleAlarms(medicines);
    
    return () => {
      alarmService.stopAlarmAndVibration();
    };
  }, [medicines, scheduleAlarms]);

  // Add new medicine
  const addMedicine = useCallback((medicineData) => {
    const newMedicine = storageService.addMedicine(medicineData);
    if (isMounted.current) {
      setMedicines(prev => [...prev, newMedicine]);
    }
    return newMedicine;
  }, []);

  // Update medicine
  const updateMedicine = useCallback((id, updates) => {
    const updated = storageService.updateMedicine(id, updates);
    if (updated && isMounted.current) {
      setMedicines(prev => prev.map(m => m.id === id ? updated : m));
    }
    return updated;
  }, []);

  // Delete medicine
  const deleteMedicine = useCallback((id) => {
    storageService.deleteMedicine(id);
    if (isMounted.current) {
      setMedicines(prev => prev.filter(m => m.id !== id));
    }
  }, []);

  // Mark dose as taken
  const markDoseTaken = useCallback((medicineId, time, bypassTimeCheck = false) => {
    const dose = todayDoses.find((entry) => {
      return entry.medicineId === medicineId && entry.time === time && !entry.taken;
    });

    if (!dose) {
      return {
        success: false,
        reason: 'not_ready',
      };
    }

    // Allow taking dose if bypassing time check (from AlarmModal) or if time is ready
    if (!bypassTimeCheck && !isDoseReadyToTake(time)) {
      return {
        success: false,
        reason: 'not_ready',
      };
    }

    // Register the dose as triggered if it hasn't been already
    // This allows manual "Take Now" without requiring an alarm trigger
    if (!alarmService.hasTriggeredDose(dose.id)) {
      alarmService.registerTriggeredDose(dose);
    }

    const result = storageService.markDoseTaken(medicineId, time);
    if (!result?.success) {
      return result;
    }

    // Cancel the alarm for this dose
    if (dose) {
      alarmService.cancelAlarm(dose.id);
    }

    if (result.lowSupplyWarning) {
      alarmService.sendLowStockNotification(result.medicine).catch((error) => {
        console.error('Error sending low stock notification:', error);
      });
    }

    // Refresh medicines and history to update the computed doses
    if (isMounted.current) {
      setMedicines(storageService.getMedicines());
      setHistory(storageService.getHistory());
    }

    return result;
  }, [todayDoses]);

  // Stop alarm (when user acknowledges it)
  const stopAlarm = useCallback(() => {
    alarmService.stopAlarmAndVibration();
  }, []);

  // Refresh medicines from storage
  const refresh = useCallback(() => {
    const storedMedicines = storageService.getMedicines();
    const storedHistory = storageService.getHistory();
    if (isMounted.current) {
      setMedicines(storedMedicines);
      setHistory(storedHistory);
    }
  }, []);

  return {
    medicines,
    todayDoses,
    addMedicine,
    updateMedicine,
    deleteMedicine,
    markDoseTaken,
    stopAlarm,
    refresh
  };
};

export default useMedicines;
