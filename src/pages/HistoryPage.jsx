import { useEffect, useMemo, useState } from 'react';
import {
  CalendarDays,
  CheckCircle2,
  Clock3,
  Droplets,
  FlaskConical,
  ListFilter,
  Pill,
  Syringe,
  Trash2,
  Wind,
  X,
} from 'lucide-react';
import storageService from '../services/storage';
import './HistoryPage.css';

const MEDICINE_ICONS = {
  pill: Pill,
  syrup: FlaskConical,
  injection: Syringe,
  drops: Droplets,
  cream: FlaskConical,
  inhaler: Wind,
};

const loadHistoryData = () => {
  const history = storageService.getHistory();
  const medicines = storageService.getMedicines();

  return [...history]
    .sort((left, right) => new Date(right.takenAt) - new Date(left.takenAt))
    .map((entry) => {
      const medicine = medicines.find((item) => item.id === entry.medicineId);

      return {
        ...entry,
        medicineName: medicine ? medicine.name : 'Unknown medicine',
        medicineIcon: medicine ? medicine.icon : 'pill',
      };
    });
};

const toDateKey = (value) => {
  const date = new Date(value);
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, '0');
  const day = `${date.getDate()}`.padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const formatGroupLabel = (value) => {
  const date = new Date(value);
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  if (toDateKey(date) === toDateKey(today)) {
    return 'Today';
  }

  if (toDateKey(date) === toDateKey(yesterday)) {
    return 'Yesterday';
  }

  return date.toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: today.getFullYear() === date.getFullYear() ? undefined : 'numeric',
  });
};

const formatScheduledTime = (time) => {
  if (!time) {
    return '';
  }

  const [hours, minutes] = time.split(':');
  const hour = parseInt(hours, 10);
  const period = hour >= 12 ? 'PM' : 'AM';
  const hour12 = hour % 12 || 12;
  return `${hour12}:${minutes} ${period}`;
};

const formatTakenTime = (value) => {
  return new Date(value).toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
};

