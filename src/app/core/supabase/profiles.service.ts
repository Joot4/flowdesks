import { Injectable } from '@angular/core';
import { supabase } from './supabase.client';
import { Profile } from '../../shared/models/assignment.model';

@Injectable({ providedIn: 'root' })
export class ProfilesService {
  async getMyProfile(): Promise<Profile | null> {
    const user = await supabase.auth.getUser();
    const userId = user.data.user?.id;
    if (!userId) {
      return null;
    }

    const { data, error } = await supabase.from('profiles').select('*').eq('id', userId).maybeSingle<Profile>();
    if (error) {
      throw error;
    }
    return data;
  }

  async listAdmins(): Promise<Profile[]> {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('role', 'ADMIN')
      .order('full_name', { ascending: true })
      .returns<Profile[]>();

    if (error) {
      throw error;
    }

    return data;
  }

  async updateOwnName(fullName: string): Promise<void> {
    const { error } = await supabase.from('profiles').update({ full_name: fullName }).eq('id', (await supabase.auth.getUser()).data.user?.id ?? '');
    if (error) {
      throw error;
    }
  }

  async updatePassword(newPassword: string): Promise<void> {
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    if (error) {
      throw error;
    }
  }
}
