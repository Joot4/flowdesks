import { Injectable } from '@angular/core';
import { Assignment, AttendanceAdjustmentRequest } from '../../shared/models/assignment.model';
import { supabase } from './supabase.client';

export interface AttendanceAdjustmentRequestView extends AttendanceAdjustmentRequest {
  assignment?: Pick<Assignment, 'id' | 'start_at' | 'end_at' | 'employee_profile_id'> & {
    activity_type?: { name: string } | null;
    location?: { name: string } | null;
  };
}

@Injectable({ providedIn: 'root' })
export class AttendanceRequestsService {
  async createRequest(input: { assignmentId: string; requestType: 'IN' | 'OUT'; requestedTimeIso: string; reason: string }): Promise<void> {
    const { data: authData, error: authError } = await supabase.auth.getUser();
    if (authError || !authData.user) {
      throw authError ?? new Error('Usuario nao autenticado.');
    }

    const { error } = await supabase.from('assignment_attendance_requests').insert({
      assignment_id: input.assignmentId,
      employee_profile_id: authData.user.id,
      request_type: input.requestType,
      requested_time: input.requestedTimeIso,
      reason: input.reason || null
    });

    if (error) {
      throw error;
    }
  }

  async listPending(): Promise<AttendanceAdjustmentRequestView[]> {
    const { data, error } = await supabase
      .from('assignment_attendance_requests')
      .select('*')
      .eq('status', 'PENDING')
      .order('created_at', { ascending: true })
      .returns<AttendanceAdjustmentRequest[]>();

    if (error) {
      throw error;
    }

    const assignmentIds = data.map((item) => item.assignment_id);
    let assignmentsById = new Map<string, AttendanceAdjustmentRequestView['assignment']>();
    if (assignmentIds.length > 0) {
      const { data: assignments, error: assignmentsError } = await supabase
        .from('assignments')
        .select('id,start_at,end_at,employee_profile_id,activity_type:activity_types(name),location:locations(name)')
        .in('id', assignmentIds)
        .returns<
          Array<
            Pick<Assignment, 'id' | 'start_at' | 'end_at' | 'employee_profile_id'> & {
              activity_type?: { name: string } | null;
              location?: { name: string } | null;
            }
          >
        >();

      if (assignmentsError) {
        throw assignmentsError;
      }

      assignmentsById = new Map(assignments.map((item) => [item.id, item]));
    }

    return data.map((item) => ({
      ...item,
      assignment: assignmentsById.get(item.assignment_id)
    }));
  }

  async listMine(): Promise<AttendanceAdjustmentRequestView[]> {
    const { data: authData, error: authError } = await supabase.auth.getUser();
    if (authError || !authData.user) {
      throw authError ?? new Error('Usuario nao autenticado.');
    }

    const { data, error } = await supabase
      .from('assignment_attendance_requests')
      .select('*')
      .eq('employee_profile_id', authData.user.id)
      .order('created_at', { ascending: false })
      .returns<AttendanceAdjustmentRequest[]>();

    if (error) {
      throw error;
    }

    const assignmentIds = data.map((item) => item.assignment_id);
    let assignmentsById = new Map<string, AttendanceAdjustmentRequestView['assignment']>();
    if (assignmentIds.length > 0) {
      const { data: assignments, error: assignmentsError } = await supabase
        .from('assignments')
        .select('id,start_at,end_at,employee_profile_id,activity_type:activity_types(name),location:locations(name)')
        .in('id', assignmentIds)
        .returns<
          Array<
            Pick<Assignment, 'id' | 'start_at' | 'end_at' | 'employee_profile_id'> & {
              activity_type?: { name: string } | null;
              location?: { name: string } | null;
            }
          >
        >();

      if (assignmentsError) {
        throw assignmentsError;
      }

      assignmentsById = new Map(assignments.map((item) => [item.id, item]));
    }

    return data.map((item) => ({
      ...item,
      assignment: assignmentsById.get(item.assignment_id)
    }));
  }

  async reviewRequest(requestId: string, approve: boolean, reviewNote?: string): Promise<void> {
    const { error } = await supabase.rpc('review_attendance_request', {
      p_request_id: requestId,
      p_approve: approve,
      p_review_note: reviewNote ?? null
    });

    if (error) {
      throw error;
    }
  }
}
