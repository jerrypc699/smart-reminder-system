import { Task, TaskStatus, PrayerInfo, Employee } from '../types';

const STORAGE_KEY = 'smart_reminder_tasks_v2';
const EMPLOYEES_STORAGE_KEY = 'smart_reminder_employees_v1';

export const INITIAL_EMPLOYEES: Employee[] = [
  {
    id: 'emp-1',
    name: 'م. أحمد الشافعي',
    role: 'مساعد تنفيذي وتقني',
    department: 'المكتب التنفيذي والتقنية',
    phone: '01001234567',
    whatsappPhone: '201001234567',
    email: 'ahmed@smartreminder.clinic',
    notes: 'مسؤول الأنظمة التقنية وجداول الاجتماعات والتقارير التنفيذية.',
    createdAt: new Date().toISOString(),
  },
  {
    id: 'emp-2',
    name: 'د. سارة عادل',
    role: 'منسقة العيادة والملفات الطبية',
    department: 'العيادة الطبية',
    phone: '01123456789',
    whatsappPhone: '201123456789',
    email: 'sara@smartreminder.clinic',
    notes: 'مسؤولة تنسيق مواعيد الكشوفات، ملفات المرضى، ونتائج الفحوصات.',
    createdAt: new Date().toISOString(),
  },
  {
    id: 'emp-3',
    name: 'أ. محمود إبراهيم',
    role: 'سكرتارية ومتابعة المرضى',
    department: 'خدمة العملاء والاستقبال',
    phone: '01234567890',
    whatsappPhone: '201234567890',
    email: 'mahmoud@smartreminder.clinic',
    notes: 'متابعة استفسارات المرضى والاتصالات وتجهيز الوصفات والملفات.',
    createdAt: new Date().toISOString(),
  },
];

