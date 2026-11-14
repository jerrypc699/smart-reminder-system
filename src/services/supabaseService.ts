import { createClient, SupabaseClient } from '@supabase/supabase-js';
import type { Task, Employee, ScheduledMedia } from '../types';

const STORAGE_URL_KEY = 'smart_reminder_supabase_url_v1';
const STORAGE_ANON_KEY = 'smart_reminder_supabase_anon_key_v1';

export interface SupabaseConfig {
  url: string;
  anonKey: string;
}

class SupabaseService {
  private client: SupabaseClient | null = null;
  private currentUrl: string = '';
  private currentKey: string = '';
  private channel: any = null;
  private isConnected: boolean = false;

  constructor() {
    this.initFromStorageOrEnv();
  }

  private initFromStorageOrEnv(): void {
    if (typeof window === 'undefined') return;

    try {
      const savedUrl = localStorage.getItem(STORAGE_URL_KEY) || (import.meta as any).env?.VITE_SUPABASE_URL || '';
      const savedKey = localStorage.getItem(STORAGE_ANON_KEY) || (import.meta as any).env?.VITE_SUPABASE_ANON_KEY || '';

      if (savedUrl && savedKey) {
        this.currentUrl = savedUrl.trim();
        this.currentKey = savedKey.trim();
        this.client = createClient(this.currentUrl, this.currentKey, {
          auth: {
            persistSession: false,
            autoRefreshToken: false,
          },
          realtime: {
            params: {
              eventsPerSecond: 10,
            },
          },
        });
      }
    } catch (e) {
      console.warn('Supabase init warning:', e);
    }
  }

  public isConfigured(): boolean {
    return !!(this.client && this.currentUrl && this.currentKey);
  }

  public getIsConnected(): boolean {
    return this.isConnected;
  }

  public getConfig(): SupabaseConfig {
    return {
      url: this.currentUrl,
      anonKey: this.currentKey,
    };
  }

  public setConfig(url: string, anonKey: string): boolean {
    const cleanUrl = url.trim();
    const cleanKey = anonKey.trim();

    if (!cleanUrl || !cleanKey) return false;

    try {
      localStorage.setItem(STORAGE_URL_KEY, cleanUrl);
      localStorage.setItem(STORAGE_ANON_KEY, cleanKey);
      this.currentUrl = cleanUrl;
      this.currentKey = cleanKey;
      this.client = createClient(cleanUrl, cleanKey, {
        auth: {
          persistSession: false,
          autoRefreshToken: false,
        },
      });
      return true;
    } catch (e) {
      console.error('Failed to save Supabase config:', e);
      return false;
    }
  }

  public clearConfig(): void {
    if (typeof window === 'undefined') return;
    try {
      localStorage.removeItem(STORAGE_URL_KEY);
      localStorage.removeItem(STORAGE_ANON_KEY);
      if (this.channel) {
        this.client?.removeChannel(this.channel);
        this.channel = null;
      }
      this.client = null;
      this.currentUrl = '';
      this.currentKey = '';
      this.isConnected = false;
    } catch (e) {
      console.warn('Error clearing Supabase config:', e);
    }
  }

  /**
   * Test live connection to Supabase database
   */
  public async testConnection(): Promise<{ success: boolean; message: string; details?: any }> {
    if (!this.client) {
      return { success: false, message: 'لم يتم إدخال بيانات الربط مع Supabase بعد.' };
    }

    try {
      const { data, error } = await this.client.from('tasks').select('id').limit(1);
      if (error) {
        if (error.code === 'PGRST205' || error.message.includes('relation "tasks" does not exist')) {
          return {
            success: false,
            message: 'تم الاتصال بخادم Supabase، ولكن الجداول غير منشأة بعد. يرجى تنفيذ سكريبت SQL في SQL Editor داخل لوحة تحكم Supabase.',
          };
        }
        return { success: false, message: `خطأ أثناء الاتصال بـ Supabase: ${error.message}` };
      }

      this.isConnected = true;
      return {
        success: true,
        message: '✓ تم الاتصال بقاعدة بيانات Supabase بنجاح! التزامن اللحظي نشط الآن.',
        details: data,
      };
    } catch (err: any) {
      return { success: false, message: `تعذر الاتصال بـ Supabase: ${err.message || 'خطأ في الشبكة'}` };
    }
  }

  // ==========================================
  // Data Mappers (DB Row <-> App Model)
  // ==========================================

  private mapTaskFromDb(row: any): Task {
    return {
      id: row.id,
      title: row.title || '',
      description: row.description || '',
      category: row.category || 'work',
      priority: row.priority || 'medium',
      employeeId: row.employee_id || undefined,
      dueDate: row.due_date || undefined,
      dueTime: row.due_time || undefined,
      reminderMinutesBefore: row.reminder_minutes_before ?? 10,
      voiceMessage: row.voice_message || undefined,
      status: row.status || 'pending',
      repeat: row.repeat || 'none',
      snoozeUntil: row.snooze_until || undefined,
      completedAt: row.completed_at || undefined,
      attachments: Array.isArray(row.attachments) ? row.attachments : [],
      whatsapp: row.whatsapp || undefined,
      createdAt: row.created_at || new Date().toISOString(),
    };
  }

