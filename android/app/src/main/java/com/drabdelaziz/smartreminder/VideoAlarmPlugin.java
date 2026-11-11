package com.drabdelaziz.smartreminder;

import android.app.AlarmManager;
import android.app.NotificationManager;
import android.content.Context;
import android.content.Intent;
import android.net.Uri;
import android.os.Build;
import android.os.PowerManager;
import android.provider.Settings;

import com.getcapacitor.JSArray;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

@CapacitorPlugin(name = "VideoAlarm")
public class VideoAlarmPlugin extends Plugin {

    private static JSObject pendingLaunchPayload = null;
    private static long lastHandledLaunchTs = -1L;

    @Override
    protected void handleOnNewIntent(Intent intent) {
        super.handleOnNewIntent(intent);
        if (intent == null) return;
        if ((intent.getFlags() & Intent.FLAG_ACTIVITY_LAUNCHED_FROM_HISTORY) != 0) {
            return;
        }
        if (!MediaAlarmHelper.ACTION_PLAY_SCHEDULED_MEDIA.equals(intent.getAction())) {
            return;
        }

        long ts = intent.getLongExtra("autoLaunchTimestamp", 0L);
        if (ts > 0L && ts == lastHandledLaunchTs) {
            return;
        }
        lastHandledLaunchTs = ts;
        intent.setAction(Intent.ACTION_MAIN);

        int alarmId = intent.getIntExtra("alarmId", -1);
        if (alarmId > 0) {
            NotificationManager nm = (NotificationManager) getContext().getSystemService(Context.NOTIFICATION_SERVICE);
            if (nm != null) {
                nm.cancel(alarmId);
            }
        }

        JSObject payload = new JSObject();
        payload.put("scheduledId", intent.getStringExtra("scheduledId"));
        payload.put("mediaId", intent.getStringExtra("mediaId"));
        payload.put("mediaName", intent.getStringExtra("mediaName"));
        payload.put("mediaType", intent.getStringExtra("mediaType"));
        payload.put("title", intent.getStringExtra("title"));
        payload.put("description", intent.getStringExtra("description"));
        payload.put("cloudUrl", intent.getStringExtra("cloudUrl"));
        payload.put("isVideo", intent.getBooleanExtra("isVideo", true));
        payload.put("isTestAlarm", intent.getBooleanExtra("isTestAlarm", false));
        payload.put("autoLaunchTimestamp", ts);

        pendingLaunchPayload = payload;
        notifyListeners("scheduledMediaLaunch", payload, true);
    }

    @PluginMethod
    public void getPendingLaunchMedia(PluginCall call) {
        JSObject ret = new JSObject();
        if (pendingLaunchPayload != null) {
            ret.put("hasPending", true);
            ret.put("media", pendingLaunchPayload);
            pendingLaunchPayload = null;
        } else {
            ret.put("hasPending", false);
        }
        call.resolve(ret);
    }

    @PluginMethod
    public void syncVideoAlarms(PluginCall call) {
        JSArray alarms = call.getArray("alarms");
        int count = MediaAlarmHelper.syncAlarms(getContext(), alarms);
        JSObject ret = new JSObject();
        ret.put("scheduledCount", count);
        call.resolve(ret);
    }

    @PluginMethod
    public void scheduleSingleAlarm(PluginCall call) {
        JSObject alarmData = call.getObject("alarm");
        if (alarmData == null) {
            call.reject("Missing alarm object");
            return;
        }
        boolean scheduled = MediaAlarmHelper.scheduleSingleAlarm(getContext(), alarmData);
        JSObject ret = new JSObject();
        ret.put("scheduled", scheduled);
        call.resolve(ret);
    }

    @PluginMethod
    public void getAutoLaunchPermissions(PluginCall call) {
        Context ctx = getContext();
        boolean overlayGranted = Build.VERSION.SDK_INT < Build.VERSION_CODES.M || Settings.canDrawOverlays(ctx);

        boolean fullScreenGranted = true;
        if (Build.VERSION.SDK_INT >= 34) {
            NotificationManager nm = (NotificationManager) ctx.getSystemService(Context.NOTIFICATION_SERVICE);
            fullScreenGranted = nm == null || nm.canUseFullScreenIntent();
        }

        boolean exactAlarmGranted = true;
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
            AlarmManager am = (AlarmManager) ctx.getSystemService(Context.ALARM_SERVICE);
            exactAlarmGranted = am == null || am.canScheduleExactAlarms();
        }

        boolean batteryIgnored = true;
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
            PowerManager pm = (PowerManager) ctx.getSystemService(Context.POWER_SERVICE);
            batteryIgnored = pm == null || pm.isIgnoringBatteryOptimizations(ctx.getPackageName());
        }

        JSObject ret = new JSObject();
        ret.put("overlayGranted", overlayGranted);
        ret.put("fullScreenGranted", fullScreenGranted);
        ret.put("exactAlarmGranted", exactAlarmGranted);
        ret.put("batteryIgnored", batteryIgnored);
        ret.put("sdkInt", Build.VERSION.SDK_INT);
        call.resolve(ret);
    }

    @PluginMethod
    public void requestOverlayPermission(PluginCall call) {
        Context ctx = getContext();
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M && !Settings.canDrawOverlays(ctx)) {
            Intent intent = new Intent(
                    Settings.ACTION_MANAGE_OVERLAY_PERMISSION,
                    Uri.parse("package:" + ctx.getPackageName())
            );
            intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
            ctx.startActivity(intent);
        }
        call.resolve();
    }

    @PluginMethod
    public void requestFullScreenPermission(PluginCall call) {
        Context ctx = getContext();
        if (Build.VERSION.SDK_INT >= 34) {
            Intent intent = new Intent(
                    Settings.ACTION_MANAGE_APP_USE_FULL_SCREEN_INTENT,
                    Uri.parse("package:" + ctx.getPackageName())
            );
            intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
            ctx.startActivity(intent);
        }
        call.resolve();
    }

    @PluginMethod
    public void requestBatteryOptimizationExemption(PluginCall call) {
        Context ctx = getContext();
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
            try {
                Intent intent = new Intent(
                        Settings.ACTION_REQUEST_IGNORE_BATTERY_OPTIMIZATIONS,
                        Uri.parse("package:" + ctx.getPackageName())
                );
                intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
                ctx.startActivity(intent);
            } catch (Exception e) {
                Intent fallback = new Intent(Settings.ACTION_IGNORE_BATTERY_OPTIMIZATION_SETTINGS);
                fallback.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
                ctx.startActivity(fallback);
            }
        }
        call.resolve();
    }

    @PluginMethod
    public void requestExactAlarmPermission(PluginCall call) {
        Context ctx = getContext();
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
            Intent intent = new Intent(
                    Settings.ACTION_REQUEST_SCHEDULE_EXACT_ALARM,
                    Uri.parse("package:" + ctx.getPackageName())
            );
            intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
            ctx.startActivity(intent);
        }
        call.resolve();
    }
}
