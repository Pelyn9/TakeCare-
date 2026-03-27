import { useState, useEffect, useCallback, useRef } from 'react';
import storageService from '../services/storage';
import alarmService from '../services/alarmService';

export const useMedicines = () => {
  const [medicines, setMedicines] = useState([]);
  const [todayDoses, setTodayDoses] = useState([]);
  const [loading, setLoading] = useState(true);
  const isMounted = useRef(true);

  // Check if medicine is active on a given date
  const checkIfActive = useCallback((medicine, date) => {
    if (!medicine.startDate) return true;
    
    const startDate = new Date(medicine.startDate);
    const endDate = medicine.endDate ? new Date(medicine.endDate) : null;
    
    if (date < startDate) return false;
    if (endDate && date > endDate) return false;
    
    // Check frequency
    if (medicine.frequency === 'daily') return true;
    if (medicine.frequency === 'weekly') {
      return date.getDay() === startDate.getDay();
    }
    if (medicine.frequency === 'custom' && medicine.daysOfWeek) {
      return medicine.daysOfWeek.includes(date.getDay());
    }
    
    return true;
  }, []);

  // Check if dose was taken
  const checkIfDoseTaken = useCallback((medicineId, time, date) => {
    const history = storageService.getHistory();
    return history.some(entry => 
      entry.medicineId === medicineId && 
      entry.time === time &&
      new Date(entry.takenAt).toDateString() === date
    );
  }, []);

  // Generate today's doses from medicines
  const generateTodayDoses = useCallback((medList) => {
    const today = new Date();
    const todayDate = today.toDateString();

    const doses = [];
    
    medList.forEach(medicine => {
      // Check if medicine is active today
      const isActive = checkIfActive(medicine, today);
      if (!isActive) return;

      // Add each scheduled time as a dose
      medicine.times.forEach(time => {
        const doseId = `${medicine.id}-${time}`;
        const isTaken = checkIfDoseTaken(medicine.id, time, todayDate);
        
        doses.push({
          id: doseId,
          medicineId: medicine.id,
          medicineName: medicine.name,
          medicineIcon: medicine.icon,
          time,
          taken: isTaken,
          date: todayDate
        });
      });
    });

    // Sort by time
    doses.sort((a, b) => {
      const timeA = new Date(`2000-01-01 ${a.time}`);
      const timeB = new Date(`2000-01-01 ${b.time}`);
      return timeA - timeB;
    });

    if (isMounted.current) {
      setTodayDoses(doses);
    }
  }, [checkIfActive, checkIfDoseTaken]);

  // Schedule alarms for all upcoming doses
  const scheduleAlarms = useCallback((doses) => {
    // Cancel existing alarms first
    alarmService.cancelAllAlarms();
    
    doses.forEach(dose => {
      if (!dose.taken) {
        alarmService.scheduleAlarm(dose.medicineName, dose.time, (medicineName) => {
          // This callback fires when the alarm triggers
          console.log(`Alarm triggered for ${medicineName}`);
        });
      }
    });
  }, []);

  // Load medicines
  const loadMedicines = useCallback(() => {
    const storedMedicines = storageService.getMedicines();
    if (isMounted.current) {
      setMedicines(storedMedicines);
      generateTodayDoses(storedMedicines);
      setLoading(false);
    }
  }, [generateTodayDoses]);

  // Load medicines on mount
  useEffect(() => {
    isMounted.current = true;
    loadMedicines();
    
    return () => {
      isMounted.current = false;
    };
  }, [loadMedicines]);

  // Schedule alarms when doses change
  useEffect(() => {
    if (!loading && todayDoses.length > 0) {
      scheduleAlarms(todayDoses);
    }
    
    return () => {
      // Cleanup: stop alarms when component unmounts
      alarmService.stopAlarmAndVibration();
    };
  }, [todayDoses, loading, scheduleAlarms]);

  // Add new medicine
  const addMedicine = useCallback((medicineData) => {
    const newMedicine = storageService.addMedicine(medicineData);
    if (isMounted.current) {
      setMedicines(prev => [...prev, newMedicine]);
      generateTodayDoses([...medicines, newMedicine]);
    }
    return newMedicine;
  }, [medicines, generateTodayDoses]);

  // Update medicine
  const updateMedicine = useCallback((id, updates) => {
    const updated = storageService.updateMedicine(id, updates);
    if (updated && isMounted.current) {
      setMedicines(prev => prev.map(m => m.id === id ? updated : m));
      generateTodayDoses(medicines.map(m => m.id === id ? updated : m));
    }
    return updated;
  }, [medicines, generateTodayDoses]);

  // Delete medicine
  const deleteMedicine = useCallback((id) => {
    storageService.deleteMedicine(id);
    if (isMounted.current) {
      setMedicines(prev => prev.filter(m => m.id !== id));
      generateTodayDoses(medicines.filter(m => m.id !== id));
    }
  }, [medicines, generateTodayDoses]);

  // Mark dose as taken
  const markDoseTaken = useCallback((medicineId, time) => {
    storageService.markDoseTaken(medicineId, time);
    
    // Cancel the alarm for this dose
    const medicine = medicines.find(m => m.id === medicineId);
    if (medicine) {
      alarmService.cancelAlarm(medicine.name, time);
    }
    
    if (isMounted.current) {
      setTodayDoses(prev => prev.map(dose => {
        if (dose.medicineId === medicineId && dose.time === time) {
          return { ...dose, taken: true };
        }
        return dose;
      }));
    }
  }, [medicines]);

  // Stop alarm (when user acknowledges it)
  const stopAlarm = useCallback(() => {
    alarmService.stopAlarmAndVibration();
  }, []);

  // Get upcoming doses (not yet taken)
  const getUpcomingDoses = useCallback(() => {
    const now = new Date();
    const currentTime = now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
    
    return todayDoses.filter(dose => 
      !dose.taken && dose.time >= currentTime
    );
  }, [todayDoses]);

  // Get taken doses count
  const getTakenCount = useCallback(() => {
    return todayDoses.filter(d => d.taken).length;
  }, [todayDoses]);

  // Get total doses count
  const getTotalCount = useCallback(() => {
    return todayDoses.length;
  }, [todayDoses]);

  return {
    medicines,
    todayDoses,
    loading,
    addMedicine,
    updateMedicine,
    deleteMedicine,
    markDoseTaken,
    stopAlarm,
    getUpcomingDoses,
    getTakenCount,
    getTotalCount,
    refresh: loadMedicines
  };
};

export default useMedicines;
