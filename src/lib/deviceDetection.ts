export const isMobileDevice = (): boolean => {
  if (typeof window === 'undefined') return false;

  const userAgent = navigator.userAgent || navigator.vendor || (window as any).opera;

  // Check for mobile devices
  const mobileRegex = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i;
  const isMobileUA = mobileRegex.test(userAgent);

  // Check screen size (consider anything under 768px as mobile)
  const isMobileScreen = window.innerWidth < 768;

  // Check for touch support
  const hasTouch = 'ontouchstart' in window || navigator.maxTouchPoints > 0;

  // Consider it mobile if it matches UA or has small screen with touch
  return isMobileUA || (isMobileScreen && hasTouch);
};

export const isTabletDevice = (): boolean => {
  if (typeof window === 'undefined') return false;

  const userAgent = navigator.userAgent || navigator.vendor;

  // Check for iPad or Android tablets
  const isIPad = /iPad/i.test(userAgent);
  const isAndroidTablet = /Android/i.test(userAgent) && !/Mobile/i.test(userAgent);

  // Check screen size (tablets are typically 768px - 1024px)
  const isTabletScreen = window.innerWidth >= 768 && window.innerWidth <= 1024;

  return isIPad || isAndroidTablet || isTabletScreen;
};

export const getDeviceType = (): 'mobile' | 'tablet' | 'desktop' => {
  if (isMobileDevice() && !isTabletDevice()) return 'mobile';
  if (isTabletDevice()) return 'tablet';
  return 'desktop';
};
