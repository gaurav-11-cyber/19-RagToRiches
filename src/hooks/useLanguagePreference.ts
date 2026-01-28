import { useState, useEffect } from 'react';

export type Language = 'auto' | 'english' | 'hindi' | 'hinglish' | 'urdu';

export const LANGUAGE_OPTIONS: { value: Language; label: string; nativeLabel: string }[] = [
  { value: 'auto', label: 'Auto-detect', nativeLabel: '🌐 Auto' },
  { value: 'english', label: 'English', nativeLabel: 'English' },
  { value: 'hindi', label: 'Hindi', nativeLabel: 'हिंदी' },
  { value: 'hinglish', label: 'Hinglish', nativeLabel: 'Hinglish' },
  { value: 'urdu', label: 'Urdu', nativeLabel: 'اردو' },
];

const STORAGE_KEY = 'fs-rag-language-preference';

export function useLanguagePreference() {
  const [language, setLanguageState] = useState<Language>(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored && ['auto', 'english', 'hindi', 'hinglish', 'urdu'].includes(stored)) {
        return stored as Language;
      }
    }
    return 'auto';
  });

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, language);
  }, [language]);

  const setLanguage = (lang: Language) => {
    setLanguageState(lang);
  };

  return { language, setLanguage };
}
