import { useEffect, useMemo, useRef, useState, type FormEvent, type ReactNode } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Link } from 'wouter';
import {
  ArrowLeft,
  BookOpen,
  Check,
  ChevronDown,
  ChevronRight,
  CirclePlus,
  Copy,
  FilePlus2,
  FolderOpen,
  Heading,
  Home,
  Loader2,
  PanelLeftClose,
  PanelLeftOpen,
  Plus,
  RefreshCw,
  Save,
  Search,
  Sparkles,
  Trash2,
  Type,
  X,
} from 'lucide-react';
import {
  getGetPageQueryKey,
  getListPagesQueryKey,
  useCreateBlock,
  useCreatePage,
  useDeleteBlock,
  useDeletePage,
  useGetPage,
  useListPages,
  useUpdateBlock,
  useUpdatePage,
} from '@workspace/api-client-react';
import type { Block, Page } from '@workspace/api-client-react';
import { EmojiPicker } from '@/components/emoji-picker';

type BlockKind = Block['type'];

const blockLabels: Record<BlockKind, string> = {
  paragraph: 'Paragraph',
  heading_1: 'Heading 1',
  heading_2: 'Heading 2',
  heading_3: 'Heading 3',
  todo: 'To-do',
};

function WorkspaceSkeleton() {
  return (
    <div className="grid min-h-[100dvh] md:grid-cols-[280px_1fr]">
      <div className="workspace-sidebar hidden p-6 md:block">
        <div className="skeleton h-9 w-32 rounded-xl opacity-20" />
        <div className="mt-12 space-y-3">{[0, 1, 2, 3, 4].map((item) => <div key={item} className="skeleton h-10 rounded-xl opacity-20" />)}</div>
      </div>
      <div className="workspace-paper p-6 sm:p-12">
        <div className="mx-auto max-w-3xl space-y-5">
          <div className="skeleton h-4 w-24 rounded opacity-70" />
          <div className="skeleton h-14 w-3/4 rounded-xl opacity-70" />
          {[0, 1, 2].map((item) => <div key={item} className="skeleton h-12 rounded-xl opacity-70" />)}
        </div>
      </div>
    </div>
  );
}

function EmptyWorkspace({ onCreate }: { onCreate: () => void }) {
  return (
    <div className="workspace-paper flex min-h-[100dvh] items-center justify-center px-6 py-12">
      <div className="animate-rise-in text-center" data-testid="state-workspace-empty">
        <div className="workspace-dots mx-auto flex h-20 w-20 items-center justify-center rounded-[26px] border border-border bg-card text-primary shadow-[0_14px_36px_hsl(225_27%_20%/.08)]">
          <BookOpen className="h-8 w-8" strokeWidth={1.6} />
        </div>
        <p className="mt-8 font-mono text-[10px] font-bold uppercase tracking-[0.24em] text-primary">A room for your thinking</p>
        <h1 className="mt-3 text-4xl font-bold tracking-[-0.07em] sm:text-5xl">Start with one page.</h1>
        <p className="mx-auto mt-4 max-w-md text-[15px] leading-7 text-muted-foreground">Keep the useful thoughts close. Make a page for a project, a question, or whatever deserves more room today.</p>
         <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
           <button type="button" onClick={onCreate} className="inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-3 text-sm font-bold text-primary-foreground shadow-[0_5px_0_hsl(167_48%_27%)] hover:-translate-y-0.5" data-testid="button-empty-create-page">
             <Plus className="h-4 w-4" /> Create your first page
           </button>
           <Link href="/" className="inline-flex items-center gap-2 rounded-xl border border-border bg-card px-4 py-3 text-sm font-semibold text-muted-foreground hover:bg-secondary hover:text-foreground" data-testid="link-empty-today">
             <ArrowLeft className="h-4 w-4" /> Today
           </Link>
         </div>
      </div>
    </div>
  );
}

