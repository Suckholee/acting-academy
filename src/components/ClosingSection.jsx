import React from 'react';
import { useAdminEdit } from '../context/AdminEditContext';
import { useLanguage } from '../i18n/LanguageContext';
import EditableText from './Admin/InlineEditor/EditableText';

export default function ClosingSection({ onOpenConsult }) {
  const { siteDraft } = useAdminEdit();
  const { t } = useLanguage();

  return (
    <section className="py-24 bg-[#0e0e12] text-white px-6 text-center select-none border-b border-white/5">
      <div className="max-w-3xl mx-auto space-y-6">
        <p className="text-xs font-bold tracking-widest text-amber-400 uppercase">
          <EditableText path="closing.eyebrow" value={siteDraft.closing?.eyebrow}>
            / Your Next Scene /
          </EditableText>
        </p>

        <h2 className="text-3xl sm:text-5xl font-black leading-tight text-white">
          <EditableText path="closing.title" value={siteDraft.closing?.title}>
            이제, 당신의 차례입니다.
          </EditableText>
        </h2>

        <div className="pt-4">
          <button
            type="button"
            onClick={onOpenConsult}
            className="px-8 py-4 rounded-full bg-[#ecc04c] hover:bg-[#ffcf5c] text-slate-950 font-black text-sm tracking-tight shadow-xl hover:shadow-amber-500/20 active:scale-95 transition cursor-pointer"
          >
            <EditableText path="closing.cta" value={siteDraft.closing?.cta}>
              {t('나의 첫 수업 상담하기')}
            </EditableText>
          </button>
        </div>
      </div>
    </section>
  );
}
