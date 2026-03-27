import { useState, useEffect, useCallback } from 'react';
import storageService from '../services/storage';

export const useMedicines = () => {
  const [medicines, setMedicines] = useState([]);
  const [todayDoses, setTodayDoses] = useState([]);
  const [loading, setLoading] = useState(true);

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

    setTodayDoses(doses);
  }, [checkIfActive, checkIfDoseTaken]);

  // Load medicines
  const loadMedicines = useCallback(() => {
    const storedMedicines = storageService.getMedicines();
    setMedicines(storedMedicines);
    generateTodayDoses(storedMedicines);
    setLoading(false);
  }, [generateTodayDoses]);

  // Load medicines on mount
  useEffect(() => {
    loadMedicines();
  }, [loadMedicines]);

  // Add new medicine
  const addMedicine = useCallback((medicineData) => {
    const newMedicine = storageService.addMedicine(medicineData);
    setMedicines(prev => [...prev, newMedicine]);
    generateTodayDoses([...medicines, newMedicine]);
    return newMedicine;
  }, [medicines, generateTodayDoses]);

  // Update medicine
  const updateMedicine = useCallback((id, updates) => {
    const updated = storageService.updateMedicine(id, updates);
    if (updated) {
      setMedicines(prev => prev.map(m => m.id === id ? updated : m));
      generateTodayDoses(medicines.map(m => m.id === id ? updated : m));
    }
    return updated;
  }, [medicines, generateTodayDoses]);

  // Delete medicine
  const deleteMedicine = useCallback((id) => {
    storageService.deleteMedicine(id);
    setMedicines(prev => prev.filter(m => m.id !== id));
    generateTodayDoses(medicines.filter(m => m.id !== id));
  }, [medicines, generateTodayDoses]);

  // Mark dose as taken
  const markDoseTaken = useCallback((medicineId, time) => {
    storageService.markDoseTaken(medicineId, time);
    setTodayDoses(prev => prev.map(dose => {
      if (dose.medicineId === medicineId && dose.time === time) {
        return { ...dose, taken: true };
      }
      return dose;
    }));
  }, []);

  // Get upcoming doses (not yet taken)
  const getUpcomingDoses = useCallback(() => {
    const now = new Date();
    const currentTime = now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
    
    return todayDoses.filter(dose => 
      !dose.taken && dose.time >= currentTime
    );
  }, [todayDoses]);

  return {
    medicines,
    todayDoses,
    loading,
    addMedicine,
    updateMedicine,
    deleteMedicine,
    markDoseTaken,
    getUpcomingDoses,
    refresh: loadMedicines
  };
};

export default useMedicines;