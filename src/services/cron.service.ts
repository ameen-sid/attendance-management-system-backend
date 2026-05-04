import { createRequire } from 'module';
const require = createRequire(import.meta.url);

import prisma from '../databases/prisma.js';
import { startOfDay, endOfDay } from 'date-fns';

/**
 * Initializes all cron jobs
 */
export const initCronJobs = () => {
    try {
        const cron = require('node-cron');
        
        // 1. Every minute: Send scheduled notifications
        cron.schedule('* * * * *', async () => {
            await sendScheduledNotifications().catch(err => console.error("[CRON ERROR]", err));
        });

        // 2. Daily at 8:00 AM IST (which is 2:30 AM UTC)
        cron.schedule('30 2 * * *', async () => {
            await sendDailyMeetingSummary().catch(err => console.error("[CRON ERROR]", err));
        });

        console.log('🕒 Cron jobs initialized');
    } catch (error) {
        console.error('❌ Failed to initialize cron jobs:', error);
    }
};

/**
 * Sends notifications that are scheduled to go out now
 */
const sendScheduledNotifications = async () => {
    const { Expo } = require('expo-server-sdk');
    const expo = new Expo();
    const now = new Date();
    
    // Find all unsent notifications that are due
    const pendingNotifications = await prisma.notification.findMany({
        where: {
            isSent: false,
            scheduledFor: {
                lte: now
            }
        },
        include: {
            user: true
        }
    });

    if (pendingNotifications.length === 0) return;

    console.log(`[CRON] ${now.toISOString()} - Found ${pendingNotifications.length} due notifications`);
    pendingNotifications.forEach(n => {
        console.log(`  -> Title: ${n.title}, Scheduled: ${n.scheduledFor.toISOString()}, Diff: ${n.scheduledFor.getTime() - now.getTime()}ms`);
    });

    const messages: any[] = [];
    const notificationIds: number[] = [];

    for (const notif of pendingNotifications) {
        if (!notif.user.pushToken || !Expo.isExpoPushToken(notif.user.pushToken)) {
            // If no token, just mark as sent so we don't keep trying
            await prisma.notification.update({
                where: { id: notif.id },
                data: { isSent: true }
            });
            continue;
        }

        messages.push({
            to: notif.user.pushToken,
            sound: 'default',
            title: notif.title,
            body: notif.message,
            data: { eventId: notif.eventId, notificationId: notif.id },
        });
        
        notificationIds.push(notif.id);
    }

    if (messages.length > 0) {
        try {
            const chunks = expo.chunkPushNotifications(messages);
            for (const chunk of chunks) {
                await expo.sendPushNotificationsAsync(chunk);
            }
            
            // Mark all as sent
            await prisma.notification.updateMany({
                where: {
                    id: { in: notificationIds }
                },
                data: { isSent: true }
            });
            
            console.log(`[CRON] Successfully sent ${messages.length} push notifications`);
        } catch (error) {
            console.error('[CRON] Error sending push notifications:', error);
        }
    }
};

/**
 * Sends a summary of today's meetings at 8 AM
 */
const sendDailyMeetingSummary = async () => {
    const { Expo } = require('expo-server-sdk');
    const expo = new Expo();
    const todayStart = startOfDay(new Date());
    const todayEnd = endOfDay(new Date());

    // Get all events for today
    const todayEvents = await prisma.event.findMany({
        where: {
            start: {
                gte: todayStart,
                lte: todayEnd
            }
        },
        include: {
            participants: true
        }
    });

    const messages: any[] = [];

    for (const event of todayEvents) {
        for (const participant of event.participants) {
            if (participant.pushToken && Expo.isExpoPushToken(participant.pushToken)) {
                messages.push({
                    to: participant.pushToken,
                    sound: 'default',
                    title: '📅 Meeting Today',
                    body: `You have a meeting "${event.title}" scheduled for today.`,
                    data: { eventId: event.id }
                });
            }
        }
    }

    if (messages.length > 0) {
        try {
            const chunks = expo.chunkPushNotifications(messages);
            for (const chunk of chunks) {
                await expo.sendPushNotificationsAsync(chunk);
            }
            console.log(`[CRON] Daily summary sent to ${messages.length} participants`);
        } catch (error) {
            console.error('[CRON] Error sending daily summary:', error);
        }
    }
};
