import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Link } from 'wouter';
import {
  ArrowUpRight,
  BookOpen,
  CalendarDays,
  Check,
  ChevronRight,
  Circle,
  CircleCheck,
  Clock3,
  Eye,
  Inbox,
  ListChecks,
  Pencil,
  Plus,
  RefreshCw,
  Sparkles,
  Target,
  Trash2,
  X,
} from 'lucide-react';
import {
  getGetDashboardSummaryQueryKey,
  getGetTaskQueryKey,
  getListTasksQueryKey,
  useCreateTask,
  useDeleteTask,
  useGetDashboardSummary,
  useGetTask,
  useListTasks,
  useUpdateTask,
} from '@workspace/api-client-react';
import type { ChecklistItem, Task } from '@workspace/api-client-react';

type Filter = 'all' | 'open' | 'completed';

const todayKey = () => {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
};

const displayDate = (value: string | null | undefined) => {
  if (!value) return null;
  const date = new Date(`${value}T12:00:00`);
  if (Number.isNaN(date.getTime())) return null;
  return new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric' }).format(date);
};

const newItemId = () =>
  typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `${Math.random().toString(36).slice(2)}${Date.now().toString(36)}`;

const weekday = new Intl.DateTimeFormat('en-US', { weekday: 'long' }).format(new Date());
const longDate = new Intl.DateTimeFormat('en-US', { month: 'long', day: 'numeric', year: 'numeric' }).format(new Date());

function SkeletonRows() {
  return (
    <div className="space-y-3" data-testid="loading-tasks">
      {[0, 1, 2, 3].map((item) => (
        <div key={item} className="flex items-center gap-4 rounded-xl border border-border/70 bg-card px-4 py-4">
          <div className="skeleton h-5 w-5 rounded-full" />
          <div className="min-w-0 flex-1 space-y-2">
            <div className="skeleton h-4 w-3/5 rounded" />
            <div className="skeleton h-3 w-2/5 rounded" />
          </div>
          <div className="skeleton hidden h-7 w-20 rounded-full sm:block" />
        </div>
      ))}
    </div>
  );
}

function MetricCard({ label, value, detail, tint }: { label: string; value: number; detail: string; tint: string }) {
  return (
    <div className={`relative overflow-hidden rounded-2xl border border-border/75 bg-card p-5 shadow-[0_8px_24px_rgba(39,48,76,0.04)] ${tint}`} data-testid={`metric-${label.toLowerCase().replaceAll(' ', '-')}`}>
      <div className="absolute -right-5 -top-7 h-24 w-24 rounded-full bg-current opacity-[0.07]" />
      <p className="relative text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">{label}</p>
      <p className="relative mt-3 font-mono text-3xl font-bold tracking-[-0.06em] text-foreground">{value}</p>
      <p className="relative mt-1 text-sm text-muted-foreground">{detail}</p>
    </div>
  );
}

