import type { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import ENV from '../configs/env.js';
import prisma from '../databases/prisma.js';
import asyncHandler from '../utils/asyncHandler.js';
import ApiError from '../utils/ApiError.js';

// Extend express request interface to include user
export interface AuthRequest extends Request {
	user?: any;
}

const JWT_SECRET = ENV.JWT_SECRET;

export const authenticate = asyncHandler(async (req: AuthRequest, res: Response, next: NextFunction) => {

	const token = req.header("Authorization")?.replace("Bearer ", "");
	if (!token) {
		throw new ApiError(401, "Unauthorized request");
	}

	try {
		const decoded: any = jwt.verify(token, JWT_SECRET);

		const user = await prisma.user.findUnique({
			where: { id: decoded.id }
		});
		if (!user) {
			throw new ApiError(401, "Invalid Access Token");
		}

		if (user.access_token !== token) {
			throw new ApiError(401, "Session expired or invalid token");
		}

		req.user = user;
		next();
	} catch (error) {
		throw new ApiError(401, "Invalid Access Token");
	}
});