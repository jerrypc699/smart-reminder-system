package com.drabdelaziz.smartreminder;

import android.app.KeyguardManager;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.os.Build;
import android.os.PowerManager;
import android.provider.Settings;
import android.util.Log;

import androidx.core.app.NotificationCompat;

import org.json.JSONObject;

import java.io.BufferedReader;
import java.io.InputStreamReader;
import java.io.OutputStream;
import java.net.HttpURLConnection;
import java.net.URL;
import java.nio.charset.StandardCharsets;
import java.util.concurrent.Executors;

public class TaskWhatsAppAlarmReceiver extends BroadcastReceiver {

    private static final String TAG = "TaskWhatsAppReceiver";
    private static final String API_URL = "https://smart-reminder-system-nu.vercel.app/api/whatsapp-send";

    @Override
    public void onReceive(Context context, Intent intent) {
        if (context == null || intent == null) return;

        TaskWhatsAppAlarmHelper.ensureChannel(context);

        int alarmId = intent.getIntExtra("alarmId", 40001);
        String taskId = intent.getStringExtra("taskId");
        String title = intent.getStringExtra("title");
        String phone = intent.getStringExtra("phone");
        String recipientName = intent.getStringExtra("recipientName");
        String message = intent.getStringExtra("message");
        boolean autoTrigger = intent.getBooleanExtra("autoTriggerAtDueTime", true);
        String dedupeKey = intent.getStringExtra("dedupeKey");

        if (phone == null || phone.isEmpty()) return;
        String displayRecipient = (recipientName != null && !recipientName.isEmpty()) ? recipientName : ("+" + phone);

        String gatewayJsonRaw = TaskWhatsAppAlarmHelper.getStoredGatewayJson(context);
        boolean hasGateway = false;
        JSONObject gatewayObj = new JSONObject();
        try {
            gatewayObj = new JSONObject(gatewayJsonRaw != null ? gatewayJsonRaw : "{}");
            String provider = gatewayObj.optString("provider", "none");
            hasGateway = !provider.isEmpty() && !"none".equals(provider);
        } catch (Exception ignored) {}

        // If no automatic API gateway is configured, immediately show direct WhatsApp action & auto-open if permitted
        if (!hasGateway) {
            postDirectWhatsAppNotification(
                    context,
                    alarmId,
                    phone,
                    message,
                    "💬 موعد إرسال مهمة عبر واتساب إلى " + displayRecipient,
                    (title != null ? title : "مهمة مجدولة") + " — اضغط لفتح واتساب وإرسال الرسالة الآن"
            );
            if (autoTrigger) {
                tryAutoOpenWhatsApp(context, phone, message);
            }
            return;
        }

        // Automatic API Gateway configured: execute HTTP dispatch off the main thread using goAsync()
        PowerManager pm = (PowerManager) context.getSystemService(Context.POWER_SERVICE);
        PowerManager.WakeLock wl = null;
        if (pm != null) {
            try {
                wl = pm.newWakeLock(PowerManager.PARTIAL_WAKE_LOCK, "DrAbdelaziz:WhatsAppSendLock");
                wl.acquire(18000L);
            } catch (Exception ignored) {}
        }

        final PendingResult pendingResult = goAsync();
        final JSONObject finalGatewayObj = gatewayObj;
        final PowerManager.WakeLock finalWl = wl;

        Executors.newSingleThreadExecutor().execute(() -> {
            boolean sent = false;
            String errMsg = "";
            try {
                JSONObject payload = new JSONObject();
                payload.put("phone", phone);
                payload.put("message", message != null ? message : "");
                payload.put("recipientName", displayRecipient);
                payload.put("taskId", taskId != null ? taskId : "");
                payload.put("taskTitle", title != null ? title : "");
                payload.put("dedupeKey", dedupeKey != null ? dedupeKey : "");
                payload.put("gateway", finalGatewayObj);

                URL url = new URL(API_URL);
                HttpURLConnection conn = (HttpURLConnection) url.openConnection();
                conn.setRequestMethod("POST");
                conn.setRequestProperty("Content-Type", "application/json; charset=UTF-8");
                conn.setConnectTimeout(12000);
                conn.setReadTimeout(12000);
                conn.setDoOutput(true);

                try (OutputStream os = conn.getOutputStream()) {
                    os.write(payload.toString().getBytes(StandardCharsets.UTF_8));
                }

                int code = conn.getResponseCode();
                BufferedReader br = new BufferedReader(new InputStreamReader(
                        code >= 200 && code < 400 ? conn.getInputStream() : conn.getErrorStream(),
                        StandardCharsets.UTF_8
                ));
                StringBuilder sb = new StringBuilder();
                String line;
                while ((line = br.readLine()) != null) {
                    sb.append(line);
                }
                br.close();

                JSONObject respJson = new JSONObject(sb.toString());
                sent = respJson.optBoolean("success", false);
                errMsg = respJson.optString("error", "");
            } catch (Exception e) {
                errMsg = e.getMessage() != null ? e.getMessage() : "Connection failed";
                Log.w(TAG, "Auto WhatsApp dispatch failed", e);
            } finally {
                if (sent) {
                    postDirectWhatsAppNotification(
                            context,
                            alarmId,
                            phone,
                            message,
                            "✅ تم إرسال المهمة على واتساب إلى " + displayRecipient,
                            "تم إرسال مهمة «" + (title != null ? title : "") + "» تلقائياً بنجاح."
                    );
                } else {
                    postDirectWhatsAppNotification(
                            context,
                            alarmId,
                            phone,
                            message,
                            "⚠️ اضغط لإرسال المهمة عبر واتساب إلى " + displayRecipient,
                            "تعذر الإرسال التلقائي" + (errMsg.isEmpty() ? "" : (": " + errMsg)) + " — اضغط هنا لفتح واتساب"
                    );
                    if (autoTrigger) {
                        tryAutoOpenWhatsApp(context, phone, message);
                    }
                }
                try {
                    if (finalWl != null && finalWl.isHeld()) finalWl.release();
                } catch (Exception ignored) {}
                pendingResult.finish();
            }
        });
    }

