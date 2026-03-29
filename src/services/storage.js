import {
  LOW_SUPPLY_THRESHOLD,
  normalizeSupplyValue,
  normalizeTimeValue,
} from '../utils/medicineSchedule';

// Local Storage Service for TakeCare+
const STORAGE_KEYS = {
  MEDICINES: 'takecare_medicines',
  SCHEDULE: 'takecare_schedule',
  HISTORY: 'takecare_history'
};

const ACCIDENTAL_DUPLICATE_WINDOW_MS = 15000;

const normalizeDateKey = (value) => {
  if (!value) {
    return '';
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return '';
  }

  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, '0');
  const day = `${date.getDate()}`.padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const buildMedicineSignature = (medicine) => {
  return JSON.stringify({
    name: String(medicine.name || '').trim().toLowerCase(),
    icon: medicine.icon || '',
    supply: normalizeSupplyValue(medicine.supply),
    scheduleType: medicine.scheduleType || '',
    startTime: medicine.startTime || '',
    times: Array.isArray(medicine.times) ? [...medicine.times].sort() : [],
    frequency: medicine.frequency ?? null,
    intervalHours: medicine.intervalHours ?? null,
    intervalMinutes: medicine.intervalMinutes ?? null,
    duration: Number(medicine.duration) || null,
    durationType: medicine.durationType || '',
    daysOfWeek: Array.isArray(medicine.daysOfWeek)
      ? [...new Set(medicine.daysOfWeek)].sort((left, right) => left - right)
      : [],
    startDate: normalizeDateKey(medicine.startDate || medicine.createdAt),
  });
};

const areAccidentalDuplicates = (leftMedicine, rightMedicine) => {
  if (buildMedicineSignature(leftMedicine) !== buildMedicineSignature(rightMedicine)) {
    return false;
  }

  const leftCreatedAt = new Date(leftMedicine.createdAt || leftMedicine.startDate || 0).getTime();
  const rightCreatedAt = new Date(rightMedicine.createdAt || rightMedicine.startDate || 0).getTime();

  if (Number.isNaN(leftCreatedAt) || Number.isNaN(rightCreatedAt)) {
    return true;
  }

  return Math.abs(leftCreatedAt - rightCreatedAt) <= ACCIDENTAL_DUPLICATE_WINDOW_MS;
};

const collapseAccidentalDuplicates = (medicines) => {
  const dedupedMedicines = [];
  const replacedIds = new Map();

  medicines.forEach((medicine) => {
    const duplicate = dedupedMedicines.find((entry) => areAccidentalDuplicates(entry, medicine));

    if (duplicate) {
      replacedIds.set(medicine.id, duplicate.id);
      return;
    }

    dedupedMedicines.push(medicine);
  });

  return {
    medicines: dedupedMedicines,
    replacedIds,
  };
};

const remapHistoryMedicines = (history, replacedIds) => {
  const seenEntries = new Set();
  const nextHistory = [];

  history.forEach((entry) => {
    const medicineId = replacedIds.get(entry.medicineId) || entry.medicineId;
    const nextEntry = medicineId === entry.medicineId ? entry : { ...entry, medicineId };
    const entryKey = `${nextEntry.medicineId}-${nextEntry.time}-${nextEntry.takenAt}`;

    if (seenEntries.has(entryKey)) {
      return;
    }

    seenEntries.add(entryKey);
    nextHistory.push(nextEntry);
  });

  return nextHistory;
};

const normalizeMedicineSchedule = (medicine) => {
  const normalizedTimes = Array.isArray(medicine.times)
    ? medicine.times
      .map((time) => normalizeTimeValue(time) || time)
      .filter(Boolean)
    : medicine.times;

  return {
    ...medicine,
    supply: normalizeSupplyValue(medicine.supply),
    startTime: normalizeTimeValue(medicine.startTime) || medicine.startTime,
    times: Array.isArray(normalizedTimes)
      ? [...new Set(normalizedTimes)].sort()
      : normalizedTimes,
  };
};

export const storageService = {
  // Get all medicines
  getMedicines: () => {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.MEDICINES);
      const medicines = data ? JSON.parse(data) : [];
      const normalizedMedicines = medicines.map((medicine) => normalizeMedicineSchedule(medicine));
      const { medicines: dedupedMedicines, replacedIds } = collapseAccidentalDuplicates(normalizedMedicines);

      if (JSON.stringify(dedupedMedicines) !== JSON.stringify(medicines)) {
        localStorage.setItem(STORAGE_KEYS.MEDICINES, JSON.stringify(dedupedMedicines));

        if (replacedIds.size > 0) {
          const historyData = localStorage.getItem(STORAGE_KEYS.HISTORY);
          const history = historyData ? JSON.parse(historyData) : [];
          const nextHistory = remapHistoryMedicines(history, replacedIds);
          localStorage.setItem(STORAGE_KEYS.HISTORY, JSON.stringify(nextHistory));
        }
      }

      return dedupedMedicines;
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
    const newMedicine = normalizeMedicineSchedule({
      ...medicine,
      id: Date.now().toString(),
      createdAt: new Date().toISOString()
    });

    const duplicate = medicines.find((entry) => areAccidentalDuplicates(entry, newMedicine));
    if (duplicate) {
      return duplicate;
    }

    medicines.push(newMedicine);
    storageService.saveMedicines(medicines);
    return newMedicine;
  },

  // Update medicine
  updateMedicine: (id, updates) => {
    const medicines = storageService.getMedicines();
    const index = medicines.findIndex(m => m.id === id);
    if (index !== -1) {
      medicines[index] = normalizeMedicineSchedule({ ...medicines[index], ...updates });
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
    const medicines = storageService.getMedicines();
    const medicineIndex = medicines.findIndex((medicine) => medicine.id === medicineId);

    if (medicineIndex === -1) {
      return {
        success: false,
        reason: 'not_found',
      };
    }

    const currentMedicine = medicines[medicineIndex];
    const currentSupply = normalizeSupplyValue(currentMedicine.supply);

    if (currentSupply !== null && currentSupply <= 0) {
      return {
        success: false,
        reason: 'out_of_stock',
        medicine: currentMedicine,
        remainingSupply: 0,
      };
    }

    const history = storageService.getHistory();
    const entry = {
      medicineId,
      time: normalizeTimeValue(time) || time,
      takenAt: new Date().toISOString()
    };

    let updatedMedicine = currentMedicine;
    let remainingSupply = currentSupply;

    if (currentSupply !== null) {
      remainingSupply = Math.max(0, currentSupply - 1);
      updatedMedicine = normalizeMedicineSchedule({
        ...currentMedicine,
        supply: remainingSupply,
      });
      medicines[medicineIndex] = updatedMedicine;
      storageService.saveMedicines(medicines);
    }

    history.push(entry);
    localStorage.setItem(STORAGE_KEYS.HISTORY, JSON.stringify(history));
    return {
      success: true,
      entry,
      medicine: updatedMedicine,
      remainingSupply,
      lowSupplyWarning: remainingSupply === LOW_SUPPLY_THRESHOLD,
      outOfStock: currentSupply !== null && remainingSupply === 0,
    };
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

  clearHistory: () => {
    try {
      localStorage.removeItem(STORAGE_KEYS.HISTORY);
      return true;
    } catch (error) {
      console.error('Error clearing history:', error);
      return false;
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
