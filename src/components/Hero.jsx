import React from 'react';
import { useAdminEdit } from '../context/AdminEditContext';
import { useLanguage } from '../i18n/LanguageContext';
import EditableText from './Admin/InlineEditor/EditableText';
import EditableImage from './Admin/InlineEditor/EditableImage';

export default function Hero() {
  const { siteDraft } = useAdminEdit();
  const { t } = useLanguage();

  return (
    <section className="relative min-h-[85vh] flex items-center justify-center overflow-hidden bg-black text-white px-6 py-20 select-none">
      {/* Background Hero Image */}
      <div className="absolute inset-0 z-0">
        <EditableImage
          path="hero.image"
          src={siteDraft.hero?.image || "/assets/kim-hyung-min-camera-ai.png"}
          alt="Hero visual"
          className="w-full h-full"
          imgClassName="w-full h-full object-cover object-center opacity-40 scale-105 transition-transform duration-1000"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-[#141419] via-[#141419]/60 to-transparent"></div>
        <div className="absolute inset-0 bg-radial from-transparent via-black/40 to-black/80"></div>
      </div>

      {/* Content */}
      <div className="relative z-10 max-w-5xl mx-auto text-center space-y-6">
        <p className="text-xs md:text-sm font-semibold tracking-[0.25em] text-amber-400/90 uppercase">
          <EditableText path="hero.eyebrow" value={siteDraft.hero?.eyebrow}>
            KIM JUNG TAE ACTING ACADEMY
          </EditableText>
        </p>

        <h1 className="text-4xl sm:text-5xl md:text-7xl font-black tracking-tight leading-tight">
          <EditableText path="hero.title1" value={siteDraft.hero?.title1}>
            연기의 시작,
          </EditableText>{' '}
          <span className="text-[#ecc04c]">
            <EditableText path="hero.title2" value={siteDraft.hero?.title2}>
              배우의 깊이.
            </EditableText>
          </span>
        </h1>

        <p className="text-sm sm:text-base font-bold tracking-[0.2em] text-slate-300">
          <EditableText path="hero.koreanSlogan" value={siteDraft.hero?.koreanSlogan}>
            ACT TRUE. BECOME YOU.
          </EditableText>
        </p>

        <div className="max-w-2xl mx-auto pt-2">
          <p className="text-xs sm:text-sm md:text-base text-slate-300 leading-relaxed font-light whitespace-pre-line">
            <EditableText
              path="hero.copy"
              value={siteDraft.hero?.copy}
              multiline={true}
            />
          </p>
        </div>

        <div className="pt-6 flex flex-wrap items-center justify-center gap-4">
          <a
            href="#programs"
            className="px-6 py-3 rounded-full border border-amber-400/60 hover:bg-amber-400 hover:text-slate-950 text-amber-300 font-bold text-xs sm:text-sm tracking-wide transition shadow-lg backdrop-blur-xs cursor-pointer"
          >
            <EditableText path="hero.cta" value={siteDraft.hero?.cta}>
              {t('교육과정 살펴보기')}
            </EditableText>
          </a>
        </div>
      </div>

      {/* Bottom Film Strip Indicator */}
      <div className="absolute bottom-4 left-6 right-6 flex items-center justify-between text-[11px] text-slate-500 font-mono">
        <span>KJT INSTRUCTORS / AI 수업 이미지</span>
        <span>ACADEMY CURRICULUM 2026</span>
      </div>
    </section>
  );
}
