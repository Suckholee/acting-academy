import React from 'react';
import { useAdminEdit } from '../context/AdminEditContext';
import { useLanguage } from '../i18n/LanguageContext';
import EditableText from './Admin/InlineEditor/EditableText';
import { Shield } from 'lucide-react';

export default function Footer() {
  const { siteDraft, isAdmin, setIsLoginModalOpen, setIsDrawerOpen } = useAdminEdit();
  const { t } = useLanguage();

  return (
    <footer className="bg-[#0a0a0d] text-slate-400 text-xs px-6 py-16 border-t border-white/5 select-none">
      <div className="max-w-6xl mx-auto space-y-10">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 pb-8 border-b border-white/5">
          <div className="space-y-2">
            <span className="text-base font-bold text-white tracking-tight">
              <EditableText path="header.brandKo" value={siteDraft.header?.brandKo} />
            </span>
            <p className="text-xs text-slate-400">
              <EditableText path="footer.slogan" value={siteDraft.footer?.slogan} />
            </p>
          </div>

          <div className="flex flex-wrap gap-4 text-xs font-medium text-slate-400">
            <a href="#about" className="hover:text-amber-400 transition">{t('아카데미 소개')}</a>
            <a href="#programs" className="hover:text-amber-400 transition">{t('교육과정')}</a>
            <a href="#trainers" className="hover:text-amber-400 transition">{t('강사소개')}</a>
            <a href="#reviews" className="hover:text-amber-400 transition">{t('수강후기')}</a>
            <a href="#facilities" className="hover:text-amber-400 transition">{t('시설 안내')}</a>
            <a href="#faq" className="hover:text-amber-400 transition">{t('자주 묻는 질문')}</a>
          </div>
        </div>

        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 text-[11px] text-slate-500">
          <div className="space-y-1">
            <p>
              <EditableText path="footer.company" value={siteDraft.footer?.company} />
            </p>
            <p>
              <EditableText path="footer.copyright" value={siteDraft.footer?.copyright} />
            </p>
            <p className="text-slate-600">
              <EditableText path="footer.disclaimer" value={siteDraft.footer?.disclaimer} />
            </p>
          </div>

          <div className="flex items-center gap-3">
            {isAdmin ? (
              <button
                type="button"
                onClick={() => setIsDrawerOpen(true)}
                className="text-amber-400 hover:text-amber-300 font-bold flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-500/10 border border-amber-500/30 transition cursor-pointer"
              >
                <Shield className="w-3.5 h-3.5" />
                <span>관리자 모드 실행 중 (관리 서랍 열기)</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={() => setIsLoginModalOpen(true)}
                className="text-slate-500 hover:text-slate-300 flex items-center gap-1 transition cursor-pointer"
              >
                <Shield className="w-3 h-3" />
                <span>관리자 로그인</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </footer>
  );
}
