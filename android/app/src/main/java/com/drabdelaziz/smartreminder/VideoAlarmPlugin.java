package com.drabdelaziz.smartreminder;

import android.Manifest;
import android.app.AlarmManager;
import android.app.NotificationManager;
import android.content.ContentResolver;
import android.content.ContentValues;
import android.content.Context;
import android.content.Intent;
import android.database.Cursor;
import android.net.Uri;
import android.os.Build;
import android.os.Environment;
import android.os.PowerManager;
import android.provider.ContactsContract;
import android.provider.MediaStore;
import android.provider.Settings;
import android.util.Base64;
import androidx.activity.result.ActivityResult;
import androidx.core.content.FileProvider;

import java.io.File;
import java.io.FileOutputStream;
import java.io.OutputStream;

import com.getcapacitor.JSArray;
import com.getcapacitor.JSObject;
import com.getcapacitor.PermissionState;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.ActivityCallback;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.getcapacitor.annotation.Permission;
import com.getcapacitor.annotation.PermissionCallback;

@CapacitorPlugin(
    name = "VideoAlarm",
    permissions = {
        @Permission(
            strings = { Manifest.permission.READ_CONTACTS },
            alias = "contacts"
        )
    }
)
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

    @PluginMethod
    public void openWhatsApp(PluginCall call) {
        String phone = call.getString("phone", "");
        String text = call.getString("text", "");
        Context ctx = getContext();
        JSObject ret = new JSObject();
        try {
            Intent waIntent = TaskWhatsAppAlarmHelper.buildWhatsAppIntent(phone, text);
            ctx.startActivity(waIntent);
            ret.put("opened", true);
        } catch (Exception e) {
            ret.put("opened", false);
            ret.put("error", e.getMessage());
        }
        call.resolve(ret);
    }

    @PluginMethod
    public void syncWhatsAppTaskAlarms(PluginCall call) {
        JSArray alarms = call.getArray("alarms");
        String gatewayConfigJson = call.getString("gatewayConfigJson", "{}");
        int count = TaskWhatsAppAlarmHelper.syncAlarms(getContext(), alarms, gatewayConfigJson);
        JSObject ret = new JSObject();
        ret.put("scheduledCount", count);
        call.resolve(ret);
    }

    @PluginMethod
    public void saveAndOpenFile(PluginCall call) {
        String base64 = call.getString("base64", "");
        String rawName = call.getString("fileName", "report.pdf");
        String mimeType = call.getString("mimeType", "application/pdf");
        boolean shareMode = Boolean.TRUE.equals(call.getBoolean("share", false));

        if (base64 == null || base64.isEmpty()) {
            call.reject("Missing base64 data");
            return;
        }

        Context ctx = getContext();
        try {
            byte[] bytes = Base64.decode(base64, Base64.DEFAULT);
            String safeName = (rawName != null ? rawName : "file.pdf").replaceAll("[\\\\/:*?\"<>|]", "_");

            // 1. Write to app cache directory for FileProvider sharing/viewing
            File shareDir = new File(ctx.getCacheDir(), "shared_docs");
            if (!shareDir.exists()) {
                shareDir.mkdirs();
            }
            File cacheFile = new File(shareDir, safeName);
            try (FileOutputStream fos = new FileOutputStream(cacheFile)) {
                fos.write(bytes);
                fos.flush();
            }

            // 2. Also save a permanent copy to Android Downloads folder on Android 10+ (API 29+)
            boolean savedToDownloads = false;
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
                try {
                    ContentValues values = new ContentValues();
                    values.put(MediaStore.Downloads.DISPLAY_NAME, safeName);
                    values.put(MediaStore.Downloads.MIME_TYPE, mimeType);
                    values.put(MediaStore.Downloads.RELATIVE_PATH, Environment.DIRECTORY_DOWNLOADS + "/DrAbdelazizReports");
                    values.put(MediaStore.Downloads.IS_PENDING, 1);

                    ContentResolver resolver = ctx.getContentResolver();
                    Uri downloadUri = resolver.insert(MediaStore.Downloads.EXTERNAL_CONTENT_URI, values);
                    if (downloadUri != null) {
                        try (OutputStream os = resolver.openOutputStream(downloadUri)) {
                            if (os != null) {
                                os.write(bytes);
                                os.flush();
                            }
                        }
                        values.clear();
                        values.put(MediaStore.Downloads.IS_PENDING, 0);
                        resolver.update(downloadUri, values, null, null);
                        savedToDownloads = true;
                    }
                } catch (Exception ignored) {}
            }

            // 3. Open or Share via FileProvider URI
            Uri contentUri = FileProvider.getUriForFile(
                    ctx,
                    ctx.getPackageName() + ".fileprovider",
                    cacheFile
            );

            if (shareMode) {
                Intent shareIntent = new Intent(Intent.ACTION_SEND);
                shareIntent.setType(mimeType);
                shareIntent.putExtra(Intent.EXTRA_STREAM, contentUri);
                shareIntent.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION);
                Intent chooser = Intent.createChooser(shareIntent, safeName);
                chooser.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
                ctx.startActivity(chooser);
            } else {
                Intent viewIntent = new Intent(Intent.ACTION_VIEW);
                viewIntent.setDataAndType(contentUri, mimeType);
                viewIntent.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION | Intent.FLAG_ACTIVITY_NEW_TASK);
                try {
                    ctx.startActivity(viewIntent);
                } catch (Exception noViewer) {
                    Intent shareIntent = new Intent(Intent.ACTION_SEND);
                    shareIntent.setType(mimeType);
                    shareIntent.putExtra(Intent.EXTRA_STREAM, contentUri);
                    shareIntent.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION);
                    Intent chooser = Intent.createChooser(shareIntent, safeName);
                    chooser.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
                    ctx.startActivity(chooser);
                }
            }

            JSObject ret = new JSObject();
            ret.put("success", true);
            ret.put("savedToDownloads", savedToDownloads);
            ret.put("fileName", safeName);
            call.resolve(ret);
        } catch (Exception e) {
            call.reject("Failed to save/open file: " + e.getMessage());
        }
    }

    @PluginMethod
    public void pickContact(PluginCall call) {
        if (getPermissionState("contacts") != PermissionState.GRANTED) {
            requestPermissionForAlias("contacts", call, "contactsPermCallback");
            return;
        }
        launchContactPicker(call);
    }

    @PermissionCallback
    public void contactsPermCallback(PluginCall call) {
        // Proceed to launch picker whether granted or through intent's own grant
        launchContactPicker(call);
    }

    private void launchContactPicker(PluginCall call) {
        try {
            Intent intent = new Intent(Intent.ACTION_PICK);
            intent.setDataAndType(ContactsContract.Contacts.CONTENT_URI, ContactsContract.CommonDataKinds.Phone.CONTENT_TYPE);

            if (intent.resolveActivity(getContext().getPackageManager()) == null) {
                intent = new Intent(Intent.ACTION_PICK, ContactsContract.CommonDataKinds.Phone.CONTENT_URI);
            }
            if (intent.resolveActivity(getContext().getPackageManager()) == null) {
                intent = new Intent(Intent.ACTION_PICK, ContactsContract.Contacts.CONTENT_URI);
            }

            startActivityForResult(call, intent, "pickContactResult");
        } catch (Exception e) {
            call.reject("تعذر فتح دفتر جهات الاتصال: " + e.getMessage());
        }
    }

    @ActivityCallback
    public void pickContactResult(PluginCall call, ActivityResult result) {
        if (call == null) return;
        if (result == null || result.getResultCode() != android.app.Activity.RESULT_OK || result.getData() == null) {
            JSObject ret = new JSObject();
            ret.put("success", false);
            ret.put("cancelled", true);
            ret.put("message", "تم إلغاء اختيار جهة الاتصال");
            call.resolve(ret);
            return;
        }

        Uri contactUri = result.getData().getData();
        if (contactUri == null) {
            JSObject ret = new JSObject();
            ret.put("success", false);
            ret.put("message", "تعذر قراءة بيانات جهة الاتصال");
            call.resolve(ret);
            return;
        }

        String name = "";
        String rawPhone = "";

        // 1. First Attempt: Try querying directly as CommonDataKinds.Phone
        try (Cursor cursor = getContext().getContentResolver().query(
                contactUri,
                new String[]{
                    ContactsContract.CommonDataKinds.Phone.DISPLAY_NAME,
                    ContactsContract.CommonDataKinds.Phone.NUMBER
                },
                null, null, null)) {
            if (cursor != null && cursor.moveToFirst()) {
                int nameIdx = cursor.getColumnIndex(ContactsContract.CommonDataKinds.Phone.DISPLAY_NAME);
                int phoneIdx = cursor.getColumnIndex(ContactsContract.CommonDataKinds.Phone.NUMBER);
                if (nameIdx >= 0) name = cursor.getString(nameIdx);
                if (phoneIdx >= 0) rawPhone = cursor.getString(phoneIdx);
            }
        } catch (Exception ignored) {
            // Selected URI might be a Contacts.CONTENT_URI instead of a Phone URI
        }

        // 2. Second Attempt: If phone is still empty, query contact by ID to retrieve phone number
        if (rawPhone == null || rawPhone.trim().isEmpty()) {
            try {
                String contactId = null;
                try (Cursor c = getContext().getContentResolver().query(
                        contactUri,
                        new String[]{
                            ContactsContract.Contacts._ID,
                            ContactsContract.Contacts.DISPLAY_NAME
                        },
                        null, null, null)) {
                    if (c != null && c.moveToFirst()) {
                        int idIdx = c.getColumnIndex(ContactsContract.Contacts._ID);
                        int nameIdx = c.getColumnIndex(ContactsContract.Contacts.DISPLAY_NAME);
                        if (idIdx >= 0) contactId = c.getString(idIdx);
                        if (nameIdx >= 0 && (name == null || name.trim().isEmpty())) {
                            name = c.getString(nameIdx);
                        }
                    }
                }

                if (contactId != null) {
                    try (Cursor phoneCursor = getContext().getContentResolver().query(
                            ContactsContract.CommonDataKinds.Phone.CONTENT_URI,
                            new String[]{ ContactsContract.CommonDataKinds.Phone.NUMBER },
                            ContactsContract.CommonDataKinds.Phone.CONTACT_ID + " = ?",
                            new String[]{ contactId },
                            null)) {
                        if (phoneCursor != null && phoneCursor.moveToFirst()) {
                            int pIdx = phoneCursor.getColumnIndex(ContactsContract.CommonDataKinds.Phone.NUMBER);
                            if (pIdx >= 0) rawPhone = phoneCursor.getString(pIdx);
                        }
                    }
                }
            } catch (Exception ignored) {}
        }

        if (rawPhone != null && !rawPhone.trim().isEmpty()) {
            JSObject ret = new JSObject();
            ret.put("success", true);
            ret.put("name", name != null ? name.trim() : "");
            ret.put("phone", rawPhone.trim());
            call.resolve(ret);
        } else {
            JSObject ret = new JSObject();
            ret.put("success", false);
            ret.put("name", name != null ? name.trim() : "");
            ret.put("phone", "");
            ret.put("message", "جهة الاتصال المحددة لا تحتوي على رقم هاتف مسجل");
            call.resolve(ret);
        }
    }
}
