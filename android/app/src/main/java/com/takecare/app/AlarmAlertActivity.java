package com.takecare.app;

import android.app.NotificationManager;
import android.content.Context;
import android.content.Intent;
import android.media.AudioAttributes;
import android.media.MediaPlayer;
import android.os.Build;
import android.os.Bundle;
import android.os.Handler;
import android.os.Looper;
import android.os.VibrationEffect;
import android.os.Vibrator;
import android.os.VibratorManager;
import android.service.notification.StatusBarNotification;
import android.view.WindowManager;
import android.widget.Button;
import android.widget.TextView;
import androidx.appcompat.app.AppCompatActivity;
import java.io.IOException;

public class AlarmAlertActivity extends AppCompatActivity {

    private static final String EXTRA_NOTIFICATION_ID = "LocalNotificationId";
    private static final String EXTRA_ALARM_TITLE = "alarm_title";
    private static final String EXTRA_ALARM_BODY = "alarm_body";
    private static final String EXTRA_MEDICINE_NAME = "alarm_medicine_name";
    private static final String EXTRA_TIME = "alarm_time";

    private static final long[] VIBRATION_PATTERN = new long[] { 0, 700, 300, 700, 300, 900 };

    private MediaPlayer mediaPlayer;
    private Vibrator vibrator;
    private int notificationId = Integer.MIN_VALUE;
    private final Handler notificationMonitorHandler = new Handler(Looper.getMainLooper());
    private final Runnable notificationMonitor = new Runnable() {
        @Override
        public void run() {
            if (isNotificationStillActive()) {
                notificationMonitorHandler.postDelayed(this, 1000);
                return;
            }

            stopAlarmFeedback();
            finish();
        }
    };

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        configureWindow();
        setContentView(R.layout.activity_alarm_alert);
        bindAlarmDetails(getIntent());
        startAlarmFeedback();
        startNotificationMonitor();
        setupButtons();
    }

    @Override
    protected void onNewIntent(Intent intent) {
        super.onNewIntent(intent);
        setIntent(intent);
        stopAlarmFeedback();
        bindAlarmDetails(intent);
        startAlarmFeedback();
        startNotificationMonitor();
    }

    @Override
    protected void onDestroy() {
        stopNotificationMonitor();
        stopAlarmFeedback();
        super.onDestroy();
    }

    private void configureWindow() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O_MR1) {
            setShowWhenLocked(true);
            setTurnScreenOn(true);
        }

        getWindow().addFlags(
            WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON |
            WindowManager.LayoutParams.FLAG_ALLOW_LOCK_WHILE_SCREEN_ON |
            WindowManager.LayoutParams.FLAG_SHOW_WHEN_LOCKED |
            WindowManager.LayoutParams.FLAG_TURN_SCREEN_ON
        );
    }

    private void bindAlarmDetails(Intent intent) {
        notificationId = intent.getIntExtra(EXTRA_NOTIFICATION_ID, Integer.MIN_VALUE);

        String title = intent.getStringExtra(EXTRA_ALARM_TITLE);
        String body = intent.getStringExtra(EXTRA_ALARM_BODY);
        String medicineName = intent.getStringExtra(EXTRA_MEDICINE_NAME);
        String time = intent.getStringExtra(EXTRA_TIME);

        TextView medicineNameView = findViewById(R.id.alarmMedicineName);
        TextView timeView = findViewById(R.id.alarmTime);
        TextView bodyView = findViewById(R.id.alarmBody);

        if (medicineName == null || medicineName.trim().isEmpty()) {
            medicineName = title != null && !title.trim().isEmpty() ? title : "Medicine Reminder";
        }

        if (time == null || time.trim().isEmpty()) {
            time = "Now";
        } else {
            time = formatTime(time);
        }

        if (body == null || body.trim().isEmpty()) {
            body = "Time to take your medicine.";
        }

        medicineNameView.setText(medicineName);
        timeView.setText(time);
        bodyView.setText(body);
    }

    private void setupButtons() {
        Button openAppButton = findViewById(R.id.openAppButton);

        openAppButton.setOnClickListener(view -> {
            Intent launchIntent = getPackageManager().getLaunchIntentForPackage(getPackageName());
            if (launchIntent != null) {
                launchIntent.addFlags(Intent.FLAG_ACTIVITY_CLEAR_TOP | Intent.FLAG_ACTIVITY_SINGLE_TOP | Intent.FLAG_ACTIVITY_NEW_TASK);
                startActivity(launchIntent);
            }
        });
    }

    private void startNotificationMonitor() {
        stopNotificationMonitor();
        notificationMonitorHandler.post(notificationMonitor);
    }

    private void stopNotificationMonitor() {
        notificationMonitorHandler.removeCallbacks(notificationMonitor);
    }

    private boolean isNotificationStillActive() {
        if (notificationId == Integer.MIN_VALUE || Build.VERSION.SDK_INT < Build.VERSION_CODES.M) {
            return true;
        }

        NotificationManager notificationManager = (NotificationManager) getSystemService(Context.NOTIFICATION_SERVICE);
        if (notificationManager == null) {
            return true;
        }

        StatusBarNotification[] activeNotifications = notificationManager.getActiveNotifications();
        for (StatusBarNotification activeNotification : activeNotifications) {
            if (activeNotification.getId() == notificationId) {
                return true;
            }
        }

        return false;
    }

    private void startAlarmFeedback() {
        startAlarmSound();
        startVibration();
    }

    private void stopAlarmFeedback() {
        if (mediaPlayer != null) {
            if (mediaPlayer.isPlaying()) {
                mediaPlayer.stop();
            }
            mediaPlayer.release();
            mediaPlayer = null;
        }

        if (vibrator != null) {
            vibrator.cancel();
        }
    }

    private void startAlarmSound() {
        try {
            mediaPlayer = new MediaPlayer();
            mediaPlayer.setAudioAttributes(
                new AudioAttributes.Builder()
                    .setUsage(AudioAttributes.USAGE_ALARM)
                    .setContentType(AudioAttributes.CONTENT_TYPE_SONIFICATION)
                    .build()
            );

            try (var descriptor = getResources().openRawResourceFd(R.raw.alarm)) {
                if (descriptor == null) {
                    return;
                }

                mediaPlayer.setDataSource(descriptor.getFileDescriptor(), descriptor.getStartOffset(), descriptor.getLength());
            }

            mediaPlayer.setLooping(true);
            mediaPlayer.prepare();
            mediaPlayer.start();
        } catch (IOException | IllegalStateException error) {
            if (mediaPlayer != null) {
                mediaPlayer.release();
                mediaPlayer = null;
            }
        }
    }

    private void startVibration() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
            VibratorManager vibratorManager = (VibratorManager) getSystemService(Context.VIBRATOR_MANAGER_SERVICE);
            vibrator = vibratorManager != null ? vibratorManager.getDefaultVibrator() : null;
        } else {
            vibrator = (Vibrator) getSystemService(Context.VIBRATOR_SERVICE);
        }

        if (vibrator == null || !vibrator.hasVibrator()) {
            return;
        }

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            vibrator.vibrate(VibrationEffect.createWaveform(VIBRATION_PATTERN, 0));
        } else {
            vibrator.vibrate(VIBRATION_PATTERN, 0);
        }
    }

    private String formatTime(String rawTime) {
        String[] pieces = rawTime.split(":");
        if (pieces.length < 2) {
            return rawTime;
        }

        int hour = Integer.parseInt(pieces[0]);
        String minutes = pieces[1];
        String suffix = hour >= 12 ? "PM" : "AM";
        int hour12 = hour % 12;
        if (hour12 == 0) {
            hour12 = 12;
        }

        return hour12 + ":" + minutes + " " + suffix;
    }

    @Override
    public void onBackPressed() {
        // Keep the alarm screen active until the user takes the dose in the app.
    }
}
