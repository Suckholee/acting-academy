import React, { useState } from 'react';
import { useAdminEdit } from '../context/AdminEditContext';
import { useLanguage } from '../i18n/LanguageContext';
import EditableText from './Admin/InlineEditor/EditableText';
import EditableImage from './Admin/InlineEditor/EditableImage';

export default function ProgramsSection({ onSelectCourse }) {
  const { siteDraft } = useAdminEdit();
  const { t } = useLanguage();
  const [filter, setFilter] = useState('all');

  const courses = siteDraft.programs?.courses || [];
  const filteredCourses = filter === 'all'
    ? courses
    : courses.filter((c) => c.category === filter);

  return (
    <section id="programs" className="py-24 bg-[#0e0e12] text-white px-6 border-b border-white/5 select-none">
      <div className="max-w-6xl mx-auto space-y-12">
        {/* Top Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div className="space-y-3">
            <p className="text-xs font-bold tracking-widest text-amber-400 uppercase">
              <EditableText path="programs.eyebrow" value={siteDraft.programs?.eyebrow}>
                / Acting Programs /
              </EditableText>
            </p>
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-black leading-tight">
              <EditableText
                path="programs.title"
                value={siteDraft.programs?.title}
                multiline={true}
              />
            </h2>
          </div>

          <div className="text-xs sm:text-sm text-slate-400 max-w-sm font-light whitespace-pre-line">
            <EditableText
              path="programs.desc"
              value={siteDraft.programs?.desc}
              multiline={true}
            />
          </div>
        </div>

        {/* Category Filters */}
        <div className="flex items-center gap-2 border-b border-white/10 pb-4">
          <button
            type="button"
            onClick={() => setFilter('all')}
            className={`px-4 py-2 rounded-full text-xs font-bold transition cursor-pointer ${
              filter === 'all'
                ? 'bg-amber-500 text-slate-950 shadow-md'
                : 'bg-white/5 text-slate-400 hover:text-white'
            }`}
          >
            {t('전체 과정')}
          </button>
          <button
            type="button"
            onClick={() => setFilter('beginner')}
            className={`px-4 py-2 rounded-full text-xs font-bold transition cursor-pointer ${
              filter === 'beginner'
                ? 'bg-amber-500 text-slate-950 shadow-md'
                : 'bg-white/5 text-slate-400 hover:text-white'
            }`}
          >
            {t('처음 시작하는 연기')}
          </button>
          <button
            type="button"
            onClick={() => setFilter('pro')}
            className={`px-4 py-2 rounded-full text-xs font-bold transition cursor-pointer ${
              filter === 'pro'
                ? 'bg-amber-500 text-slate-950 shadow-md'
                : 'bg-white/5 text-slate-400 hover:text-white'
            }`}
          >
            {t('배우로 나아가기')}
          </button>
        </div>

        {/* Course Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {filteredCourses.map((course, idx) => {
            const originalIndex = courses.findIndex((c) => c.id === course.id);
            return (
              <div
                key={course.id || idx}
                className="group rounded-2xl bg-gradient-to-b from-white/[0.07] to-white/[0.02] border border-white/10 hover:border-amber-500/50 transition-all duration-300 overflow-hidden flex flex-col shadow-xl"
              >
                {/* Course Art Image */}
                <div className="relative aspect-16/10 overflow-hidden bg-slate-900">
                  <EditableImage
                    path={`programs.courses.${originalIndex}.image`}
                    src={course.image}
                    alt={course.title}
                    className="w-full h-full"
                    imgClassName="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent"></div>
                  <div className="absolute top-3 left-3 px-2 py-0.5 rounded bg-black/60 backdrop-blur-xs text-[10px] font-mono tracking-widest text-amber-300">
                    <EditableText
                      path={`programs.courses.${originalIndex}.artLabel`}
                      value={course.artLabel}
                    />
                  </div>
                  <div className="absolute bottom-3 right-3 text-xl font-black text-white/80 font-mono">
                    <EditableText
                      path={`programs.courses.${originalIndex}.artNumber`}
                      value={course.artNumber}
                    />
                  </div>
                </div>

                {/* Course Body */}
                <div className="p-6 flex-1 flex flex-col justify-between space-y-4">
                  <div className="space-y-2">
                    <p className="text-[11px] font-bold text-amber-400 tracking-wider">
                      <EditableText
                        path={`programs.courses.${originalIndex}.tag`}
                        value={course.tag}
                      />
                    </p>
                    <h3 className="text-xl font-extrabold text-white group-hover:text-amber-300 transition">
                      <EditableText
                        path={`programs.courses.${originalIndex}.title`}
                        value={course.title}
                      />
                    </h3>
                    <p className="text-xs text-slate-300 font-light leading-relaxed whitespace-pre-line">
                      <EditableText
                        path={`programs.courses.${originalIndex}.desc`}
                        value={course.desc}
                        multiline={true}
                      />
                    </p>
                  </div>

                  <div className="pt-2">
                    <button
                      type="button"
                      onClick={() => onSelectCourse(course)}
                      className="w-full py-2.5 rounded-xl bg-white/5 hover:bg-amber-500 hover:text-slate-950 border border-white/10 text-xs font-bold tracking-tight transition flex items-center justify-center gap-2 cursor-pointer"
                    >
                      <span>{t('과정 자세히 보기')}</span>
                      <span>＋</span>
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
