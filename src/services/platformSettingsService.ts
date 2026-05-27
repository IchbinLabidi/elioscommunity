import { logSupabaseError } from '../lib/debug';
import { supabase } from '../lib/supabase';
import {
  DEFAULT_PLATFORM_SETTINGS,
  PlatformSettingKey,
  PlatformSettingRow,
  PlatformSettingsValues,
  PlatformUploadSettings,
} from '../types/platformSettings';

let publicSettingsCache: Partial<PlatformSettingsValues> = {};

function mergeSettings(rows: PlatformSettingRow[]) {
  return rows.reduce((values, row) => ({
    ...values,
    [row.key]: { ...values[row.key], ...row.value },
  }), { ...DEFAULT_PLATFORM_SETTINGS } as PlatformSettingsValues);
}

function missingTable(error: { code?: string; message?: string } | null) {
  return error?.code === '42P01' || error?.code === 'PGRST205' || Boolean(error?.message?.includes('platform_settings'));
}

export async function getPlatformSettings() {
  const { data, error } = await supabase.from('platform_settings').select('*').order('key');
  if (error) {
    if (!missingTable(error)) logSupabaseError('platformSettings.admin.list', error);
    if (missingTable(error)) return DEFAULT_PLATFORM_SETTINGS;
    throw error;
  }
  return mergeSettings((data ?? []) as PlatformSettingRow[]);
}

export async function getPublicPlatformSettings() {
  const { data, error } = await supabase.from('platform_settings').select('*').eq('is_public', true).order('key');
  if (error) {
    if (!missingTable(error)) logSupabaseError('platformSettings.public.list', error);
    publicSettingsCache = {
      general: DEFAULT_PLATFORM_SETTINGS.general,
      branding: DEFAULT_PLATFORM_SETTINGS.branding,
      uploads: DEFAULT_PLATFORM_SETTINGS.uploads,
      maintenance: DEFAULT_PLATFORM_SETTINGS.maintenance,
      legal: DEFAULT_PLATFORM_SETTINGS.legal,
      support: DEFAULT_PLATFORM_SETTINGS.support,
    };
    return publicSettingsCache;
  }
  publicSettingsCache = (data ?? []).reduce((values, row) => ({
    ...values,
    [row.key]: { ...DEFAULT_PLATFORM_SETTINGS[row.key as PlatformSettingKey], ...(row.value as object) },
  }), {} as Partial<PlatformSettingsValues>);
  return publicSettingsCache;
}

export async function getSetting<K extends PlatformSettingKey>(key: K) {
  const { data, error } = await supabase.from('platform_settings').select('*').eq('key', key).maybeSingle();
  if (error) {
    if (!missingTable(error)) logSupabaseError('platformSettings.get', error);
    return DEFAULT_PLATFORM_SETTINGS[key];
  }
  return { ...DEFAULT_PLATFORM_SETTINGS[key], ...(data?.value ?? {}) } as PlatformSettingsValues[K];
}

export async function updateSetting<K extends PlatformSettingKey>(key: K, value: PlatformSettingsValues[K]) {
  const { data, error } = await supabase.rpc('admin_update_platform_setting', { setting_key: key, setting_value: value });
  if (error) {
    logSupabaseError('platformSettings.update', error);
    throw error;
  }
  window.dispatchEvent(new CustomEvent('platform-settings-updated', { detail: key }));
  return data as PlatformSettingRow<K>;
}

export async function updateMultipleSettings(settings: Partial<PlatformSettingsValues>) {
  return Promise.all(Object.entries(settings).map(([key, value]) =>
    updateSetting(key as PlatformSettingKey, value as PlatformSettingsValues[PlatformSettingKey]),
  ));
}

export function getCachedUploadSettings(): PlatformUploadSettings {
  return { ...DEFAULT_PLATFORM_SETTINGS.uploads, ...(publicSettingsCache.uploads ?? {}) };
}
