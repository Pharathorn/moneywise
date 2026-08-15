const ENABLED_KEY = 'moneywise-notifications-enabled';

export function areNotificationsEnabled(): boolean {
  return (
    typeof Notification !== 'undefined' &&
    Notification.permission === 'granted' &&
    localStorage.getItem(ENABLED_KEY) === 'true'
  );
}

export function getNotificationPermission(): NotificationPermission | 'unsupported' {
  if (typeof Notification === 'undefined') return 'unsupported';
  return Notification.permission;
}

export function setNotificationsEnabled(enabled: boolean): void {
  localStorage.setItem(ENABLED_KEY, enabled ? 'true' : 'false');
}

export async function requestNotificationPermission(): Promise<boolean> {
  if (typeof Notification === 'undefined') return false;
  if (Notification.permission === 'granted') {
    setNotificationsEnabled(true);
    return true;
  }
  const result = await Notification.requestPermission();
  const granted = result === 'granted';
  setNotificationsEnabled(granted);
  return granted;
}

export async function showLocalNotification(title: string, body: string, tag: string): Promise<void> {
  if (!areNotificationsEnabled()) return;
  if ('serviceWorker' in navigator) {
    const reg = await navigator.serviceWorker.ready;
    reg.showNotification(title, { body, icon: '/favicon.png', tag });
  } else {
    new Notification(title, { body, tag });
  }
}
