import { useEffect, useRef, useState } from 'react';
import { Plus, X, Pill, FlaskConical, Syringe, Wind, Droplets, Clock, RotateCcw } from 'lucide-react';
import './AddMedicineModal.css';

const ICONS = [
  { id: 'pill', icon: Pill, label: 'Pill' },
  { id: 'syrup', icon: FlaskConical, label: 'Syrup' },
  { id: 'injection', icon: Syringe, label: 'Injection' },
  { id: 'drops', icon: Droplets, label: 'Drops' },
  { id: 'cream', icon: FlaskConical, label: 'Cream' },
  { id: 'inhaler', icon: Wind, label: 'Inhaler' }
];

const SCHEDULE_TYPES = [
  { id: 'fixed', label: 'Fixed Times', desc: 'Set specific times per day' },
  { id: 'interval', label: 'Every X Hours', desc: 'Repeat after interval' }
];

const getFormState = (medicine = null) => ({
  name: medicine?.name || '',
  selectedIcon: medicine?.icon || 'pill',
  supply: medicine?.supply ?? '',
  scheduleType: medicine?.scheduleType || 'fixed',
  startTime: medicine?.startTime || '08:00',
  dosesPerDay: medicine?.frequency || 3,
  intervalHours: medicine?.intervalHours || 4,
  intervalMinutes: medicine?.intervalMinutes || 0,
  duration: medicine?.duration || 7,
  durationType: medicine?.durationType || 'days',
});

