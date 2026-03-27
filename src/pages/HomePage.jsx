import { useEffect } from 'react';
import { Pill, FlaskConical, Syringe, Wind, Droplets, Check, Bell } from 'lucide-react';
import alarmService from '../services/alarmService';
import './HomePage.css';

const HomePage = ({ todayDoses, onMarkTaken }) => {
  // Check doses every minute
  useEffect(() => {
    const checkDoses = () => {
      alarmService.checkAndNotify(todayDoses, (dose) => {
        if ('Notification' in window && Notification.permission === 'granted') {
          new Notification(`Time for ${dose.medicineName}`, {
            body: `It's time to take your medicine at ${dose.time}`,
            requireInteraction: true
          });
        }
      });
    };

    checkDoses();
    const interval = setInterval(checkDoses, 60000);
    return () => clearInterval(interval);
  }, [todayDoses]);

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

  const formatTime = (time) => {
    const [hours, minutes] = time.split(':');
    const hour = parseInt(hours);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const hour12 = hour % 12 || 12;
    return `${hour12}:${minutes} ${ampm}`;
  };

  const isPastDue = (time) => {
    const now = new Date();
    const currentTime = now.toLocaleTimeString('en-US', { 
      hour: '2-digit', 
      minute: '2-digit',
      hour12: false 
    });
    return currentTime > time;
  };

  return (
    <div className="home-page">
      <div className="medicines-list">
        {todayDoses.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">
              <Pill size={40} />
            </div>
            <p>No medicines scheduled</p>
            <span>Tap + to add</span>
          </div>
        ) : (
          todayDoses.map(dose => (
            <div 
              key={dose.id} 
              className={`medicine-card ${dose.taken ? 'taken' : ''} ${isPastDue(dose.time) && !dose.taken ? 'past-due' : ''}`}
            >
              <div className="medicine-icon">
                {getMedicineIcon(dose.medicineIcon)}
              </div>
              
              <div className="medicine-details">
                <h3 className="medicine-name">{dose.medicineName}</h3>
                <div className="medicine-times">
                  <span className="time-badge">
                    <Bell size={12} />
                    {formatTime(dose.time)}
                  </span>
                </div>
              </div>
              
              <div className="medicine-actions">
                {!dose.taken && (
                  <button 
                    className="action-btn check-btn" 
                    onClick={() => onMarkTaken(dose.medicineId, dose.time)}
                  >
                    <Check size={18} />
                  </button>
                )}
                {dose.taken && (
                  <span className="taken-badge">Taken</span>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default HomePage;