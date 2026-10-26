import React from 'react';
import { useAdminEdit } from '../context/AdminEditContext';
import { useLanguage } from '../i18n/LanguageContext';
import EditableText from './Admin/InlineEditor/EditableText';
import EditableImage from './Admin/InlineEditor/EditableImage';

export default function AboutSection() {
  const { siteDraft } = useAdminEdit();
  const { t } = useLanguage();

  return (
    <section id="about" className="py-24 bg-[#141419] text-white px-6 border-b border-white/5 select-none">
      <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
        {/* Left: Heading & Photo */}
        <div className="space-y-6">
          <p className="text-xs font-bold tracking-widest text-amber-400 uppercase">
            <EditableText path="about.eyebrow" value={siteDraft.about?.eyebrow}>
              / About Us /
            </EditableText>
          </p>

          <h2 className="text-3xl sm:text-4xl md:text-5xl font-black leading-tight">
            <EditableText
              path="about.title"
              value={siteDraft.about?.title}
              multiline={true}
            />
          </h2>

          <div className="rounded-2xl overflow-hidden border border-white/10 shadow-2xl relative aspect-4/3 max-w-lg">
            <EditableImage
              path="about.photo"
              src={siteDraft.about?.photo || "/assets/im-do-yoon-feedback-ai.png"}
              alt="About photo"
              className="w-full h-full"
              imgClassName="w-full h-full object-cover"
            />
          </div>
        </div>

        {/* Right: Copy & Principles */}
        <div className="space-y-8 lg:pl-6">
          <div className="border-l-2 border-amber-500 pl-4 space-y-1">
            <div className="text-xl sm:text-2xl font-black tracking-tight text-white">
              KIM <span className="text-amber-400">JUNG TAE.</span>
            </div>
            <p className="text-xs sm:text-sm text-slate-400">
              <EditableText path="about.wordmarkSub" value={siteDraft.about?.wordmarkSub}>
                진심으로 연기하고, 나답게 성장하다.
              </EditableText>
            </p>
          </div>

          <div className="space-y-4 text-sm sm:text-base text-slate-300 leading-relaxed font-light">
            <p>
              <EditableText
                path="about.p1"
                value={siteDraft.about?.p1}
                multiline={true}
              />
            </p>
            <p className="whitespace-pre-line">
              <EditableText
                path="about.p2"
                value={siteDraft.about?.p2}
                multiline={true}
              />
            </p>
          </div>

          {/* Principles tags */}
          <div className="flex flex-wrap gap-2.5">
            {siteDraft.about?.principles?.map((principle, index) => (
              <span
                key={index}
                className="px-3.5 py-1.5 rounded-full bg-white/5 border border-amber-500/30 text-amber-300 font-semibold text-xs tracking-tight"
              >
                <EditableText
                  path={`about.principles.${index}`}
                  value={principle}
                />
              </span>
            ))}
          </div>

          <div>
            <a
              href="#finder"
              className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs sm:text-sm transition shadow-lg"
            >
              <EditableText path="about.cta" value={siteDraft.about?.cta}>
                {t('나에게 맞는 클래스 찾기')}
              </EditableText>
              <span>→</span>
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}
