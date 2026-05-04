import type { Response } from 'express';
import { 
    startOfDay, 
    endOfDay, 
    startOfMonth, 
    endOfMonth, 
    format, 
    parse, 
    isAfter, 
    getDaysInMonth 
} from 'date-fns';
import prisma from '../databases/prisma.js';
import type { AuthRequest } from '../middlewares/auth.middleware.js';
import asyncHandler from '../utils/asyncHandler.js';
import ApiError from '../utils/ApiError.js';
import ApiResponse from '../utils/ApiResponse.js';
import { isTimeAfter } from '../utils/timeUtils.js';

// Get Today's Status
export const getTodayStatus = asyncHandler(async (req: AuthRequest, res: Response) => {

    const { userId } = req.params;
    if (!userId) {
        throw new ApiError(400, "User ID is required"); 
    }

    const today = new Date();
    const dayStart = new Date(today.setHours(0, 0, 0, 0));
    const dayEnd = new Date(today.setHours(23, 59, 59, 999));

    const log = await prisma.attendanceLogs.findFirst({
        where: {
            userId: Number(userId),
            date: {
                gte: dayStart,
                lte: dayEnd
            }
        },
        include: {
            attendanceTasks: {
                include: {
                    task: {
                        select: { title: true }
                    },
                    client: {
                        select: { name: true }
                    }
                }
            }
        },
        orderBy: { createdAt: 'desc' }
    });

    if (!log) {
        return res.status(200).json(
            new ApiResponse(200, { status: 'NOT_STARTED', log: null }, "Status fetched successfully")
        );
    }

    if (log.clock_out_time) {
        return res.status(200).json(
            new ApiResponse(200, { status: 'COMPLETED', log }, "Status fetched successfully")
        );
    }

    return res.status(200).json(
        new ApiResponse(200, { status: 'ONGOING', log }, "Status fetched successfully")
    );
});

// Clock In
export const clockIn = asyncHandler(async (req: AuthRequest, res: Response) => {

    const { 
        userId, 
        latitude, 
        longitude, 
        address, 
        plannedClientId, 
        plannedDept, 
        plannedTasks,
        taskIds,
        tasks,
        client_id,
        department
    } = req.body;

    const finalTaskIds = taskIds || tasks || [];
    const finalClientId = plannedClientId || client_id;
    const finalDept = plannedDept || department;

    if (!userId || !latitude || !longitude) {
        throw new ApiError(400, "All fields (userId, latitude, longitude) are required");
    }

    const today = new Date();
    const startOfDay = new Date(today.setHours(0, 0, 0, 0));
    const endOfDay = new Date(today.setHours(23, 59, 59, 999));

    // Check if already clocked in
    const existingLog = await prisma.attendanceLogs.findFirst({
        where: {
            userId: Number(userId),
            date: { 
                gte: startOfDay, 
                lte: endOfDay 
            },
            clock_out_time: null
        }
    });

    if (existingLog) {
        throw new ApiError(409, "You are already clocked in!");
    }

    const newLog = await prisma.attendanceLogs.create({
        data: {
            userId: Number(userId),
            date: new Date(),
            clock_in_time: new Date(),
            clock_in_latitude: parseFloat(latitude),
            clock_in_longitude: parseFloat(longitude),
            clock_in_address: address || "Unknown Location",
            status: 'PRESENT',
            plannedClientId: finalClientId ? Number(finalClientId) : null,
            plannedDept: finalDept || null,
            attendanceTasks: {
                create: (tasks && Array.isArray(tasks) && typeof tasks[0] === 'object')
                    ? tasks.map((t: any) => ({
                        taskId: Number(t.taskId),
                        clientId: t.clientId ? Number(t.clientId) : (finalClientId ? Number(finalClientId) : null),
                        department: t.department || finalDept || null
                    }))
                    : (finalTaskIds || []).map((id: any) => ({
                        taskId: Number(id),
                        clientId: finalClientId ? Number(finalClientId) : null,
                        department: finalDept || null
                    }))
            }
        },
        include: {
            attendanceTasks: {
                include: {
                    task: { select: { title: true } },
                    client: { select: { name: true } }
                }
            }
        }
    });

    return res.status(201).json(
        new ApiResponse(201, { log: newLog }, "Clocked In Successfully")
    );
});

