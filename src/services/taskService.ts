import { Task, TaskPriority, TaskCategory, TaskStatus, PrayerInfo } from '../types';

const STORAGE_KEY = 'smart_reminder_tasks_v2';

export const INITIAL_TASKS: Task[] = [
  {
    id: 'task-1',
    title: 'مراجعة التقرير الطبي والأسبوعي',
    description: 'تدقيق مؤشرات الأداء ومراجعة الأرقام النهائية قبل الاجتماع الدوري',
    category: 'work',
    priority: 'high',
    dueDate: new Date().toISOString().split('T')[0],
    dueTime: '11:00',
    reminderMinutesBefore: 10,
    voiceMessage: 'يا دكتور عبد العزيز، تنبيه مهم: يرجى مراجعة التقرير وتدقيق الأرقام قبل الاجتماع.',
    status: 'pending',
    repeat: 'none',
    createdAt: new Date().toISOString(),
  },
  {
    id: 'task-2',
    title: 'اجتماع تنسيق فريق العمل عبر زووم',
    description: 'مناقشة خطة تسليم مهام المرحلة الثانية وتوزيع الأدوار',
    category: 'meeting',
    priority: 'urgent',
    dueDate: new Date().toISOString().split('T')[0],
    dueTime: '14:30',
    reminderMinutesBefore: 15,
    voiceMessage: 'يا دكتور عبد العزيز، تذكير عاجل: موعد اجتماع فريق العمل يبدأ بعد قليل، يرجى الاستعداد والانضمام.',
    status: 'pending',
    repeat: 'none',
    createdAt: new Date().toISOString(),
  },
  {
    id: 'task-3',
    title: 'استراحة وتجديد النشاط وشرب الماء',
    description: 'تمارين تمدد خفيفة وإراحة العينين من شاشات الحاسوب',
    category: 'health',
    priority: 'low',
    dueDate: new Date().toISOString().split('T')[0],
    dueTime: '16:00',
    reminderMinutesBefore: 0,
    voiceMessage: 'يا دكتور عبد العزيز، حان وقت استراحة صحية قصيرة، تذكر شرب كوب ماء والابتعاد عن الشاشة قليلاً.',
    status: 'pending',
    repeat: 'daily',
    createdAt: new Date().toISOString(),
  },
];

export class TaskService {
  /**
   * Load tasks from LocalStorage
   */
  public getTasks(): Task[] {
    if (typeof window === 'undefined') return INITIAL_TASKS;
    try {
      const data = localStorage.getItem(STORAGE_KEY);
      if (!data) {
        this.saveTasks(INITIAL_TASKS);
        return INITIAL_TASKS;
      }
      return JSON.parse(data);
    } catch {
      return INITIAL_TASKS;
    }
  }

  /**
   * Save tasks to LocalStorage
   */
  public saveTasks(tasks: Task[]): void {
    if (typeof window === 'undefined') return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks));
    } catch (e) {
      console.error('Failed to save tasks', e);
    }
  }

  /**
   * Add a new task
   */
  public addTask(taskData: Omit<Task, 'id' | 'createdAt' | 'status'>): Task {
    const tasks = this.getTasks();
    const newTask: Task = {
      ...taskData,
      id: `task-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      status: 'pending',
      createdAt: new Date().toISOString(),
    };
    tasks.unshift(newTask);
    this.saveTasks(tasks);
    return newTask;
  }

  /**
   * Update task
   */
  public updateTask(taskId: string, updates: Partial<Task>): Task[] {
    const tasks = this.getTasks().map((t) => {
      if (t.id === taskId) {
        return { ...t, ...updates };
      }
      return t;
    });
    this.saveTasks(tasks);
    return tasks;
  }

  /**
   * Toggle completion
   */
  public toggleTaskStatus(taskId: string): { tasks: Task[]; completed: boolean } {
    const tasks = this.getTasks();
    let completed = false;

    const updated: Task[] = tasks.map((t) => {
      if (t.id === taskId) {
        const nextStatus: TaskStatus = t.status === 'completed' ? 'pending' : 'completed';
        completed = nextStatus === 'completed';
        return {
          ...t,
          status: nextStatus,
          completedAt: completed ? new Date().toISOString() : undefined,
        };
      }
      return t;
    });

    this.saveTasks(updated);
    return { tasks: updated, completed };
  }

  /**
   * Snooze a task
   */
  public snoozeTask(taskId: string, minutes: number = 10): Task[] {
    const snoozeTime = new Date(Date.now() + minutes * 60 * 1000).toISOString();
    return this.updateTask(taskId, {
      status: 'snoozed',
      snoozeUntil: snoozeTime,
    });
  }

  /**
   * Delete task
   */
  public deleteTask(taskId: string): Task[] {
    const tasks = this.getTasks().filter((t) => t.id !== taskId);
    this.saveTasks(tasks);
    return tasks;
  }

  /**
   * Check if a task conflicts with any prayer times (within 15 minutes)
   */
  public checkPrayerConflict(
    taskDate: string,
    taskTime: string,
    prayers: PrayerInfo[]
  ): { hasConflict: boolean; prayer?: PrayerInfo; minutesDiff?: number } {
    if (!taskDate || !taskTime || !prayers || prayers.length === 0) {
      return { hasConflict: false };
    }

    try {
      const [hours, minutes] = taskTime.split(':').map(Number);
      const taskDateTime = new Date(`${taskDate}T00:00:00`);
      taskDateTime.setHours(hours, minutes, 0, 0);

      for (const prayer of prayers) {
        if (prayer.id === 'sunrise') continue; // Sunrise is not a prayer
        const diffMs = Math.abs(taskDateTime.getTime() - prayer.time.getTime());
        const diffMins = Math.floor(diffMs / (60 * 1000));

        if (diffMins <= 15) {
          return {
            hasConflict: true,
            prayer,
            minutesDiff: diffMins,
          };
        }
      }
    } catch {
      // Ignore date parsing errors
    }

    return { hasConflict: false };
  }
}

export const taskService = new TaskService();
