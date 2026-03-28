import { useEffect, useMemo, useState } from 'react';
import {
  Bell,
  CalendarDays,
  Check,
  Clock3,
  Droplets,
  FlaskConical,
  History,
  ListFilter,
  Pencil,
  Pill,
  Syringe,
  Trash2,
  Wind,
  X,
} from 'lucide-react';
import alarmService from '../services/alarmService';
import storageService from '../services/storage';
import { isDoseReadyToTake, isMedicineActiveOnDate, setTimeOnDate } from '../utils/medicineSchedule';
import './HomePage.css';

const DAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

const MEDICINE_ICONS = {
  pill: Pill,
  syrup: FlaskConical,
  injection: Syringe,
  drops: Droplets,
  cream: FlaskConical,
  inhaler: Wind,
};

const formatTime = (time) => {
  if (!time) {
    return '';
  }

  const [hours, minutes] = time.split(':');
  const hour = Number(hours);
  const period = hour >= 12 ? 'PM' : 'AM';
  const hour12 = hour % 12 || 12;
  return `${hour12}:${minutes} ${period}`;
};

const formatRelativeTime = (time, now) => {
  const scheduledAt = setTimeOnDate(now, time);
  const difference = scheduledAt.getTime() - now.getTime();

  if (difference <= 0) {
    return 'Waiting for alarm';
  }

  const totalMinutes = Math.max(1, Math.round(difference / (1000 * 60)));
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;

  if (hours > 0) {
    return `in ${hours}h ${minutes}m`;
  }

  return `in ${minutes}m`;
};

const formatHistoryDate = (value) => {
  const date = new Date(value);
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  if (date.toDateString() === today.toDateString()) {
    return 'Today';
  }

  if (date.toDateString() === yesterday.toDateString()) {
    return 'Yesterday';
  }

  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: date.getFullYear() === today.getFullYear() ? undefined : 'numeric',
  });
};

const formatDuration = (medicine) => {
  if (medicine.durationType === 'ongoing') {
    return 'Ongoing';
  }

  const duration = Number(medicine.duration) || 0;
  if (duration <= 0) {
    return 'Ongoing';
  }

  if (medicine.durationType === 'weeks') {
    return `${duration} ${duration === 1 ? 'week' : 'weeks'}`;
  }

  if (medicine.durationType === 'months') {
    return `${duration} ${duration === 1 ? 'month' : 'months'}`;
  }

  return `${duration} ${duration === 1 ? 'day' : 'days'}`;
};

const formatScheduleLabel = (medicine) => {
  if (medicine.scheduleType === 'interval') {
    const intervalHours = Number(medicine.intervalHours) || 0;
    const intervalMinutes = Number(medicine.intervalMinutes) || 0;

    if (intervalHours > 0 && intervalMinutes > 0) {
      return `Every ${intervalHours}h ${intervalMinutes}m`;
    }

    if (intervalHours > 0) {
      return `Every ${intervalHours}h`;
    }

    if (intervalMinutes > 0) {
      return `Every ${intervalMinutes}m`;
    }
  }

  return 'Daily';
};

const getActiveDays = (medicine) => {
  if (medicine.frequency === 'weekly') {
    return new Set([new Date(medicine.startDate || medicine.createdAt || Date.now()).getDay()]);
  }

  if (Array.isArray(medicine.daysOfWeek) && medicine.daysOfWeek.length > 0) {
    return new Set(medicine.daysOfWeek);
  }

  return new Set([0, 1, 2, 3, 4, 5, 6]);
};

