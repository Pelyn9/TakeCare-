// Alarm Service - handles sound and vibration for medicine reminders
// Enhanced for mobile/offline APK support

class AlarmService {
  constructor() {
    this.audioContext = null;
    this.alarmTimeouts = new Map();
    this.isPlaying = false;
    this.alarmInterval = null;
    this.activeAlarmDose = null;
    this.hasUserInteracted = false;
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

  // Mark that user has interacted with the app
  markUserInteracted() {
    this.hasUserInteracted = true;
  }

  // Play alarm sound using Web Audio API
  playAlarm() {
    try {
      const ctx = this.initAudio();
      
      // Create beep sound
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
        createBeep(now + i * 0.3, 880);
        createBeep(now + i * 0.3 + 0.15, 660);
      }

      return true;
    } catch {
      console.error('Error playing alarm');
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
      if (this.isPlaying) {
        this.playAlarm();
      }
    }, 2000);
  }

  // Stop the continuous alarm
  stopAlarm() {
    this.isPlaying = false;
    if (this.alarmInterval) {
      clearInterval(this.alarmInterval);
      this.alarmInterval = null;
    }
  }

  // Vibrate device with pattern
  vibrate(pattern = [500, 200, 500, 200, 500]) {
    if ('vibrate' in navigator && this.hasUserInteracted) {
      try {
        navigator.vibrate(pattern);
        return true;
      } catch {
        return false;
      }
    }
    return false;
  }

  // Vibrate continuously until stopped
  vibrateContinuously() {
    if ('vibrate' in navigator && this.hasUserInteracted) {
      try {
        navigator.vibrate([200, 100, 200, 100, 200]);
        return true;
      } catch {
        return false;
      }
    }
    return false;
  }

  // Stop vibration
  stopVibration() {
    if ('vibrate' in navigator && this.hasUserInteracted) {
      try {
        navigator.vibrate(0);
      } catch {
        // Ignore errors when stopping vibration
      }
    }
  }

  // Trigger full alarm (sound + vibration)
  triggerAlarm(dose) {
    this.activeAlarmDose = dose;
    this.playContinuousAlarm();
    this.vibrateContinuously();
  }

  // Stop the alarm completely
  stopAlarmAndVibration() {
    this.stopAlarm();
    this.stopVibration();
    this.activeAlarmDose = null;
  }

  // Check if alarm is currently playing
  isAlarmPlaying() {
    return this.isPlaying;
  }

  // Get current active alarm dose
  getActiveAlarmDose() {
    return this.activeAlarmDose;
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
        
        notification.onshow = () => {
          if (this.isPlaying) {
            this.playAlarm();
          }
        };
        
        notification.onclick = () => {
          this.stopAlarmAndVibration();
          if (window.focus) window.focus();
          notification.close();
          if (options.onClick) options.onClick();
        };
        
        setTimeout(() => notification.close(), 30000);
        
        return notification;
      } catch {
        console.error('Error showing notification');
      }
    }
    return null;
  }

  // Schedule an alarm for a specific time
  scheduleAlarm(medicineName, time, doseId, onAlarm) {
    const now = new Date();
    const [hours, minutes] = time.split(':');
    const alarmTime = new Date();
    alarmTime.setHours(parseInt(hours), parseInt(minutes), 0, 0);

    // If time has passed today, schedule for tomorrow
    if (alarmTime <= now) {
      alarmTime.setDate(alarmTime.getDate() + 1);
    }

    const delay = alarmTime.getTime() - now.getTime();
    
    const alarmInfo = {
      medicineName,
      time,
      doseId,
      scheduledFor: alarmTime.toISOString()
    };

    const timeoutId = setTimeout(() => {
      if (onAlarm) onAlarm(medicineName, time, doseId);
    }, delay);

    const id = `${medicineName}-${time}-${doseId}`;
    this.alarmTimeouts.set(id, { timeoutId, ...alarmInfo });

    return { id, ...alarmInfo, delay };
  }

  // Cancel a scheduled alarm
  cancelAlarm(medicineName, time, doseId) {
    const id = `${medicineName}-${time}-${doseId}`;
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
    this.stopAlarm();
    this.stopVibration();
    this.alarmTimeouts.forEach(alarmData => {
      clearTimeout(alarmData.timeoutId);
    });
    this.alarmTimeouts.clear();
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
