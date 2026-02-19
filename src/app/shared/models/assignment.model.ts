export type AssignmentStatus = 'PLANNED' | 'CONFIRMED' | 'CANCELLED';

export interface Profile {
  id: string;
  full_name: string | null;
  role: 'SUPER_ADMIN' | 'ADMIN' | 'COLLABORATOR';
  active: boolean;
  created_at: string;
}

export interface Employee {
  id: string;
  profile_id: string;
  employee_code: string | null;
  phone: string | null;
  job_title: string | null;
  created_at: string;
}

export interface Location {
  id: string;
  name: string;
  address: string | null;
  maps_url?: string | null;
  state?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  geofence_radius_m?: number | null;
  active: boolean;
  created_at: string;
}

export interface ActivityType {
  id: string;
  name: string;
  active: boolean;
  created_at: string;
}

export interface Assignment {
  id: string;
  employee_profile_id: string;
  start_at: string;
  end_at: string;
  location_id: string | null;
  establishment_name?: string | null;
  assignment_address?: string | null;
  assignment_location?: string | null;
  assignment_state?: string | null;
  activity_type_id: string | null;
  details: string | null;
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
  created_by: string | null;
  updated_at: string;
  created_at: string;
  employee?: Pick<Profile, 'id' | 'full_name'>;
  location?: Pick<Location, 'id' | 'name' | 'address' | 'state'>;
  activity_type?: Pick<ActivityType, 'id' | 'name'>;
  attendance?: AssignmentAttendance | null;
}

export interface ReassignmentLog {
  id: string;
  assignment_id: string;
  from_employee_profile_id: string;
  to_employee_profile_id: string;
  reason: string | null;
  done_by: string;
  created_at: string;
}

export interface AssignmentAttendance {
  id: string;
  assignment_id: string;
  employee_profile_id: string;
  check_in_at: string | null;
  check_out_at: string | null;
  before_photo_url: string | null;
  after_photo_url: string | null;
  status: 'NOT_STARTED' | 'CHECKED_IN' | 'DONE';
  done: boolean;
  created_at: string;
  updated_at: string;
}
