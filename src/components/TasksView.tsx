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
  Square,
  Paperclip,
  FileText,
  Image as ImageIcon,
  ExternalLink,
  Cloud,
  MessageCircle,
  Send,
  UserPlus,
  Users,
  User,
  Folder,
  Phone,
  Mail,
  Smartphone,
  Share2,
  FileCheck
} from 'lucide-react';
import confetti from 'canvas-confetti';
import {
  Task,
  TaskAttachment,
  TaskPriority,
  TaskCategory,
  PrayerInfo,
  TaskAudioMode,
  StoredAudioMeta,
  WhatsAppSavedContact,
  Employee
} from '../types';
import { taskService } from '../services/taskService';
import { audioStorageService } from '../services/audioStorageService';
import { vercelCloudSync } from '../services/vercelCloudSync';
import { getLocalDateStr } from '../services/nativeAlarmService';
import { taskAttachmentService, formatAttachmentSize } from '../services/taskAttachmentService';
import {
  whatsappService,
  buildTaskWhatsAppMessage,
  formatWhatsAppDisplayPhone,
  normalizeWhatsAppPhone
} from '../services/whatsappService';
import { VoiceTaskModal } from './VoiceTaskModal';
import { PdfExportModal } from './PdfExportModal';
import { ImageLightboxModal } from './ImageLightboxModal';

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
  const [isVoiceModalOpen, setIsVoiceModalOpen] = useState(false);
  const [isPdfModalOpen, setIsPdfModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [previewImage, setPreviewImage] = useState<{ url: string; title: string } | null>(null);

  // Form State
  const todayStr = getLocalDateStr();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [dueDate, setDueDate] = useState(todayStr);
  const [dueTime, setDueTime] = useState('11:00');
  const [priority, setPriority] = useState<TaskPriority>('medium');
  const [category, setCategory] = useState<TaskCategory>('work');
  const [reminderMinutesBefore, setReminderMinutesBefore] = useState<number>(5);
  const [voiceMessage, setVoiceMessage] = useState('');
  const [audioMode, setAudioMode] = useState<TaskAudioMode>('tts');
  const [customAudioId, setCustomAudioId] = useState<string>('');
  const [customAudioName, setCustomAudioName] = useState<string>('');
  const [taskCloudUrl, setTaskCloudUrl] = useState<string>('');
  const [attachments, setAttachments] = useState<TaskAttachment[]>([]);
  const [isUploadingAttachment, setIsUploadingAttachment] = useState(false);
  const [attachmentStatusMsg, setAttachmentStatusMsg] = useState<string | null>(null);
  const [quickAttachTargetId, setQuickAttachTargetId] = useState<string | null>(null);
  const [isUploadingMedia, setIsUploadingMedia] = useState<boolean>(false);
  const [audioLibrary, setAudioLibrary] = useState<StoredAudioMeta[]>([]);
  const [isRecordingInTask, setIsRecordingInTask] = useState(false);
  const [taskRecordSeconds, setTaskRecordSeconds] = useState(0);

  // WhatsApp Scheduled Send State
  const [waEnabled, setWaEnabled] = useState(false);
  const [waPhone, setWaPhone] = useState('');
  const [waRecipientName, setWaRecipientName] = useState('');
  const [waCustomMessage, setWaCustomMessage] = useState('');
  const [waAutoTrigger, setWaAutoTrigger] = useState(true);
  const [waIncludeAttachments, setWaIncludeAttachments] = useState(true);
  const [waSavedContacts, setWaSavedContacts] = useState<WhatsAppSavedContact[]>(() =>
    whatsappService.getSettings().savedContacts
  );
  const [waStatusBanner, setWaStatusBanner] = useState<string | null>(null);
  const [waSendingId, setWaSendingId] = useState<string | null>(null);

  // Employee Dossiers & Staff State
  const [viewMode, setViewMode] = useState<'tasks' | 'employees'>('tasks');
  const [employees, setEmployees] = useState<Employee[]>(() => taskService.getEmployees());
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string>('');
  const [selectedEmployeeName, setSelectedEmployeeName] = useState<string>('');
  const [selectedEmployeeDossier, setSelectedEmployeeDossier] = useState<Employee | null>(null);
  const [isEmployeeModalOpen, setIsEmployeeModalOpen] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null);
  const [pdfInitialEmpId, setPdfInitialEmpId] = useState<string | undefined>(undefined);

  // Employee Form State
  const [empFormName, setEmpFormName] = useState('');
  const [empFormRole, setEmpFormRole] = useState('');
  const [empFormDept, setEmpFormDept] = useState('');
  const [empFormPhone, setEmpFormPhone] = useState('');
  const [empFormWaPhone, setEmpFormWaPhone] = useState('');
  const [empFormEmail, setEmpFormEmail] = useState('');
  const [empFormNotes, setEmpFormNotes] = useState('');

  const resetEmployeeForm = () => {
    setEmpFormName('');
    setEmpFormRole('');
    setEmpFormDept('');
    setEmpFormPhone('');
    setEmpFormWaPhone('');
    setEmpFormEmail('');
    setEmpFormNotes('');
    setEditingEmployee(null);
  };

  const handleOpenEditEmployee = (emp: Employee) => {
    setEditingEmployee(emp);
    setEmpFormName(emp.name || '');
    setEmpFormRole(emp.role || '');
    setEmpFormDept(emp.department || '');
    setEmpFormPhone(emp.phone || '');
    setEmpFormWaPhone(emp.whatsappPhone || emp.phone || '');
    setEmpFormEmail(emp.email || '');
    setEmpFormNotes(emp.notes || '');
    setIsEmployeeModalOpen(true);
  };

  const handleSaveEmployee = (e: React.FormEvent) => {
    e.preventDefault();
    if (!empFormName.trim()) return;

    if (editingEmployee) {
      const updated = taskService.updateEmployee(editingEmployee.id, {
        name: empFormName.trim(),
        role: empFormRole.trim(),
        department: empFormDept.trim(),
        phone: empFormPhone.trim(),
        whatsappPhone: empFormWaPhone.trim() || empFormPhone.trim(),
        email: empFormEmail.trim(),
        notes: empFormNotes.trim(),
      });
      setEmployees(updated);
      if (selectedEmployeeDossier?.id === editingEmployee.id) {
        setSelectedEmployeeDossier(updated.find((x) => x.id === editingEmployee.id) || null);
      }
      showWaBanner('✓ تم تحديث بيانات الموظف بنجاح');
    } else {
      taskService.addEmployee({
        name: empFormName.trim(),
        role: empFormRole.trim(),
        department: empFormDept.trim(),
        phone: empFormPhone.trim(),
        whatsappPhone: empFormWaPhone.trim() || empFormPhone.trim(),
        email: empFormEmail.trim(),
        notes: empFormNotes.trim(),
      });
      setEmployees(taskService.getEmployees());
      showWaBanner('✓ تم إنشاء ملف الموظف الجديد بنجاح');
    }

    setIsEmployeeModalOpen(false);
    resetEmployeeForm();
  };

  const handleDeleteEmployee = (empId: string) => {
    if (!window.confirm('هل تريد بالتأكيد حذف ملف هذا الموظف؟ لن تُحذف المهام المسندة إليه.')) return;
    const remaining = taskService.deleteEmployee(empId);
    setEmployees(remaining);
    if (selectedEmployeeDossier?.id === empId) {
      setSelectedEmployeeDossier(null);
    }
    showWaBanner('✓ تم حذف ملف الموظف');
  };

  const handlePickPhoneContact = async () => {
    try {
      const res = await whatsappService.pickContactFromDevice();
      if (res.success && res.phone) {
        setWaPhone(res.phone);
        if (res.name && !waRecipientName) {
          setWaRecipientName(res.name);
        }
        showWaBanner(`✓ تم اختيار ${res.name || res.phone} من جهات اتصال الهاتف`);
      } else if (res.cancelled) {
        // cancelled
      } else if (res.message) {
        showWaBanner(res.message);
      }
    } catch (err: any) {
      showWaBanner('تعذر فتح جهات الاتصال: ' + (err?.message || 'خطأ'));
    }
  };

  const handlePickPhoneContactForEmployee = async () => {
    try {
      const res = await whatsappService.pickContactFromDevice();
      if (res.success && res.phone) {
        setEmpFormPhone(res.phone);
        setEmpFormWaPhone(res.phone);
        if (res.name && !empFormName) {
          setEmpFormName(res.name);
        }
        showWaBanner(`✓ تم سحب ${res.name || res.phone} للموظف`);
      } else if (res.message) {
        showWaBanner(res.message);
      }
    } catch (err: any) {
      showWaBanner('تعذر فتح جهات الاتصال: ' + (err?.message || 'خطأ'));
    }
  };

  const showWaBanner = (msg: string) => {
    setWaStatusBanner(msg);
    setTimeout(() => setWaStatusBanner(null), 4000);
  };

  useEffect(() => {
    setWaSavedContacts(whatsappService.getSettings().savedContacts);
    return whatsappService.subscribeSettings((s) => {
      setWaSavedContacts(s.savedContacts || []);
    });
  }, []);

  const taskMediaRecorderRef = useRef<MediaRecorder | null>(null);
  const taskAudioChunksRef = useRef<Blob[]>([]);
  const taskTimerRef = useRef<any>(null);
  const quickAttachInputRef = useRef<HTMLInputElement | null>(null);

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
    setAttachments([]);
    setAttachmentStatusMsg(null);
    setWaEnabled(false);
    setWaPhone('');
    setWaRecipientName('');
    setWaCustomMessage('');
    setWaAutoTrigger(true);
    setWaIncludeAttachments(true);
    setSelectedEmployeeId('');
    setSelectedEmployeeName('');
    setEditingTask(null);
  };

  const handleOpenEdit = (task: Task, forceExpandWhatsApp = false) => {
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
    setAttachments(task.attachments ? [...task.attachments] : []);
    setAttachmentStatusMsg(null);
    setSelectedEmployeeId(task.employeeId || '');
    setSelectedEmployeeName(task.employeeName || '');
    setWaEnabled(forceExpandWhatsApp ? true : !!task.whatsapp?.enabled);
    setWaPhone(task.whatsapp?.phoneNumber || '');
    setWaRecipientName(task.whatsapp?.recipientName || '');
    setWaCustomMessage(task.whatsapp?.customMessage || '');
    setWaAutoTrigger(task.whatsapp?.autoTriggerAtDueTime !== false);
    setWaIncludeAttachments(task.whatsapp?.includeAttachmentsLinks !== false);
    setIsAddModalOpen(true);
  };

  const handleUploadModalAttachments = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const fileList = e.target.files;
    if (!fileList || fileList.length === 0) return;
    setIsUploadingAttachment(true);
    try {
      const uploaded: TaskAttachment[] = [];
      for (let i = 0; i < fileList.length; i++) {
        const f = fileList[i];
        setAttachmentStatusMsg(`جاري رفع وإرفاق: ${f.name}...`);
        const meta = await taskAttachmentService.saveAttachment(f, (pct) => {
          setAttachmentStatusMsg(`جاري رفع "${f.name}" للسحابة: ${pct}%`);
        });
        uploaded.push(meta);
      }
      setAttachments((prev) => [...prev, ...uploaded]);
      setAttachmentStatusMsg(`تم إرفاق ${uploaded.length} ملف بنجاح ✓`);
    } catch (err: any) {
      setAttachmentStatusMsg(`خطأ أثناء رفع الملف: ${err?.message || ''}`);
    } finally {
      setIsUploadingAttachment(false);
      e.target.value = '';
    }
  };

  const handleQuickAttachFiles = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const fileList = e.target.files;
    const targetId = quickAttachTargetId;
    if (!fileList || fileList.length === 0 || !targetId) return;
    const task = tasks.find((t) => t.id === targetId);
    if (!task) return;

    try {
      const added: TaskAttachment[] = [];
      for (let i = 0; i < fileList.length; i++) {
        const meta = await taskAttachmentService.saveAttachment(fileList[i]);
        added.push(meta);
      }
      const nextAtts = [...(task.attachments || []), ...added];
      onUpdateTask(targetId, { attachments: nextAtts });
    } catch (err: any) {
      alert('تعذر رفع الملف: ' + (err?.message || ''));
    } finally {
      setQuickAttachTargetId(null);
      e.target.value = '';
    }
  };

  const handleRemoveModalAttachment = async (attId: string) => {
    setAttachments((prev) => prev.filter((a) => a.id !== attId));
    await taskAttachmentService.deleteAttachment(attId);
  };

  const handleRemoveTaskAttachment = async (task: Task, attId: string) => {
    if (!confirm('هل تريد حذف هذا الملف المرفق من المهمة؟')) return;
    const nextAtts = (task.attachments || []).filter((a) => a.id !== attId);
    onUpdateTask(task.id, { attachments: nextAtts });
    await taskAttachmentService.deleteAttachment(attId);
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

    if (waEnabled) {
      const normalized = normalizeWhatsAppPhone(waPhone);
      if (!normalized || normalized.length < 8) {
        alert('يرجى إدخال رقم واتساب صحيح مع رمز الدولة (مثال: 01012345678 أو 201012345678).');
        return;
      }
    }

    const whatsappPayload = waEnabled && waPhone.trim()
      ? {
          enabled: true,
          phoneNumber: normalizeWhatsAppPhone(waPhone),
          recipientName: waRecipientName.trim() || undefined,
          customMessage: waCustomMessage.trim() || undefined,
          autoTriggerAtDueTime: waAutoTrigger,
          includeAttachmentsLinks: waIncludeAttachments,
          lastSentAt: editingTask?.whatsapp?.lastSentAt,
          lastSendStatus: editingTask?.whatsapp?.lastSendStatus,
          lastSendError: editingTask?.whatsapp?.lastSendError,
        }
      : undefined;

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
        attachments,
        whatsapp: whatsappPayload,
        employeeId: selectedEmployeeId || undefined,
        employeeName: selectedEmployeeName || undefined,
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
        attachments: attachments.length > 0 ? attachments : undefined,
        whatsapp: whatsappPayload,
        employeeId: selectedEmployeeId || undefined,
        employeeName: selectedEmployeeName || undefined,
      });
    }

    setIsAddModalOpen(false);
    resetForm();
  };

  const handleSendTaskWhatsAppNow = async (task: Task) => {
    if (!task.whatsapp?.phoneNumber) {
      handleOpenEdit(task, true);
      return;
    }
    setWaSendingId(task.id);
    try {
      const res = await whatsappService.triggerTaskWhatsAppSend(task, {
        allowOpenApp: true,
        skipDedupe: true,
      });
      const statusValue: 'sent_api' | 'opened_app' | 'failed' =
        res.success && res.method === 'api'
          ? 'sent_api'
          : res.success && res.method === 'app'
            ? 'opened_app'
            : 'failed';
      onUpdateTask(task.id, {
        whatsapp: {
          ...task.whatsapp,
          lastSentAt: res.success ? new Date().toISOString() : task.whatsapp.lastSentAt,
          lastSendStatus: statusValue,
          lastSendError: res.error,
        },
      });
      if (res.success && res.method === 'api') {
        showWaBanner(`✅ تم إرسال المهمة تلقائياً على واتساب إلى ${task.whatsapp.recipientName || '+' + task.whatsapp.phoneNumber}`);
      } else if (res.success && res.method === 'app') {
        showWaBanner(`💬 تم فتح محادثة واتساب لـ ${task.whatsapp.recipientName || '+' + task.whatsapp.phoneNumber} بالرسالة جاهزة`);
      } else {
        showWaBanner(`⚠️ تعذر الإرسال: ${res.error || 'تحقق من الإعدادات'}`);
      }
    } finally {
      setWaSendingId(null);
    }
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
        <div className="flex items-center gap-3.5">
          <div className="icon-squircle-emerald w-12 h-12 shrink-0">
            <CheckSquare className="w-6 h-6" strokeWidth={1.75} />
          </div>
          <div>
            <h2 className="text-xl sm:text-2xl font-extrabold text-white tracking-tight">
              مهام العمل والمواعيد
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              تنظيم المواعيد مع التذكير الصوتي الذكي وإرسال رسائل واتساب في الموعد
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setIsPdfModalOpen(true)}
            className="btn-lux-secondary h-10 px-4 rounded-xl text-xs font-bold flex items-center justify-center gap-2 cursor-pointer"
            title="تصدير مهام العمل المختارة إلى PDF"
          >
            <FileText className="w-4 h-4 text-slate-300" strokeWidth={1.75} />
            <span>تصدير PDF</span>
          </button>

          <button
            type="button"
            onClick={() => setIsVoiceModalOpen(true)}
            className="btn-lux-gold h-10 px-4 rounded-xl text-xs font-extrabold flex items-center justify-center gap-2 cursor-pointer"
            title="إضافة مهمة سريعة بالصوت للدكتور عبد العزيز"
          >
            <Mic className="w-4 h-4" strokeWidth={2} />
            <span>إملاء بالصوت</span>
          </button>

          <button
            type="button"
            onClick={() => {
              resetForm();
              setIsAddModalOpen(true);
            }}
            className="btn-lux-primary h-10 px-4 sm:px-5 rounded-xl text-xs font-bold flex items-center justify-center gap-2 cursor-pointer"
          >
            <Plus className="w-4 h-4" strokeWidth={2} />
            <span>إضافة مهمة</span>
          </button>
        </div>

        {/* Hidden Quick-Attach File Input for Task Cards */}
        <input
          ref={quickAttachInputRef}
          type="file"
          multiple
          onChange={handleQuickAttachFiles}
          className="hidden"
        />
      </div>

      {waStatusBanner && (
        <div className="p-3.5 rounded-2xl bg-emerald-950/70 border border-emerald-500/40 text-emerald-200 text-xs font-bold flex items-center justify-between gap-2 shadow-lg animate-fade-in">
          <div className="flex items-center gap-2">
            <MessageCircle className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>{waStatusBanner}</span>
          </div>
          <button
            type="button"
            onClick={() => setWaStatusBanner(null)}
            className="p-1 rounded-lg hover:bg-emerald-500/20 text-emerald-300 cursor-pointer"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* View Mode Switcher: Tasks Board vs Employee Dossiers */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-2 rounded-2xl bg-[var(--lux-card-bg)] border border-[var(--lux-card-border)] shadow-sm">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setViewMode('tasks')}
            className={`px-4 py-2 rounded-xl text-xs font-black transition-all flex items-center gap-2 cursor-pointer ${
              viewMode === 'tasks'
                ? 'btn-lux-primary shadow-sm'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <CheckSquare className="w-4 h-4" />
            <span>كافة مهام العمل ({tasks.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setViewMode('employees')}
            className={`px-4 py-2 rounded-xl text-xs font-black transition-all flex items-center gap-2 cursor-pointer ${
              viewMode === 'employees'
                ? 'btn-lux-primary shadow-sm'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Users className="w-4 h-4" />
            <span>ملفات الموظفين وفريق العمل ({employees.length})</span>
          </button>
        </div>

        {viewMode === 'employees' && (
          <button
            type="button"
            onClick={() => {
              resetEmployeeForm();
              setIsEmployeeModalOpen(true);
            }}
            className="btn-lux-gold h-9 px-3.5 rounded-xl text-xs font-black flex items-center gap-1.5 cursor-pointer shadow-sm"
          >
            <UserPlus className="w-3.5 h-3.5" />
            <span>إضافة ملف موظف جديد</span>
          </button>
        )}
      </div>

      {viewMode === 'tasks' ? (
        <>
          {/* Filter and Search Bar */}
          <div className="lux-card p-4 sm:p-5 rounded-3xl space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3.5">
          {/* Search Box */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-500 absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none" strokeWidth={1.75} />
            <input
              type="text"
              placeholder="البحث في المهام والاجتماعات..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="lux-input w-full pr-10 pl-4 py-2.5 text-sm placeholder-slate-500"
            />
          </div>

          {/* Category Filter */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0 scrollbar-none">
            <span className="text-[11px] font-semibold text-slate-500 whitespace-nowrap ml-1">التصنيف:</span>
            {[
              { id: 'all', label: 'الكل' },
              { id: 'clinic', label: 'عيادة' },
              { id: 'work', label: 'عمل' },
              { id: 'meeting', label: 'اجتماعات' },
              { id: 'dev', label: 'برمجة' },
              { id: 'health', label: 'صحي' },
            ].map((cat) => (
              <button
                key={cat.id}
                onClick={() => setSelectedCategory(cat.id)}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all cursor-pointer border ${
                  selectedCategory === cat.id
                    ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/35'
                    : 'bg-white/[0.03] text-slate-400 border-white/[0.07] hover:text-white'
                }`}
              >
                {cat.label}
              </button>
            ))}
          </div>
        </div>

        {/* Status Filters */}
        <div className="flex items-center gap-1.5 pt-3 border-t border-white/[0.06] overflow-x-auto scrollbar-none">
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
              className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all cursor-pointer border ${
                selectedFilter === f.id
                  ? 'bg-white/[0.08] text-white border-white/[0.14]'
                  : 'bg-transparent text-slate-400 border-transparent hover:text-slate-200 hover:bg-white/[0.03]'
              }`}
            >
              <span>{f.label}</span>
              <span className="px-1.5 py-0.5 rounded-full text-[10px] font-mono tabular-nums bg-white/[0.07] text-slate-200">
                {f.count}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Task List */}
      {filteredTasks.length === 0 ? (
        <div className="lux-card text-center py-16 px-4 rounded-3xl">
          <div className="icon-squircle w-14 h-14 mx-auto mb-3 text-slate-500">
            <CheckSquare className="w-7 h-7" strokeWidth={1.5} />
          </div>
          <h3 className="text-base font-bold text-white mb-1">لا توجد مهام مطابقة</h3>
          <p className="text-xs text-slate-400 mb-6">
            يمكنك إضافة مهمة جديدة وتحديد موعد تذكير صوتي لها أو إرسالها عبر واتساب.
          </p>
          <button
            onClick={() => {
              resetForm();
              setIsAddModalOpen(true);
            }}
            className="btn-lux-primary px-5 py-2.5 rounded-xl text-xs font-bold cursor-pointer inline-flex items-center gap-2"
          >
            <Plus className="w-4 h-4" strokeWidth={2} />
            <span>إضافة مهمة الآن</span>
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
                className={`p-5 rounded-3xl transition-all ${
                  isCompleted
                    ? 'lux-card opacity-60'
                    : isUrgent
                      ? 'lux-card-interactive border-rose-500/35 shadow-[0_12px_32px_-18px_rgba(244,63,94,0.35)]'
                      : 'lux-card-interactive'
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

                        {/* Employee Dossier Badge */}
                        {task.employeeName && (
                          <button
                            type="button"
                            onClick={() => {
                              const emp = employees.find((e) => e.id === task.employeeId);
                              if (emp) setSelectedEmployeeDossier(emp);
                            }}
                            className="text-[10px] px-2.5 py-0.5 rounded-full bg-blue-500/15 text-blue-300 border border-blue-500/30 font-bold inline-flex items-center gap-1 hover:bg-blue-500/25 cursor-pointer"
                            title="عرض ملف هذا الموظف"
                          >
                            <User className="w-3 h-3 text-blue-400" />
                            <span>{task.employeeName}</span>
                          </button>
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

                      {/* Scheduled WhatsApp Badge */}
                      {task.whatsapp?.enabled && task.whatsapp.phoneNumber && (
                        <div className="inline-flex flex-wrap items-center gap-1.5 px-3 py-1 rounded-xl bg-emerald-500/15 border border-emerald-500/35 text-emerald-300 text-xs mt-1 ml-1">
                          <MessageCircle className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                          <span>
                            واتساب في الموعد ←{' '}
                            <strong className="text-white" dir="ltr">
                              {task.whatsapp.recipientName ||
                                formatWhatsAppDisplayPhone(task.whatsapp.phoneNumber)}
                            </strong>
                          </span>
                          {task.whatsapp.lastSendStatus === 'sent_api' && (
                            <span className="px-1.5 py-0.5 rounded-md bg-emerald-500/25 text-emerald-200 text-[10px] font-bold">
                              ✓ تم الإرسال التلقائي
                            </span>
                          )}
                          {task.whatsapp.lastSendStatus === 'opened_app' && (
                            <span className="px-1.5 py-0.5 rounded-md bg-teal-500/25 text-teal-200 text-[10px] font-bold">
                              ↗ فُتح واتساب
                            </span>
                          )}
                          {task.whatsapp.lastSendStatus === 'failed' && (
                            <span className="px-1.5 py-0.5 rounded-md bg-rose-500/25 text-rose-200 text-[10px] font-bold">
                              ⚠ تعذر الإرسال
                            </span>
                          )}
                        </div>
                      )}

                      {/* Attached Work Files & Documents */}
                      {task.attachments && task.attachments.length > 0 && (
                        <div className="flex flex-wrap items-center gap-2 pt-1.5">
                          {task.attachments.map((att) => {
                            const isImg = att.type.startsWith('image/') || /\.(png|jpe?g|webp|gif)$/i.test(att.name);
                            return (
                              <div
                                key={att.id}
                                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-indigo-500/15 border border-indigo-500/35 text-indigo-200 text-[11px] font-semibold"
                              >
                                <button
                                  type="button"
                                  onClick={() =>
                                    taskAttachmentService.openAttachment(att, (url, title) =>
                                      setPreviewImage({ url, title })
                                    )
                                  }
                                  className="inline-flex items-center gap-1.5 hover:text-white transition-colors cursor-pointer"
                                  title="فتح / معاينة الملف"
                                >
                                  {isImg ? (
                                    <ImageIcon className="w-3.5 h-3.5 text-indigo-300 shrink-0" />
                                  ) : (
                                    <Paperclip className="w-3.5 h-3.5 text-indigo-300 shrink-0" />
                                  )}
                                  <span className="max-w-[140px] truncate">{att.name}</span>
                                  <span className="text-[10px] text-indigo-300/70 font-mono">
                                    ({formatAttachmentSize(att.size)})
                                  </span>
                                  {att.cloudUrl && (
                                    <Cloud className="w-3 h-3 text-emerald-400 shrink-0" />
                                  )}
                                  <ExternalLink className="w-3 h-3 opacity-70 shrink-0" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleRemoveTaskAttachment(task, att.id)}
                                  className="p-0.5 rounded hover:bg-rose-500/20 text-slate-400 hover:text-rose-400 transition-colors cursor-pointer"
                                  title="حذف المرفق"
                                >
                                  <X className="w-3 h-3" />
                                </button>
                              </div>
                            );
                          })}
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
                      {/* Send / Schedule WhatsApp Button */}
                      <button
                        type="button"
                        disabled={waSendingId === task.id}
                        onClick={() => handleSendTaskWhatsAppNow(task)}
                        title={
                          task.whatsapp?.enabled && task.whatsapp.phoneNumber
                            ? `إرسال الآن عبر واتساب إلى ${task.whatsapp.recipientName || task.whatsapp.phoneNumber}`
                            : 'تحديد رقم واتساب لإرسال المهمة في موعدها'
                        }
                        className={`p-2 rounded-xl border transition-colors cursor-pointer disabled:opacity-50 ${
                          task.whatsapp?.enabled && task.whatsapp.phoneNumber
                            ? 'bg-emerald-600/25 hover:bg-emerald-600/45 text-emerald-300 border-emerald-500/45'
                            : 'bg-slate-800 hover:bg-emerald-500/20 text-slate-300 hover:text-emerald-400 border-slate-700 hover:border-emerald-500/30'
                        }`}
                      >
                        <MessageCircle className="w-4 h-4" />
                      </button>

                      {/* Quick Attach Document / File */}
                      <button
                        type="button"
                        onClick={() => {
                          setQuickAttachTargetId(task.id);
                          quickAttachInputRef.current?.click();
                        }}
                        title="رفع وإرفاق ملف (PDF، صورة، مستند) لهذه المهمة"
                        className="p-2 rounded-xl bg-indigo-500/15 hover:bg-indigo-500/30 text-indigo-300 hover:text-white border border-indigo-500/30 transition-colors cursor-pointer"
                      >
                        <Paperclip className="w-4 h-4" />
                      </button>

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
        </>
      ) : (
        /* Employee Dossiers View */
        <div className="space-y-6">
          {/* Executive Team Overview KPI Banner */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <div className="lux-card p-4 rounded-2xl flex items-center gap-3">
              <div className="icon-squircle-gold w-10 h-10 shrink-0">
                <Users className="w-5 h-5" />
              </div>
              <div>
                <div className="text-xl sm:text-2xl font-black text-white">{employees.length}</div>
                <div className="text-[11px] font-semibold text-slate-400">إجمالي فريق العمل</div>
              </div>
            </div>
            <div className="lux-card p-4 rounded-2xl flex items-center gap-3">
              <div className="icon-squircle-emerald w-10 h-10 shrink-0">
                <CheckSquare className="w-5 h-5" />
              </div>
              <div>
                <div className="text-xl sm:text-2xl font-black text-white">
                  {tasks.filter((t) => t.employeeId).length}
                </div>
                <div className="text-[11px] font-semibold text-slate-400">مهام موزعة على الموظفين</div>
              </div>
            </div>
            <div className="lux-card p-4 rounded-2xl flex items-center gap-3">
              <div className="icon-squircle-emerald w-10 h-10 shrink-0">
                <CheckCircle2 className="w-5 h-5" />
              </div>
              <div>
                <div className="text-xl sm:text-2xl font-black text-emerald-400">
                  {tasks.filter((t) => t.employeeId && t.status === 'completed').length}
                </div>
                <div className="text-[11px] font-semibold text-slate-400">مهام أنجزها الموظفون</div>
              </div>
            </div>
            <div className="lux-card p-4 rounded-2xl flex items-center gap-3">
              <div className="icon-squircle-gold w-10 h-10 shrink-0">
                <Clock className="w-5 h-5" />
              </div>
              <div>
                <div className="text-xl sm:text-2xl font-black text-amber-400">
                  {tasks.filter((t) => t.employeeId && t.status !== 'completed').length}
                </div>
                <div className="text-[11px] font-semibold text-slate-400">مهام قيد التنفيذ والمتابعة</div>
              </div>
            </div>
          </div>

          {/* Employees Grid */}
          {employees.length === 0 ? (
            <div className="lux-card p-12 rounded-3xl text-center space-y-3">
              <Users className="w-12 h-12 text-slate-500 mx-auto" />
              <h3 className="text-lg font-bold text-white">لا توجد ملفات موظفين مسجلة بعد</h3>
              <p className="text-xs text-slate-400 max-w-md mx-auto">
                أنشئ ملفاً لكل موظف في عيادتك وفريق عملك لتنظيم ومتابعة كافة مهامه وتقاريره وملفاته المرفقة.
              </p>
              <button
                type="button"
                onClick={() => {
                  resetEmployeeForm();
                  setIsEmployeeModalOpen(true);
                }}
                className="btn-lux-primary px-5 py-2.5 rounded-xl text-xs font-bold inline-flex items-center gap-2 cursor-pointer mt-2"
              >
                <UserPlus className="w-4 h-4" />
                <span>إنشاء أول ملف موظف</span>
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {employees.map((emp) => {
                const stats = taskService.getEmployeeStats(emp.id, tasks);
                return (
                  <div
                    key={emp.id}
                    className="lux-card p-5 rounded-3xl flex flex-col justify-between space-y-4 hover:border-emerald-500/40 transition-all shadow-md group"
                  >
                    <div className="space-y-3">
                      {/* Employee Header */}
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-center gap-3">
                          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-emerald-500/30 to-blue-500/30 border border-emerald-500/30 flex items-center justify-center text-lg font-black text-white shrink-0 shadow-inner">
                            {emp.name.slice(0, 2)}
                          </div>
                          <div>
                            <h3 className="text-base font-black text-white group-hover:text-emerald-300 transition-colors">
                              {emp.name}
                            </h3>
                            <div className="flex flex-wrap items-center gap-1.5 mt-0.5">
                              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-300 border border-emerald-500/25">
                                {emp.role || 'عضو فريق'}
                              </span>
                              {emp.department && (
                                <span className="text-[10px] text-slate-400">
                                  • {emp.department}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => handleOpenEditEmployee(emp)}
                            className="p-1.5 rounded-xl hover:bg-slate-800 text-slate-400 hover:text-white cursor-pointer"
                            title="تعديل بيانات الموظف"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteEmployee(emp.id)}
                            className="p-1.5 rounded-xl hover:bg-rose-500/20 text-slate-400 hover:text-rose-400 cursor-pointer"
                            title="حذف ملف الموظف"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>

                      {/* Contact Shortcuts */}
                      <div className="flex items-center gap-2 pt-1">
                        {emp.phone && (
                          <a
                            href={`tel:${emp.phone}`}
                            className="px-2.5 py-1 rounded-xl bg-slate-900 border border-slate-700/80 text-slate-300 hover:text-white text-[11px] font-mono flex items-center gap-1.5 cursor-pointer"
                          >
                            <Phone className="w-3 h-3 text-emerald-400" />
                            <span dir="ltr">{emp.phone}</span>
                          </a>
                        )}
                        {(emp.whatsappPhone || emp.phone) && (
                          <button
                            type="button"
                            onClick={() => {
                              const target = emp.whatsappPhone || emp.phone || '';
                              whatsappService.openWhatsAppChat(target, `مرحباً ${emp.name}، تواصل ومتابعة من نظام د. عبد العزيز.`);
                            }}
                            className="px-2.5 py-1 rounded-xl bg-emerald-950/60 border border-emerald-500/30 text-emerald-300 hover:bg-emerald-900/60 text-[11px] font-bold flex items-center gap-1.5 cursor-pointer"
                            title="محادثة واتساب مباشرة"
                          >
                            <MessageCircle className="w-3 h-3 text-emerald-400" />
                            <span>واتساب</span>
                          </button>
                        )}
                      </div>

                      {/* Performance Progress */}
                      <div className="p-3 rounded-2xl bg-slate-950/60 border border-slate-800/80 space-y-2">
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-slate-400 font-semibold">نسبة إنجاز المهام:</span>
                          <span className="font-mono font-black text-emerald-400">{stats.rate}%</span>
                        </div>
                        <div className="w-full h-2 rounded-full bg-slate-800 overflow-hidden">
                          <div
                            className="h-full bg-gradient-to-r from-emerald-500 to-teal-400 rounded-full transition-all duration-700"
                            style={{ width: `${stats.rate}%` }}
                          />
                        </div>
                        <div className="flex items-center justify-between text-[11px] text-slate-400 pt-1">
                          <span>إجمالي: <strong className="text-white">{stats.total}</strong></span>
                          <span>منجز: <strong className="text-emerald-400">{stats.completed}</strong></span>
                          <span>قيد الانتظار: <strong className="text-amber-400">{stats.pending}</strong></span>
                          {stats.urgent > 0 && (
                            <span>عاجل: <strong className="text-rose-400">{stats.urgent}</strong></span>
                          )}
                        </div>
                      </div>

                      {emp.notes && (
                        <p className="text-[11px] text-slate-400 line-clamp-2 italic">
                          «{emp.notes}»
                        </p>
                      )}
                    </div>

                    {/* Dossier Card Actions */}
                    <div className="pt-2 border-t border-white/[0.06] grid grid-cols-3 gap-2">
                      <button
                        type="button"
                        onClick={() => setSelectedEmployeeDossier(emp)}
                        className="btn-lux-primary h-9 px-2 rounded-xl text-[11px] font-black flex items-center justify-center gap-1.5 cursor-pointer col-span-2 shadow-sm"
                        title="فتح ملف الموظف الكامل والمهام والتقارير"
                      >
                        <Folder className="w-3.5 h-3.5" />
                        <span>فتح الملف الشامل ({stats.total})</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          setPdfInitialEmpId(emp.id);
                          setIsPdfModalOpen(true);
                        }}
                        className="btn-lux-secondary h-9 px-2 rounded-xl text-[11px] font-bold flex items-center justify-center gap-1 cursor-pointer"
                        title="تصدير تقرير مهام هذا الموظف بصيغة PDF"
                      >
                        <FileText className="w-3.5 h-3.5 text-amber-400" />
                        <span>تقرير PDF</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Add / Edit Task Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in">
          <div className="relative w-full max-w-lg p-6 sm:p-8 rounded-3xl lux-modal max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6 pb-4 border-b border-white/[0.06]">
              <div className="flex items-center gap-3">
                <div className="icon-squircle-emerald w-10 h-10">
                  <CheckSquare className="w-5 h-5" strokeWidth={1.75} />
                </div>
                <h3 className="text-lg font-extrabold text-white">
                  {editingTask ? 'تعديل مهمة العمل' : 'إضافة مهمة عمل جديدة'}
                </h3>
              </div>
              <button
                onClick={() => setIsAddModalOpen(false)}
                className="btn-lux-icon text-slate-400 hover:text-white cursor-pointer"
              >
                <X className="w-4 h-4" strokeWidth={1.75} />
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

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
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

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                    موعد التنبيه / واتساب
                  </label>
                  <select
                    value={reminderMinutesBefore}
                    onChange={(e) => setReminderMinutesBefore(Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-white text-xs focus:outline-none focus:border-emerald-500"
                  >
                    <option value={0}>في الموعد بالضبط</option>
                    <option value={5}>قبلها بـ 5 دقائق</option>
                    <option value={10}>قبلها بـ 10 دقائق</option>
                    <option value={15}>قبلها بـ 15 دقيقة</option>
                    <option value={30}>قبلها بـ 30 دقيقة</option>
                  </select>
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
                    <option value="clinic">عيادة ومرضى 🩺</option>
                    <option value="meeting">اجتماع ومقابلة</option>
                    <option value="dev">برمجة وتطوير</option>
                    <option value="admin">إداري ومراسلات</option>
                    <option value="health">صحي واستراحة</option>
                    <option value="personal">شخصي</option>
                  </select>
                </div>
              </div>

              {/* Employee Dossier Assignment */}
              <div className="p-3.5 rounded-2xl bg-slate-800/80 border border-slate-700 space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
                    <User className="w-3.5 h-3.5 text-blue-400" />
                    <span>تعيين المهمة لملف موظف (اختياري)</span>
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      resetEmployeeForm();
                      setIsEmployeeModalOpen(true);
                    }}
                    className="text-[11px] text-emerald-400 hover:text-emerald-300 font-bold flex items-center gap-1 cursor-pointer"
                  >
                    <UserPlus className="w-3 h-3" />
                    <span>إضافة موظف جديد</span>
                  </button>
                </div>

                <select
                  value={selectedEmployeeId}
                  onChange={(e) => {
                    const empId = e.target.value;
                    setSelectedEmployeeId(empId);
                    const emp = employees.find((x) => x.id === empId);
                    if (emp) {
                      setSelectedEmployeeName(emp.name);
                      if (emp.whatsappPhone || emp.phone) {
                        setWaPhone(emp.whatsappPhone || emp.phone || '');
                        setWaRecipientName(emp.name);
                        setWaEnabled(true);
                      }
                    } else {
                      setSelectedEmployeeName('');
                    }
                  }}
                  className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white text-xs focus:outline-none focus:border-blue-500"
                >
                  <option value="">-- بدون تعيين لموظف (مهمة عامة) --</option>
                  {employees.map((emp) => (
                    <option key={emp.id} value={emp.id}>
                      {emp.name} ({emp.role || 'عضو فريق'}) {emp.phone ? `— ${emp.phone}` : ''}
                    </option>
                  ))}
                </select>
                {selectedEmployeeName && (
                  <span className="text-[10.5px] text-blue-300 block font-semibold">
                    ✓ ستُدرج هذه المهمة ومرفقاتها تلقائياً داخل ملف «{selectedEmployeeName}»
                  </span>
                )}
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

              {/* Task File & Document Attachments Section */}
              <div className="p-3.5 rounded-2xl bg-indigo-950/20 border border-indigo-500/30 space-y-2.5">
                <div className="flex items-center justify-between gap-2">
                  <label className="text-xs font-bold text-indigo-200 flex items-center gap-1.5">
                    <Paperclip className="w-4 h-4 text-indigo-400" />
                    <span>مرفقات وملفات المهمة (PDF، صور، مستندات، تقارير)</span>
                  </label>
                  <input
                    id="task-doc-attachments-input"
                    type="file"
                    multiple
                    onChange={handleUploadModalAttachments}
                    className="hidden"
                  />
                  <label
                    htmlFor="task-doc-attachments-input"
                    className={`px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-[11px] font-bold flex items-center gap-1.5 cursor-pointer shrink-0 transition-colors ${
                      isUploadingAttachment ? 'opacity-60 pointer-events-none' : ''
                    }`}
                  >
                    <UploadCloud className="w-3.5 h-3.5" />
                    <span>{isUploadingAttachment ? 'جاري الرفع...' : 'رفع ملفات 📎'}</span>
                  </label>
                </div>

                {attachmentStatusMsg && (
                  <div className="text-[11px] text-emerald-300 font-semibold">
                    {attachmentStatusMsg}
                  </div>
                )}

                {attachments.length > 0 ? (
                  <div className="space-y-1.5 pt-1">
                    {attachments.map((att) => (
                      <div
                        key={att.id}
                        className="flex items-center justify-between gap-2 px-3 py-2 rounded-xl bg-slate-900/90 border border-slate-700/80 text-xs"
                      >
                        <button
                          type="button"
                          onClick={() =>
                            taskAttachmentService.openAttachment(att, (url, title) =>
                              setPreviewImage({ url, title })
                            )
                          }
                          className="flex items-center gap-2 min-w-0 flex-1 text-right hover:text-indigo-300 cursor-pointer"
                        >
                          <Paperclip className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                          <span className="truncate font-semibold text-white">{att.name}</span>
                          <span className="text-[10px] text-slate-400 shrink-0 font-mono">
                            ({formatAttachmentSize(att.size)})
                          </span>
                          {att.cloudUrl && (
                            <Cloud className="w-3 h-3 text-emerald-400 shrink-0" />
                          )}
                        </button>
                        <button
                          type="button"
                          onClick={() => handleRemoveModalAttachment(att.id)}
                          className="p-1 rounded-lg hover:bg-rose-500/20 text-slate-400 hover:text-rose-400 cursor-pointer shrink-0"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-[11px] text-slate-400">
                    يمكنك رفع أكثر من ملف (ملفات PDF، Word، Excel، صور أشعة أو تقارير...) لتظهر دائماً مع المهمة وفي التقارير.
                  </p>
                )}
              </div>

              {/* WhatsApp Scheduled Message Section */}
              <div className="p-4 rounded-2xl bg-emerald-950/25 border border-emerald-500/35 space-y-3">
                <label className="flex items-center justify-between gap-3 cursor-pointer">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shrink-0">
                      <MessageCircle className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="text-xs font-bold text-emerald-200">
                        إرسال المهمة عبر واتساب عند حلول موعدها 📲
                      </div>
                      <div className="text-[11px] text-slate-400">
                        حدد رقم المستلم لتصل إليه رسالة المهمة تلقائياً في وقتها
                      </div>
                    </div>
                  </div>
                  <input
                    type="checkbox"
                    checked={waEnabled}
                    onChange={(e) => setWaEnabled(e.target.checked)}
                    className="w-5 h-5 accent-emerald-500 rounded cursor-pointer shrink-0"
                  />
                </label>

                {waEnabled && (
                  <div className="space-y-3 pt-2 border-t border-emerald-500/20">
                    {/* Native Phonebook Picker Action */}
                    <div className="flex flex-wrap items-center justify-between gap-2 p-2.5 rounded-xl bg-slate-900/90 border border-emerald-500/30">
                      <div className="flex items-center gap-2">
                        <Smartphone className="w-4 h-4 text-emerald-400" />
                        <span className="text-xs font-bold text-white">
                          دفتر الهاتف والأرقام المحفوظة:
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={handlePickPhoneContact}
                        className="btn-lux-primary h-8 px-3.5 rounded-xl text-xs font-black flex items-center gap-1.5 cursor-pointer shadow-md"
                        title="فتح دفتر جهات اتصال الموبايل واختيار الرقم مباشرة دون الحاجة لكتابته"
                      >
                        <Smartphone className="w-3.5 h-3.5" />
                        <span>📱 اختيار من جهات اتصال الهاتف</span>
                      </button>
                    </div>

                    {/* Quick Pick Chips (Employees + Saved Contacts) */}
                    {(employees.length > 0 || waSavedContacts.length > 0) && (
                      <div className="space-y-1.5">
                        <span className="text-[11px] font-semibold text-slate-300 block">
                          ⚡ أو اختر بنقرة واحدة من فريق العمل وجهات الاتصال:
                        </span>
                        <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto pr-0.5">
                          {employees
                            .filter((e) => e.phone || e.whatsappPhone)
                            .map((emp) => {
                              const empPhone = emp.whatsappPhone || emp.phone || '';
                              const isSelected =
                                normalizeWhatsAppPhone(waPhone) === normalizeWhatsAppPhone(empPhone);
                              return (
                                <button
                                  key={`emp-chip-${emp.id}`}
                                  type="button"
                                  onClick={() => {
                                    setWaPhone(empPhone);
                                    setWaRecipientName(emp.name);
                                    setSelectedEmployeeId(emp.id);
                                    setSelectedEmployeeName(emp.name);
                                  }}
                                  className={`px-2.5 py-1 rounded-xl text-[11px] font-bold border transition-all cursor-pointer flex items-center gap-1 ${
                                    isSelected
                                      ? 'bg-blue-500/30 border-blue-400 text-white shadow-sm'
                                      : 'bg-slate-900 border-slate-700 text-blue-300 hover:border-blue-500/50'
                                  }`}
                                >
                                  <User className="w-3 h-3 text-blue-400" />
                                  <span>{emp.name}</span>
                                </button>
                              );
                            })}
                          {waSavedContacts.map((contact) => (
                            <button
                              key={contact.id}
                              type="button"
                              onClick={() => {
                                setWaPhone(contact.phone);
                                setWaRecipientName(contact.name);
                              }}
                              className={`px-2.5 py-1 rounded-xl text-[11px] font-bold border transition-all cursor-pointer ${
                                normalizeWhatsAppPhone(waPhone) === normalizeWhatsAppPhone(contact.phone)
                                  ? 'bg-emerald-500/30 border-emerald-400 text-white shadow-sm'
                                  : 'bg-slate-900/80 border-slate-700 text-emerald-300 hover:border-emerald-500/40'
                              }`}
                            >
                              {contact.name}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                      <div>
                        <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                          رقم الواتساب المستلم *
                        </label>
                        <div className="flex items-center gap-1.5">
                          <input
                            type="tel"
                            dir="ltr"
                            required={waEnabled}
                            placeholder="01012345678 أو +2010..."
                            value={waPhone}
                            onChange={(e) => setWaPhone(e.target.value)}
                            className="flex-1 px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white text-xs font-mono focus:outline-none focus:border-emerald-500"
                          />
                          <button
                            type="button"
                            disabled={!normalizeWhatsAppPhone(waPhone)}
                            onClick={() => {
                              whatsappService.addSavedContact(waRecipientName, waPhone);
                              showWaBanner('✓ تم حفظ الرقم في جهات اتصال واتساب السريعة');
                            }}
                            title="حفظ الرقم للاستخدام السريع لاحقاً"
                            className="p-2 rounded-xl bg-emerald-600/20 hover:bg-emerald-600/35 text-emerald-300 border border-emerald-500/30 disabled:opacity-40 cursor-pointer shrink-0"
                          >
                            <UserPlus className="w-4 h-4" />
                          </button>
                        </div>
                        {waPhone.trim() && normalizeWhatsAppPhone(waPhone) && (
                          <span className="text-[10px] text-emerald-400 font-mono mt-1 block" dir="ltr">
                            ✓ الصيغة المعتمدة: +{normalizeWhatsAppPhone(waPhone)}
                          </span>
                        )}
                      </div>

                      <div>
                        <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                          اسم المستلم (اختياري)
                        </label>
                        <input
                          type="text"
                          placeholder="مثال: أحمد السكرتير / العيادة"
                          value={waRecipientName}
                          onChange={(e) => setWaRecipientName(e.target.value)}
                          className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white text-xs focus:outline-none focus:border-emerald-500"
                        />
                      </div>
                    </div>

                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="text-[11px] font-semibold text-slate-300">
                          نص رسالة الواتساب (اختياري)
                        </label>
                        {waCustomMessage.trim() && (
                          <button
                            type="button"
                            onClick={() => setWaCustomMessage('')}
                            className="text-[10px] text-slate-400 hover:text-emerald-300 cursor-pointer"
                          >
                            العودة للنص التلقائي ↻
                          </button>
                        )}
                      </div>
                      <textarea
                        rows={2}
                        placeholder="اتركه فارغاً لإرسال رسالة منسقة تلقائياً بعنوان المهمة وموعدها ومرفقاتها..."
                        value={waCustomMessage}
                        onChange={(e) => setWaCustomMessage(e.target.value)}
                        className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white text-xs placeholder-slate-500 focus:outline-none focus:border-emerald-500"
                      />
                      <div className="mt-1.5 p-2.5 rounded-xl bg-slate-950/70 border border-slate-800 text-[11px] text-slate-300 whitespace-pre-line">
                        <span className="text-[10px] text-emerald-400 font-bold block mb-0.5">
                          معاينة الرسالة التي ستُرسل في الموعد:
                        </span>
                        {buildTaskWhatsAppMessage({
                          title: title || 'عنوان المهمة',
                          description,
                          dueDate,
                          dueTime,
                          attachments,
                          whatsapp: {
                            enabled: true,
                            phoneNumber: waPhone,
                            customMessage: waCustomMessage,
                            includeAttachmentsLinks: waIncludeAttachments,
                          },
                        })}
                      </div>
                    </div>

                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-[11px] text-slate-300">
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={waAutoTrigger}
                          onChange={(e) => setWaAutoTrigger(e.target.checked)}
                          className="accent-emerald-500 rounded cursor-pointer"
                        />
                        <span>تنفيذ تلقائي عند حلول الموعد</span>
                      </label>

                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={waIncludeAttachments}
                          onChange={(e) => setWaIncludeAttachments(e.target.checked)}
                          className="accent-emerald-500 rounded cursor-pointer"
                        />
                        <span>إرفاق روابط ملفات المهمة</span>
                      </label>
                    </div>

                    <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-emerald-500/20">
                      <span className="text-[10px] text-slate-400">
                        {whatsappService.getSettings().provider !== 'none'
                          ? `🤖 الوضع الآلي مفعّل (${whatsappService.getSettings().provider}) — سيُرسل تلقائياً بدون تدخل`
                          : '💬 الوضع المباشر — يفتح المحادثة بالرسالة جاهزة (يمكن تفعيل بوابة إرسال آلي من الإعدادات)'}
                      </span>
                      <button
                        type="button"
                        disabled={!normalizeWhatsAppPhone(waPhone)}
                        onClick={async () => {
                          const testTask: Task = {
                            id: editingTask?.id || `wa-preview-${Date.now()}`,
                            title: title.trim() || 'مهمة تجريبية',
                            description: description.trim() || undefined,
                            category,
                            priority,
                            dueDate,
                            dueTime,
                            reminderMinutesBefore,
                            status: 'pending',
                            repeat: 'none',
                            createdAt: new Date().toISOString(),
                            attachments,
                            whatsapp: {
                              enabled: true,
                              phoneNumber: normalizeWhatsAppPhone(waPhone),
                              recipientName: waRecipientName.trim() || undefined,
                              customMessage: waCustomMessage.trim() || undefined,
                              autoTriggerAtDueTime: true,
                              includeAttachmentsLinks: waIncludeAttachments,
                            },
                          };
                          const res = await whatsappService.triggerTaskWhatsAppSend(testTask, {
                            allowOpenApp: true,
                            skipDedupe: true,
                          });
                          if (res.success) {
                            showWaBanner(
                              res.method === 'api'
                                ? '✅ تم إرسال رسالة التجربة عبر البوابة الآلية بنجاح!'
                                : '💬 تم فتح واتساب بالرسالة جاهزة للإرسال!'
                            );
                          } else {
                            alert(res.error || 'تعذر إرسال الرسالة');
                          }
                        }}
                        className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-[11px] font-bold flex items-center gap-1.5 disabled:opacity-40 cursor-pointer shrink-0"
                      >
                        <Send className="w-3.5 h-3.5" />
                        <span>تجربة الإرسال الآن 💬</span>
                      </button>
                    </div>
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

              <div className="pt-4 border-t border-white/[0.07] grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="btn-lux-secondary px-4 py-2.5 rounded-xl text-xs font-bold cursor-pointer"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  className="btn-lux-primary px-6 py-2.5 rounded-xl text-xs font-bold cursor-pointer"
                >
                  {editingTask ? 'حفظ التعديلات' : 'حفظ وجدولة المهمة'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Voice Task Modal for Dr. Abdelaziz */}
      <VoiceTaskModal
        isOpen={isVoiceModalOpen}
        onClose={() => setIsVoiceModalOpen(false)}
        onAddTask={(taskData) => {
          onAddTask(taskData);
          confetti({
            particleCount: 50,
            spread: 60,
            origin: { y: 0.7 },
            colors: ['#f59e0b', '#10b981', '#3b82f6', '#ec4899']
          });
        }}
      />

      {/* PDF Report Export Studio Modal */}
      <PdfExportModal
        isOpen={isPdfModalOpen}
        onClose={() => {
          setIsPdfModalOpen(false);
          setPdfInitialEmpId(undefined);
        }}
        tasks={tasks}
        employees={employees}
        initialEmployeeId={pdfInitialEmpId}
        currentDateKey={todayStr}
        defaultScope="tasks_only"
      />

      {/* Lightbox Preview for Image Attachments */}
      <ImageLightboxModal image={previewImage} onClose={() => setPreviewImage(null)} />

      {/* Employee Profile Create / Edit Modal */}
      {isEmployeeModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in">
          <div className="relative w-full max-w-lg p-6 sm:p-7 rounded-3xl lux-modal max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-5 pb-4 border-b border-white/[0.06]">
              <div className="flex items-center gap-3">
                <div className="icon-squircle-gold w-10 h-10">
                  <UserPlus className="w-5 h-5" strokeWidth={1.75} />
                </div>
                <div>
                  <h3 className="text-base sm:text-lg font-black text-white">
                    {editingEmployee ? 'تعديل ملف الموظف' : 'إنشاء ملف موظف جديد'}
                  </h3>
                  <p className="text-xs text-slate-400">
                    إدارة بيانات فريق العمل لمتابعة المهام والتقارير المرفقة
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setIsEmployeeModalOpen(false);
                  resetEmployeeForm();
                }}
                className="btn-lux-icon text-slate-400 hover:text-white cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveEmployee} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">
                  اسم الموظف / عضو الفريق *
                </label>
                <input
                  type="text"
                  required
                  placeholder="مثال: م. أحمد الشافعي"
                  value={empFormName}
                  onChange={(e) => setEmpFormName(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-white text-xs focus:outline-none focus:border-emerald-500 font-semibold"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">
                    المسمى الوظيفي
                  </label>
                  <input
                    type="text"
                    placeholder="مثال: مساعد تنفيذي / منسق عيادة"
                    value={empFormRole}
                    onChange={(e) => setEmpFormRole(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white text-xs focus:outline-none focus:border-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">
                    القسم / التخصص
                  </label>
                  <input
                    type="text"
                    placeholder="مثال: العيادة الطبية / الإدارة"
                    value={empFormDept}
                    onChange={(e) => setEmpFormDept(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white text-xs focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-bold text-slate-300">
                    رقم الهاتف المحمول
                  </label>
                  <button
                    type="button"
                    onClick={handlePickPhoneContactForEmployee}
                    className="text-[11px] text-emerald-400 hover:text-emerald-300 font-bold inline-flex items-center gap-1 cursor-pointer"
                  >
                    <Smartphone className="w-3 h-3" />
                    <span>📱 سحب من الهاتف</span>
                  </button>
                </div>
                <input
                  type="tel"
                  dir="ltr"
                  placeholder="01012345678 أو +2010..."
                  value={empFormPhone}
                  onChange={(e) => setEmpFormPhone(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white text-xs font-mono focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">
                    رقم الواتساب
                  </label>
                  <input
                    type="tel"
                    dir="ltr"
                    placeholder="2010xxxx أو اتركه كما هو"
                    value={empFormWaPhone}
                    onChange={(e) => setEmpFormWaPhone(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white text-xs font-mono focus:outline-none focus:border-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">
                    البريد الإلكتروني
                  </label>
                  <input
                    type="email"
                    dir="ltr"
                    placeholder="employee@clinic.com"
                    value={empFormEmail}
                    onChange={(e) => setEmpFormEmail(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white text-xs focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">
                  ملاحظات واختصاصات
                </label>
                <textarea
                  rows={2}
                  placeholder="المهام المنوط بها، الملاحظات الخاصة بالمتابعة والتقارير..."
                  value={empFormNotes}
                  onChange={(e) => setEmpFormNotes(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white text-xs focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-white/[0.06]">
                <button
                  type="button"
                  onClick={() => {
                    setIsEmployeeModalOpen(false);
                    resetEmployeeForm();
                  }}
                  className="btn-lux-secondary px-4 py-2.5 rounded-xl text-xs font-bold cursor-pointer"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  className="btn-lux-primary px-6 py-2.5 rounded-xl text-xs font-black cursor-pointer shadow-md"
                >
                  {editingEmployee ? 'حفظ التعديلات' : 'إنشاء الملف'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Full Employee Dossier Modal */}
      {selectedEmployeeDossier && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-md animate-fade-in">
          <div className="relative w-full max-w-3xl p-5 sm:p-7 rounded-3xl lux-modal max-h-[92vh] flex flex-col shadow-2xl">
            {/* Dossier Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-white/[0.08] shrink-0">
              <div className="flex items-center gap-3.5">
                <div className="w-13 h-13 rounded-2xl bg-gradient-to-br from-blue-500 to-emerald-500 flex items-center justify-center text-xl font-black text-white shadow-lg shrink-0">
                  {selectedEmployeeDossier.name.slice(0, 2)}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-lg sm:text-xl font-black text-white">
                      ملف الموظف: {selectedEmployeeDossier.name}
                    </h2>
                    <span className="text-[10.5px] px-2.5 py-0.5 rounded-full bg-emerald-500/15 text-emerald-300 border border-emerald-500/25 font-bold">
                      {selectedEmployeeDossier.role || 'عضو فريق'}
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 mt-0.5">
                    {selectedEmployeeDossier.department || 'العيادة والمكتب التنفيذي'} • كافة المهام والتقارير والملفات
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setPdfInitialEmpId(selectedEmployeeDossier.id);
                    setIsPdfModalOpen(true);
                  }}
                  className="btn-lux-secondary h-9 px-3 rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer"
                  title="تصدير تقرير مهام الموظف PDF"
                >
                  <FileText className="w-3.5 h-3.5 text-amber-400" />
                  <span>تصدير PDF</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    const emp = selectedEmployeeDossier;
                    resetForm();
                    setSelectedEmployeeId(emp.id);
                    setSelectedEmployeeName(emp.name);
                    if (emp.whatsappPhone || emp.phone) {
                      setWaPhone(emp.whatsappPhone || emp.phone || '');
                      setWaRecipientName(emp.name);
                      setWaEnabled(true);
                    }
                    setIsAddModalOpen(true);
                  }}
                  className="btn-lux-primary h-9 px-3.5 rounded-xl text-xs font-black flex items-center gap-1.5 cursor-pointer shadow-sm"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>مهمة جديدة له</span>
                </button>

                <button
                  type="button"
                  onClick={() => setSelectedEmployeeDossier(null)}
                  className="btn-lux-icon text-slate-400 hover:text-white cursor-pointer ml-1"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Dossier Stats & Quick Contacts */}
            {(() => {
              const dossierStats = taskService.getEmployeeStats(selectedEmployeeDossier.id, tasks);
              const empTasks = dossierStats.tasks;

              return (
                <div className="flex-1 overflow-y-auto py-4 space-y-4 pr-1">
                  {/* KPI Bar */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                    <div className="p-3 rounded-2xl bg-slate-950/70 border border-slate-800 text-center">
                      <div className="text-xl font-mono font-black text-white">{dossierStats.total}</div>
                      <div className="text-[10px] text-slate-400 font-bold mt-0.5">إجمالي المهام المسندة</div>
                    </div>
                    <div className="p-3 rounded-2xl bg-emerald-950/40 border border-emerald-500/25 text-center">
                      <div className="text-xl font-mono font-black text-emerald-400">{dossierStats.completed}</div>
                      <div className="text-[10px] text-emerald-300 font-bold mt-0.5">مهام مكتملة</div>
                    </div>
                    <div className="p-3 rounded-2xl bg-amber-950/40 border border-amber-500/25 text-center">
                      <div className="text-xl font-mono font-black text-amber-400">{dossierStats.pending}</div>
                      <div className="text-[10px] text-amber-300 font-bold mt-0.5">قيد الانتظار</div>
                    </div>
                    <div className="p-3 rounded-2xl bg-blue-950/40 border border-blue-500/25 text-center">
                      <div className="text-xl font-mono font-black text-blue-400">{dossierStats.attachmentsCount}</div>
                      <div className="text-[10px] text-blue-300 font-bold mt-0.5">ملفات ومرفقات مسجلة</div>
                    </div>
                  </div>

                  {/* Contact & Notes Card */}
                  <div className="p-3.5 rounded-2xl bg-slate-950/60 border border-slate-800 flex flex-wrap items-center justify-between gap-3 text-xs">
                    <div className="flex flex-wrap items-center gap-3">
                      {selectedEmployeeDossier.phone && (
                        <a
                          href={`tel:${selectedEmployeeDossier.phone}`}
                          className="px-2.5 py-1 rounded-xl bg-slate-900 border border-slate-700 text-slate-300 hover:text-white flex items-center gap-1.5 font-mono"
                        >
                          <Phone className="w-3 h-3 text-emerald-400" />
                          <span dir="ltr">{selectedEmployeeDossier.phone}</span>
                        </a>
                      )}
                      {(selectedEmployeeDossier.whatsappPhone || selectedEmployeeDossier.phone) && (
                        <button
                          type="button"
                          onClick={() => {
                            const p = selectedEmployeeDossier.whatsappPhone || selectedEmployeeDossier.phone || '';
                            whatsappService.openWhatsAppChat(p, `مرحباً ${selectedEmployeeDossier.name}، تقرير ومتابعة من نظام د. عبد العزيز.`);
                          }}
                          className="px-2.5 py-1 rounded-xl bg-emerald-950 border border-emerald-500/35 text-emerald-300 hover:bg-emerald-900 flex items-center gap-1.5 font-bold cursor-pointer"
                        >
                          <MessageCircle className="w-3 h-3 text-emerald-400" />
                          <span>فتح محادثة واتساب</span>
                        </button>
                      )}
                      {selectedEmployeeDossier.email && (
                        <a
                          href={`mailto:${selectedEmployeeDossier.email}`}
                          className="px-2.5 py-1 rounded-xl bg-slate-900 border border-slate-700 text-slate-300 hover:text-white flex items-center gap-1.5"
                        >
                          <Mail className="w-3 h-3 text-blue-400" />
                          <span dir="ltr">{selectedEmployeeDossier.email}</span>
                        </a>
                      )}
                    </div>

                    <button
                      type="button"
                      onClick={() => handleOpenEditEmployee(selectedEmployeeDossier)}
                      className="text-slate-400 hover:text-white flex items-center gap-1 text-[11px] font-bold cursor-pointer"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                      <span>تعديل الملف</span>
                    </button>
                  </div>

                  {/* Tasks List for this Employee */}
                  <div className="space-y-2.5">
                    <div className="flex items-center justify-between">
                      <h4 className="text-xs font-black text-white flex items-center gap-2">
                        <CheckSquare className="w-4 h-4 text-emerald-400" />
                        <span>سجل مهام ومرفقات الموظف ({empTasks.length}):</span>
                      </h4>
                      <span className="text-[11px] text-slate-400 font-bold">
                        نسبة الإنجاز: {dossierStats.rate}%
                      </span>
                    </div>

                    {empTasks.length === 0 ? (
                      <div className="p-8 rounded-2xl bg-slate-950/40 border border-slate-800 text-center space-y-2">
                        <CheckSquare className="w-8 h-8 text-slate-600 mx-auto" />
                        <p className="text-xs text-slate-400">
                          لا توجد مهام مسندة لهذا الموظف حتى الآن.
                        </p>
                        <button
                          type="button"
                          onClick={() => {
                            const emp = selectedEmployeeDossier;
                            resetForm();
                            setSelectedEmployeeId(emp.id);
                            setSelectedEmployeeName(emp.name);
                            if (emp.whatsappPhone || emp.phone) {
                              setWaPhone(emp.whatsappPhone || emp.phone || '');
                              setWaRecipientName(emp.name);
                              setWaEnabled(true);
                            }
                            setIsAddModalOpen(true);
                          }}
                          className="btn-lux-primary px-4 py-2 rounded-xl text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer mt-1"
                        >
                          <Plus className="w-3.5 h-3.5" />
                          <span>إضافة أول مهمة لهذا الموظف</span>
                        </button>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {empTasks.map((t) => {
                          const isDone = t.status === 'completed';
                          return (
                            <div
                              key={t.id}
                              className={`p-3.5 rounded-2xl border transition-all ${
                                isDone
                                  ? 'bg-slate-950/40 border-slate-800/60 opacity-80'
                                  : 'bg-slate-900/80 border-slate-800 hover:border-emerald-500/30'
                              }`}
                            >
                              <div className="flex items-start justify-between gap-3">
                                <div className="flex items-start gap-2.5 flex-1 min-w-0">
                                  <button
                                    type="button"
                                    onClick={() => handleToggle(t.id)}
                                    className={`mt-0.5 w-5 h-5 rounded-lg flex items-center justify-center transition-all cursor-pointer border ${
                                      isDone
                                        ? 'bg-emerald-500 border-emerald-400 text-white'
                                        : 'bg-slate-800 border-slate-600 hover:border-emerald-500 text-transparent'
                                    }`}
                                  >
                                    <CheckCircle2 className="w-3.5 h-3.5 fill-current" />
                                  </button>
                                  <div className="space-y-1 flex-1 min-w-0">
                                    <div className="flex flex-wrap items-center gap-2">
                                      <span
                                        className={`text-xs font-black ${
                                          isDone ? 'line-through text-slate-500' : 'text-white'
                                        }`}
                                      >
                                        {t.title}
                                      </span>
                                      <span
                                        className={`text-[9.5px] px-2 py-0.5 rounded-full font-bold border ${
                                          t.priority === 'urgent'
                                            ? 'bg-rose-500/20 text-rose-300 border-rose-500/30'
                                            : t.priority === 'high'
                                            ? 'bg-amber-500/20 text-amber-300 border-amber-500/30'
                                            : 'bg-blue-500/20 text-blue-300 border-blue-500/30'
                                        }`}
                                      >
                                        {t.priority === 'urgent'
                                          ? 'عاجل'
                                          : t.priority === 'high'
                                          ? 'مرتفع'
                                          : 'عادي'}
                                      </span>
                                    </div>
                                    {t.description && (
                                      <p className="text-[11px] text-slate-400 leading-relaxed line-clamp-2">
                                        {t.description}
                                      </p>
                                    )}

                                    {/* Attachments for this task */}
                                    {t.attachments && t.attachments.length > 0 && (
                                      <div className="flex flex-wrap items-center gap-1.5 pt-1">
                                        {t.attachments.map((att) => (
                                          <button
                                            key={att.id}
                                            type="button"
                                            onClick={() =>
                                              taskAttachmentService.openAttachment(att, (url, title) =>
                                                setPreviewImage({ url, title })
                                              )
                                            }
                                            className="px-2 py-0.5 rounded-lg bg-indigo-500/15 border border-indigo-500/30 text-indigo-200 text-[10px] font-bold flex items-center gap-1 hover:bg-indigo-500/25 cursor-pointer"
                                          >
                                            <Paperclip className="w-3 h-3" />
                                            <span className="truncate max-w-[120px]">{att.name}</span>
                                          </button>
                                        ))}
                                      </div>
                                    )}
                                  </div>
                                </div>

                                <div className="flex flex-col items-end gap-1.5 shrink-0">
                                  <div className="text-[10px] text-slate-400 font-mono text-left" dir="ltr">
                                    <span>{t.dueDate || '—'}</span> {t.dueTime && <strong>{t.dueTime}</strong>}
                                  </div>
                                  <div className="flex items-center gap-1">
                                    {t.whatsapp?.enabled && (
                                      <button
                                        type="button"
                                        onClick={() => handleSendTaskWhatsAppNow(t)}
                                        className="p-1 rounded-lg bg-emerald-950/60 text-emerald-400 border border-emerald-500/30 hover:bg-emerald-900 cursor-pointer"
                                        title="إرسال المهمة على الواتساب الآن"
                                      >
                                        <MessageCircle className="w-3.5 h-3.5" />
                                      </button>
                                    )}
                                    <button
                                      type="button"
                                      onClick={() => handleOpenEdit(t)}
                                      className="p-1 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white cursor-pointer"
                                      title="تعديل المهمة"
                                    >
                                      <Edit3 className="w-3.5 h-3.5" />
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => onDeleteTask(t.id)}
                                      className="p-1 rounded-lg hover:bg-rose-500/20 text-slate-400 hover:text-rose-400 cursor-pointer"
                                      title="حذف المهمة"
                                    >
                                      <Trash2 className="w-3.5 h-3.5" />
                                    </button>
                                  </div>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>
              );
            })()}
          </div>
        </div>
      )}
    </div>
  );
};
