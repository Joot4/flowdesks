import { Injectable } from '@angular/core';
import { set, get } from 'idb-keyval';
import { Assignment, AssignmentAttendance, AssignmentStatus, AssignmentWorkPhoto } from '../../shared/models/assignment.model';
import { supabase } from './supabase.client';

export interface AssignmentFilters {
  employeeProfileId?: string;
  locationId?: string;
  activityTypeId?: string;
  status?: AssignmentStatus;
}

export interface AssignmentInput {
  id?: string;
  employee_profile_id: string;
  start_at: string;
  end_at: string;
  location_id?: string | null;
  activity_type_id?: string | null;
  details?: string | null;
  recurrence_group_id?: string | null;
  qty_of_hour_days?: number | null;
  hourly_rate?: number | null;
  daily_rate?: number | null;
  fixed_wage?: number | null;
  expenses?: number | null;
  extras?: number | null;
  deductions?: number | null;
  total_amount?: number | null;
  status: AssignmentStatus;
}

export interface WorkPhotoMetadataInput {
  capturedAtIso?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  accuracyM?: number | null;
  headingDeg?: number | null;
  locationName?: string | null;
  locationAddress?: string | null;
  locationMapsUrl?: string | null;
}

@Injectable({ providedIn: 'root' })
export class AssignmentsService {
  private readonly cacheKey = 'calendar:last-assignments';

  async listByRange(startAt: string, endAt: string, filters?: AssignmentFilters): Promise<Assignment[]> {
    let query = supabase
      .from('assignments')
      .select('*, location:locations(id,name,address,state,maps_url), activity_type:activity_types(id,name)')
      // Range overlap: assignment starts before range end and ends after range start
      .lt('start_at', endAt)
      .gt('end_at', startAt)
      .order('start_at', { ascending: true });

    if (filters?.employeeProfileId) {
      query = query.eq('employee_profile_id', filters.employeeProfileId);
    }
    if (filters?.locationId) {
      query = query.eq('location_id', filters.locationId);
    }
    if (filters?.activityTypeId) {
      query = query.eq('activity_type_id', filters.activityTypeId);
    }
    if (filters?.status) {
      query = query.eq('status', filters.status);
    }

    const { data, error } = await query.returns<Assignment[]>();
    if (error) {
      throw error;
    }

    const assignmentIds = data.map((assignment) => assignment.id);

    let attendanceByAssignmentId = new Map<string, AssignmentAttendance>();
    let photosByAssignmentId = new Map<string, AssignmentWorkPhoto[]>();
    if (assignmentIds.length > 0) {
      const { data: attendances, error: attendanceError } = await supabase
        .from('assignment_attendances')
        .select('*')
        .in('assignment_id', assignmentIds)
        .returns<AssignmentAttendance[]>();

      if (attendanceError) {
        throw attendanceError;
      }

      attendanceByAssignmentId = new Map(attendances.map((attendance) => [attendance.assignment_id, attendance]));

      const { data: photos, error: photosError } = await supabase
        .from('assignment_work_photos')
        .select('*')
        .in('assignment_id', assignmentIds)
        .order('created_at', { ascending: false })
        .returns<AssignmentWorkPhoto[]>();

      if (photosError) {
        throw photosError;
      }

      for (const photo of photos) {
        const current = photosByAssignmentId.get(photo.assignment_id) ?? [];
        current.push(photo);
        photosByAssignmentId.set(photo.assignment_id, current);
      }
    }

    const normalized = data.map((assignment) => ({
      ...assignment,
      attendance: attendanceByAssignmentId.get(assignment.id) ?? null,
      work_photos: photosByAssignmentId.get(assignment.id) ?? []
    }));

    await set(this.cacheKey, normalized);
    return normalized;
  }

  async readCachedAssignments(): Promise<Assignment[]> {
    const data = await get<Assignment[]>(this.cacheKey);
    return data ?? [];
  }

  async upsert(input: AssignmentInput): Promise<void> {
    const payload = {
      id: input.id,
      employee_profile_id: input.employee_profile_id,
      start_at: input.start_at,
      end_at: input.end_at,
      location_id: input.location_id ?? null,
      activity_type_id: input.activity_type_id ?? null,
      details: input.details ?? null,
      recurrence_group_id: input.recurrence_group_id ?? null,
      qty_of_hour_days: input.qty_of_hour_days ?? null,
      hourly_rate: input.hourly_rate ?? null,
      daily_rate: input.daily_rate ?? null,
      fixed_wage: input.fixed_wage ?? null,
      expenses: input.expenses ?? null,
      extras: input.extras ?? null,
      deductions: input.deductions ?? null,
      total_amount: input.total_amount ?? null,
      status: input.status
    };

    const { error } = await supabase.from('assignments').upsert(payload);
    if (error) {
      throw error;
    }
  }

  async updateDates(id: string, startAt: string, endAt: string): Promise<void> {
    const { error } = await supabase.from('assignments').update({ start_at: startAt, end_at: endAt }).eq('id', id);
    if (error) {
      throw error;
    }
  }

  async delete(id: string): Promise<void> {
    const { error } = await supabase.from('assignments').delete().eq('id', id);
    if (error) {
      throw error;
    }
  }

  async deleteByRecurrenceGroup(recurrenceGroupId: string): Promise<void> {
    const { error } = await supabase.from('assignments').delete().eq('recurrence_group_id', recurrenceGroupId);
    if (error) {
      throw error;
    }
  }

