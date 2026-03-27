import { Pill, FlaskConical, Syringe, Wind, Droplets, Check, Bell } from 'lucide-react';
import './MedicineCard.css';

const MedicineCard = ({ dose, onMarkTaken, onSetReminder }) => {
  const formatTime = (time) => {
    const [hours, minutes] = time.split(':');
    const hour = parseInt(hours);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const hour12 = hour % 12 || 12;
    return `${hour12}:${minutes} ${ampm}`;
  };

  const getMedicineIcon = (iconType) => {
    const icons = {
      pill: <Pill size={20} />,
      syrup: <FlaskConical size={20} />,
      injection: <Syringe size={20} />,
      drops: <Droplets size={20} />,
      cream: <FlaskConical size={20} />,
      inhaler: <Wind size={20} />
    };
    return icons[iconType] || <Pill size={20} />;
  };

  const isPastDue = () => {
    const now = new Date();
    const currentTime = now.toLocaleTimeString('en-US', { 
      hour: '2-digit', 
      minute: '2-digit',
      hour12: false 
    });
    return currentTime > dose.time && !dose.taken;
  };

  return (
    <div className={`medicine-card ${dose.taken ? 'taken' : ''} ${isPastDue() ? 'past-due' : ''}`}>
      <div className="medicine-icon-wrapper">
        {getMedicineIcon(dose.medicineIcon)}
      </div>
      
      <div className="medicine-details">
        <h3 className="medicine-name">{dose.medicineName}</h3>
        <span className="medicine-time">{formatTime(dose.time)}</span>
      </div>
      
      <div className="medicine-actions">
        {!dose.taken && (
          <button 
            className="action-btn check-btn" 
            onClick={() => onMarkTaken(dose.medicineId, dose.time)}
          >
            <Check size={16} />
          </button>
        )}
        <button 
          className="action-btn bell-btn" 
          onClick={() => onSetReminder(dose)}
        >
          <Bell size={16} />
        </button>
      </div>
    </div>
  );
};

export default MedicineCard;