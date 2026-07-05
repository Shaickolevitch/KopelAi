'use client';

import { useLang } from '@/lib/i18n';
import ChatTabs from '../ChatTabs';
import PatientList from './PatientList';

export default function PatientsPage() {
  const { language } = useLang();
  const he = language === 'he';
  return (
    <div className="flex-1 max-w-3xl w-full mx-auto px-4 sm:px-6 py-6">
      <ChatTabs active="patients" />
      <h1 className="text-3xl font-bold text-stone-900 dark:text-zinc-100 mb-1">
        {he ? 'מטופלים' : 'Patients'}
      </h1>
      <p className="text-sm text-stone-500 dark:text-zinc-500 mb-6 leading-relaxed">
        {he
          ? 'תיק רפלקטיבי פרטי לכל מטופל — קופל מזהה בעצמו את מי הזכרת ובונה ניתוח שמתעדכן לאורך הזמן.'
          : 'A private reflective file per client — Kopel recognizes who you mentioned and builds an analysis that grows over time.'}
      </p>
      <PatientList />
      <div className="h-12" />
    </div>
  );
}