const HomePage = ({
  todayDoses = [],
  onMarkTaken,
  onEditMedicine,
  onDeleteMedicine,
  medicines = [],
  activeView = 'progress',
  onViewChange,
  activeAlarmDose,
}) => {
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(null);
  const [showHistory, setShowHistory] = useState(null);
  const [scheduleFilterName, setScheduleFilterName] = useState('');
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const intervalId = window.setInterval(() => {
      setNow(new Date());
    }, 30000);

    return () => {
      window.clearInterval(intervalId);
    };
  }, []);

  const medicineOptions = useMemo(() => {
    return [...new Set(
      medicines
        .map((medicine) => medicine.name?.trim())
        .filter(Boolean)
    )].sort((left, right) => left.localeCompare(right));
  }, [medicines]);

  useEffect(() => {
    if (scheduleFilterName && !medicineOptions.includes(scheduleFilterName)) {
      setScheduleFilterName('');
    }
  }, [medicineOptions, scheduleFilterName]);

  const medicineMap = useMemo(() => {
    return new Map(medicines.map((medicine) => [medicine.id, medicine]));
  }, [medicines]);

  const todayDosesByMedicine = useMemo(() => {
    return todayDoses.reduce((groups, dose) => {
      const entries = groups.get(dose.medicineId) || [];
      entries.push(dose);
      groups.set(dose.medicineId, entries);
      return groups;
    }, new Map());
  }, [todayDoses]);

  const isDoseTriggered = (dose) => {
    if (!dose?.id) {
      return false;
    }

    return dose.id === activeAlarmDose?.id || alarmService.hasTriggeredDose(dose.id);
  };

  const getDoseStatus = (dose) => {
    if (!dose) {
      return {
        heroClassName: 'is-taken',
        scheduleClassName: 'is-taken',
        subtitle: 'All doses completed',
        actionLabel: 'Taken',
        statusLabel: 'Taken',
        canTake: false,
      };
    }

    const timeReached = isDoseReadyToTake(dose.time, now);
    const triggered = isDoseTriggered(dose);

    if (dose.taken) {
      return {
        heroClassName: 'is-taken',
        scheduleClassName: 'is-taken',
        subtitle: 'Taken',
        actionLabel: 'Taken',
        statusLabel: 'Taken',
        canTake: false,
      };
    }

    if (timeReached && triggered) {
      return {
        heroClassName: 'is-ready',
        scheduleClassName: 'is-ready',
        subtitle: 'Alarm ready',
        actionLabel: 'Take Now',
        statusLabel: 'Ready',
        canTake: true,
      };
    }

    if (timeReached) {
      return {
        heroClassName: 'is-overdue',
        scheduleClassName: 'is-overdue',
        subtitle: 'Waiting for alarm',
        actionLabel: 'Not time yet',
        statusLabel: 'Late',
        canTake: false,
      };
    }

    return {
      heroClassName: '',
      scheduleClassName: 'is-waiting',
      subtitle: formatRelativeTime(dose.time, now),
      actionLabel: 'Not time yet',
      statusLabel: 'Scheduled',
      canTake: false,
    };
  };

  const pendingDoses = useMemo(() => {
    return todayDoses.filter((dose) => !dose.taken);
  }, [todayDoses]);

  const nextDose = pendingDoses[0] || null;
  const nextDoseStatus = getDoseStatus(nextDose);

  const progressStats = useMemo(() => {
    const takenCount = todayDoses.filter((dose) => dose.taken).length;
    const leftCount = todayDoses.length - takenCount;
    const readyCount = pendingDoses.filter((dose) => {
      return isDoseReadyToTake(dose.time, now) && isDoseTriggered(dose);
    }).length;
    const lateCount = pendingDoses.filter((dose) => {
      return isDoseReadyToTake(dose.time, now) && !isDoseTriggered(dose);
    }).length;

    return {
      medicineCount: new Set(todayDoses.map((dose) => dose.medicineId)).size,
      totalCount: todayDoses.length,
      takenCount,
      leftCount,
      readyCount,
      lateCount,
      percent: todayDoses.length === 0 ? 0 : Math.round((takenCount / todayDoses.length) * 100),
    };
  }, [now, pendingDoses, todayDoses]);

  const filteredMedicines = useMemo(() => {
    if (!scheduleFilterName) {
      return medicines;
    }

    return medicines.filter((medicine) => medicine.name === scheduleFilterName);
  }, [medicines, scheduleFilterName]);

  const historyEntries = useMemo(() => {
    if (!showHistory) {
      return [];
    }

    return storageService
      .getHistory()
      .filter((entry) => entry.medicineId === showHistory)
      .sort((left, right) => new Date(right.takenAt) - new Date(left.takenAt))
      .slice(0, 12);
  }, [showHistory, medicines, todayDoses]);

  const selectedMedicine = showHistory ? medicineMap.get(showHistory) : null;

  const handleTake = (medicineId, time) => {
    onMarkTaken?.(medicineId, time);
  };

  const handleDelete = (medicineId) => {
    setShowDeleteConfirm(medicineId);
  };

  const confirmDelete = () => {
    if (!showDeleteConfirm) {
      return;
    }

    onDeleteMedicine?.(showDeleteConfirm);

    if (showHistory === showDeleteConfirm) {
      setShowHistory(null);
    }

    setShowDeleteConfirm(null);
  };

  const renderTodayView = () => {
    if (medicines.length === 0) {
      return (
        <div className="empty-state">
          <div className="empty-icon">
            <img src="/TakeCare+.png" alt="TakeCare+" className="empty-logo" />
          </div>
          <h3>No medicines yet</h3>
          <p>Add your first schedule to start tracking reminders.</p>
        </div>
      );
    }

    return (
      <div className="home-panel">
        <div className="today-hero-stack">
          <section className="progress-card" style={{ '--card-index': 0 }}>
            <div className="progress-card-main">
              <div className="progress-card-icon">
                <img src="/TakeCare+.png" alt="TakeCare+" className="progress-card-logo" />
              </div>

              <div className="progress-card-copy">
                <span className="progress-card-title">Today&apos;s Progress</span>
                <span className="progress-card-caption">
                  {progressStats.takenCount} of {progressStats.totalCount} taken
                </span>
              </div>

              <div className="progress-card-percent">{progressStats.percent}%</div>
            </div>

            <div className="progress-card-bar">
              <div className="progress-card-fill" style={{ width: `${progressStats.percent}%` }} />
            </div>

            <div className="progress-metrics">
              <article className="progress-metric">
                <span className="progress-metric-label">Meds</span>
                <span className="progress-metric-value">{progressStats.medicineCount}</span>
              </article>

              <article className="progress-metric">
                <span className="progress-metric-label">Left</span>
                <span className="progress-metric-value">{progressStats.leftCount}</span>
              </article>

              <article className="progress-metric">
                <span className="progress-metric-label">Ready</span>
                <span className="progress-metric-value">{progressStats.readyCount}</span>
              </article>

              <article className="progress-metric">
                <span className="progress-metric-label">Late</span>
                <span className="progress-metric-value">{progressStats.lateCount}</span>
              </article>
            </div>
          </section>

          {nextDose ? (
            <section
              className={`next-dose-hero ${nextDoseStatus.heroClassName}`.trim()}
              style={{ '--card-index': 1 }}
            >
              <div className="next-dose-meta-row">
                <span className="next-dose-label">
                  <Bell size={14} />
                  <span>Next Dose</span>
                </span>

                <span className="next-dose-time-badge">{formatTime(nextDose.time)}</span>
              </div>

              <div className="next-dose-body">
                <span className="next-dose-icon-shell">
                  {(() => {
                    const MedicineIcon = MEDICINE_ICONS[nextDose.medicineIcon] || Pill;
                    return <MedicineIcon size={24} />;
                  })()}
                </span>

                <div className="next-dose-copy">
                  <h2 className="next-dose-title">{nextDose.medicineName}</h2>
                  <p className="next-dose-subtitle">{nextDoseStatus.subtitle}</p>
                </div>
              </div>

              <div className="next-dose-actions">
                <button
                  type="button"
                  className={`next-dose-action ${nextDoseStatus.canTake ? '' : 'is-disabled'}`.trim()}
                  onClick={() => handleTake(nextDose.medicineId, nextDose.time)}
                  disabled={!nextDoseStatus.canTake}
                >
                  <Check size={16} />
                  <span>{nextDoseStatus.actionLabel}</span>
                </button>

                <button
                  type="button"
                  className="next-dose-secondary"
                  onClick={() => onViewChange?.('schedule')}
                >
                  <CalendarDays size={16} />
                  <span>Schedule</span>
                </button>
              </div>
            </section>
          ) : (
            <section className="next-dose-hero is-taken" style={{ '--card-index': 1 }}>
              <div className="next-dose-meta-row">
                <span className="next-dose-label">
                  <Check size={14} />
                  <span>Completed</span>
                </span>

                <span className="next-dose-time-badge">Done</span>
              </div>

              <div className="next-dose-body">
                <span className="next-dose-icon-shell">
                  <Check size={24} />
                </span>

                <div className="next-dose-copy">
                  <h2 className="next-dose-title">All set</h2>
                  <p className="next-dose-subtitle">No more doses left for today.</p>
                </div>
              </div>

              <div className="next-dose-actions">
                <button type="button" className="next-dose-action is-disabled" disabled>
                  <Check size={16} />
                  <span>Taken</span>
                </button>

                <button
                  type="button"
                  className="next-dose-secondary"
                  onClick={() => onViewChange?.('schedule')}
                >
                  <CalendarDays size={16} />
                  <span>Schedule</span>
                </button>
              </div>
            </section>
          )}

          {todayDoses.length === 0 && (
            <section className="tab-empty-state">
              <h3>No doses for today</h3>
              <p>Your next active medicine schedule will appear here.</p>
            </section>
          )}
        </div>
      </div>
    );
  };

  const renderScheduleView = () => {
    if (medicines.length === 0) {
      return (
        <div className="tab-empty-state">
          <h3>No schedules yet</h3>
          <p>Add a medicine to see its days, times, and reminder status.</p>
        </div>
      );
    }

    return (
      <div className="home-panel">
        <section className="list-filter-card">
          <div className="list-filter-label">
            <ListFilter size={15} />
            <span>Filter by medicine</span>
          </div>

          <div className="list-filter-control">
            <select
              value={scheduleFilterName}
              onChange={(event) => setScheduleFilterName(event.target.value)}
              className="list-filter-select"
            >
              <option value="">All medicines</option>
              {medicineOptions.map((medicineName) => (
                <option key={medicineName} value={medicineName}>
                  {medicineName}
                </option>
              ))}
            </select>

            {scheduleFilterName && (
              <button
                type="button"
                className="list-filter-clear"
                onClick={() => setScheduleFilterName('')}
              >
                Clear
              </button>
            )}
          </div>
        </section>

        {filteredMedicines.length === 0 ? (
          <section className="tab-empty-state">
            <h3>No matching medicine</h3>
            <p>Change the filter to see your saved schedules again.</p>
          </section>
        ) : (
          <div className="schedule-list">
            {filteredMedicines.map((medicine, index) => {
              const MedicineIcon = MEDICINE_ICONS[medicine.icon] || Pill;
              const medicineDoses = todayDosesByMedicine.get(medicine.id) || [];
              const activeDays = getActiveDays(medicine);
              const nextMedicineDose = medicineDoses.find((dose) => !dose.taken) || null;

              let scheduleStatus = {
                label: 'Inactive',
                className: 'is-inactive',
              };

              if (isMedicineActiveOnDate(medicine, now)) {
                if (medicineDoses.length === 0) {
                  scheduleStatus = {
                    label: 'Scheduled',
                    className: 'is-waiting',
                  };
                } else if (medicineDoses.every((dose) => dose.taken)) {
                  scheduleStatus = {
                    label: 'Taken',
                    className: 'is-taken',
                  };
                } else if (nextMedicineDose) {
                  const doseStatus = getDoseStatus(nextMedicineDose);
                  scheduleStatus = {
                    label: doseStatus.statusLabel,
                    className: doseStatus.scheduleClassName,
                  };
                }
              }

              return (
                <article
                  key={medicine.id}
                  className="schedule-card"
                  style={{ '--card-index': index }}
                >
                  <div className="schedule-card-head">
                    <div className="schedule-card-title-wrap">
                      <span className="medicine-avatar is-large">
                        <MedicineIcon size={24} />
                      </span>

                      <div className="schedule-card-copy">
                        <h3 className="schedule-card-title">{medicine.name}</h3>

                        <div className="schedule-card-meta">
                          <span className="schedule-meta-chip">
                            <CalendarDays size={14} />
                            <span>{formatScheduleLabel(medicine)}</span>
                          </span>

                          <span className="schedule-meta-chip">
                            <Clock3 size={14} />
                            <span>{formatDuration(medicine)}</span>
                          </span>
                        </div>
                      </div>
                    </div>

                    <span className={`status-chip ${scheduleStatus.className}`.trim()}>
                      {scheduleStatus.label}
                    </span>
                  </div>

                  <div className="schedule-card-section">
                    <span className="schedule-section-label">
                      <CalendarDays size={13} />
                      <span>Days</span>
                    </span>

                    <div className="day-chip-grid">
                      {DAY_LABELS.map((label, dayIndex) => (
                        <span
                          key={`${medicine.id}-${label}`}
                          className={`day-chip ${activeDays.has(dayIndex) ? 'is-active' : ''}`.trim()}
                        >
                          {label}
                        </span>
                      ))}
                    </div>
                  </div>

                  <div className="schedule-card-section">
                    <span className="schedule-section-label">
                      <Clock3 size={13} />
                      <span>Times</span>
                    </span>

                    <div className="time-chip-grid">
                      {Array.isArray(medicine.times) && medicine.times.length > 0 ? (
                        medicine.times.map((time) => (
                          <span key={`${medicine.id}-${time}`} className="time-chip">
                            {formatTime(time)}
                          </span>
                        ))
                      ) : (
                        <span className="time-chip is-empty">No times set</span>
                      )}
                    </div>
                  </div>

                  <div className="schedule-card-actions">
                    <button
                      type="button"
                      className="list-row-action-icon"
                      onClick={() => setShowHistory(medicine.id)}
                      aria-label={`View history for ${medicine.name}`}
                    >
                      <History size={18} />
                    </button>

                    <button
                      type="button"
                      className="list-row-action-icon"
                      onClick={() => onEditMedicine?.(medicine)}
                      aria-label={`Edit ${medicine.name}`}
                    >
                      <Pencil size={18} />
                    </button>

                    <button
                      type="button"
                      className="list-row-action-icon is-danger"
                      onClick={() => handleDelete(medicine.id)}
                      aria-label={`Delete ${medicine.name}`}
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="home-page">
      {activeView === 'schedule' ? renderScheduleView() : renderTodayView()}

      {showDeleteConfirm && (
        <div className="delete-confirm-overlay" onClick={() => setShowDeleteConfirm(null)}>
          <div className="delete-confirm-modal" onClick={(event) => event.stopPropagation()}>
            <div className="delete-confirm-header">
              <h3>Delete medicine</h3>
              <button
                type="button"
                className="close-btn"
                onClick={() => setShowDeleteConfirm(null)}
                aria-label="Close delete dialog"
              >
                <X size={20} />
              </button>
            </div>

            <p className="delete-confirm-message">
              Remove this medicine and its scheduled reminders from the tracker?
            </p>

            <div className="delete-confirm-actions">
              <button
                type="button"
                className="cancel-btn"
                onClick={() => setShowDeleteConfirm(null)}
              >
                Cancel
              </button>

              <button type="button" className="delete-btn" onClick={confirmDelete}>
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {showHistory && (
        <div className="history-overlay" onClick={() => setShowHistory(null)}>
          <div className="history-modal" onClick={(event) => event.stopPropagation()}>
            <div className="history-header">
              <h3>{selectedMedicine?.name || 'Medicine'} history</h3>
              <button
                type="button"
                className="close-btn"
                onClick={() => setShowHistory(null)}
                aria-label="Close history dialog"
              >
                <X size={20} />
              </button>
            </div>

            <div className="history-content">
              {historyEntries.length === 0 ? (
                <div className="no-history">
                  <History size={42} />
                  <p>No history yet</p>
                  <span>Taken doses for this medicine will appear here.</span>
                </div>
              ) : (
                <div className="history-list">
                  {historyEntries.map((entry) => (
                    <div key={`${entry.medicineId}-${entry.time}-${entry.takenAt}`} className="history-item">
                      <div className="history-date">{formatHistoryDate(entry.takenAt)}</div>
                      <div className="history-time">
                        {new Date(entry.takenAt).toLocaleTimeString('en-US', {
                          hour: 'numeric',
                          minute: '2-digit',
                          hour12: true,
                        })}
                      </div>
                      <div className="history-status">
                        <Check size={14} />
                        <span>Taken</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default HomePage;
