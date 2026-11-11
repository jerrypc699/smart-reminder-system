package com.drabdelaziz.smartreminder;

import android.app.AlarmManager;
import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.content.ContentResolver;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.media.AudioAttributes;
import android.net.Uri;
import android.os.Build;
import android.util.Log;

import org.json.JSONArray;
import org.json.JSONObject;

public class TaskWhatsAppAlarmHelper {

    private static final String TAG = "TaskWhatsAppHelper";
    public static final String PREFS_NAME = "DrAbdelazizWhatsAppAlarmsPrefs";
    public static final String KEY_ALARMS_JSON = "scheduled_wa_alarms_json";
    public static final String KEY_GATEWAY_JSON = "wa_gateway_config_json";
    public static final String ACTION_TRIGGER_TASK_WHATSAPP = "com.drabdelaziz.smartreminder.ACTION_TRIGGER_TASK_WHATSAPP";
    public static final String CHANNEL_WA_ALERTS = "dr_abdelaziz_whatsapp_v1";

    public static void ensureChannel(Context context) {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            NotificationManager manager = (NotificationManager) context.getSystemService(Context.NOTIFICATION_SERVICE);
            if (manager == null) return;

            AudioAttributes alarmAttributes = new AudioAttributes.Builder()
                    .setContentType(AudioAttributes.CONTENT_TYPE_SONIFICATION)
                    .setUsage(AudioAttributes.USAGE_ALARM)
                    .setFlags(AudioAttributes.FLAG_AUDIBILITY_ENFORCED)
                    .build();

            NotificationChannel channel = new NotificationChannel(
                    CHANNEL_WA_ALERTS,
                    "جدولة وإرسال مهام واتساب (د. عبد العزيز)",
                    NotificationManager.IMPORTANCE_HIGH
            );
            channel.setDescription("إرسال وتنبيه المهام المجدولة عبر واتساب عند حلول موعدها");
            Uri alertUri = Uri.parse(ContentResolver.SCHEME_ANDROID_RESOURCE + "://" + context.getPackageName() + "/raw/dr_abdelaziz_task_alert");
            channel.setSound(alertUri, alarmAttributes);
            channel.enableVibration(true);
            channel.setVibrationPattern(new long[]{0, 300, 150, 300});
            try {
                NotificationChannel.class.getMethod("setBypassDnd", boolean.class).invoke(channel, true);
            } catch (Exception ignored) {}
            channel.setLockscreenVisibility(Notification.VISIBILITY_PUBLIC);
            manager.createNotificationChannel(channel);
        }
    }

    public static Intent buildWhatsAppIntent(String phone, String text) {
        String cleanPhone = phone != null ? phone.replaceAll("[^0-9]", "") : "";
        String url = "https://api.whatsapp.com/send?phone=" + Uri.encode(cleanPhone) + "&text=" + Uri.encode(text != null ? text : "");
        Intent intent = new Intent(Intent.ACTION_VIEW, Uri.parse(url));
        intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
        return intent;
    }

    public static String getStoredGatewayJson(Context context) {
        SharedPreferences prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE);
        return prefs.getString(KEY_GATEWAY_JSON, "{}");
    }

    public static int syncAlarms(Context context, JSONArray alarmsArray, String gatewayConfigJson) {
        cancelAllStoredAlarms(context);

        SharedPreferences prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE);
        if (gatewayConfigJson != null && !gatewayConfigJson.isEmpty()) {
            prefs.edit().putString(KEY_GATEWAY_JSON, gatewayConfigJson).apply();
        }

        JSONArray futureAlarms = new JSONArray();
        long now = System.currentTimeMillis();
        int scheduledCount = 0;

        if (alarmsArray != null) {
            for (int i = 0; i < alarmsArray.length(); i++) {
                JSONObject item = alarmsArray.optJSONObject(i);
                if (item == null) continue;
                long triggerAtMs = item.optLong("triggerAtMs", 0L);
                if (triggerAtMs > now - 5000L) {
                    long effectiveTrigger = Math.max(triggerAtMs, now + 1500L);
                    try {
                        item.put("triggerAtMs", effectiveTrigger);
                    } catch (Exception ignored) {}
                    futureAlarms.put(item);
                    if (scheduleSingleAlarm(context, item)) {
                        scheduledCount++;
                    }
                }
            }
        }

        prefs.edit().putString(KEY_ALARMS_JSON, futureAlarms.toString()).apply();
        Log.d(TAG, "Synced " + scheduledCount + " native WhatsApp task alarms.");
        return scheduledCount;
    }

    public static void cancelAllStoredAlarms(Context context) {
        SharedPreferences prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE);
        String raw = prefs.getString(KEY_ALARMS_JSON, "[]");
        AlarmManager alarmManager = (AlarmManager) context.getSystemService(Context.ALARM_SERVICE);
        if (alarmManager == null) return;

        try {
            JSONArray prev = new JSONArray(raw);
            for (int i = 0; i < prev.length(); i++) {
                JSONObject item = prev.optJSONObject(i);
                if (item == null) continue;
                int alarmId = item.optInt("alarmId", 40000 + i);
                Intent intent = new Intent(context, TaskWhatsAppAlarmReceiver.class);
                intent.setAction(ACTION_TRIGGER_TASK_WHATSAPP);
                int flags = PendingIntent.FLAG_NO_CREATE | PendingIntent.FLAG_IMMUTABLE;
                PendingIntent pi = PendingIntent.getBroadcast(context, alarmId, intent, flags);
                if (pi != null) {
                    alarmManager.cancel(pi);
                    pi.cancel();
                }
            }
        } catch (Exception e) {
            Log.w(TAG, "Error cancelling stored WA alarms", e);
        }
    }

    public static void rescheduleFromPrefs(Context context) {
        ensureChannel(context);
        SharedPreferences prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE);
        String raw = prefs.getString(KEY_ALARMS_JSON, "[]");
        try {
            JSONArray stored = new JSONArray(raw);
            JSONArray stillFuture = new JSONArray();
            long now = System.currentTimeMillis();
            for (int i = 0; i < stored.length(); i++) {
                JSONObject item = stored.optJSONObject(i);
                if (item == null) continue;
                if (item.optLong("triggerAtMs", 0L) > now) {
                    stillFuture.put(item);
                    scheduleSingleAlarm(context, item);
                }
            }
            prefs.edit().putString(KEY_ALARMS_JSON, stillFuture.toString()).apply();
        } catch (Exception e) {
            Log.w(TAG, "Error rescheduling WA alarms from prefs", e);
        }
    }

    public static boolean scheduleSingleAlarm(Context context, JSONObject alarmObj) {
        if (alarmObj == null) return false;
        AlarmManager alarmManager = (AlarmManager) context.getSystemService(Context.ALARM_SERVICE);
        if (alarmManager == null) return false;

        int alarmId = alarmObj.optInt("alarmId", 40000 + (int) (System.currentTimeMillis() % 9000));
        long triggerAtMs = alarmObj.optLong("triggerAtMs", 0L);
        if (triggerAtMs <= System.currentTimeMillis()) {
            return false;
        }

        Intent receiverIntent = new Intent(context, TaskWhatsAppAlarmReceiver.class);
        receiverIntent.setAction(ACTION_TRIGGER_TASK_WHATSAPP);
        receiverIntent.putExtra("alarmId", alarmId);
        receiverIntent.putExtra("taskId", alarmObj.optString("taskId", ""));
        receiverIntent.putExtra("title", alarmObj.optString("title", ""));
        receiverIntent.putExtra("phone", alarmObj.optString("phone", ""));
        receiverIntent.putExtra("recipientName", alarmObj.optString("recipientName", ""));
        receiverIntent.putExtra("message", alarmObj.optString("message", ""));
        receiverIntent.putExtra("autoTriggerAtDueTime", alarmObj.optBoolean("autoTriggerAtDueTime", true));
        receiverIntent.putExtra("dedupeKey", alarmObj.optString("dedupeKey", ""));

        int piFlags = PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE;
        PendingIntent operationPI = PendingIntent.getBroadcast(context, alarmId, receiverIntent, piFlags);

        Intent showIntent = new Intent(context, MainActivity.class);
        showIntent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_SINGLE_TOP);
        PendingIntent showPI = PendingIntent.getActivity(context, alarmId + 10000, showIntent, piFlags);

        try {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S && !alarmManager.canScheduleExactAlarms()) {
                alarmManager.setAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, triggerAtMs, operationPI);
            } else {
                AlarmManager.AlarmClockInfo info = new AlarmManager.AlarmClockInfo(triggerAtMs, showPI);
                alarmManager.setAlarmClock(info, operationPI);
            }
            return true;
        } catch (SecurityException se) {
            try {
                alarmManager.setAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, triggerAtMs, operationPI);
                return true;
            } catch (Exception ex) {
                Log.e(TAG, "Failed fallback WA alarm", ex);
                return false;
            }
        } catch (Exception e) {
            Log.e(TAG, "Failed to schedule WA alarm", e);
            return false;
        }
    }
}

