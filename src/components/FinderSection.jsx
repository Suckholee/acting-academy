import React, { useState } from 'react';
import { useAdminEdit } from '../context/AdminEditContext';
import { useLanguage } from '../i18n/LanguageContext';
import EditableText from './Admin/InlineEditor/EditableText';
import { Compass, Check } from 'lucide-react';

export default function FinderSection({ onSelectCourseById }) {
  const { t } = useLanguage();
  const [selectedGoal, setSelectedGoal] = useState('basic');

  const goalOptions = [
    {
      id: 'basic',
      label: '새로운 나를 발견하고 싶어요',
      courseId: 'basic',
      title: '연기 베이직',
      desc: '경험이 없어도 괜찮아요. 몸과 목소리를 알아가는 것부터 시작하세요.'
    },
    {
      id: 'camera',
      label: '카메라 앞 연기를 배우고 싶어요',
      courseId: 'camera',
      title: '카메라 연기',
      desc: '모니터링과 프레임 감각을 익혀 오디션과 촬영 현장에서 빛나는 연기를 완성합니다.'
    },
    {
      id: 'audition',
      label: '입시나 오디션을 준비하고 있어요',
      courseId: 'audition',
      title: '입시 · 오디션',
      desc: '나에게 어울리는 독백 캐릭터 분석과 셀프테이프 완성으로 합격 확률을 높입니다.'
    }
  ];

  const currentOption = goalOptions.find((o) => o.id === selectedGoal) || goalOptions[0];

  return (
    <section id="finder" className="py-24 bg-[#0e0e12] text-white px-6 border-b border-white/5 select-none">
      <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
        <div className="space-y-4">
          <p className="text-xs font-bold tracking-widest text-amber-400 uppercase flex items-center gap-2">
            <Compass className="w-4 h-4" /> / Find Your Class /
          </p>
          <h2 className="text-3xl sm:text-4xl font-black leading-tight text-white">
            어디서부터 시작할지<br />
            <span className="text-[#ecc04c]">고민된다면.</span>
          </h2>
          <p className="text-xs sm:text-sm text-slate-300 font-light leading-relaxed">
            지금 가장 가까운 마음을 골라보세요.<br />
            당신의 첫 클래스를 함께 찾아볼게요.
          </p>
        </div>

        <div className="bg-slate-900/60 rounded-3xl border border-white/10 p-6 md:p-8 space-y-6 shadow-2xl">
          <p className="text-xs font-bold text-slate-400">
            지금, 연기를 배우려는 이유는 무엇인가요?
          </p>

          <div className="flex flex-col gap-2.5">
            {goalOptions.map((opt) => (
              <button
                key={opt.id}
                type="button"
                onClick={() => setSelectedGoal(opt.id)}
                className={`p-3.5 rounded-xl text-xs font-semibold text-left transition flex items-center justify-between cursor-pointer ${
                  selectedGoal === opt.id
                    ? 'bg-amber-500 text-slate-950 shadow-md font-bold'
                    : 'bg-white/5 text-slate-300 hover:bg-white/10 border border-white/5'
                }`}
              >
                <span>{opt.label}</span>
                {selectedGoal === opt.id && <Check className="w-4 h-4 text-slate-950" />}
              </button>
            ))}
          </div>

          <div className="pt-4 border-t border-white/10 space-y-3">
            <span className="text-[10px] font-mono tracking-widest text-amber-400 uppercase">
              RECOMMENDED FOR YOU
            </span>
            <h3 className="text-xl font-bold text-white">{currentOption.title}</h3>
            <p className="text-xs text-slate-300 leading-relaxed font-light">
              {currentOption.desc}
            </p>
            <button
              type="button"
              onClick={() => onSelectCourseById(currentOption.courseId)}
              className="mt-2 px-5 py-2.5 rounded-xl bg-white/10 hover:bg-amber-500 hover:text-slate-950 text-amber-300 font-bold text-xs transition cursor-pointer"
            >
              추천 과정 살펴보기 →
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}
