import { Injectable } from '@angular/core';
import { supabase } from './supabase.client';
import { Employee, Profile } from '../../shared/models/assignment.model';

export interface CollaboratorInput {
  email?: string;
  password?: string;
  full_name: string;
  employee_code?: string;
  phone?: string;
  job_title?: string;
}

interface CreateCollaboratorResponse {
  id: string;
  email_sent: boolean;
  email_error?: string;
}

export interface CollaboratorView {
  profile: Profile;
  employee: Employee | null;
}

@Injectable({ providedIn: 'root' })
export class EmployeesService {
  async createCollaborator(input: CollaboratorInput): Promise<CreateCollaboratorResponse> {
    if (!input.email) {
      throw new Error('Email e obrigatorio para criar colaborador.');
    }

    if (!input.password) {
      throw new Error('Senha e obrigatoria para criar colaborador.');
    }

    const { data, error } = await supabase.functions.invoke('create-collaborator', {
      body: {
        email: input.email,
        password: input.password,
        full_name: input.full_name,
        employee_code: input.employee_code ?? null,
        phone: input.phone ?? null,
        job_title: input.job_title ?? null
      }
    });

    if (error) {
      throw error;
    }

    return data as CreateCollaboratorResponse;
  }

  async getMyEmployee(): Promise<Employee | null> {
    const { data: userData, error: userError } = await supabase.auth.getUser();
    if (userError) {
      throw userError;
    }

    const userId = userData.user?.id;
    if (!userId) {
      return null;
    }

    const { data, error } = await supabase.from('employees').select('*').eq('profile_id', userId).maybeSingle<Employee>();
    if (error) {
      throw error;
    }

    return data;
  }

  async listCollaborators(): Promise<CollaboratorView[]> {
    const { data: profiles, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('role', 'COLLABORATOR')
      .eq('active', true)
      .order('full_name', { ascending: true })
      .returns<Profile[]>();

    if (profileError) {
      throw profileError;
    }

    const ids = profiles.map((p) => p.id);
    const { data: employees, error: employeeError } = await supabase
      .from('employees')
      .select('*')
      .in('profile_id', ids.length ? ids : [''])
      .returns<Employee[]>();

    if (employeeError) {
      throw employeeError;
    }

    return profiles.map((profile) => ({
      profile,
      employee: employees.find((employee) => employee.profile_id === profile.id) ?? null
    }));
  }

  async updateCollaborator(profileId: string, input: CollaboratorInput): Promise<void> {
    const { error: profileError } = await supabase.from('profiles').update({ full_name: input.full_name }).eq('id', profileId);
    if (profileError) {
      throw profileError;
    }

    const { data: existing, error: selectError } = await supabase
      .from('employees')
      .select('*')
      .eq('profile_id', profileId)
      .maybeSingle<Employee>();

    if (selectError) {
      throw selectError;
    }

    if (!existing) {
      const { error } = await supabase.from('employees').insert({
        profile_id: profileId,
        employee_code: input.employee_code ?? null,
        phone: input.phone ?? null,
        job_title: input.job_title ?? null
      });
      if (error) {
        throw error;
      }
      return;
    }

    const { error } = await supabase
      .from('employees')
      .update({
        employee_code: input.employee_code ?? null,
        phone: input.phone ?? null,
        job_title: input.job_title ?? null
      })
      .eq('id', existing.id);

    if (error) {
      throw error;
    }
  }

  async deactivateCollaborator(profileId: string): Promise<void> {
    const { error: employeeDeleteError } = await supabase.from('employees').delete().eq('profile_id', profileId);
    if (employeeDeleteError) {
      throw employeeDeleteError;
    }

    const { error: profileUpdateError } = await supabase
      .from('profiles')
      .update({ active: false })
      .eq('id', profileId)
      .eq('role', 'COLLABORATOR');

    if (profileUpdateError) {
      throw profileUpdateError;
    }
  }
}
