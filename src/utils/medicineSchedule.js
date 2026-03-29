const DAY_IN_MS = 24 * 60 * 60 * 1000;
export const LOW_SUPPLY_THRESHOLD = 5;

export const parseTimeValue = (time) => {
  if (typeof time !== 'string') {
    return null;
  }

  const trimmedTime = time.trim().toUpperCase();
  const match = trimmedTime.match(/^(\d{1,2}):(\d{2})(?:\s*([AP]M))?$/);

  if (!match) {
    return null;
  }

  let hours = Number(match[1]);
  const minutes = Number(match[2]);
  const meridiem = match[3];

  if (Number.isNaN(hours) || Number.isNaN(minutes) || minutes < 0 || minutes > 59) {
    return null;
  }

  if (meridiem) {
    if (hours < 1 || hours > 12) {
      return null;
    }

    if (hours === 12) {
      hours = 0;
    }

    if (meridiem === 'PM') {
      hours += 12;
    }
  } else if (hours < 0 || hours > 23) {
    return null;
  }

  return { hours, minutes };
};

export const normalizeTimeValue = (time) => {
  const parsedTime = parseTimeValue(time);

  if (!parsedTime) {
    return '';
  }

  return `${String(parsedTime.hours).padStart(2, '0')}:${String(parsedTime.minutes).padStart(2, '0')}`;
};

export const normalizeSupplyValue = (value) => {
  if (value === '' || value === null || value === undefined) {
    return null;
  }

  const numericValue = Number(value);
  if (!Number.isFinite(numericValue)) {
    return null;
  }

  return Math.max(0, Math.floor(numericValue));
};

export const getMedicineSupply = (medicine) => {
  return normalizeSupplyValue(medicine?.supply);
};

export const isMedicineSupplyTracked = (medicine) => {
  return getMedicineSupply(medicine) !== null;
};

export const isMedicineOutOfStock = (medicine) => {
  const supply = getMedicineSupply(medicine);
  return supply !== null && supply <= 0;
};

export const isMedicineLowStock = (medicine, threshold = LOW_SUPPLY_THRESHOLD) => {
  const supply = getMedicineSupply(medicine);
  return supply !== null && supply > 0 && supply <= threshold;
};

const parseDate = (value) => {
  if (!value) {
    return null;
  }

  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
};

export const startOfDay = (value = new Date()) => {
  const date = new Date(value);
  date.setHours(0, 0, 0, 0);
  return date;
};

export const endOfDay = (value = new Date()) => {
  const date = startOfDay(value);
  date.setDate(date.getDate() + 1);
  date.setMilliseconds(-1);
  return date;
};

export const toDateKey = (value = new Date()) => {
  const date = startOfDay(value);
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, '0');
  const day = `${date.getDate()}`.padStart(2, '0');
  return `${year}-${month}-${day}`;
};

export const getMedicineStartDate = (medicine) => {
  return startOfDay(
    parseDate(medicine.startDate) ||
    parseDate(medicine.createdAt) ||
    new Date()
  );
};

export const getMedicineEndDate = (medicine) => {
  const explicitEndDate = parseDate(medicine.endDate);
  if (explicitEndDate) {
    return endOfDay(explicitEndDate);
  }

  const duration = Number(medicine.duration);
  if (!duration || duration < 1 || medicine.durationType === 'ongoing') {
    return null;
  }

  const endDate = getMedicineStartDate(medicine);

  switch (medicine.durationType) {
    case 'days':
      endDate.setDate(endDate.getDate() + duration - 1);
      break;
    case 'weeks':
      endDate.setDate(endDate.getDate() + (duration * 7) - 1);
      break;
    case 'months':
      endDate.setMonth(endDate.getMonth() + duration);
      endDate.setDate(endDate.getDate() - 1);
      break;
    default:
      return null;
  }

  return endOfDay(endDate);
};

