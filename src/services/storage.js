// Local Storage Service for TakeCare+
const STORAGE_KEYS = {
  MEDICINES: 'takecare_medicines',
  SCHEDULE: 'takecare_schedule',
  HISTORY: 'takecare_history'
};

export const storageService = {
  // Get all medicines
  getMedicines: () => {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.MEDICINES);
      return data ? JSON.parse(data) : [];
    } catch (error) {
      console.error('Error getting medicines:', error);
      return [];
    }
  },

  // Save medicines
  saveMedicines: (medicines) => {
    try {
      localStorage.setItem(STORAGE_KEYS.MEDICINES, JSON.stringify(medicines));
      return true;
    } catch (error) {
      console.error('Error saving medicines:', error);
      return false;
    }
  },

  // Add new medicine
  addMedicine: (medicine) => {
    const medicines = storageService.getMedicines();
    const newMedicine = {
      ...medicine,
      id: Date.now().toString(),
      createdAt: new Date().toISOString()
    };
    medicines.push(newMedicine);
    storageService.saveMedicines(medicines);
    return newMedicine;
  },

  // Update medicine
  updateMedicine: (id, updates) => {
    const medicines = storageService.getMedicines();
    const index = medicines.findIndex(m => m.id === id);
    if (index !== -1) {
      medicines[index] = { ...medicines[index], ...updates };
      storageService.saveMedicines(medicines);
      return medicines[index];
    }
    return null;
  },

  // Delete medicine
  deleteMedicine: (id) => {
    const medicines = storageService.getMedicines();
    const filtered = medicines.filter(m => m.id !== id);
    storageService.saveMedicines(filtered);
    return true;
  },

  // Get today's schedule
  getTodaySchedule: () => {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.SCHEDULE);
      return data ? JSON.parse(data) : [];
    } catch (error) {
      console.error('Error getting schedule:', error);
      return [];
    }
  },

  // Save schedule
  saveSchedule: (schedule) => {
    try {
      localStorage.setItem(STORAGE_KEYS.SCHEDULE, JSON.stringify(schedule));
      return true;
    } catch (error) {
      console.error('Error saving schedule:', error);
      return false;
    }
  },

  // Mark dose as taken
  markDoseTaken: (medicineId, time) => {
    const history = storageService.getHistory();
    const entry = {
      medicineId,
      time,
      takenAt: new Date().toISOString()
    };
    history.push(entry);
    localStorage.setItem(STORAGE_KEYS.HISTORY, JSON.stringify(history));
    return entry;
  },

  // Get history
  getHistory: () => {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.HISTORY);
      return data ? JSON.parse(data) : [];
    } catch (error) {
      console.error('Error getting history:', error);
      return [];
    }
  },

  // Clear all data
  clearAll: () => {
    localStorage.removeItem(STORAGE_KEYS.MEDICINES);
    localStorage.removeItem(STORAGE_KEYS.SCHEDULE);
    localStorage.removeItem(STORAGE_KEYS.HISTORY);
  }
};

export default storageService;