// Alarm Service - handles sound and vibration for medicine reminders
class AlarmService {
  constructor() {
    this.audioContext = null;
    this.alarmTimeouts = new Map();
  }

  // Initialize audio context on user interaction
  initAudio() {
    if (!this.audioContext) {
      this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
    }
    return this.audioContext;
  }

  // Play alarm sound using Web Audio API
  playAlarm() {
    try {
      const ctx = this.initAudio();
      if (ctx.state === 'suspended') {
        ctx.resume();
      }

      // Create oscillator for alarm sound
      const oscillator = ctx.createOscillator();
      const gainNode = ctx.createGain();

      oscillator.connect(gainNode);
      gainNode.connect(ctx.destination);

      // Alarm pattern - repeating beep
      oscillator.type = 'square';
      oscillator.frequency.setValueAtTime(880, ctx.currentTime); // A5
      oscillator.frequency.setValueAtTime(660, ctx.currentTime + 0.3); // E5
      
      // Volume envelope
      gainNode.gain.setValueAtTime(0.3, ctx.currentTime);
      gainNode.gain.setValueAtTime(0.3, ctx.currentTime + 0.25);
      gainNode.gain.setValueAtTime(0, ctx.currentTime + 0.3);
      gainNode.gain.setValueAtTime(0.3, ctx.currentTime + 0.5);
      gainNode.gain.setValueAtTime(0, ctx.currentTime + 0.55);
      gainNode.gain.setValueAtTime(0.3, ctx.currentTime + 0.75);
      gainNode.gain.setValueAtTime(0, ctx.currentTime + 0.8);

      oscillator.start(ctx.currentTime);
      oscillator.stop(ctx.currentTime + 1);

      return true;
    } catch (error) {
      console.error('Error playing alarm:', error);
      return false;
    }
  }

  // Vibrate device
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

  // Trigger full alarm (sound + vibration)
  triggerAlarm() {
    this.playAlarm();
    this.vibrate();
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
    const timeoutId = setTimeout(() => {
      this.triggerAlarm();
      if (onAlarm) onAlarm(medicineName);
    }, delay);

    // Store timeout ID
    const id = `${medicineName}-${time}`;
    this.alarmTimeouts.set(id, timeoutId);

    return timeoutId;
  }

  // Cancel a scheduled alarm
  cancelAlarm(medicineName, time) {
    const id = `${medicineName}-${time}`;
    const timeoutId = this.alarmTimeouts.get(id);
    if (timeoutId) {
      clearTimeout(timeoutId);
      this.alarmTimeouts.delete(id);
    }
  }

  // Cancel all alarms
  cancelAllAlarms() {
    this.alarmTimeouts.forEach(timeoutId => clearTimeout(timeoutId));
    this.alarmTimeouts.clear();
  }

  // Check if it's time for a dose and trigger alarm
  checkAndNotify(doses, onAlarm) {
    const now = new Date();
    const currentTime = now.toTimeString().slice(0, 5); // HH:MM format

    doses.forEach(dose => {
      if (!dose.taken && dose.time === currentTime) {
        this.triggerAlarm();
        if (onAlarm) onAlarm(dose);
      }
    });
  }
}

// Export singleton instance
const alarmService = new AlarmService();
export default alarmService;