import { Injectable } from '@angular/core';
import { ActivityType, Location } from '../../shared/models/assignment.model';
import { supabase } from './supabase.client';

@Injectable({ providedIn: 'root' })
export class CatalogsService {
  async listLocations(): Promise<Location[]> {
    const { data, error } = await supabase.from('locations').select('*').order('name').returns<Location[]>();
    if (error) {
      throw error;
    }
    return data;
  }

  async upsertLocation(location: Partial<Location> & Pick<Location, 'name'>): Promise<void> {
    const payload = {
      ...(location.id ? { id: location.id } : {}),
      name: location.name,
      address: location.address ?? null,
      maps_url: location.maps_url ?? null,
      state: location.state ?? null,
      latitude: location.latitude ?? null,
      longitude: location.longitude ?? null,
      geofence_radius_m: location.geofence_radius_m ?? null,
      active: location.active ?? true
    };

    const { error } = await supabase.from('locations').upsert(payload);
    if (error) {
      throw error;
    }
  }

  async deleteLocation(id: string): Promise<void> {
    const { error } = await supabase.from('locations').delete().eq('id', id);
    if (error) {
      throw error;
    }
  }

  async listActivityTypes(): Promise<ActivityType[]> {
    const { data, error } = await supabase.from('activity_types').select('*').order('name').returns<ActivityType[]>();
    if (error) {
      throw error;
    }
    return data;
  }

  async upsertActivityType(activityType: Partial<ActivityType> & Pick<ActivityType, 'name'>): Promise<void> {
    const payload = {
      ...(activityType.id ? { id: activityType.id } : {}),
      name: activityType.name,
      active: activityType.active ?? true
    };

    const { error } = await supabase.from('activity_types').upsert(payload);
    if (error) {
      throw error;
    }
  }

  async deleteActivityType(id: string): Promise<void> {
    const { error } = await supabase.from('activity_types').delete().eq('id', id);
    if (error) {
      throw error;
    }
  }
}