export const isMedicineActiveOnDate = (medicine, value = new Date()) => {
  const date = startOfDay(value);
  const startDate = getMedicineStartDate(medicine);
  const endDate = getMedicineEndDate(medicine);

  if (date < startDate) {
    return false;
  }

  if (endDate && date > startOfDay(endDate)) {
    return false;
  }

  if (medicine.frequency === 'weekly') {
    return date.getDay() === startDate.getDay();
  }

  if (medicine.frequency === 'custom' && Array.isArray(medicine.daysOfWeek) && medicine.daysOfWeek.length > 0) {
    return medicine.daysOfWeek.includes(date.getDay());
  }

  return true;
};

export const setTimeOnDate = (dateValue, time) => {
  const date = new Date(dateValue);
  const parsedTime = parseTimeValue(time);

  if (!parsedTime) {
    date.setHours(0, 0, 0, 0);
    return date;
  }

  date.setHours(parsedTime.hours, parsedTime.minutes, 0, 0);
  return date;
};

export const isDoseReadyToTake = (time, value = new Date()) => {
  const now = new Date(value);
  const scheduledAt = setTimeOnDate(now, time);
  return scheduledAt <= now;
};

export const buildDoseOccurrenceId = (medicineId, dateKey, time) => {
  return `${medicineId}-${dateKey}-${normalizeTimeValue(time) || time}`;
};

export const isDoseTakenOnDate = (history, medicineId, time, dateKey) => {
  const normalizedTime = normalizeTimeValue(time);

  return history.some((entry) => {
    return (
      entry.medicineId === medicineId &&
      (normalizeTimeValue(entry.time) || entry.time) === (normalizedTime || time) &&
      toDateKey(entry.takenAt) === dateKey
    );
  });
};

export const buildTodayDoses = (medicines, history, today = new Date()) => {
  const date = startOfDay(today);
  const dateKey = toDateKey(date);
  const doses = [];

  medicines.forEach((medicine) => {
    if (!isMedicineActiveOnDate(medicine, date) || !Array.isArray(medicine.times)) {
      return;
    }

    const supply = getMedicineSupply(medicine);

    medicine.times.forEach((time) => {
      doses.push({
        id: buildDoseOccurrenceId(medicine.id, dateKey, time),
        occurrenceDate: dateKey,
        medicineId: medicine.id,
        medicineName: medicine.name,
        medicineIcon: medicine.icon,
        medicineSupply: supply,
        supplyTracked: supply !== null,
        outOfStock: supply !== null && supply <= 0,
        time,
        taken: isDoseTakenOnDate(history, medicine.id, time, dateKey),
      });
    });
  });

  doses.sort((left, right) => setTimeOnDate(date, left.time) - setTimeOnDate(date, right.time));
  return doses;
};

export const buildUpcomingAlarmOccurrences = (
  medicines,
  history,
  {
    now = new Date(),
    lookAheadDays = 30,
  } = {}
) => {
  const startDate = startOfDay(now);
  const occurrences = [];

  for (let offset = 0; offset < lookAheadDays; offset += 1) {
    const date = new Date(startDate.getTime() + (offset * DAY_IN_MS));
    const dateKey = toDateKey(date);

    medicines.forEach((medicine) => {
      if (!isMedicineActiveOnDate(medicine, date) || !Array.isArray(medicine.times)) {
        return;
      }

      if (isMedicineOutOfStock(medicine)) {
        return;
      }

      medicine.times.forEach((time) => {
        if (isDoseTakenOnDate(history, medicine.id, time, dateKey)) {
          return;
        }

        const scheduledAt = setTimeOnDate(date, time);
        if (scheduledAt <= now) {
          return;
        }

        occurrences.push({
          id: buildDoseOccurrenceId(medicine.id, dateKey, time),
          occurrenceDate: dateKey,
          medicineId: medicine.id,
          medicineName: medicine.name,
          medicineIcon: medicine.icon,
          time,
          scheduledAt,
        });
      });
    });
  }

  occurrences.sort((left, right) => left.scheduledAt - right.scheduledAt);
  return occurrences;
};
