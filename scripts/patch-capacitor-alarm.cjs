const fs = require('fs');
const path = require('path');

const ncmPath = path.resolve(__dirname, '../node_modules/@capacitor/local-notifications/android/src/main/kotlin/com/capacitorjs/plugins/localnotifications/NotificationChannelManager.kt');
const lnmPath = path.resolve(__dirname, '../node_modules/@capacitor/local-notifications/android/src/main/kotlin/com/capacitorjs/plugins/localnotifications/LocalNotificationManager.kt');

// 1. Patch NotificationChannelManager.kt
if (fs.existsSync(ncmPath)) {
  let content = fs.readFileSync(ncmPath, 'utf8');

  // Replace USAGE_NOTIFICATION with USAGE_ALARM and add FLAG_AUDIBILITY_ENFORCED
  content = content.replace(
    /\.setUsage\(AudioAttributes\.USAGE_NOTIFICATION\)/g,
    '.setUsage(AudioAttributes.USAGE_ALARM)\n                    .setFlags(AudioAttributes.FLAG_AUDIBILITY_ENFORCED)'
  );

  // Add bypass DND to all created channels
  if (!content.includes('notificationChannel.setBypassDnd(true)')) {
    content = content.replace(
      'notificationManager.createNotificationChannel(notificationChannel)',
      'notificationChannel.setBypassDnd(true)\n            notificationManager.createNotificationChannel(notificationChannel)'
    );
  }

  fs.writeFileSync(ncmPath, content, 'utf8');
  console.log('[Patch] NotificationChannelManager.kt patched with USAGE_ALARM and BypassDND.');
}

// 2. Patch LocalNotificationManager.kt
if (fs.existsSync(lnmPath)) {
  let content = fs.readFileSync(lnmPath, 'utf8');

  content = content.replace(
    /\.setUsage\(AudioAttributes\.USAGE_NOTIFICATION\)/g,
    '.setUsage(AudioAttributes.USAGE_ALARM)\n                .setFlags(AudioAttributes.FLAG_AUDIBILITY_ENFORCED)'
  );

  if (!content.includes('mBuilder.setCategory(NotificationCompat.CATEGORY_ALARM)')) {
    content = content.replace(
      'val mBuilder = NotificationCompat.Builder(context, channelId)',
      'val mBuilder = NotificationCompat.Builder(context, channelId)\n        mBuilder.setCategory(NotificationCompat.CATEGORY_ALARM)\n        mBuilder.setPriority(NotificationCompat.PRIORITY_MAX)'
    );
  }

  fs.writeFileSync(lnmPath, content, 'utf8');
  console.log('[Patch] LocalNotificationManager.kt patched with CATEGORY_ALARM and PRIORITY_MAX.');
}
