import React, { useState } from 'react';
import { useAdminEdit } from '../../../context/AdminEditContext';
import {
  X,
  MessageSquare,
  Settings,
  Database,
  Download,
  Upload,
  RefreshCw,
  Phone,
  Calendar,
  CheckCircle,
  Clock,
  User
} from 'lucide-react';

export default function AdminDrawer() {
  const {
    isDrawerOpen,
    setIsDrawerOpen,
    drawerTab,
    setDrawerTab,
    inquiries,
    updateInquiryRecord,
    siteDraft,
    updateSiteField,
    exportBackupJSON,
    importBackupJSON,
    resetToFactoryDefaults,
    isFirebaseConfigured
  } = useAdminEdit();

  const [importJsonText, setImportJsonText] = useState('');
  const [activeInquiryId, setActiveInquiryId] = useState(null);

  if (!isDrawerOpen) return null;

  const handleStatusChange = (id, newStatus) => {
    updateInquiryRecord(id, newStatus, undefined);
  };

  const handleMemoChange = (id, newMemo) => {
    updateInquiryRecord(id, undefined, newMemo);
  };

  return (
    <div className="fixed inset-0 z-[90] flex justify-end bg-black/60 backdrop-blur-xs animate-fadeIn select-none">
      <div
        className="w-full max-w-2xl bg-slate-950 text-white h-full shadow-2xl flex flex-col border-l border-amber-500/30 overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-900/80">
          <div className="flex items-center gap-3">
            <span className="p-2 rounded-lg bg-amber-500/20 text-amber-400">
              <Settings className="w-5 h-5" />
            </span>
            <div>
              <h2 className="text-base font-bold text-white">김정태 배우아카데미 관리 패널</h2>
              <p className="text-xs text-slate-400">상담 신청 관리 및 사이트 설정</p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setIsDrawerOpen(false)}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-slate-800 bg-slate-900/40 px-6 gap-2 pt-2">
          <button
            type="button"
            onClick={() => setDrawerTab('inquiries')}
            className={`flex items-center gap-2 pb-3 px-3 text-xs font-bold border-b-2 transition ${
              drawerTab === 'inquiries'
                ? 'border-amber-400 text-amber-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <MessageSquare className="w-4 h-4" />
            <span>상담 신청 내역 ({inquiries.length})</span>
          </button>
          <button
            type="button"
            onClick={() => setDrawerTab('info')}
            className={`flex items-center gap-2 pb-3 px-3 text-xs font-bold border-b-2 transition ${
              drawerTab === 'info'
                ? 'border-amber-400 text-amber-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Settings className="w-4 h-4" />
            <span>기본 정보 관리</span>
          </button>
          <button
            type="button"
            onClick={() => setDrawerTab('backup')}
            className={`flex items-center gap-2 pb-3 px-3 text-xs font-bold border-b-2 transition ${
              drawerTab === 'backup'
                ? 'border-amber-400 text-amber-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Database className="w-4 h-4" />
            <span>데이터 백업 & 복원</span>
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Tab 1: Inquiries */}
          {drawerTab === 'inquiries' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-xs text-slate-400 font-medium">
                  총 {inquiries.length}건의 상담 신청 접수
                </span>
                <span className="text-[11px] px-2.5 py-0.5 rounded-full border border-amber-500/30 bg-amber-500/20 text-amber-300">
                  {isFirebaseConfigured ? '🔥 Firebase 실시간 연동' : '로컬 모드'}
                </span>
              </div>

              {inquiries.length === 0 ? (
                <div className="text-center py-12 text-slate-500 text-xs">
                  접수된 상담 신청이 없습니다.
                </div>
              ) : (
                <div className="space-y-3">
                  {inquiries.map((item) => (
                    <div
                      key={item.id}
                      className="p-4 rounded-xl bg-slate-900 border border-slate-800 hover:border-slate-700 transition space-y-3"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <User className="w-4 h-4 text-amber-400" />
                          <strong className="text-sm font-bold text-white">{item.name}</strong>
                          <span className="text-xs text-slate-400 flex items-center gap-1">
                            <Phone className="w-3 h-3" /> {item.phone}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-[11px] text-slate-500 flex items-center gap-1">
                            <Calendar className="w-3 h-3" /> {item.createdAt}
                          </span>
                          <select
                            value={item.status}
                            onChange={(e) => handleStatusChange(item.id, e.target.value)}
                            className="text-xs bg-slate-800 text-amber-300 font-semibold px-2 py-1 rounded border border-slate-700 focus:outline-none"
                          >
                            <option value="신규">신규</option>
                            <option value="상담중">상담중</option>
                            <option value="상담완료">상담완료</option>
                            <option value="등록완료">등록완료</option>
                            <option value="보류">보류</option>
                          </select>
                        </div>
                      </div>

                      <div className="flex flex-wrap gap-1.5 text-xs">
                        {item.purposes?.map((p, idx) => (
                          <span
                            key={idx}
                            className="px-2 py-0.5 rounded bg-slate-800 text-slate-300 text-[11px]"
                          >
                            목적: {p}
                          </span>
                        ))}
                        {item.courses?.map((c, idx) => (
                          <span
                            key={idx}
                            className="px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 text-[11px] border border-amber-500/30"
                          >
                            과목: {c}
                          </span>
                        ))}
                      </div>

                      <div>
                        <input
                          type="text"
                          defaultValue={item.memo || ''}
                          onBlur={(e) => handleMemoChange(item.id, e.target.value)}
                          placeholder="상담 메모를 입력하세요 (포커스 아웃 시 자동 저장)"
                          className="w-full px-3 py-1.5 bg-slate-950 border border-slate-800 rounded text-xs text-slate-300 placeholder-slate-600 focus:outline-none focus:border-amber-400"
                        />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Tab 2: Info Settings */}
          {drawerTab === 'info' && (
            <div className="space-y-4 text-xs">
              <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 space-y-3">
                <h4 className="font-bold text-amber-400 text-sm">대표 브랜드 명칭</h4>
                <div>
                  <label className="block text-slate-400 mb-1">한글 상호</label>
                  <input
                    type="text"
                    value={siteDraft.header?.brandKo || ''}
                    onChange={(e) => updateSiteField('header.brandKo', e.target.value)}
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded text-white"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 mb-1">영문 상호</label>
                  <input
                    type="text"
                    value={siteDraft.header?.brandEn || ''}
                    onChange={(e) => updateSiteField('header.brandEn', e.target.value)}
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded text-white"
                  />
                </div>
              </div>

              <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 space-y-3">
                <h4 className="font-bold text-amber-400 text-sm">교습비 및 수업 설정</h4>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-slate-400 mb-1">월 교습비</label>
                    <input
                      type="text"
                      value={siteDraft.tuition?.monthlyFee || ''}
                      onChange={(e) => updateSiteField('tuition.monthlyFee', e.target.value)}
                      className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-400 mb-1">주당 횟수</label>
                    <input
                      type="text"
                      value={siteDraft.tuition?.frequency || ''}
                      onChange={(e) => updateSiteField('tuition.frequency', e.target.value)}
                      className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-400 mb-1">회당 시간</label>
                    <input
                      type="text"
                      value={siteDraft.tuition?.duration || ''}
                      onChange={(e) => updateSiteField('tuition.duration', e.target.value)}
                      className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-400 mb-1">반별 정원</label>
                    <input
                      type="text"
                      value={siteDraft.tuition?.capacity || ''}
                      onChange={(e) => updateSiteField('tuition.capacity', e.target.value)}
                      className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded text-white"
                    />
                  </div>
                </div>
              </div>

              <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 space-y-3">
                <h4 className="font-bold text-amber-400 text-sm">학원 위치 및 운영 안내</h4>
                <div>
                  <label className="block text-slate-400 mb-1">위치 타이틀</label>
                  <input
                    type="text"
                    value={siteDraft.tuition?.location || ''}
                    onChange={(e) => updateSiteField('tuition.location', e.target.value)}
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded text-white"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 mb-1">세부 안내</label>
                  <textarea
                    rows={2}
                    value={siteDraft.tuition?.locationDesc || ''}
                    onChange={(e) => updateSiteField('tuition.locationDesc', e.target.value)}
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded text-white"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Tab 3: Backup & Restore */}
          {drawerTab === 'backup' && (
            <div className="space-y-4 text-xs">
              <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 space-y-3">
                <h4 className="font-bold text-amber-400 text-sm flex items-center gap-2">
                  <Download className="w-4 h-4" /> 백업 파일 다운로드
                </h4>
                <p className="text-slate-400">
                  현재 인라인으로 수정한 모든 텍스트, 이미지 경로, 설정 데이터를 JSON 파일로 다운로드합니다.
                </p>
                <button
                  type="button"
                  onClick={exportBackupJSON}
                  className="px-4 py-2 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold transition flex items-center gap-2 cursor-pointer"
                >
                  <Download className="w-4 h-4" />
                  <span>백업 파일 (.json) 내보내기</span>
                </button>
              </div>

              <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 space-y-3">
                <h4 className="font-bold text-amber-400 text-sm flex items-center gap-2">
                  <Upload className="w-4 h-4" /> 백업 데이터 복원
                </h4>
                <p className="text-slate-400">
                  이전에 저장해 둔 JSON 백업 파일의 내용을 복사하여 아래에 붙여넣고 복원할 수 있습니다.
                </p>
                <textarea
                  rows={4}
                  value={importJsonText}
                  onChange={(e) => setImportJsonText(e.target.value)}
                  placeholder="JSON 데이터를 여기에 붙여넣으세요..."
                  className="w-full p-2 bg-slate-800 border border-slate-700 rounded font-mono text-[11px] text-white"
                />
                <button
                  type="button"
                  onClick={() => importBackupJSON(importJsonText)}
                  disabled={!importJsonText.trim()}
                  className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-bold transition flex items-center gap-2 cursor-pointer"
                >
                  <Upload className="w-4 h-4" />
                  <span>백업 데이터로 복원하기</span>
                </button>
              </div>

              <div className="p-4 rounded-xl bg-rose-950/40 border border-rose-500/30 space-y-3">
                <h4 className="font-bold text-rose-400 text-sm flex items-center gap-2">
                  <RefreshCw className="w-4 h-4" /> 초기 공장값 리셋
                </h4>
                <p className="text-rose-200/80">
                  모든 수정을 취소하고 웹사이트를 처음 배포되었던 초기 상태로 완전히 되돌립니다.
                </p>
                <button
                  type="button"
                  onClick={resetToFactoryDefaults}
                  className="px-4 py-2 rounded-lg bg-rose-600 hover:bg-rose-500 text-white font-bold transition flex items-center gap-2 cursor-pointer"
                >
                  <RefreshCw className="w-4 h-4" />
                  <span>공장 초기화 실행</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
