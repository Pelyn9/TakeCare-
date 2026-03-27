import { useState, useCallback, useRef, useMemo, useEffect } from 'react';
import storageService from '../services/storage';
import alarmService from '../services/alarmService';

export const useMedicines = () => {
  const [medicines, setMedicines] = useState(() => storageService.getMedicines());
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

  // Generate today's doses from medicines (computed value)
  const todayDoses = useMemo(() => {
    const today = new Date();
    const todayDate = today.toDateString();
    const history = storageService.getHistory();

    const doses = [];
    
    medicines.forEach(medicine => {
      // Check if medicine is active today
      const isActive = checkIfActive(medicine, today);
      if (!isActive) return;

      // Add each scheduled time as a dose
      medicine.times.forEach(time => {
        const doseId = `${medicine.id}-${time}`;
        const isTaken = history.some(entry => 
          entry.medicineId === medicine.id && 
          entry.time === time &&
          new Date(entry.takenAt).toDateString() === todayDate
        );
        
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

    return doses;
  }, [medicines, checkIfActive]);

  // Schedule alarms for all upcoming doses
  const scheduleAlarms = useCallback((doses) => {
    // Cancel existing alarms first
    alarmService.cancelAllAlarms();
    
    doses.forEach(dose => {
      if (!dose.taken) {
        alarmService.scheduleAlarm(dose.medicineName, dose.time, dose.id, (medicineName) => {
          console.log(`Alarm triggered for ${medicineName}`);
        });
      }
    });
  }, []);

  // Schedule alarms when doses change
  useEffect(() => {
    if (todayDoses.length > 0) {
      scheduleAlarms(todayDoses);
    }
    
    return () => {
      alarmService.stopAlarmAndVibration();
    };
  }, [todayDoses, scheduleAlarms]);

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
    storageService.markDoseTaken(medicineId, time);
    
    // Cancel the alarm for this dose
    const dose = todayDoses.find(d => d.medicineId === medicineId && d.time === time);
    if (dose) {
      alarmService.cancelAlarm(dose.medicineName, time, dose.id);
    }
    
    // Refresh medicines to update the computed doses
    if (isMounted.current) {
      setMedicines(storageService.getMedicines());
    }
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
