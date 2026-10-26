import React from 'react';
import { useAdminEdit } from '../context/AdminEditContext';
import { useLanguage } from '../i18n/LanguageContext';
import EditableText from './Admin/InlineEditor/EditableText';
import { MapPin, CreditCard, Calendar, Clock, Users } from 'lucide-react';

export default function TuitionLocationSection() {
  const { siteDraft } = useAdminEdit();
  const { t } = useLanguage();
  const tuition = siteDraft.tuition || {};

  return (
    <section className="py-24 bg-[#141419] text-white px-6 border-b border-white/5 select-none">
      <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
        {/* Left: Location Card */}
        <div className="p-8 rounded-3xl bg-slate-900/60 border border-white/10 space-y-6">
          <p className="text-xs font-bold tracking-widest text-amber-400 uppercase flex items-center gap-2">
            <MapPin className="w-4 h-4" /> / LOCATION & CLASS /
          </p>

          <h2 className="text-3xl sm:text-4xl font-black leading-tight text-white whitespace-pre-line">
            <EditableText
              path="tuition.location"
              value={tuition.location}
              multiline={true}
            />
          </h2>

          <p className="text-xs sm:text-sm text-slate-300 font-light leading-relaxed whitespace-pre-line">
            <EditableText
              path="tuition.locationDesc"
              value={tuition.locationDesc}
              multiline={true}
            />
          </p>

          <div className="pt-2">
            <span className="text-xs text-amber-300 font-semibold px-3 py-1.5 rounded-lg bg-amber-500/10 border border-amber-500/30">
              지하철 5호선 마곡역 5분 거리 · 주차 가능
            </span>
          </div>
        </div>

        {/* Right: Tuition Grid */}
        <div className="space-y-6">
          <p className="text-xs font-bold tracking-widest text-amber-400 uppercase flex items-center gap-2">
            <CreditCard className="w-4 h-4" /> / CLASS INFORMATION /
          </p>

          <h3 className="text-2xl sm:text-3xl font-black text-white">
            {t('교습비 및 수업 안내')}
          </h3>

          <div className="grid grid-cols-2 gap-4">
            <div className="p-5 rounded-2xl bg-white/[0.03] border border-white/10 space-y-2">
              <span className="text-xs text-slate-400 flex items-center gap-1.5">
                <CreditCard className="w-3.5 h-3.5 text-amber-400" /> {t('월 교습비')}
              </span>
              <p className="text-xl sm:text-2xl font-black text-amber-300">
                <EditableText path="tuition.monthlyFee" value={tuition.monthlyFee} />
              </p>
            </div>

            <div className="p-5 rounded-2xl bg-white/[0.03] border border-white/10 space-y-2">
              <span className="text-xs text-slate-400 flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-amber-400" /> {t('주당 수업 횟수')}
              </span>
              <p className="text-xl sm:text-2xl font-black text-white">
                <EditableText path="tuition.frequency" value={tuition.frequency} />
              </p>
            </div>

            <div className="p-5 rounded-2xl bg-white/[0.03] border border-white/10 space-y-2">
              <span className="text-xs text-slate-400 flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-amber-400" /> {t('회당 수업 시간')}
              </span>
              <p className="text-xl sm:text-2xl font-black text-white">
                <EditableText path="tuition.duration" value={tuition.duration} />
              </p>
            </div>

            <div className="p-5 rounded-2xl bg-white/[0.03] border border-white/10 space-y-2">
              <span className="text-xs text-slate-400 flex items-center gap-1.5">
                <Users className="w-3.5 h-3.5 text-amber-400" /> {t('반별 정원')}
              </span>
              <p className="text-xl sm:text-2xl font-black text-white">
                <EditableText path="tuition.capacity" value={tuition.capacity} />
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
