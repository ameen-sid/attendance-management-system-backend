import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import ENV from './configs/env.js';
import authRoutes from './routes/auth.routes.js';
import employeeRoutes from './routes/employee.routes.js';
import attendanceRoutes from './routes/attendance.routes.js';
import dashboardRoutes from './routes/dashboard.routes.js';
import clientRoutes from './routes/client.routes.js';
import taskRoutes from './routes/task.routes.js';
import eventRoutes from './routes/event.routes.js';
import notificationRoutes from './routes/notification.routes.js';

const app = express();

app.use(express.json());
app.use(express.urlencoded());
app.use(cookieParser());

const allowedOrigins = [
    process.env.FRONTEND_URL || "https://ams.sarvagyainnovation.com",
    "http://localhost:5173"
];

const corsOptions = {
    origin: allowedOrigins,
    credentials: true,
    optionsSuccessStatus: 200,
    maxAge: 86400,
};
app.use(cors(corsOptions));

app.use('/api/auth', authRoutes);
app.use('/api/employee', employeeRoutes);
app.use('/api/attendance', attendanceRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/client', clientRoutes);
app.use('/api/task', taskRoutes);
app.use('/api/event', eventRoutes);
app.use('/api/notification', notificationRoutes);

// Global Error Handler Middleware (must be after all routes)
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
    const statusCode = err?.statusCode || 500;
    const message = err?.message || 'Internal Server Error';

    return res.status(statusCode).json({
        statusCode,
        data: err?.data || null,
        message,
        success: false,
        errors: err?.errors || []
    });
});

export default app;