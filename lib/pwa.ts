'use client';

import { useEffect, useState } from 'react';

export type OS = 'ios' | 'android' | 'mac' | 'windows' | 'other';
export type Browser = 'safari' | 'chrome' | 'edge' | 'firefox' | 'samsung' | 'other';
export type Platform = { os: OS; browser: Browser; isStandalone: boolean };

export function detectPlatform(): Platform {
  if (typeof navigator === 'undefined' || typeof window === 'undefined') {
    return { os: 'other', browser: 'other', isStandalone: false };
  }
  const ua = navigator.userAgent;
  const isStandalone =
    window.matchMedia?.('(display-mode: standalone)').matches === true ||
    // iOS Safari "added to home screen"
    (navigator as unknown as { standalone?: boolean }).standalone === true;

  // iPadOS 13+ masquerades as Mac — detect via touch points.
  const iPadOS = navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1;
  const isIOS = /iPhone|iPad|iPod/.test(ua) || iPadOS;

  let os: OS = 'other';
  if (isIOS) os = 'ios';
  else if (/Android/.test(ua)) os = 'android';
  else if (/Macintosh|Mac OS X/.test(ua)) os = 'mac';
  else if (/Windows/.test(ua)) os = 'windows';

  let browser: Browser = 'other';
  if (/SamsungBrowser/.test(ua)) browser = 'samsung';
  else if (/Edg\//.test(ua)) browser = 'edge';
  else if (/Firefox\//.test(ua) || /FxiOS/.test(ua)) browser = 'firefox';
  else if (/CriOS/.test(ua)) browser = 'chrome'; // Chrome on iOS
  else if (/Chrome\//.test(ua)) browser = 'chrome';
  else if (/Safari\//.test(ua) && !/Chrome/.test(ua)) browser = 'safari';

  return { os, browser, isStandalone };
}

type BIPEvent = Event & { prompt: () => void; userChoice: Promise<{ outcome: string }> };

// Capture the (one-shot) beforeinstallprompt event as early as possible — it can
// fire before any component mounts, so we stash it at module scope.
let deferredPrompt: BIPEvent | null = null;
if (typeof window !== 'undefined') {
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredPrompt = e as BIPEvent;
    window.dispatchEvent(new Event('pwa:bip'));
  });
  window.addEventListener('appinstalled', () => {
    deferredPrompt = null;
    window.dispatchEvent(new Event('pwa:installed'));
  });
}

export function usePwaInstall() {
  const [platform, setPlatform] = useState<Platform | null>(null);
  const [canPrompt, setCanPrompt] = useState(false);

  useEffect(() => {
    setPlatform(detectPlatform());
    setCanPrompt(!!deferredPrompt);
    const onBip = () => setCanPrompt(true);
    const onInstalled = () => { setCanPrompt(false); setPlatform(detectPlatform()); };
    window.addEventListener('pwa:bip', onBip);
    window.addEventListener('pwa:installed', onInstalled);
    return () => {
      window.removeEventListener('pwa:bip', onBip);
      window.removeEventListener('pwa:installed', onInstalled);
    };
  }, []);

  async function promptInstall(): Promise<boolean> {
    if (!deferredPrompt) return false;
    deferredPrompt.prompt();
    const choice = await deferredPrompt.userChoice.catch(() => ({ outcome: 'dismissed' }));
    deferredPrompt = null;
    setCanPrompt(false);
    return choice.outcome === 'accepted';
  }

  return { platform, canPrompt, promptInstall };
}

// Per-platform, human instructions for installing to the home screen / desktop.
export function installGuide(p: Platform | null, canPrompt: boolean, he: boolean): { headline: string; steps: string[] } {
  if (canPrompt) {
    return he
      ? { headline: 'התקנה בלחיצה אחת', steps: ['לחצ/י על "התקנה" ותאשר/י — קופלAI ייפתח כאפליקציה משלו.'] }
      : { headline: 'One-tap install', steps: ['Tap "Install" and confirm — KopelAi opens as its own app.'] };
  }
  const os = p?.os ?? 'other';
  const browser = p?.browser ?? 'other';

  if (os === 'ios') {
    if (browser === 'safari') {
      return he
        ? { headline: 'התקנה ב-iPhone / iPad', steps: ['לחצ/י על כפתור השיתוף (הריבוע עם החץ למעלה) בתחתית המסך.', 'גלול/י ובחר/י "הוסף למסך הבית" (Add to Home Screen).', 'לחצ/י "הוסף" — והאייקון יופיע על המסך כמו אפליקציה.'] }
        : { headline: 'Install on iPhone / iPad', steps: ['Tap the Share button (square with an up-arrow) at the bottom.', 'Scroll and choose "Add to Home Screen".', 'Tap "Add" — the icon appears on your home screen like an app.'] };
    }
    return he
      ? { headline: 'התקנה ב-iPhone / iPad', steps: ['פתח/י את kopelai.com בדפדפן Safari (חובה ל-iOS).', 'לחצ/י על כפתור השיתוף ← "הוסף למסך הבית".'] }
      : { headline: 'Install on iPhone / iPad', steps: ['Open kopelai.com in Safari (required on iOS).', 'Tap Share → "Add to Home Screen".'] };
  }

  if (os === 'android') {
    return he
      ? { headline: 'התקנה ב-Android', steps: ['פתח/י את תפריט הדפדפן (⋮ בפינה).', 'בחר/י "התקן אפליקציה" או "הוסף למסך הבית".', 'אשר/י — קופלAI ייפתח כאפליקציה.'] }
      : { headline: 'Install on Android', steps: ['Open the browser menu (⋮ in the corner).', 'Choose "Install app" or "Add to Home screen".', 'Confirm — KopelAi opens as an app.'] };
  }

  if (os === 'mac' && browser === 'safari') {
    return he
      ? { headline: 'התקנה ב-Mac (Safari)', steps: ['בתפריט העליון: קובץ (File) ← "הוסף ל-Dock" (Add to Dock).', 'קופלAI ייפתח כאפליקציה מה-Dock.'] }
      : { headline: 'Install on Mac (Safari)', steps: ['Top menu: File → "Add to Dock".', 'KopelAi opens as an app from your Dock.'] };
  }

  if (os === 'mac' || os === 'windows') {
    return he
      ? { headline: 'התקנה במחשב', steps: ['בשורת הכתובת מימין, לחצ/י על אייקון ההתקנה (מסך עם חץ/⊕).', 'או: תפריט הדפדפן ← "התקן את KopelAi…".', 'אשר/י — קופלAI ייפתח בחלון משלו.'] }
      : { headline: 'Install on desktop', steps: ['In the address bar, click the install icon (a monitor with an arrow / ⊕).', 'Or: browser menu → "Install KopelAi…".', 'Confirm — KopelAi opens in its own window.'] };
  }

  return he
    ? { headline: 'התקנה כאפליקציה', steps: ['בתפריט הדפדפן חפש/י "התקן אפליקציה" או "הוסף למסך הבית".'] }
    : { headline: 'Install as an app', steps: ['In your browser menu, look for "Install app" or "Add to Home screen".'] };
}
