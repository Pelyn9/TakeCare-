import { useState, useEffect } from 'react';
import Header from './components/Header';
import BottomNav from './components/BottomNav';
import FloatingActionButton from './components/FloatingActionButton';
import HomePage from './pages/HomePage';
import HistoryPage from './pages/HistoryPage';
import SettingsPage from './pages/SettingsPage';
import NotificationsPage from './pages/NotificationsPage';
import AddMedicineModal from './components/AddMedicineModal';
import AlarmModal from './components/AlarmModal';
import useMedicines from './hooks/useMedicines';
import alarmService from './services/alarmService';
import './App.css';

function App() {
  const [currentPage, setCurrentPage] = useState('home');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [activeAlarmDose, setActiveAlarmDose] = useState(null);
  const { todayDoses, addMedicine, markDoseTaken, medicines, refresh, stopAlarm } = useMedicines();

  const takenCount = todayDoses.filter(d => d.taken).length;
  const totalCount = todayDoses.length;

  // Request notification permission on mount
  useEffect(() => {
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }
    
    // Initialize audio context on first user interaction
    const initAudio = () => {
      alarmService.initAudio();
      document.removeEventListener('click', initAudio);
    };
    document.addEventListener('click', initAudio);
    
    return () => {
      document.removeEventListener('click', initAudio);
    };
  }, []);

  // Check for due doses every minute
  useEffect(() => {
    const checkDoses = () => {
      const now = new Date();
      const currentTime = now.toTimeString().slice(0, 5); // HH:MM format

      todayDoses.forEach(dose => {
        if (!dose.taken && dose.time === currentTime && !activeAlarmDose) {
          // Show the alarm modal
          setActiveAlarmDose(dose);
          alarmService.triggerAlarm();
          
          // Also show browser notification
          if ('Notification' in window && Notification.permission === 'granted') {
            new Notification(`Time for ${dose.medicineName}!`, {
              body: `It's time to take your medicine`,
              requireInteraction: false,
              tag: `dose-${dose.id}`
            });
          }
        }
      });
    };

    // Check immediately
    checkDoses();
    
    // Check every minute
    const interval = setInterval(checkDoses, 60000);
    
    return () => clearInterval(interval);
  }, [todayDoses, activeAlarmDose]);

  // Handle notification bell click
  const handleNotificationClick = () => {
    setCurrentPage('notifications');
  };

  // Stop alarm when user marks a dose as taken
  const handleMarkTaken = (medicineId, time) => {
    stopAlarm();
    setActiveAlarmDose(null);
    markDoseTaken(medicineId, time);
  };

  // Handle alarm modal take button
  const handleAlarmTake = () => {
    if (activeAlarmDose) {
      markDoseTaken(activeAlarmDose.medicineId, activeAlarmDose.time);
      setActiveAlarmDose(null);
    }
  };

  // Handle alarm modal dismiss
  const handleAlarmDismiss = () => {
    stopAlarm();
    setActiveAlarmDose(null);
  };

  const handleSaveMedicine = (medicineData) => {
    addMedicine(medicineData);
    setIsModalOpen(false);
  };

  const renderPage = () => {
    switch (currentPage) {
      case 'home':
        return <HomePage todayDoses={todayDoses} onMarkTaken={handleMarkTaken} />;
      case 'notifications':
        return <NotificationsPage onBack={() => setCurrentPage('home')} />;
      case 'history':
        return <HistoryPage />;
      case 'settings':
        return <SettingsPage medicines={medicines} onRefresh={refresh} />;
      default:
        return <HomePage todayDoses={todayDoses} onMarkTaken={handleMarkTaken} />;
    }
  };

  return (
    <div className="app-container">
      <div className="app-content">
        {currentPage === 'home' && (
          <Header 
            takenCount={takenCount} 
            totalCount={totalCount} 
            onNotificationClick={handleNotificationClick}
          />
        )}
        
        <div className={`page-content ${currentPage === 'home' ? 'has-header' : ''}`}>
          {renderPage()}
        </div>

        <BottomNav currentPage={currentPage} onNavigate={setCurrentPage} />

        {currentPage === 'home' && (
          <FloatingActionButton onClick={() => setIsModalOpen(true)} />
        )}

        <AddMedicineModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          onSave={handleSaveMedicine}
        />

        <AlarmModal
          dose={activeAlarmDose}
          onClose={handleAlarmDismiss}
          onTake={handleAlarmTake}
        />
      </div>
    </div>
  );
}

export default App;
