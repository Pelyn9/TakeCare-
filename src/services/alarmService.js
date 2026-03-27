// Alarm Service - handles sound and vibration for medicine reminders
// Enhanced for mobile/offline APK support

class AlarmService {
  constructor() {
    this.audioContext = null;
    this.alarmTimeouts = new Map();
    this.isPlaying = false;
    this.alarmInterval = null;
  }

  // Initialize audio context on user interaction
  initAudio() {
    if (!this.audioContext) {
      this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
    }
    if (this.audioContext.state === 'suspended') {
      this.audioContext.resume();
    }
    return this.audioContext;
  }

  // Play alarm sound using Web Audio API
  playAlarm() {
    try {
      const ctx = this.initAudio();
      
      // Create multiple oscillators for a more noticeable alarm
      const createBeep = (startTime, frequency) => {
        const oscillator = ctx.createOscillator();
        const gainNode = ctx.createGain();
        
        oscillator.connect(gainNode);
        gainNode.connect(ctx.destination);
        
        oscillator.type = 'sine';
        oscillator.frequency.setValueAtTime(frequency, startTime);
        
        // Volume envelope for beep
        gainNode.gain.setValueAtTime(0, startTime);
        gainNode.gain.linearRampToValueAtTime(0.5, startTime + 0.05);
        gainNode.gain.setValueAtTime(0.5, startTime + 0.15);
        gainNode.gain.linearRampToValueAtTime(0, startTime + 0.2);
        
        oscillator.start(startTime);
        oscillator.stop(startTime + 0.25);
      };

      // Alarm pattern - repeating beeps
      const now = ctx.currentTime;
      for (let i = 0; i < 4; i++) {
        createBeep(now + i * 0.3, 880); // High beep
        createBeep(now + i * 0.3 + 0.15, 660); // Low beep
      }

      return true;
    } catch (error) {
      console.error('Error playing alarm:', error);
      return false;
    }
  }

  // Play continuous alarm until stopped
  playContinuousAlarm() {
    if (this.isPlaying) return;
    
    this.isPlaying = true;
    this.playAlarm();
    
    // Play alarm every 2 seconds
    this.alarmInterval = setInterval(() => {
      this.playAlarm();
    }, 2000);
  }

  // Stop the continuous alarm
  stopAlarm() {
    if (this.alarmInterval) {
      clearInterval(this.alarmInterval);
      this.alarmInterval = null;
    }
    this.isPlaying = false;
  }

  // Vibrate device with pattern
  vibrate(pattern = [500, 200, 500, 200, 500]) {
    if ('vibrate' in navigator) {
      try {
        navigator.vibrate(pattern);
        return true;
      } catch (error) {
        console.error('Error vibrating:', error);
        return false;
      }
    }
    return false;
  }

  // Vibrate continuously until stopped
  vibrateContinuously() {
    if ('vibrate' in navigator) {
      try {
        navigator.vibrate([200, 100, 200, 100, 200]);
        return true;
      } catch (error) {
        return false;
      }
    }
    return false;
  }

  // Stop vibration
  stopVibration() {
    if ('vibrate' in navigator) {
      navigator.vibrate(0);
    }
  }

  // Trigger full alarm (sound + vibration)
  triggerAlarm() {
    this.playContinuousAlarm();
    this.vibrateContinuously();
  }

  // Stop the alarm
  stopAlarmAndVibration() {
    this.stopAlarm();
    this.stopVibration();
  }

  // Show browser notification
  showNotification(title, options = {}) {
    if ('Notification' in window && Notification.permission === 'granted') {
      try {
        const notification = new Notification(title, {
          icon: '/TakeCare+.png',
          badge: '/TakeCare+.png',
          tag: 'medicine-reminder',
          requireInteraction: true,
          vibrate: [200, 100, 200],
          ...options
        });
        
        // Play sound when notification is shown
        notification.onshow = () => {
          this.playAlarm();
        };
        
        // Handle notification click - bring app to foreground
        notification.onclick = () => {
          // Stop alarm when notification is clicked
          this.stopAlarmAndVibration();
          
          // Focus the app window
          if (window.focus) {
            window.focus();
          }
          
          // Close the notification
          notification.close();
          
          // If there's a callback, execute it
          if (options.onClick) {
            options.onClick();
          }
        };
        
        // Auto close after 30 seconds
        setTimeout(() => notification.close(), 30000);
        
        return notification;
      } catch (error) {
        console.error('Error showing notification:', error);
      }
    }
    return null;
  }

  // Schedule an alarm for a specific time
  scheduleAlarm(medicineName, time, onAlarm) {
    const now = new Date();
    const [hours, minutes] = time.split(':');
    const alarmTime = new Date();
    alarmTime.setHours(parseInt(hours), parseInt(minutes), 0, 0);

    // If time has passed today, schedule for tomorrow
    if (alarmTime <= now) {
      alarmTime.setDate(alarmTime.getDate() + 1);
    }

    const delay = alarmTime.getTime() - now.getTime();
    
    // Store alarm info for reference
    const alarmInfo = {
      medicineName,
      time,
      scheduledFor: alarmTime.toISOString()
    };

    const timeoutId = setTimeout(() => {
      // Trigger the alarm callback
      if (onAlarm) onAlarm(medicineName, time);
      
      // Show notification
      this.showNotification(`Time for ${medicineName}!`, {
        body: `It's time to take your medicine`,
        tag: `dose-${medicineName}-${time}`
      });
      
      // Play alarm and vibrate
      this.triggerAlarm();
    }, delay);

    // Store timeout ID
    const id = `${medicineName}-${time}`;
    this.alarmTimeouts.set(id, { timeoutId, ...alarmInfo });

    return { id, ...alarmInfo, delay };
  }

  // Cancel a scheduled alarm
  cancelAlarm(medicineName, time) {
    const id = `${medicineName}-${time}`;
    const alarmData = this.alarmTimeouts.get(id);
    if (alarmData) {
      clearTimeout(alarmData.timeoutId);
      this.alarmTimeouts.delete(id);
      return true;
    }
    return false;
  }

  // Cancel all alarms
  cancelAllAlarms() {
    this.stopAlarmAndVibration();
    this.alarmTimeouts.forEach(alarmData => {
      clearTimeout(alarmData.timeoutId);
    });
    this.alarmTimeouts.clear();
  }

  // Check if it's time for a dose and trigger alarm
  checkAndNotify(doses, onAlarm) {
    const now = new Date();
    const currentTime = now.toTimeString().slice(0, 5); // HH:MM format

    doses.forEach(dose => {
      if (!dose.taken && dose.time === currentTime) {
        // Show notification
        this.showNotification(`Time for ${dose.medicineName}!`, {
          body: `It's time to take your medicine at ${dose.time}`
        });
        
        // Play alarm and vibrate
        this.triggerAlarm();
        
        if (onAlarm) onAlarm(dose);
      }
    });
  }

  // Get all scheduled alarms
  getScheduledAlarms() {
    return Array.from(this.alarmTimeouts.entries()).map(([id, data]) => ({
      id,
      ...data
    }));
  }
}

// Export singleton instance
const alarmService = new AlarmService();
export default alarmService;
