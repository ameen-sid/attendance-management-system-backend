import { config } from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

config({ path: path.resolve(__dirname, "../../.env") });

if (!process.env.JWT_SECRET) {
    console.error("FATAL: JWT_SECRET is not defined. Check your .env file.");
}

const ENV = {
    PORT: process.env.PORT || 3000,

    JWT_SECRET: process.env.JWT_SECRET || "",

    DATABASE_URL: process.env.DATABASE_URL || "",
    DB_HOST: process.env.DB_HOST || "",
    DB_USER: process.env.DB_USER || "",
    DB_PASS: process.env.DB_PASS || "",
    DATABASE: process.env.DATABASE || "",

    FRONTEND_URL: process.env.FRONTEND_URL || "http://localhost:5173",
}

export default ENV;