  private mapTaskToDb(task: Task): any {
    return {
      id: task.id,
      title: task.title,
      description: task.description || '',
      category: task.category,
      priority: task.priority,
      employee_id: task.employeeId || null,
      due_date: task.dueDate || null,
      due_time: task.dueTime || null,
      reminder_minutes_before: task.reminderMinutesBefore,
      voice_message: task.voiceMessage || null,
      status: task.status,
      repeat: task.repeat || 'none',
      snooze_until: task.snoozeUntil || null,
      completed_at: task.completedAt || null,
      attachments: task.attachments || [],
      whatsapp: task.whatsapp || {},
      updated_at: new Date().toISOString(),
    };
  }

  private mapEmployeeFromDb(row: any): Employee {
    return {
      id: row.id,
      name: row.name || '',
      role: row.role || '',
      department: row.department || '',
      phone: row.phone || '',
      whatsappPhone: row.whatsapp_phone || '',
      email: row.email || '',
      notes: row.notes || '',
      createdAt: row.created_at || new Date().toISOString(),
    };
  }

  private mapEmployeeToDb(emp: Employee): any {
    return {
      id: emp.id,
      name: emp.name,
      role: emp.role || '',
      department: emp.department || '',
      phone: emp.phone || '',
      whatsapp_phone: emp.whatsappPhone || '',
      email: emp.email || '',
      notes: emp.notes || '',
    };
  }

  private mapScheduledMediaFromDb(row: any): ScheduledMedia {
    return {
      id: row.id,
      mediaId: row.media_id,
      mediaName: row.media_name,
      mediaType: row.media_type || 'video',
      title: row.title || undefined,
      description: row.description || undefined,
      cloudUrl: row.cloud_url || undefined,
      scheduledDate: row.scheduled_date || undefined,
      scheduledTime: row.scheduled_time || '',
      repeat: row.repeat || 'none',
      duration: row.duration || 0,
      volume: row.volume ?? 1.0,
      enabled: row.enabled ?? true,
      thumbnail: row.thumbnail || undefined,
      lastPlayedAt: row.last_played_at || undefined,
      createdAt: row.created_at || new Date().toISOString(),
    };
  }

  private mapScheduledMediaToDb(media: ScheduledMedia): any {
    return {
      id: media.id,
      media_id: media.mediaId,
      media_name: media.mediaName,
      media_type: media.mediaType || 'video',
      title: media.title || null,
      description: media.description || null,
      cloud_url: media.cloudUrl || null,
      scheduled_date: media.scheduledDate || null,
      scheduled_time: media.scheduledTime || '',
      repeat: media.repeat || 'none',
      duration: media.duration || 0,
      volume: media.volume ?? 1.0,
      enabled: media.enabled ?? true,
      thumbnail: media.thumbnail || null,
      last_played_at: media.lastPlayedAt || null,
    };
  }

  // ==========================================
  // Realtime Subscriptions (WebSockets)
  // ==========================================

