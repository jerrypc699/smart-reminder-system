import { registerPlugin, PluginListenerHandle } from '@capacitor/core';

export interface NativeScheduledAlarmPayload {
  alarmId: number;
  triggerAtMs: number;
  scheduledId: string;
  mediaId: string;
  mediaName: string;
  mediaType: 'video' | 'audio';
  title: string;
  description: string;
  cloudUrl: string;
  isVideo: boolean;
  isTestAlarm?: boolean;
}

export interface ScheduledMediaLaunchEvent {
  scheduledId?: string;
  mediaId: string;
  mediaName?: string;
  mediaType?: 'video' | 'audio';
  title?: string;
  description?: string;
  cloudUrl?: string;
  isVideo?: boolean;
  isTestAlarm?: boolean;
  autoLaunchTimestamp?: number;
}

export interface AutoLaunchPermissionsStatus {
  overlayGranted: boolean;
  fullScreenGranted: boolean;
  exactAlarmGranted: boolean;
  batteryIgnored: boolean;
  sdkInt: number;
}

export interface VideoAlarmPluginInterface {
  syncVideoAlarms(options: { alarms: NativeScheduledAlarmPayload[] }): Promise<{ scheduledCount: number }>;
  scheduleSingleAlarm(options: { alarm: NativeScheduledAlarmPayload }): Promise<{ scheduled: boolean }>;
  getPendingLaunchMedia(): Promise<{ hasPending: boolean; media?: ScheduledMediaLaunchEvent }>;
  getAutoLaunchPermissions(): Promise<AutoLaunchPermissionsStatus>;
  requestOverlayPermission(): Promise<void>;
  requestFullScreenPermission(): Promise<void>;
  requestBatteryOptimizationExemption(): Promise<void>;
  requestExactAlarmPermission(): Promise<void>;
  addListener(
    eventName: 'scheduledMediaLaunch',
    listenerFunc: (data: ScheduledMediaLaunchEvent) => void
  ): Promise<PluginListenerHandle>;
}

export const VideoAlarm = registerPlugin<VideoAlarmPluginInterface>('VideoAlarm');
