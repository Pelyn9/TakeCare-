import { useState } from 'react';
import { Plus, X, Pill, FlaskConical, Syringe, Wind, Droplets, Clock } from 'lucide-react';
import './AddMedicineModal.css';

const ICONS = [
  { id: 'pill', icon: Pill, label: 'Pill' },
  { id: 'syrup', icon: FlaskConical, label: 'Syrup' },
  { id: 'injection', icon: Syringe, label: 'Injection' },
  { id: 'drops', icon: Droplets, label: 'Drops' },
  { id: 'cream', icon: FlaskConical, label: 'Cream' },
  { id: 'inhaler', icon: Wind, label: 'Inhaler' }
];

const FREQUENCIES = [1, 2, 3, 4, 5, 6];

const AddMedicineModal = ({ isOpen, onClose, onSave }) => {
  const [name, setName] = useState('');
  const [selectedIcon, setSelectedIcon] = useState('pill');
  const [startTime, setStartTime] = useState('08:00');
  const [dosesPerDay, setDosesPerDay] = useState(3);
  const [duration, setDuration] = useState(7);
  const [durationType, setDurationType] = useState('days');

  if (!isOpen) return null;

  // Calculate computed times based on start time and doses per day
  const computeTimes = () => {
    const times = [];
    const [startHour, startMin] = startTime.split(':').map(Number);
    
    // Calculate interval in minutes (12 hours / doses)
    const interval = Math.floor(12 * 60 / dosesPerDay);
    
    for (let i = 0; i < dosesPerDay; i++) {
      const totalMinutes = startHour * 60 + startMin + (i * interval);
      const hour = Math.floor(totalMinutes / 60) % 24;
      const min = totalMinutes % 60;
      times.push(`${hour.toString().padStart(2, '0')}:${min.toString().padStart(2, '0')}`);
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
    if (!name.trim()) return;

    onSave({
      name: name.trim(),
      icon: selectedIcon,
      times: computedTimes,
      frequency: dosesPerDay,
      startTime,
      duration: parseInt(duration),
      durationType,
      startDate: new Date().toISOString()
    });

    // Reset form
    setName('');
    setSelectedIcon('pill');
    setStartTime('08:00');
    setDosesPerDay(3);
    setDuration(7);
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Add Medicine</h2>
          <button className="close-btn" onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
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

            <div className="form-group">
              <label>Doses per Day</label>
              <div className="frequency-pills">
                {FREQUENCIES.map(num => (
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
          </div>

          {/* Computed Times Preview */}
          <div className="computed-times">
            <label>Computed Times</label>
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
                <option value="doses">Doses</option>
              </select>
            </div>
          </div>

          <button type="submit" className="save-btn">
            <Plus size={20} />
            Save Medicine
          </button>
        </form>
      </div>
    </div>
  );
};

export default AddMedicineModal;