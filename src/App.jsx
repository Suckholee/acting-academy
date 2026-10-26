import React, { useState } from 'react';
import { LanguageProvider } from './i18n/LanguageContext';
import { AdminEditProvider, useAdminEdit } from './context/AdminEditContext';
import AdminLiveToolbar from './components/Admin/InlineEditor/AdminLiveToolbar';
import AdminDrawer from './components/Admin/InlineEditor/AdminDrawer';
import AdminLoginModal from './components/Admin/AdminLoginModal';
import Header from './components/Header';
import Hero from './components/Hero';
import AboutSection from './components/AboutSection';
import ProgramsSection from './components/ProgramsSection';
import JourneySection from './components/JourneySection';
import InstructorsSection from './components/InstructorsSection';
import ReviewsSection from './components/ReviewsSection';
import FacilitiesSection from './components/FacilitiesSection';
import TuitionLocationSection from './components/TuitionLocationSection';
import FinderSection from './components/FinderSection';
import FaqSection from './components/FaqSection';
import ClosingSection from './components/ClosingSection';
import Footer from './components/Footer';
import ConsultModal from './components/ConsultModal';
import CourseModal from './components/CourseModal';
import { MessageSquareText } from 'lucide-react';

function AcademyApp() {
  const { isAdmin } = useAdminEdit();
  const [isConsultOpen, setIsConsultOpen] = useState(false);
  const [selectedCourse, setSelectedCourse] = useState(null);

  const handleSelectCourseById = (courseId) => {
    setSelectedCourse({ id: courseId });
  };

  return (
    <div className="min-h-screen bg-[#141419] text-white flex flex-col font-sans selection:bg-amber-500 selection:text-slate-950 overflow-x-hidden">
      {/* KFSSEC Style Admin Live Toolbar */}
      <AdminLiveToolbar />

      {/* Main Site Header */}
      <Header onOpenConsult={() => setIsConsultOpen(true)} />

      <main className="flex-1">
        <Hero />
        <AboutSection />
        <ProgramsSection onSelectCourse={(course) => setSelectedCourse(course)} />
        <JourneySection />
        <InstructorsSection />
        <ReviewsSection />
        <FacilitiesSection />
        <TuitionLocationSection />
        <FinderSection onSelectCourseById={handleSelectCourseById} />
        <FaqSection />
        <ClosingSection onOpenConsult={() => setIsConsultOpen(true)} />
      </main>

      <Footer />

      {/* Floating Quick Inquiry Button */}
      <button
        type="button"
        onClick={() => setIsConsultOpen(true)}
        className="fixed bottom-6 right-6 z-40 px-5 py-3.5 rounded-full bg-[#ecc04c] hover:bg-[#ffcf5c] text-slate-950 font-black text-xs sm:text-sm tracking-tight shadow-2xl flex items-center gap-2 hover:scale-105 active:scale-95 transition cursor-pointer border border-amber-300/40"
      >
        <MessageSquareText className="w-4 h-4" />
        <span>간편 수강료 · 교육 상담 ＋</span>
      </button>

      {/* Modals & Drawers */}
      <ConsultModal isOpen={isConsultOpen} onClose={() => setIsConsultOpen(false)} />
      <CourseModal
        course={selectedCourse}
        onClose={() => setSelectedCourse(null)}
        onConsult={() => setIsConsultOpen(true)}
      />
      <AdminDrawer />
      <AdminLoginModal />
    </div>
  );
}

export default function App() {
  return (
    <LanguageProvider>
      <AdminEditProvider>
        <AcademyApp />
      </AdminEditProvider>
    </LanguageProvider>
  );
}
