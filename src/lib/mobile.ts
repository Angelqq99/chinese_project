import { Capacitor } from '@capacitor/core';
import { App } from '@capacitor/app';
import { Haptics } from '@capacitor/haptics';
import { useEffect, useRef } from 'react';

/** Keep a single native listener while letting it read the current screen. */
export function useAndroidBack(onBack: () => boolean) {
  const handler = useRef(onBack);
  handler.current = onBack;

  useEffect(() => {
    if (Capacitor.getPlatform() !== 'android') return;
    const listener = App.addListener('backButton', () => {
      // Returning false means we're already on the home screen.
      if (!handler.current()) void App.minimizeApp();
    });
    return () => { void listener.then(handle => handle.remove()); };
  }, []);
}

export function buzz(duration: number) {
  if (Capacitor.isNativePlatform()) {
    void Haptics.vibrate({ duration }).catch(() => { /* optional hardware */ });
  } else {
    try { navigator.vibrate?.(duration); } catch { /* optional browser API */ }
  }
}
