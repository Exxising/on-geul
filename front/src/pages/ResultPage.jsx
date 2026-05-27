import React, { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { getDocument, exportDocument, notifySlack, addToCalendar, maskDocument } from '../api/documents';
import { useToast } from '../hooks/useToast';

// All supported masking target types
const ALL_MASK_TYPES = [
  { key: '이름',        label: '이름',       icon: 'person',           color: 'text-violet-600' },
  { key: '전화번호',    label: '전화번호',   icon: 'call',             color: 'text-blue-600'   },
  { key: '주민번호',    label: '주민번호',   icon: 'badge',            color: 'text-red-600'    },
  { key: '주소',        label: '주소',       icon: 'location_on',      color: 'text-orange-600' },
  { key: '병명',        label: '병명',       icon: 'medication',       color: 'text-pink-600'   },
  { key: '금융정보(카드)', label: '카드번호', icon: 'credit_card',    color: 'text-emerald-600'},
  { key: '이메일',      label: '이메일',     icon: 'mail',             color: 'text-sky-600'    },
  { key: '계좌번호',    label: '계좌번호',   icon: 'account_balance',  color: 'text-teal-600'   },
  { key: '사업자번호',  label: '사업자번호', icon: 'business',         color: 'text-amber-600'  },
  { key: '소속/직책',   label: '소속/직책',  icon: 'work',             color: 'text-indigo-600' },
];

const getDraftKey = (docId) => `ongle_doc_edits_${docId}`;

const readDraft = (docId) => {
  try {
    const raw = localStorage.getItem(getDraftKey(docId));
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
};

const writeDraft = (docId, payload) => {
  try {
    localStorage.setItem(getDraftKey(docId), JSON.stringify(payload));
  } catch {
    // ignore storage failures in demo mode
  }
};

const updateDraft = (docId, patch) => {
  const current = readDraft(docId) || {};
  writeDraft(docId, { ...current, ...patch });
};

const ResultPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { showToast } = useToast();

  const [loading, setLoading]   = useState(true);
  const [doc, setDoc]           = useState(null);

  const [editedTitle, setEditedTitle]         = useState('');
  const [editedContent, setEditedContent]     = useState('');
  const [editedAttendees, setEditedAttendees] = useState([]);
  const [actionItems, setActionItems]         = useState([]);
  const [contentEditMode, setContentEditMode] = useState(false);
  const [actionItemEditIndex, setActionItemEditIndex] = useState(null);
  const [actionItemDraft, setActionItemDraft] = useState({ title: '', assignee: '', dueDate: '' });

  // Masking states
  const [isMaskingActive, setIsMaskingActive]   = useState(false);
  const [maskingLevel, setMaskingLevel]         = useState('pseudonym');
  const [maskedContent, setMaskedContent]       = useState('');
  const [detectedItems, setDetectedItems]       = useState([]);
  const [customDetectedItems, setCustomDetectedItems] = useState([]);
  const [hiddenDetectedIds, setHiddenDetectedIds] = useState([]);
  const [attendeeEditMode, setAttendeeEditMode] = useState(false);
  const [newAttendeeInput, setNewAttendeeInput] = useState('');
  const [showAddActionForm, setShowAddActionForm] = useState(false);
  const [newActionDraft, setNewActionDraft] = useState({ title: '', assignee: '', dueDate: '' });
  const [maskLoading, setMaskLoading]           = useState(false);
  const [isDetectedDrawerOpen, setIsDetectedDrawerOpen] = useState(false);
  const [editingDetectedId, setEditingDetectedId] = useState(null);
  const [editingDetectedDraft, setEditingDetectedDraft] = useState({ id: null, sourceId: null, type: '', value: '', masked: '', level: '원본유지' });
  const [customDetectedDraft, setCustomDetectedDraft] = useState({
    id: null,
    sourceId: null,
    type: '',
    value: '',
    masked: '',
    level: '원본유지',
  });
  // Selective type control — all checked by default
  const [selectedTypes, setSelectedTypes]       = useState(
    () => Object.fromEntries(ALL_MASK_TYPES.map(t => [t.key, true]))
  );

  const contentRef = useRef(null);

  useEffect(() => {
    const fetchDoc = async () => {
      try {
        const data = await getDocument(id);
        const draft = readDraft(id);
        setDoc(data);
        setEditedTitle(data.title);
        setEditedContent(draft?.content ?? data.content);
        setEditedAttendees(data.attendees || []);
        setActionItems(draft?.actionItems || data.actionItems || data.action_items || []);
        setCustomDetectedItems(draft?.customDetectedItems || []);
        setHiddenDetectedIds(draft?.hiddenDetectedIds || []);
      } catch (error) {
        showToast('문서를 불러오는 데 실패했습니다.', 'error');
      } finally {
        setLoading(false);
      }
    };
    fetchDoc();
  }, [id, showToast]);

  // ── Helpers ──────────────────────────────────────────────────────────────
  const activeTypesCount = Object.values(selectedTypes).filter(Boolean).length;

  const toggleType = (key) => {
    setSelectedTypes(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const toggleAll = () => {
    const allOn = activeTypesCount === ALL_MASK_TYPES.length;
    setSelectedTypes(Object.fromEntries(ALL_MASK_TYPES.map(t => [t.key, !allOn])));
  };

  // Apply masking call (used for activate + level change)
  const runMask = async (level, types) => {
    setMaskLoading(true);
    try {
      const data = await maskDocument(id, level, types);
      setMaskedContent(data.maskedContent);
      setDetectedItems(data.detectedItems || data.detected || []);
      setIsMaskingActive(true);
    } catch (err) {
      showToast('마스킹 처리에 실패했습니다.', 'error');
    } finally {
      setMaskLoading(false);
    }
  };

  const handleMaskToggle = async () => {
    if (isMaskingActive) {
      setIsMaskingActive(false);
      showToast('마스킹 필터가 해제되었습니다.', 'info');
      return;
    }
    await runMask(maskingLevel, selectedTypes);
    showToast('개인정보 마스킹 필터가 활성화되었습니다.', 'info');
  };

  const handleLevelChange = async (level) => {
    setMaskingLevel(level);
    if (isMaskingActive) {
      await runMask(level, selectedTypes);
      const labels = { full: '완전삭제', pseudonym: '가명처리', original: '원본유지' };
      showToast(`마스킹 수준: ${labels[level]}`, 'success');
    }
  };

  const handleTypeToggle = async (key) => {
    const next = { ...selectedTypes, [key]: !selectedTypes[key] };
    setSelectedTypes(next);
    if (isMaskingActive) await runMask(maskingLevel, next);
  };

  // ── Rendering masked HTML ─────────────────────────────────────────────────
  const renderMaskedHtml = () => {
    const escapeHtml = (value) => String(value)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');

    const esc = (s) => s.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');

    // Build combined detected list: base detected items (unless hidden or overridden) + custom items
    const overriddenBaseIds = new Set(customDetectedItems.filter((item) => item.sourceId).map((item) => item.sourceId));
    const baseDetected = detectedItems.filter((item) => !hiddenDetectedIds.includes(item.id) && !overriddenBaseIds.has(item.id));
    const allDetected = [...baseDetected, ...customDetectedItems];

    // Apply masks to the source text (editedContent if present, otherwise original doc content)
    const sourceText = editedContent || doc?.content || '';

    const escapeRegExp = (s) => String(s).replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');

    const itemsByValue = [...allDetected].filter(it => it.value).sort((a, b) => b.value.length - a.value.length);

    let maskedText = sourceText;
    for (const it of itemsByValue) {
      const pattern = new RegExp(escapeRegExp(it.value), 'g');
      const replacement = (it.level === '완전삭제' || !it.masked) ? '' : it.masked;
      maskedText = maskedText.replace(pattern, replacement);
    }

    // Highlight masked fragments (non-empty masked strings)
    const sortedMaskedValues = [...new Set(
      allDetected
        .filter(item => item.masked && item.masked !== item.value)
        .map(item => item.masked)
    )].sort((a, b) => b.length - a.length);

    const combinedPattern = sortedMaskedValues.length > 0
      ? new RegExp(`${sortedMaskedValues.map(esc).join('|')}|\\*{3,}(?:-\\*{3,})*`, 'g')
      : /\*{3,}(?:-\*{3,})*/g;

    const html = escapeHtml(maskedText).replace(combinedPattern, (match) => {
      const matchedItem = allDetected.find((item) => item.masked === match);
      const title = matchedItem
        ? `원본: ${matchedItem.value} | 분류: ${matchedItem.type}`
        : '마스킹 처리된 텍스트';
      return `<span class="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-red-100 border border-red-300 text-red-700 font-extrabold text-[12px] shadow-sm select-none" title="${escapeHtml(title)}">${escapeHtml(match)}</span>`;
    });

    return <div dangerouslySetInnerHTML={{ __html: html }} className="whitespace-pre-wrap leading-relaxed" />;
  };

  // ── Action handlers ───────────────────────────────────────────────────────
  const handleCopy = async () => {
    try {
      const text = `제목: ${editedTitle}\n\n참석자: ${editedAttendees.join(', ')}\n\n내용:\n${contentRef.current ? contentRef.current.innerText : editedContent}`;
      await navigator.clipboard.writeText(text);
      showToast('클립보드에 복사되었습니다.', 'success');
    } catch { showToast('클립보드 복사에 실패했습니다.', 'error'); }
  };

  const handleDownload = async () => {
    try {
      const text = contentRef.current ? contentRef.current.innerText : editedContent;
      const blob = await exportDocument(id, text);
      const url = window.URL.createObjectURL(new Blob([blob]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `${editedTitle || '문서'}.txt`);
      document.body.appendChild(link);
      link.click();
      link.parentNode.removeChild(link);
      showToast('다운로드가 실행되었습니다.', 'success');
    } catch { showToast('다운로드에 실패했습니다.', 'error'); }
  };

  const handleSlackShare = async () => {
    try {
      await notifySlack(id);
      showToast('Slack으로 공유되었습니다.', 'success');
    } catch { showToast('Slack 공유에 실패했습니다.', 'error'); }
  };

  const handleCalendarAdd = async (item) => {
    try {
      await addToCalendar(id, item);
      showToast('캘린더에 등록되었습니다', 'success');
    } catch { showToast('캘린더 등록에 실패했습니다.', 'error'); }
  };

  const handleCheckboxChange = (index) => {
    setActionItems(prev => {
      const updated = [...prev];
      updated[index] = { ...updated[index], completed: !updated[index].completed };
      updateDraft(id, { content: editedContent, actionItems: updated, customDetectedItems, hiddenDetectedIds });
      return updated;
    });
  };

  const handleContentSave = () => {
    setContentEditMode(false);
    updateDraft(id, { content: editedContent, actionItems, customDetectedItems, hiddenDetectedIds });
    showToast('논의 내용이 저장되었습니다.', 'success');
  };

  const handleContentCancel = () => {
    const draft = readDraft(id);
    setEditedContent(draft?.content ?? doc?.content ?? '');
    setContentEditMode(false);
  };

  const startActionItemEdit = (index) => {
    const item = actionItems[index];
    setActionItemEditIndex(index);
    setActionItemDraft({
      title: item?.title || '',
      assignee: item?.assignee || '',
      dueDate: item?.dueDate || '',
    });
  };

  const saveActionItemEdit = () => {
    if (actionItemEditIndex === null) return;
    const updated = [...actionItems];
    updated[actionItemEditIndex] = {
      ...updated[actionItemEditIndex],
      title: actionItemDraft.title.trim(),
      assignee: actionItemDraft.assignee.trim(),
      dueDate: actionItemDraft.dueDate,
    };
    setActionItems(updated);
    setActionItemEditIndex(null);
    setActionItemDraft({ title: '', assignee: '', dueDate: '' });
    updateDraft(id, { content: editedContent, actionItems: updated, customDetectedItems, hiddenDetectedIds });
    showToast('액션 아이템이 저장되었습니다.', 'success');
  };

  const cancelActionItemEdit = () => {
    setActionItemEditIndex(null);
    setActionItemDraft({ title: '', assignee: '', dueDate: '' });
  };

  const startDetectedItemEdit = (item) => {
    // Open drawer and start inline edit at the item's position
    setEditingDetectedId(item.id);
    setEditingDetectedDraft({
      id: item.custom ? item.id : null,
      sourceId: item.custom ? item.sourceId || null : item.id,
      type: item.type || '',
      value: item.value || '',
      masked: item.masked || '',
      level: item.level || '원본유지',
    });
    setIsDetectedDrawerOpen(true);
    // scroll drawer to the item after it opens
    setTimeout(() => {
      const el = document.getElementById(`detected-item-${item.id}`);
      if (el && typeof el.scrollIntoView === 'function') el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, 200);
  };

  const resetDetectedDraft = () => {
    setCustomDetectedDraft({
      id: null,
      sourceId: null,
      type: '',
      value: '',
      masked: '',
      level: '원본유지',
    });
  };
  const generateMasked = (value, level) => {
    if (!value) return '';
    if (level === '완전삭제') return '';
    if (level === '가명처리') {
      const words = value.split(/\s+/).filter(Boolean);
      if (words.length >= 2) return `${words[0]} ${words[1][0]}***`;
      return `${value[0]}***`;
    }
    return value;
  };

  const saveDetectedItem = () => {
    const normalizedType = customDetectedDraft.type.trim();
    const normalizedValue = customDetectedDraft.value.trim();
    const normalizedMasked = (customDetectedDraft.masked || '').trim();

    if (!normalizedType || !normalizedValue) {
      showToast('탐지 항목은 유형과 원본 값을 입력해야 합니다.', 'error');
      return;
    }

    const maskedToUse = normalizedMasked || generateMasked(normalizedValue, customDetectedDraft.level || '원본유지');

    const nextItem = {
      id: customDetectedDraft.id || `custom-detected-${Date.now()}`,
      sourceId: customDetectedDraft.sourceId,
      type: normalizedType,
      value: normalizedValue,
      masked: maskedToUse,
      level: customDetectedDraft.level || '원본유지',
      custom: true,
    };

    const updated = customDetectedDraft.id
      ? customDetectedItems.map((item) => (item.id === customDetectedDraft.id ? nextItem : item))
      : [...customDetectedItems, nextItem];

    const nextHidden = customDetectedDraft.sourceId
      ? hiddenDetectedIds.filter((hiddenId) => hiddenId !== customDetectedDraft.sourceId)
      : hiddenDetectedIds;

    setCustomDetectedItems(updated);
    setHiddenDetectedIds(nextHidden);

    // Recompute masked content so the discussion view reflects the new detected items
    const overriddenBaseIds = new Set(updated.filter((item) => item.sourceId).map((item) => item.sourceId));
    const baseDetected = detectedItems.filter((item) => !nextHidden.includes(item.id) && !overriddenBaseIds.has(item.id));
    const allDetected = [...baseDetected, ...updated].filter(it => it.value);
    const src = editedContent || doc?.content || '';
    const escapeRegExp = (s) => String(s).replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
    const itemsByValue = [...allDetected].sort((a, b) => b.value.length - a.value.length);
    let maskedText = src;
    for (const it of itemsByValue) {
      const pattern = new RegExp(escapeRegExp(it.value), 'g');
      const replacement = (it.level === '완전삭제' || !it.masked) ? '' : it.masked;
      maskedText = maskedText.replace(pattern, replacement);
    }

    setEditedContent(maskedText);
    updateDraft(id, { content: maskedText, actionItems, customDetectedItems: updated, hiddenDetectedIds: nextHidden });
    resetDetectedDraft();
    showToast('탐지 항목이 저장되었습니다.', 'success');
  };

  const cancelInlineEdit = () => {
    setEditingDetectedId(null);
    setEditingDetectedDraft({ id: null, sourceId: null, type: '', value: '', masked: '', level: '원본유지' });
  };

  const inlineSaveDetected = (originalItem) => {
    const normalizedType = (editingDetectedDraft.type || '').trim();
    const normalizedValue = (editingDetectedDraft.value || '').trim();
    const maskedProvided = (editingDetectedDraft.masked || '').trim();
    if (!normalizedType || !normalizedValue) { showToast('유형과 원본 값을 입력하세요.', 'error'); return; }

    const maskedToUse = maskedProvided || generateMasked(normalizedValue, editingDetectedDraft.level || '원본유지');

    const nextItem = {
      id: editingDetectedDraft.id || `custom-detected-${Date.now()}`,
      sourceId: editingDetectedDraft.sourceId,
      type: normalizedType,
      value: normalizedValue,
      masked: maskedToUse,
      level: editingDetectedDraft.level || '원본유지',
      custom: true,
    };

    const updated = editingDetectedDraft.id
      ? customDetectedItems.map((it) => (it.id === editingDetectedDraft.id ? nextItem : it))
      : [...customDetectedItems, nextItem];

    const nextHidden = editingDetectedDraft.sourceId
      ? hiddenDetectedIds.filter((hiddenId) => hiddenId !== editingDetectedDraft.sourceId)
      : hiddenDetectedIds;

    setCustomDetectedItems(updated);
    setHiddenDetectedIds(nextHidden);

    // recompute masked content
    const overriddenBaseIds = new Set(updated.filter((item) => item.sourceId).map((item) => item.sourceId));
    const baseDetected = detectedItems.filter((item) => !nextHidden.includes(item.id) && !overriddenBaseIds.has(item.id));
    const allDetected = [...baseDetected, ...updated].filter(it => it.value);
    const src = editedContent || doc?.content || '';
    const escapeRegExp = (s) => String(s).replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
    const itemsByValue = [...allDetected].sort((a, b) => b.value.length - a.value.length);
    let maskedText = src;
    for (const it of itemsByValue) {
      const pattern = new RegExp(escapeRegExp(it.value), 'g');
      const replacement = (it.level === '완전삭제' || !it.masked) ? '' : it.masked;
      maskedText = maskedText.replace(pattern, replacement);
    }
    setEditedContent(maskedText);
    updateDraft(id, { content: maskedText, actionItems, customDetectedItems: updated, hiddenDetectedIds: nextHidden });
    setEditingDetectedId(null);
    setEditingDetectedDraft({ id: null, sourceId: null, type: '', value: '', masked: '', level: '원본유지' });
    showToast('탐지 항목이 저장되었습니다.', 'success');
  };

  const deleteDetectedItem = (itemId) => {
    const target = [...customDetectedItems, ...detectedItems].find((item) => item.id === itemId);
    if (!target) return;

    if (target.custom) {
      const updatedCustom = customDetectedItems.filter((item) => item.id !== itemId);
      setCustomDetectedItems(updatedCustom);
      const nextHidden = target.sourceId
        ? hiddenDetectedIds.filter((hiddenId) => hiddenId !== target.sourceId)
        : hiddenDetectedIds;
      setHiddenDetectedIds(nextHidden);

      // Recompute masked content after deletion
      const overriddenBaseIds = new Set(updatedCustom.filter((item) => item.sourceId).map((item) => item.sourceId));
      const baseDetected = detectedItems.filter((item) => !nextHidden.includes(item.id) && !overriddenBaseIds.has(item.id));
      const allDetected = [...baseDetected, ...updatedCustom].filter(it => it.value);
      const src = editedContent || doc?.content || '';
      const escapeRegExp = (s) => String(s).replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
      const itemsByValue = [...allDetected].sort((a, b) => b.value.length - a.value.length);
      let maskedText = src;
      for (const it of itemsByValue) {
        const pattern = new RegExp(escapeRegExp(it.value), 'g');
        const replacement = (it.level === '완전삭제' || !it.masked) ? '' : it.masked;
        maskedText = maskedText.replace(pattern, replacement);
      }

      setEditedContent(maskedText);
      updateDraft(id, { content: maskedText, actionItems, customDetectedItems: updatedCustom, hiddenDetectedIds: nextHidden });
    } else {
      const nextHidden = hiddenDetectedIds.includes(itemId) ? hiddenDetectedIds : [...hiddenDetectedIds, itemId];
      setHiddenDetectedIds(nextHidden);
      // If hiding a base detected item, recompute masked content
      const overriddenBaseIds2 = new Set(customDetectedItems.filter((item) => item.sourceId).map((item) => item.sourceId));
      const baseDetected2 = detectedItems.filter((item) => !nextHidden.includes(item.id) && !overriddenBaseIds2.has(item.id));
      const allDetected2 = [...baseDetected2, ...customDetectedItems].filter(it => it.value);
      const src2 = editedContent || doc?.content || '';
      const escapeRegExp2 = (s) => String(s).replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
      const itemsByValue2 = [...allDetected2].sort((a, b) => b.value.length - a.value.length);
      let maskedText2 = src2;
      for (const it of itemsByValue2) {
        const pattern = new RegExp(escapeRegExp2(it.value), 'g');
        const replacement = (it.level === '완전삭제' || !it.masked) ? '' : it.masked;
        maskedText2 = maskedText2.replace(pattern, replacement);
      }
      setEditedContent(maskedText2);
      updateDraft(id, { content: maskedText2, actionItems, customDetectedItems, hiddenDetectedIds: nextHidden });
    }

    if (customDetectedDraft.id === itemId) {
      resetDetectedDraft();
    }
    showToast('탐지 항목이 삭제되었습니다.', 'success');
  };

  const handleDetectedDelete = (item) => {
    // Custom items: delete directly
    if (item.custom) {
      deleteDetectedItem(item.id);
      return;
    }

    // For base detected items, offer hide or create filter
    const makeFilter = window.confirm('이 항목을 필터로 등록하시겠습니까? 확인=필터 등록, 취소=단순 숨기기');
    if (!makeFilter) {
      // hide
      const nextHidden = hiddenDetectedIds.includes(item.id) ? hiddenDetectedIds : [...hiddenDetectedIds, item.id];
      setHiddenDetectedIds(nextHidden);

      // recompute masked content
      const overriddenBaseIds2 = new Set(customDetectedItems.filter((it) => it.sourceId).map((it) => it.sourceId));
      const baseDetected2 = detectedItems.filter((it) => !nextHidden.includes(it.id) && !overriddenBaseIds2.has(it.id));
      const allDetected2 = [...baseDetected2, ...customDetectedItems].filter(it => it.value);
      const src2 = editedContent || doc?.content || '';
      const escapeRegExp2 = (s) => String(s).replace(/[-\\/\\^$*+?.()|[\\]{}]/g, '\\$&');
      const itemsByValue2 = [...allDetected2].sort((a, b) => b.value.length - a.value.length);
      let maskedText2 = src2;
      for (const it of itemsByValue2) {
        const pattern = new RegExp(escapeRegExp2(it.value), 'g');
        const replacement = (it.level === '완전삭제' || !it.masked) ? '' : it.masked;
        maskedText2 = maskedText2.replace(pattern, replacement);
      }
      setEditedContent(maskedText2);
      updateDraft(id, { content: maskedText2, actionItems, customDetectedItems, hiddenDetectedIds: nextHidden });
      showToast('항목을 숨겼습니다.', 'success');
      return;
    }

    // prompt for filter value
    const value = window.prompt('필터로 등록할 값을 입력하세요 (예: 홍길동)');
    if (!value) {
      showToast('필터 등록이 취소되었습니다.', 'info');
      return;
    }

    const newCustom = {
      id: `custom-detected-${Date.now()}`,
      sourceId: item.id,
      type: item.type,
      value: value,
      masked: '***',
      level: maskingLevel || '원본유지',
      custom: true,
    };
    const updatedCustom = [...customDetectedItems, newCustom];
    const nextHidden = hiddenDetectedIds.includes(item.id) ? hiddenDetectedIds : [...hiddenDetectedIds, item.id];
    setCustomDetectedItems(updatedCustom);
    setHiddenDetectedIds(nextHidden);

    // recompute masked content
    const overriddenBaseIds = new Set(updatedCustom.filter((it) => it.sourceId).map((it) => it.sourceId));
    const baseDetected = detectedItems.filter((it) => !nextHidden.includes(it.id) && !overriddenBaseIds.has(it.id));
    const allDetected = [...baseDetected, ...updatedCustom].filter(it => it.value);
    const src = editedContent || doc?.content || '';
    const escapeRegExp = (s) => String(s).replace(/[-\\/\\^$*+?.()|[\\]{}]/g, '\\$&');
    const itemsByValue = [...allDetected].sort((a, b) => b.value.length - a.value.length);
    let maskedText = src;
    for (const it of itemsByValue) {
      const pattern = new RegExp(escapeRegExp(it.value), 'g');
      const replacement = (it.level === '완전삭제' || !it.masked) ? '' : it.masked;
      maskedText = maskedText.replace(pattern, replacement);
    }
    setEditedContent(maskedText);
    updateDraft(id, { content: maskedText, actionItems, customDetectedItems: updatedCustom, hiddenDetectedIds: nextHidden });
    showToast('필터가 추가되었습니다.', 'success');
  };

  // ── Loading screen ────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="max-w-[860px] mx-auto px-6 py-24 text-center">
        <div className="loading-spinner mx-auto mb-4"></div>
        <p className="font-body-md text-secondary">문서를 불러오고 있습니다...</p>
      </div>
    );
  }

  const domainLabel =
    doc?.domain === 'meeting'    ? '회의록' :
    doc?.domain === 'consulting' ? '상담일지' :
    doc?.domain === 'welfare'    ? '복지활동일지' : '문서';

  // Detected items filtered to only active types
  const overriddenBaseIds = new Set(customDetectedItems.filter((item) => item.sourceId).map((item) => item.sourceId));
  const visibleDetected = [
    ...detectedItems.filter((item) => !hiddenDetectedIds.includes(item.id) && !overriddenBaseIds.has(item.id)),
    ...customDetectedItems,
  ].filter((it) => selectedTypes[it.type] ?? true);

  return (<>
    <main className="max-w-[860px] mx-auto px-6 pt-12 pb-24 md:py-16 space-y-section-gap">

      {/* ── Header ── */}
      <section className="space-y-6">
        <div className="flex flex-col md:flex-row md:justify-between md:items-start gap-4">
          <div className="space-y-2 flex-1">
            <div className="flex items-center gap-2">
              <span className="px-2 py-1 border border-outline-variant rounded text-caption font-caption text-secondary">{domainLabel}</span>
              <span className="text-caption font-caption text-secondary">{doc?.date || new Date().toLocaleDateString('ko-KR')}</span>
            </div>
            <input
              type="text"
              value={editedTitle}
              onChange={(e) => setEditedTitle(e.target.value)}
              className="font-headline-lg-mobile text-headline-lg-mobile md:font-headline-lg md:text-headline-lg text-on-surface bg-transparent border-b border-transparent hover:border-outline-variant focus:border-primary focus:outline-none w-full transition-colors font-extrabold"
            />
          </div>
          <div className="flex flex-wrap gap-2">
            <button onClick={handleCopy} className="flex items-center gap-2 px-4 py-2 border border-outline-variant rounded hover:bg-surface-container-low transition-colors text-label-md font-label-md">
              <span className="material-symbols-outlined text-[18px]">content_copy</span>복사
            </button>
            <button onClick={handleDownload} className="flex items-center gap-2 px-4 py-2 border border-outline-variant rounded hover:bg-surface-container-low transition-colors text-label-md font-label-md">
              <span className="material-symbols-outlined text-[18px]">download</span>다운로드
            </button>
            <button onClick={handleSlackShare} className="flex items-center gap-2 px-4 py-2 border border-outline-variant rounded hover:bg-surface-container-low transition-colors text-label-md font-label-md">
              <span className="material-symbols-outlined text-[18px]">share</span>Slack 공유
            </button>
            
            <Link to="/" className="flex items-center gap-2 px-4 py-2 bg-primary text-on-primary rounded hover:bg-primary-container transition-colors text-label-md font-label-md">
              <span className="material-symbols-outlined text-[18px]">upload</span>새로 업로드
            </Link>
          </div>
        </div>
      </section>

      {/* ── Sub-nav ── */}
      <section className="flex gap-4 border-b border-outline-variant pb-2">
        <Link to={`/graph/${id}`} className="flex items-center gap-2 px-3 py-2 text-primary border border-primary hover:bg-[#eaf1eb] rounded transition-colors text-label-md font-label-md">
          <span className="material-symbols-outlined text-[18px]">hub</span>지식그래프 보기
        </Link>
        <Link to={`/query/${id}`} className="flex items-center gap-2 px-3 py-2 text-primary border border-primary hover:bg-[#eaf1eb] rounded transition-colors text-label-md font-label-md">
          <span className="material-symbols-outlined text-[18px]">auto_awesome</span>AI에게 질문하기
        </Link>
      </section>

      {/* ── Masking Control Panel ── */}
      <section className="border border-outline-variant rounded-lg bg-surface-container-lowest overflow-hidden">

        {/* Header bar */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-outline-variant/60">
          <div className="flex items-center gap-2.5">
            <span className={`material-symbols-outlined text-2xl transition-colors ${isMaskingActive ? 'text-error animate-pulse' : 'text-secondary'}`}>
              {isMaskingActive ? 'admin_panel_settings' : 'lock'}
            </span>
            <div>
              <h3 className="font-body-lg text-base font-extrabold text-on-surface flex items-center gap-2">
                개인정보 마스킹 필터
                {isMaskingActive && (
                  <span className="px-1.5 py-0.5 rounded-full bg-error/15 text-[10px] text-error font-bold">ACTIVE</span>
                )}
              </h3>
              <p className="text-[11px] text-secondary">회의록 내 민감 정보 유출을 방지합니다. 유형별 선택 적용 가능.</p>
            </div>
          </div>

          <div className="flex items-center">
            <button onClick={() => setIsDetectedDrawerOpen(true)} className="mr-3 px-3 py-1.5 rounded border border-outline-variant text-label-md font-label-md hover:bg-surface-container-low transition-colors">
              <span className="material-symbols-outlined text-[16px]">manage_search</span> 탐지 목록
            </button>
            <button
              onClick={handleMaskToggle}
              disabled={maskLoading}
              className={`px-4 py-2 rounded text-label-md font-bold transition-all flex items-center gap-1.5 min-w-[130px] justify-center ${
                isMaskingActive
                  ? 'bg-outline-variant text-on-surface hover:bg-outline-variant/80'
                  : 'bg-error text-white hover:bg-error/90 shadow-sm'
              }`}
            >
              {maskLoading ? (
                <div className="w-4 h-4 border-2 border-current/30 border-t-current rounded-full animate-spin" />
              ) : (
                <span className="material-symbols-outlined text-[18px]">{isMaskingActive ? 'lock_open' : 'lock'}</span>
              )}
              {isMaskingActive ? '마스킹 해제' : '마스킹 적용'}
            </button>
          </div>
        </div>

        {/* ── Type selector checkboxes (always visible) ── */}
        <div className="px-5 py-4 border-b border-outline-variant/40 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-secondary flex items-center gap-1">
              <span className="material-symbols-outlined text-[13px]">checklist</span>
              마스킹 대상 유형 선택 ({activeTypesCount}/{ALL_MASK_TYPES.length})
            </span>
            <button
              onClick={toggleAll}
              className="text-[11px] text-primary font-bold hover:underline transition-colors"
            >
              {activeTypesCount === ALL_MASK_TYPES.length ? '전체 해제' : '전체 선택'}
            </button>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2">
            {ALL_MASK_TYPES.map(type => {
              const checked = selectedTypes[type.key];
              const count = visibleDetected.filter(d => d.type === type.key).length;
              return (
                <button
                  key={type.key}
                  onClick={() => handleTypeToggle(type.key)}
                  className={`group flex items-center gap-2 px-3 py-2 rounded-md border text-left transition-all duration-150 text-[12px] font-medium ${
                    checked
                      ? 'border-primary/60 bg-primary/5 text-on-surface'
                      : 'border-outline-variant/50 bg-surface text-secondary hover:border-outline-variant'
                  }`}
                >
                  {/* Custom checkbox */}
                  <span className={`flex-shrink-0 w-4 h-4 rounded border-2 flex items-center justify-center transition-all ${
                    checked ? 'bg-primary border-primary' : 'border-outline-variant'
                  }`}>
                    {checked && <span className="material-symbols-outlined text-white text-[11px] font-black">check</span>}
                  </span>
                  <span className={`material-symbols-outlined text-[14px] ${checked ? type.color : 'text-outline'}`}>
                    {type.icon}
                  </span>
                  <span className="flex-1 leading-tight">{type.label}</span>
                  {count > 0 && (
                    <span className="ml-auto flex-shrink-0 w-4 h-4 rounded-full bg-error/15 text-error text-[9px] font-black flex items-center justify-center">
                      {count}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* ── Level + Detected list (visible when active) ── */}
        {isMaskingActive && (
          <div className="px-5 py-4 flex flex-col md:flex-row gap-5 items-start">
            {/* Level toggle */}
            <div className="space-y-2 flex-shrink-0">
              <span className="text-[11px] font-bold text-secondary flex items-center gap-1">
                <span className="material-symbols-outlined text-[13px]">tune</span>
                마스킹 레벨
              </span>
              <div className="flex border border-outline-variant rounded p-0.5 bg-surface-container-low">
                {[
                  { val: 'full',      label: '완전삭제', activeClass: 'bg-white text-error shadow-sm' },
                  { val: 'pseudonym', label: '가명처리',  activeClass: 'bg-white text-primary shadow-sm' },
                  { val: 'original',  label: '원본유지', activeClass: 'bg-white text-secondary shadow-sm' },
                ].map(({ val, label, activeClass }) => (
                  <button
                    key={val}
                    onClick={() => handleLevelChange(val)}
                    className={`px-3 py-1.5 rounded text-xs font-bold transition-all ${
                      maskingLevel === val ? activeClass : 'text-secondary hover:text-on-surface'
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>

            {/* Detected list */}
            <div className="flex-1 bg-surface p-3.5 border border-outline-variant rounded-md space-y-2 min-w-0">
              <span className="text-[11px] font-bold text-secondary flex items-center gap-1.5">
                <span className="material-symbols-outlined text-[13px]">fingerprint</span>
                탐지된 개인정보 ({visibleDetected.length}건)
              </span>
              {visibleDetected.length === 0 ? (
                <p className="text-[11px] text-secondary italic">선택된 유형에서 탐지된 항목이 없습니다.</p>
              ) : (
                <div className="flex flex-wrap gap-1.5 max-h-28 overflow-y-auto pr-1">
                  {visibleDetected.map(item => {
                    const typeInfo = ALL_MASK_TYPES.find(t => t.key === item.type);
                    return (
                      <div key={item.id} className="flex items-center gap-1 bg-surface-container px-2 py-1 rounded border border-outline-variant text-[11px]">
                        <span className={`material-symbols-outlined text-[11px] ${typeInfo?.color ?? 'text-secondary'}`}>{typeInfo?.icon ?? 'label'}</span>
                        <span className="text-secondary font-bold">[{item.type}]</span>
                        <span className="text-on-surface">{item.value}</span>
                        <span className="material-symbols-outlined text-[10px] text-outline">arrow_right_alt</span>
                        <span className="text-error font-extrabold">{item.masked}</span>
                        <div className="ml-2 flex gap-1">
                          <button onClick={() => startDetectedItemEdit(item)} className="text-secondary text-[11px] px-2 py-0.5 rounded border border-outline-variant">수정</button>
                          <button onClick={() => handleDetectedDelete(item)} className="text-error text-[11px] px-2 py-0.5 rounded border border-error/30">삭제</button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}
      </section>

      {/* ── Attendees ── */}
      <section className="space-y-4">
        <div className="flex items-center justify-between pb-2 border-b border-outline-variant">
          <h2 className="font-headline-md text-headline-md text-on-surface">참석자</h2>
          <div>
            {!attendeeEditMode ? (
              <button onClick={() => setAttendeeEditMode(true)} className="px-3 py-1 rounded border border-outline-variant text-label-md font-label-md hover:bg-surface-container-low">참석자 수정</button>
            ) : (
              <>
                <button onClick={() => { setAttendeeEditMode(false); updateDraft(id, { content: editedContent, actionItems, customDetectedItems, hiddenDetectedIds }); showToast('참석자가 저장되었습니다.', 'success'); }} className="px-3 py-1 mr-2 rounded bg-primary text-on-primary">저장</button>
                <button onClick={() => { setAttendeeEditMode(false); showToast('참석자 편집 취소', 'info'); }} className="px-3 py-1 rounded border border-outline-variant">취소</button>
              </>
            )}
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          {editedAttendees.length > 0 ? (
            editedAttendees.map((a, i) => (
              <div key={i} className="px-3 py-1.5 border border-outline-variant rounded bg-surface flex items-center gap-2">
                <span className="material-symbols-outlined text-[18px] text-secondary">person</span>
                <span className="font-body-md text-body-md">{a}</span>
                {attendeeEditMode && (
                  <button onClick={() => { const next = editedAttendees.filter((_, idx) => idx !== i); setEditedAttendees(next); updateDraft(id, { content: editedContent, actionItems, customDetectedItems, hiddenDetectedIds }); }} className="ml-2 text-error">삭제</button>
                )}
              </div>
            ))
          ) : (
            <p className="text-secondary text-sm">기록된 참석자가 없습니다.</p>
          )}
          {attendeeEditMode && (
            <div className="flex items-center gap-2">
              <input value={newAttendeeInput} onChange={(e) => setNewAttendeeInput(e.target.value)} placeholder="새 참석자 이름" className="px-3 py-1 border border-outline-variant rounded" />
              <button onClick={() => {
                if (newAttendeeInput.trim()) {
                  setEditedAttendees(prev => {
                    const next = [...prev, newAttendeeInput.trim()];
                    updateDraft(id, { content: editedContent, actionItems, customDetectedItems, hiddenDetectedIds });
                    setNewAttendeeInput('');
                    return next;
                  });
                }
              }} className="px-3 py-1 rounded bg-primary text-on-primary">추가</button>
            </div>
          )}
        </div>
      </section>

      {/* ── Content ── */}
      <section className="space-y-4">
        <div className="flex justify-between items-center pb-2 border-b border-outline-variant gap-3">
          <h2 className="font-headline-md text-headline-md text-on-surface">논의 내용</h2>
          <div className="flex items-center gap-2 flex-wrap justify-end">
            <span className="font-caption text-caption text-outline italic">
              {isMaskingActive ? '마스킹 적용 중 (읽기 전용)' : contentEditMode ? '수정 중' : '읽기 전용'}
            </span>
            {!isMaskingActive && !contentEditMode && (
              <button onClick={() => setContentEditMode(true)} className="px-3 py-1.5 rounded border border-outline-variant text-label-md font-label-md hover:bg-surface-container-low transition-colors">
                수정
              </button>
            )}
            {!isMaskingActive && contentEditMode && (
              <>
                <button onClick={handleContentSave} className="px-3 py-1.5 rounded bg-primary text-on-primary text-label-md font-label-md hover:bg-primary-container transition-colors">
                  저장
                </button>
                <button onClick={handleContentCancel} className="px-3 py-1.5 rounded border border-outline-variant text-label-md font-label-md hover:bg-surface-container-low transition-colors">
                  취소
                </button>
              </>
            )}
          </div>
        </div>

        {isMaskingActive ? (
          <div className="border border-outline-variant rounded bg-[#fcf9f9] p-6 font-body-lg text-body-lg text-on-surface leading-relaxed min-h-[300px] shadow-inner select-none">
            {renderMaskedHtml()}
          </div>
        ) : contentEditMode ? (
          <textarea
            value={editedContent}
            onChange={(e) => setEditedContent(e.target.value)}
            className="w-full min-h-[320px] border border-outline-variant rounded bg-surface p-6 hover:bg-surface-container-low focus:bg-surface-container-low transition-colors font-body-lg text-body-lg text-on-surface leading-relaxed outline-none resize-y"
          />
        ) : (
          <div
            ref={contentRef}
            className="border border-outline-variant rounded bg-surface p-6 hover:bg-surface-container-low focus:bg-surface-container-low transition-colors cursor-text font-body-lg text-body-lg text-on-surface leading-relaxed outline-none min-h-[300px]"
          >
            {editedContent}
          </div>
        )}
      </section>

      {/* ── Action Items ── */}
      <section className="space-y-4">
        <div className="flex justify-between items-center pb-2 border-b border-outline-variant gap-3">
          <h2 className="font-headline-md text-headline-md text-on-surface">액션 아이템</h2>
          <div className="flex items-center gap-3">
            <span className="font-caption text-caption text-outline italic">카드별로 수정할 수 있습니다.</span>
            <button onClick={() => setShowAddActionForm(true)} className="px-3 py-1 rounded border border-outline-variant">액션 아이템 추가</button>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {actionItems.length > 0 ? (
            actionItems.map((item, index) => (
              <div
                key={index}
                className={`border border-outline-variant rounded p-4 bg-surface space-y-4 hover:border-primary transition-colors ${item.completed ? 'opacity-60' : ''}`}
              >
                {actionItemEditIndex === index ? (
                  <div className="space-y-3">
                    <input
                      value={actionItemDraft.title}
                      onChange={(e) => setActionItemDraft((prev) => ({ ...prev, title: e.target.value }))}
                      className="w-full px-3 py-2 border border-outline-variant rounded bg-surface-container-lowest focus:border-primary focus:outline-none"
                      placeholder="할 일"
                    />
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      <input
                        value={actionItemDraft.assignee}
                        onChange={(e) => setActionItemDraft((prev) => ({ ...prev, assignee: e.target.value }))}
                        className="w-full px-3 py-2 border border-outline-variant rounded bg-surface-container-lowest focus:border-primary focus:outline-none"
                        placeholder="담당자"
                      />
                      <input
                        type="date"
                        value={actionItemDraft.dueDate}
                        onChange={(e) => setActionItemDraft((prev) => ({ ...prev, dueDate: e.target.value }))}
                        className="w-full px-3 py-2 border border-outline-variant rounded bg-surface-container-lowest focus:border-primary focus:outline-none"
                      />
                    </div>
                    <div className="flex justify-end gap-2">
                      <button onClick={cancelActionItemEdit} className="px-3 py-1.5 rounded border border-outline-variant text-label-md font-label-md hover:bg-surface-container-low transition-colors">
                        취소
                      </button>
                      <button onClick={saveActionItemEdit} className="px-3 py-1.5 rounded bg-primary text-on-primary text-label-md font-label-md hover:bg-primary-container transition-colors">
                        저장
                      </button>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="flex items-start gap-3">
                      <input
                        type="checkbox"
                        checked={item.completed || false}
                        onChange={() => handleCheckboxChange(index)}
                        className="mt-1 w-5 h-5 border-outline-variant rounded text-primary focus:ring-primary bg-transparent cursor-pointer"
                      />
                      <div className="space-y-1 flex-1">
                        <p className={`font-body-md text-body-md font-medium text-on-surface ${item.completed ? 'line-through text-secondary' : ''}`}>
                          {item.title}
                        </p>
                        <div className="flex flex-wrap gap-2 pt-2">
                          {item.assignee && (
                            <span className="px-2 py-1 bg-surface-container rounded text-caption font-caption flex items-center gap-1 border border-outline-variant text-secondary">
                              <span className="material-symbols-outlined text-[14px]">person</span>{item.assignee}
                            </span>
                          )}
                          {item.dueDate && (
                            <span className={`px-2 py-1 bg-surface-container rounded text-caption font-caption flex items-center gap-1 border border-outline-variant ${item.completed ? 'text-secondary' : 'text-error'}`}>
                              <span className="material-symbols-outlined text-[14px]">calendar_today</span>{item.dueDate}
                            </span>
                          )}
                          {item.completed && (
                            <span className="px-2 py-1 bg-surface-container rounded text-caption font-caption flex items-center gap-1 border border-outline-variant text-secondary">
                              <span className="material-symbols-outlined text-[14px]">check_circle</span>완료
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="pt-2 border-t border-outline-variant flex justify-between gap-2 flex-wrap">
                      <button
                        onClick={() => startActionItemEdit(index)}
                        disabled={item.completed}
                        className={`flex items-center gap-1 text-label-md font-label-md px-2 py-1 rounded transition-colors ${
                          item.completed
                            ? 'text-outline cursor-not-allowed opacity-50'
                            : 'text-secondary hover:bg-surface-container-low'
                        }`}
                      >
                        <span className="material-symbols-outlined text-[16px]">edit</span>수정
                      </button>
                      {!item.completed && (
                        <button
                          onClick={() => handleCalendarAdd(item)}
                          className="flex items-center gap-1 text-label-md font-label-md text-primary hover:bg-surface-container-low px-2 py-1 rounded transition-colors"
                        >
                          <span className="material-symbols-outlined text-[16px]">event_available</span>Google Calendar 등록
                        </button>
                      )}
                    </div>
                  </>
                )}
              </div>
            ))
          ) : (
            <p className="text-secondary text-sm col-span-2">액션 아이템이 없습니다.</p>
          )}
        </div>
      </section>

      {isDetectedDrawerOpen && (
        <div className="fixed inset-0 z-[80] flex justify-end">
          <button
            aria-label="탐지 목록 닫기"
            className="absolute inset-0 bg-black/35 backdrop-blur-[1px]"
            onClick={() => setIsDetectedDrawerOpen(false)}
          />
          <aside className="relative z-[81] h-full w-full max-w-[420px] bg-surface border-l border-outline-variant shadow-2xl flex flex-col">
            <div className="p-5 border-b border-outline-variant flex items-start justify-between gap-4">
              <div>
                <p className="text-[11px] uppercase tracking-[0.22em] text-secondary font-bold">Detected</p>
                <h3 className="text-lg font-extrabold text-on-surface mt-1">탐지된 개인정보 목록</h3>
                <p className="text-[11px] text-secondary mt-1">마스킹 상태와 원본 값을 함께 확인할 수 있습니다.</p>
              </div>
              <button onClick={() => setIsDetectedDrawerOpen(false)} className="w-9 h-9 rounded-full border border-outline-variant hover:bg-surface-container-low transition-colors flex items-center justify-center">
                <span className="material-symbols-outlined text-[18px]">close</span>
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-5 space-y-3">
              <div className="rounded-lg border border-primary/20 bg-primary/5 p-4 space-y-3">
                <div className="flex items-center justify-between gap-2">
                  <div>
                    <h4 className="font-bold text-on-surface">탐지 항목 추가</h4>
                  </div>
                </div>
                <div className="grid gap-2">
                  <select
                    value={customDetectedDraft.type}
                    onChange={(e) => setCustomDetectedDraft((prev) => ({ ...prev, type: e.target.value }))}
                    className="w-full px-3 py-2 border border-outline-variant rounded bg-surface-container-lowest focus:border-primary focus:outline-none text-sm"
                  >
                    <option value="">유형 선택</option>
                    {ALL_MASK_TYPES.map(t => (<option key={t.key} value={t.key}>{t.label}</option>))}
                  </select>
                  <input
                    value={customDetectedDraft.value}
                    onChange={(e) => setCustomDetectedDraft((prev) => ({ ...prev, value: e.target.value }))}
                    className="w-full px-3 py-2 border border-outline-variant rounded bg-surface-container-lowest focus:border-primary focus:outline-none text-sm"
                    placeholder="원본 값"
                  />
                  <p className="text-[11px] text-secondary italic">마스킹 결과는 원본값과 선택한 처리 수준에 따라 자동 생성됩니다.</p>
                  <div className="flex gap-2 flex-wrap">
                    {['완전삭제', '가명처리', '원본유지'].map((level) => (
                      <button
                        key={level}
                        onClick={() => setCustomDetectedDraft((prev) => ({ ...prev, level }))}
                        className={`px-3 py-1.5 rounded border text-[11px] font-bold transition-colors ${
                          customDetectedDraft.level === level
                            ? 'border-primary bg-primary/10 text-primary'
                            : 'border-outline-variant text-secondary hover:bg-surface-container-low'
                        }`}
                      >
                        {level}
                      </button>
                    ))}
                  </div>
                  <div className="flex justify-end gap-2 pt-1">
                    <button onClick={resetDetectedDraft} className="px-3 py-1.5 rounded border border-outline-variant text-label-md font-label-md hover:bg-surface-container-low transition-colors">초기화</button>
                    <button onClick={saveDetectedItem} className="px-3 py-1.5 rounded bg-primary text-on-primary text-label-md font-label-md hover:bg-primary-container transition-colors">추가</button>
                  </div>
                </div>
              </div>

              {visibleDetected.length === 0 ? (
                <div className="rounded border border-dashed border-outline-variant p-6 text-center text-secondary">
                  선택된 유형에서 탐지된 항목이 없습니다.
                </div>
              ) : (
                visibleDetected.map((item) => {
                  const typeInfo = ALL_MASK_TYPES.find(t => t.key === item.type);
                  if (editingDetectedId === item.id) {
                    return (
                      <div id={`detected-item-${item.id}`} key={item.id} className="rounded-lg border border-outline-variant bg-surface-container-lowest p-4 space-y-2">
                        <div className="flex items-center justify-between gap-3">
                          <div className="flex items-center gap-2 min-w-0">
                            <span className={`material-symbols-outlined text-[18px] ${typeInfo?.color ?? 'text-secondary'}`}>{typeInfo?.icon ?? 'label'}</span>
                            <span className="font-bold text-on-surface truncate">편집: {item.type}</span>
                          </div>
                          <span className="text-[11px] px-2 py-0.5 rounded-full bg-primary/10 text-primary font-bold">{editingDetectedDraft.level || maskingLevel}</span>
                        </div>
                        <div className="grid gap-2 text-[12px]">
                          <div className="flex items-center gap-2">
                            <select value={editingDetectedDraft.type} onChange={(e) => setEditingDetectedDraft(prev => ({ ...prev, type: e.target.value }))} className="px-2 py-1 border border-outline-variant rounded text-sm">
                              <option value="">유형 선택</option>
                              {ALL_MASK_TYPES.map(t => (<option key={t.key} value={t.key}>{t.label}</option>))}
                            </select>
                            <input value={editingDetectedDraft.value} onChange={(e) => setEditingDetectedDraft(prev => ({ ...prev, value: e.target.value }))} className="flex-1 px-2 py-1 border border-outline-variant rounded text-sm" placeholder="원본 값" />
                          </div>
                          <div className="flex gap-2">
                            {['완전삭제', '가명처리', '원본유지'].map(level => (
                              <button key={level} onClick={() => setEditingDetectedDraft(prev => ({ ...prev, level }))} className={`px-2 py-1 rounded text-[11px] ${editingDetectedDraft.level === level ? 'border-primary bg-primary/10 text-primary' : 'border-outline-variant text-secondary'}`}>
                                {level}
                              </button>
                            ))}
                          </div>
                          <div className="flex gap-2 justify-end">
                            <button onClick={() => cancelInlineEdit()} className="px-3 py-1.5 rounded border border-outline-variant text-label-md font-label-md hover:bg-surface-container-low transition-colors">취소</button>
                            <button onClick={() => inlineSaveDetected(item)} className="px-3 py-1.5 rounded bg-primary text-on-primary text-label-md font-label-md hover:bg-primary-container transition-colors">저장</button>
                          </div>
                        </div>
                      </div>
                    );
                  }

                  return (
                    <div key={item.id} className="rounded-lg border border-outline-variant bg-surface-container-lowest p-4 space-y-2">
                      <div className="flex items-center justify-between gap-3">
                        <div className="flex items-center gap-2 min-w-0">
                          <span className={`material-symbols-outlined text-[18px] ${typeInfo?.color ?? 'text-secondary'}`}>{typeInfo?.icon ?? 'label'}</span>
                          <span className="font-bold text-on-surface truncate">{item.type}</span>
                        </div>
                        <span className="text-[11px] px-2 py-0.5 rounded-full bg-primary/10 text-primary font-bold">{item.level || maskingLevel}</span>
                      </div>
                      <div className="grid gap-2 text-[12px]">
                        <div className="rounded bg-surface px-3 py-2 border border-outline-variant">
                          <p className="text-secondary text-[11px] mb-1">원본</p>
                          <p className="break-words text-on-surface">{item.value}</p>
                        </div>
                        <div className="rounded bg-surface px-3 py-2 border border-error/30">
                          <p className="text-secondary text-[11px] mb-1">마스킹 결과</p>
                          <p className="break-words text-error font-extrabold">{item.masked}</p>
                        </div>
                      </div>
                      <div className="flex justify-end gap-2 pt-1">
                        <button
                          onClick={() => startDetectedItemEdit(item)}
                          className="px-3 py-1.5 rounded border border-outline-variant text-label-md font-label-md hover:bg-surface-container-low transition-colors"
                        >
                          수정
                        </button>
                        <button
                          onClick={() => deleteDetectedItem(item.id)}
                          className="px-3 py-1.5 rounded border border-error/30 text-label-md font-label-md text-error hover:bg-error/5 transition-colors"
                        >
                          삭제
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </aside>
        </div>
      )}
    </main>
    {showAddActionForm && (
      <div className="fixed inset-0 z-[90] flex items-center justify-center">
        <div className="absolute inset-0 bg-black/40" onClick={() => setShowAddActionForm(false)} />
        <div className="relative bg-surface w-full max-w-md p-6 rounded-lg shadow-lg z-[91]">
          <h3 className="text-lg font-bold mb-3">액션 아이템 추가</h3>
          <div className="space-y-2">
            <input value={newActionDraft.title} onChange={(e) => setNewActionDraft(prev => ({ ...prev, title: e.target.value }))} placeholder="할 일" className="w-full px-3 py-2 border border-outline-variant rounded" />
            <select value={newActionDraft.assignee} onChange={(e) => setNewActionDraft(prev => ({ ...prev, assignee: e.target.value }))} className="w-full px-3 py-2 border border-outline-variant rounded">
              <option value="">담당자 선택</option>
              {editedAttendees.map((a, idx) => (<option key={idx} value={a}>{a}</option>))}
            </select>
            <input type="date" value={newActionDraft.dueDate} onChange={(e) => setNewActionDraft(prev => ({ ...prev, dueDate: e.target.value }))} className="w-full px-3 py-2 border border-outline-variant rounded" />
          </div>
          <div className="flex justify-end gap-2 mt-4">
            <button onClick={() => { setShowAddActionForm(false); setNewActionDraft({ title: '', assignee: '', dueDate: '' }); }} className="px-3 py-1 rounded border">취소</button>
            <button onClick={() => {
              if (!newActionDraft.title.trim()) { showToast('제목을 입력하세요.', 'error'); return; }
              const next = [...actionItems, { title: newActionDraft.title.trim(), assignee: newActionDraft.assignee, dueDate: newActionDraft.dueDate, completed: false }];
              setActionItems(next);
              updateDraft(id, { content: editedContent, actionItems: next, customDetectedItems, hiddenDetectedIds });
              setNewActionDraft({ title: '', assignee: '', dueDate: '' });
              setShowAddActionForm(false);
              showToast('액션 아이템이 추가되었습니다.', 'success');
            }} className="px-3 py-1 rounded bg-primary text-on-primary">추가</button>
          </div>
        </div>
      </div>
    )}
  </>);
};

export default ResultPage;
