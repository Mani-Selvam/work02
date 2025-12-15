import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { serveStatic, log } from "./vite";
import { WebSocketServer } from "ws";
import { storage } from "./storage";
import bcrypt from "bcryptjs";
import session from "express-session";
import connectPgSimple from "connect-pg-simple";
import { Pool } from "pg";
import passport from "./passport";
import dotenv from "dotenv";
import cron from "node-cron";
import path from "path";
import cors from "cors";
dotenv.config();
const app = express();

const allowedOrigins = process.env.ALLOWED_ORIGINS
    ? process.env.ALLOWED_ORIGINS.split(",").map((origin) => origin.trim())
    : ["http://localhost:5000", "http://localhost:3000"];

app.use(
    cors({
        /*************  ✨ Windsurf Command ⭐  *************/
        /**
 * The origin function for CORS. This function is called by the cors middleware
 * for each incoming request. It checks if the origin of the request is allowed
 * and calls the callback function accordingly.
 *
 * @param {string} origin - The origin of the request.
/*******  869e80a9-2771-471b-8aa8-98d3138bd5cf  *******/ origin: (
            origin,
            callback
        ) => {
            if (!origin || allowedOrigins.includes(origin)) {
                callback(null, true);
            } else {
                log(`CORS blocked request from origin: ${origin}`);
                callback(new Error("Not allowed by CORS"), false);
            }
        },
        credentials: true,
        methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
        allowedHeaders: ["Content-Type", "Authorization", "x-user-id"],
    })
);

app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// Disable caching for Replit's iframe proxy
app.use((req, res, next) => {
    res.set(
        "Cache-Control",
        "no-store, no-cache, must-revalidate, proxy-revalidate"
    );
    res.set("Pragma", "no-cache");
    res.set("Expires", "0");
    next();
});

// Serve public files (including service worker) from root public directory
const currentDir =
    typeof __dirname !== "undefined" ? __dirname : import.meta.dirname;
app.use(express.static(path.join(currentDir, "..", "public")));

const PgSession = connectPgSimple(session);

const isProduction = process.env.NODE_ENV === "production";
const isCrossOrigin = !!process.env.ALLOWED_ORIGINS;

const sessionConfig: session.SessionOptions = {
    secret:
        process.env.SESSION_SECRET ||
        "worklogix-secret-key-change-in-production",
    resave: false,
    saveUninitialized: false,
    cookie: {
        secure: isProduction,
        httpOnly: true,
        maxAge: 24 * 60 * 60 * 1000,
        sameSite: isCrossOrigin ? "none" : "lax",
    },
};

if (process.env.DATABASE_URL) {
    const pool = new Pool({
        connectionString: process.env.DATABASE_URL,
    });
    sessionConfig.store = new PgSession({
        pool,
        tableName: "user_sessions",
        createTableIfMissing: true,
    });
    log("Using PostgreSQL session storage");
} else {
    log(
        "Warning: Using in-memory session storage (sessions will be lost on restart)"
    );
}

app.use(session(sessionConfig));

app.use(passport.initialize());
app.use(passport.session());

export let broadcast: (message: any) => void;

app.use((req, res, next) => {
    const start = Date.now();
    const path = req.path;
    let capturedJsonResponse: Record<string, any> | undefined = undefined;

    const originalResJson = res.json;
    res.json = function (bodyJson, ...args) {
        capturedJsonResponse = bodyJson;
        return originalResJson.apply(res, [bodyJson, ...args]);
    };

    res.on("finish", () => {
        const duration = Date.now() - start;
        if (path.startsWith("/api")) {
            let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
            if (capturedJsonResponse) {
                logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
            }

            if (logLine.length > 80) {
                logLine = logLine.slice(0, 79) + "…";
            }

            log(logLine);
        }
    });

    next();
});

