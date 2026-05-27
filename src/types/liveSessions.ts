export type LiveSessionStatus = 'scheduled' | 'live' | 'completed' | 'cancelled' | 'deleted';
export type LiveSessionProvider = 'google_meet';
export type TeacherCohostStatus = 'not_attempted' | 'assigned' | 'failed' | 'unsupported';
export type MeetSetupStatus = 'not_attempted' | 'configured' | 'failed' | 'unsupported';
export type LiveSessionRecurrenceType = 'single' | 'daily' | 'weekly' | 'multiple_weekdays' | 'custom';
export type LiveSessionWeekdayKey = 'mon' | 'tue' | 'wed' | 'thu' | 'fri' | 'sat' | 'sun';
export type LiveSessionDaySchedule = {
  enabled: boolean;
  hour: number;
  minute: number;
  biweekly: boolean;
};
export type LiveSessionRecurrenceConfig = {
  enabled: boolean;
  frequency: 'weekly' | 'daily' | 'custom';
  endDate: string;
  selectedDays: Partial<Record<LiveSessionWeekdayKey, LiveSessionDaySchedule>>;
};
export type LiveSessionNotificationType =
  | 'scheduled'
  | 'updated'
  | 'cancelled'
  | 'recording_available'
  | 'reminder_24h'
  | 'reminder_1h'
  | 'reminder_15m';

export type LiveSession = {
  id: string;
  course_id: string;
  teacher_id: string;
  title: string;
  description: string | null;
  starts_at: string;
  ends_at: string;
  timezone: string;
  provider: LiveSessionProvider;
  meeting_url: string | null;
  google_event_id: string | null;
  google_calendar_id: string | null;
  google_conference_id: string | null;
  google_html_link: string | null;
  google_meet_space_name?: string | null;
  google_meet_conference_record?: string | null;
  status: LiveSessionStatus;
  is_cancelled: boolean;
  cancelled_reason: string | null;
  cancelled_at: string | null;
  deleted_at?: string | null;
  deleted_by?: string | null;
  delete_reason?: string | null;
  postponed_at?: string | null;
  postponed_by?: string | null;
  previous_starts_at?: string | null;
  previous_ends_at?: string | null;
  postpone_reason?: string | null;
  postpone_count?: number;
  recording_url: string | null;
  replay_available: boolean;
  teacher_cohost_email?: string | null;
  teacher_cohost_status?: TeacherCohostStatus;
  teacher_cohost_error?: string | null;
  teacher_cohost_assigned_at?: string | null;
  teacher_cohost_google_status_code?: number | null;
  teacher_cohost_google_message?: string | null;
  teacher_cohost_missing_scopes?: boolean;
  teacher_cohost_preview_unsupported?: boolean;
  teacher_cohost_attempted_method?: string | null;
  teacher_cohost_attempted_endpoint?: string | null;
  meet_space_config_status?: MeetSetupStatus;
  meet_space_config_error?: string | null;
  meet_artifact_config_status?: MeetSetupStatus;
  meet_artifact_config_error?: string | null;
  google_meet_config_payload?: Record<string, unknown> | null;
  recurrence_group_id?: string | null;
  recurrence_index?: number | null;
  recurrence_type?: LiveSessionRecurrenceType | null;
  recurrence_total_occurrences?: number | null;
  is_recurring?: boolean;
  created_at: string;
  updated_at?: string;
};

export type LiveSessionOccurrenceInput = {
  startsAt: string;
  endsAt: string;
  occurrenceIndex: number;
  weekday?: LiveSessionWeekdayKey;
  hour?: number;
  minute?: number;
  biweekly?: boolean;
};

export type LiveSessionRecurrenceInput = {
  enabled: true;
  type: 'weekly' | 'daily' | 'custom';
  endDate: string;
  durationMinutes: number;
  selectedDays: LiveSessionRecurrenceConfig['selectedDays'];
  occurrences: LiveSessionOccurrenceInput[];
};