  public subscribeRealtime(callbacks: {
    onTasksChange?: () => void;
    onEmployeesChange?: () => void;
    onScheduledMediaChange?: () => void;
    onSystemStateChange?: (key: string, payload: any) => void;
  }): () => void {
    if (!this.client) return () => {};

    try {
      this.channel = this.client
        .channel('smart_reminder_realtime')
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'tasks' },
          () => {
            callbacks.onTasksChange?.();
          }
        )
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'employees' },
          () => {
            callbacks.onEmployeesChange?.();
          }
        )
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'scheduled_media' },
          () => {
            callbacks.onScheduledMediaChange?.();
          }
        )
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'system_state' },
          (payload) => {
            const newRow = payload.new as Record<string, any> | undefined;
            const oldRow = payload.old as Record<string, any> | undefined;
            const key = newRow?.key || oldRow?.key;
            const data = newRow?.payload;
            if (key) {
              callbacks.onSystemStateChange?.(key, data);
            }
          }
        )
        .subscribe((status) => {
          if (status === 'SUBSCRIBED') {
            this.isConnected = true;
          }
        });

      return () => {
        if (this.channel) {
          this.client?.removeChannel(this.channel);
          this.channel = null;
        }
      };
    } catch (err) {
      console.warn('Realtime subscription error:', err);
      return () => {};
    }
  }

  // ==========================================
  // CRUD Operations
  // ==========================================

  public async fetchTasks(): Promise<Task[]> {
    if (!this.client) return [];
    try {
      const { data, error } = await this.client
        .from('tasks')
        .select('*')
        .order('created_at', { ascending: false });

      if (error || !data) return [];
      return data.map((row) => this.mapTaskFromDb(row));
    } catch {
      return [];
    }
  }

  public async upsertTask(task: Task): Promise<boolean> {
    if (!this.client) return false;
    try {
      const payload = this.mapTaskToDb(task);
      const { error } = await this.client.from('tasks').upsert(payload);
      return !error;
    } catch {
      return false;
    }
  }

  public async deleteTask(id: string): Promise<boolean> {
    if (!this.client) return false;
    try {
      const { error } = await this.client.from('tasks').delete().eq('id', id);
      return !error;
    } catch {
      return false;
    }
  }

  public async fetchEmployees(): Promise<Employee[]> {
    if (!this.client) return [];
    try {
      const { data, error } = await this.client
        .from('employees')
        .select('*')
        .order('created_at', { ascending: true });

      if (error || !data) return [];
      return data.map((row) => this.mapEmployeeFromDb(row));
    } catch {
      return [];
    }
  }

  public async upsertEmployee(emp: Employee): Promise<boolean> {
    if (!this.client) return false;
    try {
      const payload = this.mapEmployeeToDb(emp);
      const { error } = await this.client.from('employees').upsert(payload);
      return !error;
    } catch {
      return false;
    }
  }

  public async deleteEmployee(id: string): Promise<boolean> {
    if (!this.client) return false;
    try {
      const { error } = await this.client.from('employees').delete().eq('id', id);
      return !error;
    } catch {
      return false;
    }
  }

  public async fetchScheduledMedia(): Promise<ScheduledMedia[]> {
    if (!this.client) return [];
    try {
      const { data, error } = await this.client
        .from('scheduled_media')
        .select('*')
        .order('created_at', { ascending: false });

      if (error || !data) return [];
      return data.map((row) => this.mapScheduledMediaFromDb(row));
    } catch {
      return [];
    }
  }

  public async upsertScheduledMedia(media: ScheduledMedia): Promise<boolean> {
    if (!this.client) return false;
    try {
      const payload = this.mapScheduledMediaToDb(media);
      const { error } = await this.client.from('scheduled_media').upsert(payload);
      return !error;
    } catch {
      return false;
    }
  }

  public async deleteScheduledMedia(id: string): Promise<boolean> {
    if (!this.client) return false;
    try {
      const { error } = await this.client.from('scheduled_media').delete().eq('id', id);
      return !error;
    } catch {
      return false;
    }
  }

  public async getSystemState(key: string): Promise<any> {
    if (!this.client) return null;
    try {
      const { data, error } = await this.client
        .from('system_state')
        .select('payload')
        .eq('key', key)
        .single();

      if (error || !data) return null;
      return data.payload;
    } catch {
      return null;
    }
  }

  public async setSystemState(key: string, payload: any): Promise<boolean> {
    if (!this.client) return false;
    try {
      const { error } = await this.client.from('system_state').upsert({
        key,
        payload,
        updated_at: new Date().toISOString(),
      });
      return !error;
    } catch {
      return false;
    }
  }

  /**
   * Sync all local data into Supabase in one operation
   */
  public async syncAllLocalToSupabase(): Promise<{
    success: boolean;
    tasksCount: number;
    employeesCount: number;
    scheduledCount: number;
    error?: string;
  }> {
    if (!this.client) {
      return { success: false, tasksCount: 0, employeesCount: 0, scheduledCount: 0, error: 'Supabase غير مهيأ' };
    }

    try {
      const { taskService } = await import('./taskService');
      const { audioStorageService } = await import('./audioStorageService');
      const { dailySystemService } = await import('./dailySystemService');
      const { whatsappService } = await import('./whatsappService');

      const tasks = taskService.getTasks();
      const employees = taskService.getEmployees();
      const scheduledMedia = audioStorageService.getScheduledMedias();

      // Upsert employees
      if (employees.length > 0) {
        const empRows = employees.map((e) => this.mapEmployeeToDb(e));
        await this.client.from('employees').upsert(empRows);
      }

      // Upsert tasks
      if (tasks.length > 0) {
        const taskRows = tasks.map((t) => this.mapTaskToDb(t));
        await this.client.from('tasks').upsert(taskRows);
      }

      // Upsert scheduled media
      if (scheduledMedia.length > 0) {
        const mediaRows = scheduledMedia.map((m) => this.mapScheduledMediaToDb(m));
        await this.client.from('scheduled_media').upsert(mediaRows);
      }

      // Upsert system state
      await this.setSystemState('daily_system', dailySystemService.exportForCloud());
      await this.setSystemState('whatsapp_settings', whatsappService.getSettings());

      this.isConnected = true;
      return {
        success: true,
        tasksCount: tasks.length,
        employeesCount: employees.length,
        scheduledCount: scheduledMedia.length,
      };
    } catch (err: any) {
      return {
        success: false,
        tasksCount: 0,
        employeesCount: 0,
        scheduledCount: 0,
        error: err.message,
      };
    }
  }
}

export const supabaseService = new SupabaseService();
