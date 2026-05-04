import type { Response } from 'express';
import prisma from '../databases/prisma.js';
import type { AuthRequest } from '../middlewares/auth.middleware.js';
import asyncHandler from '../utils/asyncHandler.js';
import ApiResponse from '../utils/ApiResponse.js';

// Get user notifications (only those whose scheduledFor <= now)
export const getMyNotifications = asyncHandler(async (req: AuthRequest, res: Response) => {
    const userId = req.user?.id;

    const unreadCount = await prisma.notification.count({
        where: {
            userId: Number(userId),
            isRead: false,
            isSent: true
        }
    });

    const notifications = await prisma.notification.findMany({
        where: {
            userId: Number(userId),
            isSent: true
        },
        include: {
            event: {
                include: {
                    client: {
                        select: { name: true }
                    },
                    participants: {
                        select: { fullname: true, avatar: true }
                    }
                }
            }
        },
        orderBy: { scheduledFor: 'desc' },
        take: 100
    });

    return res.status(200).json(
        new ApiResponse(200, notifications, "Notifications fetched successfully")
    );
});

// Mark notification as read
export const markAsRead = asyncHandler(async (req: AuthRequest, res: Response) => {
    const { id } = req.params;
    
    await prisma.notification.update({
        where: { id: Number(id) },
        data: { isRead: true }
    });

    return res.status(200).json(
        new ApiResponse(200, null, "Notification marked as read")
    );
});

// Mark all as read
export const markAllAsRead = asyncHandler(async (req: AuthRequest, res: Response) => {
    const userId = req.user?.id;
    
    await prisma.notification.updateMany({
        where: { 
            userId: Number(userId),
            isRead: false,
            scheduledFor: {
                lte: new Date()
            }
        },
        data: { isRead: true }
    });

    return res.status(200).json(
        new ApiResponse(200, null, "All notifications marked as read")
    );
});