function PageTreeRow({
  page,
  depth,
  selected,
  onSelect,
  onAddChild,
  onDelete,
}: {
  page: Page;
  depth: number;
  selected: boolean;
  onSelect: (id: string) => void;
  onAddChild: (page: Page) => void;
  onDelete: (page: Page) => void;
}) {
  return (
    <div className="group relative" style={{ paddingLeft: `${depth * 14}px` }} data-testid={`tree-page-${page.id}`}>
      <button
        type="button"
        onClick={() => onSelect(page.id)}
        className={`flex w-full items-center gap-2 rounded-xl px-2.5 py-2.5 text-left text-sm transition-all ${selected ? 'bg-sidebar-accent text-sidebar-accent-foreground shadow-[0_5px_16px_hsl(225_22%_12%/.12)]' : 'text-sidebar-foreground/70 hover:bg-sidebar-accent/60 hover:text-sidebar-foreground'}`}
        data-testid={`button-select-page-${page.id}`}
      >
        <span className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-md text-sm ${selected ? 'bg-sidebar-primary/20 text-sidebar-primary' : 'text-sidebar-foreground/40'}`}>{page.icon || <FilePlus2 className="h-3.5 w-3.5" />}</span>
        <span className="min-w-0 flex-1 truncate font-semibold">{page.title || 'Untitled page'}</span>
        <span className="flex shrink-0 items-center opacity-0 transition-opacity group-hover:opacity-100">
          <span role="group" className="flex items-center">
            <span
              role="button"
              tabIndex={0}
              aria-label={`Add child page to ${page.title}`}
              onClick={(event) => { event.stopPropagation(); onAddChild(page); }}
              onKeyDown={(event) => { if (event.key === 'Enter') { event.stopPropagation(); onAddChild(page); } }}
              className="rounded-md p-1 hover:bg-sidebar-foreground/10"
              data-testid={`button-add-child-${page.id}`}
            ><CirclePlus className="h-3.5 w-3.5" /></span>
            <span
              role="button"
              tabIndex={0}
              aria-label={`Delete ${page.title}`}
              onClick={(event) => { event.stopPropagation(); onDelete(page); }}
              onKeyDown={(event) => { if (event.key === 'Enter') { event.stopPropagation(); onDelete(page); } }}
              className="rounded-md p-1 hover:bg-destructive/20 hover:text-destructive"
              data-testid={`button-delete-page-${page.id}`}
            ><Trash2 className="h-3.5 w-3.5" /></span>
          </span>
        </span>
      </button>
    </div>
  );
}

function PageTree({
  pages,
  selectedId,
  onSelect,
  onAddChild,
  onDelete,
  filter,
}: {
  pages: Page[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  onAddChild: (page: Page) => void;
  onDelete: (page: Page) => void;
  filter?: string;
}) {
  const trimmedFilter = filter?.trim().toLowerCase() ?? '';
  if (trimmedFilter) {
    const matches = pages.filter((page) => page.title.toLowerCase().includes(trimmedFilter));
    if (matches.length === 0) {
      return <p className="px-2.5 py-6 text-center text-xs text-sidebar-foreground/45" data-testid="state-page-search-empty">No pages match "{filter}".</p>;
    }
    return (
      <div className="space-y-0.5" data-testid="tree-pages-search">
        {matches.map((page) => (
          <PageTreeRow key={page.id} page={page} depth={0} selected={page.id === selectedId} onSelect={onSelect} onAddChild={onAddChild} onDelete={onDelete} />
        ))}
      </div>
    );
  }

  const children = useMemo(() => {
    const map = new Map<string | null, Page[]>();
    pages.forEach((page) => {
      const list = map.get(page.parentId) ?? [];
      list.push(page);
      map.set(page.parentId, list);
    });
    return map;
  }, [pages]);

  const render = (parentId: string | null, depth = 0): ReactNode[] => (children.get(parentId) ?? []).flatMap((page) => [
    <PageTreeRow key={page.id} page={page} depth={depth} selected={page.id === selectedId} onSelect={onSelect} onAddChild={onAddChild} onDelete={onDelete} />,
    ...render(page.id, depth + 1),
  ]);

  return <div className="space-y-0.5" data-testid="tree-pages">{render(null)}</div>;
}

function CreatePageDialog({
  parent,
  pending,
  onClose,
  onCreate,
}: {
  parent: Page | null;
  pending: boolean;
  onClose: () => void;
  onCreate: (title: string, icon: string) => void;
}) {
  const [title, setTitle] = useState('');
  const [icon, setIcon] = useState('');
  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (title.trim()) onCreate(title.trim(), icon.trim());
  };
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-foreground/25 p-0 backdrop-blur-[2px] sm:items-center sm:p-5" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
      <div className="w-full max-w-md animate-rise-in rounded-t-3xl border border-border bg-card p-6 shadow-2xl sm:rounded-3xl" role="dialog" aria-modal="true" aria-labelledby="create-page-title" data-testid="dialog-create-page">
        <div className="flex items-start justify-between">
          <div><p className="font-mono text-[10px] font-bold uppercase tracking-[0.2em] text-primary">{parent ? 'Nested page' : 'New page'}</p><h2 id="create-page-title" className="mt-2 text-2xl font-bold tracking-[-0.05em]">{parent ? `A page inside ${parent.title}` : 'Give the thought a home.'}</h2></div>
          <button type="button" onClick={onClose} aria-label="Close create page dialog" className="rounded-xl p-2 text-muted-foreground hover:bg-secondary hover:text-foreground" data-testid="button-close-create-page"><X className="h-5 w-5" /></button>
        </div>
        <form className="mt-7" onSubmit={submit}>
          <div className="flex gap-3">
            <div className="w-20 shrink-0"><span className="mb-2 block text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">Icon</span>
              <EmojiPicker value={icon} onChange={setIcon} className="flex h-[50px] w-full items-center justify-center rounded-xl border border-input bg-background text-2xl hover:bg-secondary" testId="button-page-icon" />
            </div>
            <label className="block flex-1"><span className="mb-2 block text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">Page title</span><input autoFocus value={title} onChange={(event) => setTitle(event.target.value)} placeholder="e.g. Summer plans" className="w-full rounded-xl border border-input bg-background px-4 py-3 text-[15px] placeholder:text-muted-foreground/65" data-testid="input-page-title" /></label>
          </div>
          <div className="mt-6 flex justify-end gap-3"><button type="button" onClick={onClose} className="rounded-xl px-4 py-2.5 text-sm font-semibold text-muted-foreground hover:bg-secondary" data-testid="button-cancel-create-page">Cancel</button><button type="submit" disabled={pending || !title.trim()} className="inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-sm font-bold text-primary-foreground disabled:pointer-events-none disabled:opacity-60" data-testid="button-submit-create-page">{pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />} {pending ? 'Creating…' : 'Create page'}</button></div>
        </form>
      </div>
    </div>
  );
}

function BlockEditor({
  block,
  onUpdate,
  onDelete,
}: {
  block: Block;
  onUpdate: (id: string, data: { type?: BlockKind; content?: string; checked?: boolean }) => void;
  onDelete: (block: Block) => void;
}) {
  const [content, setContent] = useState(block.content);
  const savedContent = useRef(block.content);
  useEffect(() => {
    if (savedContent.current === block.content) setContent(block.content);
  }, [block.content]);

  const saveContent = () => {
    const next = content.trimEnd();
    if (next !== savedContent.current) {
      savedContent.current = next;
      onUpdate(block.id, { content: next });
    }
  };
  const contentStyle = block.type === 'heading_1' ? 'text-3xl font-bold tracking-[-0.06em]' : block.type === 'heading_2' ? 'text-2xl font-bold tracking-[-0.045em]' : block.type === 'heading_3' ? 'text-lg font-bold tracking-[-0.02em]' : 'text-[15px] leading-7';
  return (
    <div className="workspace-block group flex items-start gap-3 rounded-xl px-3 py-2 -ml-3" data-testid={`block-editor-${block.id}`}>
      {block.type === 'todo' ? (
        <button type="button" onClick={() => onUpdate(block.id, { checked: !block.checked })} aria-label={block.checked ? 'Mark to-do incomplete' : 'Mark to-do complete'} className={`mt-1.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-md border-2 ${block.checked ? 'border-primary bg-primary text-primary-foreground' : 'border-muted-foreground/35 hover:border-primary'}`} data-testid={`button-toggle-block-${block.id}`}>{block.checked && <Check className="h-3.5 w-3.5 stroke-[3]" />}</button>
      ) : <span className="mt-3 h-1.5 w-1.5 shrink-0 rounded-full bg-primary/45 opacity-0 transition-opacity group-hover:opacity-100" />}
      <textarea
        value={content}
        onChange={(event) => setContent(event.target.value)}
        onBlur={saveContent}
        onKeyDown={(event) => { if ((event.metaKey || event.ctrlKey) && event.key === 'Enter') { event.preventDefault(); saveContent(); } }}
        rows={block.type.startsWith('heading') ? 1 : 2}
        placeholder={block.type === 'todo' ? 'A small thing worth doing' : 'Start writing…'}
        className={`min-h-8 flex-1 resize-none border-0 bg-transparent p-0 outline-none placeholder:text-muted-foreground/45 ${block.checked ? 'text-muted-foreground line-through decoration-primary/50' : ''} ${contentStyle}`}
        data-testid={`input-block-content-${block.id}`}
      />
      <div className="flex shrink-0 items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100 group-focus-within:opacity-100">
        <select value={block.type} onChange={(event) => onUpdate(block.id, { type: event.target.value as BlockKind })} aria-label="Change block type" className="max-w-[105px] rounded-lg border border-border bg-card px-2 py-1.5 text-[11px] font-semibold text-muted-foreground" data-testid={`select-block-type-${block.id}`}>
          {(Object.keys(blockLabels) as BlockKind[]).map((kind) => <option key={kind} value={kind}>{blockLabels[kind]}</option>)}
        </select>
        <button type="button" onClick={() => onDelete(block)} aria-label="Delete block" className="rounded-lg p-1.5 text-muted-foreground hover:bg-destructive/10 hover:text-destructive" data-testid={`button-delete-block-${block.id}`}><Trash2 className="h-4 w-4" /></button>
      </div>
    </div>
  );
}

function PageEditor({
  page,
  isLoading,
  isError,
  onRetry,
  onAddBlock,
  creatingBlock,
  onUpdateBlock,
  onDeleteBlock,
  saving,
  onDuplicate,
  duplicating,
}: {
  page: Page & { blocks: Block[] };
  isLoading: boolean;
  isError: boolean;
  onRetry: () => void;
  onAddBlock: (type: BlockKind) => void;
  creatingBlock: boolean;
  onUpdateBlock: (id: string, data: { type?: BlockKind; content?: string; checked?: boolean }) => void;
  onDeleteBlock: (block: Block) => void;
  saving: boolean;
  onDuplicate: () => void;
  duplicating: boolean;
}) {
  const updatePage = useUpdatePage();
  const queryClient = useQueryClient();
  const [title, setTitle] = useState(page.title);
  const [icon, setIcon] = useState(page.icon ?? '');
  const [menuOpen, setMenuOpen] = useState(false);
  const titleSaved = useRef(page.title);
  const iconSaved = useRef(page.icon ?? '');
  useEffect(() => {
    setTitle(page.title);
    titleSaved.current = page.title;
    setIcon(page.icon ?? '');
    iconSaved.current = page.icon ?? '';
  }, [page.id, page.title, page.icon]);
  const saveTitle = () => {
    const next = title.trim();
    if (!next || next === titleSaved.current) return;
    titleSaved.current = next;
    updatePage.mutate({ id: page.id, data: { title: next } }, {
      onSuccess: async () => {
        await Promise.all([
          queryClient.invalidateQueries({ queryKey: getListPagesQueryKey() }),
          queryClient.invalidateQueries({ queryKey: getGetPageQueryKey(page.id) }),
        ]);
      },
    });
  };

  if (isLoading) return <div className="mx-auto max-w-3xl space-y-5"><div className="skeleton h-4 w-20 rounded" /><div className="skeleton h-14 w-4/5 rounded-xl" /><div className="skeleton h-12 rounded-xl" /><div className="skeleton h-20 rounded-xl" /></div>;
  if (isError) return <div className="mx-auto max-w-md rounded-3xl border border-border bg-card px-7 py-12 text-center" data-testid="state-page-error"><RefreshCw className="mx-auto h-7 w-7 text-primary" /><h2 className="mt-4 text-xl font-bold">This page is taking a pause.</h2><p className="mt-2 text-sm leading-6 text-muted-foreground">We could not bring the blocks in. Your pages are still safe.</p><button type="button" onClick={onRetry} className="mt-6 rounded-xl bg-secondary px-4 py-2.5 text-sm font-bold hover:bg-muted" data-testid="button-retry-page">Try again</button></div>;

  const blocks = [...(page.blocks ?? [])].sort((a, b) => a.position - b.position);
  return (
    <article className="workspace-editor animate-rise-in rounded-[28px] border border-border/70 px-5 py-8 sm:px-12 sm:py-12" data-testid={`editor-page-${page.id}`}>
      <div className="flex items-center gap-2 text-xs font-semibold text-muted-foreground"><span className="flex h-7 w-7 items-center justify-center rounded-lg bg-accent/35 text-primary"><FolderOpen className="h-3.5 w-3.5" /></span><span>Personal workspace</span><ChevronRight className="h-3.5 w-3.5 opacity-40" /><span className="truncate">{page.title}</span></div>
      <div className="mt-8 flex items-start gap-3">
        <EmojiPicker
          value={icon}
          onChange={(next) => {
            setIcon(next);
            iconSaved.current = next;
            updatePage.mutate({ id: page.id, data: { icon: next || null } }, {
              onSuccess: async () => {
                await Promise.all([
                  queryClient.invalidateQueries({ queryKey: getListPagesQueryKey() }),
                  queryClient.invalidateQueries({ queryKey: getGetPageQueryKey(page.id) }),
                ]);
              },
            });
          }}
          buttonLabel="Change page icon"
          className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-secondary/60 text-4xl leading-[1.15] hover:bg-secondary sm:h-16 sm:w-16 sm:text-5xl"
          testId={`button-editor-page-icon-${page.id}`}
        />
        <input value={title} onChange={(event) => setTitle(event.target.value)} onBlur={saveTitle} onKeyDown={(event) => { if (event.key === 'Enter') { event.preventDefault(); event.currentTarget.blur(); } }} className="min-w-0 flex-1 border-0 bg-transparent p-0 text-4xl font-bold tracking-[-0.075em] outline-none placeholder:text-muted-foreground/40 sm:text-5xl" placeholder="Untitled page" data-testid={`input-editor-page-title-${page.id}`} />
      </div>
      <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-xs text-muted-foreground" data-testid={`status-save-page-${page.id}`}>{saving || updatePage.isPending ? <><Loader2 className="h-3.5 w-3.5 animate-spin text-primary" /> Saving changes</> : <><Save className="h-3.5 w-3.5 text-primary/70" /> Changes save as you go</>}</div>
        <button type="button" onClick={onDuplicate} disabled={duplicating} className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-semibold text-muted-foreground hover:bg-secondary hover:text-foreground disabled:opacity-60" data-testid={`button-duplicate-page-${page.id}`}>{duplicating ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Copy className="h-3.5 w-3.5" />} {duplicating ? 'Duplicating…' : 'Duplicate'}</button>
      </div>
      <div className="mt-10 space-y-1" data-testid={`list-blocks-${page.id}`}>
        {blocks.length === 0 ? <div className="workspace-dots rounded-2xl border border-dashed border-border px-6 py-12 text-center" data-testid={`state-blocks-empty-${page.id}`}><Sparkles className="mx-auto h-6 w-6 text-primary" /><p className="mt-4 font-semibold">A quiet page is a good beginning.</p><p className="mt-1 text-sm text-muted-foreground">Add a block when a thought arrives.</p><button type="button" onClick={() => onAddBlock('paragraph')} className="mt-5 inline-flex items-center gap-2 rounded-xl bg-secondary px-4 py-2.5 text-sm font-bold hover:bg-muted" data-testid={`button-empty-add-block-${page.id}`}><Plus className="h-4 w-4" /> Add first block</button></div> : blocks.map((block) => <BlockEditor key={block.id} block={block} onUpdate={onUpdateBlock} onDelete={onDeleteBlock} />)}
      </div>
      <div className="relative mt-8 flex items-center justify-center">
        <button type="button" onClick={() => setMenuOpen((open) => !open)} disabled={creatingBlock} className="inline-flex items-center gap-2 rounded-xl border border-dashed border-border px-4 py-2.5 text-xs font-bold text-muted-foreground hover:border-primary/50 hover:bg-secondary hover:text-foreground disabled:opacity-60" data-testid={`button-add-block-${page.id}`}><Plus className="h-4 w-4 text-primary" /> {creatingBlock ? 'Adding…' : 'Add a block'} <ChevronDown className="h-3.5 w-3.5" /></button>
        {menuOpen && <div className="absolute bottom-12 z-10 grid w-48 animate-rise-in gap-1 rounded-2xl border border-border bg-card p-2 shadow-xl" data-testid={`menu-add-block-${page.id}`}>{(Object.keys(blockLabels) as BlockKind[]).map((kind) => <button type="button" key={kind} onClick={() => { setMenuOpen(false); onAddBlock(kind); }} className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm font-semibold hover:bg-secondary" data-testid={`button-add-block-${kind}`}><span className="flex h-6 w-6 items-center justify-center rounded-lg bg-secondary text-primary">{kind === 'todo' ? <Check className="h-3.5 w-3.5" /> : kind.startsWith('heading') ? <Heading className="h-3.5 w-3.5" /> : <Type className="h-3.5 w-3.5" />}</span>{blockLabels[kind]}</button>)}</div>}
      </div>
    </article>
  );
}

export default function Workspace() {
  const queryClient = useQueryClient();
  const pagesQuery = useListPages({ query: { queryKey: getListPagesQueryKey() } });
  const pages = useMemo(() => pagesQuery.data ?? [], [pagesQuery.data]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [createParent, setCreateParent] = useState<Page | null | undefined>(undefined);
  const [deleteTarget, setDeleteTarget] = useState<Page | null>(null);
  const [mobileTreeOpen, setMobileTreeOpen] = useState(false);
  const [actionError, setActionError] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [duplicating, setDuplicating] = useState(false);
  const pageQuery = useGetPage(selectedId ?? '', { query: { enabled: Boolean(selectedId), retry: false, queryKey: getGetPageQueryKey(selectedId ?? '') } });
  const createPage = useCreatePage();
  const deletePage = useDeletePage();
  const createBlock = useCreateBlock();
  const updateBlock = useUpdateBlock();
  const deleteBlock = useDeleteBlock();

  useEffect(() => {
    if (pages.length && (!selectedId || !pages.some((page) => page.id === selectedId))) setSelectedId(pages[0].id);
  }, [pages, selectedId]);

  const invalidatePage = async (id: string) => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: getListPagesQueryKey() }),
      queryClient.invalidateQueries({ queryKey: getGetPageQueryKey(id) }),
    ]);
  };
  const submitCreatePage = (title: string, icon: string) => {
    createPage.mutate({ data: { title, parentId: createParent?.id ?? null, icon: icon || null } }, {
      onSuccess: async (page) => {
        setCreateParent(undefined);
        setSelectedId(page.id);
        await queryClient.invalidateQueries({ queryKey: getListPagesQueryKey() });
      },
      onError: () => setActionError('Could not create that page. Please try again.'),
    });
  };
  const confirmDeletePage = () => {
    if (!deleteTarget) return;
    deletePage.mutate({ id: deleteTarget.id }, {
      onSuccess: async () => {
        setDeleteTarget(null);
        setSelectedId(null);
        await queryClient.invalidateQueries({ queryKey: getListPagesQueryKey() });
      },
      onError: () => setActionError('That page could not be removed. Please try again.'),
    });
  };
  const addBlock = (type: BlockKind) => {
    if (!selectedId) return;
    const position = (pageQuery.data?.blocks ?? []).reduce((max, block) => Math.max(max, block.position), -1) + 1;
    createBlock.mutate({ id: selectedId, data: { type, position, content: '', checked: false } }, {
      onSuccess: async () => { await invalidatePage(selectedId); },
      onError: () => setActionError('Could not add that block. Please try again.'),
    });
  };
  const editBlock = (id: string, data: { type?: BlockKind; content?: string; checked?: boolean }) => {
    if (!selectedId) return;
    updateBlock.mutate({ id, data }, { onSuccess: async () => { await invalidatePage(selectedId); }, onError: () => setActionError('Your block did not save. Please try again.') });
  };
  const removeBlock = (block: Block) => {
    if (!selectedId) return;
    deleteBlock.mutate({ id: block.id }, { onSuccess: async () => { await invalidatePage(selectedId); }, onError: () => setActionError('Could not remove that block. Please try again.') });
  };
  const duplicateCurrentPage = async () => {
    const source = pageQuery.data;
    if (!source || duplicating) return;
    setDuplicating(true);
    try {
      const copy = await createPage.mutateAsync({
        data: { title: `${source.title} (copy)`, parentId: source.parentId, icon: source.icon ?? null },
      });
      const blocks = [...(source.blocks ?? [])].sort((a, b) => a.position - b.position);
      for (const block of blocks) {
        // Sequential on purpose, so blocks keep the source page's order.
        await createBlock.mutateAsync({
          id: copy.id,
          data: { type: block.type, position: block.position, content: block.content, checked: block.checked },
        });
      }
      await queryClient.invalidateQueries({ queryKey: getListPagesQueryKey() });
      setSelectedId(copy.id);
    } catch {
      setActionError('Could not duplicate that page. Please try again.');
    } finally {
      setDuplicating(false);
    }
  };

  if (pagesQuery.isLoading) return <WorkspaceSkeleton />;
  if (pagesQuery.isError) return <div className="workspace-paper flex min-h-[100dvh] items-center justify-center px-6"><div className="rounded-3xl border border-border bg-card px-7 py-12 text-center" data-testid="state-workspace-error"><RefreshCw className="mx-auto h-7 w-7 text-primary" /><h1 className="mt-4 text-xl font-bold">Your workspace needs one setup step.</h1><p className="mx-auto mt-2 max-w-md text-sm leading-6 text-muted-foreground">Run the updated <code className="rounded bg-secondary px-1.5 py-0.5 text-xs">supabase/schema.sql</code> in the Supabase SQL Editor to create the pages and blocks tables.</p><button type="button" onClick={() => pagesQuery.refetch()} className="mt-6 rounded-xl bg-secondary px-4 py-2.5 text-sm font-bold" data-testid="button-retry-workspace">Try again</button></div></div>;
  if (!pages.length) return <><EmptyWorkspace onCreate={() => setCreateParent(null)} />{createParent !== undefined && <CreatePageDialog parent={createParent} pending={createPage.isPending} onClose={() => setCreateParent(undefined)} onCreate={submitCreatePage} />}</>;

  const selectedPage = pages.find((page) => page.id === selectedId) ?? pages[0];
  return (
    <div className="workspace-paper min-h-[100dvh] md:grid md:grid-cols-[280px_1fr]">
      <aside className={`workspace-sidebar fixed inset-y-0 left-0 z-40 w-[280px] shrink-0 px-5 py-6 text-sidebar-foreground transition-transform duration-300 md:static md:block md:translate-x-0 ${mobileTreeOpen ? 'translate-x-0' : '-translate-x-full'}`} data-testid="workspace-sidebar">
        <div className="flex items-center justify-between px-2">
          <Link href="/" className="flex items-center gap-3" data-testid="link-workspace-home"><span className="flex h-9 w-9 items-center justify-center rounded-xl bg-sidebar-primary text-sidebar-primary-foreground"><Sparkles className="h-4 w-4" /></span><span><span className="block text-sm font-bold tracking-[-0.02em]">Quiet space</span><span className="block font-mono text-[9px] uppercase tracking-[0.17em] text-sidebar-foreground/50">Workspace</span></span></Link>
          <button type="button" onClick={() => setMobileTreeOpen(false)} className="rounded-lg p-1.5 text-sidebar-foreground/55 hover:bg-sidebar-accent md:hidden" aria-label="Close page list" data-testid="button-close-page-list"><PanelLeftClose className="h-4 w-4" /></button>
        </div>
        <div className="mt-12 flex items-center justify-between px-2"><p className="font-mono text-[10px] font-bold uppercase tracking-[0.2em] text-sidebar-foreground/40">Pages</p><button type="button" onClick={() => setCreateParent(null)} className="rounded-lg p-1.5 text-sidebar-primary hover:bg-sidebar-accent" aria-label="Create root page" data-testid="button-create-root-page"><Plus className="h-4 w-4" /></button></div>
        <div className="relative mt-3 px-0.5">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-sidebar-foreground/40" />
          <input value={searchQuery} onChange={(event) => setSearchQuery(event.target.value)} placeholder="Search pages" className="w-full rounded-xl border border-sidebar-border bg-sidebar-accent/40 py-2 pl-9 pr-3 text-xs text-sidebar-foreground placeholder:text-sidebar-foreground/40" data-testid="input-search-pages" />
        </div>
        <div className="mt-3 max-h-[calc(100dvh-230px)] overflow-y-auto pr-1"><PageTree pages={pages} selectedId={selectedPage.id} onSelect={(id) => { setSelectedId(id); setMobileTreeOpen(false); }} onAddChild={(page) => setCreateParent(page)} onDelete={setDeleteTarget} filter={searchQuery} /></div>
        <div className="absolute inset-x-5 bottom-6 rounded-2xl border border-sidebar-border bg-sidebar-accent/55 p-4"><div className="flex items-center gap-2 text-sidebar-primary"><Home className="h-3.5 w-3.5" /><span className="font-mono text-[10px] font-bold uppercase tracking-[0.15em]">A place to return to</span></div><p className="mt-2 text-xs leading-5 text-sidebar-foreground/60">Pages stay close, so ideas have somewhere to land.</p></div>
      </aside>
      {mobileTreeOpen && <button type="button" className="fixed inset-0 z-30 bg-foreground/25 md:hidden" onClick={() => setMobileTreeOpen(false)} aria-label="Close page list overlay" data-testid="button-close-page-list-overlay" />}
      <main className="min-w-0">
        <header className="flex items-center justify-between px-5 py-5 sm:px-8 md:px-12" data-testid="workspace-header">
          <div className="flex items-center gap-3"><button type="button" onClick={() => setMobileTreeOpen(true)} className="rounded-xl border border-border bg-card p-2.5 text-muted-foreground hover:text-foreground md:hidden" aria-label="Open page list" data-testid="button-open-page-list"><PanelLeftOpen className="h-4 w-4" /></button><Link href="/" className="hidden items-center gap-2 text-sm font-semibold text-muted-foreground hover:text-foreground sm:flex" data-testid="link-back-dashboard"><ArrowLeft className="h-4 w-4" /> Today</Link></div>
          <div className="flex items-center gap-2"><span className="hidden items-center gap-1.5 rounded-full border border-border bg-card px-3 py-1.5 text-[11px] font-semibold text-muted-foreground sm:flex"><span className="h-1.5 w-1.5 rounded-full bg-primary" /> Your space</span><button type="button" onClick={() => setCreateParent(selectedPage)} className="inline-flex items-center gap-2 rounded-xl bg-primary px-3.5 py-2.5 text-xs font-bold text-primary-foreground shadow-[0_4px_0_hsl(167_48%_27%)] hover:-translate-y-0.5" data-testid="button-header-add-child"><Plus className="h-4 w-4" /> New child page</button></div>
        </header>
        {actionError && <div className="mx-5 flex items-center justify-between rounded-xl bg-destructive/10 px-4 py-3 text-sm text-destructive sm:mx-8 md:mx-12" role="alert" data-testid="status-workspace-error"><span>{actionError}</span><button type="button" onClick={() => setActionError('')} aria-label="Dismiss workspace error" data-testid="button-dismiss-workspace-error"><X className="h-4 w-4" /></button></div>}
        <div className="px-5 pb-12 pt-4 sm:px-8 sm:pb-16 md:px-12 md:pt-8"><PageEditor page={(pageQuery.data ?? { ...selectedPage, blocks: [] }) as Page & { blocks: Block[] }} isLoading={pageQuery.isLoading} isError={pageQuery.isError} onRetry={() => pageQuery.refetch()} onAddBlock={addBlock} creatingBlock={createBlock.isPending} onUpdateBlock={editBlock} onDeleteBlock={removeBlock} saving={updateBlock.isPending || deleteBlock.isPending || createBlock.isPending} onDuplicate={duplicateCurrentPage} duplicating={duplicating} /></div>
      </main>
      {createParent !== undefined && <CreatePageDialog parent={createParent} pending={createPage.isPending} onClose={() => setCreateParent(undefined)} onCreate={submitCreatePage} />}
      {deleteTarget && <div className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/25 p-5 backdrop-blur-[2px]" role="presentation"><div className="w-full max-w-sm animate-rise-in rounded-3xl border border-border bg-card p-6 shadow-2xl" role="dialog" aria-modal="true" aria-labelledby="delete-page-title" data-testid="dialog-delete-page"><div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-destructive/10 text-destructive"><Trash2 className="h-5 w-5" /></div><h2 id="delete-page-title" className="mt-5 text-xl font-bold tracking-[-0.03em]">Remove this page?</h2><p className="mt-2 text-sm leading-5 text-muted-foreground">“{deleteTarget.title}” and its blocks will be removed for good.</p><div className="mt-6 flex justify-end gap-3"><button type="button" onClick={() => setDeleteTarget(null)} className="rounded-xl px-4 py-2.5 text-sm font-semibold text-muted-foreground hover:bg-secondary" data-testid="button-cancel-delete-page">Keep page</button><button type="button" onClick={confirmDeletePage} disabled={deletePage.isPending} className="rounded-xl bg-destructive px-4 py-2.5 text-sm font-bold text-destructive-foreground disabled:opacity-60" data-testid="button-confirm-delete-page">{deletePage.isPending ? 'Removing…' : 'Remove page'}</button></div></div></div>}
    </div>
  );
}