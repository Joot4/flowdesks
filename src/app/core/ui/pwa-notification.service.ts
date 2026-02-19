import { Injectable } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class PwaNotificationService {
  async requestPermission(): Promise<NotificationPermission> {
    if (!('Notification' in window)) {
      return 'denied';
    }

    if (Notification.permission === 'granted') {
      return 'granted';
    }

    return Notification.requestPermission();
  }

  async notify(title: string, body: string): Promise<void> {
    if (!('Notification' in window)) {
      return;
    }

    const permission = await this.requestPermission();
    if (permission !== 'granted') {
      return;
    }

    if ('serviceWorker' in navigator) {
      const registration = await navigator.serviceWorker.getRegistration();
      if (registration) {
        await registration.showNotification(title, {
          body,
          icon: 'assets/icons/icon-192x192.png',
          badge: 'assets/icons/icon-192x192.png',
          tag: `calendar-${Date.now()}`
        });
        return;
      }
    }

    new Notification(title, {
      body,
      icon: 'assets/icons/icon-192x192.png'
    });
  }
}
