import { useEffect } from 'react';
import { Pill } from 'lucide-react';
import alarmService from '../services/alarmService';
import './AlarmModal.css';

const AlarmModal = ({ dose, onTake }) => {
  useEffect(() => {
    return () => {
      alarmService.stopAlarmAndVibration();
    };
  }, []);

  if (!dose) {
    return null;
  }

  const handleTake = () => {
    alarmService.stopAlarmAndVibration();
    onTake();
  };

  const formatTime = (time) => {
    if (!time) {
      return 'Not scheduled';
    }
    const [hours, minutes] = time.split(':');
    const hour = parseInt(hours, 10);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const hour12 = hour % 12 || 12;
    return `${hour12}:${minutes} ${ampm}`;
  };

  return (
    <div className="alarm-modal-overlay">
      <div className="alarm-modal">
        <div className="alarm-icon">
          <Pill size={40} />
        </div>
        <h2>Time for your medicine!</h2>
        <p className="medicine-name">{dose.medicineName}</p>
        <p className="medicine-time">Scheduled for {formatTime(dose.time)}</p>
        <p className="alarm-note">This alarm keeps ringing until you mark this dose as taken.</p>

        <div className="alarm-actions">
          <button type="button" className="take-medicine-btn" onClick={handleTake}>
            Take Now
          </button>
        </div>
      </div>
    </div>
  );
};

export default AlarmModal;