const AddMedicineModal = ({ isOpen, onClose, onSave, editMedicine = null }) => {
  const modalContentRef = useRef(null);
  const isEditMode = Boolean(editMedicine);
  const [editEverything, setEditEverything] = useState(false);
  const [name, setName] = useState(() => getFormState(editMedicine).name);
  const [selectedIcon, setSelectedIcon] = useState(() => getFormState(editMedicine).selectedIcon);
  const [supply, setSupply] = useState(() => getFormState(editMedicine).supply);
  const [scheduleType, setScheduleType] = useState(() => getFormState(editMedicine).scheduleType);
  const [startTime, setStartTime] = useState(() => getFormState(editMedicine).startTime);
  const [dosesPerDay, setDosesPerDay] = useState(() => getFormState(editMedicine).dosesPerDay);
  const [intervalHours, setIntervalHours] = useState(() => getFormState(editMedicine).intervalHours);
  const [intervalMinutes, setIntervalMinutes] = useState(() => getFormState(editMedicine).intervalMinutes);
  const [duration, setDuration] = useState(() => getFormState(editMedicine).duration);
  const [durationType, setDurationType] = useState(() => getFormState(editMedicine).durationType);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const formState = getFormState(editMedicine);
    setName(formState.name);
    setSelectedIcon(formState.selectedIcon);
    setSupply(formState.supply);
    setScheduleType(formState.scheduleType);
    setStartTime(formState.startTime);
    setDosesPerDay(formState.dosesPerDay);
    setIntervalHours(formState.intervalHours);
    setIntervalMinutes(formState.intervalMinutes);
    setDuration(formState.duration);
    setDurationType(formState.durationType);
    setIsSubmitting(false);
    setEditEverything(false);

    requestAnimationFrame(() => {
      modalContentRef.current?.scrollTo({ top: 0, behavior: 'auto' });
    });
  }, [editMedicine, isOpen]);

  if (!isOpen) return null;

  const parseSupplyInput = (value) => {
    if (value === '') {
      return null;
    }

    const parsedValue = parseInt(value, 10);
    if (Number.isNaN(parsedValue)) {
      return null;
    }

    return Math.max(0, parsedValue);
  };

  // Calculate computed times based on schedule type
  const computeTimes = () => {
    const times = [];
    
    if (scheduleType === 'fixed') {
      // Fixed times: distribute doses evenly across 12 hours
      const [startHour, startMin] = startTime.split(':').map(Number);
      const interval = Math.floor(12 * 60 / dosesPerDay);
      
      for (let i = 0; i < dosesPerDay; i++) {
        const totalMinutes = startHour * 60 + startMin + (i * interval);
        const hour = Math.floor(totalMinutes / 60) % 24;
        const min = totalMinutes % 60;
        times.push(`${hour.toString().padStart(2, '0')}:${min.toString().padStart(2, '0')}`);
      }
    } else {
      // Interval-based: repeat every X hours Y minutes
      const [startHour, startMin] = startTime.split(':').map(Number);
      const intervalTotalMinutes = intervalHours * 60 + intervalMinutes;

      if (intervalTotalMinutes <= 0) {
        return [startTime];
      }
      
      // Calculate how many doses fit in 16 waking hours (6 AM to 10 PM)
      const maxDoses = Math.floor((16 * 60) / intervalTotalMinutes) + 1;
      
      for (let i = 0; i < Math.min(maxDoses, 8); i++) {
        const totalMinutes = startHour * 60 + startMin + (i * intervalTotalMinutes);
        const hour = Math.floor(totalMinutes / 60) % 24;
        const min = totalMinutes % 60;
        
        // Only add if within reasonable waking hours (5 AM to 11 PM)
        if (hour >= 5 && hour <= 23) {
          times.push(`${hour.toString().padStart(2, '0')}:${min.toString().padStart(2, '0')}`);
        }
      }
    }
    
    return times;
  };

  const computedTimes = computeTimes();

  const formatTime = (time) => {
    const [hours, minutes] = time.split(':');
    const hour = parseInt(hours);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const hour12 = hour % 12 || 12;
    return `${hour12}:${minutes} ${ampm}`;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (isSubmitting) return;

    const parsedSupply = parseSupplyInput(supply);

    if (isEditMode) {
      if (parsedSupply === null) {
        return;
      }

      setIsSubmitting(true);

      if (editEverything) {
        const medicineData = {
          name: name.trim(),
          icon: selectedIcon,
          supply: parsedSupply,
          times: computedTimes,
          scheduleType,
          startTime,
          duration: parseInt(duration),
          durationType,
          startDate: editMedicine?.startDate || new Date().toISOString()
        };

        // Add schedule-specific fields
        if (scheduleType === 'fixed') {
          medicineData.frequency = dosesPerDay;
        } else {
          medicineData.intervalHours = intervalHours;
          medicineData.intervalMinutes = intervalMinutes;
        }

        onSave(medicineData);
      } else {
        onSave({ supply: parsedSupply });
      }
      return;
    }

    if (!name.trim() || parsedSupply === null) return;

    setIsSubmitting(true);

    const medicineData = {
      name: name.trim(),
      icon: selectedIcon,
      supply: parsedSupply,
      times: computedTimes,
      scheduleType,
      startTime,
      duration: parseInt(duration),
      durationType,
      startDate: editMedicine?.startDate || new Date().toISOString()
    };

    // Add schedule-specific fields
    if (scheduleType === 'fixed') {
      medicineData.frequency = dosesPerDay;
    } else {
      medicineData.intervalHours = intervalHours;
      medicineData.intervalMinutes = intervalMinutes;
    }

    onSave(medicineData);

    // Reset form if not editing
    if (!editMedicine) {
      const resetState = getFormState();
      setName(resetState.name);
      setSelectedIcon(resetState.selectedIcon);
      setSupply(resetState.supply);
      setScheduleType(resetState.scheduleType);
      setStartTime(resetState.startTime);
      setDosesPerDay(resetState.dosesPerDay);
      setIntervalHours(resetState.intervalHours);
      setIntervalMinutes(resetState.intervalMinutes);
      setDuration(resetState.duration);
      setDurationType(resetState.durationType);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" ref={modalContentRef} onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h2>{isEditMode ? (editEverything ? 'Edit Medicine' : 'Update Supply') : 'Add Medicine'}</h2>
          <button type="button" className="close-btn" onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="modal-form">
          <div className="modal-body">
            {isEditMode ? (
              <>
                {!editEverything ? (
                  <>
                    <div className="edit-supply-card">
                      <span className="edit-supply-label">Refill medicine stock</span>
                      <h3>{editMedicine.name}</h3>
                      <p>Only the available supply can be updated here. The schedule stays the same.</p>

                      <div className="times-preview">
                        {(editMedicine.times || []).map((time, index) => (
                          <span key={index} className="time-chip">{formatTime(time)}</span>
                        ))}
                      </div>
                    </div>

                    <div className="form-group">
                      <label>Available Medicine Supply</label>
                      <input
                        type="number"
                        value={supply}
                        onChange={e => setSupply(e.target.value)}
                        placeholder="Enter how many medicines you have now"
                        min="0"
                        className="form-input"
                        required
                      />
                      <p className="form-helper">Set the total stock you have right now. Every taken dose will subtract 1.</p>
                    </div>

                    <button
                      type="button"
                      className="edit-everything-btn"
                      onClick={() => setEditEverything(true)}
                    >
                      Edit Everything
                    </button>
                  </>
                ) : (
                  <>
                    <div className="edit-supply-card">
                      <span className="edit-supply-label">Edit medicine</span>
                      <h3>{editMedicine.name}</h3>
                      <p>Update all medicine details including schedule and supply.</p>
                    </div>

                    <div className="form-group">
                      <label>Medicine Name</label>
                      <input
                        type="text"
                        value={name}
                        onChange={e => setName(e.target.value)}
                        placeholder="Enter medicine name"
                        className="form-input"
                      />
                    </div>

                    <div className="form-group">
                      <label>Available Medicine Supply</label>
                      <input
                        type="number"
                        value={supply}
                        onChange={e => setSupply(e.target.value)}
                        placeholder="How many medicines are available?"
                        min="0"
                        className="form-input"
                        required
                      />
                      <p className="form-helper">The app will subtract 1 every time you mark a dose as taken.</p>
                    </div>

                    <div className="form-group">
                      <label>Icon</label>
                      <div className="icon-grid">
                        {ICONS.map(icon => {
                          const Icon = icon.icon;
                          return (
                            <button
                              key={icon.id}
                              type="button"
                              className={`icon-option ${selectedIcon === icon.id ? 'selected' : ''}`}
                              onClick={() => setSelectedIcon(icon.id)}
                            >
                              <Icon size={24} />
                              <span>{icon.label}</span>
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    <div className="form-group">
                      <label>Schedule Type</label>
                      <div className="schedule-type-grid">
                        {SCHEDULE_TYPES.map(type => (
                          <button
                            key={type.id}
                            type="button"
                            className={`schedule-type-option ${scheduleType === type.id ? 'selected' : ''}`}
                            onClick={() => setScheduleType(type.id)}
                          >
                            <div className="schedule-type-label">{type.label}</div>
                            <div className="schedule-type-desc">{type.desc}</div>
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="form-row">
                      <div className="form-group">
                        <label><Clock size={14} /> Start Time</label>
                        <input
                          type="time"
                          value={startTime}
                          onChange={e => setStartTime(e.target.value)}
                          className="form-input"
                        />
                      </div>

                      {scheduleType === 'fixed' ? (
                        <div className="form-group">
                          <label>Doses per Day</label>
                          <div className="frequency-pills">
                            {[1, 2, 3, 4, 5, 6].map(num => (
                              <button
                                key={num}
                                type="button"
                                className={`freq-pill ${dosesPerDay === num ? 'selected' : ''}`}
                                onClick={() => setDosesPerDay(num)}
                              >
                                {num}x
                              </button>
                            ))}
                          </div>
                        </div>
                      ) : (
                        <div className="form-group">
                          <label><RotateCcw size={14} /> Repeat Every</label>
                          <div className="interval-inputs">
                            <div className="interval-input-group">
                              <input
                                type="number"
                                value={intervalHours}
                                onChange={e => setIntervalHours(parseInt(e.target.value, 10) || 0)}
                                min="0"
                                max="23"
                                className="interval-input"
                              />
                              <span>hrs</span>
                            </div>
                            <div className="interval-input-group">
                              <input
                                type="number"
                                value={intervalMinutes}
                                onChange={e => setIntervalMinutes(parseInt(e.target.value, 10) || 0)}
                                min="0"
                                max="59"
                                step="5"
                                className="interval-input"
                              />
                              <span>min</span>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>

                    <div className="computed-times">
                      <label>Scheduled Times ({computedTimes.length} doses)</label>
                      <div className="times-preview">
                        {computedTimes.map((time, index) => (
                          <span key={index} className="time-chip">{formatTime(time)}</span>
                        ))}
                      </div>
                    </div>

                    <div className="form-group">
                      <label>Duration</label>
                      <div className="duration-row">
                        <input
                          type="number"
                          value={duration}
                          onChange={e => setDuration(e.target.value)}
                          min="1"
                          max="365"
                          className="duration-input"
                        />
                        <select
                          value={durationType}
                          onChange={e => setDurationType(e.target.value)}
                          className="duration-select"
                        >
                          <option value="days">Days</option>
                          <option value="weeks">Weeks</option>
                          <option value="months">Months</option>
                          <option value="ongoing">Ongoing</option>
                        </select>
                      </div>
                    </div>

                    <button
                      type="button"
                      className="edit-everything-btn cancel"
                      onClick={() => setEditEverything(false)}
                    >
                      Cancel
                    </button>
                  </>
                )}
              </>
            ) : (
              <>
                <div className="form-group">
                  <label>Medicine Name</label>
                  <input
                    type="text"
                    value={name}
                    onChange={e => setName(e.target.value)}
                    placeholder="Enter medicine name"
                    className="form-input"
                  />
                </div>

                <div className="form-group">
                  <label>Available Medicine Supply</label>
                  <input
                    type="number"
                    value={supply}
                    onChange={e => setSupply(e.target.value)}
                    placeholder="How many medicines are available?"
                    min="0"
                    className="form-input"
                    required
                  />
                  <p className="form-helper">The app will subtract 1 every time you mark a dose as taken.</p>
                </div>

                <div className="form-group">
                  <label>Icon</label>
                  <div className="icon-grid">
                    {ICONS.map(icon => {
                      const Icon = icon.icon;
                      return (
                        <button
                          key={icon.id}
                          type="button"
                          className={`icon-option ${selectedIcon === icon.id ? 'selected' : ''}`}
                          onClick={() => setSelectedIcon(icon.id)}
                        >
                          <Icon size={24} />
                          <span>{icon.label}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="form-group">
                  <label>Schedule Type</label>
                  <div className="schedule-type-grid">
                    {SCHEDULE_TYPES.map(type => (
                      <button
                        key={type.id}
                        type="button"
                        className={`schedule-type-option ${scheduleType === type.id ? 'selected' : ''}`}
                        onClick={() => setScheduleType(type.id)}
                      >
                        <div className="schedule-type-label">{type.label}</div>
                        <div className="schedule-type-desc">{type.desc}</div>
                      </button>
                    ))}
                  </div>
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label><Clock size={14} /> Start Time</label>
                    <input
                      type="time"
                      value={startTime}
                      onChange={e => setStartTime(e.target.value)}
                      className="form-input"
                    />
                  </div>

                  {scheduleType === 'fixed' ? (
                    <div className="form-group">
                      <label>Doses per Day</label>
                      <div className="frequency-pills">
                        {[1, 2, 3, 4, 5, 6].map(num => (
                          <button
                            key={num}
                            type="button"
                            className={`freq-pill ${dosesPerDay === num ? 'selected' : ''}`}
                            onClick={() => setDosesPerDay(num)}
                          >
                            {num}x
                          </button>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <div className="form-group">
                      <label><RotateCcw size={14} /> Repeat Every</label>
                      <div className="interval-inputs">
                        <div className="interval-input-group">
                          <input
                            type="number"
                            value={intervalHours}
                            onChange={e => setIntervalHours(parseInt(e.target.value, 10) || 0)}
                            min="0"
                            max="23"
                            className="interval-input"
                          />
                          <span>hrs</span>
                        </div>
                        <div className="interval-input-group">
                          <input
                            type="number"
                            value={intervalMinutes}
                            onChange={e => setIntervalMinutes(parseInt(e.target.value, 10) || 0)}
                            min="0"
                            max="59"
                            step="5"
                            className="interval-input"
                          />
                          <span>min</span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                <div className="computed-times">
                  <label>Scheduled Times ({computedTimes.length} doses)</label>
                  <div className="times-preview">
                    {computedTimes.map((time, index) => (
                      <span key={index} className="time-chip">{formatTime(time)}</span>
                    ))}
                  </div>
                </div>

                <div className="form-group">
                  <label>Duration</label>
                  <div className="duration-row">
                    <input
                      type="number"
                      value={duration}
                      onChange={e => setDuration(e.target.value)}
                      min="1"
                      max="365"
                      className="duration-input"
                    />
                    <select
                      value={durationType}
                      onChange={e => setDurationType(e.target.value)}
                      className="duration-select"
                    >
                      <option value="days">Days</option>
                      <option value="weeks">Weeks</option>
                      <option value="months">Months</option>
                      <option value="ongoing">Ongoing</option>
                    </select>
                  </div>
                </div>
              </>
            )}
          </div>

          <div className="modal-footer">
            <button type="submit" className="save-btn" disabled={isSubmitting}>
              <Plus size={20} />
              {isEditMode ? (editEverything ? 'Save Changes' : 'Update Supply') : 'Save Medicine'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AddMedicineModal;
