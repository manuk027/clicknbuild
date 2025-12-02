import fs from 'fs';
import path from 'path';

export const customLogger = (req, res, next) => {
    const start = Date.now();
    res.on("finish", () => {
        const duration = Date.now() - start;
        const logMessage = `[${new Date().toISOString()}] ${req.method} ${req.originalUrl} : ${res.statusCode} (${duration}ms)\n`;
        const logFilePath = path.join(process.cwd(), "logs", "access.log");
        fs.appendFile(logFilePath, logMessage, (error) => {
            if (error) {
                console.error("Failed to write log: ", error);
            }
        })
    })
    next();
}