import { useEffect } from 'react';
import alarmService from '../services/alarmService';
import './AlarmModal.css';

const AlarmModal = ({ dose, onClose, onTake }) => {
  useEffect(() => {
    if (dose) {
      // Start alarm when modal appears
      alarmService.triggerAlarm(dose);
    }
    
    return () => {
      // Stop alarm when modal unmounts
      alarmService.stopAlarmAndVibration();
    };
  }, [dose]);

  if (!dose) return null;

  const handleTake = () => {
    alarmService.stopAlarmAndVibration();
    onTake();
  };

  const handleDismiss = () => {
    alarmService.stopAlarmAndVibration();
    if (onClose) onClose();
  };

  const formatTime = (time) => {
    const [hours, minutes] = time.split(':');
    const hour = parseInt(hours);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const hour12 = hour % 12 || 12;
    return `${hour12}:${minutes} ${ampm}`;
  };

  return (
    <div className="alarm-modal-overlay">
      <div className="alarm-modal">
        <div className="alarm-icon">💊</div>
        <h2>Time for your medicine!</h2>
        <p className="medicine-name">{dose.medicineName}</p>
        <p className="medicine-time">Scheduled for {formatTime(dose.time)}</p>
        
        <div className="alarm-actions">
          <button className="take-medicine-btn" onClick={handleTake}>
            ✓ I took it
          </button>
          <button className="remind-later-btn" onClick={handleDismiss}>
            Remind me later
          </button>
        </div>
      </div>
    </div>
  );
};

export default AlarmModal;
