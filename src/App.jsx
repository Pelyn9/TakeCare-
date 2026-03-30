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
import storageService from './services/storage';
import './App.css';

const APP_VERSION = '1.0.0';

function App() {
  const [currentPage, setCurrentPage] = useState('home');
  const [homeView, setHomeView] = useState('progress');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingMedicine, setEditingMedicine] = useState(null);
  const [activeAlarmDose, setActiveAlarmDose] = useState(null);
  const [isHandlingAlarm, setIsHandlingAlarm] = useState(false);
  const { todayDoses, addMedicine, updateMedicine, deleteMedicine, markDoseTaken, medicines, refresh, stopAlarm } = useMedicines();

  // Check for app version updates and clear data if needed
  useEffect(() => {
    const storedVersion = localStorage.getItem('takecare_app_version');
    if (storedVersion !== APP_VERSION) {
      // App has been updated, clear all data
      storageService.clearAll();
      localStorage.setItem('takecare_app_version', APP_VERSION);
      console.log('App updated to version', APP_VERSION, '- data cleared');
    }
  }, []);

  // Request notification permission on mount and initialize audio
  useEffect(() => {
    const unsubscribe = alarmService.subscribeToAlarmEvents({
      onReceive: async (dose) => {
        // Prevent duplicate alarm handling
        if (isHandlingAlarm || activeAlarmDose) {
          console.log('Already handling an alarm, skipping duplicate');
          return;
        }
        setIsHandlingAlarm(true);
        try {
          setActiveAlarmDose(dose);
          await alarmService.triggerAlarm(dose);
        } finally {
          setIsHandlingAlarm(false);
        }
      },
      onAction: async (dose) => {
        // Prevent duplicate alarm handling
        if (isHandlingAlarm || activeAlarmDose) {
          console.log('Already handling an alarm, skipping duplicate');
          return;
        }
        setIsHandlingAlarm(true);
        try {
          setCurrentPage('home');
          setHomeView('progress');
          setActiveAlarmDose(dose);
          await alarmService.triggerAlarm(dose);
        } finally {
          setIsHandlingAlarm(false);
        }
      },
    });

    const initializeApp = async () => {
      await alarmService.initializeNotifications();

      if ('Notification' in window && Notification.permission === 'default') {
        try {
          await Notification.requestPermission();
        } catch (error) {
          console.error('Error requesting browser notification permission:', error);
        }
      }

      const deliveredAlarms = await alarmService.getDeliveredAlarms();
      if (deliveredAlarms.length > 0) {
        const latestAlarm = deliveredAlarms[deliveredAlarms.length - 1];
        alarmService.registerTriggeredDose(latestAlarm);
        setCurrentPage('home');
        setHomeView('progress');
        setActiveAlarmDose(latestAlarm);
      }
    };

    initializeApp();
    
    // Initialize audio and mark user interaction on first interaction
    const initAudio = () => {
      alarmService.markUserInteracted();
      alarmService.initAudio();
      document.removeEventListener('click', initAudio);
      document.removeEventListener('touchstart', initAudio);
    };
    document.addEventListener('click', initAudio);
    document.addEventListener('touchstart', initAudio);
    
    return () => {
      document.removeEventListener('click', initAudio);
      document.removeEventListener('touchstart', initAudio);
      unsubscribe();
    };
  }, []);

  // Handle notification bell click
  const handleNotificationClick = () => {
    setCurrentPage('notifications');
  };

  // Stop alarm when user marks a dose as taken
  const handleMarkTaken = (medicineId, time) => {
    const markResult = markDoseTaken(medicineId, time);
    if (!markResult?.success) {
      // Provide user-friendly error messages based on failure reason
      switch (markResult?.reason) {
        case 'out_of_stock':
          alert(`No supply left for ${markResult.medicine?.name || 'this medicine'}. Update the supply before taking the next dose.`);
          break;
        case 'not_time_yet':
          alert(markResult.message || 'It is not time to take this dose yet.');
          break;
        case 'dose_not_found':
          alert('This dose could not be found. It may have already been taken.');
          break;
        default:
          // Silent fail for other reasons, but still return false
          console.warn('Failed to mark dose as taken:', markResult);
      }

      return false;
    }

    stopAlarm();
    setActiveAlarmDose(null);

    if (markResult.lowSupplyWarning) {
      const medicineName = markResult.medicine?.name || 'This medicine';
      alert(`${medicineName} only has 5 medicines left. Refill soon to avoid missing the next dose.`);
    }

    return true;
  };

  // Handle alarm modal take button
  const handleAlarmTake = () => {
    if (activeAlarmDose) {
      // Bypass time check when taking from alarm modal
      const markResult = markDoseTaken(activeAlarmDose.medicineId, activeAlarmDose.time, true);
      if (markResult?.success) {
        // Stop alarm and vibration immediately
        alarmService.stopAlarmAndVibration();
        // Clear the active alarm dose to close the modal
        setActiveAlarmDose(null);
        // Clear the triggered dose from alarm service
        alarmService.clearTriggeredDose(activeAlarmDose.id);
        if (markResult.lowSupplyWarning) {
          const medicineName = markResult.medicine?.name || 'This medicine';
          alert(`${medicineName} only has 5 medicines left. Refill soon to avoid missing the next dose.`);
        }
      }
    }
  };

  const handleSaveMedicine = (medicineData) => {
    if (editingMedicine) {
      updateMedicine(editingMedicine.id, medicineData);
      setEditingMedicine(null);
    } else {
      addMedicine(medicineData);
    }

    setCurrentPage('home');
    setHomeView('progress');
    setIsModalOpen(false);
  };

  const handleEditMedicine = (medicine) => {
    setEditingMedicine(medicine);
    setIsModalOpen(true);
  };

  const handleDeleteMedicine = (medicineId) => {
    deleteMedicine(medicineId);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingMedicine(null);
  };

  const renderPage = () => {
    switch (currentPage) {
      case 'home':
        return (
          <HomePage 
            todayDoses={todayDoses} 
            onMarkTaken={handleMarkTaken}
            onEditMedicine={handleEditMedicine}
            onDeleteMedicine={handleDeleteMedicine}
            medicines={medicines}
            activeView={homeView}
            onViewChange={setHomeView}
            activeAlarmDose={activeAlarmDose}
          />
        );
      case 'notifications':
        return <NotificationsPage onBack={() => setCurrentPage('home')} />;
      case 'history':
        return <HistoryPage medicines={medicines} onRefresh={refresh} />;
      case 'settings':
        return <SettingsPage medicines={medicines} onRefresh={refresh} />;
      default:
        return (
          <HomePage 
            todayDoses={todayDoses} 
            onMarkTaken={handleMarkTaken}
            onEditMedicine={handleEditMedicine}
            onDeleteMedicine={handleDeleteMedicine}
            medicines={medicines}
            activeView={homeView}
            onViewChange={setHomeView}
            activeAlarmDose={activeAlarmDose}
          />
        );
    }
  };

  return (
    <div className="app-container">
      <div className="app-content">
        {currentPage === 'home' && (
          <Header 
            onNotificationClick={handleNotificationClick}
            activeView={homeView}
            onViewChange={setHomeView}
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
          onClose={handleCloseModal}
          onSave={handleSaveMedicine}
          editMedicine={editingMedicine}
        />

        <AlarmModal
          dose={activeAlarmDose}
          onTake={handleAlarmTake}
        />
      </div>
    </div>
  );
}

export default App;
