import React, { useState } from 'react';
import { useLanguage } from '../i18n/LanguageContext';
import { useAdminEdit } from '../context/AdminEditContext';
import { X, CheckCircle, Send } from 'lucide-react';

export default function ConsultModal({ isOpen, onClose }) {
  const { t } = useLanguage();
  const { addInquiry } = useAdminEdit();

  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    purposes: [],
    courses: [],
    consent: false
  });
  const [submitted, setSubmitted] = useState(false);

  if (!isOpen) return null;

  const handlePurposeToggle = (val) => {
    setFormData((prev) => ({
      ...prev,
      purposes: prev.purposes.includes(val)
        ? prev.purposes.filter((p) => p !== val)
        : [...prev.purposes, val]
    }));
  };

  const handleCourseToggle = (val) => {
    setFormData((prev) => ({
      ...prev,
      courses: prev.courses.includes(val)
        ? prev.courses.filter((c) => c !== val)
        : [...prev.courses, val]
    }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.name || !formData.phone || !formData.consent) {
      alert('이름, 연락처, 개인정보 수집 동의는 필수입니다.');
      return;
    }

    addInquiry({
      name: formData.name,
      phone: formData.phone,
      purposes: formData.purposes.length > 0 ? formData.purposes : ['일반 상담'],
      courses: formData.courses.length > 0 ? formData.courses : ['미정']
    });

    setSubmitted(true);
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
      <div className="bg-[#141419] border border-amber-500/40 text-white rounded-3xl w-full max-w-lg p-6 sm:p-8 shadow-2xl relative max-h-[90vh] overflow-y-auto">
        <button
          type="button"
          onClick={onClose}
          className="absolute top-5 right-5 text-slate-400 hover:text-white p-1"
        >
          <X className="w-5 h-5" />
        </button>

        {submitted ? (
          <div className="text-center py-8 space-y-4">
            <div className="w-16 h-16 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center mx-auto border border-emerald-500/40">
              <CheckCircle className="w-8 h-8" />
            </div>
            <h3 className="text-2xl font-bold text-white">상담 신청이 접수되었습니다</h3>
            <p className="text-xs sm:text-sm text-slate-300">
              남겨주신 번호로 담당 상담 매니저가 빠른 시간 내에 안내드리겠습니다.
            </p>
            <button
              type="button"
              onClick={() => {
                setSubmitted(false);
                onClose();
              }}
              className="mt-4 px-6 py-2.5 rounded-xl bg-amber-500 text-slate-950 font-bold text-xs"
            >
              확인
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-1">
              <p className="text-xs font-bold tracking-widest text-amber-400 uppercase">
                / Start Your Scene /
              </p>
              <h2 className="text-2xl sm:text-3xl font-black text-white">
                수강료 · 교육 상담
              </h2>
              <p className="text-xs text-slate-400">관심 있는 과정을 알려주세요.</p>
            </div>

            {/* Purposes */}
            <div className="space-y-2">
              <label className="block text-xs font-bold text-slate-300">
                교육목적 <small className="text-slate-500 font-normal">(복수 선택 가능)</small>
              </label>
              <div className="flex flex-wrap gap-2">
                {['취미·입문', '배우 준비', '입시·오디션'].map((p) => {
                  const active = formData.purposes.includes(p);
                  return (
                    <button
                      key={p}
                      type="button"
                      onClick={() => handlePurposeToggle(p)}
                      className={`px-3 py-1.5 rounded-full text-xs font-semibold transition cursor-pointer ${
                        active
                          ? 'bg-amber-500 text-slate-950 shadow'
                          : 'bg-white/5 text-slate-400 hover:text-white border border-white/10'
                      }`}
                    >
                      {p}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Courses */}
            <div className="space-y-2">
              <label className="block text-xs font-bold text-slate-300">
                희망과목 <small className="text-slate-500 font-normal">(복수 선택 가능)</small>
              </label>
              <div className="flex flex-wrap gap-2">
                {['연기 베이직', '카메라 연기', '입시·오디션'].map((c) => {
                  const active = formData.courses.includes(c);
                  return (
                    <button
                      key={c}
                      type="button"
                      onClick={() => handleCourseToggle(c)}
                      className={`px-3 py-1.5 rounded-full text-xs font-semibold transition cursor-pointer ${
                        active
                          ? 'bg-amber-500 text-slate-950 shadow'
                          : 'bg-white/5 text-slate-400 hover:text-white border border-white/10'
                      }`}
                    >
                      {c}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Inputs */}
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">
                  이름
                </label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="이름을 입력해주세요"
                  className="w-full px-3.5 py-2.5 bg-slate-900 border border-slate-700 rounded-xl text-white text-xs focus:outline-none focus:border-amber-400"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">
                  휴대전화
                </label>
                <input
                  type="tel"
                  required
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  placeholder="010-0000-0000"
                  className="w-full px-3.5 py-2.5 bg-slate-900 border border-slate-700 rounded-xl text-white text-xs focus:outline-none focus:border-amber-400"
                />
              </div>
            </div>

            {/* Consent */}
            <div className="pt-2">
              <label className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer">
                <input
                  type="checkbox"
                  required
                  checked={formData.consent}
                  onChange={(e) => setFormData({ ...formData, consent: e.target.checked })}
                  className="w-4 h-4 rounded text-amber-500 focus:ring-0"
                />
                <span>개인정보 수집·이용에 동의합니다.</span>
              </label>
            </div>

            <button
              type="submit"
              className="w-full py-3.5 rounded-xl bg-[#ecc04c] hover:bg-[#ffcf5c] text-slate-950 font-bold text-xs sm:text-sm tracking-tight transition flex items-center justify-center gap-2 shadow-lg"
            >
              <Send className="w-4 h-4" />
              <span>상담 신청하기</span>
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
