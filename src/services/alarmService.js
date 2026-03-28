import { Capacitor } from '@capacitor/core';
import { LocalNotifications } from '@capacitor/local-notifications';
import { Haptics, ImpactStyle } from '@capacitor/haptics';

const ALARM_CHANNEL_ID = 'medicine-alarms';

class AlarmService {
  constructor() {
    this.audioContext = null;
    this.scheduledNotifications = new Map();
    this.triggeredDoseIds = new Set();
    this.isPlaying = false;
    this.alarmInterval = null;
    this.activeAlarmDose = null;
    this.hasUserInteracted = false;
    this.isInitialized = false;
    this.alarmReceiveSubscribers = new Set();
    this.alarmActionSubscribers = new Set();
  }

  isAndroid() {
    return Capacitor.getPlatform() === 'android';
  }

  isNativePlatform() {
    return Capacitor.isNativePlatform();
  }

  isWebPlatform() {
    return typeof window !== 'undefined' && !this.isNativePlatform();
  }

  hasBrowserActivation() {
    if (!this.isWebPlatform()) {
      return true;
    }

    const hasUserActivation = typeof navigator !== 'undefined'
      && Boolean(navigator.userActivation?.hasBeenActive);

    return this.hasUserInteracted || hasUserActivation;
  }

  initAudio() {
    if (typeof window === 'undefined') {
      return null;
    }

    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextClass) {
      return null;
    }

    if (this.isWebPlatform() && !this.hasBrowserActivation()) {
      return null;
    }

    if (!this.audioContext) {
      this.audioContext = new AudioContextClass();
    }

    if (this.audioContext.state === 'suspended') {
      if (this.isWebPlatform() && !this.hasBrowserActivation()) {
        return null;
      }

      this.audioContext.resume().catch(() => null);
    }

