import React, { useRef, useEffect } from 'react';
import { useAdminEdit } from '../../../context/AdminEditContext';
import { useLanguage, supportedLanguages } from '../../../i18n/LanguageContext';
import {
  Edit3,
  Eye,
  RotateCcw,
  Save,
  CheckCircle2,
  Sliders,
  LogOut,
  Shield,
  Sparkles,
  Globe
} from 'lucide-react';

export default function AdminLiveToolbar() {
  const {
    isAdmin,
    isEditMode,
    setIsEditMode,
    isPreviewMode,
    setIsPreviewMode,
    pendingChanges,
    isSaving,
    saveSuccessNotice,
    saveAllChanges,
    revertAllChanges,
    setIsDrawerOpen,
    setDrawerTab,
    showEditGuides,
    toggleEditGuides,
    logout,
    isFirebaseConfigured,
    firebaseConnected
  } = useAdminEdit();

  const { language, setLanguage } = useLanguage();
  const toolbarRef = useRef(null);

  useEffect(() => {
    if (!isAdmin) {
      if (typeof document !== 'undefined') {
        document.documentElement.style.removeProperty('--admin-toolbar-height');
      }
      return;
    }

    const updateHeight = () => {
      if (toolbarRef.current && typeof document !== 'undefined') {
        const height = toolbarRef.current.offsetHeight;
        document.documentElement.style.setProperty('--admin-toolbar-height', `${height}px`);
      }
    };

    updateHeight();
    window.addEventListener('resize', updateHeight);
    return () => {
      window.removeEventListener('resize', updateHeight);
      if (typeof document !== 'undefined') {
        document.documentElement.style.removeProperty('--admin-toolbar-height');
      }
    };
  }, [isAdmin, isEditMode, pendingChanges.count]);

  if (!isAdmin) return null;

  return (
    <aside
      ref={toolbarRef}
      aria-label="관리자 라이브 편집 툴바"
      className="fixed top-0 left-0 right-0 z-[80] w-full bg-slate-950/95 backdrop-blur-md text-white border-b border-amber-500/30 shadow-2xl px-3 sm:px-6 py-2.5 transition-all select-none"
    >
      <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-3 text-xs">
        {/* Left: Badge & Mode Controls */}
        <div className="flex items-center gap-2 flex-wrap">
          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-amber-500/20 text-amber-400 font-bold border border-amber-500/40">
            <Shield className="w-3.5 h-3.5" />
            <span>KJT 인라인 편집기</span>
          </div>

          {/* Firebase Status Indicator */}
          <div
            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-semibold border ${
              isFirebaseConfigured && firebaseConnected
                ? 'bg-amber-950/80 text-amber-300 border-amber-500/50'
                : 'bg-slate-900 text-slate-400 border-slate-700'
            }`}
            title={
              isFirebaseConfigured
                ? 'Firebase Firestore 클라우드와 실시간 양방향 동기화 중입니다.'
                : 'Firebase 미설정 상태입니다. 로컬 캐시로 안전하게 저장됩니다.'
            }
          >
            <span
              className={`w-2 h-2 rounded-full ${
                isFirebaseConfigured && firebaseConnected ? 'bg-amber-400 animate-pulse' : 'bg-slate-500'
              }`}
            ></span>
            <span>{isFirebaseConfigured ? '🔥 Firebase 연동됨' : '로컬 모드 (Firebase 미연결)'}</span>
          </div>

          {/* Edit Mode Toggle */}
          <button
            type="button"
            onClick={() => {
              setIsEditMode(!isEditMode);
              if (isPreviewMode) setIsPreviewMode(false);
            }}
            className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-md font-semibold transition-all cursor-pointer ${
              isEditMode && !isPreviewMode
                ? 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-sm ring-2 ring-emerald-400/40'
                : 'bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700'
            }`}
          >
            <Edit3 className="w-3.5 h-3.5" />
            <span>{isEditMode && !isPreviewMode ? '편집 모드 ON' : '편집 모드 OFF'}</span>
          </button>

          {/* Guides Toggle */}
          {isEditMode && !isPreviewMode && (
            <button
              type="button"
              onClick={toggleEditGuides}
              className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md font-semibold transition-all cursor-pointer ${
                showEditGuides
                  ? 'bg-amber-400 hover:bg-amber-300 text-slate-950 shadow-md'
                  : 'bg-slate-800 hover:bg-slate-700 text-amber-300 border border-amber-500/40'
              }`}
              title="수정 가능한 글자와 사진 강조 점선 표시"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>{showEditGuides ? '가이드 ON' : '가이드 OFF'}</span>
            </button>
          )}

          {/* Visitor Preview Toggle */}
          <button
            type="button"
            onClick={() => setIsPreviewMode(!isPreviewMode)}
            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md font-semibold transition-all cursor-pointer ${
              isPreviewMode
                ? 'bg-blue-600 text-white shadow-sm ring-2 ring-blue-400/40'
                : 'bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700'
            }`}
            title="방문자 시점 미리보기"
          >
            <Eye className="w-3.5 h-3.5" />
            <span>{isPreviewMode ? '미리보기 중' : '방문자 시점'}</span>
          </button>
        </div>

        {/* Center: Language Switch & Status */}
        <div className="flex items-center gap-2">
          {/* Quick Language Switcher */}
          <div className="inline-flex items-center gap-1 bg-slate-900 border border-slate-800 rounded-lg p-1">
            <Globe className="w-3.5 h-3.5 text-amber-400 ml-1 mr-0.5" />
            {supportedLanguages.map((lang) => (
              <button
                key={lang.code}
                onClick={() => setLanguage(lang.code)}
                className={`px-2 py-0.5 rounded text-[11px] font-medium transition cursor-pointer ${
                  language === lang.code
                    ? 'bg-amber-500 text-slate-950 font-bold shadow'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                {lang.code.toUpperCase()}
              </button>
            ))}
          </div>

          {saveSuccessNotice ? (
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-400 font-medium border border-emerald-500/40 animate-pulse">
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>저장 완료!</span>
            </div>
          ) : pendingChanges.count > 0 ? (
            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-500/20 text-amber-300 font-medium border border-amber-500/40 animate-pulse">
              <span className="w-2 h-2 rounded-full bg-amber-400"></span>
              <span>{pendingChanges.count}건 수정됨</span>
            </div>
          ) : null}
        </div>

        {/* Right: Actions */}
        <div className="flex items-center gap-2 flex-wrap">
          {pendingChanges.count > 0 && (
            <button
              type="button"
              onClick={revertAllChanges}
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition cursor-pointer"
              title="수정사항 취소"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>되돌리기</span>
            </button>
          )}

          {/* Primary Save Button */}
          <button
            type="button"
            onClick={saveAllChanges}
            disabled={isSaving || pendingChanges.count === 0}
            className={`inline-flex items-center gap-1.5 px-3.5 py-1 rounded-md font-bold text-white transition-all shadow-md ${
              pendingChanges.count > 0
                ? 'bg-emerald-600 hover:bg-emerald-500 active:scale-95 cursor-pointer ring-2 ring-emerald-400/50'
                : 'bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-700'
            }`}
          >
            <Save className={`w-3.5 h-3.5 ${isSaving ? 'animate-spin' : ''}`} />
            <span>{isSaving ? '저장 중…' : '지금 화면 저장'}</span>
          </button>

          {/* Management Drawer Opener */}
          <button
            type="button"
            onClick={() => {
              setDrawerTab('inquiries');
              setIsDrawerOpen(true);
            }}
            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold transition shadow cursor-pointer"
            title="상담 신청 목록 및 사이트 설정 관리"
          >
            <Sliders className="w-3.5 h-3.5" />
            <span>관리 서랍</span>
          </button>

          {/* Logout */}
          <button
            type="button"
            onClick={logout}
            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-rose-500/20 hover:bg-rose-500 text-rose-300 hover:text-white border border-rose-500/40 transition cursor-pointer font-bold"
            title="관리자 모드 종료"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>로그아웃</span>
          </button>
        </div>
      </div>
    </aside>
  );
}
