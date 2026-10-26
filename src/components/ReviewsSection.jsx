import React from 'react';
import { useAdminEdit } from '../context/AdminEditContext';
import { useLanguage } from '../i18n/LanguageContext';
import EditableText from './Admin/InlineEditor/EditableText';

export default function ReviewsSection() {
  const { siteDraft } = useAdminEdit();
  const { t } = useLanguage();
  const stats = siteDraft.stats || [];

  return (
    <section id="reviews" className="py-24 bg-[#141419] text-white px-6 border-b border-white/5 select-none">
      <div className="max-w-6xl mx-auto space-y-12">
        <div className="space-y-3 text-center md:text-left">
          <p className="text-xs font-bold tracking-widest text-amber-400 uppercase">
            / Student Reviews /
          </p>
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-black leading-tight">
            망설였던 첫 걸음이,<br />
            <span className="text-[#ecc04c]">현장의 확신이 되었습니다.</span>
          </h2>
        </div>

        {/* Stats Strip */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {stats.map((st, idx) => (
            <div
              key={idx}
              className="p-6 rounded-2xl bg-white/[0.03] border border-white/10 text-center space-y-1.5"
            >
              <div className="text-2xl sm:text-3xl font-black text-amber-400">
                <EditableText path={`stats.${idx}.value`} value={st.value} />
              </div>
              <p className="text-xs text-slate-400 font-medium">
                <EditableText path={`stats.${idx}.label`} value={st.label} />
              </p>
            </div>
          ))}
        </div>

        {/* Review Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="p-6 rounded-2xl bg-slate-900/60 border border-white/10 space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-amber-400 text-sm">★★★★★</span>
              <span className="text-[11px] px-2.5 py-0.5 rounded-full bg-amber-500/10 text-amber-300 font-semibold border border-amber-500/20">
                카메라 연기 전문반
              </span>
            </div>
            <h3 className="text-base sm:text-lg font-bold text-white">
              "모니터링 피드백 3회 만에 카메라 앞 시선 불안을 고쳤습니다."
            </h3>
            <p className="text-xs text-slate-300 font-light leading-relaxed">
              매 수업 4K 카메라 촬영 후 모니터링을 진행하는데, 눈 깜빡임 하나, 턱 끝의 미세한 떨림까지 과학적으로 짚어주셔서 시선이 단단해졌습니다. 첫 숏폼 드라마 주연 캐스팅의 기쁨을 안겨준 곳입니다.
            </p>
            <div className="pt-2 flex items-center justify-between text-xs text-slate-400 border-t border-white/5">
              <span>이준호 수강생 (카메라 연기 4기)</span>
              <span className="text-amber-300 font-medium">숏폼 드라마 주연 확정</span>
            </div>
          </div>

          <div className="p-6 rounded-2xl bg-slate-900/60 border border-white/10 space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-amber-400 text-sm">★★★★★</span>
              <span className="text-[11px] px-2.5 py-0.5 rounded-full bg-amber-500/10 text-amber-300 font-semibold border border-amber-500/20">
                연기 베이직 클래스
              </span>
            </div>
            <h3 className="text-base sm:text-lg font-bold text-white">
              "취미로 시작했던 퇴근 후 2시간, 제 인생의 가장 큰 해방구가 되었습니다."
            </h3>
            <p className="text-xs text-slate-300 font-light leading-relaxed">
              평범한 직장인이라 처음엔 두려웠지만, 남과 비교하지 않고 내 안의 솔직한 감정을 꺼내는 훈련을 받았습니다. 일상에서 억눌린 감정을 대사로 표현하며 자존감도 크게 높아졌습니다.
            </p>
            <div className="pt-2 flex items-center justify-between text-xs text-slate-400 border-t border-white/5">
              <span>김민우 수강생 (연기 베이직 6기)</span>
              <span className="text-amber-300 font-medium">비전공 직장인 입문</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
