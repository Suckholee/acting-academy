import React from 'react';
import { X, Check } from 'lucide-react';

export default function CourseModal({ course, onClose, onConsult }) {
  if (!course) return null;

  const curriculumMap = {
    basic: [
      { step: "01", title: "호흡과 신체 이완", desc: "긴장을 풀고 자신의 자연스러운 호흡과 음성을 탐색합니다." },
      { step: "02", title: "감각 깨우기와 집중", desc: "주변 환경과 상대 배우에게 반응하는 오감 훈련을 진행합니다." },
      { step: "03", title: "독백 및 2인극 실습", desc: "짧은 텍스트를 통해 인물의 심리와 목표를 찾아 표현합니다." },
      { step: "04", title: "장면 발표 및 1:1 피드백", desc: "카메라 모니터링을 통해 자신의 표현을 객관적으로 점검합니다." }
    ],
    camera: [
      { step: "01", title: "카메라 렌즈와 사이즈의 이해", desc: "풀샷부터 클로즈업까지 사이즈별 시선과 움직임의 크기를 조절합니다." },
      { step: "02", title: "미세 감정과 시선 앵커링", desc: "눈 깜빡임, 호흡의 속도 등 프레임 안에서 드러나는 디테일을 다룹니다." },
      { step: "03", title: "매체 대본 분석과 비트 나누기", desc: "드라마·영화 대본의 서브텍스트를 입체적으로 분석합니다." },
      { step: "04", title: "현장형 4K 촬영 및 모니터링", desc: "실제 촬영 현장과 동일한 환경에서 테이크를 진행하고 코칭받습니다." }
    ],
    audition: [
      { step: "01", title: "퍼스널 캐릭터 & 마스크 매칭", desc: "배우 본인의 개성과 음색에 가장 적합한 지정/자유 독백을 설계합니다." },
      { step: "02", title: "3초를 사로잡는 셀프테이프 제작", desc: "조명, 앵글, 인트로 연출로 캐스팅 디렉터의 시선을 잡는 영상을 만듭니다." },
      { step: "03", title: "실전 모의 오디션 & 즉흥 리액션", desc: "현장에서 즉석으로 주어지는 디렉팅에 유연하게 대처하는 훈련을 합니다." },
      { step: "04", title: "오디션 포트폴리오 완성", desc: "프로필 사진과 영상 링크, 인터뷰 답변까지 토탈 패키지를 완성합니다." }
    ]
  };

  const curriList = curriculumMap[course.id] || curriculumMap.basic;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
      <div className="bg-[#141419] border border-amber-500/40 text-white rounded-3xl w-full max-w-xl p-6 sm:p-8 shadow-2xl relative max-h-[90vh] overflow-y-auto space-y-6">
        <button
          type="button"
          onClick={onClose}
          className="absolute top-5 right-5 text-slate-400 hover:text-white p-1"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="space-y-2">
          <span className="text-[11px] font-bold text-amber-400 tracking-wider">
            {course.tag}
          </span>
          <h2 className="text-2xl sm:text-3xl font-black text-white">
            {course.title}
          </h2>
          <p className="text-xs sm:text-sm text-slate-300 font-light">
            {course.desc}
          </p>
        </div>

        <div className="space-y-3 pt-2">
          <h3 className="text-xs font-bold text-amber-400 uppercase tracking-widest">
            이렇게 배워요 (Curriculum)
          </h3>
          <div className="space-y-2.5">
            {curriList.map((item, idx) => (
              <div
                key={idx}
                className="p-3.5 rounded-xl bg-white/[0.03] border border-white/5 flex gap-3"
              >
                <span className="text-xs font-mono font-bold text-amber-400">
                  {item.step}
                </span>
                <div className="space-y-1">
                  <h4 className="text-xs sm:text-sm font-bold text-white">{item.title}</h4>
                  <p className="text-xs text-slate-400 font-light leading-relaxed">
                    {item.desc}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="pt-4 border-t border-white/10 flex items-center justify-between gap-4">
          <p className="text-[11px] text-slate-500">
            * 수강생의 레벨과 지향점에 따라 커리큘럼은 맞춤 조정됩니다.
          </p>
          <button
            type="button"
            onClick={() => {
              onClose();
              if (onConsult) onConsult();
            }}
            className="px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs tracking-tight transition shadow cursor-pointer whitespace-nowrap"
          >
            이 과정 상담하기 →
          </button>
        </div>
      </div>
    </div>
  );
}
