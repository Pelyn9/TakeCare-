import { useEffect, useState, useMemo } from 'react';
import { Pill, FlaskConical, Syringe, Wind, Droplets, Check, Clock, AlertCircle, ChevronRight } from 'lucide-react';
import alarmService from '../services/alarmService';
import './HomePage.css';

const ICONS = {
  pill: <Pill size={24} />,
  syrup: <FlaskConical size={24} />,
  injection: <Syringe size={24} />,
  drops: <Droplets size={24} />,
  cream: <FlaskConical size={24} />,
  inhaler: <Wind size={24} />
};

const HomePage = ({ todayDoses, onMarkTaken }) => {
  const [currentTime, setCurrentTime] = useState(new Date());

  // Update current time every minute
  useEffect(() => {
    const interval = setInterval(() => setCurrentTime(new Date()), 60000);
    return () => clearInterval(interval);
  }, []);

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

  const formatTime = (time) => {
    const [hours, minutes] = time.split(':');
    const hour = parseInt(hours);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const hour12 = hour % 12 || 12;
    return `${hour12}:${minutes} ${ampm}`;
  };

  const getTimeRemaining = (time) => {
    const [hours, minutes] = time.split(':').map(Number);
    const doseTime = new Date();
    doseTime.setHours(hours, minutes, 0, 0);
    
    const diff = doseTime - currentTime;
    if (diff < 0) return 'Overdue';
    
    const mins = Math.floor(diff / 60000);
    const hrs = Math.floor(mins / 60);
    const remMins = mins % 60;
    
    if (hrs > 0) return `in ${hrs}h ${remMins}m`;
    return `in ${mins}m`;
  };

  const isPastDue = (time) => {
    const [hours, minutes] = time.split(':').map(Number);
    const doseTime = new Date();
    doseTime.setHours(hours, minutes, 0, 0);
    return currentTime > doseTime;
  };

  // Calculate daily progress
  const progress = useMemo(() => {
    const total = todayDoses.length;
    const taken = todayDoses.filter(d => d.taken).length;
    return { taken, total, percentage: total > 0 ? (taken / total) * 100 : 0 };
  }, [todayDoses]);

  // Find next upcoming dose
  const nextDose = useMemo(() => {
    const upcoming = todayDoses
      .filter(d => !d.taken && !isPastDue(d.time))
      .sort((a, b) => a.time.localeCompare(b.time));
    return upcoming[0] || null;
  }, [todayDoses, currentTime]);

  // Group doses by status
  const { upcomingDoses, takenDoses } = useMemo(() => {
    const upcoming = todayDoses.filter(d => !d.taken);
    const taken = todayDoses.filter(d => d.taken);
    return { upcomingDoses: upcoming, takenDoses: taken };
  }, [todayDoses]);

  return (
    <div className="home-page">
      {/* Daily Progress */}
      <div className="progress-section">
        <div className="progress-header">
          <span className="progress-title">Today's Progress</span>
          <span className="progress-count">{progress.taken}/{progress.total} doses</span>
        </div>
        <div className="progress-bar-container">
          <div 
            className="progress-bar-fill" 
            style={{ width: `${progress.percentage}%` }}
          />
        </div>
      </div>

      {/* Next Dose Highlight */}
      {nextDose && (
        <div className="next-dose-card">
          <div className="next-dose-label">
            <Clock size={16} />
            Next Dose
          </div>
          <div className="next-dose-content">
            <div className="next-dose-icon">
              {ICONS.pill}
            </div>
            <div className="next-dose-info">
              <span className="next-dose-name">{nextDose.medicineName}</span>
              <span className="next-dose-time">{formatTime(nextDose.time)} ({getTimeRemaining(nextDose.time)})</span>
            </div>
            <button 
              className="take-btn"
              onClick={() => onMarkTaken(nextDose.medicineId, nextDose.time)}
            >
              <Check size={20} />
              Take
            </button>
          </div>
        </div>
      )}

      {/* Today's Medicines Section */}
      <div className="section">
        <h2 className="section-title">Today's Medicines</h2>
        
        {todayDoses.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">
              <Pill size={40} />
            </div>
            <p>No medicines scheduled</p>
            <span>Tap + to add</span>
          </div>
        ) : (
          <div className="medicine-list">
            {/* Upcoming Doses */}
            {upcomingDoses.map(dose => (
              <div 
                key={dose.id} 
                className={`medicine-card ${isPastDue(dose.time) ? 'past-due' : ''}`}
              >
                <div className="medicine-icon">
                  {ICONS[dose.medicineIcon] || ICONS.pill}
                </div>
                
                <div className="medicine-info">
                  <span className="medicine-name">{dose.medicineName}</span>
                  <div className="medicine-meta">
                    <span className="time-text">
                      <Clock size={12} />
                      {formatTime(dose.time)}
                    </span>
                    {isPastDue(dose.time) && (
                      <span className="overdue-text">
                        <AlertCircle size={12} />
                        Overdue
                      </span>
                    )}
                  </div>
                </div>
                
                <button 
                  className="take-btn-small"
                  onClick={() => onMarkTaken(dose.medicineId, dose.time)}
                >
                  <Check size={18} />
                </button>
              </div>
            ))}

            {/* Taken Doses */}
            {takenDoses.length > 0 && (
              <>
                <div className="section-divider">
                  <span>Taken ({takenDoses.length})</span>
                </div>
                {takenDoses.map(dose => (
                  <div key={dose.id} className="medicine-card taken">
                    <div className="medicine-icon taken">
                      {ICONS[dose.medicineIcon] || ICONS.pill}
                    </div>
                    
                    <div className="medicine-info">
                      <span className="medicine-name">{dose.medicineName}</span>
                      <div className="medicine-meta">
                        <span className="time-text">
                          <Clock size={12} />
                          {formatTime(dose.time)}
                        </span>
                      </div>
                    </div>
                    
                    <div className="taken-check">
                      <Check size={18} />
                    </div>
                  </div>
                ))}
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default HomePage;