  async updateByRecurrenceGroup(recurrenceGroupId: string, input: Omit<AssignmentInput, 'id' | 'start_at' | 'end_at'>): Promise<void> {
    const payload = {
      employee_profile_id: input.employee_profile_id,
      location_id: input.location_id ?? null,
      activity_type_id: input.activity_type_id ?? null,
      details: input.details ?? null,
      recurrence_group_id: input.recurrence_group_id ?? null,
      qty_of_hour_days: input.qty_of_hour_days ?? null,
      hourly_rate: input.hourly_rate ?? null,
      daily_rate: input.daily_rate ?? null,
      fixed_wage: input.fixed_wage ?? null,
      expenses: input.expenses ?? null,
      extras: input.extras ?? null,
      deductions: input.deductions ?? null,
      total_amount: input.total_amount ?? null,
      status: input.status
    };

    const { error } = await supabase.from('assignments').update(payload).eq('recurrence_group_id', recurrenceGroupId);
    if (error) {
      throw error;
    }
  }

  async reassign(assignmentId: string, toEmployeeProfileId: string, reason: string): Promise<Assignment> {
    const { data, error } = await supabase.rpc('reassign_assignment', {
      p_assignment_id: assignmentId,
      p_to_employee_profile_id: toEmployeeProfileId,
      p_reason: reason
    });

    if (error) {
      throw error;
    }

    return data as Assignment;
  }

  async uploadAttendancePhoto(assignmentId: string, action: 'IN' | 'OUT', file: File): Promise<string> {
    const phase = action === 'IN' ? 'BEFORE' : 'AFTER';
    return this.uploadWorkPhoto(assignmentId, phase, file);
  }

  async uploadWorkPhoto(assignmentId: string, phase: 'BEFORE' | 'AFTER', file: File): Promise<string> {
    const { data: authData, error: userError } = await supabase.auth.getUser();
    if (userError || !authData.user) {
      throw userError ?? new Error('Usuario nao autenticado.');
    }

    const ext = file.name.split('.').pop()?.toLowerCase() ?? 'jpg';
    const safeExt = ['jpg', 'jpeg', 'png', 'webp'].includes(ext) ? ext : 'jpg';
    const stage = phase === 'BEFORE' ? 'before' : 'after';
    const path = `${authData.user.id}/${assignmentId}/${stage}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${safeExt}`;

    const { error } = await supabase.storage.from('assignment-evidences').upload(path, file, {
      upsert: true,
      contentType: file.type || 'image/jpeg'
    });

    if (error) {
      throw error;
    }

    const publicUrl = supabase.storage.from('assignment-evidences').getPublicUrl(path).data.publicUrl;
    return publicUrl;
  }

  async saveWorkPhoto(
    assignmentId: string,
    phase: 'BEFORE' | 'AFTER',
    photoUrl: string,
    metadata?: WorkPhotoMetadataInput
  ): Promise<void> {
    const { data: authData, error: userError } = await supabase.auth.getUser();
    if (userError || !authData.user) {
      throw userError ?? new Error('Usuario nao autenticado.');
    }

    const { error } = await supabase.from('assignment_work_photos').insert({
      assignment_id: assignmentId,
      employee_profile_id: authData.user.id,
      phase,
      photo_url: photoUrl,
      captured_at: metadata?.capturedAtIso ?? null,
      latitude: metadata?.latitude ?? null,
      longitude: metadata?.longitude ?? null,
      accuracy_m: metadata?.accuracyM ?? null,
      heading_deg: metadata?.headingDeg ?? null,
      location_name: metadata?.locationName ?? null,
      location_address: metadata?.locationAddress ?? null,
      location_maps_url: metadata?.locationMapsUrl ?? null
    });

    if (error) {
      throw error;
    }
  }

  async deleteWorkPhoto(photoId: string, photoUrl: string): Promise<void> {
    const { error } = await supabase.from('assignment_work_photos').delete().eq('id', photoId);
    if (error) {
      throw error;
    }

    const path = this.extractEvidencePathFromPublicUrl(photoUrl);
    if (!path) {
      return;
    }

    const { error: storageError } = await supabase.storage.from('assignment-evidences').remove([path]);
    if (storageError) {
      // Keep DB deletion as source of truth; storage cleanup is best effort.
      console.warn('Failed to remove storage object for work photo', storageError);
    }
  }

  async punch(
    assignmentId: string,
    action: 'IN' | 'OUT',
    photoUrl?: string,
    geo?: { lat: number; lng: number; accuracyM?: number }
  ): Promise<void> {
    const { error } = await supabase.rpc('punch_assignment', {
      p_assignment_id: assignmentId,
      p_action: action,
      p_photo_url: photoUrl ?? null,
      p_lat: geo?.lat ?? null,
      p_lng: geo?.lng ?? null,
      p_accuracy_m: geo?.accuracyM ?? null
    });

    if (error) {
      throw error;
    }
  }

  private extractEvidencePathFromPublicUrl(publicUrl: string): string | null {
    const marker = '/storage/v1/object/public/assignment-evidences/';
    const idx = publicUrl.indexOf(marker);
    if (idx < 0) {
      return null;
    }
    const rawPath = publicUrl.slice(idx + marker.length);
    try {
      return decodeURIComponent(rawPath);
    } catch {
      return rawPath;
    }
  }
}
