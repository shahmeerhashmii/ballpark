import React, { useEffect, useState } from 'react';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export const InstallPrompt: React.FC = () => {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showAndroidPrompt, setShowAndroidPrompt] = useState<boolean>(false);
  const [showIosPrompt, setShowIosPrompt] = useState<boolean>(false);

  useEffect(() => {
    // Check if running in standalone mode (already installed)
    const isStandalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as unknown as { standalone?: boolean }).standalone === true;

    if (isStandalone) {
      return;
    }

    // Android / Chromium beforeinstallprompt
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      setShowAndroidPrompt(true);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    // iOS Safari detection
    const isIos = /iphone|ipad|ipod/.test(window.navigator.userAgent.toLowerCase());
    const isSafari =
      /safari/.test(window.navigator.userAgent.toLowerCase()) &&
      !/chrome|crios|firefox|fxios/.test(window.navigator.userAgent.toLowerCase());
    const hasSeenIosTip = localStorage.getItem('ballpark_seen_ios_install_tip');

    if (isIos && isSafari && !hasSeenIosTip) {
      setShowIosPrompt(true);
    }

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;
    await deferredPrompt.prompt();
    const choice = await deferredPrompt.userChoice;
    if (choice.outcome === 'accepted') {
      setShowAndroidPrompt(false);
    }
    setDeferredPrompt(null);
  };

  const dismissIosPrompt = () => {
    setShowIosPrompt(false);
    localStorage.setItem('ballpark_seen_ios_install_tip', 'true');
  };

  if (showAndroidPrompt) {
    return (
      <div className="install-banner">
        <span className="install-banner-text">Install Ballpark for the full stadium experience</span>
        <button type="button" className="install-banner-btn" onClick={handleInstallClick}>
          Install App
        </button>
      </div>
    );
  }

  if (showIosPrompt) {
    return (
      <div className="install-banner ios-banner">
        <div className="ios-banner-text">
          <span>Tap </span>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ display: 'inline', verticalAlign: 'middle', margin: '0 2px' }}>
            <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"></path>
            <polyline points="16 6 12 2 8 6"></polyline>
            <line x1="12" y1="2" x2="12" y2="15"></line>
          </svg>
          <span> then <strong>Add to Home Screen</strong> to install Ballpark.</span>
        </div>
        <button type="button" className="ios-banner-close" onClick={dismissIosPrompt} aria-label="Dismiss">
          ✕
        </button>
      </div>
    );
  }

  return null;
};
