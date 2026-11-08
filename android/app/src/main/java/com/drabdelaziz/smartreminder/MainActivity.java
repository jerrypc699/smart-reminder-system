package com.drabdelaziz.smartreminder;

import android.Manifest;
import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.content.ContentResolver;
import android.content.pm.PackageManager;
import android.media.AudioAttributes;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setupAlarmNotificationChannels();
        requestAudioPermissions();
    }

    private void requestAudioPermissions() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
            if (checkSelfPermission(Manifest.permission.RECORD_AUDIO) != PackageManager.PERMISSION_GRANTED) {
                requestPermissions(new String[]{Manifest.permission.RECORD_AUDIO}, 101);
            }
        }
    }

    /**
     * Configure all notification channels as full Hardware Alarm Clock channels.
     * Uses AudioAttributes.USAGE_ALARM + FLAG_AUDIBILITY_ENFORCED and setBypassDnd(true).
     * This forces Android to route the audio through the ALARM volume stream,
     * ensuring sound plays loud and clear EVEN IN SILENT OR VIBRATE MODE!
     */
    private void setupAlarmNotificationChannels() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            NotificationManager manager = getSystemService(NotificationManager.class);
            if (manager == null) return;

            // Delete legacy channels so Android clears any old/silent cached settings
            String[] oldChannels = {
                "azan_channel", "task_channel", "sound_mishary", "sound_dr_abdelaziz_task_alert",
                "dr_abdelaziz_tasks_v5", "dr_abdelaziz_azan_v5",
                "dr_abdelaziz_tasks_v6", "dr_abdelaziz_azan_v6", "dr_abdelaziz_pre_azan_v6",
                "dr_abdelaziz_tasks_v7", "dr_abdelaziz_azan_v7", "dr_abdelaziz_pre_azan_v7",
                "dr_abdelaziz_tasks_v8", "dr_abdelaziz_azan_v8", "dr_abdelaziz_pre_azan_v8"
            };
            for (String chId : oldChannels) {
                try {
                    manager.deleteNotificationChannel(chId);
                } catch (Exception ignored) {}
            }

            // ALARM STREAM AUDIO ATTRIBUTES
            AudioAttributes alarmAttributes = new AudioAttributes.Builder()
                .setContentType(AudioAttributes.CONTENT_TYPE_SONIFICATION)
                .setUsage(AudioAttributes.USAGE_ALARM)
                .setFlags(AudioAttributes.FLAG_AUDIBILITY_ENFORCED)
                .build();

            // 1. Azan Alarm Channel (Plays full Azan as hardware alarm)
            NotificationChannel azanChannel = new NotificationChannel(
                "dr_abdelaziz_azan_v9",
                "أذان الصلاة الرسمي (د. عبد العزيز - كمنبه صريح)",
                NotificationManager.IMPORTANCE_HIGH
            );
            azanChannel.setDescription("إطلاق صوت الأذان كاملاً كمنبه رسمي حتى لو كان الهاتف في الوضع الصامت");
            Uri misharyUri = Uri.parse(ContentResolver.SCHEME_ANDROID_RESOURCE + "://" + getPackageName() + "/raw/mishary");
            azanChannel.setSound(misharyUri, alarmAttributes);
            azanChannel.enableVibration(true);
            azanChannel.setVibrationPattern(new long[]{0, 500, 200, 500, 200, 1000});
            try {
                NotificationChannel.class.getMethod("setBypassDnd", boolean.class).invoke(azanChannel, true);
            } catch (Exception ignored) {}
            azanChannel.setLockscreenVisibility(Notification.VISIBILITY_PUBLIC);
            manager.createNotificationChannel(azanChannel);

            // 2. Pre-Azan 5-Minute Alarm Channel
            NotificationChannel preAzanChannel = new NotificationChannel(
                "dr_abdelaziz_pre_azan_v9",
                "تنبيه ما قبل الأذان بـ 5 دقائق (د. عبد العزيز - كمنبه صريح)",
                NotificationManager.IMPORTANCE_HIGH
            );
            preAzanChannel.setDescription("تنبيه صوتي قبل موعد الصلاة بـ 5 دقائق كمنبه رسمي حتى في الوضع الصامت");
            Uri preAzanUri = Uri.parse(ContentResolver.SCHEME_ANDROID_RESOURCE + "://" + getPackageName() + "/raw/dr_abdelaziz_pre_azan");
            preAzanChannel.setSound(preAzanUri, alarmAttributes);
            preAzanChannel.enableVibration(true);
            preAzanChannel.setVibrationPattern(new long[]{0, 300, 150, 300, 150, 500});
            try {
                NotificationChannel.class.getMethod("setBypassDnd", boolean.class).invoke(preAzanChannel, true);
            } catch (Exception ignored) {}
            preAzanChannel.setLockscreenVisibility(Notification.VISIBILITY_PUBLIC);
            manager.createNotificationChannel(preAzanChannel);

            // 3. Tasks & Clinic Alarm Channel
            NotificationChannel taskChannel = new NotificationChannel(
                "dr_abdelaziz_tasks_v9",
                "تنبيهات مهام العمل والعيادة (د. عبد العزيز - كمنبه صريح)",
                NotificationManager.IMPORTANCE_HIGH
            );
            taskChannel.setDescription("تنبيهات صوتية فورية لمهام العمل والعيادة كمنبه رسمي حتى في الوضع الصامت");
            Uri taskUri = Uri.parse(ContentResolver.SCHEME_ANDROID_RESOURCE + "://" + getPackageName() + "/raw/dr_abdelaziz_task_alert");
            taskChannel.setSound(taskUri, alarmAttributes);
            taskChannel.enableVibration(true);
            taskChannel.setVibrationPattern(new long[]{0, 300, 150, 300, 150, 500});
            try {
                NotificationChannel.class.getMethod("setBypassDnd", boolean.class).invoke(taskChannel, true);
            } catch (Exception ignored) {}
            taskChannel.setLockscreenVisibility(Notification.VISIBILITY_PUBLIC);
            manager.createNotificationChannel(taskChannel);
        }
    }
}
