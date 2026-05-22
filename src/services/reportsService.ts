import { logSupabaseError } from '../lib/debug';
import { supabase } from '../lib/supabase';
import { Report, ReportTargetType } from '../types/database';

export async function createReport(targetType: ReportTargetType, targetId: string, reason: string, description: string) {
  const { data, error } = await supabase.rpc('create_report', {
    target_type: targetType,
    target_id: targetId,
    reason,
    description: description || null,
  });
  if (error) { logSupabaseError('reports.create', error); throw error; }
  return data as Report;
}

export async function getMyReports() {
  const { data, error } = await supabase.from('reports').select('*').order('created_at', { ascending: false });
  if (error) { logSupabaseError('reports.mine', error); throw error; }
  return (data ?? []) as Report[];
}
