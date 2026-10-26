import React, { useState } from 'react';
import { useLanguage, supportedLanguages } from '../i18n/LanguageContext';
import { useAdminEdit } from '../context/AdminEditContext';
import EditableText from './Admin/InlineEditor/EditableText';
import { Globe, Shield, Sparkles, ChevronDown } from 'lucide-react';

export default function Header({ onOpenConsult }) {
  const { language, setLanguage, t } = useLanguage();
  const { isAdmin, setIsLoginModalOpen, siteDraft } = useAdminEdit();
  const [langDropdownOpen, setLangDropdownOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const currentLangObj = supportedLanguages.find((l) => l.code === language) || supportedLanguages[0];

  return (
    <header className="sticky top-0 z-50 bg-[#141419]/90 backdrop-blur-md border-b border-white/10 px-4 md:px-8 py-3.5 flex items-center justify-between text-white transition-all select-none">
      {/* Brand Logo */}
      <a href="/" className="flex flex-col text-left group">
        <span className="text-base md:text-lg font-bold tracking-tight text-white group-hover:text-amber-400 transition">
          <EditableText path="header.brandKo" value={siteDraft.header?.brandKo}>
            김정태 <span className="text-amber-400 font-semibold">배우아카데미</span>
          </EditableText>
        </span>
        <span className="text-[10px] md:text-[11px] tracking-wider text-slate-400 font-medium">
          <EditableText path="header.brandEn" value={siteDraft.header?.brandEn}>
            KIM JUNG TAE ACTING ACADEMY
          </EditableText>
        </span>
      </a>

      {/* Desktop Navigation */}
      <nav className="hidden lg:flex items-center gap-6 text-xs font-medium text-slate-300">
        <a href="#about" className="hover:text-amber-400 transition">{t('아카데미 소개')}</a>
        <a href="#programs" className="hover:text-amber-400 transition">{t('교육과정')}</a>
        <a href="#trainers" className="hover:text-amber-400 transition">{t('강사소개')}</a>
        <a href="#reviews" className="hover:text-amber-400 transition">{t('수강후기')}</a>
        <a href="#facilities" className="hover:text-amber-400 transition">{t('시설 안내')}</a>
        <a href="#faq" className="hover:text-amber-400 transition">{t('자주 묻는 질문')}</a>
      </nav>

      {/* Right Controls: Language Selector, Consult Button, Admin Status */}
      <div className="flex items-center gap-3">
        {/* Multilingual Selector */}
        <div className="relative">
          <button
            type="button"
            onClick={() => setLangDropdownOpen(!langDropdownOpen)}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 border border-white/15 text-xs text-slate-200 transition cursor-pointer"
            aria-label="언어 변경"
          >
            <span className="text-sm">{currentLangObj.flag}</span>
            <span className="hidden sm:inline font-semibold">{currentLangObj.label}</span>
            <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
          </button>

          {langDropdownOpen && (
            <div className="absolute right-0 mt-2 w-36 rounded-xl bg-slate-900 border border-amber-500/30 shadow-2xl py-1 z-50 text-xs overflow-hidden animate-fadeIn">
              {supportedLanguages.map((item) => (
                <button
                  key={item.code}
                  onClick={() => {
                    setLanguage(item.code);
                    setLangDropdownOpen(false);
                  }}
                  className={`w-full flex items-center justify-between px-3 py-2 text-left hover:bg-slate-800 transition ${
                    language === item.code ? 'text-amber-400 font-bold bg-amber-500/10' : 'text-slate-300'
                  }`}
                >
                  <span className="flex items-center gap-2">
                    <span>{item.flag}</span>
                    <span>{item.label}</span>
                  </span>
                  {language === item.code && <span className="text-amber-400">✓</span>}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Consultation Button */}
        <button
          type="button"
          onClick={onOpenConsult}
          className="px-4 py-2 rounded-lg bg-[#ecc04c] hover:bg-[#ffcf5c] text-slate-950 font-bold text-xs tracking-tight shadow-md hover:shadow-amber-500/20 active:scale-95 transition cursor-pointer"
        >
          {t('상담 신청')}
        </button>

        {/* Admin Login / Indicator */}
        {!isAdmin && (
          <button
            type="button"
            onClick={() => setIsLoginModalOpen(true)}
            className="p-2 rounded-lg text-slate-400 hover:text-amber-400 hover:bg-white/5 transition"
            title="관리자 로그인"
          >
            <Shield className="w-4 h-4" />
          </button>
        )}

        {/* Mobile menu toggle */}
        <button
          type="button"
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className="lg:hidden p-2 rounded-lg text-slate-300 hover:text-white"
        >
          ☰
        </button>
      </div>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div className="lg:hidden fixed inset-x-0 top-[60px] bg-slate-950/95 border-b border-white/10 p-5 flex flex-col gap-4 text-sm font-medium z-40">
          <a href="#about" onClick={() => setMobileMenuOpen(false)} className="hover:text-amber-400">{t('아카데미 소개')}</a>
          <a href="#programs" onClick={() => setMobileMenuOpen(false)} className="hover:text-amber-400">{t('교육과정')}</a>
          <a href="#trainers" onClick={() => setMobileMenuOpen(false)} className="hover:text-amber-400">{t('강사소개')}</a>
          <a href="#reviews" onClick={() => setMobileMenuOpen(false)} className="hover:text-amber-400">{t('수강후기')}</a>
          <a href="#facilities" onClick={() => setMobileMenuOpen(false)} className="hover:text-amber-400">{t('시설 안내')}</a>
          <a href="#faq" onClick={() => setMobileMenuOpen(false)} className="hover:text-amber-400">{t('자주 묻는 질문')}</a>
        </div>
      )}
    </header>
  );
}
