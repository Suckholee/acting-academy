import React, { useState } from 'react';
import { useAdminEdit } from '../context/AdminEditContext';
import { useLanguage } from '../i18n/LanguageContext';
import EditableText from './Admin/InlineEditor/EditableText';
import EditableImage from './Admin/InlineEditor/EditableImage';

export default function JourneySection() {
  const { siteDraft } = useAdminEdit();
  const { t } = useLanguage();
  const [activeStep, setActiveStep] = useState(0);

  const steps = siteDraft.journey?.steps || [];
  const currentStep = steps[activeStep] || steps[0];

  return (
    <section className="py-24 bg-[#141419] text-white px-6 border-b border-white/5 select-none">
      <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
        {/* Left: Navigation and Copy */}
        <div className="lg:col-span-5 space-y-6">
          <p className="text-xs font-bold tracking-widest text-amber-400 uppercase">
            <EditableText path="journey.eyebrow" value={siteDraft.journey?.eyebrow}>
              / Your Journey /
            </EditableText>
          </p>

          <h2 className="text-3xl sm:text-4xl md:text-5xl font-black leading-tight">
            <EditableText
              path="journey.title"
              value={siteDraft.journey?.title}
              multiline={true}
            />
          </h2>

          <p className="text-xs sm:text-sm text-slate-300 font-light leading-relaxed whitespace-pre-line">
            <EditableText
              path="journey.desc"
              value={siteDraft.journey?.desc}
              multiline={true}
            />
          </p>

          {/* Steps Tabs */}
          <div className="flex gap-2 pt-2">
            {steps.map((s, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => setActiveStep(idx)}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition cursor-pointer ${
                  activeStep === idx
                    ? 'bg-amber-500 text-slate-950 shadow-md ring-2 ring-amber-400/50'
                    : 'bg-white/5 text-slate-400 hover:text-white border border-white/10'
                }`}
              >
                <EditableText
                  path={`journey.steps.${idx}.title`}
                  value={s.title}
                />
              </button>
            ))}
          </div>
        </div>

        {/* Right: Active Stage Display */}
        {currentStep && (
          <div className="lg:col-span-7 bg-slate-900/60 rounded-3xl border border-white/10 p-6 md:p-8 space-y-6 shadow-2xl">
            <div className="relative aspect-16/9 rounded-2xl overflow-hidden bg-black border border-white/10">
              <EditableImage
                path={`journey.steps.${activeStep}.image`}
                src={currentStep.image}
                alt={currentStep.headline}
                className="w-full h-full"
                imgClassName="w-full h-full object-cover"
              />
            </div>

            <div className="space-y-3">
              <span className="text-[11px] font-mono tracking-widest text-amber-400">
                STAGE 0{activeStep + 1}
              </span>
              <h3 className="text-xl sm:text-2xl font-bold text-white">
                <EditableText
                  path={`journey.steps.${activeStep}.headline`}
                  value={currentStep.headline}
                />
              </h3>
              <p className="text-xs sm:text-sm text-slate-300 font-light leading-relaxed whitespace-pre-line">
                <EditableText
                  path={`journey.steps.${activeStep}.copy`}
                  value={currentStep.copy}
                  multiline={true}
                />
              </p>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
