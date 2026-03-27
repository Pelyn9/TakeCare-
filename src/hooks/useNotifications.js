import { useState, useEffect, useCallback } from 'react';

export const useNotifications = () => {
  const [permission, setPermission] = useState('default');
  const [supported, setSupported] = useState(false);

  useEffect(() => {
    // Check if notifications are supported
    if ('Notification' in window) {
      setSupported(true);
      setPermission(Notification.permission);
    }
  }, []);

  // Request notification permission
  const requestPermission = useCallback(async () => {
    if (!supported) {
      console.warn('Notifications not supported');
      return false;
    }

    try {
      const result = await Notification.requestPermission();
      setPermission(result);
      return result === 'granted';
    } catch (error) {
      console.error('Error requesting notification permission:', error);
      return false;
    }
  }, [supported]);

  // Send notification
  const sendNotification = useCallback((title, options = {}) => {
    if (!supported || permission !== 'granted') {
      console.warn('Notifications not allowed');
      return null;
    }

    try {
      const notification = new Notification(title, {
        icon: '/icons.svg',
        badge: '/icons.svg',
        tag: 'takecare-reminder',
        ...options
      });
      return notification;
    } catch (error) {
      console.error('Error sending notification:', error);
      return null;
    }
  }, [supported, permission]);

  // Schedule a reminder notification
  const scheduleReminder = useCallback((medicineName, time, delay = 0) => {
    if (!supported || permission !== 'granted') return null;

    const timeoutId = setTimeout(() => {
      sendNotification(`Time for ${medicineName}`, {
        body: `It's time to take your medicine at ${time}`,
        requireInteraction: true
      });
    }, delay);

    return timeoutId;
  }, [supported, permission, sendNotification]);

  // Check and notify for upcoming doses
  const checkUpcomingDoses = useCallback((doses) => {
    if (!supported || permission !== 'granted') return;

    const now = new Date();
    const currentTime = now.getTime();

    doses.forEach(dose => {
      if (dose.taken) return;

      const [hours, minutes] = dose.time.split(':');
      const doseTime = new Date();
      doseTime.setHours(parseInt(hours), parseInt(minutes), 0, 0);

      const timeDiff = doseTime.getTime() - currentTime;

      // Notify 5 minutes before
      if (timeDiff > 0 && timeDiff <= 5 * 60 * 1000) {
        sendNotification(`Upcoming: ${dose.medicineName}`, {
          body: `Reminder in 5 minutes at ${dose.time}`
        });
      }
    });
  }, [supported, permission, sendNotification]);

  return {
    supported,
    permission,
    requestPermission,
    sendNotification,
    scheduleReminder,
    checkUpcomingDoses
  };
};

export default useNotifications;