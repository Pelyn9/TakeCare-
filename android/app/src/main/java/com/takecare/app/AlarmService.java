package com.takecare.app;

import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.Service;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.os.Build;
import android.os.IBinder;
import android.util.Log;
import androidx.core.app.NotificationCompat;
import org.json.JSONArray;
import org.json.JSONException;
import org.json.JSONObject;
import java.text.ParseException;
import java.text.SimpleDateFormat;
import java.util.ArrayList;
import java.util.Calendar;
import java.util.Date;
import java.util.List;
import java.util.Locale;

public class AlarmService extends Service {
    private static final String TAG = "AlarmService";
    private static final String CHANNEL_ID = "alarm_service_channel";
    private static final int NOTIFICATION_ID = 1001;
    private static final String PREFS_NAME = "CapacitorStorage";
    private static final String MEDICINES_KEY = "medicines";
    private static final String HISTORY_KEY = "history";

    @Override
    public void onCreate() {
        super.onCreate();
        createNotificationChannel();
    }

    @Override
    public int onStartCommand(Intent intent, int flags, int startId) {
        String action = intent != null ? intent.getAction() : null;
        Log.d(TAG, "Service started with action: " + action);

        // Start foreground service
        startForeground(NOTIFICATION_ID, createServiceNotification());

        if ("RESCHEDULE_ALARMS".equals(action)) {
            rescheduleAlarms();
        }

        // Stop service after processing
        stopSelf();
        return START_NOT_STICKY;
    }

    @Override
    public IBinder onBind(Intent intent) {
        return null;
    }

    private void createNotificationChannel() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            NotificationChannel channel = new NotificationChannel(
                CHANNEL_ID,
                "Alarm Service",
                NotificationManager.IMPORTANCE_LOW
            );
            channel.setDescription("Keeps alarm service running in background");
            
            NotificationManager manager = (NotificationManager) getSystemService(Context.NOTIFICATION_SERVICE);
            if (manager != null) {
                manager.createNotificationChannel(channel);
            }
        }
    }

    private Notification createServiceNotification() {
        return new NotificationCompat.Builder(this, CHANNEL_ID)
            .setContentTitle("TakeCare+")
            .setContentText("Alarm service is running")
            .setSmallIcon(R.drawable.ic_notification)
            .setPriority(NotificationCompat.PRIORITY_LOW)
            .build();
    }

    private void rescheduleAlarms() {
        try {
            SharedPreferences prefs = getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE);
            String medicinesJson = prefs.getString(MEDICINES_KEY, "[]");
            String historyJson = prefs.getString(HISTORY_KEY, "[]");

            JSONArray medicines = new JSONArray(medicinesJson);
            JSONArray history = new JSONArray(historyJson);

            List<JSONObject> upcomingOccurrences = buildUpcomingOccurrences(medicines, history);
            
            Log.d(TAG, "Rescheduling " + upcomingOccurrences.size() + " alarms");

            // Note: In a real implementation, you would schedule alarms here
            // For now, we just log the rescheduling
            
        } catch (JSONException e) {
            Log.e(TAG, "Error rescheduling alarms", e);
        }
    }

    private List<JSONObject> buildUpcomingOccurrences(JSONArray medicines, JSONArray history) throws JSONException {
        List<JSONObject> occurrences = new ArrayList<>();
        SimpleDateFormat dateFormat = new SimpleDateFormat("yyyy-MM-dd", Locale.getDefault());
        SimpleDateFormat timeFormat = new SimpleDateFormat("HH:mm", Locale.getDefault());
        
        Date now = new Date();
        Calendar calendar = Calendar.getInstance();
        calendar.setTime(now);
        
        // Build history set for quick lookup
        java.util.Set<String> takenDoses = new java.util.HashSet<>();
        for (int i = 0; i < history.length(); i++) {
            JSONObject entry = history.getJSONObject(i);
            String key = entry.optString("medicineId") + "-" + entry.optString("time") + "-" + entry.optString("date");
            takenDoses.add(key);
        }

        // Generate occurrences for next 7 days
        for (int dayOffset = 0; dayOffset < 7; dayOffset++) {
            calendar.setTime(now);
            calendar.add(Calendar.DAY_OF_YEAR, dayOffset);
            Date targetDate = calendar.getTime();
            String dateStr = dateFormat.format(targetDate);

            for (int i = 0; i < medicines.length(); i++) {
                JSONObject medicine = medicines.getJSONObject(i);
                String medicineId = medicine.optString("id");
                String medicineName = medicine.optString("name");
                JSONArray times = medicine.optJSONArray("times");
                
                if (times == null || medicineId.isEmpty()) continue;

                // Check if medicine is active on this date
                if (!isMedicineActiveOnDate(medicine, targetDate)) continue;

                for (int j = 0; j < times.length(); j++) {
                    String time = times.getString(j);
                    String doseKey = medicineId + "-" + time + "-" + dateStr;
                    
                    if (!takenDoses.contains(doseKey)) {
                        try {
                            Date scheduledTime = timeFormat.parse(time);
                            Calendar occurrenceCal = Calendar.getInstance();
                            occurrenceCal.setTime(targetDate);
                            
                            Calendar timeCal = Calendar.getInstance();
                            timeCal.setTime(scheduledTime);
                            
                            occurrenceCal.set(Calendar.HOUR_OF_DAY, timeCal.get(Calendar.HOUR_OF_DAY));
                            occurrenceCal.set(Calendar.MINUTE, timeCal.get(Calendar.MINUTE));
                            occurrenceCal.set(Calendar.SECOND, 0);
                            occurrenceCal.set(Calendar.MILLISECOND, 0);

                            if (occurrenceCal.getTime().after(now)) {
                                JSONObject occurrence = new JSONObject();
                                occurrence.put("id", doseKey);
                                occurrence.put("medicineId", medicineId);
                                occurrence.put("medicineName", medicineName);
                                occurrence.put("time", time);
                                occurrence.put("date", dateStr);
                                occurrence.put("scheduledAt", occurrenceCal.getTime().getTime());
                                occurrences.add(occurrence);
                            }
                        } catch (ParseException e) {
                            Log.e(TAG, "Error parsing time: " + time, e);
                        }
                    }
                }
            }
        }

        return occurrences;
    }

    private boolean isMedicineActiveOnDate(JSONObject medicine, Date date) {
        try {
            String startDateStr = medicine.optString("startDate");
            String durationType = medicine.optString("durationType", "ongoing");
            int duration = medicine.optInt("duration", 0);

            if (startDateStr.isEmpty()) return true;

            SimpleDateFormat dateFormat = new SimpleDateFormat("yyyy-MM-dd", Locale.getDefault());
            Date startDate = dateFormat.parse(startDateStr);
            
            if (startDate == null) return true;

            if ("ongoing".equals(durationType) || duration <= 0) {
                return !date.before(startDate);
            }

            Calendar endCal = Calendar.getInstance();
            endCal.setTime(startDate);
            
            if ("days".equals(durationType)) {
                endCal.add(Calendar.DAY_OF_YEAR, duration);
            } else if ("weeks".equals(durationType)) {
                endCal.add(Calendar.WEEK_OF_YEAR, duration);
            } else if ("months".equals(durationType)) {
                endCal.add(Calendar.MONTH, duration);
            }

            return !date.before(startDate) && !date.after(endCal.getTime());
        } catch (ParseException e) {
            Log.e(TAG, "Error checking medicine active date", e);
            return true;
        }
    }
}