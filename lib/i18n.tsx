'use client';

import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { Language, STORAGE_KEY, STRINGS } from '@kopelai/shared';

type LangContextValue = {
  language: Language;
  setLanguage: (lang: Language) => void;
};

const LangContext = createContext<LangContextValue>({
  language: 'he',
  setLanguage: () => {},
});

export function LangProvider({ children }: { children: ReactNode }) {
  // Default to Hebrew. Hydrate from localStorage on client.
  const [language, setLanguageState] = useState<Language>('he');
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored === 'he' || stored === 'en') {
        setLanguageState(stored);
      }
    } catch {}
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted) return;
    // Update <html> attributes for RTL/LTR rendering
    const html = document.documentElement;
    html.lang = language;
    html.dir = language === 'he' ? 'rtl' : 'ltr';
    try {
      localStorage.setItem(STORAGE_KEY, language);
    } catch {}
  }, [language, mounted]);

  const setLanguage = (lang: Language) => {
    setLanguageState(lang);
  };

  return (
    <LangContext.Provider value={{ language, setLanguage }}>
      {children}
    </LangContext.Provider>
  );
}

export function useLang() {
  return useContext(LangContext);
}

export function useT() {
  const { language } = useLang();
  return STRINGS[language];
}