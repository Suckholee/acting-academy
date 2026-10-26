import React, { useState, useRef, useEffect } from 'react';
import { useAdminEdit } from '../../../context/AdminEditContext';
import { useLanguage } from '../../../i18n/LanguageContext';
import { Edit3 } from 'lucide-react';

export default function EditableText({
  value,
  onChange,
  path,
  as: Component = 'span',
  multiline = false,
  placeholder = '내용을 입력하세요...',
  className = '',
  style = {},
  children,
}) {
  const { isEditMode, showEditGuides, updateSiteField, isPreviewMode } = useAdminEdit();
  const { tr, language } = useLanguage();
  const [isEditing, setIsEditing] = useState(false);
  const rawText = value ?? (typeof children === 'string' ? children : '');
  const [draft, setDraft] = useState(rawText);
  const elementRef = useRef(null);

  useEffect(() => {
    setDraft(value ?? (typeof children === 'string' ? children : ''));
  }, [value, children]);

  // When not in edit mode or in preview mode, render translated text normally
  const activeEditable = isEditMode && !isPreviewMode;

  if (!activeEditable) {
    const displayText = typeof (value ?? children) === 'string' ? tr(value ?? children) : (value ?? children);
    return (
      <Component className={className} style={style}>
        {displayText}
      </Component>
    );
  }

  const handleCommit = (newVal) => {
    const trimmed = (newVal ?? '').trim();
    if (trimmed !== rawText) {
      if (onChange) {
        onChange(trimmed);
      } else if (path) {
        updateSiteField(path, trimmed);
      }
    }
    setIsEditing(false);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Escape') {
      e.preventDefault();
      setDraft(rawText);
      if (elementRef.current) {
        elementRef.current.innerText = rawText;
      }
      setIsEditing(false);
    } else if (e.key === 'Enter' && !multiline) {
      e.preventDefault();
      elementRef.current?.blur();
    } else if (e.key === 'Tab') {
      const editables = Array.from(document.querySelectorAll('[contenteditable="true"]'));
      const idx = editables.indexOf(elementRef.current);
      if (idx !== -1) {
        e.preventDefault();
        elementRef.current?.blur();
        const nextIdx = e.shiftKey ? idx - 1 : idx + 1;
        if (nextIdx >= 0 && nextIdx < editables.length) {
          editables[nextIdx].focus();
        }
      }
    }
  };

  const handleBlur = (e) => {
    const text = e.currentTarget.innerText;
    setDraft(text);
    handleCommit(text);
  };

  // Determine guides styling
  const guideStyle = isEditing
    ? 'outline outline-2 outline-amber-400 bg-amber-400/20 rounded px-1.5 shadow-sm text-amber-200'
    : showEditGuides
      ? 'outline-dashed outline-1 outline-amber-400/70 bg-amber-400/10 hover:outline-2 hover:outline-amber-400 hover:bg-amber-400/20 rounded px-1 cursor-text'
      : 'hover:outline-dashed hover:outline-2 hover:outline-amber-400/80 hover:bg-amber-400/10 rounded px-1 cursor-text';

  return (
    <Component
      ref={elementRef}
      contentEditable={true}
      suppressContentEditableWarning={true}
      onFocus={() => setIsEditing(true)}
      onBlur={handleBlur}
      onKeyDown={handleKeyDown}
      title="클릭하여 글자 바로 수정 (Tab: 다음 필드로 이동, Esc: 취소)"
      className={`relative group inline-block max-w-full transition-all duration-150 ${className} ${guideStyle}`}
      style={style}
    >
      {draft || <span className="opacity-40 italic">{placeholder}</span>}

      {/* Little Edit Pencil Hint */}
      {!isEditing && (
        <span
          className={`absolute -top-3 -right-3 z-30 bg-amber-500 text-slate-950 rounded-full p-0.5 shadow-md pointer-events-none transition-all ${
            showEditGuides
              ? 'opacity-85 group-hover:opacity-100 scale-90 group-hover:scale-110'
              : 'opacity-0 group-hover:opacity-100 scale-75 group-hover:scale-100'
          }`}
        >
          <Edit3 className="w-2.5 h-2.5 stroke-[2.5]" />
        </span>
      )}
    </Component>
  );
}
