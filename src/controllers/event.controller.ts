import type { Response } from 'express';
import prisma from '../databases/prisma.js';
import type { AuthRequest } from '../middlewares/auth.middleware.js';
import asyncHandler from '../utils/asyncHandler.js';
import ApiError from '../utils/ApiError.js';
import ApiResponse from '../utils/ApiResponse.js';

// Get all events
export const getEvents = asyncHandler(async (req: AuthRequest, res: Response) => {

    const events = await prisma.event.findMany({
        include: {
            user: {
                select: {
                    id: true,
                    fullname: true
                }
            },
            client: {
                select: {
                    id: true,
                    name: true
                }
            },
            participants: {
                select: {
                    id: true,
                    fullname: true,
                    avatar: true
                }
            }
        },
        orderBy: { start: 'asc' }
    });

    return res.status(200).json(
        new ApiResponse(200, events, "Events fetched successfully")
    );
});

// Create event
export const createEvent = asyncHandler(async (req: AuthRequest, res: Response) => {

    const { title, description, start, end, allDay, type, color, userId, clientId, participantIds, managers } = req.body;
    if (!title || !start || !end || !userId) {
        throw new ApiError(400, "Title, start date, end date, and userId are required");
    }

    const event = await prisma.event.create({
        data: {
            title,
            description,
            start: new Date(start),
            end: new Date(end),
            allDay: allDay || false,
            type: type || "Online Meeting",
            color,
            userId: Number(userId),
            clientId: clientId ? Number(clientId) : null,
            managers: managers || null,
            participants: participantIds && Array.isArray(participantIds) ? {
                connect: participantIds.map((id: any) => ({ id: Number(id) }))
            } : undefined
        },
        include: {
            user: { select: { id: true, fullname: true } },
            client: { select: { id: true, name: true } },
            participants: { select: { id: true, fullname: true } }
        }
    });

    return res.status(201).json(
        new ApiResponse(201, event, "Event created successfully")
    );
});

// Update event
export const updateEvent = asyncHandler(async (req: AuthRequest, res: Response) => {

    const { id } = req.params;
    const { title, description, start, end, allDay, type, color, clientId, participantIds, managers } = req.body;

    const existingEvent = await prisma.event.findUnique({
        where: { id: Number(id) }
    });
    if (!existingEvent) {
        throw new ApiError(404, "Event not found");
    }

    const updatedEvent = await prisma.event.update({
        where: { id: Number(id) },
        data: {
            title: title || existingEvent.title,
            description: description !== undefined ? description : existingEvent.description,
            start: start ? new Date(start) : existingEvent.start,
            end: end ? new Date(end) : existingEvent.end,
            allDay: allDay !== undefined ? allDay : existingEvent.allDay,
            type: type || existingEvent.type,
            color: color || existingEvent.color,
            clientId: clientId !== undefined ? (clientId ? Number(clientId) : null) : existingEvent.clientId,
            managers: managers !== undefined ? managers : existingEvent.managers,
            participants: participantIds && Array.isArray(participantIds) ? {
                set: participantIds.map((id: any) => ({ id: Number(id) }))
            } : undefined
        },
        include: {
            user: { select: { id: true, fullname: true } },
            client: { select: { id: true, name: true } },
            participants: { select: { id: true, fullname: true } }
        }
    });

    return res.status(200).json(
        new ApiResponse(200, updatedEvent, "Event updated successfully")
    );
});

// Delete event
export const deleteEvent = asyncHandler(async (req: AuthRequest, res: Response) => {

    const { id } = req.params;

    const existingEvent = await prisma.event.findUnique({
        where: { id: Number(id) }
    });
    if (!existingEvent) {
        throw new ApiError(404, "Event not found");
    }

    await prisma.event.delete({
        where: { id: Number(id) }
    });

    return res.status(200).json(
        new ApiResponse(200, null, "Event deleted successfully")
    );
});
