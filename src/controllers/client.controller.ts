import type { Response } from 'express';
import type { AuthRequest } from '../middlewares/auth.middleware.js';
import prisma from '../databases/prisma.js';
import asyncHandler from '../utils/asyncHandler.js';
import ApiError from '../utils/ApiError.js';
import ApiResponse from '../utils/ApiResponse.js';

// Fetch All Clients
export const getAllClients = asyncHandler(async (req: AuthRequest, res: Response) => {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const search = (req.query.search as string) || '';
    const skip = (page - 1) * limit;

    const whereCondition = {
        name: { contains: search }
    };

    const [clients, total] = await Promise.all([
        // @ts-ignore
        prisma.client.findMany({
            where: whereCondition,
            skip,
            take: limit,
            orderBy: { createdAt: 'desc' }
        }),
        // @ts-ignore
        prisma.client.count({ where: whereCondition })
    ]);

    return res.status(200).json(
        new ApiResponse(
            200,
            {
                clients,
                total,
                page,
                totalPages: Math.ceil(total / limit)
            },
            "Clients fetched successfully"
        )
    );
});

// Get Client By ID
export const getClientById = asyncHandler(async (req: AuthRequest, res: Response) => {
    const { id } = req.params;
    // @ts-ignore
    const client = await prisma.client.findUnique({
        where: { id: Number(id) }
    });

    if (!client) {
        throw new ApiError(404, "Client not found");
    }

    return res.status(200).json(
        new ApiResponse(200, client, "Client fetched successfully")
    );
});

// Create New Client
export const createClient = asyncHandler(async (req: AuthRequest, res: Response) => {
    const { name, description } = req.body;

    if (!name) {
        throw new ApiError(400, "Client name is required");
    }

    // @ts-ignore
    const existingClient = await prisma.client.findUnique({
        where: { name }
    });

    if (existingClient) {
        throw new ApiError(409, "Client already exists");
    }

    // @ts-ignore
    const newClient = await prisma.client.create({
        data: {
            name,
            description
        }
    });

    return res.status(201).json(
        new ApiResponse(201, newClient, "Client created successfully")
    );
});

// Update Client
export const updateClient = asyncHandler(async (req: AuthRequest, res: Response) => {
    const { id } = req.params;
    const { name, description } = req.body;

    // @ts-ignore
    const client = await prisma.client.findUnique({
        where: { id: Number(id) }
    });

    if (!client) {
        throw new ApiError(404, "Client not found");
    }

    // Check if new name already exists in another client
    if (name && name !== client.name) {
        // @ts-ignore
        const existingClient = await prisma.client.findUnique({
            where: { name }
        });
        if (existingClient) {
            throw new ApiError(409, "Another client with this name already exists");
        }
    }

    // @ts-ignore
    const updatedClient = await prisma.client.update({
        where: { id: Number(id) },
        data: {
            name: name || client.name,
            description: description !== undefined ? description : client.description
        }
    });

    return res.status(200).json(
        new ApiResponse(200, updatedClient, "Client updated successfully")
    );
});

// Delete Client
export const deleteClient = asyncHandler(async (req: AuthRequest, res: Response) => {
    const { id } = req.params;

    // @ts-ignore
    const client = await prisma.client.findUnique({
        where: { id: Number(id) }
    });

    if (!client) {
        throw new ApiError(404, "Client not found");
    }

    // @ts-ignore
    await prisma.client.delete({
        where: { id: Number(id) }
    });

    return res.status(200).json(
        new ApiResponse(200, {}, "Client deleted successfully")
    );
});
