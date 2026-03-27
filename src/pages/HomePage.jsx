import { useMemo } from 'react';
import { Check, Clock, Pill } from 'lucide-react';
import './HomePage.css';

const HomePage = ({ todayDoses, onMarkTaken }) => {
  const formatTime = (time) => {
    const [hours, minutes] = time.split(':');
    const hour = parseInt(hours);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const hour12 = hour % 12 || 12;
    return `${hour12}:${minutes} ${ampm}`;
  };

  const getTimeRemaining = (time) => {
    const now = new Date();
    const [hours, minutes] = time.split(':');
    const doseTime = new Date();
    doseTime.setHours(parseInt(hours), parseInt(minutes), 0, 0);
    
    if (doseTime < now) {
      return 'Overdue';
    }
    
    const diff = doseTime - now;
    const hoursDiff = Math.floor(diff / (1000 * 60 * 60));
    const minutesDiff = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    
    if (hoursDiff > 0) {
      return `in ${hoursDiff}h ${minutesDiff}m`;
    }
    return `in ${minutesDiff}m`;
  };

  // Separate upcoming and taken doses
  const { upcomingDoses, takenDoses } = useMemo(() => {
    const upcoming = [];
    const taken = [];
    
    todayDoses.forEach(dose => {
      if (dose.taken) {
        taken.push(dose);
      } else {
        upcoming.push(dose);
      }
    });
    
    return { upcomingDoses: upcoming, takenDoses: taken };
  }, [todayDoses]);

  // Get next upcoming dose
  const nextDose = upcomingDoses.length > 0 ? upcomingDoses[0] : null;

  const handleTake = (medicineId, time) => {
    onMarkTaken(medicineId, time);
  };

  if (todayDoses.length === 0) {
    return (
      <div className="home-page">
        <div className="empty-state">
          <div className="empty-icon">
            <Pill size={48} />
          </div>
          <h3>No medicines scheduled</h3>
          <p>Tap the + button to add your first medicine</p>
        </div>
      </div>
    );
  }

  return (
    <div className="home-page">
      {/* Next Dose Card */}
      {nextDose && (
        <div className="next-dose-card">
          <div className="next-dose-header">
            <span className="next-label">Next Dose</span>
            <span className="next-time">{formatTime(nextDose.time)}</span>
          </div>
          <div className="next-dose-info">
            <h3>{nextDose.medicineName}</h3>
            <p>{getTimeRemaining(nextDose.time)}</p>
          </div>
          <button 
            className="take-dose-btn"
            onClick={() => handleTake(nextDose.medicineId, nextDose.time)}
          >
            <Check size={18} />
            Take Now
          </button>
        </div>
      )}

      {/* Upcoming Section */}
      {upcomingDoses.length > 1 && (
        <div className="section">
          <h2 className="section-title">Upcoming</h2>
          <div className="dose-list">
            {upcomingDoses.slice(1).map(dose => (
              <div key={dose.id} className="dose-card upcoming">
                <div className="dose-time">
                  <Clock size={16} />
                  {formatTime(dose.time)}
                </div>
                <div className="dose-info">
                  <span className="dose-name">{dose.medicineName}</span>
                  <span className="dose-remaining">{getTimeRemaining(dose.time)}</span>
                </div>
                <button 
                  className="take-btn"
                  onClick={() => handleTake(dose.medicineId, dose.time)}
                >
                  Take
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Taken Section */}
      {takenDoses.length > 0 && (
        <div className="section">
          <h2 className="section-title">Taken Today</h2>
          <div className="dose-list">
            {takenDoses.map(dose => (
              <div key={dose.id} className="dose-card taken">
                <div className="dose-time">
                  <Clock size={16} />
                  {formatTime(dose.time)}
                </div>
                <div className="dose-info">
                  <span className="dose-name">{dose.medicineName}</span>
                </div>
                <div className="taken-badge">
                  <Check size={14} />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* All Done Message */}
      {takenDoses.length === todayDoses.length && todayDoses.length > 0 && (
        <div className="all-done">
          <div className="all-done-icon">🎉</div>
          <h3>All done for today!</h3>
          <p>Great job keeping up with your medications</p>
        </div>
      )}
    </div>
  );
};

export default HomePage;
