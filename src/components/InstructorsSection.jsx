import React from 'react';
import { useAdminEdit } from '../context/AdminEditContext';
import { useLanguage } from '../i18n/LanguageContext';
import EditableText from './Admin/InlineEditor/EditableText';
import EditableImage from './Admin/InlineEditor/EditableImage';

export default function InstructorsSection() {
  const { siteDraft } = useAdminEdit();
  const { t } = useLanguage();
  const trainers = siteDraft.trainers || [];

  return (
    <section id="trainers" className="py-24 bg-[#0e0e12] text-white px-6 border-b border-white/5 select-none">
      <div className="max-w-6xl mx-auto space-y-12">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div className="space-y-3">
            <p className="text-xs font-bold tracking-widest text-amber-400 uppercase">
              / OUR INSTRUCTORS /
            </p>
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-black leading-tight">
              서로 다른 얼굴,<br />
              <span className="text-[#ecc04c]">각자의 빛나는 장면.</span>
            </h2>
          </div>
          <p className="text-xs sm:text-sm text-slate-400 font-light">
            김정태 배우아카데미를 이끄는 전문 교수진을 만나보세요.
          </p>
        </div>

        {/* Instructors Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {trainers.map((trainer, idx) => (
            <div
              key={trainer.id || idx}
              className="group rounded-2xl bg-white/[0.03] border border-white/10 hover:border-amber-500/50 p-5 transition-all duration-300 flex flex-col justify-between space-y-4"
            >
              <div className="relative aspect-3/4 rounded-xl overflow-hidden bg-slate-900 border border-white/5">
                <EditableImage
                  path={`trainers.${idx}.image`}
                  src={trainer.image}
                  alt={trainer.name}
                  className="w-full h-full"
                  imgClassName="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                />
              </div>

              <div className="space-y-2">
                <span className="text-[11px] font-bold text-amber-400 tracking-wider">
                  <EditableText path={`trainers.${idx}.role`} value={trainer.role} />
                </span>
                <h3 className="text-xl font-bold text-white">
                  <EditableText path={`trainers.${idx}.name`} value={trainer.name} />
                </h3>
                <p className="text-xs text-slate-400 font-light leading-relaxed">
                  <EditableText
                    path={`trainers.${idx}.summary`}
                    value={trainer.summary}
                    multiline={true}
                  />
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
