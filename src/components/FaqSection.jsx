import React, { useState } from 'react';
import { useLanguage } from '../i18n/LanguageContext';
import { HelpCircle, ChevronDown } from 'lucide-react';

export default function FaqSection() {
  const { t } = useLanguage();
  const [openIdx, setOpenIdx] = useState(0);

  const faqs = [
    {
      q: "연기를 처음 배우는데 괜찮을까요?",
      a: "물론입니다. 연기 베이직은 처음 시작하는 분을 위한 과정입니다. 호흡과 발성, 움직임부터 차근차근 익히고 짧은 장면으로 표현을 연습합니다."
    },
    {
      q: "어떤 교육과정을 선택하면 좋을까요?",
      a: "기초를 익히고 싶다면 연기 베이직, 촬영 실습에 집중하고 싶다면 카메라 연기를 추천합니다. 명확한 입시·오디션 목표가 있다면 집중 과정의 커리큘럼을 살펴보세요."
    },
    {
      q: "수업을 위해 무엇을 준비해야 하나요?",
      a: "편하게 움직일 수 있는 복장과 필기구, 물을 준비해주세요. 대본과 개별 준비사항은 수강하는 과정에 따라 달라집니다."
    },
    {
      q: "입시와 오디션 과정에서는 무엇을 배우나요?",
      a: "작품 선정과 인물 분석, 독백 구성, 모의 오디션과 셀프테이프를 연습합니다. 목표에 맞춰 표현을 점검하고 자신을 소개하는 방법을 준비합니다."
    }
  ];

  return (
    <section id="faq" className="py-24 bg-[#141419] text-white px-6 border-b border-white/5 select-none">
      <div className="max-w-4xl mx-auto space-y-12">
        <div className="space-y-3 text-center">
          <p className="text-xs font-bold tracking-widest text-amber-400 uppercase flex items-center justify-center gap-2">
            <HelpCircle className="w-4 h-4" /> / FAQ’s /
          </p>
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-black leading-tight text-white">
            궁금한 이야기를<br />
            <span className="text-[#ecc04c]">먼저 만나보세요.</span>
          </h2>
        </div>

        <div className="space-y-3">
          {faqs.map((faq, idx) => (
            <div
              key={idx}
              className="rounded-2xl bg-white/[0.03] border border-white/10 overflow-hidden transition"
            >
              <button
                type="button"
                onClick={() => setOpenIdx(openIdx === idx ? null : idx)}
                className="w-full p-5 text-left flex items-center justify-between gap-4 font-bold text-sm sm:text-base text-white hover:text-amber-300 transition cursor-pointer"
              >
                <span>{faq.q}</span>
                <ChevronDown
                  className={`w-4 h-4 text-slate-400 transition-transform duration-300 ${
                    openIdx === idx ? 'rotate-180 text-amber-400' : ''
                  }`}
                />
              </button>

              {openIdx === idx && (
                <div className="px-5 pb-5 text-xs sm:text-sm text-slate-300 leading-relaxed font-light border-t border-white/5 pt-3 animate-fadeIn">
                  {faq.a}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
