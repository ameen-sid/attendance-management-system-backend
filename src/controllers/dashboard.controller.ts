import type { Response } from 'express';
import { startOfDay, endOfDay, format } from 'date-fns';
import prisma from '../databases/prisma.js';
import type { AuthRequest } from '../middlewares/auth.middleware.js';
import asyncHandler from '../utils/asyncHandler.js';
import ApiResponse from '../utils/ApiResponse.js';

export const getDashboardStats = asyncHandler(async (req: AuthRequest, res: Response) => {

	const today = new Date();
	const start = startOfDay(today);
	const end = endOfDay(today);

	// 1. Core Summary Stats
	const totalEmployees = await prisma.user.count({
		where: { isAdmin: false }
	});

	const attendanceToday = await prisma.attendanceLogs.findMany({
		where: {
			clock_in_time: { gte: start, lte: end },
		},
		select: { userId: true, clock_in_time: true }
	});

	// Count unique users present today
	const presentUserIds = new Set(attendanceToday.map(log => log.userId));
	const presentToday = presentUserIds.size;

	// Count employees who were late today (at least one late arrival)
	const lateUserIds = new Set(
		attendanceToday
			.filter(log => {
				const checkIn = new Date(log.clock_in_time);
				return (checkIn.getHours() > 9) || (checkIn.getHours() === 9 && checkIn.getMinutes() > 35);
			})
			.map(log => log.userId)
	);
	const lateArrivals = lateUserIds.size;

	const onLeave = totalEmployees - presentToday;

	// 2. 7-Day Trend Data
	const sevenDaysAgo = new Date();
	sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 6);
	const trendStart = startOfDay(sevenDaysAgo);

	const historicalLogs = await prisma.attendanceLogs.findMany({
		where: {
			clock_in_time: { gte: trendStart, lte: end }
		},
		select: { clock_in_time: true, clock_out_time: true, userId: true }
	});

	const trend = [];
	for (let i = 0; i < 7; i++) {

		const d = new Date(sevenDaysAgo);
		d.setDate(d.getDate() + i);
		const dStr = format(d, 'dd MMM');
		const startD = startOfDay(d);
		const endD = endOfDay(d);

		const dayLogs = historicalLogs.filter(l => {
			const ct = new Date(l.clock_in_time);
			return ct >= startD && ct <= endD;
		});

		// Unique users for this day
		const dayUserIds = new Set(dayLogs.map(l => l.userId));

		// Unique late users for this day
		const dayLateUserIds = new Set(
			dayLogs
				.filter(l => {
					const ct = new Date(l.clock_in_time);
					return (ct.getHours() > 9) || (ct.getHours() === 9 && ct.getMinutes() > 35);
				})
				.map(l => l.userId)
		);

		// Calculate Avg Hours for the day
		let totalHours = 0;
		let logsWithCheckout = 0;
		dayLogs.forEach(l => {
			if (l.clock_in_time && l.clock_out_time) {
				const duration = (new Date(l.clock_out_time).getTime() - new Date(l.clock_in_time).getTime()) / (1000 * 60 * 60);
				totalHours += duration;
				logsWithCheckout++;
			}
		});

		trend.push({
			name: dStr,
			present: dayUserIds.size,
			late: dayLateUserIds.size,
			avgHours: logsWithCheckout > 0 ? parseFloat((totalHours / logsWithCheckout).toFixed(1)) : 0
		});
	}

	// 3. Client Workload today
	const clientAttendance = await prisma.attendanceLogs.findMany({
		where: {
			clock_in_time: { gte: start, lte: end }
		},
		include: {
			plannedClient: { select: { name: true } }
		}
	});

	const clientMap: Record<string, number> = {};
	clientAttendance.forEach(log => {
		const clientName = log.plannedClient?.name || 'Office / Internal';
		clientMap[clientName] = (clientMap[clientName] || 0) + 1;
	});

	const clientStats = Object.keys(clientMap).map(name => ({
		name,
		value: clientMap[name] || 0
	})).sort((a, b) => (b.value || 0) - (a.value || 0));

	// 4. Task Stats
	const tasksToday = await prisma.attendanceTask.count({
		where: {
			attendanceLog: {
				clock_in_time: { gte: start, lte: end }
			}
		}
	});

	const tasksCompleted = await prisma.attendanceTask.count({
		where: {
			isCompleted: true,
			attendanceLog: {
				clock_in_time: { gte: start, lte: end }
			}
		}
	});

	return res.status(200).json(
		new ApiResponse(200,
			{
				totalEmployees,
				presentToday,
				lateArrivals,
				onLeave: onLeave < 0 ? 0 : onLeave,
				trend,
				clientStats,
				taskStats: {
					total: tasksToday,
					completed: tasksCompleted,
					pending: tasksToday - tasksCompleted
				}
			},
			"Dashboard stats fetched successfully"
		)
	);
});

export const getRecentActivity = asyncHandler(async (req: AuthRequest, res: Response) => {

	const today = new Date();
	const start = startOfDay(today);
	const end = endOfDay(today);

	const logs = await prisma.attendanceLogs.findMany({
		where: {
			clock_in_time: { gte: start, lte: end }
		},
		take: 20, // Fetch more to account for split events
		orderBy: { clock_in_time: 'desc' },
		include: {
			user: {
				select: { fullname: true }
			}
		}
	});

	// Transform logs into a flat list of events (both Check-In and Check-Out)
	const events: any[] = [];

	logs.forEach(log => {
		// 1. Add Check-In Event
		events.push({
			id: `${log.id}_in`,
			name: log.user.fullname,
			timeValue: new Date(log.clock_in_time).getTime(),
			time: format(new Date(log.clock_in_time), 'hh:mm a'),
			type: 'CLOCK_IN',
			location: log.clock_in_address || 'Unknown'
		});

		// 2. Add Check-Out Event (if exists)
		if (log.clock_out_time) {
			events.push({
				id: `${log.id}_out`,
				name: log.user.fullname,
				timeValue: new Date(log.clock_out_time).getTime(),
				time: format(new Date(log.clock_out_time), 'hh:mm a'),
				type: 'CLOCK_OUT',
				location: log.clock_out_address || 'Unknown'
			});
		}
	});

	// Sort by time descending and take top 10
	const sortedEvents = events
		.sort((a, b) => b.timeValue - a.timeValue)
		.slice(0, 10)
		.map(({ timeValue, ...event }) => event); // Remove helper key

	return res.status(200).json(
		new ApiResponse(200, sortedEvents, "Recent activity fetched")
	);
});
