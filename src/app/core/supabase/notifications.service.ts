import { Injectable } from '@angular/core';
import { RealtimeChannel } from '@supabase/supabase-js';
import { ToastService } from '../ui/toast.service';
import { PwaNotificationService } from '../ui/pwa-notification.service';
import { supabase } from './supabase.client';

interface NotificationRow {
  id: string;
  user_id: string;
  title: string;
  message: string;
  is_read: boolean;
  created_at: string;
}

@Injectable({ providedIn: 'root' })
export class NotificationsService {
  private channel: RealtimeChannel | null = null;

  constructor(
    private readonly toastService: ToastService,
    private readonly pwaNotificationService: PwaNotificationService
  ) {}

  async startForCurrentUser(): Promise<void> {
    const { data } = await supabase.auth.getUser();
    const userId = data.user?.id;
    if (!userId) {
      return;
    }

    await this.pwaNotificationService.requestPermission();
    await this.flushUnread(userId);

    if (this.channel) {
      await supabase.removeChannel(this.channel);
      this.channel = null;
    }

    this.channel = supabase
      .channel(`notifications:${userId}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'notifications', filter: `user_id=eq.${userId}` }, (payload) => {
        const row = payload.new as NotificationRow;
        this.toastService.info(row.message);
        void this.pwaNotificationService.notify(row.title, row.message);
        void this.markAsRead(row.id);
      })
      .subscribe();
  }

  async stop(): Promise<void> {
    if (!this.channel) {
      return;
    }
    await supabase.removeChannel(this.channel);
    this.channel = null;
  }

  private async flushUnread(userId: string): Promise<void> {
    const { data, error } = await supabase
      .from('notifications')
      .select('id,title,message,user_id,is_read,created_at')
      .eq('user_id', userId)
      .eq('is_read', false)
      .order('created_at', { ascending: true })
      .limit(10)
      .returns<NotificationRow[]>();

    if (error || !data?.length) {
      return;
    }

    for (const notification of data) {
      this.toastService.info(notification.message);
      await this.pwaNotificationService.notify(notification.title, notification.message);
      await this.markAsRead(notification.id);
    }
  }

  private async markAsRead(notificationId: string): Promise<void> {
    await supabase.from('notifications').update({ is_read: true }).eq('id', notificationId);
  }
}
