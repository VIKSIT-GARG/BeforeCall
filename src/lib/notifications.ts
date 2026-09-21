import 'server-only';
import { prisma } from '@/lib/prisma';

export const NOTIFICATION_TYPES = [
  'research_complete',
  'research_failed',
  'meeting_reminder',
  'brief_updated',
  'needs_confirmation',
] as const;

export type NotificationType = (typeof NOTIFICATION_TYPES)[number];

export interface CreateNotificationInput {
  type: NotificationType;
  title: string;
  message: string;
  meetingId?: string | null;
}

/**
 * Create a notification — used by research pipeline and meeting reminders.
 * Never throws; logs on failure to avoid breaking caller flow.
 */
export async function createNotification(input: CreateNotificationInput) {
  try {
    if (!NOTIFICATION_TYPES.includes(input.type)) {
      console.warn(`[notifications] Invalid type: ${input.type}`);
      return null;
    }
    const title = input.title.trim().slice(0, 200);
    const message = input.message.trim().slice(0, 1000);
    if (!title || !message) {
      console.warn('[notifications] title/message required');
      return null;
    }
    const data: Record<string, unknown> = {
      type: input.type,
      title,
      message,
    };
    if (input.meetingId) {
      // Validate meeting exists if provided; don't fail if missing
      const exists = await prisma.meeting.findUnique({ where: { id: input.meetingId }, select: { id: true } });
      if (exists) data.meetingId = input.meetingId;
    }
    const notification = await prisma.notification.create({ data: data as any });
    return notification;
  } catch (e) {
    console.warn('[notifications] create failed:', e instanceof Error ? e.message : String(e));
    return null;
  }
}

export async function createResearchCompleteNotification(meetingId: string, meetingTitle: string, detail?: string) {
  return createNotification({
    type: 'research_complete',
    title: 'Research complete',
    message: detail || `Research for "${meetingTitle.slice(0, 80)}" is ready.`,
    meetingId,
  });
}

export async function createResearchFailedNotification(meetingId: string, meetingTitle: string, error?: string) {
  return createNotification({
    type: 'research_failed',
    title: 'Research failed',
    message: error ? `Research for "${meetingTitle.slice(0, 80)}" failed: ${error.slice(0, 200)}` : `Research for "${meetingTitle.slice(0, 80)}" failed.`,
    meetingId,
  });
}

export async function createMeetingReminderNotification(meetingId: string, meetingTitle: string, dateTime: Date) {
  return createNotification({
    type: 'meeting_reminder',
    title: 'Upcoming meeting',
    message: `"${meetingTitle.slice(0, 80)}" is coming up at ${dateTime.toLocaleString()}.`,
    meetingId,
  });
}
