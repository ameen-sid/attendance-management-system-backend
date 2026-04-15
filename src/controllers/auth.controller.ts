import type { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import prisma from '../databases/prisma.js';
import ENV from '../configs/env.js';
import type { AuthRequest } from '../middlewares/auth.middleware.js';
import asyncHandler from '../utils/asyncHandler.js';
import ApiError from '../utils/ApiError.js';
import ApiResponse from '../utils/ApiResponse.js';

const JWT_SECRET = ENV.JWT_SECRET;

// Mobile Login (Employee Only)
export const loginMobile = asyncHandler(async (req: Request, res: Response) => {

	const { username, password } = req.body;
	if (!username || !password) {
		throw new ApiError(400, "All fields are required");
	}

	const user = await prisma.user.findUnique({ where: { username } });
	if (!user || !(await bcrypt.compare(password, user.password))) {
		throw new ApiError(401, "Invalid credentials");
	}

	const token = jwt.sign(
		{ id: user.id, isAdmin: false },
		JWT_SECRET,
		{ expiresIn: '7d' }
	);

	await prisma.user.update({
		where: { id: user.id },
		data: { access_token: token }
	});

	return res.status(200).json(
		new ApiResponse(
			200,
			{
				token,
				user: {
					id: user.id,
					fullname: user.fullname,
					isAdmin: user.isAdmin,
					avatar: user.avatar
				}
			},
			"Mobile Login Successful"
		)
	);
});

// Web Login (Admins Only)
export const loginWeb = asyncHandler(async (req: Request, res: Response) => {

	const { username, password } = req.body;
	if (!username || !password) {
		throw new ApiError(400, "All fields are required");
	}

	const user = await prisma.user.findUnique({ where: { username } });
	if (!user || !(await bcrypt.compare(password, user.password))) {
		throw new ApiError(401, "Invalid credentials");
	}

	if (user.isAdmin !== true) {
		throw new ApiError(403, "Access Denied. Admins only.");
	}

	const token = jwt.sign(
		{ id: user.id, isAdmin: true },
		JWT_SECRET,
		{ expiresIn: '1d' }
	);

	await prisma.user.update({
		where: { id: user.id },
		data: { access_token: token }
	});

	return res.status(200).json(
		new ApiResponse(
			200,
			{
				token,
				user: {
					id: user.id,
					fullname: user.fullname,
					username: user.username,
					email: user.email,
					isAdmin: user.isAdmin
				}
			},
			"Dashboard Login Successful"
		)
	);
});

// Update Password
export const updatePassword = asyncHandler(async (req: AuthRequest, res: Response) => {

	const { currentPassword, newPassword } = req.body;
	if (!currentPassword || !newPassword) {
		throw new ApiError(400, "Both current and new passwords are required");
	}

	const user = await prisma.user.findUnique({ where: { id: req.user?.id } });
	if (!user) {
		throw new ApiError(404, "User not found");
	}

	const isPasswordCorrect = await bcrypt.compare(currentPassword, user.password);
	if (!isPasswordCorrect) {
		throw new ApiError(400, "Incorrect current password");
	}

	const hashedNewPassword = await bcrypt.hash(newPassword, 10);

	await prisma.user.update({
		where: { id: user.id },
		data: {
			password: hashedNewPassword,
			access_token: null
		}
	});

	return res.status(200).json(
		new ApiResponse(200, {}, "Password updated successfully")
	);
});

// Logout
export const logout = asyncHandler(async (req: AuthRequest, res: Response) => {

	if (!req.user) {
		throw new ApiError(401, "Not logged in");
	}

	await prisma.user.update({
		where: { id: req.user.id },
		data: { access_token: null, refresh_token: null }
	});

	return res.status(200).json(
		new ApiResponse(200, {}, "Logged out successfully")
	);
});