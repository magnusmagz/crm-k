import React, { useState, useEffect } from 'react';

const InstallPWAPrompt: React.FC = () => {
  const [showPrompt, setShowPrompt] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);

  useEffect(() => {
    // Check if already dismissed
    const dismissed = localStorage.getItem('pwa-install-dismissed');
    if (dismissed === 'true') {
      return;
    }

    // Detect if running as installed PWA
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches
      || (window.navigator as any).standalone
      || document.referrer.includes('android-app://');

    if (isStandalone) {
      // Already installed as PWA, don't show prompt
      return;
    }

    // Detect if Safari on iOS
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
    const isSafari = /Safari/.test(navigator.userAgent) && !/Chrome|CriOS|FxiOS|EdgiOS/.test(navigator.userAgent);

    // Detect if mobile device
    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);

    // Show prompt for iOS Safari on mobile
    if (isIOS && isSafari && isMobile) {
      setShowPrompt(true);
      return;
    }

    // Handle beforeinstallprompt for other browsers (Android Chrome, etc.)
    const handleBeforeInstallPrompt = (e: Event) => {
      // Prevent the mini-infobar from appearing on mobile
      e.preventDefault();
      // Stash the event so it can be triggered later
      setDeferredPrompt(e);
      setShowPrompt(true);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstallClick = async () => {
    if (deferredPrompt) {
      // Show the install prompt
      deferredPrompt.prompt();

      // Wait for the user to respond to the prompt
      const { outcome } = await deferredPrompt.userChoice;
      console.log(`User response to the install prompt: ${outcome}`);

      // Clear the deferredPrompt
      setDeferredPrompt(null);
    }

    // Hide the prompt
    setShowPrompt(false);
  };

  const handleDismiss = () => {
    localStorage.setItem('pwa-install-dismissed', 'true');
    setShowPrompt(false);
  };

  if (!showPrompt) {
    return null;
  }

  // Detect if iOS for different install instructions
  const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);

  return (
    <div
      className="fixed bottom-0 left-0 right-0 bg-white dark:bg-gray-800 border-t-2 border-primary shadow-lg z-50 animate-slide-up"
      style={{
        animation: 'slideUp 0.3s ease-out'
      }}
    >
      <div className="max-w-md mx-auto p-4">
        <div className="flex items-start space-x-3">
          <div className="flex-shrink-0">
            <svg
              className="w-10 h-10 text-primary"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z"
              />
            </svg>
          </div>

          <div className="flex-1 min-w-0">
            <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-1">
              Install CRM App
            </h3>
            <p className="text-xs text-gray-600 dark:text-gray-300 mb-3">
              {isIOS
                ? 'Install this app for the best experience and to receive reminder notifications. Tap the Share button below and select "Add to Home Screen".'
                : 'Install this app for the best experience and reminder notifications.'
              }
            </p>

            <div className="flex space-x-2">
              {!isIOS && (
                <button
                  onClick={handleInstallClick}
                  className="flex-1 bg-primary text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-primary-dark transition-colors"
                >
                  Install
                </button>
              )}
              <button
                onClick={handleDismiss}
                className={`${isIOS ? 'flex-1' : 'flex-shrink-0'} bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 px-4 py-2 rounded-md text-sm font-medium hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors`}
              >
                {isIOS ? 'Got it' : 'Dismiss'}
              </button>
            </div>
          </div>

          <button
            onClick={handleDismiss}
            className="flex-shrink-0 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
            aria-label="Close"
          >
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
              <path
                fillRule="evenodd"
                d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                clipRule="evenodd"
              />
            </svg>
          </button>
        </div>
      </div>

      <style>{`
        @keyframes slideUp {
          from {
            transform: translateY(100%);
            opacity: 0;
          }
          to {
            transform: translateY(0);
            opacity: 1;
          }
        }
      `}</style>
    </div>
  );
};

export default InstallPWAPrompt;