const HistoryPage = ({ medicines = [], onRefresh }) => {
  const [historyData, setHistoryData] = useState(() => loadHistoryData());
  const [historyFilterName, setHistoryFilterName] = useState('');
  const [showClearConfirm, setShowClearConfirm] = useState(false);

  useEffect(() => {
    setHistoryData(loadHistoryData());
  }, [medicines]);

  const historyFilterOptions = useMemo(() => {
    return [...new Set(
      medicines
        .map((medicine) => medicine.name?.trim())
        .filter(Boolean)
    )].sort((left, right) => left.localeCompare(right));
  }, [medicines]);

  useEffect(() => {
    if (historyFilterName && !historyFilterOptions.includes(historyFilterName)) {
      setHistoryFilterName('');
    }
  }, [historyFilterName, historyFilterOptions]);

  const filteredHistoryData = useMemo(() => {
    if (!historyFilterName) {
      return historyData;
    }

    return historyData.filter((entry) => entry.medicineName === historyFilterName);
  }, [historyData, historyFilterName]);

  const groupedHistory = useMemo(() => {
    const groups = new Map();

    filteredHistoryData.forEach((entry) => {
      const dateKey = toDateKey(entry.takenAt);
      const existingGroup = groups.get(dateKey);

      if (existingGroup) {
        existingGroup.items.push(entry);
        return;
      }

      groups.set(dateKey, {
        key: dateKey,
        label: formatGroupLabel(entry.takenAt),
        items: [entry],
      });
    });

    return Array.from(groups.values());
  }, [filteredHistoryData]);

  const trackedMedicineCount = useMemo(() => {
    return new Set(filteredHistoryData.map((entry) => entry.medicineId)).size;
  }, [filteredHistoryData]);

  const latestEntryLabel = useMemo(() => {
    if (filteredHistoryData.length === 0) {
      return 'No doses yet';
    }

    return `${formatGroupLabel(filteredHistoryData[0].takenAt)} ${formatTakenTime(filteredHistoryData[0].takenAt)}`;
  }, [filteredHistoryData]);

  const handleClearHistory = () => {
    const didClear = storageService.clearHistory();

    if (!didClear) {
      return;
    }

    setHistoryData([]);
    setShowClearConfirm(false);
    onRefresh?.();
  };

  return (
    <div className="history-page">
      <div className="history-page-shell">
        <section className="history-page-hero">
          <div className="history-page-hero-copy">
            <span className="history-page-eyebrow">History</span>
            <h2>Taken doses</h2>
            <p>Review completed reminders and clear old records when needed.</p>
          </div>

          <button
            type="button"
            className="history-page-clear-btn"
            onClick={() => setShowClearConfirm(true)}
            disabled={historyData.length === 0}
          >
            <Trash2 size={16} />
            <span>Clear</span>
          </button>
        </section>

        <section className="history-filter-card">
          <div className="history-filter-label">
            <ListFilter size={15} />
            <span>Filter by medicine</span>
          </div>

          <div className="history-filter-control">
            <select
              value={historyFilterName}
              onChange={(event) => setHistoryFilterName(event.target.value)}
              className="history-filter-select"
            >
              <option value="">All medicines</option>
              {historyFilterOptions.map((medicineName) => (
                <option key={medicineName} value={medicineName}>
                  {medicineName}
                </option>
              ))}
            </select>

            {historyFilterName && (
              <button
                type="button"
                className="history-filter-clear"
                onClick={() => setHistoryFilterName('')}
              >
                Clear
              </button>
            )}
          </div>
        </section>

        <section className="history-page-stats">
          <article className="history-page-stat-card">
            <span className="history-page-stat-label">Doses</span>
            <strong className="history-page-stat-value">{filteredHistoryData.length}</strong>
          </article>

          <article className="history-page-stat-card">
            <span className="history-page-stat-label">Medicines</span>
            <strong className="history-page-stat-value">{trackedMedicineCount}</strong>
          </article>

          <article className="history-page-stat-card is-wide">
            <span className="history-page-stat-label">Last Taken</span>
            <strong className="history-page-stat-value is-small">{latestEntryLabel}</strong>
          </article>
        </section>

        {filteredHistoryData.length === 0 ? (
          <section className="history-page-empty">
            <div className="history-page-empty-icon">
              <Clock3 size={32} />
            </div>
            <h3>{historyFilterName ? 'No history for this medicine' : 'No history yet'}</h3>
            <p>
              {historyFilterName
                ? `No taken doses found for ${historyFilterName}.`
                : 'Taken medicines will appear here after you mark a dose complete.'}
            </p>
          </section>
        ) : (
          <div className="history-page-groups">
            {groupedHistory.map((group, groupIndex) => (
              <section
                key={group.key}
                className="history-page-group"
                style={{ '--group-index': groupIndex }}
              >
                <div className="history-page-group-title">
                  <CalendarDays size={14} />
                  <span>{group.label}</span>
                </div>

                <div className="history-page-group-list">
                  {group.items.map((entry, itemIndex) => {
                    const MedicineIcon = MEDICINE_ICONS[entry.medicineIcon] || Pill;

                    return (
                      <article
                        key={`${entry.medicineId}-${entry.time}-${entry.takenAt}-${itemIndex}`}
                        className="history-page-item"
                        style={{ '--item-index': itemIndex }}
                      >
                        <span className="history-page-item-icon">
                          <MedicineIcon size={18} />
                        </span>

                        <div className="history-page-item-body">
                          <div className="history-page-item-row">
                            <h3 className="history-page-item-name">{entry.medicineName}</h3>
                            <span className="history-page-item-badge">
                              <CheckCircle2 size={12} />
                              <span>{formatTakenTime(entry.takenAt)}</span>
                            </span>
                          </div>

                          <div className="history-page-item-meta">
                            <span className="history-page-chip">
                              <Clock3 size={12} />
                              <span>Scheduled {formatScheduledTime(entry.time)}</span>
                            </span>
                            <span className="history-page-chip is-success">
                              <CheckCircle2 size={12} />
                              <span>Taken</span>
                            </span>
                          </div>
                        </div>
                      </article>
                    );
                  })}
                </div>
              </section>
            ))}
          </div>
        )}
      </div>

      {showClearConfirm && (
        <div className="history-page-confirm-overlay" onClick={() => setShowClearConfirm(false)}>
          <div className="history-page-confirm-modal" onClick={(event) => event.stopPropagation()}>
            <div className="history-page-confirm-head">
              <h3>Clear history</h3>
              <button
                type="button"
                className="history-page-icon-btn"
                onClick={() => setShowClearConfirm(false)}
                aria-label="Close clear history dialog"
              >
                <X size={18} />
              </button>
            </div>

            <p className="history-page-confirm-copy">
              Remove all taken-dose records from history? This does not delete your medicine schedules.
            </p>

            <div className="history-page-confirm-actions">
              <button
                type="button"
                className="history-page-secondary-btn"
                onClick={() => setShowClearConfirm(false)}
              >
                Cancel
              </button>

              <button
                type="button"
                className="history-page-danger-btn"
                onClick={handleClearHistory}
              >
                Clear history
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default HistoryPage;