export const INITIAL_TASKS: Task[] = [
  {
    id: 'task-1',
    title: 'مراجعة التقرير الطبي والأسبوعي',
    description: 'تدقيق مؤشرات الأداء ومراجعة الأرقام النهائية قبل الاجتماع الدوري',
    category: 'work',
    priority: 'high',
    employeeId: 'emp-1',
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
    employeeId: 'emp-2',
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
    employeeId: 'emp-3',
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
  private taskListeners: Set<(tasks: Task[]) => void> = new Set();
  private employeeListeners: Set<(employees: Employee[]) => void> = new Set();
  private cloudSyncDebounce: any = null;

  public subscribeTasks(cb: (tasks: Task[]) => void): () => void {
    this.taskListeners.add(cb);
    return () => this.taskListeners.delete(cb);
  }

  public subscribeEmployees(cb: (employees: Employee[]) => void): () => void {
    this.employeeListeners.add(cb);
    return () => this.employeeListeners.delete(cb);
  }

  public triggerCloudSync(): void {
    if (typeof window === 'undefined') return;
    clearTimeout(this.cloudSyncDebounce);
    this.cloudSyncDebounce = setTimeout(async () => {
      try {
        const { vercelCloudSync } = await import('./vercelCloudSync');
        vercelCloudSync.pushCurrentState().catch(console.warn);

        const { supabaseService } = await import('./supabaseService');
        if (supabaseService.isConfigured()) {
          supabaseService.syncAllLocalToSupabase().catch(console.warn);
        }
      } catch (e) {
        console.warn('Auto cloud sync failed:', e);
      }
    }, 400);
  }

  /**
   * Load tasks from LocalStorage
   */
  public getTasks(): Task[] {
    if (typeof window === 'undefined') return INITIAL_TASKS;
    try {
      const data = localStorage.getItem(STORAGE_KEY);
      if (!data) {
        return INITIAL_TASKS;
      }
      return JSON.parse(data);
    } catch {
      return INITIAL_TASKS;
    }
  }

  /**
   * Save tasks to LocalStorage and optionally push to central cloud
   */
  public saveTasks(tasks: Task[], skipCloudSync = false): void {
    if (typeof window === 'undefined') return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks));
      this.taskListeners.forEach((cb) => {
        try {
          cb(tasks);
        } catch (e) {
          console.warn('Task listener error:', e);
        }
      });
      if (!skipCloudSync) {
        this.triggerCloudSync();
      }
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
    import('./vercelCloudSync').then(({ vercelCloudSync }) => {
      vercelCloudSync.pushCurrentState({ tasks, deletedTaskIds: [taskId] }).catch(console.warn);
    }).catch(console.warn);
    import('./supabaseService').then(({ supabaseService }) => {
      if (supabaseService.isConfigured()) {
        supabaseService.deleteTask(taskId).catch(console.warn);
      }
    }).catch(console.warn);
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

  /**
   * Get all Employees / Staff profiles
   */
  public getEmployees(): Employee[] {
    if (typeof window === 'undefined') return INITIAL_EMPLOYEES;
    try {
      const data = localStorage.getItem(EMPLOYEES_STORAGE_KEY);
      if (!data) {
        return INITIAL_EMPLOYEES;
      }
      return JSON.parse(data);
    } catch {
      return INITIAL_EMPLOYEES;
    }
  }

  /**
   * Save Employees to LocalStorage and optionally push to central cloud
   */
  public saveEmployees(employees: Employee[], skipCloudSync = false): void {
    if (typeof window === 'undefined') return;
    try {
      localStorage.setItem(EMPLOYEES_STORAGE_KEY, JSON.stringify(employees));
      this.employeeListeners.forEach((cb) => {
        try {
          cb(employees);
        } catch (e) {
          console.warn('Employee listener error:', e);
        }
      });
      if (!skipCloudSync) {
        this.triggerCloudSync();
      }
    } catch (e) {
      console.error('Failed to save employees', e);
    }
  }

  /**
   * Add a new employee profile
   */
  public addEmployee(data: Omit<Employee, 'id' | 'createdAt'>): Employee {
    const list = this.getEmployees();
    const newEmp: Employee = {
      ...data,
      id: `emp-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      createdAt: new Date().toISOString(),
    };
    list.unshift(newEmp);
    this.saveEmployees(list);
    return newEmp;
  }

  /**
   * Update employee profile
   */
  public updateEmployee(id: string, updates: Partial<Employee>): Employee[] {
    const list = this.getEmployees().map((emp) => {
      if (emp.id === id) {
        return { ...emp, ...updates };
      }
      return emp;
    });
    this.saveEmployees(list);
    return list;
  }

  /**
   * Delete employee profile
   */
  public deleteEmployee(id: string): Employee[] {
    const list = this.getEmployees().filter((emp) => emp.id !== id);
    this.saveEmployees(list);
    import('./vercelCloudSync').then(({ vercelCloudSync }) => {
      vercelCloudSync.pushCurrentState({ employees: list, deletedEmployeeIds: [id] }).catch(console.warn);
    }).catch(console.warn);
    import('./supabaseService').then(({ supabaseService }) => {
      if (supabaseService.isConfigured()) {
        supabaseService.deleteEmployee(id).catch(console.warn);
      }
    }).catch(console.warn);
    return list;
  }

  /**
   * Calculate stats for an employee based on tasks
   */
  public getEmployeeStats(employeeId: string, customTasks?: Task[]) {
    const tasks = customTasks || this.getTasks();
    const assignedTasks = tasks.filter((t) => t.employeeId === employeeId);
    const total = assignedTasks.length;
    const completed = assignedTasks.filter((t) => t.status === 'completed').length;
    const pending = assignedTasks.filter((t) => t.status === 'pending' || t.status === 'in_progress').length;
    const urgent = assignedTasks.filter((t) => t.priority === 'urgent' && t.status !== 'completed').length;
    const rate = total > 0 ? Math.round((completed / total) * 100) : 0;
    const attachmentsCount = assignedTasks.reduce((acc, t) => acc + (t.attachments?.length || 0), 0);

    return {
      total,
      completed,
      pending,
      urgent,
      rate,
      attachmentsCount,
      tasks: assignedTasks,
    };
  }
}

export const taskService = new TaskService();
