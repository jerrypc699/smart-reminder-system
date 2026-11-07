import React, { useState, useEffect, useRef } from 'react';
import { 
  CheckSquare, 
  Plus, 
  Search, 
  Clock, 
  AlertCircle, 
  Volume2, 
  CheckCircle2, 
  Trash2, 
  Edit3, 
  RotateCcw,
  Sparkles,
  AlertTriangle,
  X,
  FileAudio,
  Music,
  UploadCloud,
  Mic,
  Play,
  Square
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { Task, TaskPriority, TaskCategory, PrayerInfo, TaskAudioMode, StoredAudioMeta } from '../types';
import { audioStorageService } from '../services/audioStorageService';
import { vercelCloudSync } from '../services/vercelCloudSync';

interface TasksViewProps {
  tasks: Task[];
  prayerTimes: PrayerInfo[];
  onAddTask: (task: Omit<Task, 'id' | 'createdAt' | 'status'>) => void;
  onUpdateTask: (taskId: string, updates: Partial<Task>) => void;
  onDeleteTask: (taskId: string) => void;
  onToggleTask: (taskId: string) => void;
  onSnoozeTask: (taskId: string, minutes: number) => void;
  onPreviewTaskAudio: (task: Task) => void;
}

export const TasksView: React.FC<TasksViewProps> = ({
  tasks,
  prayerTimes,
  onAddTask,
  onUpdateTask,
  onDeleteTask,
  onToggleTask,
  onSnoozeTask,
  onPreviewTaskAudio,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFilter, setSelectedFilter] = useState<'all' | 'today' | 'urgent' | 'pending' | 'completed'>('all');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);

  // Form State
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [dueDate, setDueDate] = useState(new Date().toISOString().split('T')[0]);
  const [dueTime, setDueTime] = useState('11:00');
  const [priority, setPriority] = useState<TaskPriority>('medium');
  const [category, setCategory] = useState<TaskCategory>('work');
  const [reminderMinutesBefore, setReminderMinutesBefore] = useState<number>(5);
  const [voiceMessage, setVoiceMessage] = useState('');
  const [audioMode, setAudioMode] = useState<TaskAudioMode>('tts');
  const [customAudioId, setCustomAudioId] = useState<string>('');
  const [customAudioName, setCustomAudioName] = useState<string>('');
  const [taskCloudUrl, setTaskCloudUrl] = useState<string>('');
  const [isUploadingMedia, setIsUploadingMedia] = useState<boolean>(false);
  const [audioLibrary, setAudioLibrary] = useState<StoredAudioMeta[]>([]);
  const [isRecordingInTask, setIsRecordingInTask] = useState(false);
  const [taskRecordSeconds, setTaskRecordSeconds] = useState(0);

  const taskMediaRecorderRef = useRef<MediaRecorder | null>(null);
  const taskAudioChunksRef = useRef<Blob[]>([]);
  const taskTimerRef = useRef<any>(null);

  const todayStr = new Date().toISOString().split('T')[0];

  useEffect(() => {
    const loadAudioLib = async () => {
      const list = await audioStorageService.getAllAudioMeta();
      setAudioLibrary(list);
    };
    loadAudioLib();
  }, [isAddModalOpen]);

  // Handle uploading media specifically for this task
  const handleTaskAudioUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    try {
      setIsUploadingMedia(true);
      const file = files[0];
      const meta = await audioStorageService.saveMediaFile(file, file.name.replace(/\.[^/.]+$/, ''), 'task');
      setCustomAudioId(meta.id);
      setCustomAudioName(meta.name);
      setAudioMode('custom');
      const updatedLib = await audioStorageService.getAllMediaMeta();
      setAudioLibrary(updatedLib);

      // Upload to Vercel Blob so it's accessible across PC, Mobile, and Native App
      try {
        const cloudUrl = await vercelCloudSync.uploadMediaFile(file, file.name);
        setTaskCloudUrl(cloudUrl);
      } catch (uploadErr) {
        console.warn('Task audio upload to cloud warning:', uploadErr);
      }
    } catch (err: any) {
      alert('فشل رفع الملف: ' + err.message);
    } finally {
      setIsUploadingMedia(false);
      e.target.value = '';
    }
  };

  // Direct Recording in task form
  const startTaskRecording = async () => {
    try {
      taskAudioChunksRef.current = [];
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mr = new MediaRecorder(stream);
      taskMediaRecorderRef.current = mr;

      mr.ondataavailable = (e) => {
        if (e.data.size > 0) taskAudioChunksRef.current.push(e.data);
      };

      mr.onstop = async () => {
        const blob = new Blob(taskAudioChunksRef.current, { type: 'audio/webm' });
        const name = `تسجيل مهمة (${title.trim() || 'تذكير'})`;
        const meta = await audioStorageService.saveAudioFile(blob, name, 'task');
        setCustomAudioId(meta.id);
        setCustomAudioName(meta.name);
        setAudioMode('custom');
        const updatedLib = await audioStorageService.getAllAudioMeta();
        setAudioLibrary(updatedLib);
        stream.getTracks().forEach((t) => t.stop());

        // Background upload to cloud storage
        try {
          const cloudUrl = await vercelCloudSync.uploadMediaFile(blob, `${name}.webm`);
          setTaskCloudUrl(cloudUrl);
        } catch (uploadErr) {
          console.warn('Recorded task voice cloud upload warning:', uploadErr);
        }
      };

      mr.start();
      setIsRecordingInTask(true);
      setTaskRecordSeconds(0);
      taskTimerRef.current = setInterval(() => {
        setTaskRecordSeconds((s) => s + 1);
      }, 1000);
    } catch (err: any) {
      alert('تعذر فتح الميكروفون: ' + err.message);
    }
  };

  const stopTaskRecording = () => {
    if (taskMediaRecorderRef.current && isRecordingInTask) {
      taskMediaRecorderRef.current.stop();
      setIsRecordingInTask(false);
      clearInterval(taskTimerRef.current);
    }
  };

  // Check prayer conflict dynamically in the form
  const checkConflict = (date: string, time: string) => {
    if (!time || !prayerTimes || prayerTimes.length === 0) return null;
    const [h, m] = time.split(':').map(Number);
    const target = new Date(`${date}T00:00:00`);
    target.setHours(h, m, 0, 0);

    for (const p of prayerTimes) {
      if (p.id === 'sunrise') continue;
      const diffMins = Math.abs(Math.floor((target.getTime() - p.time.getTime()) / (60 * 1000)));
      if (diffMins <= 15) {
        return { prayer: p, diffMins };
      }
    }
    return null;
  };

  const currentConflict = checkConflict(dueDate, dueTime);

  const resetForm = () => {
    setTitle('');
    setDescription('');
    setDueDate(todayStr);
    setDueTime('11:00');
    setPriority('medium');
    setCategory('work');
    setReminderMinutesBefore(5);
    setVoiceMessage('');
    setAudioMode('tts');
    setCustomAudioId('');
    setCustomAudioName('');
    setTaskCloudUrl('');
    setEditingTask(null);
  };

  const handleOpenEdit = (task: Task) => {
    setEditingTask(task);
    setTitle(task.title);
    setDescription(task.description || '');
    setDueDate(task.dueDate);
    setDueTime(task.dueTime);
    setPriority(task.priority);
    setCategory(task.category);
    setReminderMinutesBefore(task.reminderMinutesBefore);
    setVoiceMessage(task.voiceMessage || '');
    setAudioMode(task.audioMode || (task.customAudioId ? 'custom' : 'tts'));
    setCustomAudioId(task.customAudioId || '');
    setCustomAudioName(task.customAudioName || '');
    setTaskCloudUrl(task.cloudUrl || '');
    setIsAddModalOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    const cleanVoiceMsg = voiceMessage.trim();
    const prefix = 'يا دكتور عبد العزيز، ';
    let finalVoiceMessage = cleanVoiceMsg;
    if (!finalVoiceMessage) {
      finalVoiceMessage = `${prefix}تنبيه لمهمة عمل: ${title.trim()}. ${
        priority === 'urgent' ? 'هذه المهمة عاجلة جداً.' : priority === 'high' ? 'أولوية مرتفعة.' : ''
      } يرجى المتابعة الآن.`;
    } else if (!finalVoiceMessage.startsWith('يا دكتور عبد العزيز') && !finalVoiceMessage.startsWith('دكتور عبد العزيز')) {
      finalVoiceMessage = `${prefix}${finalVoiceMessage}`;
    }

    if (editingTask) {
      onUpdateTask(editingTask.id, {
        title: title.trim(),
        description: description.trim() || undefined,
        dueDate,
        dueTime,
        priority,
        category,
        reminderMinutesBefore,
        voiceMessage: finalVoiceMessage,
        audioMode,
        customAudioId: audioMode === 'custom' ? customAudioId : undefined,
        customAudioName: audioMode === 'custom' ? customAudioName : undefined,
        cloudUrl: audioMode === 'custom' ? (taskCloudUrl || editingTask.cloudUrl) : undefined,
      });
    } else {
      onAddTask({
        title: title.trim(),
        description: description.trim() || undefined,
        dueDate,
        dueTime,
        priority,
        category,
        reminderMinutesBefore,
        voiceMessage: finalVoiceMessage,
        repeat: 'none',
        audioMode,
        customAudioId: audioMode === 'custom' ? customAudioId : undefined,
        customAudioName: audioMode === 'custom' ? customAudioName : undefined,
        cloudUrl: audioMode === 'custom' ? taskCloudUrl : undefined,
      });
    }

    setIsAddModalOpen(false);
    resetForm();
  };

  const handleToggle = (taskId: string) => {
    onToggleTask(taskId);
    confetti({
      particleCount: 60,
      spread: 70,
      origin: { y: 0.8 },
      colors: ['#10b981', '#3b82f6', '#f59e0b', '#6366f1'],
    });
  };

  // Filter tasks
  const filteredTasks = tasks.filter((t) => {
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchTitle = t.title.toLowerCase().includes(q);
      const matchDesc = t.description?.toLowerCase().includes(q);
      if (!matchTitle && !matchDesc) return false;
    }

    if (selectedCategory !== 'all' && t.category !== selectedCategory) {
      return false;
    }

    if (selectedFilter === 'today') {
      return t.dueDate === todayStr;
    }
    if (selectedFilter === 'urgent') {
      return t.priority === 'urgent' && t.status !== 'completed';
    }
    if (selectedFilter === 'pending') {
      return t.status !== 'completed';
    }
    if (selectedFilter === 'completed') {
      return t.status === 'completed';
    }
    return true;
  });

  const getCategoryLabel = (cat: TaskCategory) => {
    switch (cat) {
      case 'clinic':
        return 'عيادة ومرضى 🩺';
      case 'work':
        return 'عمل';
      case 'meeting':
        return 'اجتماع';
      case 'dev':
        return 'برمجة وتطوير';
      case 'admin':
        return 'إداري';
      case 'personal':
        return 'شخصي';
      case 'health':
        return 'صحي واستراحة';
    }
  };

  return (
    <div className="space-y-6 animate-fade-in pb-12">
      {/* Top Controls: Search, Add Button, Statistics */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-white flex items-center gap-2">
            <CheckSquare className="w-6 h-6 text-emerald-400" />
            مهام العمل والمواعيد مع التذكير الصوتي
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            إدارة وتنظيم المهام مع نطق صوتي ذكي وتحذير تلقائي من التعارض مع مواقيت الصلاة
          </p>
        </div>

        <button
          onClick={() => {
            resetForm();
            setIsAddModalOpen(true);
          }}
          className="flex items-center justify-center gap-2 px-5 py-3 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-500 hover:from-emerald-500 hover:to-teal-400 text-white font-bold text-sm shadow-lg shadow-emerald-500/20 transition-all cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>إضافة مهمة جديدة</span>
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="p-4 rounded-3xl bg-slate-900 border border-slate-800 shadow-xl space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          {/* Search Box */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              placeholder="البحث في المهام والاجتماعات..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pr-10 pl-4 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-white placeholder-slate-500 text-sm focus:outline-none focus:border-emerald-500"
            />
          </div>

          {/* Category Filter */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1 md:pb-0 scrollbar-none">
            <span className="text-xs text-slate-400 whitespace-nowrap ml-1">التصنيف:</span>
            {[
              { id: 'all', label: 'الكل' },
              { id: 'work', label: 'عمل' },
              { id: 'meeting', label: 'اجتماعات' },
              { id: 'dev', label: 'برمجة' },
              { id: 'health', label: 'صحي' },
            ].map((cat) => (
              <button
                key={cat.id}
                onClick={() => setSelectedCategory(cat.id)}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-colors cursor-pointer border ${
                  selectedCategory === cat.id
                    ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                    : 'bg-slate-800/80 text-slate-400 border-slate-700 hover:text-white'
                }`}
              >
                {cat.label}
              </button>
            ))}
          </div>
        </div>

        {/* Status Filters */}
        <div className="flex items-center gap-2 pt-2 border-t border-slate-800/80 overflow-x-auto scrollbar-none">
          {[
            { id: 'all', label: 'كافة المهام', count: tasks.length },
            { id: 'today', label: 'مهام اليوم', count: tasks.filter((t) => t.dueDate === todayStr).length },
            { id: 'urgent', label: 'عاجلة جداً', count: tasks.filter((t) => t.priority === 'urgent' && t.status !== 'completed').length },
            { id: 'pending', label: 'قيد الانتظار', count: tasks.filter((t) => t.status !== 'completed').length },
            { id: 'completed', label: 'مكتملة', count: tasks.filter((t) => t.status === 'completed').length },
          ].map((f) => (
            <button
              key={f.id}
              onClick={() => setSelectedFilter(f.id as any)}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-colors cursor-pointer border ${
                selectedFilter === f.id
                  ? 'bg-slate-700 text-white border-slate-600'
                  : 'bg-transparent text-slate-400 border-transparent hover:text-slate-200'
              }`}
            >
              <span>{f.label}</span>
              <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-slate-800 text-slate-300">
                {f.count}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Task List */}
      {filteredTasks.length === 0 ? (
        <div className="text-center py-16 px-4 rounded-3xl bg-slate-900 border border-slate-800">
          <CheckSquare className="w-12 h-12 text-slate-600 mx-auto mb-3" />
          <h3 className="text-lg font-bold text-slate-300 mb-1">لا توجد مهام مطابقة</h3>
          <p className="text-xs text-slate-500 mb-6">
            يمكنك إضافة مهمة جديدة وتحديد موعد تذكير صوتي لها في أي وقت.
          </p>
          <button
            onClick={() => {
              resetForm();
              setIsAddModalOpen(true);
            }}
            className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold cursor-pointer"
          >
            إضافة مهمة الآن
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {filteredTasks.map((task) => {
            const isCompleted = task.status === 'completed';
            const isUrgent = task.priority === 'urgent';
            const conflict = checkConflict(task.dueDate, task.dueTime);

            return (
              <div
                key={task.id}
                className={`p-5 rounded-3xl border transition-all ${
                  isCompleted
                    ? 'bg-slate-900/40 border-slate-800/80 opacity-70'
                    : isUrgent
                    ? 'bg-slate-900 border-rose-500/40 shadow-rose-500/10'
                    : 'bg-slate-900 border-slate-800 hover:border-slate-700'
                }`}
              >
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  {/* Title & Checkbox */}
                  <div className="flex items-start gap-4 flex-1">
                    <button
                      onClick={() => handleToggle(task.id)}
                      className={`mt-1 w-6 h-6 rounded-lg flex items-center justify-center transition-all cursor-pointer border ${
                        isCompleted
                          ? 'bg-emerald-500 border-emerald-400 text-white'
                          : 'bg-slate-800 border-slate-600 hover:border-emerald-500 text-transparent'
                      }`}
                    >
                      <CheckCircle2 className="w-4 h-4 fill-current" />
                    </button>

                    <div className="space-y-1.5 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3
                          className={`text-base font-bold ${
                            isCompleted ? 'line-through text-slate-500' : 'text-white'
                          }`}
                        >
                          {task.title}
                        </h3>

                        {/* Priority Badge */}
                        <span
                          className={`text-[10px] px-2.5 py-0.5 rounded-full font-bold border ${
                            task.priority === 'urgent'
                              ? 'bg-rose-500/20 text-rose-300 border-rose-500/30'
                              : task.priority === 'high'
                              ? 'bg-amber-500/20 text-amber-300 border-amber-500/30'
                              : 'bg-blue-500/20 text-blue-300 border-blue-500/30'
                          }`}
                        >
                          {task.priority === 'urgent'
                            ? 'عاجل جداً'
                            : task.priority === 'high'
                            ? 'أولوية مرتفعة'
                            : task.priority === 'medium'
                            ? 'أولوية متوسطة'
                            : 'منخفضة'}
                        </span>

                        {/* Category Badge */}
                        <span className="text-[10px] px-2.5 py-0.5 rounded-full bg-slate-800 text-slate-300 border border-slate-700">
                          {getCategoryLabel(task.category)}
                        </span>

                        {/* Snooze Badge */}
                        {task.status === 'snoozed' && (
                          <span className="text-[10px] px-2.5 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30 font-semibold">
                            مؤجل
                          </span>
                        )}
                      </div>

                      {task.description && (
                        <p className="text-xs text-slate-400 leading-relaxed">
                          {task.description}
                        </p>
                      )}

                      {/* Custom Audio Badge if attached */}
                      {task.customAudioName && (
                        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-cyan-500/10 border border-cyan-500/30 text-cyan-300 text-xs mt-1">
                          <FileAudio className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                          <span>تنبيه صوتي مخصص: {task.customAudioName}</span>
                        </div>
                      )}

                      {/* Smart Prayer Conflict Warning Badge */}
                      {conflict && !isCompleted && (
                        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs mt-1">
                          <AlertTriangle className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                          <span>
                            تزامن قريب مع صلاة {conflict.prayer.arabicName} ({conflict.prayer.formatted12h}) بفارق {conflict.diffMins} دقيقة
                          </span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Date, Time & Action Buttons */}
                  <div className="flex flex-wrap items-center justify-between md:justify-end gap-3 pt-3 md:pt-0 border-t md:border-t-0 border-slate-800">
                    <div className="flex items-center gap-2 font-mono text-xs text-slate-300 bg-slate-800/80 px-3 py-1.5 rounded-xl border border-slate-700">
                      <Clock className="w-3.5 h-3.5 text-emerald-400" />
                      <span>{task.dueTime}</span>
                      <span>•</span>
                      <span>{task.dueDate}</span>
                    </div>

                    <div className="flex items-center gap-1.5">
                      {/* Audio Voice Test */}
                      <button
                        onClick={() => onPreviewTaskAudio(task)}
                        title="استماع للتنبيه الصوتي للمهمة"
                        className="p-2 rounded-xl bg-slate-800 hover:bg-emerald-500/20 text-slate-300 hover:text-emerald-400 border border-slate-700 hover:border-emerald-500/30 transition-colors cursor-pointer"
                      >
                        <Volume2 className="w-4 h-4" />
                      </button>

                      {/* Snooze 10 mins */}
                      {!isCompleted && (
                        <button
                          onClick={() => onSnoozeTask(task.id, 10)}
                          title="تأجيل 10 دقائق"
                          className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-amber-400 border border-slate-700 transition-colors cursor-pointer"
                        >
                          <RotateCcw className="w-4 h-4" />
                        </button>
                      )}

                      {/* Edit */}
                      <button
                        onClick={() => handleOpenEdit(task)}
                        title="تعديل المهمة"
                        className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-blue-400 border border-slate-700 transition-colors cursor-pointer"
                      >
                        <Edit3 className="w-4 h-4" />
                      </button>

                      {/* Delete */}
                      <button
                        onClick={() => onDeleteTask(task.id)}
                        title="حذف المهمة"
                        className="p-2 rounded-xl bg-slate-800 hover:bg-rose-500/20 text-slate-300 hover:text-rose-400 border border-slate-700 hover:border-rose-500/30 transition-colors cursor-pointer"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Add / Edit Task Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md animate-fade-in">
          <div className="relative w-full max-w-lg p-6 sm:p-8 rounded-3xl bg-slate-900 border border-slate-700 shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold text-white flex items-center gap-2">
                <CheckSquare className="w-5 h-5 text-emerald-400" />
                {editingTask ? 'تعديل مهمة العمل' : 'إضافة مهمة عمل جديدة'}
              </h3>
              <button
                onClick={() => setIsAddModalOpen(false)}
                className="p-2 rounded-xl bg-slate-800 text-slate-400 hover:text-white cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  عنوان المهمة أو الاجتماع *
                </label>
                <input
                  type="text"
                  placeholder="مثال: تقديم العرض التوضيحي للعميل"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-white placeholder-slate-500 text-sm focus:outline-none focus:border-emerald-500"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  الوصف أو الملاحظات (اختياري)
                </label>
                <textarea
                  rows={2}
                  placeholder="نقاط هامة أو جدول أعمال..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full px-4 py-2 rounded-xl bg-slate-800 border border-slate-700 text-white placeholder-slate-500 text-sm focus:outline-none focus:border-emerald-500"
                ></textarea>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                    تاريخ المهمة
                  </label>
                  <input
                    type="date"
                    value={dueDate}
                    onChange={(e) => setDueDate(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-white text-xs focus:outline-none focus:border-emerald-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                    وقت التنبيه
                  </label>
                  <input
                    type="time"
                    value={dueTime}
                    onChange={(e) => setDueTime(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-white text-xs focus:outline-none focus:border-emerald-500"
                    required
                  />
                </div>
              </div>

              {/* Conflict banner if any */}
              {currentConflict && (
                <div className="p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-start gap-2 text-xs text-amber-300">
                  <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold">تنبيه تعارض مع موعد صلاة:</span>
                    <p className="mt-0.5">
                      هذا الموعد قريب جداً من صلاة {currentConflict.prayer.arabicName} ({currentConflict.prayer.formatted12h})، بفارق {currentConflict.diffMins} دقيقة فقط.
                    </p>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                    الأولوية
                  </label>
                  <select
                    value={priority}
                    onChange={(e) => setPriority(e.target.value as TaskPriority)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-white text-xs focus:outline-none focus:border-emerald-500"
                  >
                    <option value="urgent">عاجل جداً (تنبيه قوي)</option>
                    <option value="high">مرتفعة</option>
                    <option value="medium">متوسطة</option>
                    <option value="low">منخفضة</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                    التصنيف
                  </label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value as TaskCategory)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-white text-xs focus:outline-none focus:border-emerald-500"
                  >
                    <option value="work">عمل عام</option>
                    <option value="meeting">اجتماع ومقابلة</option>
                    <option value="dev">برمجة وتطوير</option>
                    <option value="admin">إداري ومراسلات</option>
                    <option value="health">صحي واستراحة</option>
                    <option value="personal">شخصي</option>
                  </select>
                </div>
              </div>

              {/* Audio Reminder Mode Selector */}
              <div className="p-3.5 rounded-2xl bg-slate-800/80 border border-slate-700 space-y-3">
                <label className="block text-xs font-semibold text-slate-300">
                  طريقة التنبيه الصوتي عند حلول الموعد
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setAudioMode('tts')}
                    className={`py-2 px-3 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                      audioMode === 'tts'
                        ? 'bg-emerald-600 text-white shadow-md'
                        : 'bg-slate-800 text-slate-400 hover:text-white border border-slate-700'
                    }`}
                  >
                    <Volume2 className="w-3.5 h-3.5" />
                    <span>نطق عربي ذكي (TTS)</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setAudioMode('custom')}
                    className={`py-2 px-3 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                      audioMode === 'custom'
                        ? 'bg-purple-600 text-white shadow-md'
                        : 'bg-slate-800 text-slate-400 hover:text-white border border-slate-700'
                    }`}
                  >
                    <FileAudio className="w-3.5 h-3.5" />
                    <span>ملف وسائط (فيديو / صوت)</span>
                  </button>
                </div>

                {audioMode === 'custom' && (
                  <div className="space-y-2 pt-2 border-t border-slate-700">
                    <div className="flex items-center gap-2">
                      <select
                        value={customAudioId}
                        onChange={(e) => {
                          setCustomAudioId(e.target.value);
                          const found = audioLibrary.find((a) => a.id === e.target.value);
                          setCustomAudioName(found ? found.name : '');
                        }}
                        className="flex-1 px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white text-xs focus:outline-none focus:border-purple-500"
                      >
                        <option value="">اختر ملف فيديو أو صوت محفوظ...</option>
                        {audioLibrary.map((item) => (
                          <option key={item.id} value={item.id}>
                            {item.mediaType === 'video' ? '🎬 [فيديو]' : '🎵 [صوت]'} {item.name}
                          </option>
                        ))}
                      </select>

                      <input
                        id="task-audio-file-input"
                        type="file"
                        accept="audio/*,video/*,.mp3,.wav,.ogg,.m4a,.aac,.webm,.mp4,.mov,.mkv"
                        onChange={handleTaskAudioUpload}
                        className="hidden"
                      />
                      <label
                        htmlFor="task-audio-file-input"
                        title="رفع ملف وسائط جديد لهذا التنبيه"
                        className="p-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs cursor-pointer flex items-center gap-1 shrink-0"
                      >
                        <UploadCloud className="w-4 h-4" />
                        <span className="hidden sm:inline">رفع ملف</span>
                      </label>
                    </div>

                    <div className="flex items-center justify-between pt-1">
                      {!isRecordingInTask ? (
                        <button
                          type="button"
                          onClick={startTaskRecording}
                          className="flex items-center gap-1.5 text-xs text-emerald-400 hover:text-emerald-300 font-medium cursor-pointer"
                        >
                          <Mic className="w-3.5 h-3.5" />
                          <span>تسجيل صوتي فوري لهذا التذكير بالميكروفون</span>
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={stopTaskRecording}
                          className="flex items-center gap-1.5 text-xs text-rose-400 font-bold animate-pulse cursor-pointer"
                        >
                          <Square className="w-3.5 h-3.5" />
                          <span>إيقاف وحفظ التسجيل ({taskRecordSeconds} ثانية)</span>
                        </button>
                      )}
                    </div>

                    {customAudioName && (
                      <div className="p-2 rounded-xl bg-purple-950/40 border border-purple-800/40 text-[11px] text-purple-300 flex items-center justify-between">
                        <span className="truncate">📎 تم ربط الملف: {customAudioName}</span>
                        <button
                          type="button"
                          onClick={() => {
                            setCustomAudioId('');
                            setCustomAudioName('');
                          }}
                          className="text-slate-400 hover:text-rose-400 text-xs cursor-pointer mr-2"
                        >
                          إلغاء
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  نص التذكير الصوتي المخصص (اختياري)
                </label>
                <input
                  type="text"
                  placeholder="اتركه فارغاً للتوليد الذكي التلقائي..."
                  value={voiceMessage}
                  onChange={(e) => setVoiceMessage(e.target.value)}
                  className="w-full px-4 py-2 rounded-xl bg-slate-800 border border-slate-700 text-white placeholder-slate-500 text-xs focus:outline-none focus:border-emerald-500"
                />
                <span className="text-[11px] text-slate-500 mt-1 block">
                  سيقوم النظام بنطق هذا النص بصوت عربي فصيح عند حلول الموعد.
                </span>
              </div>

              <div className="pt-4 border-t border-slate-800 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold cursor-pointer"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  className="px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-lg shadow-emerald-600/30 cursor-pointer"
                >
                  {editingTask ? 'حفظ التعديلات' : 'إضافة وجدولة المهمة'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