async function initializeSuperAdmin() {
    try {
        const superAdminEmail = process.env.SUPER_ADMIN_EMAIL;
        const superAdminPassword = process.env.SUPER_ADMIN_PASSWORD;

        if (!superAdminEmail || !superAdminPassword) {
            log(
                "⚠️  Super Admin not initialized: SUPER_ADMIN_EMAIL and SUPER_ADMIN_PASSWORD environment variables must be set"
            );
            return;
        }

        const existingSuperAdmin = await storage.getUserByEmail(
            superAdminEmail
        );

        if (!existingSuperAdmin) {
            const hashedPassword = await bcrypt.hash(superAdminPassword, 10);
            await storage.createUser({
                email: superAdminEmail,
                displayName: "Super Admin",
                password: hashedPassword,
                role: "super_admin",
            });
            log(
                `✅ Super Admin created successfully with email: ${superAdminEmail}`
            );
        } else {
            log("ℹ️  Super Admin already exists");
        }
    } catch (error) {
        console.error("Error initializing super admin:", error);
    }
}

(async () => {
    const server = await registerRoutes(app);

    await initializeSuperAdmin();

    cron.schedule(
        "59 23 * * *",
        async () => {
            try {
                const today = new Date().toISOString().split("T")[0];
                const markedCount = await storage.markAbsentUsers(today);
                log(
                    `✅ Auto-marked ${markedCount} users as absent for ${today}`
                );
            } catch (error) {
                console.error("Error in daily absent marking cron job:", error);
            }
        },
        {
            timezone: "Asia/Kolkata",
        }
    );

    log("📅 Daily absent marking cron job scheduled at 11:59 PM IST");

    const wss = new WebSocketServer({ noServer: true });

    server.on("upgrade", (request, socket, head) => {
        const url = request.url || "";
        log(`[WebSocket] Upgrade request received for: ${url}`);

        // Use startsWith to handle query parameters that Render might add
        if (url.startsWith("/ws")) {
            log(`[WebSocket] Upgrading connection for path: ${url}`);
            wss.handleUpgrade(request, socket, head, (ws) => {
                wss.emit("connection", ws, request);
            });
        } else {
            log(`[WebSocket] Rejected upgrade for path: ${url}`);
            socket.destroy();
        }
    });

    // Ping interval to keep connections alive (Render has 60s timeout)
    const pingInterval = setInterval(() => {
        wss.clients.forEach((ws) => {
            if (ws.readyState === 1) {
                ws.ping();
            }
        });
    }, 30000); // Ping every 30 seconds

    wss.on("close", () => {
        clearInterval(pingInterval);
    });

    wss.on("connection", (ws) => {
        log(`[WebSocket] Client connected. Total clients: ${wss.clients.size}`);

        ws.on("error", (error) => {
            console.error("[WebSocket] Client error:", error);
        });

        ws.on("pong", () => {
            // Client responded to ping - connection is alive
        });

        ws.on("close", () => {
            log(
                `[WebSocket] Client disconnected. Total clients: ${wss.clients.size}`
            );
        });
    });

    broadcast = (message: any) => {
        console.log(
            `[WebSocket] Broadcasting to ${wss.clients.size} clients:`,
            message.type
        );
        wss.clients.forEach((client) => {
            if (client.readyState === 1) {
                client.send(JSON.stringify(message));
            }
        });
    };

    app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
        const status = err.status || err.statusCode || 500;
        const message = err.message || "Internal Server Error";

        res.status(status).json({ message });
        throw err;
    });

    // In production, serve static files
    if (process.env.NODE_ENV === "production") {
        serveStatic(app);
    }

    // In development: server runs on port 3000, client (Vite) on port 5000 proxies here
    // In production: server runs on port 5000 and serves static files
    const port =
        process.env.NODE_ENV === "production"
            ? parseInt(process.env.PORT || "5000", 10)
            : 3000;
    server.listen(
        {
            port,
            host: "0.0.0.0",
        },
        () => {
            log(`serving on port ${port}`);
        }
    );
})();
