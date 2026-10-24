import React, { useState, useEffect, useRef, useMemo, Component } from 'react';
import {
  FolderPlus, Folder, ChevronRight, Plus, Search, Copy, Check, Sparkles, Trash2, Edit3,
  Sun, Moon, Download, RefreshCw, ChevronLeft, Tag, FileText,
  AlertTriangle, Zap, Terminal, Code, Cpu, BookOpen, Layers, Database,
  Box, Key, Sparkle, Layout, Heart, FileCode, HardDrive,
  Settings, Activity, Upload, CheckCircle
} from 'lucide-react';
import Logo from './Logo.jsx';

const UI_STYLES = {
  glassPanelLight: "bg-white/80 backdrop-blur-xl border border-white/40 shadow-xl shadow-slate-200/50",
  glassPanelDark: "bg-slate-900/80 backdrop-blur-xl border border-slate-800/80 shadow-2xl shadow-black/50",
  glassInputLight: "bg-slate-100/90 border border-slate-200/80 focus:border-indigo-500/80 focus:bg-white text-slate-800 placeholder-slate-400",
  glassInputDark: "bg-slate-800/70 border border-slate-700/60 focus:border-indigo-400/80 focus:bg-slate-800 text-slate-100 placeholder-slate-500",
  btnPrimary: "bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 hover:from-indigo-600 hover:to-pink-600 text-white font-medium shadow-md hover:shadow-indigo-500/25 transition-all duration-200 active:scale-[0.98]",
  btnSecondaryLight: "bg-slate-200/70 hover:bg-slate-200 text-slate-700 hover:text-slate-900 border border-slate-300/50",
  btnSecondaryDark: "bg-slate-800/70 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700/50"
};

const ICON_MAP = { Terminal, Code, Cpu, BookOpen, Layers, Database, Box, Key, Sparkle, Layout, Heart, FileCode, Folder };
const AVAILABLE_ICONS = ['Folder', 'Code', 'Database', 'BookOpen', 'Cpu', 'Layout', 'Terminal', 'Layers', 'Box', 'Key', 'FileCode'];

// Smart auto-detection of dynamic monoline icons & folder names
const autoDetectFolderMeta = (text, currentLength) => {
  const query = (text || '').toLowerCase().trim();
  if (!query) return { name: `Koleksi Vault #${currentLength + 1}`, icon: 'Folder' };
  if (query.includes('code') || query.includes('react') || query.includes('dev') || query.includes('script') || query.includes('js') || query.includes('python')) return { name: text, icon: 'Code' };
  if (query.includes('sql') || query.includes('data') || query.includes('db') || query.includes('base')) return { name: text, icon: 'Database' };
  if (query.includes('write') || query.includes('copy') || query.includes('book') || query.includes('article') || query.includes('draft')) return { name: text, icon: 'BookOpen' };
  if (query.includes('ai') || query.includes('prompt') || query.includes('llm') || query.includes('gpt') || query.includes('bot')) return { name: text, icon: 'Cpu' };
  if (query.includes('design') || query.includes('ui') || query.includes('ux') || query.includes('layout') || query.includes('figma')) return { name: text, icon: 'Layout' };
  if (query.includes('terminal') || query.includes('cli') || query.includes('bash') || query.includes('shell')) return { name: text, icon: 'Terminal' };
  if (query.includes('api') || query.includes('auth') || query.includes('key') || query.includes('token')) return { name: text, icon: 'Key' };
  return { name: text, icon: 'Folder' };
};

const INITIAL_DATA = [
  { id: 'f-1', name: 'AI Development & Coding', icon: 'Code', createdAt: Date.now() - 1000000, prompts: [{ id: 'p-1', title: 'React Expert Code Reviewer', content: 'Act as a Principal Frontend Engineer. Review the provided React codebase for performance bottlenecks, re-render triggers, accessibility issues, and type safety. Offer concrete refactored snippets.', tags: ['React', 'Code Review', 'Frontend'], variableFields: ['Framework', 'Performance Metric'], isFavorite: true, updatedAt: Date.now() - 500000 }, { id: 'p-2', title: 'SQL Query Optimizer', content: 'Act as a Senior Database Administrator. Analyze the following SQL query for indexing strategies, CTE optimization, and join execution plans.', tags: ['SQL', 'Database'], variableFields: ['Query Target'], isFavorite: false, updatedAt: Date.now() - 400000 }] },
  { id: 'f-2', name: 'Creative Writing & Copywriting', icon: 'BookOpen', createdAt: Date.now() - 800000, prompts: [{ id: 'p-3', title: 'Apple-Style Product Copy', content: 'Craft a product pitch using Apple\'s minimalist, poetic, yet impactful writing style. Emphasize human emotion, breakthrough innovation, and simple elegance.', tags: ['Marketing', 'Copywriting'], variableFields: ['Product Name', 'Key Feature'], isFavorite: true, updatedAt: Date.now() - 300000 }] }
];

// ---- Folder bersarang (root -> subfolder -> ...). parentId null = root ----
const normalizeFolders = (list) => {
  const ids = new Set(list.map(f => f.id));
  return list.map(f => ({
    ...f,
    parentId: f.parentId && ids.has(f.parentId) && f.parentId !== f.id ? f.parentId : null,
    prompts: f.prompts || []
  }));
};

const childrenOf = (folders, parentId) => folders.filter(f => (f.parentId ?? null) === parentId);

const getDescendantIds = (folders, id) => {
  const out = [];
  const walk = (pid) => childrenOf(folders, pid).forEach(c => { out.push(c.id); walk(c.id); });
  walk(id);
  return out;
};

// Daftar datar berurutan pohon: [{ folder, depth }]; folder yang dilipat menyembunyikan anaknya
const flattenTree = (folders, collapsedIds = [], excludeIds = []) => {
  const rows = [];
  const walk = (pid, depth) => {
    childrenOf(folders, pid).forEach(f => {
      if (excludeIds.includes(f.id)) return;
      rows.push({ folder: f, depth, hasChildren: childrenOf(folders, f.id).length > 0 });
      if (!collapsedIds.includes(f.id)) walk(f.id, depth + 1);
    });
  };
  walk(null, 0);
  return rows;
};

const getFolderPath = (folders, id) => {
  const path = [];
  let cur = folders.find(f => f.id === id);
  let guard = 0;
  while (cur && guard++ < 50) {
    path.unshift(cur);
    cur = cur.parentId ? folders.find(f => f.id === cur.parentId) : null;
  }
  return path;
};

// ---- Salinan cadangan kedua di IndexedDB (jaga-jaga localStorage kosong/terhapus) ----
const idbOpen = () => new Promise((resolve, reject) => {
  const req = indexedDB.open('promptvault', 1);
  req.onupgradeneeded = () => req.result.createObjectStore('kv');
  req.onsuccess = () => resolve(req.result);
  req.onerror = () => reject(req.error);
});
const idbGet = async (key) => {
  const db = await idbOpen();
  return new Promise((resolve, reject) => {
    const r = db.transaction('kv').objectStore('kv').get(key);
    r.onsuccess = () => resolve(r.result);
    r.onerror = () => reject(r.error);
  });
};
const idbSet = async (key, val) => {
  const db = await idbOpen();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('kv', 'readwrite');
    tx.objectStore('kv').put(val, key);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
};

const GEMINI_MODEL = 'gemini-3-flash-preview';

// ---- CSV backup (bisa dibuka di Excel / Google Sheets / Numbers) ----
const CSV_HEADERS = ['folder_id', 'parent_id', 'folder_name', 'folder_icon', 'prompt_id', 'prompt_title', 'prompt_content', 'tags', 'visual_direction', 'favorite', 'updated_at'];

