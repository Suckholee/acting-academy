import React, { useState } from 'react';
import { useAdminEdit } from '../context/AdminEditContext';
import { useLanguage } from '../i18n/LanguageContext';
import EditableText from './Admin/InlineEditor/EditableText';
import EditableImage from './Admin/InlineEditor/EditableImage';

export default function FacilitiesSection() {
  const { siteDraft } = useAdminEdit();
  const { t } = useLanguage();
  const facilities = siteDraft.facilities || [];
  const [selectedPhoto, setSelectedPhoto] = useState(null);

  return (
    <section id="facilities" className="py-24 bg-[#0e0e12] text-white px-6 border-b border-white/5 select-none">
      <div className="max-w-6xl mx-auto space-y-12">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div className="space-y-3">
            <p className="text-xs font-bold tracking-widest text-amber-400 uppercase">
              / Space To Create /
            </p>
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-black leading-tight">
              몰입할 수 있는 공간,<br />
              <span className="text-[#ecc04c]">가능성이 자라는 시간.</span>
            </h2>
          </div>
          <p className="text-xs sm:text-sm text-slate-400 font-light">
            넓은 우드 바닥과 전면 거울, 집중 연습실을 갖춘 전문 트레이닝 공간입니다.
          </p>
        </div>

        {/* Facilities Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {facilities.map((fac, idx) => (
            <div
              key={idx}
              className="group rounded-2xl bg-white/[0.03] border border-white/10 hover:border-amber-500/50 overflow-hidden transition-all duration-300 space-y-4"
            >
              <div className="relative aspect-4/3 overflow-hidden bg-slate-900 cursor-pointer">
                <EditableImage
                  path={`facilities.${idx}.image`}
                  src={fac.image}
                  alt={fac.title}
                  className="w-full h-full"
                  imgClassName="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                />
              </div>

              <div className="p-6 pt-0 space-y-2">
                <h3 className="text-lg font-bold text-white">
                  <EditableText path={`facilities.${idx}.title`} value={fac.title} />
                </h3>
                <p className="text-xs text-slate-400 font-light leading-relaxed">
                  <EditableText
                    path={`facilities.${idx}.desc`}
                    value={fac.desc}
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
