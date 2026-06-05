export type InsightCategory = {
  key: string;
  he: string;
  en: string;
};

export const INSIGHT_CATEGORIES: InsightCategory[] = [
  { key: 'values', he: 'ערכים', en: 'Values' },
  { key: 'beliefs', he: 'אמונות', en: 'Beliefs' },
  { key: 'strengths', he: 'חוזקות', en: 'Strengths' },
  { key: 'soft_skills', he: 'מיומנויות רכות', en: 'Soft skills' },
  { key: 'hard_skills', he: 'מיומנויות קשות', en: 'Hard skills' },
  { key: 'patterns', he: 'דפוסים', en: 'Patterns' },
  { key: 'recurring_themes', he: 'נושאים חוזרים', en: 'Recurring themes' },
  { key: 'decision_making', he: 'איך אתה מקבל החלטות', en: 'How you make decisions' },
  { key: 'drains', he: 'מה מרוקן אותך', en: 'What drains you' },
  { key: 'fuel_fillers', he: 'מקורות אנרגיה', en: 'Fuel fillers' },
  { key: 'hobbies', he: 'תחביבים', en: 'Hobbies' },
  { key: 'fears', he: 'פחדים', en: 'Fears' },
  { key: 'dreams', he: 'חלומות', en: 'Dreams' },
  { key: 'calling', he: 'הייעוד שלך', en: 'Calling' },
  { key: 'thriving_contexts', he: 'איפה תוכל לפרוח', en: 'Where you might thrive' },
  { key: 'experience', he: 'ניסיון ורקע', en: 'Experience & background' },
  { key: 'open_questions', he: 'מה קופל עדיין לומד עליך', en: 'Open questions' },
];

export function getCategoryLabel(key: string, language: 'he' | 'en' = 'he'): string {
  const cat = INSIGHT_CATEGORIES.find((c) => c.key === key);
  if (!cat) return key;
  return language === 'he' ? cat.he : cat.en;
}