// Clock Out
export const clockOut = asyncHandler(async (req: AuthRequest, res: Response) => {

    const { 
        userId, 
        latitude, 
        longitude, 
        address, 
        taskResults // Expected: [{ taskId: number, isCompleted: boolean, remarks: string }]
    } = req.body;
    if (!userId || !latitude || !longitude) {
        throw new ApiError(400, "All fields (userId, latitude, longitude) are required");
    }

    const today = new Date();
    const startOfDay = new Date(today.setHours(0, 0, 0, 0));
    const endOfDay = new Date(today.setHours(23, 59, 59, 999));

    // Find the active session
    const activeLog = await prisma.attendanceLogs.findFirst({
        where: {
            userId: Number(userId),
            date: { 
                gte: startOfDay, 
                lte: endOfDay 
            },
            clock_out_time: null
        }
    });

    if (!activeLog) {
        throw new ApiError(404, "No active session found to clock out from.");
    }

    const updatedLog = await prisma.attendanceLogs.update({
        where: { id: activeLog.id },
        data: {
            clock_out_time: new Date(),
            clock_out_latitude: parseFloat(latitude),
            clock_out_longitude: parseFloat(longitude),
            clock_out_address: address || "Unknown Location",
            status: 'PRESENT'
        }
    });

    // Update Task Results
    if (taskResults && Array.isArray(taskResults)) {
        for (const result of taskResults) {
            await prisma.attendanceTask.update({
                where: { id: Number(result.taskId) },
                data: {
                    isCompleted: Boolean(result.isCompleted),
                    remarks: result.remarks || null
                }
            });
        }
    }

    return res.status(200).json(
        new ApiResponse(200, { log: updatedLog }, "Clocked Out Successfully")
    );
});

export const getDailyAttendance = asyncHandler(async (req: AuthRequest, res: Response) => {

    const { date } = req.query; // Expects YYYY-MM-DD
    const targetDate = date ? new Date(date as string) : new Date();
    const start = startOfDay(targetDate);
    const end = endOfDay(targetDate);

    const logs = await prisma.attendanceLogs.findMany({
        where: {
            clock_in_time: { gte: start, lte: end }
        },
        include: {
            user: {
                select: { id: true, fullname: true, role: true }
            },
            plannedClient: {
                select: { id: true, name: true }
            },
            attendanceTasks: {
                include: {
                    task: { select: { title: true } },
                    client: { select: { name: true } }
                }
            }
        },
        orderBy: { clock_in_time: 'desc' }
    });

    const formattedLogs = logs.map(log => {
        // Late Logic: Check if clock_in is after 10:10 AM
        const checkInTime = new Date(log.clock_in_time);
        const isLate = isTimeAfter(checkInTime, "10:10");

        return {
            id: log.id,
            userId: log.user.id,
            user: log.user.fullname,
            role: log.user.role,
            clockIn: format(checkInTime, 'hh:mm a'),
            clockOut: log.clock_out_time ? format(new Date(log.clock_out_time), 'hh:mm a') : '--',
            status: log.clock_out_time ? "Present" : "Working",
            isLate,
            location: log.clock_in_address || 'Remote',
            // PDCA Fields
            plannedClient: log.plannedClient?.name || "--",
            plannedDept: log.plannedDept || "--",
            plannedTasks: log.plannedTasks || "--",
            reportTasksDone: log.reportTasksDone || "--",
            attendanceTasks: log.attendanceTasks.map(t => ({
                id: t.id,
                title: t.task.title,
                client: t.client?.name || "--",
                isCompleted: t.isCompleted,
                remarks: t.remarks
            }))
        };
    });

    return res.status(200).json(
        new ApiResponse(200, formattedLogs, "Daily attendance fetched")
    );
});

