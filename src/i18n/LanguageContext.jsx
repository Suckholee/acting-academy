import React, { createContext, useContext, useEffect, useState } from 'react';
import { translate } from './translate';

const LanguageContext = createContext(null);
const storageKey = 'kjt-academy-language';
export const supportedLanguages = [
  { code: 'ko', label: '한국어', flag: '🇰🇷' },
  { code: 'en', label: 'English', flag: '🇺🇸' },
  { code: 'ja', label: '日本語', flag: '🇯🇵' },
  { code: 'zh', label: '中文', flag: '🇨🇳' }
];

export function LanguageProvider({ children }) {
  const [language, setLanguage] = useState(() => {
    try {
      const saved = localStorage.getItem(storageKey);
      return supportedLanguages.some((l) => l.code === saved) ? saved : 'ko';
    } catch {
      return 'ko';
    }
  });

  useEffect(() => {
    document.documentElement.lang = language;
    try {
      localStorage.setItem(storageKey, language);
    } catch {
      /* Keep switching available without storage. */
    }
  }, [language]);

  const t = (korean, fallback) => {
    if (language === 'ko') return korean;
    if (language === 'en' && fallback !== undefined) return fallback;
    return translate(language, korean);
  };

  const tr = (value, ...values) => translate(language, value, ...values);

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t, tr, supportedLanguages }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (!context) throw new Error('useLanguage requires LanguageProvider');
  return context;
}