    private void postDirectWhatsAppNotification(
            Context context,
            int alarmId,
            String phone,
            String message,
            String notifTitle,
            String notifBody
    ) {
        try {
            Intent waIntent = TaskWhatsAppAlarmHelper.buildWhatsAppIntent(phone, message);
            int flags = PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE;
            PendingIntent waPI = PendingIntent.getActivity(context, alarmId + 5000, waIntent, flags);

            NotificationManager nm = (NotificationManager) context.getSystemService(Context.NOTIFICATION_SERVICE);
            if (nm == null) return;

            NotificationCompat.Builder builder = new NotificationCompat.Builder(context, TaskWhatsAppAlarmHelper.CHANNEL_WA_ALERTS)
                    .setSmallIcon(context.getApplicationInfo().icon)
                    .setContentTitle(notifTitle)
                    .setContentText(notifBody)
                    .setStyle(new NotificationCompat.BigTextStyle().bigText(notifBody))
                    .setPriority(NotificationCompat.PRIORITY_MAX)
                    .setCategory(NotificationCompat.CATEGORY_ALARM)
                    .setVisibility(NotificationCompat.VISIBILITY_PUBLIC)
                    .setAutoCancel(true)
                    .setContentIntent(waPI)
                    .addAction(0, "فتح وإرسال في واتساب 💬", waPI);

            nm.notify(alarmId, builder.build());
        } catch (Exception e) {
            Log.w(TAG, "postDirectWhatsAppNotification warning", e);
        }
    }

    private void tryAutoOpenWhatsApp(Context context, String phone, String message) {
        try {
            PowerManager pm = (PowerManager) context.getSystemService(Context.POWER_SERVICE);
            boolean canOverlay = Build.VERSION.SDK_INT < Build.VERSION_CODES.M || Settings.canDrawOverlays(context);
            KeyguardManager km = (KeyguardManager) context.getSystemService(Context.KEYGUARD_SERVICE);
            boolean isLocked = km != null && km.isKeyguardLocked();
            boolean isInteractive = pm != null && pm.isInteractive();

            if (!isLocked && isInteractive && (Build.VERSION.SDK_INT < Build.VERSION_CODES.Q || canOverlay)) {
                context.startActivity(TaskWhatsAppAlarmHelper.buildWhatsAppIntent(phone, message));
            }
        } catch (Exception e) {
            Log.w(TAG, "tryAutoOpenWhatsApp suppressed; notification tap remains ready", e);
        }
    }
}
