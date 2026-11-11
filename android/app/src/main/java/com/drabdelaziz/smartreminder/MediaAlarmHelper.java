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

public class MediaAlarmHelper {

    private static final String TAG = "MediaAlarmHelper";
    public static final String PREFS_NAME = "DrAbdelazizVideoAlarmsPrefs";
    public static final String KEY_ALARMS_JSON = "scheduled_video_alarms_json";
    public static final String ACTION_PLAY_SCHEDULED_MEDIA = "com.drabdelaziz.smartreminder.ACTION_PLAY_SCHEDULED_MEDIA";
    public static final String CHANNEL_MEDIA_LAUNCH = "dr_abdelaziz_media_launch_v10";

    /**
     * Ensure high-priority Hardware Alarm Channel exists for scheduled video & media auto-launch.
     */
    public static void ensureMediaLaunchChannel(Context context) {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            NotificationManager manager = (NotificationManager) context.getSystemService(Context.NOTIFICATION_SERVICE);
            if (manager == null) return;

            AudioAttributes alarmAttributes = new AudioAttributes.Builder()
                    .setContentType(AudioAttributes.CONTENT_TYPE_SONIFICATION)
                    .setUsage(AudioAttributes.USAGE_ALARM)
                    .setFlags(AudioAttributes.FLAG_AUDIBILITY_ENFORCED)
                    .build();

            NotificationChannel channel = new NotificationChannel(
                    CHANNEL_MEDIA_LAUNCH,
                    "تشغيل الفيديو والوسائط تلقائياً (د. عبد العزيز)",
                    NotificationManager.IMPORTANCE_HIGH
            );
            channel.setDescription("يفتح التطبيق تلقائياً ويشغّل الفيديو المجدول في موعده كمنبه صريح");
            Uri alertUri = Uri.parse(ContentResolver.SCHEME_ANDROID_RESOURCE + "://" + context.getPackageName() + "/raw/dr_abdelaziz_task_alert");
            channel.setSound(alertUri, alarmAttributes);
            channel.enableVibration(true);
            channel.setVibrationPattern(new long[]{0, 350, 150, 350});
            try {
                NotificationChannel.class.getMethod("setBypassDnd", boolean.class).invoke(channel, true);
            } catch (Exception ignored) {}
            channel.setLockscreenVisibility(Notification.VISIBILITY_PUBLIC);
            manager.createNotificationChannel(channel);
        }
    }

    /**
     * Cancel all previously stored alarms, save new list to SharedPreferences, and schedule future ones.
     */
    public static int syncAlarms(Context context, JSONArray alarmsArray) {
        cancelAllStoredAlarms(context);

        JSONArray futureAlarms = new JSONArray();
        long now = System.currentTimeMillis();
        int scheduledCount = 0;

        if (alarmsArray != null) {
            for (int i = 0; i < alarmsArray.length(); i++) {
                JSONObject item = alarmsArray.optJSONObject(i);
                if (item == null) continue;
                long triggerAtMs = item.optLong("triggerAtMs", 0L);
                if (triggerAtMs > now - 5000L) {
                    long effectiveTrigger = Math.max(triggerAtMs, now + 1000L);
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

        SharedPreferences prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE);
        prefs.edit().putString(KEY_ALARMS_JSON, futureAlarms.toString()).apply();
        Log.d(TAG, "Synced " + scheduledCount + " native video alarms.");
        return scheduledCount;
    }

    /**
     * Cancel all existing PendingIntents stored in SharedPreferences.
     */
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
                int alarmId = item.optInt("alarmId", 3000 + i);
                Intent intent = new Intent(context, MediaAlarmReceiver.class);
                intent.setAction(ACTION_PLAY_SCHEDULED_MEDIA);
                int flags = PendingIntent.FLAG_NO_CREATE | PendingIntent.FLAG_IMMUTABLE;
                PendingIntent pi = PendingIntent.getBroadcast(context, alarmId, intent, flags);
                if (pi != null) {
                    alarmManager.cancel(pi);
                    pi.cancel();
                }
            }
        } catch (Exception e) {
            Log.w(TAG, "Error cancelling stored alarms", e);
        }
    }

    /**
     * Reschedule stored alarms after device reboot or app update.
     */
    public static void rescheduleFromPrefs(Context context) {
        ensureMediaLaunchChannel(context);
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
            Log.d(TAG, "Boot rescheduled " + stillFuture.length() + " alarms.");
        } catch (Exception e) {
            Log.w(TAG, "Error rescheduling from prefs", e);
        }
    }

    /**
     * Schedule an individual alarm using AlarmManager.setAlarmClock so Android wakes Doze mode accurately.
     */
    public static boolean scheduleSingleAlarm(Context context, JSONObject alarmObj) {
        if (alarmObj == null) return false;
        AlarmManager alarmManager = (AlarmManager) context.getSystemService(Context.ALARM_SERVICE);
        if (alarmManager == null) return false;

        int alarmId = alarmObj.optInt("alarmId", (int) (System.currentTimeMillis() % 100000));
        long triggerAtMs = alarmObj.optLong("triggerAtMs", 0L);
        if (triggerAtMs <= System.currentTimeMillis()) {
            return false;
        }

        Intent receiverIntent = new Intent(context, MediaAlarmReceiver.class);
        receiverIntent.setAction(ACTION_PLAY_SCHEDULED_MEDIA);
        receiverIntent.putExtra("alarmId", alarmId);
        receiverIntent.putExtra("scheduledId", alarmObj.optString("scheduledId", ""));
        receiverIntent.putExtra("mediaId", alarmObj.optString("mediaId", ""));
        receiverIntent.putExtra("mediaName", alarmObj.optString("mediaName", ""));
        receiverIntent.putExtra("mediaType", alarmObj.optString("mediaType", "video"));
        receiverIntent.putExtra("title", alarmObj.optString("title", "عرض فيديو مجدول"));
        receiverIntent.putExtra("description", alarmObj.optString("description", ""));
        receiverIntent.putExtra("cloudUrl", alarmObj.optString("cloudUrl", ""));
        receiverIntent.putExtra("isVideo", alarmObj.optBoolean("isVideo", true));
        receiverIntent.putExtra("isTestAlarm", alarmObj.optBoolean("isTestAlarm", false));

        int piFlags = PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE;
        PendingIntent operationPI = PendingIntent.getBroadcast(context, alarmId, receiverIntent, piFlags);

        Intent showIntent = new Intent(context, MainActivity.class);
        showIntent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_SINGLE_TOP);
        PendingIntent showPI = PendingIntent.getActivity(context, alarmId + 20000, showIntent, piFlags);

        try {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S && !alarmManager.canScheduleExactAlarms()) {
                alarmManager.setAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, triggerAtMs, operationPI);
            } else {
                AlarmManager.AlarmClockInfo info = new AlarmManager.AlarmClockInfo(triggerAtMs, showPI);
                alarmManager.setAlarmClock(info, operationPI);
            }
            return true;
        } catch (SecurityException se) {
            Log.w(TAG, "Exact alarm denied, using setAndAllowWhileIdle", se);
            try {
                alarmManager.setAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, triggerAtMs, operationPI);
                return true;
            } catch (Exception ex) {
                Log.e(TAG, "Failed fallback alarm", ex);
                return false;
            }
        } catch (Exception e) {
            Log.e(TAG, "Failed to schedule alarm", e);
            return false;
        }
    }

    /**
     * Construct a MainActivity launch Intent carrying the scheduled media extras.
     */
    public static Intent buildLaunchIntent(Context context, Intent source) {
        Intent launchIntent = new Intent(context, MainActivity.class);
        launchIntent.setAction(ACTION_PLAY_SCHEDULED_MEDIA);
        launchIntent.addFlags(
                Intent.FLAG_ACTIVITY_NEW_TASK |
                Intent.FLAG_ACTIVITY_SINGLE_TOP |
                Intent.FLAG_ACTIVITY_CLEAR_TOP |
                Intent.FLAG_ACTIVITY_REORDER_TO_FRONT
        );
        if (source != null) {
            launchIntent.putExtra("alarmId", source.getIntExtra("alarmId", -1));
            launchIntent.putExtra("scheduledId", source.getStringExtra("scheduledId"));
            launchIntent.putExtra("mediaId", source.getStringExtra("mediaId"));
            launchIntent.putExtra("mediaName", source.getStringExtra("mediaName"));
            launchIntent.putExtra("mediaType", source.getStringExtra("mediaType"));
            launchIntent.putExtra("title", source.getStringExtra("title"));
            launchIntent.putExtra("description", source.getStringExtra("description"));
            launchIntent.putExtra("cloudUrl", source.getStringExtra("cloudUrl"));
            launchIntent.putExtra("isVideo", source.getBooleanExtra("isVideo", true));
            launchIntent.putExtra("isTestAlarm", source.getBooleanExtra("isTestAlarm", false));
        }
        launchIntent.putExtra("autoLaunchTimestamp", System.currentTimeMillis());
        return launchIntent;
    }
}