    return this.audioContext;
  }

  markUserInteracted() {
    this.hasUserInteracted = true;

    if (this.audioContext?.state === 'suspended') {
      this.audioContext.resume().catch(() => null);
    }
  }

  subscribeToAlarmEvents({ onReceive, onAction } = {}) {
    if (typeof onReceive === 'function') {
      this.alarmReceiveSubscribers.add(onReceive);
    }

    if (typeof onAction === 'function') {
      this.alarmActionSubscribers.add(onAction);
    }

    return () => {
      if (typeof onReceive === 'function') {
        this.alarmReceiveSubscribers.delete(onReceive);
      }

      if (typeof onAction === 'function') {
        this.alarmActionSubscribers.delete(onAction);
      }
    };
  }

  notifyAlarmReceived(dose) {
    if (dose?.id) {
      this.triggeredDoseIds.add(dose.id);
    }

    this.alarmReceiveSubscribers.forEach((subscriber) => {
      subscriber(dose);
    });
  }

  notifyAlarmAction(dose, actionId) {
    if (dose?.id) {
      this.triggeredDoseIds.add(dose.id);
    }

    this.alarmActionSubscribers.forEach((subscriber) => {
      subscriber(dose, actionId);
    });
  }

  normalizeNotificationPayload(notification) {
    const extra = notification?.extra || {};

    return {
      id: extra.doseId || `${extra.medicineId || 'medicine'}-${extra.occurrenceDate || 'today'}-${extra.time || '00:00'}`,
      occurrenceDate: extra.occurrenceDate,
      medicineId: extra.medicineId,
      medicineName: extra.medicineName || notification?.title?.replace(/^Medicine Reminder:\s*/, '') || 'Medicine',
      time: extra.time,
    };
  }

  async ensureAlarmChannel() {
    if (!this.isAndroid()) {
      return;
    }

    await LocalNotifications.createChannel({
      id: ALARM_CHANNEL_ID,
      name: 'Medicine Alarms',
      description: 'Exact reminder alarms for medicines',
      importance: 5,
      visibility: 1,
      vibration: true,
      sound: 'alarm.wav',
    });
  }

  async initializeNotifications() {
    if (this.isInitialized) {
      return true;
    }

    try {
      const permissionStatus = await LocalNotifications.checkPermissions();

      if (permissionStatus.display !== 'granted') {
        const result = await LocalNotifications.requestPermissions();
        if (result.display !== 'granted') {
          return false;
        }
      }

      try {
        await this.ensureAlarmChannel();
      } catch (error) {
        console.error('Error creating alarm notification channel:', error);
      }

      LocalNotifications.addListener('localNotificationReceived', (notification) => {
        const dose = this.normalizeNotificationPayload(notification);
        this.notifyAlarmReceived(dose);
      });

      LocalNotifications.addListener('localNotificationActionPerformed', (notificationAction) => {
        const dose = this.normalizeNotificationPayload(notificationAction.notification);
        this.notifyAlarmAction(dose, notificationAction.actionId);
      });

      this.isInitialized = true;
      return true;
    } catch (error) {
      console.error('Error initializing notifications:', error);
      return false;
    }
  }

  async checkPermissionStatus() {
    try {
      const status = await LocalNotifications.checkPermissions();
      return status.display;
    } catch (error) {
      console.error('Error checking notification permission status:', error);
      return 'denied';
    }
  }

  async requestPermission() {
    try {
      const result = await LocalNotifications.requestPermissions();
      return result.display === 'granted';
    } catch (error) {
      console.error('Error requesting notification permission:', error);
      return false;
    }
  }

  async checkExactAlarmStatus() {
    if (!this.isAndroid() || typeof LocalNotifications.checkExactNotificationSetting !== 'function') {
      return 'granted';
    }

    try {
      const status = await LocalNotifications.checkExactNotificationSetting();
      return status.exact_alarm || 'denied';
    } catch (error) {
      console.error('Error checking exact alarm status:', error);
      return 'unknown';
    }
  }

  async openExactAlarmSettings() {
    if (!this.isAndroid() || typeof LocalNotifications.changeExactNotificationSetting !== 'function') {
      return 'unsupported';
    }

    try {
      const status = await LocalNotifications.changeExactNotificationSetting();
      return status.exact_alarm || 'unknown';
    } catch (error) {
      console.error('Error opening exact alarm settings:', error);
      return 'unknown';
    }
  }

  playAlarm() {
    try {
      const ctx = this.initAudio();
      if (!ctx) {
        return false;
      }

      const createBeep = (startTime, frequency) => {
        const oscillator = ctx.createOscillator();
        const gainNode = ctx.createGain();

        oscillator.connect(gainNode);
        gainNode.connect(ctx.destination);

        oscillator.type = 'sine';
        oscillator.frequency.setValueAtTime(frequency, startTime);

        gainNode.gain.setValueAtTime(0, startTime);
        gainNode.gain.linearRampToValueAtTime(0.5, startTime + 0.05);
        gainNode.gain.setValueAtTime(0.5, startTime + 0.15);
        gainNode.gain.linearRampToValueAtTime(0, startTime + 0.2);

        oscillator.start(startTime);
        oscillator.stop(startTime + 0.25);
      };

      const now = ctx.currentTime;
      for (let index = 0; index < 4; index += 1) {
        createBeep(now + (index * 0.3), 880);
        createBeep(now + (index * 0.3) + 0.15, 660);
      }

      return true;
    } catch {
      console.error('Error playing alarm');
      return false;
    }
  }

  playContinuousAlarm() {
    if (this.isPlaying) {
      return;
    }

    this.isPlaying = true;
    this.playAlarm();

    this.alarmInterval = setInterval(() => {
      if (this.isPlaying) {
        this.playAlarm();
      }
    }, 2000);
  }

  stopAlarm() {
    this.isPlaying = false;
    if (this.alarmInterval) {
      clearInterval(this.alarmInterval);
      this.alarmInterval = null;
    }
  }

  async vibrate(pattern = [500, 200, 500, 200, 500]) {
    if (!this.hasBrowserActivation()) {
      return false;
    }

    try {
      await Haptics.impact({ style: ImpactStyle.Heavy });
      return true;
    } catch {
      if ('vibrate' in navigator) {
        navigator.vibrate(pattern);
        return true;
      }

      return false;
    }
  }

  async vibrateContinuously() {
    if (!this.hasBrowserActivation()) {
      return false;
    }

    try {
      await Haptics.impact({ style: ImpactStyle.Heavy });
      return true;
    } catch {
      if ('vibrate' in navigator) {
        navigator.vibrate([200, 100, 200, 100, 200]);
        return true;
      }

      return false;
    }
  }

  stopVibration() {
    if (!this.hasBrowserActivation()) {
      return;
    }

    try {
      if ('vibrate' in navigator) {
        navigator.vibrate(0);
      }
    } catch {
      // Ignore stop vibration errors.
    }
  }

  async triggerAlarm(dose) {
    this.activeAlarmDose = dose;
    if (dose?.id) {
      this.triggeredDoseIds.add(dose.id);
    }
    this.playContinuousAlarm();
    await this.vibrateContinuously();
  }

  stopAlarmAndVibration() {
    this.stopAlarm();
    this.stopVibration();
    this.activeAlarmDose = null;
  }

  isAlarmPlaying() {
    return this.isPlaying;
  }

  getActiveAlarmDose() {
    return this.activeAlarmDose;
  }

  hasTriggeredDose(occurrenceId) {
    return this.triggeredDoseIds.has(occurrenceId);
  }

  clearTriggeredDose(occurrenceId) {
    if (occurrenceId) {
      this.triggeredDoseIds.delete(occurrenceId);
    }
  }

  getNotificationId(occurrenceId) {
    return this.hashCode(occurrenceId);
  }

  async scheduleAlarm(occurrence) {
    const initSuccess = await this.initializeNotifications();
    if (!initSuccess) {
      return null;
    }

    const notificationId = this.getNotificationId(occurrence.id);

    try {
      await LocalNotifications.schedule({
        notifications: [
          {
            id: notificationId,
            title: `Medicine Reminder: ${occurrence.medicineName}`,
            body: `Time to take ${occurrence.medicineName} at ${occurrence.time}.`,
            smallIcon: 'ic_notification',
            iconColor: '#4CAF50',
            sound: 'alarm.wav',
            channelId: ALARM_CHANNEL_ID,
            ongoing: true,
            autoCancel: false,
            schedule: {
              at: occurrence.scheduledAt,
              allowWhileIdle: true,
            },
            extra: {
              doseId: occurrence.id,
              occurrenceDate: occurrence.occurrenceDate,
              medicineId: occurrence.medicineId,
              medicineName: occurrence.medicineName,
              time: occurrence.time,
            },
          },
        ],
      });

      const alarmInfo = {
        ...occurrence,
        notificationId,
        scheduledFor: occurrence.scheduledAt.toISOString(),
      };

      this.scheduledNotifications.set(occurrence.id, alarmInfo);
      return alarmInfo;
    } catch (error) {
      console.error('Error scheduling notification:', error);
      return null;
    }
  }

  hashCode(value) {
    let hash = 0;

    for (let index = 0; index < value.length; index += 1) {
      const char = value.charCodeAt(index);
      hash = ((hash << 5) - hash) + char;
      hash &= hash;
    }

    return Math.max(1, Math.abs(hash));
  }

  async clearDeliveredAlarm(occurrenceId) {
    try {
      const delivered = await LocalNotifications.getDeliveredNotifications();
      const notificationId = this.getNotificationId(occurrenceId);
      const notifications = delivered.notifications
        .filter((notification) => notification.id === notificationId)
        .map((notification) => ({
          id: notification.id,
          tag: notification.tag,
        }));

      if (notifications.length > 0) {
        await LocalNotifications.removeDeliveredNotifications({ notifications });
      }
    } catch (error) {
      console.error('Error clearing delivered notification:', error);
    }
  }

  async cancelAlarm(occurrenceId) {
    const notificationId = this.getNotificationId(occurrenceId);

    try {
      await LocalNotifications.cancel({
        notifications: [{ id: notificationId }],
      });
      await this.clearDeliveredAlarm(occurrenceId);
      this.scheduledNotifications.delete(occurrenceId);
      this.clearTriggeredDose(occurrenceId);
      return true;
    } catch (error) {
      console.error('Error canceling notification:', error);
      return false;
    }
  }

  async cancelAllAlarms() {
    this.stopAlarm();
    this.stopVibration();
    this.triggeredDoseIds.clear();

    try {
      const pending = await LocalNotifications.getPending();
      if (pending.notifications.length > 0) {
        await LocalNotifications.cancel({
          notifications: pending.notifications.map((notification) => ({ id: notification.id })),
        });
      }
    } catch (error) {
      console.error('Error canceling all notifications:', error);
    }

    this.scheduledNotifications.clear();
  }

  getScheduledAlarms() {
    return Array.from(this.scheduledNotifications.values());
  }

  async getPendingNotifications() {
    try {
      const result = await LocalNotifications.getPending();
      return result.notifications;
    } catch (error) {
      console.error('Error getting pending notifications:', error);
      return [];
    }
  }
}

const alarmService = new AlarmService();
export default alarmService;