function TaskRow({
  task,
  onToggle,
  onView,
  onEdit,
  onDelete,
  deleting,
}: {
  task: Task;
  onToggle: (task: Task) => void;
  onView: (task: Task) => void;
  onEdit: (task: Task) => void;
  onDelete: (task: Task) => void;
  deleting: boolean;
}) {
  const due = displayDate(task.dueDate);
  const isOverdue = task.dueDate && !task.completed && task.dueDate < todayKey();
  const checklist = task.checklist ?? [];
  const checklistDone = checklist.filter((item) => item.done).length;
  return (
    <div className={`group flex items-center gap-3 rounded-2xl border border-border/75 bg-card px-4 py-4 shadow-[0_6px_18px_rgba(39,48,76,0.035)] transition-all duration-200 hover:-translate-y-0.5 hover:border-primary/35 hover:shadow-[0_10px_24px_rgba(39,48,76,0.08)] ${task.completed ? 'bg-card/65' : ''} ${deleting ? 'pointer-events-none opacity-50' : ''}`} data-testid={`task-row-${task.id}`}>
      <button
        type="button"
        aria-label={task.completed ? `Mark ${task.title} open` : `Complete ${task.title}`}
        onClick={() => onToggle(task)}
        className={`relative flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2 ${task.completed ? 'border-primary bg-primary text-primary-foreground' : 'border-muted-foreground/35 text-transparent hover:border-primary hover:text-primary/30'}`}
        data-testid={`button-toggle-task-${task.id}`}
      >
        <Check className="h-3.5 w-3.5 stroke-[3]" />
      </button>
      <div className="min-w-0 flex-1">
        <p className={`truncate text-[15px] font-semibold tracking-[-0.01em] ${task.completed ? 'text-muted-foreground line-through decoration-primary/60' : 'text-foreground'}`} data-testid={`text-task-title-${task.id}`}>
          {task.title}
        </p>
        {task.description && <p className="mt-1 truncate text-sm text-muted-foreground" data-testid={`text-task-description-${task.id}`}>{task.description}</p>}
      </div>
      {checklist.length > 0 && (
        <span className="hidden items-center gap-1.5 rounded-full bg-secondary px-2.5 py-1 text-xs font-medium text-secondary-foreground sm:flex" data-testid={`status-checklist-${task.id}`}>
          <ListChecks className="h-3.5 w-3.5" />
          {checklistDone}/{checklist.length}
        </span>
      )}
      {due && (
        <span className={`hidden items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium sm:flex ${isOverdue ? 'bg-destructive/10 text-destructive' : 'bg-secondary text-secondary-foreground'}`} data-testid={`status-due-${task.id}`}>
          <CalendarDays className="h-3.5 w-3.5" />
          {isOverdue ? 'Overdue' : due}
        </span>
      )}
      <button type="button" onClick={() => onView(task)} aria-label={`View ${task.title}`} className="inline-flex shrink-0 items-center gap-1.5 rounded-xl bg-secondary px-3 py-2 text-xs font-semibold text-secondary-foreground hover:bg-muted" data-testid={`button-view-task-${task.id}`}>
        <Eye className="h-4 w-4" />
        <span className="hidden sm:inline">View</span>
      </button>
      <div className="flex shrink-0 items-center gap-1 opacity-100 sm:opacity-0 sm:transition-opacity sm:group-hover:opacity-100">
        <button type="button" onClick={() => onEdit(task)} aria-label={`Edit ${task.title}`} className="rounded-lg p-2 text-muted-foreground hover:bg-secondary hover:text-foreground" data-testid={`button-edit-task-${task.id}`}>
          <Pencil className="h-4 w-4" />
        </button>
        <button type="button" onClick={() => onDelete(task)} aria-label={`Delete ${task.title}`} className="rounded-lg p-2 text-muted-foreground hover:bg-destructive/10 hover:text-destructive" data-testid={`button-delete-task-${task.id}`}>
          <Trash2 className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}

function ChecklistEditor({
  items,
  onChange,
}: {
  items: ChecklistItem[];
  onChange: (next: ChecklistItem[]) => void;
}) {
  const [draft, setDraft] = useState('');
  const doneCount = items.filter((item) => item.done).length;
  const percent = items.length > 0 ? Math.round((doneCount / items.length) * 100) : 0;

  // Each line becomes its own item, so a whole pasted list works too.
  const addItems = () => {
    const lines = draft
      .split('\n')
      .map((line) => line.replace(/^\s*(?:[-*\u2022]|\d+[.)])\s*/, '').trim())
      .filter((line) => line.length > 0);
    if (lines.length === 0) return;
    setDraft('');
    onChange([...items, ...lines.map((text) => ({ id: newItemId(), text, done: false }))]);
  };

  const toggleItem = (id: string) => onChange(items.map((item) => (item.id === id ? { ...item, done: !item.done } : item)));
  const removeItem = (id: string) => onChange(items.filter((item) => item.id !== id));

  return (
    <div>
      <div className="flex items-center justify-between">
        <h3 className="text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">To-do list <span className="font-normal normal-case tracking-normal">(optional)</span></h3>
        {items.length > 0 && <span className="font-mono text-xs text-muted-foreground" data-testid="text-checklist-progress">{doneCount}/{items.length} done</span>}
      </div>
      {items.length > 0 && <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-secondary"><div className="h-full rounded-full bg-primary transition-all duration-500" style={{ width: `${percent}%` }} /></div>}

      {items.length === 0 ? (
        <p className="mt-3 rounded-xl border border-dashed border-border px-4 py-4 text-center text-sm text-muted-foreground" data-testid="state-checklist-empty">No steps yet. Add the first one below.</p>
      ) : (
        <ul className="mt-3 space-y-1" data-testid="list-checklist">
          {items.map((item) => (
            <li key={item.id} className="group flex items-start gap-3 rounded-xl px-2 py-2 hover:bg-secondary/60" data-testid={`checklist-item-${item.id}`}>
              <button type="button" onClick={() => toggleItem(item.id)} aria-label={item.done ? `Mark "${item.text}" not done` : `Mark "${item.text}" done`} className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-md border-2 ${item.done ? 'border-primary bg-primary text-primary-foreground' : 'border-muted-foreground/35 text-transparent hover:border-primary'}`}>
                <Check className="h-3 w-3 stroke-[3]" />
              </button>
              <span className={`min-w-0 flex-1 break-words text-[15px] leading-6 ${item.done ? 'text-muted-foreground line-through decoration-primary/60' : 'text-foreground'}`}>{item.text}</span>
              <button type="button" onClick={() => removeItem(item.id)} aria-label={`Remove "${item.text}"`} className="rounded-lg p-1 text-muted-foreground opacity-100 hover:bg-destructive/10 hover:text-destructive sm:opacity-0 sm:transition-opacity sm:group-hover:opacity-100">
                <X className="h-4 w-4" />
              </button>
            </li>
          ))}
        </ul>
      )}

      <div className="mt-3 flex items-start gap-2">
        <textarea
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'Enter' && !event.shiftKey) {
              event.preventDefault();
              addItems();
            }
          }}
          onBlur={addItems}
          rows={1}
          placeholder="Add a step (paste a list to add many)"
          className="min-h-[46px] w-full resize-none rounded-xl border border-input bg-background px-4 py-3 text-[15px] placeholder:text-muted-foreground/65"
          data-testid="input-checklist-item"
        />
        <button type="button" onClick={addItems} disabled={draft.trim().length === 0} className="inline-flex h-[46px] shrink-0 items-center gap-1.5 rounded-xl bg-primary px-4 text-sm font-bold text-primary-foreground disabled:pointer-events-none disabled:opacity-50" data-testid="button-add-checklist-item">
          <Plus className="h-4 w-4" /> Add
        </button>
      </div>
    </div>
  );
}

function TaskDetailModal({
  task,
  onClose,
  onEdit,
}: {
  task: Task;
  onClose: () => void;
  onEdit: (task: Task) => void;
}) {
  const queryClient = useQueryClient();
  const updateTask = useUpdateTask();
  const [items, setItems] = useState<ChecklistItem[]>(task.checklist ?? []);
  const [error, setError] = useState('');

  const due = displayDate(task.dueDate);

  const save = (next: ChecklistItem[]) => {
    setItems(next);
    setError('');
    updateTask.mutate({ id: task.id, data: { checklist: next } }, {
      onSuccess: async () => {
        await Promise.all([
          queryClient.invalidateQueries({ queryKey: getListTasksQueryKey() }),
          queryClient.invalidateQueries({ queryKey: getGetTaskQueryKey(task.id) }),
        ]);
      },
      onError: () => setError('Could not save your list. Try again.'),
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-foreground/25 p-0 backdrop-blur-[2px] sm:items-center sm:p-6" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
      <div className="max-h-[92dvh] w-full max-w-xl animate-rise-in overflow-y-auto rounded-t-3xl border border-border bg-card p-6 shadow-2xl sm:rounded-3xl" role="dialog" aria-modal="true" aria-labelledby="task-detail-title" data-testid="dialog-task-detail">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <p className="font-mono text-[10px] font-bold uppercase tracking-[0.22em] text-primary">Full task</p>
            <h2 id="task-detail-title" className="mt-2 break-words text-2xl font-bold tracking-[-0.04em]" data-testid="text-detail-title">{task.title}</h2>
          </div>
          <div className="flex shrink-0 items-center gap-1">
            <button type="button" onClick={() => onEdit(task)} aria-label="Edit task details" className="rounded-xl p-2 text-muted-foreground hover:bg-secondary hover:text-foreground" data-testid="button-detail-edit"><Pencil className="h-5 w-5" /></button>
            <button type="button" onClick={onClose} aria-label="Close" className="rounded-xl p-2 text-muted-foreground hover:bg-secondary hover:text-foreground" data-testid="button-detail-close"><X className="h-5 w-5" /></button>
          </div>
        </div>

        {task.description && <p className="mt-4 whitespace-pre-wrap text-[15px] leading-6 text-muted-foreground" data-testid="text-detail-description">{task.description}</p>}
        {due && <p className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-secondary px-2.5 py-1 text-xs font-medium text-secondary-foreground"><CalendarDays className="h-3.5 w-3.5" /> Due {due}</p>}

        <div className="mt-7">
          <ChecklistEditor items={items} onChange={save} />
          {error && <p className="mt-3 rounded-xl bg-destructive/10 px-3 py-2 text-sm text-destructive" role="alert" data-testid="status-checklist-error">{error}</p>}
        </div>
      </div>
    </div>
  );
}

function TaskModal({
  taskId,
  onClose,
  onCreated,
}: {
  taskId: string | null;
  onClose: () => void;
  onCreated: () => void;
}) {
  const queryClient = useQueryClient();
  const isEditing = Boolean(taskId);
  const detailQuery = useGetTask(taskId ?? '', {
    query: { enabled: isEditing, queryKey: getGetTaskQueryKey(taskId ?? '') },
  });
  const createTask = useCreateTask();
  const updateTask = useUpdateTask();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [checklist, setChecklist] = useState<ChecklistItem[]>([]);
  const [formError, setFormError] = useState('');

  useEffect(() => {
    if (detailQuery.data) {
      setTitle(detailQuery.data.title);
      setDescription(detailQuery.data.description ?? '');
      setDueDate(detailQuery.data.dueDate ?? '');
      setChecklist(detailQuery.data.checklist ?? []);
    }
  }, [detailQuery.data]);

  const pending = createTask.isPending || updateTask.isPending;
  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const cleanTitle = title.trim();
    if (!cleanTitle) {
      setFormError('Give this task a short title first.');
      return;
    }
    setFormError('');
    const data = { title: cleanTitle, description: description.trim() || null, dueDate: dueDate || null, checklist };
    if (taskId) {
      updateTask.mutate({ id: taskId, data }, {
        onSuccess: async () => {
          await Promise.all([
            queryClient.invalidateQueries({ queryKey: getListTasksQueryKey() }),
            queryClient.invalidateQueries({ queryKey: getGetDashboardSummaryQueryKey() }),
            queryClient.invalidateQueries({ queryKey: getGetTaskQueryKey(taskId) }),
          ]);
          onCreated();
        },
        onError: () => setFormError('Could not save this task. Try again.'),
      });
    } else {
      createTask.mutate({ data }, {
        onSuccess: async () => {
          await Promise.all([
            queryClient.invalidateQueries({ queryKey: getListTasksQueryKey() }),
            queryClient.invalidateQueries({ queryKey: getGetDashboardSummaryQueryKey() }),
          ]);
          onCreated();
        },
        onError: () => setFormError('Could not create this task. Try again.'),
      });
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-foreground/25 p-0 backdrop-blur-[2px] sm:items-center sm:p-6" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
      <div className="max-h-[92dvh] w-full max-w-lg animate-rise-in overflow-y-auto rounded-t-3xl border border-border bg-card p-6 shadow-2xl sm:rounded-3xl" role="dialog" aria-modal="true" aria-labelledby="task-modal-title" data-testid="dialog-task">
        <div className="flex items-start justify-between">
          <div>
            <p className="font-mono text-[10px] font-bold uppercase tracking-[0.22em] text-primary">{isEditing ? 'Refine task' : 'New intention'}</p>
            <h2 id="task-modal-title" className="mt-2 text-2xl font-bold tracking-[-0.04em]">{isEditing ? 'Make it clearer.' : 'What moves today forward?'}</h2>
          </div>
          <button type="button" onClick={onClose} aria-label="Close task form" className="rounded-xl p-2 text-muted-foreground hover:bg-secondary hover:text-foreground" data-testid="button-close-task-form"><X className="h-5 w-5" /></button>
        </div>
        {isEditing && detailQuery.isLoading ? (
          <div className="mt-8 space-y-4" data-testid="loading-task-detail"><div className="skeleton h-12 rounded-xl" /><div className="skeleton h-24 rounded-xl" /><div className="skeleton h-12 rounded-xl" /></div>
        ) : (
          <form className="mt-7 space-y-5" onSubmit={submit}>
            <label className="block">
              <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">Task title</span>
              <input autoFocus={!isEditing} value={title} onChange={(event) => setTitle(event.target.value)} placeholder="e.g. Outline the opening paragraph" className="w-full rounded-xl border border-input bg-background px-4 py-3 text-[15px] placeholder:text-muted-foreground/65" data-testid="input-task-title" />
            </label>
            <label className="block">
              <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">A little context <span className="font-normal normal-case tracking-normal">(optional)</span></span>
              <textarea value={description} onChange={(event) => setDescription(event.target.value)} placeholder="What does done look like?" rows={3} className="w-full resize-none rounded-xl border border-input bg-background px-4 py-3 text-[15px] placeholder:text-muted-foreground/65" data-testid="input-task-description" />
            </label>
            <label className="block">
              <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">Due date <span className="font-normal normal-case tracking-normal">(optional)</span></span>
              <input type="date" value={dueDate} onChange={(event) => setDueDate(event.target.value)} className="w-full rounded-xl border border-input bg-background px-4 py-3 text-[15px]" data-testid="input-task-due-date" />
            </label>
            <ChecklistEditor items={checklist} onChange={setChecklist} />
            {formError && <p className="rounded-xl bg-destructive/10 px-3 py-2 text-sm text-destructive" role="alert" data-testid="status-task-form-error">{formError}</p>}
            <div className="flex justify-end gap-3 pt-1">
              <button type="button" onClick={onClose} className="rounded-xl px-4 py-2.5 text-sm font-semibold text-muted-foreground hover:bg-secondary hover:text-foreground" data-testid="button-cancel-task">Cancel</button>
              <button type="submit" disabled={pending} className="inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-sm font-bold text-primary-foreground shadow-[0_5px_0_hsl(167_48%_27%)] hover:-translate-y-0.5 hover:shadow-[0_7px_0_hsl(167_48%_27%)] disabled:pointer-events-none disabled:opacity-60" data-testid="button-save-task">
                {pending ? 'Saving…' : isEditing ? 'Save changes' : 'Add to today'}
                {!pending && <ArrowUpRight className="h-4 w-4" />}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}

export default function Home() {
  const queryClient = useQueryClient();
  const [filter, setFilter] = useState<Filter>('all');
  const [modalTaskId, setModalTaskId] = useState<string | null | undefined>(undefined);
  const [deleteTarget, setDeleteTarget] = useState<Task | null>(null);
  const [detailTask, setDetailTask] = useState<Task | null>(null);
  const [actionError, setActionError] = useState('');
  const listQuery = useListTasks(filter === 'all' ? undefined : { status: filter }, { query: { queryKey: getListTasksQueryKey(filter === 'all' ? undefined : { status: filter }) } });
  const summaryQuery = useGetDashboardSummary({ query: { queryKey: getGetDashboardSummaryQueryKey() } });
  const updateTask = useUpdateTask();
  const deleteTask = useDeleteTask();

  const tasks = useMemo(() => listQuery.data ?? [], [listQuery.data]);
  const summary = summaryQuery.data;
  const percent = summary && summary.total > 0 ? Math.round((summary.completed / summary.total) * 100) : 0;
  const openModal = (task: Task | null = null) => setModalTaskId(task ? task.id : null);

  const toggleTask = (task: Task) => {
    setActionError('');
    updateTask.mutate({ id: task.id, data: { completed: !task.completed } }, {
      onSuccess: async () => {
        await Promise.all([
          queryClient.invalidateQueries({ queryKey: getListTasksQueryKey() }),
          queryClient.invalidateQueries({ queryKey: getGetDashboardSummaryQueryKey() }),
        ]);
      },
      onError: () => setActionError('That update did not stick. Please try again.'),
    });
  };

  const confirmDelete = () => {
    if (!deleteTarget) return;
    setActionError('');
    deleteTask.mutate({ id: deleteTarget.id }, {
      onSuccess: async () => {
        setDeleteTarget(null);
        await Promise.all([
          queryClient.invalidateQueries({ queryKey: getListTasksQueryKey() }),
          queryClient.invalidateQueries({ queryKey: getGetDashboardSummaryQueryKey() }),
        ]);
      },
      onError: () => setActionError('Could not remove this task. Please try again.'),
    });
  };

  const isInitialLoading = listQuery.isLoading || summaryQuery.isLoading;
  const isError = listQuery.isError || summaryQuery.isError;

  return (
    <div className="min-h-[100dvh] bg-background">
      <aside className="fixed inset-y-0 left-0 hidden w-[244px] flex-col bg-sidebar px-5 py-6 text-sidebar-foreground md:flex">
        <div className="flex items-center gap-3 px-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-sidebar-primary text-sidebar-primary-foreground"><Target className="h-5 w-5" /></div>
          <div><p className="text-sm font-bold tracking-[-0.02em]">Task Dashboard</p><p className="font-mono text-[9px] uppercase tracking-[0.18em] text-sidebar-foreground/55">Personal space</p></div>
        </div>
        <div className="mt-12">
          <p className="px-3 font-mono text-[10px] font-bold uppercase tracking-[0.18em] text-sidebar-foreground/40">Workspace</p>
           <button type="button" onClick={() => setFilter('all')} className={`mt-3 flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left text-sm font-semibold ${filter === 'all' ? 'bg-sidebar-accent text-sidebar-accent-foreground' : 'text-sidebar-foreground/70 hover:bg-sidebar-accent/60 hover:text-sidebar-foreground'}`} data-testid="button-sidebar-today"><ListChecks className="h-4 w-4" /> Today <span className="ml-auto font-mono text-xs opacity-50">{summary?.open ?? '—'}</span></button>
           <Link href="/workspace" className="mt-1 flex w-full items-center gap-3 rounded-xl px-3 py-3 text-sm font-semibold text-sidebar-foreground/70 hover:bg-sidebar-accent/60 hover:text-sidebar-foreground" data-testid="link-sidebar-workspace"><BookOpen className="h-4 w-4" /> Pages <ArrowUpRight className="ml-auto h-3.5 w-3.5 opacity-50" /></Link>
          <button type="button" onClick={() => setFilter('completed')} className={`mt-1 flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left text-sm font-semibold ${filter === 'completed' ? 'bg-sidebar-accent text-sidebar-accent-foreground' : 'text-sidebar-foreground/70 hover:bg-sidebar-accent/60 hover:text-sidebar-foreground'}`} data-testid="button-sidebar-completed"><CircleCheck className="h-4 w-4" /> Completed <span className="ml-auto font-mono text-xs opacity-50">{summary?.completed ?? '—'}</span></button>
        </div>
        <div className="mt-auto rounded-2xl border border-sidebar-border bg-sidebar-accent/55 p-4">
          <div className="flex items-center justify-between"><span className="font-mono text-[10px] uppercase tracking-[0.15em] text-sidebar-foreground/55">Your rhythm</span><Sparkles className="h-4 w-4 text-sidebar-primary" /></div>
          <p className="mt-3 text-sm leading-5 text-sidebar-foreground/75">Small progress is still progress. Keep the next thing close.</p>
        </div>
      </aside>

      <main className="md:pl-[244px]">
        <div className="mx-auto max-w-[1180px] px-5 py-6 sm:px-8 sm:py-9 lg:px-12">
          <header className="flex items-start justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-primary"><span className="h-2 w-2 rounded-full bg-accent" /> {weekday}</div>
              <h1 className="mt-3 text-3xl font-bold tracking-[-0.055em] sm:text-[42px]" data-testid="text-page-title">Good morning, Josh.</h1>
              <p className="mt-2 text-sm text-muted-foreground" data-testid="text-current-date">{longDate} <span className="mx-2 text-border">/</span> a clear place to begin</p>
            </div>
            <button type="button" onClick={() => openModal()} className="group inline-flex shrink-0 items-center gap-2 rounded-xl bg-primary px-4 py-3 text-sm font-bold text-primary-foreground shadow-[0_5px_0_hsl(167_48%_27%)] hover:-translate-y-0.5 hover:shadow-[0_7px_0_hsl(167_48%_27%)]" data-testid="button-add-task"><Plus className="h-4 w-4 transition-transform group-hover:rotate-90" /> <span className="hidden sm:inline">New task</span><span className="sm:hidden">Add</span></button>
          </header>

          <section className="mt-9 grid gap-3 sm:grid-cols-2 lg:grid-cols-4" aria-label="Progress summary">
            {isInitialLoading ? [0, 1, 2, 3].map((item) => <div key={item} className="skeleton h-[130px] rounded-2xl" />) : (
              <>
                <MetricCard label="Open" value={summary?.open ?? tasks.filter((task) => !task.completed).length} detail="still in motion" tint="text-primary" />
                <MetricCard label="Completed" value={summary?.completed ?? tasks.filter((task) => task.completed).length} detail="made it over the line" tint="text-accent" />
                <MetricCard label="Due today" value={summary?.dueToday ?? 0} detail="worth a closer look" tint="text-[#d19a35]" />
                <div className="relative overflow-hidden rounded-2xl bg-sidebar p-5 text-sidebar-foreground shadow-[0_8px_24px_rgba(39,48,76,0.09)]" data-testid="metric-progress">
                  <div className="flex items-start justify-between"><p className="text-xs font-semibold uppercase tracking-[0.14em] text-sidebar-foreground/60">Progress</p><span className="font-mono text-sm text-sidebar-primary">{percent}%</span></div>
                  <div className="mt-5 h-2 overflow-hidden rounded-full bg-sidebar-accent"><div className="h-full rounded-full bg-sidebar-primary transition-all duration-700" style={{ width: `${percent}%` }} /></div>
                  <p className="mt-3 text-sm text-sidebar-foreground/65">A little lighter than when you started.</p>
                </div>
              </>
            )}
          </section>

          <div className="mt-10 grid gap-8 lg:grid-cols-[minmax(0,1fr)_310px]">
            <section>
              <div className="flex flex-wrap items-end justify-between gap-3">
                <div><p className="font-mono text-[10px] font-bold uppercase tracking-[0.2em] text-primary">Your queue</p><h2 className="mt-2 text-2xl font-bold tracking-[-0.045em]">Keep the day moving.</h2></div>
                <div className="flex items-center rounded-xl border border-border bg-card p-1" role="tablist" aria-label="Task filters">
                  {(['all', 'open', 'completed'] as Filter[]).map((item) => <button key={item} type="button" role="tab" aria-selected={filter === item} onClick={() => setFilter(item)} className={`rounded-lg px-3 py-1.5 text-xs font-semibold capitalize ${filter === item ? 'bg-secondary text-foreground' : 'text-muted-foreground hover:text-foreground'}`} data-testid={`button-filter-${item}`}>{item}</button>)}
                </div>
              </div>
              {actionError && <div className="mt-4 flex items-center justify-between rounded-xl bg-destructive/10 px-4 py-3 text-sm text-destructive" role="alert" data-testid="status-action-error"><span>{actionError}</span><button type="button" onClick={() => setActionError('')} aria-label="Dismiss error"><X className="h-4 w-4" /></button></div>}
              <div className="mt-5">
                 {isInitialLoading ? <SkeletonRows /> : isError ? (
                   <div className="quiet-grid rounded-2xl border border-border/80 bg-card px-6 py-12 text-center" data-testid="state-task-error"><RefreshCw className="mx-auto h-6 w-6 text-primary" /><p className="mt-4 font-semibold">The queue took a quiet moment.</p><p className="mt-1 text-sm text-muted-foreground">Run <code className="rounded bg-secondary px-1.5 py-0.5 text-xs">supabase/schema.sql</code> in the Supabase SQL Editor, then try again.</p><button type="button" onClick={() => { listQuery.refetch(); summaryQuery.refetch(); }} className="mt-5 rounded-xl bg-secondary px-4 py-2 text-sm font-semibold hover:bg-muted" data-testid="button-retry-tasks">Try again</button></div>
                ) : tasks.length === 0 ? (
                  <div className="quiet-grid rounded-2xl border border-dashed border-border bg-card px-6 py-14 text-center" data-testid="state-task-empty"><div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-secondary text-primary"><Inbox className="h-6 w-6" /></div><p className="mt-5 text-lg font-bold">{filter === 'completed' ? 'Nothing completed yet.' : filter === 'open' ? 'Your open queue is clear.' : 'A blank page, for once.'}</p><p className="mx-auto mt-2 max-w-xs text-sm leading-5 text-muted-foreground">{filter === 'completed' ? 'Finish a task and it will land here as proof of progress.' : 'Add one meaningful thing and give the day a direction.'}</p>{filter !== 'completed' && <button type="button" onClick={() => openModal()} className="mt-6 inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-bold text-primary-foreground" data-testid="button-empty-add-task"><Plus className="h-4 w-4" /> Add a task</button>}</div>
                ) : (
                  <div className="space-y-3" data-testid="list-tasks">{tasks.map((task) => <TaskRow key={task.id} task={task} onToggle={toggleTask} onView={setDetailTask} onEdit={openModal} onDelete={setDeleteTarget} deleting={deleteTask.isPending && deleteTarget?.id === task.id} />)}</div>
                )}
              </div>
            </section>

            <aside className="space-y-5">
              <section className="rounded-2xl border border-border/75 bg-secondary/55 p-5" data-testid="card-next-up">
                <div className="flex items-center justify-between"><div className="flex items-center gap-2"><Clock3 className="h-4 w-4 text-primary" /><h2 className="text-sm font-bold">Next up</h2></div><span className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">in order</span></div>
                <div className="mt-4 space-y-1">
                  {(summary?.nextTasks ?? tasks.filter((task) => !task.completed).slice(0, 3)).slice(0, 3).map((task, index) => <button type="button" key={task.id} onClick={() => openModal(task)} className="group flex w-full items-center gap-3 rounded-xl px-2 py-3 text-left hover:bg-card" data-testid={`button-next-task-${task.id}`}><span className="font-mono text-[10px] text-muted-foreground/70">0{index + 1}</span><span className="min-w-0 flex-1 truncate text-sm font-semibold">{task.title}</span><ChevronRight className="h-4 w-4 text-muted-foreground/50 transition-transform group-hover:translate-x-0.5" /></button>)}
                  {!summary?.nextTasks?.length && !tasks.some((task) => !task.completed) && <p className="px-2 py-4 text-sm text-muted-foreground">The next thing is yours to choose.</p>}
                </div>
              </section>
              <section className="relative overflow-hidden rounded-2xl bg-accent p-5 text-foreground" data-testid="card-focus-note">
                <div className="absolute -bottom-10 -right-7 h-32 w-32 rounded-full border-[18px] border-foreground/10" />
                <div className="relative"><p className="font-mono text-[10px] font-bold uppercase tracking-[0.17em] text-foreground/60">A note for today</p><p className="mt-4 max-w-[220px] text-lg font-bold leading-6 tracking-[-0.03em]">Finish the small thing before chasing the big one.</p><div className="mt-5 flex items-center gap-2 text-xs font-semibold text-foreground/65"><Circle className="h-3.5 w-3.5" /> one step is enough</div></div>
              </section>
              <div className="flex items-center gap-2 px-2 text-xs text-muted-foreground"><CalendarDays className="h-3.5 w-3.5" /> Your list is ordered by what comes next.</div>
            </aside>
          </div>
        </div>
      </main>

      {detailTask && <TaskDetailModal key={detailTask.id} task={detailTask} onClose={() => setDetailTask(null)} onEdit={(task) => { setDetailTask(null); openModal(task); }} />}
      {modalTaskId !== undefined && <TaskModal taskId={modalTaskId} onClose={() => setModalTaskId(undefined)} onCreated={() => setModalTaskId(undefined)} />}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/25 p-5 backdrop-blur-[2px]" role="presentation">
          <div className="w-full max-w-sm animate-rise-in rounded-3xl border border-border bg-card p-6 shadow-2xl" role="dialog" aria-modal="true" aria-labelledby="delete-dialog-title" data-testid="dialog-delete-task">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-destructive/10 text-destructive"><Trash2 className="h-5 w-5" /></div>
            <h2 id="delete-dialog-title" className="mt-5 text-xl font-bold tracking-[-0.03em]">Remove this task?</h2>
            <p className="mt-2 text-sm leading-5 text-muted-foreground">“{deleteTarget.title}” will be removed from your day for good.</p>
            <div className="mt-6 flex justify-end gap-3"><button type="button" onClick={() => setDeleteTarget(null)} className="rounded-xl px-4 py-2.5 text-sm font-semibold text-muted-foreground hover:bg-secondary" data-testid="button-cancel-delete">Keep it</button><button type="button" onClick={confirmDelete} disabled={deleteTask.isPending} className="rounded-xl bg-destructive px-4 py-2.5 text-sm font-bold text-destructive-foreground disabled:opacity-60" data-testid="button-confirm-delete">{deleteTask.isPending ? 'Removing…' : 'Remove task'}</button></div>
          </div>
        </div>
      )}
    </div>
  );
}