export const getEmployeeMonthlyHistory = asyncHandler(async (req: AuthRequest, res: Response) => {

    const { id } = req.params;
    const { month, year } = req.query;
    if (!month || !year) {
        throw new ApiError(400, "Month and Year are required");
    }

    const targetDate = new Date(Number(year), Number(month) - 1, 1);
    const start = startOfMonth(targetDate);
    const end = endOfMonth(targetDate);

    const user = await prisma.user.findUnique({
        where: { id: Number(id) },
        select: { fullname: true, role: true, shift_hours: true }
    });

    if (!user) {
        throw new ApiError(404, "Employee not found");
    }

    const logs = await prisma.attendanceLogs.findMany({
        where: {
            userId: Number(id),
            clock_in_time: {
                gte: start,
                lte: end
            }
        },
        include: {
            plannedClient: true,
            attendanceTasks: {
                include: { client: true }
            }
        },
        orderBy: { clock_in_time: 'desc' }
    });

    // Create a map of existing logs for quick lookup
    const logsMap = new Map();
    logs.forEach(log => {
        const dateStr = format(new Date(log.clock_in_time), 'yyyy-MM-dd');
        logsMap.set(dateStr, log);
    });

    const daysInMonth = getDaysInMonth(targetDate);
    const resultLogs = [];
    const now = new Date();

    for (let i = 1; i <= daysInMonth; i++) {
        const currentDate = new Date(Number(year), Number(month) - 1, i);
        const dateStr = format(currentDate, 'yyyy-MM-dd');

        // Stop if we reach a future date
        if (isAfter(startOfDay(currentDate), startOfDay(now))) {
            break;
        }

        if (logsMap.has(dateStr)) {
            const log = logsMap.get(dateStr);
            const checkIn = new Date(log.clock_in_time);
            const checkOut = log.clock_out_time ? new Date(log.clock_out_time) : null;

            let totalHrs = 0;
            if (checkOut) {
                totalHrs = (checkOut.getTime() - checkIn.getTime()) / (1000 * 60 * 60);
            }

            const clients = Array.from(new Set(log.attendanceTasks.map((at: any) => at.client?.name).filter(Boolean)));
            const displayClient = clients.length > 0 ? clients.join(", ") : (log.plannedClient?.name || "--");

            resultLogs.push({
                date: dateStr,
                clockIn: format(checkIn, 'hh:mm a'),
                clockOut: checkOut ? format(checkOut, 'hh:mm a') : '--',
                totalHrs: totalHrs.toFixed(2),
                requiredHrs: user.shift_hours || 9,
                status: checkOut ? "Present" : "Working",
                isLate: isTimeAfter(checkIn, "10:10"),
                location: log.clock_in_address || 'Office',
                plannedClient: displayClient,
                clients: clients,
                plannedDept: log.plannedDept || "--"
            });
        } else {
            // Mark as Absent for past dates/today if no log exists
            resultLogs.push({
                date: dateStr,
                clockIn: '--',
                clockOut: '--',
                totalHrs: '0.00',
                requiredHrs: user.shift_hours || 9,
                status: "Absent",
                isLate: false,
                location: '--',
                plannedClient: "--",
                plannedDept: "--"
            });
        }
    }

    return res.status(200).json(
        new ApiResponse(200, { employee: user, logs: resultLogs }, "Monthly history fetched")
    );
});

export const getClientMonthlyHistory = asyncHandler(async (req: AuthRequest, res: Response) => {

    const { id } = req.params;
    const { month, year } = req.query;

    let dateFilter = {};
    if (month && year && month !== '0' && year !== '0') {
        const targetDate = new Date(Number(year), Number(month) - 1, 1);
        const start = startOfMonth(targetDate);
        const end = endOfMonth(targetDate);
        dateFilter = { gte: start, lte: end };
    }
    
    const client = await prisma.client.findUnique({
        where: { id: Number(id) }
    });
    if (!client) {
        throw new ApiError(404, "Client not found");
    }

    const logs = await prisma.attendanceLogs.findMany({
        where: {
            OR: [
                { plannedClientId: Number(id) },
                {
                    attendanceTasks: {
                        some: {
                            clientId: Number(id)
                        }
                    }
                }
            ],
            clock_in_time: dateFilter
        },
        include: {
            user: {
                select: { fullname: true, role: true }
            },
            attendanceTasks: {
                where: { clientId: Number(id) },
                include: {
                    task: { select: { title: true } }
                }
            }
        },
        orderBy: { clock_in_time: 'desc' }
    });

    const formattedLogs = logs.map(log => {
        const checkIn = new Date(log.clock_in_time);
        const checkOut = log.clock_out_time ? new Date(log.clock_out_time) : null;

        let totalHrs = 0;
        if (checkOut) {
            totalHrs = (checkOut.getTime() - checkIn.getTime()) / (1000 * 60 * 60);
        }

        // Aggregate task titles for this client
        const taskTitles = log.attendanceTasks.map(at => at.task.title).join(", ");

        return {
            id: log.id,
            date: format(checkIn, 'yyyy-MM-dd'),
            employeeName: log.user.fullname,
            employeeRole: log.user.role,
            clockIn: format(checkIn, 'hh:mm a'),
            clockOut: checkOut ? format(checkOut, 'hh:mm a') : '--',
            totalHrs: totalHrs.toFixed(2),
            status: log.status,
            taskCount: log.attendanceTasks.length,
            plannedTasks: taskTitles || log.plannedTasks || '--',
            reportTasksDone: log.reportTasksDone || '--',
            location: log.clock_in_address || 'Remote'
        };
    });

    // Calculate total tasks performed for this client
    const totalTasks = logs.reduce((sum, log) => sum + log.attendanceTasks.length, 0);

    return res.status(200).json(
        new ApiResponse(200, { client, logs: formattedLogs, totalTasks }, "Client history fetched")
    );
});
