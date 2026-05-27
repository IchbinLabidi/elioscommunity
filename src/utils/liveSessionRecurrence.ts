import { LiveSessionOccurrenceInput, LiveSessionRecurrenceConfig, LiveSessionWeekdayKey } from '../types/liveSessions';

export type GenerateLiveSessionOccurrencesInput = {
  startsAt: string;
  durationMinutes: number;
  timezone: string;
  recurrence: LiveSessionRecurrenceConfig;
};

export const weekdayOrder: LiveSessionWeekdayKey[] = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'];
export const weekdayLabels: Record<LiveSessionWeekdayKey, { short: string; long: string }> = {
  mon: { short: 'Lun', long: 'Lundi' },
  tue: { short: 'Mar', long: 'Mardi' },
  wed: { short: 'Mer', long: 'Mercredi' },
  thu: { short: 'Jeu', long: 'Jeudi' },
  fri: { short: 'Ven', long: 'Vendredi' },
  sat: { short: 'Sam', long: 'Samedi' },
  sun: { short: 'Dim', long: 'Dimanche' },
};

function dayKey(date: Date): LiveSessionWeekdayKey {
  return ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'][date.getDay()] as LiveSessionWeekdayKey;
}

function dateOnly(value: Date) {
  return new Date(value.getFullYear(), value.getMonth(), value.getDate());
}

function atConfiguredTime(date: Date, hour: number, minute: number) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate(), hour, minute, 0, 0);
}

export function defaultDaySchedule(startsAt?: string) {
  const start = startsAt ? new Date(startsAt) : null;
  return {
    enabled: true,
    hour: start && Number.isFinite(start.getTime()) ? start.getHours() : 18,
    minute: start && Number.isFinite(start.getTime()) ? start.getMinutes() : 0,
    biweekly: false,
  };
}

export function generateLiveSessionOccurrences(input: GenerateLiveSessionOccurrencesInput) {
  const start = new Date(input.startsAt);
  const duration = input.durationMinutes * 60 * 1000;
  if (!Number.isFinite(start.getTime()) || !Number.isInteger(input.durationMinutes) || input.durationMinutes <= 0) {
    throw new Error('La durée de chaque séance doit être supérieure à zéro.');
  }
  if (!input.recurrence.enabled) {
    return [{ startsAt: start.toISOString(), endsAt: new Date(start.getTime() + duration).toISOString(), occurrenceIndex: 1 }];
  }
  if (!input.recurrence.endDate) throw new Error("La date jusqu'à laquelle répéter est requise.");
  const lastDay = new Date(`${input.recurrence.endDate}T23:59:59`);
  const firstDay = dateOnly(start);
  if (!Number.isFinite(lastDay.getTime()) || lastDay < firstDay) {
    throw new Error('La date de répétition doit suivre la date de début séance.');
  }
  const schedules = Object.entries(input.recurrence.selectedDays).filter(([, schedule]) => schedule?.enabled);
  if (!schedules.length) throw new Error('Sélectionnez au moins un jour de répétition.');
  schedules.forEach(([, schedule]) => {
    if (!schedule || !Number.isInteger(schedule.hour) || schedule.hour < 0 || schedule.hour > 23 || !Number.isInteger(schedule.minute) || schedule.minute < 0 || schedule.minute > 59) {
      throw new Error('Une heure de répétition est invalide.');
    }
  });

  const firstOccurrenceByDay = new Map<LiveSessionWeekdayKey, Date>();
  const occurrences: LiveSessionOccurrenceInput[] = [];
  for (const cursor = new Date(firstDay); cursor <= lastDay; cursor.setDate(cursor.getDate() + 1)) {
    const weekday = dayKey(cursor);
    const schedule = input.recurrence.selectedDays[weekday];
    if (!schedule?.enabled) continue;
    const occurrenceStart = atConfiguredTime(cursor, schedule.hour, schedule.minute);
    if (occurrenceStart.getTime() < Date.now()) continue;
    const firstForDay = firstOccurrenceByDay.get(weekday);
    if (!firstForDay) firstOccurrenceByDay.set(weekday, new Date(occurrenceStart));
    if (schedule.biweekly && firstForDay) {
      const elapsedWeeks = Math.floor((dateOnly(occurrenceStart).getTime() - dateOnly(firstForDay).getTime()) / (7 * 24 * 60 * 60 * 1000));
      if (elapsedWeeks % 2 !== 0) continue;
    }
    occurrences.push({
      startsAt: occurrenceStart.toISOString(),
      endsAt: new Date(occurrenceStart.getTime() + duration).toISOString(),
      weekday,
      hour: schedule.hour,
      minute: schedule.minute,
      biweekly: schedule.biweekly,
      occurrenceIndex: occurrences.length + 1,
    });
    if (occurrences.length > 30) throw new Error('La récurrence est limitée à 30 sessions maximum.');
  }
  if (!occurrences.length) throw new Error('Aucune session ne correspond à cette configuration.');
  return occurrences;
}
