package com.drabdelaziz.smartreminder;

import android.app.KeyguardManager;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.media.AudioManager;
import android.os.Build;
import android.os.PowerManager;
import android.provider.Settings;
import android.util.Log;

import androidx.core.app.NotificationCompat;

public class MediaAlarmReceiver extends BroadcastReceiver {

    private static final String TAG = "MediaAlarmReceiver";

    @Override
    public void onReceive(Context context, Intent intent) {
        if (context == null || intent == null) return;
        Log.d(TAG, "Alarm received for scheduled media or task video playback!");

        // 1. Acquire WakeLock to wake CPU and screen immediately (30 seconds)
        PowerManager pm = (PowerManager) context.getSystemService(Context.POWER_SERVICE);
        if (pm != null) {
            try {
                @SuppressWarnings("deprecation")
                PowerManager.WakeLock wakeLock = pm.newWakeLock(
                        PowerManager.SCREEN_BRIGHT_WAKE_LOCK |
                        PowerManager.ACQUIRE_CAUSES_WAKEUP |
                        PowerManager.ON_AFTER_RELEASE,
                        "DrAbdelaziz:MediaAlarmWake"
                );
                wakeLock.acquire(30000L);
            } catch (Exception e) {
                try {
                    PowerManager.WakeLock partial = pm.newWakeLock(
                            PowerManager.PARTIAL_WAKE_LOCK,
                            "DrAbdelaziz:MediaAlarmPartial"
                    );
                    partial.acquire(30000L);
                } catch (Exception ignored) {}
            }
        }

        // 2. Ensure channel exists
        MediaAlarmHelper.ensureMediaLaunchChannel(context);

        // 3. Enforce Alarm Characteristics: boost STREAM_MUSIC so video audio plays loudly even if phone is silent/low volume
        try {
            AudioManager am = (AudioManager) context.getSystemService(Context.AUDIO_SERVICE);
            if (am != null) {
                int maxMusic = am.getStreamMaxVolume(AudioManager.STREAM_MUSIC);
                int alarmVol = am.getStreamVolume(AudioManager.STREAM_ALARM);
                int maxAlarm = am.getStreamMaxVolume(AudioManager.STREAM_ALARM);
                int targetMusic = Math.max((int) (maxMusic * 0.95), (int) ((double) alarmVol / Math.max(1, maxAlarm) * maxMusic));
                am.setStreamVolume(AudioManager.STREAM_MUSIC, targetMusic, 0);
            }
        } catch (Exception ex) {
            Log.w(TAG, "Audio volume adjustment warning", ex);
        }

        // 4. Build Launch Intent & FullScreen PendingIntent
        int alarmId = intent.getIntExtra("alarmId", 3001);
        String title = intent.getStringExtra("title");
        String mediaName = intent.getStringExtra("mediaName");
        String description = intent.getStringExtra("description");
        String taskId = intent.getStringExtra("taskId");
        boolean isVideo = intent.getBooleanExtra("isVideo", true);
        boolean isTaskAlarm = taskId != null && !taskId.isEmpty();

        if (title == null || title.isEmpty()) {
            title = isTaskAlarm ? "موعد مهمة عمل" : (isVideo ? "تشغيل فيديو مجدول" : "تشغيل وسائط مجدولة");
        }
        String notifTitle = (isTaskAlarm ? "🎬 منبه فيديو المهمة: " : (isVideo ? "🎬 حان موعد الفيديو: " : "📻 حان موعد الوسائط: ")) + title;
        String notifBody = (description != null && !description.isEmpty())
                ? description
                : (isTaskAlarm
                    ? "يا دكتور عبد العزيز: حان موعد تنفيذ المهمة مع مقطع الفيديو المرفق كمنبه رسمي."
                    : "يا دكتور عبد العزيز: جاري فتح التشغيل التلقائي لـ " + (mediaName != null ? mediaName : "المقطع المجدول"));

        Intent launchIntent = MediaAlarmHelper.buildLaunchIntent(context, intent);
        int piFlags = PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE;
        PendingIntent fullScreenPI = PendingIntent.getActivity(context, alarmId, launchIntent, piFlags);

        // 5. Fire High-Priority Full-Screen Intent Alarm Notification (handles lockscreen wake & fallback)
        try {
            NotificationManager nm = (NotificationManager) context.getSystemService(Context.NOTIFICATION_SERVICE);
            if (nm != null) {
                NotificationCompat.Builder builder = new NotificationCompat.Builder(context, MediaAlarmHelper.CHANNEL_MEDIA_LAUNCH)
                        .setSmallIcon(context.getApplicationInfo().icon)
                        .setContentTitle(notifTitle)
                        .setContentText(notifBody)
                        .setPriority(NotificationCompat.PRIORITY_MAX)
                        .setCategory(NotificationCompat.CATEGORY_ALARM)
                        .setVisibility(NotificationCompat.VISIBILITY_PUBLIC)
                        .setAutoCancel(true)
                        .setContentIntent(fullScreenPI)
                        .setFullScreenIntent(fullScreenPI, true);

                nm.notify(alarmId, builder.build());
            }
        } catch (Exception e) {
            Log.w(TAG, "Notification notify warning", e);
        }

        // 6. Direct Activity Start (opens app immediately on top over lockscreen)
        boolean canOverlay = Build.VERSION.SDK_INT < Build.VERSION_CODES.M || Settings.canDrawOverlays(context);
        boolean isInteractive = pm != null && pm.isInteractive();
        KeyguardManager km = (KeyguardManager) context.getSystemService(Context.KEYGUARD_SERVICE);
        boolean isLocked = km != null && km.isKeyguardLocked();

        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.Q || canOverlay || isLocked || !isInteractive) {
            try {
                context.startActivity(launchIntent);
            } catch (Exception e) {
                Log.w(TAG, "Direct startActivity suppressed, relying on FullScreenIntent", e);
            }
        }
    }
}