export type CreateGoogleMeetLiveSessionInput = {
  courseId: string;
  title: string;
  description?: string;
  startsAt: string;
  endsAt: string;
  timezone?: string;
  recurrence?: LiveSessionRecurrenceInput;
};

export type CreateGoogleMeetLiveSessionResult = LiveSession | {
  success: true;
  sessions: LiveSession[];
  createdCount: number;
  failedCount: number;
  failures: Array<{ occurrenceIndex: number; startsAt: string; error: string }>;
  recurrenceGroupId: string | null;
};

export type UpdateGoogleMeetLiveSessionInput = {
  title?: string;
  description?: string;
  startsAt?: string;
  endsAt?: string;
  timezone?: string;
  reactivate?: boolean;
};

export type ReportGoogleMeetLiveSessionInput = {
  sessionId: string;
  newStartsAt: string;
  newEndsAt: string;
  timezone?: string;
  reason?: string;
  reactivate?: boolean;
  confirmCompleted?: boolean;
};

export type DeleteGoogleMeetLiveSessionInput = {
  sessionId: string;
  reason?: string;
};

export type LiveSessionHistory = {
  id: string;
  session_id: string;
  action: 'postponed';
  actor_id: string | null;
  old_starts_at: string | null;
  old_ends_at: string | null;
  new_starts_at: string | null;
  new_ends_at: string | null;
  reason: string | null;
  created_at: string;
  actor?: { full_name?: string | null; role?: string | null } | null;
};

export type LiveSessionPreview = {
  upcoming_count: number;
  next_starts_at: string | null;
};

export type CalendarLiveSessionEvent = {
  id: string;
  title: string;
  description: string | null;
  courseId: string;
  courseTitle: string;
  teacherId: string;
  teacherName: string;
  startsAt: string;
  endsAt: string;
  timezone: string;
  status: LiveSessionStatus;
  provider: LiveSessionProvider;
  meetingUrl: string | null;
  recordingUrl: string | null;
  replayAvailable: boolean;
  isCancelled: boolean;
  cancelledReason: string | null;
  deletedAt?: string | null;
  deletedBy?: string | null;
  deleteReason?: string | null;
  postponedAt?: string | null;
  postponedBy?: string | null;
  previousStartsAt?: string | null;
  previousEndsAt?: string | null;
  postponeReason?: string | null;
  postponeCount?: number;
  approvedStudentsCount?: number;
  teacherCohostEmail?: string | null;
  teacherCohostStatus?: TeacherCohostStatus;
  teacherCohostError?: string | null;
  teacherCohostGoogleStatusCode?: number | null;
  teacherCohostGoogleMessage?: string | null;
  meetSpaceConfigStatus?: MeetSetupStatus;
  meetSpaceConfigError?: string | null;
  meetArtifactConfigStatus?: MeetSetupStatus;
  meetArtifactConfigError?: string | null;
  googleMeetSpaceName?: string | null;
  googleEventId?: string | null;
  googleCalendarId?: string | null;
  googleHtmlLink?: string | null;
  teacherCohostAttemptedMethod?: string | null;
  teacherCohostAttemptedEndpoint?: string | null;
  courseCoverUrl?: string | null;
  subjectName?: string | null;
  recurrenceGroupId?: string | null;
  recurrenceIndex?: number | null;
  recurrenceType?: LiveSessionRecurrenceType | null;
  recurrenceTotalOccurrences?: number | null;
  isRecurring?: boolean;
};

export type LiveSessionCalendarRange = {
  from: string;
  to: string;
};

export type AdminLiveSessionCalendarFilters = {
  query?: string;
  status?: LiveSessionStatus | 'all';
  teacherId?: string;
  courseId?: string;
  subjectName?: string;
  provider?: '' | LiveSessionProvider;
  dateFrom?: string;
  dateTo?: string;
  hasRecording?: '' | 'yes' | 'no';
  period?: '' | 'upcoming' | 'past';
  cohostStatus?: '' | TeacherCohostStatus;
  hideTestSessions?: boolean;
  recurring?: '' | 'yes' | 'no';
};
