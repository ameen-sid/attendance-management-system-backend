import type { Response } from 'express';
import prisma from '../databases/prisma.js';
import asyncHandler from '../utils/asyncHandler.js';
import ApiError from '../utils/ApiError.js';
import ApiResponse from '../utils/ApiResponse.js';

// --- CATEGORY CONTROLLERS ---

export const getAllCategoriesWithClauses = asyncHandler(async (req: any, res: Response) => {
    try {
        const categories = await (prisma as any).clauseCategory.findMany({
            include: {
                clauses: {
                    orderBy: { order: 'asc' }
                }
            },
            orderBy: { order: 'asc' }
        });

        return res.status(200).json(
            new ApiResponse(200, categories, "Fetched successfully")
        );
    } catch (error: any) {
        console.error("DEBUG: getAllCategoriesWithClauses failed", error);
        throw new ApiError(500, error.message || "Internal Server Error");
    }
});

export const createCategory = asyncHandler(async (req: any, res: Response) => {
    const { name, order } = req.body;
    if (!name) throw new ApiError(400, "Category name is required");

    const category = await (prisma as any).clauseCategory.create({
        data: { name, order: Number(order) || 0 }
    });

    return res.status(201).json(new ApiResponse(201, category, "Category created"));
});

export const updateCategory = asyncHandler(async (req: any, res: Response) => {
    const { id } = req.params;
    const { name, order } = req.body;

    const category = await (prisma as any).clauseCategory.update({
        where: { id: Number(id) },
        data: { name, order: order !== undefined ? Number(order) : undefined }
    });

    return res.status(200).json(new ApiResponse(200, category, "Category updated"));
});

export const deleteCategory = asyncHandler(async (req: any, res: Response) => {
    const { id } = req.params;
    await (prisma as any).clauseCategory.delete({ where: { id: Number(id) } });
    return res.status(200).json(new ApiResponse(200, {}, "Category deleted"));
});

export const createClause = asyncHandler(async (req: any, res: Response) => {
    const { title, order, categoryId } = req.body;
    if (!title || !categoryId) throw new ApiError(400, "Title and Category ID are required");

    const clause = await (prisma as any).clause.create({
        data: { 
            title, 
            order: Number(order) || 0, 
            categoryId: Number(categoryId) 
        }
    });

    return res.status(201).json(new ApiResponse(201, clause, "Clause created"));
});

export const updateClause = asyncHandler(async (req: any, res: Response) => {
    const { id } = req.params;
    const { title, order, categoryId } = req.body;

    const clause = await (prisma as any).clause.update({
        where: { id: Number(id) },
        data: { 
            title, 
            order: order !== undefined ? Number(order) : undefined,
            categoryId: categoryId !== undefined ? Number(categoryId) : undefined
        }
    });

    return res.status(200).json(new ApiResponse(200, clause, "Clause updated"));
});

export const deleteClause = asyncHandler(async (req: any, res: Response) => {
    const { id } = req.params;
    await (prisma as any).clause.delete({ where: { id: Number(id) } });
    return res.status(200).json(new ApiResponse(200, {}, "Clause deleted"));
});
