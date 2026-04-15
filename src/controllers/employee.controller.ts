import type { Response } from 'express';
import bcrypt from 'bcryptjs';
import type { AuthRequest } from '../middlewares/auth.middleware.js';
import prisma from '../databases/prisma.js';
import asyncHandler from '../utils/asyncHandler.js';
import ApiError from '../utils/ApiError.js';
import ApiResponse from '../utils/ApiResponse.js';

// Fetch All Employees (with Search & Pagination)
export const getAllEmployees = asyncHandler(async (req: AuthRequest, res: Response) => {

    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const search = (req.query.search as string) || '';
    const skip = (page - 1) * limit;

    const whereCondition = {
        isAdmin: false,
        OR: [
            { fullname: { contains: search } },
            { username: { contains: search } }
        ]
    };

    const [employees, total] = await Promise.all([
        prisma.user.findMany({
            where: whereCondition,
            skip,
            take: limit,
            orderBy: { createdAt: 'desc' },
            select: {
                id: true,
                fullname: true,
                role: true,
                username: true,
                shift_hours: true,
                avatar: true,
                createdAt: true
            }
        }),
        prisma.user.count({ where: whereCondition })
    ]);

    return res.status(200).json(
        new ApiResponse(
            200,
            {
                employees,
                total,
                page,
                totalPages: Math.ceil(total / limit)
            },
            "Employees fetched successfully"
        )
    );
});

// Create New Employee
export const createEmployee = asyncHandler(async (req: AuthRequest, res: Response) => {

    const { fullname, role, username, password, shift_hours } = req.body;
    if (!fullname || !username || !password) {
        throw new ApiError(400, "Fullname, username, and password are required");
    }

    const existingUser = await prisma.user.findUnique({ where: { username } });
    if (existingUser) {
        throw new ApiError(409, "Username already exists");
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const newUser = await prisma.user.create({
        data: {
            fullname,
            role,
            username,
            password: hashedPassword,
            shift_hours: Number(shift_hours) || 9,
            isAdmin: false
        }
    });

    return res.status(201).json(
        new ApiResponse(201, newUser, "Employee created successfully")
    );
});

// Update Employee
export const updateEmployee = asyncHandler(async (req: AuthRequest, res: Response) => {

    const { id } = req.params;
    const { fullname, role, shift_hours, username } = req.body;

    const user = await prisma.user.findUnique({ where: { id: Number(id) } });
    if (!user) {
        throw new ApiError(404, "Employee not found");
    }

    const updatedUser = await prisma.user.update({
        where: { 
            id: Number(id) 
        },
        data: {
            fullname: fullname || user.fullname,
            role: role || user.role,
            username: username || user.username,
            shift_hours: shift_hours ? Number(shift_hours) : user.shift_hours
        }
    });

    return res.status(200).json(
        new ApiResponse(200, updatedUser, "Employee updated successfully")
    );
});

// Delete Employee
export const deleteEmployee = asyncHandler(async (req: AuthRequest, res: Response) => {

    const { id } = req.params;

    await prisma.attendanceLogs.deleteMany({
        where: { userId: Number(id) }
    });

    await prisma.user.delete({
        where: { id: Number(id) }
    });

    return res.status(200).json(
        new ApiResponse(200, {}, "Employee and their logs removed successfully")
    );
});