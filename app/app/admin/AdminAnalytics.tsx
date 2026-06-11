'use client';

import { useEffect, useState } from 'react';
import { useLang } from '@/lib/i18n';
import { adminGetAnalytics, type AnalyticsData } from '@/lib/api';

// ── Small presentational helpers ────────────────────────────────────────────
function Card({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`rounded-xl border border-stone-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-4 shadow-sm ${className}`}>
      {children}
    </div>
  );
}

function Kpi({ label, value, sub }: { label: string; value: string | number; sub?: string }) {
  return (
    <Card className="flex flex-col gap-0.5">
      <div className="text-xs text-stone-500 dark:text-zinc-500">{label}</div>
      <div className="text-2xl font-bold text-stone-900 dark:text-zinc-100 tabular-nums">{value}</div>
      {sub && <div className="text-xs text-stone-400 dark:text-zinc-600">{sub}</div>}
    </Card>
  );
}

function SectionTitle({ children, hint }: { children: React.ReactNode; hint?: string }) {
  return (
    <div className="mb-3">
      <div className="text-sm font-semibold text-stone-900 dark:text-zinc-100">{children}</div>
      {hint && <div className="text-xs text-stone-400 dark:text-zinc-600 mt-0.5">{hint}</div>}
    </div>
  );
}

// Vertical bars from an array of {label, value}.
function Bars({ data, color = 'bg-indigo-500' }: { data: { label: string; value: number }[]; color?: string }) {
  const max = Math.max(1, ...data.map((d) => d.value));
  return (
    <div className="flex items-end gap-0.5 h-32">
      {data.map((d, i) => (
        <div key={i} className="flex-1 flex flex-col items-center justify-end h-full group relative">
          <div className="absolute -top-5 opacity-0 group-hover:opacity-100 transition-opacity text-[10px] text-stone-600 dark:text-zinc-300 tabular-nums whitespace-nowrap">{d.value}</div>
          <div className={`w-full rounded-t ${color}`} style={{ height: `${(d.value / max) * 100}%`, minHeight: d.value > 0 ? '2px' : '0' }} />
        </div>
      ))}
    </div>
  );
}

// Line chart (SVG) for a single series.
function Line({ data, stroke = '#6366f1' }: { data: number[]; stroke?: string }) {
  const W = 600, H = 120, pad = 4;
  const max = Math.max(1, ...data);
  const pts = data.map((v, i) => {
    const x = pad + (i / Math.max(1, data.length - 1)) * (W - pad * 2);
    const y = H - pad - (v / max) * (H - pad * 2);
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  });
  return (
    <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" className="w-full h-28">
      <polyline points={pts.join(' ')} fill="none" stroke={stroke} strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" />
    </svg>
  );
}

// X-axis labels (show ~6 evenly spaced).
function Axis({ labels }: { labels: string[] }) {
  const step = Math.ceil(labels.length / 6);
  return (
    <div className="flex justify-between mt-1 text-[10px] text-stone-400 dark:text-zinc-600">
      {labels.map((l, i) => (
        <span key={i} className={i % step === 0 || i === labels.length - 1 ? '' : 'opacity-0'}>{l}</span>
      ))}
    </div>
  );
}

