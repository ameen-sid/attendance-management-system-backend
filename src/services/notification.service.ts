import { createRequire } from 'module';
const require = createRequire(import.meta.url);
import prisma from '../databases/prisma.js';
import { subMinutes, startOfDay, setHours, isBefore, format } from 'date-fns';

/**
 * Creates scheduled notifications for a meeting
 */
export const createMeetingReminders = async (eventId: number) => {
    const event = await prisma.event.findUnique({
        where: { id: eventId },
        include: { 
            participants: true,
            client: true
        }
    });

    if (!event) return;

    const eventStartTime = new Date(event.start);
    const now = new Date();

    const addReminder = async (title: string, message: string, scheduledTime: Date) => {
        if (isBefore(scheduledTime, now) && Math.abs(now.getTime() - scheduledTime.getTime()) > 60000) {
            return;
        }

        const isImmediate = Math.abs(now.getTime() - scheduledTime.getTime()) < 60000;

        for (const p of event.participants) {
            const notif = await prisma.notification.create({
                data: {
                    userId: p.id,
                    eventId: event.id,
                    title,
                    message,
                    scheduledFor: scheduledTime,
                    type: "MEETING_REMINDER",
                    isSent: isImmediate
                }
            });

            // If immediate, send push now
            if (isImmediate && p.pushToken) {
                try {
                    const { Expo } = require('expo-server-sdk');
                    const expo = new Expo();
                    if (Expo.isExpoPushToken(p.pushToken)) {
                        await expo.sendPushNotificationsAsync([{
                            to: p.pushToken,
                            sound: 'default',
                            title,
                            body: message,
                            data: { eventId: event.id, notificationId: notif.id }
                        }]);
                    }
                } catch (error) {
                    console.error("Immediate Push Error", error);
                }
            }
        }
    };

    // 1. Immediate
    await addReminder(
        "New Meeting Scheduled",
        `Meeting "${event.title}" has been scheduled for ${format(eventStartTime, 'PPp')}.`,
        now
    );

    // 2. 8 AM
    const dayOf8AM = setHours(startOfDay(eventStartTime), 8);
    await addReminder(
        "Meeting Today",
        `You have a meeting "${event.title}" today at ${format(eventStartTime, 'p')}.`,
        dayOf8AM
    );

    // 3. 30 Minutes Before
    await addReminder(
        "Upcoming Meeting (30m)",
        `Meeting "${event.title}" starts in 30 minutes.`,
        subMinutes(eventStartTime, 30)
    );

    // 4. 5 Minutes Before
    await addReminder(
        "Meeting Starting Soon (5m)",
        `Meeting "${event.title}" starts in 5 minutes.`,
        subMinutes(eventStartTime, 5)
    );

    // 5. Starting Time
    await addReminder(
        "Meeting Started",
        `Meeting "${event.title}" is starting now.`,
        eventStartTime
    );
};

/**
 * Clears all upcoming notifications for an event
 */
export const clearMeetingReminders = async (eventId: number) => {
    await prisma.notification.deleteMany({
        where: {
            eventId,
            scheduledFor: {
                gt: new Date()
            },
            isRead: false
        }
    });
};
