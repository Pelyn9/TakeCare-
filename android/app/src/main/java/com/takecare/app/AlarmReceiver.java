package com.takecare.app;

import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.os.Build;
import android.util.Log;

public class AlarmReceiver extends BroadcastReceiver {
    private static final String TAG = "AlarmReceiver";
    private static final String ALARM_TRIGGER_ACTION = "com.takecare.app.ALARM_TRIGGER";

    @Override
    public void onReceive(Context context, Intent intent) {
        String action = intent.getAction();
        Log.d(TAG, "Received broadcast with action: " + action);

        if (Intent.ACTION_BOOT_COMPLETED.equals(action) || 
            Intent.ACTION_MY_PACKAGE_REPLACED.equals(action)) {
            // Reschedule alarms after boot or app update
            handleBootOrUpdate(context);
        } else if (ALARM_TRIGGER_ACTION.equals(action)) {
            // Handle alarm trigger
            handleAlarmTrigger(context, intent);
        }
    }

    private void handleBootOrUpdate(Context context) {
        // Start the alarm service to reschedule all alarms
        Intent serviceIntent = new Intent(context, AlarmService.class);
        serviceIntent.setAction("RESCHEDULE_ALARMS");
        
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            context.startForegroundService(serviceIntent);
        } else {
            context.startService(serviceIntent);
        }
    }

    private void handleAlarmTrigger(Context context, Intent intent) {
        // Extract alarm details from intent
        String medicineName = intent.getStringExtra("medicine_name");
        String time = intent.getStringExtra("time");
        String doseId = intent.getStringExtra("dose_id");
        int notificationId = intent.getIntExtra("notification_id", 0);

        Log.d(TAG, "Alarm triggered for: " + medicineName + " at " + time);

        // Start the alarm alert activity
        Intent alarmIntent = new Intent(context, AlarmAlertActivity.class);
        alarmIntent.putExtra("alarm_medicine_name", medicineName);
        alarmIntent.putExtra("alarm_time", time);
        alarmIntent.putExtra("dose_id", doseId);
        alarmIntent.putExtra("LocalNotificationId", notificationId);
        alarmIntent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK | 
                           Intent.FLAG_ACTIVITY_CLEAR_TOP |
                           Intent.FLAG_ACTIVITY_SINGLE_TOP);
        
        context.startActivity(alarmIntent);
    }
}