export default function AdminAnalytics() {
  const { language } = useLang();
  const he = language === 'he';
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  async function load() {
    setLoading(true); setError('');
    try { setData(await adminGetAnalytics()); }
    catch (e) { setError(e instanceof Error ? e.message : 'Failed to load'); }
    finally { setLoading(false); }
  }
  useEffect(() => { load(); }, []);

  if (loading) return <Card><div className="py-10 text-center text-stone-400 dark:text-zinc-600">…</div></Card>;
  if (error) return <Card><div className="py-6 text-center text-rose-600 dark:text-rose-400 text-sm">{error}</div></Card>;
  if (!data) return null;

  const k = data.kpis;
  const stickiness = k.mau > 0 ? Math.round((k.dau / k.mau) * 100) : 0;
  const consentRate = k.total_users > 0 ? Math.round((k.consented_users / k.total_users) * 100) : 0;
  const trialConv = k.trials_started > 0 ? Math.round((k.pro_users / k.trials_started) * 100) : 0;

  const pct = (n: number, d: number) => (d > 0 ? Math.round((n / d) * 100) : 0);
  const f = data.funnel;
  const funnelRows = [
    { label: he ? 'נרשמו' : 'Signed up', value: f.signed_up, of: f.signed_up },
    { label: he ? 'התנסו (שלחו הודעה)' : 'Activated (sent a message)', value: f.activated, of: f.signed_up },
    { label: he ? 'התחילו ניסיון' : 'Started trial', value: f.trial_started, of: f.signed_up },
    { label: he ? 'שילמו (פרו)' : 'Paid (Pro)', value: f.paid, of: f.signed_up },
  ];

  // Retention heatmap colour: indigo with opacity by %.
  const cellBg = (p: number) => {
    if (p <= 0) return 'rgba(99,102,241,0.06)';
    return `rgba(99,102,241,${(0.15 + (p / 100) * 0.85).toFixed(2)})`;
  };
  const maxOffset = Math.max(0, ...data.cohorts.map((c) => c.retention.length - 1));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <p className="text-sm text-stone-500 dark:text-zinc-500">
          {he ? 'מדדים, מגמות ושימור - מתוך מסד הנתונים שלך (כל המשתמשים).' : 'Metrics, trends & retention - from your own database (all users).'}
        </p>
        <button onClick={load} className="text-xs text-indigo-600 dark:text-indigo-400 hover:underline shrink-0">{he ? 'רענון' : 'Refresh'}</button>
      </div>

      {/* KPI grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Kpi label={he ? 'סך משתמשים' : 'Total users'} value={k.total_users} sub={he ? `+${k.new_users_7d} השבוע` : `+${k.new_users_7d} this week`} />
        <Kpi label={he ? 'פעילים יומי (DAU)' : 'Daily active (DAU)'} value={k.dau} />
        <Kpi label={he ? 'פעילים שבועי (WAU)' : 'Weekly active (WAU)'} value={k.wau} />
        <Kpi label={he ? 'פעילים חודשי (MAU)' : 'Monthly active (MAU)'} value={k.mau} />
        <Kpi label={he ? 'דביקות (DAU/MAU)' : 'Stickiness (DAU/MAU)'} value={`${stickiness}%`} sub={he ? 'כמה מהחודשיים חוזרים יומית' : 'how many monthly users return daily'} />
        <Kpi label={he ? 'מנויי פרו' : 'Pro subscribers'} value={k.pro_users} />
        <Kpi label={he ? 'בתקופת ניסיון' : 'On trial'} value={k.trial_users} />
        <Kpi label={he ? 'הכנסה חודשית (הערכה)' : 'Est. MRR'} value={`₪${data.revenue.est_mrr_nis.toLocaleString()}`} sub={he ? `${data.revenue.pro_users} × ₪99` : `${data.revenue.pro_users} × ₪99`} />
      </div>

      {/* Growth */}
      <Card>
        <SectionTitle hint={he ? 'משתמשים מצטברים ב-30 הימים האחרונים' : 'Cumulative users over the last 30 days'}>
          {he ? 'צמיחה' : 'Growth'}
        </SectionTitle>
        <Line data={data.daily.map((d) => d.cumulative_users)} />
        <Axis labels={data.daily.map((d) => d.day)} />
        <div className="mt-4">
          <div className="text-xs text-stone-500 dark:text-zinc-500 mb-2">{he ? 'הרשמות חדשות ליום' : 'New signups per day'}</div>
          <Bars data={data.daily.map((d) => ({ label: d.day, value: d.new_users }))} color="bg-emerald-500" />
          <Axis labels={data.daily.map((d) => d.day)} />
        </div>
      </Card>

      {/* Engagement */}
      <Card>
        <SectionTitle hint={he ? 'משתמשים פעילים והודעות ליום (30 ימים)' : 'Active users & messages per day (30 days)'}>
          {he ? 'מעורבות' : 'Engagement'}
        </SectionTitle>
        <div className="text-xs text-stone-500 dark:text-zinc-500 mb-2">{he ? 'משתמשים פעילים ליום' : 'Active users per day'}</div>
        <Bars data={data.daily.map((d) => ({ label: d.day, value: d.active_users }))} color="bg-indigo-500" />
        <Axis labels={data.daily.map((d) => d.day)} />
        <div className="mt-4">
          <div className="text-xs text-stone-500 dark:text-zinc-500 mb-2">{he ? 'הודעות ליום' : 'Messages per day'}</div>
          <Bars data={data.daily.map((d) => ({ label: d.day, value: d.messages }))} color="bg-sky-500" />
          <Axis labels={data.daily.map((d) => d.day)} />
        </div>
      </Card>

      {/* Weekly active breakdown - leave & return */}
      <Card>
        <SectionTitle hint={he ? 'מי חדש, מי חוזר, ומי חזר אחרי היעדרות - לפי שבוע' : 'New vs returning vs resurrected users, by week'}>
          {he ? 'עזיבה וחזרה' : 'Leave & return'}
        </SectionTitle>
        <div className="flex items-end gap-2 h-40">
          {data.weekly.map((w, i) => {
            const total = w.new + w.returning + w.resurrected;
            const max = Math.max(1, ...data.weekly.map((x) => x.new + x.returning + x.resurrected));
            const h = (v: number) => `${(v / max) * 100}%`;
            return (
              <div key={i} className="flex-1 flex flex-col items-center justify-end h-full group relative">
                <div className="absolute -top-4 opacity-0 group-hover:opacity-100 text-[10px] text-stone-600 dark:text-zinc-300 tabular-nums">{total}</div>
                <div className="w-full flex flex-col justify-end h-full">
                  <div className="w-full bg-emerald-500" style={{ height: h(w.new) }} title={`new ${w.new}`} />
                  <div className="w-full bg-indigo-500" style={{ height: h(w.returning) }} title={`returning ${w.returning}`} />
                  <div className="w-full bg-amber-500 rounded-b" style={{ height: h(w.resurrected) }} title={`resurrected ${w.resurrected}`} />
                </div>
              </div>
            );
          })}
        </div>
        <div className="flex justify-between mt-1 text-[10px] text-stone-400 dark:text-zinc-600">
          {data.weekly.map((w, i) => <span key={i}>{w.week}</span>)}
        </div>
        <div className="flex gap-4 mt-3 text-xs">
          <span className="inline-flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-sm bg-emerald-500" />{he ? 'חדשים' : 'New'}</span>
          <span className="inline-flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-sm bg-indigo-500" />{he ? 'חוזרים' : 'Returning'}</span>
          <span className="inline-flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-sm bg-amber-500" />{he ? 'שבו אחרי היעדרות' : 'Resurrected'}</span>
        </div>
      </Card>

      {/* Retention cohorts */}
      <Card>
        <SectionTitle hint={he ? 'מתוך כל קבוצת נרשמים (לפי שבוע), אחוז שחזר להיות פעיל כעבור שבוע, שבועיים וכו׳' : 'Of each weekly signup cohort, % still active N weeks later'}>
          {he ? 'שימור לפי קבוצות (Cohorts)' : 'Cohort retention'}
        </SectionTitle>
        <div className="overflow-x-auto">
          <table className="text-xs border-separate" style={{ borderSpacing: '3px' }}>
            <thead>
              <tr className="text-stone-400 dark:text-zinc-600">
                <th className="text-start font-medium px-2 py-1">{he ? 'קבוצה' : 'Cohort'}</th>
                <th className="font-medium px-2 py-1">{he ? 'גודל' : 'Size'}</th>
                {Array.from({ length: maxOffset + 1 }, (_, i) => (
                  <th key={i} className="font-medium px-1 py-1 w-12">W{i}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {data.cohorts.map((c, ci) => (
                <tr key={ci}>
                  <td className="px-2 py-1 text-stone-600 dark:text-zinc-400 whitespace-nowrap">{c.cohort}</td>
                  <td className="px-2 py-1 text-center text-stone-500 dark:text-zinc-500 tabular-nums">{c.size}</td>
                  {Array.from({ length: maxOffset + 1 }, (_, i) => {
                    const cell = c.retention.find((r) => r.offset === i);
                    if (!cell || c.size === 0) return <td key={i} className="w-12" />;
                    const p = Math.round((cell.retained / c.size) * 100);
                    return (
                      <td key={i} className="text-center rounded tabular-nums text-[11px] py-1 w-12"
                          style={{ background: cellBg(p), color: p > 55 ? '#fff' : 'inherit' }}
                          title={`${cell.retained}/${c.size}`}>
                        {p}%
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="text-[11px] text-stone-400 dark:text-zinc-600 mt-2">
          {he ? 'W0 = שבוע ההרשמה. נתונים מצטברים ככל שעובר הזמן.' : 'W0 = signup week. Fills in as time passes.'}
        </p>
      </Card>

      {/* Funnel */}
      <Card>
        <SectionTitle hint={he ? 'מהרשמה ועד תשלום' : 'From signup to paid'}>
          {he ? 'משפך המרה' : 'Conversion funnel'}
        </SectionTitle>
        <div className="space-y-2.5">
          {funnelRows.map((r, i) => (
            <div key={i}>
              <div className="flex justify-between text-xs mb-1">
                <span className="text-stone-600 dark:text-zinc-400">{r.label}</span>
                <span className="text-stone-500 dark:text-zinc-500 tabular-nums">{r.value} · {pct(r.value, r.of)}%</span>
              </div>
              <div className="h-6 rounded-md bg-stone-100 dark:bg-zinc-800 overflow-hidden">
                <div className="h-full bg-indigo-600 dark:bg-indigo-500 rounded-md transition-all" style={{ width: `${Math.max(2, pct(r.value, r.of))}%` }} />
              </div>
            </div>
          ))}
        </div>
        <div className="grid grid-cols-2 gap-3 mt-4">
          <div className="text-xs text-stone-500 dark:text-zinc-500">
            {he ? 'המרת ניסיון → תשלום' : 'Trial → paid conversion'}: <span className="font-semibold text-stone-800 dark:text-zinc-200">{trialConv}%</span>
          </div>
          <div className="text-xs text-stone-500 dark:text-zinc-500">
            {he ? 'אישרו דיוור' : 'Marketing consent'}: <span className="font-semibold text-stone-800 dark:text-zinc-200">{consentRate}%</span>
          </div>
        </div>
      </Card>
    </div>
  );
}
