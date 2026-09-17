// Haptic feedback utilities using standard Web Vibration API

export function hapticLight(): void {
  if (typeof window !== 'undefined' && 'navigator' in window && navigator.vibrate) {
    try {
      navigator.vibrate(10);
    } catch {
      // Ignore vibration errors if blocked by browser policy
    }
  }
}

export function hapticSuccess(): void {
  if (typeof window !== 'undefined' && 'navigator' in window && navigator.vibrate) {
    try {
      navigator.vibrate([15, 40, 20]);
    } catch {
      // Ignore
    }
  }
}

export function hapticSelection(): void {
  if (typeof window !== 'undefined' && 'navigator' in window && navigator.vibrate) {
    try {
      navigator.vibrate(12);
    } catch {
      // Ignore
    }
  }
}

export function hapticWarning(): void {
  if (typeof window !== 'undefined' && 'navigator' in window && navigator.vibrate) {
    try {
      navigator.vibrate([30, 50, 30]);
    } catch {
      // Ignore
    }
  }
}
