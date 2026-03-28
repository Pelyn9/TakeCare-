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
  const isMounted = useRef(true);

  // Generate today's doses from medicines (computed value)
  const todayDoses = useMemo(() => {
    const history = storageService.getHistory();
    return buildTodayDoses(medicines, history);
  }, [medicines]);

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
  const markDoseTaken = useCallback((medicineId, time) => {
    const dose = todayDoses.find((entry) => {
      return entry.medicineId === medicineId && entry.time === time && !entry.taken;
    });

    if (!dose || !isDoseReadyToTake(time) || !alarmService.hasTriggeredDose(dose.id)) {
      return false;
    }

    storageService.markDoseTaken(medicineId, time);

    // Cancel the alarm for this dose
    if (dose) {
      alarmService.cancelAlarm(dose.id);
    }

    // Refresh medicines to update the computed doses
    if (isMounted.current) {
      setMedicines(storageService.getMedicines());
    }

    return true;
  }, [todayDoses]);

  // Stop alarm (when user acknowledges it)
  const stopAlarm = useCallback(() => {
    alarmService.stopAlarmAndVibration();
  }, []);

  // Refresh medicines from storage
  const refresh = useCallback(() => {
    const storedMedicines = storageService.getMedicines();
    if (isMounted.current) {
      setMedicines(storedMedicines);
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
