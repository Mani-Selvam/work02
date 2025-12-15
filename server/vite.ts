import express, { type Express } from "express";
import fs from "fs";
import path from "path";
import { type Server } from "http";

export function log(message: string, source = "express") {
    const formattedTime = new Date().toLocaleTimeString("en-US", {
        hour: "numeric",
        minute: "2-digit",
        second: "2-digit",
        hour12: true,
    });

    console.log(`${formattedTime} [${source}] ${message}`);
}

export async function setupVite(app: Express, server: Server) {
    if (process.env.NODE_ENV !== "development") {
        throw new Error("setupVite should only be called in development mode");
    }

    const { createServer: createViteServer, createLogger } = await import(
        "vite"
    );
    const { nanoid } = await import("nanoid");

    const viteLogger = createLogger();

    const serverOptions = {
        middlewareMode: true,
        hmr: { server },
        allowedHosts: true as const,
    };

    const rootDir = path.resolve(import.meta.dirname, "..", "client");

    const vite = await createViteServer({
        configFile: path.resolve(import.meta.dirname, "..", "vite.config.ts"),
        root: rootDir,
        customLogger: {
            ...viteLogger,
            error: (msg, options) => {
                viteLogger.error(msg, options);
            },
        },
        server: serverOptions,
        appType: "custom",
    });

    app.use(vite.middlewares);
    app.use("*", async (req, res, next) => {
        const url = req.originalUrl;

        try {
            const clientTemplate = path.resolve(
                import.meta.dirname,
                "..",
                "client",
                "index.html"
            );

            let template = await fs.promises.readFile(clientTemplate, "utf-8");
            template = template.replace(
                `src="/src/main.tsx"`,
                `src="/src/main.tsx?v=${nanoid()}"`
            );
            const page = await vite.transformIndexHtml(url, template);
            res.status(200).set({ "Content-Type": "text/html" }).end(page);
        } catch (e) {
            vite.ssrFixStacktrace(e as Error);
            next(e);
        }
    });
}

export function serveStatic(app: Express) {
    const currentDir =
        typeof __dirname !== "undefined" ? __dirname : import.meta.dirname;
    const distPath = path.resolve(currentDir, "public");

    console.log(`[serveStatic] Serving static files from: ${distPath}`);

    if (!fs.existsSync(distPath)) {
        throw new Error(
            `Could not find the build directory: ${distPath}, make sure to build the client first`
        );
    }

    app.use(express.static(distPath));

    // Catch-all handler for SPA routing - serve index.html for all non-API routes
    app.get("*", (req, res, next) => {
        // Skip API routes
        if (req.path.startsWith("/api") || req.path.startsWith("/ws")) {
            return next();
        }

        const indexPath = path.resolve(distPath, "index.html");
        console.log(`[serveStatic] Serving index.html for path: ${req.path}`);
        res.sendFile(indexPath);
    });
}