// Cegah formula injection saat dibuka di spreadsheet: sel berawalan = + - @ diberi tanda '
const csvGuard = (v) => (/^[=+\-@\t\r]/.test(v) ? `'${v}` : v);
const csvUnguard = (v) => (/^'[=+\-@\t\r]/.test(v) ? v.slice(1) : v);
const csvCell = (v) => {
  const str = csvGuard(String(v ?? ''));
  return /[",\n\r]/.test(str) ? `"${str.replace(/"/g, '""')}"` : str;
};

const foldersToCsv = (folders) => {
  const lines = [CSV_HEADERS.join(',')];
  flattenTree(folders, []).forEach(({ folder: f }) => {
    const base = [f.id, f.parentId || '', f.name, f.icon || 'Folder'];
    const prompts = f.prompts || [];
    if (prompts.length === 0) {
      lines.push([...base, '', '', '', '', '', '', ''].map(csvCell).join(','));
    } else {
      prompts.forEach(pr => {
        lines.push([
          ...base, pr.id, pr.title, pr.content, (pr.tags || []).join(', '),
          pr.visualDirection || '', pr.isFavorite ? 'true' : 'false',
          pr.updatedAt ? new Date(pr.updatedAt).toISOString() : ''
        ].map(csvCell).join(','));
      });
    }
  });
  return '\uFEFF' + lines.join('\r\n');
};

const parseCsv = (text) => {
  const rows = [];
  let row = [], cell = '', inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inQuotes) {
      if (c === '"') {
        if (text[i + 1] === '"') { cell += '"'; i++; } else inQuotes = false;
      } else cell += c;
    } else if (c === '"') inQuotes = true;
    else if (c === ',') { row.push(cell); cell = ''; }
    else if (c === '\n' || c === '\r') {
      if (c === '\r' && text[i + 1] === '\n') i++;
      row.push(cell); cell = '';
      rows.push(row); row = [];
    } else cell += c;
  }
  if (cell !== '' || row.length) { row.push(cell); rows.push(row); }
  return rows.filter(r => r.some(x => x.trim() !== ''));
};

const foldersFromCsv = (text) => {
  const rows = parseCsv(text.replace(/^\uFEFF/, ''));
  if (rows.length < 2) throw new Error('CSV kosong');
  const head = rows[0].map(h => h.trim().toLowerCase());
  if (!head.includes('folder_name')) throw new Error('Kolom folder_name tidak ditemukan');
  const col = (r, name) => { const i = head.indexOf(name); return i >= 0 ? (r[i] ?? '') : ''; };
  const map = new Map();
  let n = 0;
  const stamp = Date.now();
  rows.slice(1).forEach(r => {
    const fid = col(r, 'folder_id').trim();
    const fname = csvUnguard(col(r, 'folder_name')).trim();
    if (!fid && !fname) return;
    const key = fid || `name:${fname}`;
    if (!map.has(key)) {
      map.set(key, {
        id: fid || `f-imp-${stamp}-${n++}`,
        name: fname || 'Folder',
        icon: col(r, 'folder_icon').trim() || 'Folder',
        parentId: col(r, 'parent_id').trim() || null,
        createdAt: stamp,
        prompts: []
      });
    }
    const title = csvUnguard(col(r, 'prompt_title'));
    const content = csvUnguard(col(r, 'prompt_content'));
    if (title.trim() || content.trim()) {
      map.get(key).prompts.push({
        id: col(r, 'prompt_id').trim() || `p-imp-${stamp}-${n++}`,
        title: title || 'Tanpa judul',
        content,
        tags: col(r, 'tags').split(',').map(t => t.trim()).filter(Boolean),
        visualDirection: csvUnguard(col(r, 'visual_direction')),
        isFavorite: ['true', '1', 'ya', 'yes'].includes(col(r, 'favorite').trim().toLowerCase()),
        updatedAt: Date.parse(col(r, 'updated_at')) || stamp
      });
    }
  });
  return Array.from(map.values());
};

const loadFolders = () => {
  try {
    const raw = localStorage.getItem('pv_folders');
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) return normalizeFolders(parsed);
    }
  } catch (e) {}
  return normalizeFolders(INITIAL_DATA);
};
const loadCollapsed = () => {
  try { const a = JSON.parse(localStorage.getItem('pv_collapsed') || '[]'); return Array.isArray(a) ? a : []; } catch (e) { return []; }
};
const loadTheme = () => {
  try {
    const t = localStorage.getItem('pv_theme');
    if (t) return t === 'dark';
  } catch (e) {}
  return true;
};
const loadModel = () => {
  try { return localStorage.getItem('pv_gemini_model') || GEMINI_MODEL; } catch (e) { return GEMINI_MODEL; }
};
const loadKey = () => {
  try { return localStorage.getItem('pv_gemini_key') || ''; } catch (e) { return ''; }
};

function PromptVaultApp() {
  const [isDarkMode, setIsDarkMode] = useState(loadTheme);
  const [folders, setFolders] = useState(loadFolders);
  const [selectedFolderId, setSelectedFolderId] = useState(() => folders[0]?.id ?? null);
  const [selectedPromptId, setSelectedPromptId] = useState(null);
  const [mobileView, setMobileView] = useState('folders'); // 'folders' | 'prompts' | 'detail'
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTag, setSelectedTag] = useState(null);
  const [copiedId, setCopiedId] = useState(null);

  const [saveStatus, setSaveStatus] = useState('saved'); // 'saved' | 'error'
  const [storageLogs, setStorageLogs] = useState([]);

  const [isFolderModalOpen, setIsFolderModalOpen] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const [selectedFolderIcon, setSelectedFolderIcon] = useState('Folder');
  const [editingFolderId, setEditingFolderId] = useState(null);
  const [folderParentId, setFolderParentId] = useState(null);
  const [collapsedIds, setCollapsedIds] = useState(loadCollapsed);

  const [isPromptModalOpen, setIsPromptModalOpen] = useState(false);
  const [editingPrompt, setEditingPrompt] = useState({ id: null, title: '', content: '', tags: '', visualDirection: '', folderId: '' });

  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isAiGenerating, setIsAiGenerating] = useState(false);
  const [aiPromptInput, setAiPromptInput] = useState('');
  const [showAiModal, setShowAiModal] = useState(false);
  const [geminiKey, setGeminiKey] = useState(loadKey);
  const [geminiModel, setGeminiModel] = useState(loadModel);
  const [aiBackup, setAiBackup] = useState(null);
  const [aiNote, setAiNote] = useState('');

  const fileInputRef = useRef(null);
  // true kalau localStorage kosong saat app dibuka (dicek sebelum apa pun ditulis)
  const localWasEmpty = useRef((() => { try { return localStorage.getItem('pv_folders') === null; } catch (e) { return true; } })());
  const [idbReady, setIdbReady] = useState(false);

  const addLog = (msg, type = 'info') => {
    const time = new Date().toLocaleTimeString();
    setStorageLogs(prev => [{ time, msg, type }, ...prev].slice(0, 20));
  };

  const mutateFolders = setFolders;

  // Simpan otomatis ke localStorage setiap data berubah (langsung, tanpa debounce
  // supaya aman kalau app tiba-tiba ditutup/pindah ke background di iPhone)
  useEffect(() => {
    try {
      localStorage.setItem('pv_folders', JSON.stringify(folders));
      setSaveStatus('saved');
    } catch (e) {
      setSaveStatus('error');
      addLog('Gagal menyimpan ke penyimpanan perangkat.', 'error');
    }
  }, [folders]);

  useEffect(() => {
    try { localStorage.setItem('pv_collapsed', JSON.stringify(collapsedIds)); } catch (e) {}
  }, [collapsedIds]);

  // Pulihkan dari IndexedDB kalau localStorage kosong (mis. dibersihkan sistem)
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        if (localWasEmpty.current) {
          const saved = await idbGet('folders');
          if (!cancelled && Array.isArray(saved) && saved.length > 0) {
            const restored = normalizeFolders(saved);
            setFolders(restored);
            setSelectedFolderId(restored[0].id);
            addLog('Data dipulihkan otomatis dari salinan cadangan.', 'success');
          }
        }
      } catch (e) {
        addLog('Cadangan IndexedDB tidak tersedia.', 'warn');
      } finally {
        if (!cancelled) setIdbReady(true);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  // Tulis salinan cadangan setiap data berubah (setelah proses pemulihan selesai)
  useEffect(() => {
    if (!idbReady) return;
    idbSet('folders', folders).catch(() => {});
  }, [folders, idbReady]);

  // Tema: simpan + sinkronkan warna latar html
  useEffect(() => {
    try { localStorage.setItem('pv_theme', isDarkMode ? 'dark' : 'light'); } catch (e) {}
    document.documentElement.style.backgroundColor = isDarkMode ? '#020617' : '#f8fafc';
  }, [isDarkMode]);

  useEffect(() => {
    try { localStorage.setItem('pv_gemini_key', geminiKey); } catch (e) {}
  }, [geminiKey]);

  useEffect(() => {
    try { localStorage.setItem('pv_gemini_model', geminiModel); } catch (e) {}
  }, [geminiModel]);

  // Minta penyimpanan persisten supaya data tidak dibersihkan sistem
  useEffect(() => {
    const standalone = window.matchMedia?.('(display-mode: standalone)').matches || window.navigator.standalone;
    addLog(standalone ? 'Berjalan sebagai aplikasi (Home Screen).' : 'Berjalan di browser. Tambahkan ke Home Screen untuk mode app.', 'info');
    navigator.storage?.persist?.().then(ok => addLog(ok ? 'Penyimpanan persisten aktif.' : 'Penyimpanan standar (belum persisten).', ok ? 'success' : 'info')).catch(() => {});
  }, []);

  const activeFolder = useMemo(() => folders.find(f => f.id === selectedFolderId) || folders[0], [folders, selectedFolderId]);
  
  const allTags = useMemo(() => {
    const set = new Set();
    folders.forEach(f => (f.prompts || []).forEach(p => (p.tags || []).forEach(t => set.add(t))));
    return Array.from(set);
  }, [folders]);

  const filteredPrompts = useMemo(() => {
    if (!activeFolder) return [];
    return (activeFolder.prompts || []).filter(p => {
      const matchesSearch = p.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
                            p.content.toLowerCase().includes(searchQuery.toLowerCase()) ||
                            (p.visualDirection || '').toLowerCase().includes(searchQuery.toLowerCase());
      const matchesTag = !selectedTag || (p.tags && p.tags.includes(selectedTag));
      return matchesSearch && matchesTag;
    });
  }, [activeFolder, searchQuery, selectedTag]);

  const activePrompt = useMemo(() => {
    if (!activeFolder) return null;
    return activeFolder.prompts.find(p => p.id === selectedPromptId) || filteredPrompts[0] || null;
  }, [activeFolder, selectedPromptId, filteredPrompts]);

  const handleSelectFolder = (folderId) => {
    setSelectedFolderId(folderId);
    setSelectedPromptId(null);
    setMobileView('prompts');
  };

  const handleSelectPrompt = (promptId) => {
    setSelectedPromptId(promptId);
    setMobileView('detail');
  };

  const openNewFolder = (parentId = null) => {
    setEditingFolderId(null);
    setNewFolderName('');
    setSelectedFolderIcon('Folder');
    setFolderParentId(parentId);
    setIsFolderModalOpen(true);
  };

  const toggleCollapse = (id, e) => {
    e?.stopPropagation();
    setCollapsedIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };

  // Smart Auto-Naming & Dynamic Monoline Icon Handler
  const handleSaveFolder = (e) => {
    e.preventDefault();
    const parentId = folderParentId || null;
    if (editingFolderId) {
      mutateFolders(prev => prev.map(f => {
        if (f.id === editingFolderId) {
          const finalName = newFolderName.trim() || f.name;
          return { ...f, name: finalName, icon: selectedFolderIcon, parentId };
        }
        return f;
      }));
      addLog('Folder berhasil diperbarui.', 'info');
    } else {
      const meta = autoDetectFolderMeta(newFolderName.trim(), folders.length);
      const newFolder = {
        id: `f-${Date.now()}`,
        name: meta.name,
        icon: newFolderName.trim() ? selectedFolderIcon : meta.icon,
        parentId,
        createdAt: Date.now(),
        prompts: []
      };
      mutateFolders(prev => [...prev, newFolder]);
      setSelectedFolderId(newFolder.id);
      setSelectedPromptId(null);
      addLog(`Folder '${newFolder.name}' berhasil dibuat${parentId ? ' (subfolder)' : ' di root'}.`, 'success');
    }
    // pastikan folder induk terbuka supaya hasilnya kelihatan
    if (parentId) setCollapsedIds(prev => prev.filter(x => x !== parentId));

    setNewFolderName('');
    setEditingFolderId(null);
    setSelectedFolderIcon('Folder');
    setFolderParentId(null);
    setIsFolderModalOpen(false);
    setMobileView('prompts');
  };

  const handleOpenEditFolder = (folder, e) => {
    e.stopPropagation();
    setEditingFolderId(folder.id);
    setNewFolderName(folder.name);
    setSelectedFolderIcon(folder.icon || 'Folder');
    setFolderParentId(folder.parentId ?? null);
    setIsFolderModalOpen(true);
  };

  const handleDeleteFolder = (folderId, e) => {
    e.stopPropagation();
    const removeIds = [folderId, ...getDescendantIds(folders, folderId)];
    if (removeIds.length >= folders.length) {
      alert('Anda harus menyimpan minimal 1 folder.');
      return;
    }
    const promptCount = folders.filter(f => removeIds.includes(f.id)).reduce((n, f) => n + (f.prompts?.length || 0), 0);
    const subCount = removeIds.length - 1;
    const msg = `Hapus folder ini${subCount ? ` beserta ${subCount} subfolder` : ''} dan ${promptCount} prompt di dalamnya?`;
    if (confirm(msg)) {
      const remaining = folders.filter(f => !removeIds.includes(f.id));
      mutateFolders(() => remaining);
      if (removeIds.includes(selectedFolderId)) {
        setSelectedFolderId(remaining[0].id);
        setSelectedPromptId(null);
      }
      addLog('Folder dihapus.', 'info');
    }
  };

  const handleSavePrompt = (e) => {
    e.preventDefault();
    if (!editingPrompt.title.trim() || !editingPrompt.content.trim()) return;

    const targetFolderId = editingPrompt.folderId || selectedFolderId;
    const tagArray = typeof editingPrompt.tags === 'string'
      ? editingPrompt.tags.split(',').map(t => t.trim()).filter(Boolean)
      : editingPrompt.tags;

    if (editingPrompt.id) {
      // Edit: kalau folder diganti, pindahkan prompt ke folder target
      const existing = folders.flatMap(f => f.prompts || []).find(p => p.id === editingPrompt.id);
      const updated = {
        ...(existing || { isFavorite: false }),
        id: editingPrompt.id,
        title: editingPrompt.title,
        content: editingPrompt.content,
        visualDirection: editingPrompt.visualDirection || '',
        tags: tagArray,
        updatedAt: Date.now()
      };
      mutateFolders(prev => prev.map(folder => {
        const without = (folder.prompts || []).filter(p => p.id !== editingPrompt.id);
        if (folder.id === targetFolderId) return { ...folder, prompts: [updated, ...without] };
        return { ...folder, prompts: without };
      }));
      setSelectedFolderId(targetFolderId);
      setSelectedPromptId(editingPrompt.id);
    } else {
      const newPrompt = {
        id: `p-${Date.now()}`,
        title: editingPrompt.title,
        content: editingPrompt.content,
        visualDirection: editingPrompt.visualDirection || '',
        tags: tagArray,
        isFavorite: false,
        updatedAt: Date.now()
      };
      mutateFolders(prev => prev.map(folder =>
        folder.id === targetFolderId ? { ...folder, prompts: [newPrompt, ...(folder.prompts || [])] } : folder
      ));
      setSelectedFolderId(targetFolderId);
      setSelectedPromptId(newPrompt.id);
    }

    setIsPromptModalOpen(false);
    setEditingPrompt({ id: null, title: '', content: '', tags: '', visualDirection: '', folderId: '' });
    setAiBackup(null);
    setAiNote('');
    setMobileView('detail');
  };

  const handleDeletePrompt = (promptId) => {
    mutateFolders(prev => prev.map(folder => {
      if (folder.id === selectedFolderId) {
        return { ...folder, prompts: folder.prompts.filter(p => p.id !== promptId) };
      }
      return folder;
    }));
    if (selectedPromptId === promptId) {
      setSelectedPromptId(null);
    }
    setMobileView('prompts');
  };

  const copyToClipboard = async (text, id) => {
    let ok = false;
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(text);
        ok = true;
      }
    } catch (err) {}
    if (!ok) {
      try {
        const textarea = document.createElement('textarea');
        textarea.value = text;
        textarea.style.position = 'fixed';
        textarea.style.opacity = '0';
        document.body.appendChild(textarea);
        textarea.focus();
        textarea.select();
        textarea.setSelectionRange(0, text.length);
        ok = document.execCommand('copy');
        document.body.removeChild(textarea);
      } catch (err) {
        console.error('Failed to copy text', err);
      }
    }
    if (ok) {
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 2000);
    } else {
      alert('Gagal menyalin. Tekan lama teks prompt lalu pilih Salin.');
    }
  };

  const handleExportBackup = async () => {
    const csv = foldersToCsv(folders);
    const filename = `PromptVault_Backup_${new Date().toISOString().slice(0, 10)}.csv`;
    const file = new File([csv], filename, { type: 'text/csv' });
    try {
      // iPhone: lewat lembar Bagikan (simpan ke Files / AirDrop / dll)
      if (navigator.canShare?.({ files: [file] })) {
        await navigator.share({ files: [file], title: 'PromptVault Backup' });
        addLog('Backup CSV dibagikan lewat lembar Bagikan.', 'success');
        return;
      }
    } catch (err) {
      if (err?.name === 'AbortError') return;
    }
    const url = URL.createObjectURL(file);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 2000);
    addLog('Ekspor backup CSV berhasil.', 'success');
  };

  const handleImportBackup = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const text = String(event.target.result || '');
        // CSV (baru) atau JSON (backup lama)
        const imported = text.trimStart().startsWith('[') ? JSON.parse(text) : foldersFromCsv(text);
        if (Array.isArray(imported) && imported.length > 0 && imported[0].prompts) {
          if (!confirm('Impor akan MENGGANTI semua data vault saat ini. Lanjut?')) return;
          const normalized = normalizeFolders(imported);
          mutateFolders(() => normalized);
          setSelectedFolderId(normalized[0].id);
          setSelectedPromptId(null);
          addLog('Import data vault berhasil!', 'success');
          alert('Data Prompt Vault berhasil diimpor!');
        } else {
          alert('Format file tidak valid.');
        }
      } catch (err) {
        alert(`Gagal membaca file backup: ${err.message}`);
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const parseAiJson = (text) => {
    const cleaned = text.trim().replace(/^```(?:json)?\s*/i, '').replace(/```\s*$/, '');
    try { return JSON.parse(cleaned); } catch (e) {}
    const m = cleaned.match(/\{[\s\S]*\}/);
    if (m) return JSON.parse(m[0]);
    throw new Error('Respons AI bukan JSON.');
  };

  // AI Enhancer: baca prompt di form, perbaiki, dan tentukan arahan visual otomatis
  const handleEnhancePromptWithAI = async () => {
    const hasContent = editingPrompt.content.trim().length > 0;
    const source = hasContent ? editingPrompt.content : aiPromptInput;
    if (!source.trim()) return;
    if (!geminiKey.trim()) {
      alert('Isi dulu Gemini API Key di Pengaturan (ikon gerigi).');
      return;
    }
    setIsAiGenerating(true);

    try {
      const systemPrompt = `You are an expert prompt engineer and art director. You receive a prompt that the user saved in their prompt library (it may be a rough idea).
1) Detect what the prompt is for (image/poster/artwork, coding, writing, analysis, etc).
2) Rewrite it into a clearer, well-structured, more effective prompt. Keep the user's intent, language, and any {variables}. Do not invent unrelated requirements.
3) Infer the best visual direction. For image/poster/artwork prompts give concrete art direction: focal subject, composition and camera angle, lighting, color palette, style/technique, mood, background, aspect-ratio hints. Use original designs only: no copyrighted characters, brands, logos or living artists' names. For non-visual prompts, give a short output direction instead (format, structure, tone, layout of the answer).
4) Suggest 2-5 short tags.
5) Add a one-sentence note in Indonesian: what you improved and which direction you chose.
Respond ONLY with JSON: {"title": string, "improved_prompt": string, "visual_direction": string, "tags": string[], "note": string}. Write improved_prompt and visual_direction in the same language as the user's prompt.`;
      const parts = [
        `Title: ${editingPrompt.title || '(none)'}`,
        `Prompt:\n${source}`,
        editingPrompt.visualDirection?.trim() ? `Current visual direction (improve it, keep the user's intent):\n${editingPrompt.visualDirection}` : '',
        hasContent && aiPromptInput.trim() ? `Extra instruction from user:\n${aiPromptInput}` : ''
      ].filter(Boolean).join('\n\n');

      const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(geminiModel.trim() || GEMINI_MODEL)}:generateContent`;
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-goog-api-key': geminiKey.trim() },
        body: JSON.stringify({
          contents: [{ parts: [{ text: parts }] }],
          systemInstruction: { parts: [{ text: systemPrompt }] },
          generationConfig: { responseMimeType: 'application/json' }
        })
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data?.error?.message || `HTTP ${response.status}`);
      const generatedText = data?.candidates?.[0]?.content?.parts?.[0]?.text;
      if (!generatedText) throw new Error('Respons AI kosong.');
      const result = parseAiJson(generatedText);
      if (!result.improved_prompt) throw new Error('Respons AI tidak berisi prompt.');

      // simpan versi sebelum AI supaya bisa dikembalikan
      setAiBackup({
        title: editingPrompt.title,
        content: editingPrompt.content,
        visualDirection: editingPrompt.visualDirection,
        tags: editingPrompt.tags
      });
      setEditingPrompt(prev => {
        const existingTags = String(prev.tags || '').split(',').map(t => t.trim()).filter(Boolean);
        const aiTags = Array.isArray(result.tags) ? result.tags.map(t => String(t).replace(/^#/, '').trim()).filter(Boolean) : [];
        const mergedTags = [...existingTags, ...aiTags.filter(t => !existingTags.some(x => x.toLowerCase() === t.toLowerCase()))];
        return {
          ...prev,
          title: prev.title || result.title || source.slice(0, 30) + ' (AI)',
          content: result.improved_prompt,
          visualDirection: result.visual_direction || prev.visualDirection || '',
          tags: mergedTags.join(', ')
        };
      });
      setAiNote(result.note || 'Prompt dan arahan visual diperbarui oleh AI.');

      setShowAiModal(false);
      setAiPromptInput('');
    } catch (err) {
      console.error("AI Generation error:", err);
      addLog(`AI error: ${err.message}`, 'error');
      alert(`Gagal menghubungi AI: ${err.message}`);
    } finally {
      setIsAiGenerating(false);
    }
  };

  const restoreBeforeAi = () => {
    if (!aiBackup) return;
    setEditingPrompt(prev => ({ ...prev, ...aiBackup }));
    setAiBackup(null);
    setAiNote('');
  };

  const isDark = isDarkMode;
  const glassStyle = isDark ? UI_STYLES.glassPanelDark : UI_STYLES.glassPanelLight;
  const inputStyle = isDark ? UI_STYLES.glassInputDark : UI_STYLES.glassInputLight;

  return (
    <div className={`pv-root h-[100dvh] flex flex-col font-sans transition-colors duration-300 overflow-hidden selection:bg-indigo-500 selection:text-white ${isDark ? 'bg-slate-950 text-slate-100' : 'bg-slate-50 text-slate-800'}`}>
      
      <div className="pv-statusbar" />
      <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
        <div className={`absolute -top-40 -left-40 w-80 h-80 rounded-full blur-3xl opacity-30 ${isDark ? 'bg-indigo-600/40' : 'bg-indigo-300/60'}`} />
        <div className={`absolute top-1/2 -right-40 w-80 h-80 rounded-full blur-3xl opacity-20 ${isDark ? 'bg-purple-600/40' : 'bg-purple-300/60'}`} />
      </div>

      {/* macOS Style Glass Header */}
      <header className={`sticky top-0 z-30 h-14 md:h-16 border-b backdrop-blur-md flex items-center justify-between px-3 md:px-6 shrink-0 ${isDark ? 'border-slate-800/80 bg-slate-950/70' : 'border-slate-200/80 bg-white/70'}`}>
        <div className="flex items-center space-x-2 md:space-x-3 truncate">
          {mobileView !== 'folders' && (
            <button 
              onClick={() => setMobileView(mobileView === 'detail' ? 'prompts' : 'folders')}
              className="md:hidden p-1.5 rounded-lg bg-indigo-500/10 text-indigo-400 hover:bg-indigo-500/20 mr-1 shrink-0 flex items-center text-xs font-semibold"
            >
              <ChevronLeft className="w-4 h-4 mr-0.5" />
              <span>{mobileView === 'detail' ? 'Prompts' : 'Folder'}</span>
            </button>
          )}

          <div className="hidden sm:flex items-center space-x-1.5 mr-1 shrink-0">
            <div className="w-3 h-3 rounded-full bg-rose-500/80 border border-rose-600/50" />
            <div className="w-3 h-3 rounded-full bg-amber-500/80 border border-amber-600/50" />
            <div className="w-3 h-3 rounded-full bg-emerald-500/80 border border-emerald-600/50" />
          </div>

          <div className="flex items-center space-x-1.5 truncate">
            <Logo size={28} className="shrink-0 drop-shadow-md" />
            <span className="font-semibold text-sm md:text-base tracking-tight bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 bg-clip-text text-transparent truncate">
              PromptVault <span className="text-[10px] px-1.5 py-0.5 rounded-full border border-indigo-500/30 text-indigo-400 font-mono">PRO</span>
            </span>
          </div>
        </div>

        <div className="flex items-center space-x-2 shrink-0">
          {/* Cloud Sync Status Indicator */}
          <button 
            onClick={() => setIsSettingsOpen(true)}
            className="flex items-center space-x-1 px-2 py-1 rounded-xl text-[10px] font-mono border border-slate-800/40 bg-slate-900/50 text-slate-400 hover:border-indigo-500/50 transition-all" 
            title="Status penyimpanan & pengaturan"
          >
            {saveStatus === 'saved' && <HardDrive className="w-3.5 h-3.5 text-emerald-400" />}
            {saveStatus === 'error' && <AlertTriangle className="w-3.5 h-3.5 text-rose-400" />}
            <span className="hidden lg:inline">{saveStatus === 'saved' ? 'Tersimpan' : 'Gagal simpan'}</span>
          </button>

          <button 
            onClick={() => setIsSettingsOpen(true)}
            className={`p-2 rounded-xl border transition-all shrink-0 ${isDark ? 'border-slate-800 bg-slate-900 text-slate-300' : 'border-slate-200 bg-slate-100 text-slate-700'}`}
            title="Pengaturan & Log Diagnostik"
          >
            <Settings className="w-4 h-4" />
          </button>

          <button 
            onClick={() => setIsDarkMode(!isDarkMode)}
            className={`p-2 rounded-xl border transition-all shrink-0 ${isDark ? 'border-slate-800 bg-slate-900 text-amber-400' : 'border-slate-200 bg-slate-100 text-slate-700'}`}
            title="Switch Theme"
          >
            {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          </button>
        </div>
      </header>

      <div className="flex-1 flex overflow-hidden z-10 relative">
        {/* PANEL 1: Folders List */}
        <aside className={`${mobileView === 'folders' ? 'flex' : 'hidden'} md:flex w-full md:w-60 border-r flex-col p-3 space-y-3 shrink-0 ${isDark ? 'border-slate-800/80 bg-slate-950/50' : 'border-slate-200/80 bg-slate-50/50'}`}>
          <div className="flex items-center justify-between px-2 pt-1">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">Root</span>
            <button 
              onClick={() => openNewFolder(null)}
              className="p-1 rounded-lg hover:bg-indigo-500/20 text-indigo-400 transition-colors"
              title="Tambah folder di Root"
            >
              <FolderPlus className="w-4 h-4" />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto space-y-1.5 pr-1 custom-scrollbar">
            {flattenTree(folders, collapsedIds).map(({ folder, depth, hasChildren }) => {
              const isActive = folder.id === selectedFolderId;
              const FolderIconComponent = ICON_MAP[folder.icon] || Folder;
              const isCollapsed = collapsedIds.includes(folder.id);

              return (
                <div
                  key={folder.id}
                  onClick={() => handleSelectFolder(folder.id)}
                  style={{ marginLeft: Math.min(depth, 6) * 14 }}
                  className={`group flex items-center justify-between pl-1.5 pr-2 py-3 md:py-2.5 rounded-2xl text-xs font-medium cursor-pointer transition-all ${
                    isActive
                      ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/30'
                      : isDark ? 'text-slate-300 hover:bg-slate-800/60' : 'text-slate-700 hover:bg-slate-200/70'
                  }`}
                >
                  <div className="flex items-center space-x-1 truncate">
                    <button
                      onClick={(e) => hasChildren ? toggleCollapse(folder.id, e) : e.stopPropagation()}
                      className={`w-5 h-5 shrink-0 flex items-center justify-center rounded ${hasChildren ? '' : 'invisible'}`}
                      title={isCollapsed ? 'Buka subfolder' : 'Lipat subfolder'}
                    >
                      <ChevronRight className={`w-3.5 h-3.5 transition-transform ${isCollapsed ? '' : 'rotate-90'} ${isActive ? 'text-white' : 'text-slate-400'}`} />
                    </button>
                    <FolderIconComponent className={`w-4 h-4 shrink-0 ${isActive ? 'text-white' : 'text-indigo-400'}`} />
                    <span className="truncate pl-1">{folder.name}</span>
                  </div>
                  <div className="flex items-center space-x-0.5 shrink-0">
                    <span className={`px-2 py-0.5 rounded-full text-[10px] ${isActive ? 'bg-indigo-700 text-indigo-100' : isDark ? 'bg-slate-800 text-slate-400' : 'bg-slate-200 text-slate-600'}`}>
                      {folder.prompts?.length || 0}
                    </span>

                    <button
                      onClick={(e) => { e.stopPropagation(); openNewFolder(folder.id); }}
                      className="opacity-100 md:opacity-0 md:group-hover:opacity-100 p-1 rounded hover:bg-indigo-500/20 text-slate-400 hover:text-white"
                      title="Tambah subfolder di dalam folder ini"
                    >
                      <FolderPlus className="w-3.5 h-3.5" />
                    </button>

                    <button
                      onClick={(e) => handleOpenEditFolder(folder, e)}
                      className="opacity-100 md:opacity-0 md:group-hover:opacity-100 p-1 rounded hover:bg-indigo-500/20 text-slate-400 hover:text-white"
                      title="Edit Nama/Ikon/Lokasi Folder"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                    </button>

                    {folders.length > 1 && (
                      <button
                        onClick={(e) => handleDeleteFolder(folder.id, e)}
                        className="opacity-100 md:opacity-0 md:group-hover:opacity-100 p-1 rounded hover:bg-rose-500/20 text-rose-400"
                        title="Hapus Folder"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {allTags.length > 0 && (
            <div className="pt-2 border-t border-slate-800/50">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 px-2 block mb-2">Filter Tag</span>
              <div className="flex flex-wrap gap-1 max-h-24 overflow-y-auto">
                <button
                  onClick={() => setSelectedTag(null)}
                  className={`px-2 py-1 text-[10px] rounded-lg transition-all ${!selectedTag ? 'bg-indigo-500 text-white' : isDark ? 'bg-slate-800 text-slate-400' : 'bg-slate-200 text-slate-600'}`}
                >
                  Semua
                </button>
                {allTags.map(tag => (
                  <button
                    key={tag}
                    onClick={() => setSelectedTag(tag === selectedTag ? null : tag)}
                    className={`px-2 py-1 text-[10px] rounded-lg transition-all ${selectedTag === tag ? 'bg-indigo-500 text-white' : isDark ? 'bg-slate-800 text-slate-400' : 'bg-slate-200 text-slate-600'}`}
                  >
                    #{tag}
                  </button>
                ))}
              </div>
            </div>
          )}
        </aside>

        {/* PANEL 2: Prompts Item List */}
        <section className={`${mobileView === 'prompts' ? 'flex' : 'hidden'} md:flex w-full md:w-72 border-r flex-col p-3 space-y-3 shrink-0 ${isDark ? 'border-slate-800/80 bg-slate-900/40' : 'border-slate-200/80 bg-white/50'}`}>
          <div className="flex items-center justify-between px-1">
            <h2 className="text-xs font-bold truncate pr-2" title={getFolderPath(folders, activeFolder?.id).map(f => f.name).join(' / ')}>
              <span className="text-slate-500 font-medium">Root / </span>
              {getFolderPath(folders, activeFolder?.id).map(f => f.name).join(' / ') || 'Folder Prompts'}
            </h2>
            <button 
              onClick={() => {
                setEditingPrompt({ id: null, title: '', content: '', tags: '', visualDirection: '', folderId: selectedFolderId });
                setAiBackup(null);
                setAiNote('');
                setIsPromptModalOpen(true);
              }}
              className={`px-2.5 py-1.5 rounded-xl text-xs flex items-center space-x-1 shrink-0 ${UI_STYLES.btnPrimary}`}
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Prompt Baru</span>
            </button>
          </div>

          <div className="relative w-full">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input 
              type="text" 
              placeholder="Cari kata kunci prompt..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className={`w-full text-xs pl-8 pr-3 py-1.5 rounded-xl outline-none ${inputStyle}`}
            />
          </div>

          <div className="flex-1 overflow-y-auto space-y-2 pr-1 custom-scrollbar">
            {filteredPrompts.length === 0 ? (
              <div className="text-center py-10 px-3">
                <FileText className="w-8 h-8 mx-auto text-slate-500 mb-2 opacity-40" />
                <p className="text-xs text-slate-400">Belum ada prompt.</p>
              </div>
            ) : (
              filteredPrompts.map((p) => {
                const isSelected = activePrompt?.id === p.id;
                return (
                  <div 
                    key={p.id}
                    onClick={() => handleSelectPrompt(p.id)}
                    className={`p-3 rounded-2xl cursor-pointer border transition-all relative ${
                      isSelected 
                        ? isDark ? 'bg-indigo-950/60 border-indigo-500/80' : 'bg-indigo-50 border-indigo-400'
                        : isDark ? 'bg-slate-900/80 border-slate-800' : 'bg-white border-slate-200'
                    }`}
                  >
                    <h3 className={`text-xs font-semibold line-clamp-1 ${isSelected ? 'text-indigo-400' : ''}`}>
                      {p.title}
                    </h3>
                    <p className="text-[11px] text-slate-400 line-clamp-2 mt-1 leading-relaxed">
                      {p.content}
                    </p>
                    <div className="flex items-center justify-between mt-2 pt-2 border-t border-slate-800/20">
                      <div className="flex items-center space-x-1 overflow-hidden">
                        {(p.tags || []).slice(0, 2).map(tag => (
                          <span key={tag} className="text-[9px] px-1.5 py-0.5 rounded bg-indigo-500/10 text-indigo-400 font-mono">
                            #{tag}
                          </span>
                        ))}
                      </div>
                      <span className="text-[9px] text-slate-500 shrink-0">
                        {new Date(p.updatedAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                      </span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </section>

        {/* PANEL 3: Detail Workspace */}
        <main className={`${mobileView === 'detail' ? 'flex' : 'hidden'} md:flex flex-1 flex-col p-4 md:p-6 overflow-y-auto relative w-full`}>
          {activePrompt ? (
            <div className={`w-full max-w-4xl mx-auto p-5 md:p-8 rounded-3xl space-y-5 ${glassStyle}`}>
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b pb-4 border-slate-800/40">
                <div className="space-y-1">
                  <div className="flex items-center space-x-2">
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-400 font-mono">
                      {activeFolder?.name}
                    </span>
                  </div>
                  <h1 className="text-lg md:text-2xl font-bold tracking-tight">{activePrompt.title}</h1>
                </div>

                <div className="flex items-center space-x-2 shrink-0 self-start sm:self-auto">
                  <button 
                    onClick={() => copyToClipboard(activePrompt.content, activePrompt.id)}
                    className={`px-3 py-2 rounded-xl text-xs flex items-center space-x-1.5 ${UI_STYLES.btnPrimary}`}
                  >
                    {copiedId === activePrompt.id ? <Check className="w-3.5 h-3.5 text-emerald-300" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copiedId === activePrompt.id ? 'Tersalin!' : 'Salin'}</span>
                  </button>

                  <button 
                    onClick={() => {
                      setEditingPrompt({
                        id: activePrompt.id,
                        title: activePrompt.title,
                        content: activePrompt.content,
                        tags: (activePrompt.tags || []).join(', '),
                        visualDirection: activePrompt.visualDirection || '',
                        folderId: selectedFolderId
                      });
                      setAiBackup(null);
                      setAiNote('');
                      setIsPromptModalOpen(true);
                    }}
                    className={`p-2 rounded-xl text-xs border ${isDark ? UI_STYLES.btnSecondaryDark : UI_STYLES.btnSecondaryLight}`}
                  >
                    <Edit3 className="w-4 h-4" />
                  </button>

                  <button 
                    onClick={() => handleDeletePrompt(activePrompt.id)}
                    className="p-2 rounded-xl text-xs border border-rose-500/30 bg-rose-500/10 text-rose-400 hover:bg-rose-500/20"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {activePrompt.tags && activePrompt.tags.length > 0 && (
                <div className="flex items-center space-x-2">
                  <Tag className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                  <div className="flex flex-wrap gap-1">
                    {activePrompt.tags.map(t => (
                      <span key={t} className="text-[10px] px-2 py-0.5 rounded bg-indigo-500/15 text-indigo-400 font-mono">
                        #{t}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              <div className="space-y-1.5">
                <label className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">Isi Prompt Vault</label>
                <div className={`p-4 md:p-5 rounded-2xl border font-mono text-xs md:text-sm leading-relaxed whitespace-pre-wrap select-all ${
                  isDark ? 'bg-slate-950/80 border-slate-800/80 text-slate-200' : 'bg-slate-50 border-slate-200 text-slate-800'
                }`}>
                  {activePrompt.content}
                </div>
              </div>

              {activePrompt.visualDirection && (
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="text-[10px] font-semibold uppercase tracking-wider text-fuchsia-400">Arahan Visual</label>
                    <button
                      onClick={() => copyToClipboard(activePrompt.visualDirection, `${activePrompt.id}-v`)}
                      className={`px-2 py-1 rounded-lg text-[11px] flex items-center space-x-1 border ${isDark ? UI_STYLES.btnSecondaryDark : UI_STYLES.btnSecondaryLight}`}
                    >
                      {copiedId === `${activePrompt.id}-v` ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                      <span>{copiedId === `${activePrompt.id}-v` ? 'Tersalin!' : 'Salin'}</span>
                    </button>
                  </div>
                  <div className={`p-4 md:p-5 rounded-2xl border text-xs md:text-sm leading-relaxed whitespace-pre-wrap select-all ${
                    isDark ? 'bg-fuchsia-950/20 border-fuchsia-500/30 text-slate-200' : 'bg-fuchsia-50 border-fuchsia-200 text-slate-800'
                  }`}>
                    {activePrompt.visualDirection}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-center p-6">
              <Logo size={64} className="mb-3 opacity-80" />
              <h3 className="text-base font-bold">Pilih Prompt</h3>
              <p className="text-xs text-slate-400 max-w-xs mt-1">
                Pilih prompt dari folder Anda atau buat prompt baru.
              </p>
            </div>
          )}
        </main>
      </div>

      {/* MODAL 1: Smart Folder Modal (Create & Edit) */}
      {isFolderModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className={`w-full max-w-sm p-5 rounded-3xl space-y-4 shadow-2xl ${glassStyle}`}>
            <h3 className="text-sm font-bold">
              {editingFolderId ? 'Edit Folder Vault' : folderParentId ? 'Tambah Subfolder Baru' : 'Tambah Folder Baru di Root'}
            </h3>
            <form onSubmit={handleSaveFolder} className="space-y-3">
              <div>
                <label className="text-[11px] text-slate-400 block mb-1">
                  {editingFolderId ? 'Nama Folder' : 'Nama Folder (Opsional - Auto Detect)'}
                </label>
                <input 
                  type="text" 
                  placeholder={editingFolderId ? "Nama folder..." : "Misal: Python Automation / Kosongkan"} 
                  value={newFolderName}
                  onChange={(e) => {
                    setNewFolderName(e.target.value);
                    if (!editingFolderId) {
                      const detected = autoDetectFolderMeta(e.target.value, folders.length);
                      setSelectedFolderIcon(detected.icon);
                    }
                  }}
                  className={`w-full text-xs p-3 rounded-xl outline-none ${inputStyle}`}
                  autoFocus
                />
              </div>

              <div>
                <label className="text-[11px] text-slate-400 block mb-1">Lokasi (Folder Induk)</label>
                <select
                  value={folderParentId || ''}
                  onChange={(e) => setFolderParentId(e.target.value || null)}
                  className={`w-full text-xs p-3 rounded-xl outline-none ${inputStyle}`}
                >
                  <option value="" className={isDark ? 'bg-slate-900' : 'bg-white'}>Root (paling atas)</option>
                  {flattenTree(
                    folders, [],
                    editingFolderId ? [editingFolderId, ...getDescendantIds(folders, editingFolderId)] : []
                  ).map(({ folder, depth }) => (
                    <option key={folder.id} value={folder.id} className={isDark ? 'bg-slate-900' : 'bg-white'}>
                      {'\u00A0\u00A0'.repeat(depth)}{depth ? '↳ ' : ''}{folder.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-[11px] text-slate-400 block mb-1.5">Pilih Ikon Monoline</label>
                <div className="grid grid-cols-6 gap-1.5">
                  {AVAILABLE_ICONS.map(iconName => {
                    const IconComp = ICON_MAP[iconName] || Folder;
                    const isSelected = selectedFolderIcon === iconName;
                    return (
                      <button
                        type="button"
                        key={iconName}
                        onClick={() => setSelectedFolderIcon(iconName)}
                        className={`p-2 rounded-xl flex items-center justify-center border transition-all ${
                          isSelected 
                            ? 'bg-indigo-600 text-white border-indigo-400' 
                            : isDark ? 'bg-slate-800/80 border-slate-700 text-slate-300' : 'bg-slate-100 border-slate-300 text-slate-700'
                        }`}
                      >
                        <IconComp className="w-4 h-4" />
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="flex justify-end space-x-2 pt-2">
                <button 
                  type="button" 
                  onClick={() => setIsFolderModalOpen(false)}
                  className={`px-3 py-2 rounded-xl text-xs border ${isDark ? UI_STYLES.btnSecondaryDark : UI_STYLES.btnSecondaryLight}`}
                >
                  Batal
                </button>
                <button type="submit" className={`px-4 py-2 rounded-xl text-xs ${UI_STYLES.btnPrimary}`}>
                  Simpan
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: Add / Edit Prompt */}
      {isPromptModalOpen && (
        <div className="fixed inset-0 z-50 flex items-start md:items-center justify-center p-4 pt-[calc(env(safe-area-inset-top)+1rem)] bg-black/60 backdrop-blur-sm overflow-y-auto">
          <div className={`w-full max-w-xl p-5 my-4 rounded-3xl space-y-4 shadow-2xl ${glassStyle}`}>
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold">
                {editingPrompt.id ? 'Edit Prompt Vault' : 'Buat Prompt Baru'}
              </h3>
              <button 
                type="button"
                onClick={() => setShowAiModal(true)}
                className="px-2.5 py-1.5 rounded-xl text-[11px] bg-gradient-to-r from-purple-500 to-pink-500 text-white flex items-center space-x-1"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>AI Enhancer</span>
              </button>
            </div>

            <form onSubmit={handleSavePrompt} className="space-y-3">
              <div>
                <label className="text-[11px] text-slate-400 block mb-1">Judul Prompt</label>
                <input 
                  type="text" 
                  placeholder="Judul Prompt..." 
                  value={editingPrompt.title}
                  onChange={(e) => setEditingPrompt({...editingPrompt, title: e.target.value})}
                  className={`w-full text-xs p-2.5 rounded-xl outline-none ${inputStyle}`}
                  required
                />
              </div>

              <div>
                <label className="text-[11px] text-slate-400 block mb-1">Folder Target</label>
                <select 
                  value={editingPrompt.folderId || selectedFolderId}
                  onChange={(e) => setEditingPrompt({...editingPrompt, folderId: e.target.value})}
                  className={`w-full text-xs p-2.5 rounded-xl outline-none ${inputStyle}`}
                >
                  {flattenTree(folders, []).map(({ folder: f, depth }) => (
                    <option key={f.id} value={f.id} className={isDark ? 'bg-slate-900' : 'bg-white'}>
                      {'\u00A0\u00A0'.repeat(depth)}{depth ? '↳ ' : ''}{f.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-[11px] text-slate-400 block mb-1">Tag (Pisahkan dengan koma)</label>
                <input 
                  type="text" 
                  placeholder="Coding, React" 
                  value={editingPrompt.tags}
                  onChange={(e) => setEditingPrompt({...editingPrompt, tags: e.target.value})}
                  className={`w-full text-xs p-2.5 rounded-xl outline-none ${inputStyle}`}
                />
              </div>

              <div>
                <label className="text-[11px] text-slate-400 block mb-1">Isi Prompt</label>
                <textarea 
                  rows={6}
                  placeholder="Tulis instruksi prompt di sini..." 
                  value={editingPrompt.content}
                  onChange={(e) => setEditingPrompt({...editingPrompt, content: e.target.value})}
                  className={`w-full text-xs p-2.5 rounded-xl outline-none font-mono ${inputStyle}`}
                  required
                />
              </div>

              <div>
                <label className="text-[11px] text-slate-400 block mb-1">Arahan Visual (opsional)</label>
                <textarea
                  rows={4}
                  placeholder="Objek utama, komposisi/sudut, pencahayaan, palet warna, gaya, mood... (atau biarkan AI Enhancer yang menentukan)"
                  value={editingPrompt.visualDirection}
                  onChange={(e) => setEditingPrompt({...editingPrompt, visualDirection: e.target.value})}
                  className={`w-full text-xs p-2.5 rounded-xl outline-none ${inputStyle}`}
                />
              </div>

              {aiNote && (
                <div className="flex items-start justify-between gap-2 p-2.5 rounded-xl border border-purple-500/30 bg-purple-500/10 text-[11px] text-purple-200">
                  <span className="flex-1"><Sparkles className="w-3 h-3 inline mr-1 -mt-0.5" />{aiNote}</span>
                  {aiBackup && (
                    <button type="button" onClick={restoreBeforeAi} className="shrink-0 underline text-purple-300">
                      Kembalikan
                    </button>
                  )}
                </div>
              )}

              <div className="flex justify-end space-x-2 pt-2">
                <button 
                  type="button" 
                  onClick={() => setIsPromptModalOpen(false)}
                  className={`px-3 py-2 rounded-xl text-xs border ${isDark ? UI_STYLES.btnSecondaryDark : UI_STYLES.btnSecondaryLight}`}
                >
                  Batal
                </button>
                <button type="submit" className={`px-4 py-2 rounded-xl text-xs ${UI_STYLES.btnPrimary}`}>
                  Simpan Prompt
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 3: Gemini AI Prompt Enhancer Assistant */}
      {showAiModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-md">
          <div className={`w-full max-w-md p-5 rounded-3xl space-y-3 shadow-2xl border border-purple-500/40 ${glassStyle}`}>
            <div className="flex items-center space-x-2">
              <Sparkles className="w-4 h-4 text-purple-400" />
              <h3 className="text-sm font-bold bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
                Gemini AI Enhancer
              </h3>
            </div>
            
            {editingPrompt.content.trim() ? (
              <>
                <p className="text-xs text-slate-300">
                  AI membaca prompt yang sedang kamu tulis, memperbaikinya, lalu menentukan arahan visualnya otomatis.
                </p>
                <div className={`p-2.5 rounded-xl border text-[11px] leading-relaxed max-h-28 overflow-y-auto ${isDark ? 'bg-slate-950/70 border-slate-800 text-slate-300' : 'bg-slate-50 border-slate-200 text-slate-700'}`}>
                  <span className="text-slate-500">Dibaca dari prompt:</span>{' '}
                  {editingPrompt.content.slice(0, 280)}{editingPrompt.content.length > 280 ? '…' : ''}
                </div>
                <textarea
                  rows={2}
                  placeholder="Arahan tambahan (opsional), mis: bikin lebih gelap dan sinematik"
                  value={aiPromptInput}
                  onChange={(e) => setAiPromptInput(e.target.value)}
                  className={`w-full text-xs p-2.5 rounded-xl outline-none ${inputStyle}`}
                />
              </>
            ) : (
              <>
                <p className="text-xs text-slate-300">
                  Isi prompt masih kosong. Tulis ide kasarnya di sini, AI akan menyusun prompt dan arahan visualnya.
                </p>
                <textarea
                  rows={4}
                  placeholder="Contoh: poster astronaut sendirian di padang bunga neon..."
                  value={aiPromptInput}
                  onChange={(e) => setAiPromptInput(e.target.value)}
                  className={`w-full text-xs p-2.5 rounded-xl outline-none ${inputStyle}`}
                />
              </>
            )}

            <div className="flex justify-end space-x-2 pt-2">
              <button 
                type="button" 
                onClick={() => setShowAiModal(false)}
                className={`px-3 py-1.5 rounded-xl text-xs border ${isDark ? UI_STYLES.btnSecondaryDark : UI_STYLES.btnSecondaryLight}`}
              >
                Batal
              </button>
              <button 
                type="button"
                onClick={handleEnhancePromptWithAI}
                disabled={isAiGenerating}
                className={`px-3 py-1.5 rounded-xl text-xs flex items-center space-x-1.5 ${UI_STYLES.btnPrimary}`}
              >
                {isAiGenerating ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Merancang...</span>
                  </>
                ) : (
                  <>
                    <Zap className="w-3.5 h-3.5" />
                    <span>{editingPrompt.content.trim() ? 'Perbaiki & Arahkan' : 'Generate'}</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 4: Settings & Diagnostics Panel */}
      {isSettingsOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-md">
          <div className={`w-full max-w-lg max-h-[85dvh] overflow-y-auto p-5 rounded-3xl space-y-4 shadow-2xl ${glassStyle}`}>
            <div className="flex items-center justify-between border-b pb-3 border-slate-800/40">
              <div className="flex items-center space-x-2">
                <Activity className="w-4 h-4 text-indigo-400" />
                <h3 className="text-sm font-bold">Diagnostik Vault & Pengaturan</h3>
              </div>
              <button 
                onClick={() => setIsSettingsOpen(false)}
                className="text-xs text-slate-400 hover:text-white"
              >
                Tutup
              </button>
            </div>

            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className={`p-3 rounded-2xl border ${isDark ? 'bg-slate-950/60 border-slate-800' : 'bg-slate-100 border-slate-200'}`}>
                  <span className="text-[10px] text-slate-400 block mb-1">Status Storage</span>
                  <span className="font-semibold capitalize flex items-center space-x-1">
                    {saveStatus === 'saved' && <CheckCircle className="w-3.5 h-3.5 text-emerald-400 mr-1" />}
                    {saveStatus === 'saved' ? 'Tersimpan di perangkat' : 'Gagal simpan'}
                  </span>
                </div>
                <div className={`p-3 rounded-2xl border ${isDark ? 'bg-slate-950/60 border-slate-800' : 'bg-slate-100 border-slate-200'}`}>
                  <span className="text-[10px] text-slate-400 block mb-1">Total Vault Data</span>
                  <span className="font-semibold">{folders.length} Folder, {folders.reduce((acc, f) => acc + (f.prompts?.length || 0), 0)} Prompts</span>
                </div>
              </div>

              <div>
                <label className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 block mb-1.5">Gemini API Key (untuk AI Enhancer)</label>
                <input
                  type="password"
                  autoComplete="off"
                  placeholder="Tempel API key di sini..."
                  value={geminiKey}
                  onChange={(e) => setGeminiKey(e.target.value)}
                  className={`w-full text-xs p-2.5 rounded-xl outline-none font-mono ${inputStyle}`}
                />
                <input
                  type="text"
                  autoComplete="off"
                  placeholder="Nama model (default gemini-3-flash-preview)"
                  value={geminiModel}
                  onChange={(e) => setGeminiModel(e.target.value)}
                  className={`w-full text-xs p-2.5 mt-2 rounded-xl outline-none font-mono ${inputStyle}`}
                />
                <p className="text-[10px] text-slate-500 mt-1">Disimpan hanya di perangkat ini, tidak dikirim ke mana pun selain ke Google saat Generate.</p>
              </div>

              <div>
                <label className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 block mb-1.5">Backup & Pemulihan Data</label>
                <div className="flex space-x-2">
                  <button 
                    onClick={handleExportBackup}
                    className={`flex-1 py-2 rounded-xl text-xs flex items-center justify-center space-x-1 border ${isDark ? UI_STYLES.btnSecondaryDark : UI_STYLES.btnSecondaryLight}`}
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Ekspor CSV / Bagikan</span>
                  </button>
                  
                  <button 
                    onClick={() => fileInputRef.current?.click()}
                    className={`flex-1 py-2 rounded-xl text-xs flex items-center justify-center space-x-1 border ${isDark ? UI_STYLES.btnSecondaryDark : UI_STYLES.btnSecondaryLight}`}
                  >
                    <Upload className="w-3.5 h-3.5" />
                    <span>Impor CSV</span>
                  </button>
                  <input type="file" ref={fileInputRef} onChange={handleImportBackup} accept=".csv,.json,text/csv,application/json" className="hidden" />
                </div>
              </div>

              <div>
                <label className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 block mb-1">Log Diagnostik System (Realtime)</label>
                <div className={`p-3 rounded-2xl border h-36 overflow-y-auto font-mono text-[10px] space-y-1.5 ${isDark ? 'bg-slate-950 border-slate-800 text-slate-300' : 'bg-slate-900 text-slate-200'}`}>
                  {storageLogs.length === 0 ? (
                    <span className="text-slate-500">Belum ada aktivitas tercatat.</span>
                  ) : (
                    storageLogs.map((log, i) => (
                      <div key={i} className="flex space-x-2">
                        <span className="text-slate-500 shrink-0">[{log.time}]</span>
                        <span className={log.type === 'error' ? 'text-rose-400' : log.type === 'success' ? 'text-emerald-400' : log.type === 'warn' ? 'text-amber-400' : 'text-slate-300'}>
                          {log.msg}
                        </span>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error("Critical Runtime Error caught by boundary:", error, errorInfo);
  }

  handleExportEmergencyData = () => {
    try {
      const data = localStorage.getItem('pv_folders') || '[]';
      const blob = new Blob([data], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `PromptVault_Emergency_Backup_${Date.now()}.json`;
      a.click();
    } catch (e) {
      alert('Gagal mengeksport data darurat.');
    }
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center p-6">
          <div className="max-w-md w-full bg-slate-900 border border-slate-800 rounded-3xl p-6 space-y-4 shadow-2xl text-center">
            <AlertTriangle className="w-12 h-12 text-rose-500 mx-auto" />
            <h2 className="text-lg font-bold">Terjadi Kesalahan Aplikasi</h2>
            <p className="text-xs text-slate-400 font-mono bg-slate-950 p-3 rounded-xl text-left overflow-x-auto">
              {this.state.error?.toString() || 'Unknown Runtime Exception'}
            </p>
            <div className="flex flex-col space-y-2 pt-2">
              <button 
                onClick={() => this.setState({ hasError: false, error: null })}
                className="w-full py-2.5 rounded-xl text-xs font-semibold bg-indigo-600 text-white"
              >
                Coba Render Ulang (Reset UI State)
              </button>
              <button 
                onClick={this.handleExportEmergencyData}
                className="w-full py-2.5 rounded-xl text-xs font-semibold bg-slate-800 text-slate-300 flex items-center justify-center space-x-1.5"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Export Data Darurat (JSON)</span>
              </button>
            </div>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

export default function App() {
  return (
    <ErrorBoundary>
      <PromptVaultApp />
    </ErrorBoundary>
  );
}