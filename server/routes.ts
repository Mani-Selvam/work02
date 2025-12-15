import type { Express } from "express";
import express from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { broadcast } from "./index";
import { sendPushNotificationToUser } from "./lib/firebase-admin";
import {
    insertCompanySchema,
    insertUserSchema,
    insertTaskSchema,
    insertReportSchema,
    insertMessageSchema,
    insertRatingSchema,
    insertFileUploadSchema,
    insertGroupMessageSchema,
    insertGroupMessageReplySchema,
    insertFeedbackSchema,
    loginSchema,
    signupSchema,
    firebaseSigninSchema,
    companyRegistrationSchema,
    companyBasicRegistrationSchema,
    superAdminLoginSchema,
    companyAdminLoginSchema,
    companyUserLoginSchema,
    insertSlotPricingSchema,
    insertCompanyPaymentSchema,
    updatePaymentStatusSchema,
    slotPurchaseSchema,
    passwordResetRequestSchema,
    passwordResetSchema,
    insertAttendanceRecordSchema,
    insertCorrectionRequestSchema,
} from "@shared/schema";
import { z } from "zod";
import bcrypt from "bcryptjs";
import {
    sendReportNotification,
    sendCompanyServerIdEmail,
    sendUserIdEmail,
    sendPasswordResetEmail,
    sendPaymentConfirmationEmail,
    sendCompanyVerificationEmail,
} from "./email";
import crypto from "crypto";
import Stripe from "stripe";
import passport from "passport";

const stripe = process.env.STRIPE_SECRET_KEY
    ? new Stripe(process.env.STRIPE_SECRET_KEY)
    : null;

const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET || "";

const isGoogleOAuthConfigured = !!(
    process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET
);

async function requireAuth(
    req: express.Request,
    res: express.Response,
    next: express.NextFunction
) {
    const userId = parseInt(req.headers["x-user-id"] as string);
    if (!userId) {
        return res.status(401).json({ message: "Authentication required" });
    }

    const user = await storage.getUserById(userId);
    if (!user || !user.isActive) {
        return res
            .status(401)
            .json({ message: "User account disabled", code: "USER_INACTIVE" });
    }

    next();
}

async function requireAdmin(
    req: express.Request,
    res: express.Response,
    next: express.NextFunction
) {
    const userId = parseInt(req.headers["x-user-id"] as string);
    if (!userId) {
        return res.status(401).json({ message: "Authentication required" });
    }

    const user = await storage.getUserById(userId);
    if (!user || !user.isActive) {
        return res
            .status(401)
            .json({ message: "User account disabled", code: "USER_INACTIVE" });
    }

    if (user.role !== "company_admin" && user.role !== "super_admin") {
        return res.status(403).json({ message: "Admin access required" });
    }

    next();
}

export async function registerRoutes(app: Express): Promise<Server> {
    // Config endpoint to check feature availability
    app.get("/api/config", (req, res) => {
        res.json({
            googleOAuthEnabled: isGoogleOAuthConfigured,
            stripeEnabled: !!stripe,
        });
    });

    // Stripe Webhook Handler (MUST be before express.json() middleware)
    // This endpoint needs raw body for signature verification
    app.post(
        "/api/stripe-webhook",
        express.raw({ type: "application/json" }),
        async (req, res, next) => {
            try {
                if (!stripe) {
                    return res
                        .status(500)
                        .json({ message: "Payment gateway not configured" });
                }

                const sig = req.headers["stripe-signature"];
                if (!sig) {
                    return res.status(400).send("No signature header");
                }

                let event: Stripe.Event;

                try {
                    event = stripe.webhooks.constructEvent(
                        req.body,
                        sig,
                        endpointSecret
                    );
                } catch (err: any) {
                    console.error(
                        "Webhook signature verification failed:",
                        err.message
                    );
                    return res
                        .status(400)
                        .send(`Webhook Error: ${err.message}`);
                }

                // Handle payment_intent.succeeded event
                if (event.type === "payment_intent.succeeded") {
                    const paymentIntent = event.data
                        .object as Stripe.PaymentIntent;

                    console.log("Payment succeeded webhook received:", {
                        id: paymentIntent.id,
                        amount: paymentIntent.amount,
                        metadata: paymentIntent.metadata,
                    });

                    const paymentId = parseInt(
                        paymentIntent.metadata.paymentId || "0"
                    );
                    const companyId = parseInt(
                        paymentIntent.metadata.companyId || "0"
                    );
                    const slotType = paymentIntent.metadata.slotType;
                    const quantity = parseInt(
                        paymentIntent.metadata.quantity || "0"
                    );

                    if (!paymentId || !companyId) {
                        console.error("Invalid metadata in payment intent");
                        return res
                            .status(400)
                            .json({ message: "Invalid payment metadata" });
                    }

                    // Get payment record
                    const payment = await storage.getPaymentById(paymentId);
                    if (!payment) {
                        console.error("Payment not found:", paymentId);
                        return res
                            .status(404)
                            .json({ message: "Payment not found" });
                    }

                    // Prevent duplicate processing
                    if (payment.paymentStatus === "paid") {
                        console.log("Payment already processed:", paymentId);
                        return res.json({
                            received: true,
                            message: "Already processed",
                        });
                    }

                    // Get company details
                    const company = await storage.getCompanyById(companyId);
                    if (!company) {
                        console.error("Company not found:", companyId);
                        return res
                            .status(404)
                            .json({ message: "Company not found" });
                    }

                    // Generate unique receipt number
                    const date = new Date();
                    const dateStr = date
                        .toISOString()
                        .slice(0, 10)
                        .replace(/-/g, "");
                    const receiptNumber = `WL-RCPT-${dateStr}-${paymentId
                        .toString()
                        .padStart(6, "0")}`;

                    // Prepare slot updates
                    const slotUpdates =
                        slotType === "admin"
                            ? { maxAdmins: quantity }
                            : { maxMembers: quantity };

                    // CRITICAL: Atomic transaction - complete payment and update slots together
                    const updatedPayment =
                        await storage.completePaymentWithSlots(
                            paymentId,
                            companyId,
                            receiptNumber,
                            paymentIntent.id,
                            slotUpdates
                        );

                    if (updatedPayment) {
                        console.log("Payment completed successfully:", {
                            paymentId,
                            receiptNumber,
                            slotType,
                            quantity,
                        });

                        // Send notifications to Super Admin and Company
                        try {
                            // Get super admin
                            const superAdmin = await storage.getUserByEmail(
                                "superadmin@worklogix.com"
                            );

                            // Send email to company
                            await sendPaymentConfirmationEmail({
                                companyName: company.name,
                                companyEmail: company.email,
                                receiptNumber,
                                amount: payment.amount,
                                currency: payment.currency,
                                slotType: slotType || "",
                                slotQuantity: quantity,
                                transactionId: paymentIntent.id,
                                paymentDate: new Date(),
                            });

                            // Send notification to super admin
                            if (superAdmin) {
                                await sendPaymentConfirmationEmail({
                                    companyName: `[ADMIN NOTIFICATION] ${company.name}`,
                                    companyEmail: superAdmin.email,
                                    receiptNumber,
                                    amount: payment.amount,
                                    currency: payment.currency,
                                    slotType: slotType || "",
                                    slotQuantity: quantity,
                                    transactionId: paymentIntent.id,
                                    paymentDate: new Date(),
                                });
                            }

                            console.log("Notifications sent successfully");
                        } catch (emailError) {
                            console.error(
                                "Error sending notifications:",
                                emailError
                            );
                            // Don't fail the webhook if email fails
                        }
                    }
                }

                res.json({ received: true });
            } catch (error: any) {
                console.error("Webhook handler error:", error);
                next(error);
            }
        }
    );
    // Company Registration
    app.post("/api/auth/register-company", async (req, res, next) => {
        try {
            const validatedData = companyRegistrationSchema.parse(req.body);

            const existingCompany = await storage.getCompanyByEmail(
                validatedData.email
            );
            if (existingCompany) {
                return res.status(400).json({
                    message: "Company with this email already exists",
                });
            }

            const hashedPassword = await bcrypt.hash(
                validatedData.password,
                10
            );
            const verificationToken = crypto.randomBytes(32).toString("hex");

            const company = await storage.createCompany({
                name: validatedData.name,
                email: validatedData.email,
                password: hashedPassword,
                phone: validatedData.mobile,
                website: validatedData.website,
                location: validatedData.country,
                description: validatedData.description,

                companyType: validatedData.companyType,
                contactPerson: validatedData.contactPerson,
                designation: validatedData.designation,
                mobile: validatedData.mobile,

                address: validatedData.address,
                pincode: validatedData.pincode,
                city: validatedData.city,
                state: validatedData.state,
                country: validatedData.country,

                employees: validatedData.employees,
                annualTurnover: validatedData.annualTurnover,
                yearEstablished: validatedData.yearEstablished,
                logo: validatedData.logo,

                verificationToken,
                emailVerified: false,
            });

            await sendCompanyServerIdEmail({
                companyName: company.name,
                companyEmail: company.email,
                serverId: company.serverId,
            });

            const { password: _, ...companyWithoutPassword } = company;
            res.json({
                ...companyWithoutPassword,
                message: `Company registered successfully! Your Company Server ID is: ${company.serverId}. Please save this ID, it will be required for login. An email has been sent to ${company.email} with your server ID.`,
            });
        } catch (error) {
            if (error instanceof z.ZodError) {
                return res
                    .status(400)
                    .json({ message: error.errors[0].message });
            }
            next(error);
        }
    });

    // Company Basic Registration (Manual)
    app.post("/api/auth/register-company-basic", async (req, res, next) => {
        try {
            const validatedData = companyBasicRegistrationSchema.parse(
                req.body
            );

            const existingCompany = await storage.getCompanyByEmail(
                validatedData.email
            );
            if (existingCompany) {
                return res.status(400).json({
                    message: "A company with this email already exists",
                });
            }

            const hashedPassword = await bcrypt.hash(
                validatedData.password,
                10
            );
            const verificationToken = crypto.randomBytes(32).toString("hex");
            const verificationTokenExpiry = new Date(
                Date.now() + 24 * 60 * 60 * 1000
            );

            const company = await storage.createCompany({
                name: validatedData.companyName,
                email: validatedData.email,
                password: hashedPassword,
                contactPerson: validatedData.companyName,
                verificationToken,
                verificationTokenExpiry,
                emailVerified: false,
            });

            // Determine the correct frontend URL for verification emails
            let baseUrl: string;
            
            // Priority 1: Replit domains (development and production)
            if (process.env.REPLIT_DEV_DOMAIN) {
                baseUrl = `https://${process.env.REPLIT_DEV_DOMAIN}`;
            } else if (process.env.REPLIT_DOMAINS) {
                // REPLIT_DOMAINS can be comma-separated, take the first one
                const domains = process.env.REPLIT_DOMAINS.split(',');
                baseUrl = `https://${domains[0].trim()}`;
            }
            // Priority 2: Use Origin or Referer header from the request
            else if (req.headers.origin) {
                baseUrl = req.headers.origin as string;
            } else if (req.headers.referer) {
                const refererUrl = new URL(req.headers.referer as string);
                baseUrl = `${refererUrl.protocol}//${refererUrl.host}`;
            }
            // Priority 3: Explicit environment variables
            else if (process.env.FRONTEND_URL) {
                baseUrl = process.env.FRONTEND_URL;
            }
            // Priority 4: Fall back to request headers
            else {
                const protocol = req.headers["x-forwarded-proto"] || req.protocol || "https";
                const host = req.headers["x-forwarded-host"] || req.headers.host;
                baseUrl = `${protocol}://${host}`;
            }
            
            console.log(`[REGISTRATION] Using base URL for verification email: ${baseUrl}`);

            await sendCompanyVerificationEmail({
                companyName: validatedData.companyName,
                email: validatedData.email,
                serverId: company.serverId,
                verificationToken,
                baseUrl,
            });

            res.json({
                serverId: company.serverId,
                email: company.email,
                message: `Registration successful! Your Company Server ID is ${company.serverId}. Please check your email to verify your account.`,
            });
        } catch (error) {
            if (error instanceof z.ZodError) {
                return res
                    .status(400)
                    .json({ message: error.errors[0].message });
            }
            next(error);
        }
    });

    // Google OAuth - Initiate
    app.get("/api/auth/google", (req, res, next) => {
        if (!isGoogleOAuthConfigured) {
            return res.redirect("/?error=google_oauth_not_configured");
        }
        passport.authenticate("google", {
            scope: ["profile", "email"],
        })(req, res, next);
    });

    // Google OAuth - Callback
    app.get(
        "/api/auth/google/callback",
        (req, res, next) => {
            if (!isGoogleOAuthConfigured) {
                return res.redirect("/?error=google_oauth_not_configured");
            }
            passport.authenticate("google", {
                failureRedirect: "/?error=google_auth_failed",
                session: false,
            })(req, res, next);
        },
        async (req, res, next) => {
            try {
                const googleUser = req.user as any;

                if (!googleUser || !googleUser.email) {
                    return res.redirect("/?error=no_email");
                }

                const existingCompany = await storage.getCompanyByEmail(
                    googleUser.email
                );
                if (existingCompany) {
                    return res.redirect(
                        `/?error=company_exists&email=${encodeURIComponent(
                            googleUser.email
                        )}`
                    );
                }

                const company = await storage.createCompany({
                    name:
                        googleUser.displayName ||
                        googleUser.email.split("@")[0],
                    email: googleUser.email,
                    password: "",
                    contactPerson:
                        googleUser.displayName ||
                        googleUser.email.split("@")[0],
                    logo: googleUser.photoURL,
                    emailVerified: true,
                });

                const admin = await storage.createUser({
                    email: googleUser.email,
                    displayName: googleUser.displayName,
                    photoURL: googleUser.photoURL,
                    role: "company_admin",
                    companyId: company.id,
                });

                await sendCompanyServerIdEmail({
                    companyName: company.name,
                    companyEmail: company.email,
                    serverId: company.serverId,
                });

                res.redirect(
                    `/?success=true&serverId=${
                        company.serverId
                    }&email=${encodeURIComponent(company.email)}`
                );
            } catch (error) {
                console.error("Google OAuth callback error:", error);
                res.redirect("/?error=registration_failed");
            }
        }
    );

    // Verify Company Email
    app.get("/api/auth/verify-company", async (req, res, next) => {
        try {
            const { token } = req.query;
            console.log(
                `[VERIFY] Verification request received with token: ${
                    token
                        ? token.toString().substring(0, 20) + "..."
                        : "missing"
                }`
            );

            if (!token || typeof token !== "string") {
                console.log("[VERIFY] Token is missing or invalid type");
                return res
                    .status(400)
                    .json({ message: "Verification token is required" });
            }

            console.log(`[VERIFY] Looking up company with token...`);
            const company = await storage.verifyCompanyEmail(token);

            if (!company) {
                console.log(
                    "[VERIFY] No company found with this token or token expired"
                );
                return res
                    .status(400)
                    .json({ message: "Invalid or expired verification token" });
            }

            console.log(
                `[VERIFY] Company verified successfully: ${company.serverId}`
            );
            const { password: _, ...companyWithoutPassword } = company;
            res.json({
                company: companyWithoutPassword,
                message:
                    "Email verified successfully! You can now log in to your dashboard.",
            });
        } catch (error) {
            console.error("[VERIFY] Error during verification:", error);
            next(error);
        }
    });

    // Super Admin Login
    app.post("/api/auth/super-admin-login", async (req, res, next) => {
        try {
            const validatedData = superAdminLoginSchema.parse(req.body);

            const user = await storage.getUserByEmail(validatedData.email);
            if (!user || user.role !== "super_admin" || !user.password) {
                return res.status(401).json({
                    message: "Invalid credentials or not a super admin",
                });
            }

            const isValidPassword = await bcrypt.compare(
                validatedData.password,
                user.password
            );
            if (!isValidPassword) {
                return res
                    .status(401)
                    .json({ message: "Invalid email or password" });
            }

            const { password: _, ...userWithoutPassword } = user;
            res.json(userWithoutPassword);
        } catch (error) {
            if (error instanceof z.ZodError) {
                return res
                    .status(400)
                    .json({ message: error.errors[0].message });
            }
            next(error);
        }
    });

    // Company Admin Login
    app.post("/api/auth/company-admin-login", async (req, res, next) => {
        try {
            const validatedData = companyAdminLoginSchema.parse(req.body);

            const company = await storage.getCompanyByServerId(
                validatedData.serverId
            );
            if (!company) {
                return res
                    .status(401)
                    .json({ message: "Invalid Company Server ID" });
            }

            if (!company.emailVerified) {
                return res.status(401).json({
                    message:
                        "Please verify your email before logging in. Check your inbox for the verification link.",
                });
            }

            if (
                company.name.toLowerCase() !==
                    validatedData.companyName.toLowerCase() ||
                company.email.toLowerCase() !==
                    validatedData.email.toLowerCase()
            ) {
                return res
                    .status(401)
                    .json({ message: "Invalid company credentials" });
            }

            if (company.password) {
                const isValidPassword = await bcrypt.compare(
                    validatedData.password,
                    company.password
                );
                if (!isValidPassword) {
                    return res
                        .status(401)
                        .json({ message: "Invalid password" });
                }
            }

            const adminUsers = await storage.getUsersByCompanyId(company.id);
            const adminUser = adminUsers.find(
                (u) =>
                    u.role === "company_admin" &&
                    u.email === validatedData.email
            );

            if (!adminUser) {
                const hashedUserPassword = await bcrypt.hash(
                    validatedData.password,
                    10
                );
                const newAdmin = await storage.createUser({
                    email: validatedData.email,
                    displayName: validatedData.companyName + " Admin",
                    password: hashedUserPassword,
                    role: "company_admin",
                    companyId: company.id,
                });

                await sendUserIdEmail({
                    userName: newAdmin.displayName,
                    userEmail: newAdmin.email,
                    uniqueUserId: newAdmin.uniqueUserId,
                    role: newAdmin.role,
                });

                const { password: _, ...userWithoutPassword } = newAdmin;
                return res.json({
                    ...userWithoutPassword,
                    message: `Welcome! Your unique User ID is: ${newAdmin.uniqueUserId}. An email has been sent to ${newAdmin.email} with your user ID.`,
                });
            }

            const isProfileComplete = !!(
                company.companyType &&
                company.designation &&
                company.address &&
                company.pincode &&
                company.city &&
                company.state &&
                company.country &&
                company.employees &&
                company.annualTurnover &&
                company.yearEstablished
            );

            const { password: _, ...userWithoutPassword } = adminUser;
            res.json({
                ...userWithoutPassword,
                companyProfileComplete: isProfileComplete,
            });
        } catch (error) {
            if (error instanceof z.ZodError) {
                return res
                    .status(400)
                    .json({ message: error.errors[0].message });
            }
            next(error);
        }
    });

    // Company User Login
    app.post("/api/auth/company-user-login", async (req, res, next) => {
        try {
            const validatedData = companyUserLoginSchema.parse(req.body);

            const user = await storage.getUserByUniqueUserId(
                validatedData.userId
            );
            if (!user || !user.password) {
                return res.status(401).json({ message: "Invalid User ID" });
            }

            if (!user.isActive) {
                return res.status(401).json({
                    message:
                        "Account is inactive. Please contact your administrator.",
                });
            }

            if (!user.companyId) {
                return res.status(401).json({
                    message: "User is not associated with any company",
                });
            }

            if (user.displayName !== validatedData.username) {
                return res.status(401).json({ message: "Invalid username" });
            }

            if (user.role === "super_admin" || user.role === "company_admin") {
                return res.status(401).json({
                    message:
                        "Please use the appropriate login form for your role",
                });
            }

            const isValidPassword = await bcrypt.compare(
                validatedData.password,
                user.password
            );
            if (!isValidPassword) {
                return res.status(401).json({ message: "Invalid password" });
            }

            const { password: _, ...userWithoutPassword } = user;
            res.json(userWithoutPassword);
        } catch (error) {
            if (error instanceof z.ZodError) {
                return res
                    .status(400)
                    .json({ message: error.errors[0].message });
            }
            next(error);
        }
    });

    // User routes
    app.post("/api/auth/signup", async (req, res, next) => {
        try {
            const validatedData = signupSchema.parse(req.body);

            const existingUser = await storage.getUserByEmail(
                validatedData.email
            );
            if (existingUser) {
                return res.status(400).json({ message: "User already exists" });
            }

            const hashedPassword = await bcrypt.hash(
                validatedData.password,
                10
            );

            // Public signup only creates super admins
            // Company users must be created by admins via POST /api/users
            const role = validatedData.email
                .toLowerCase()
                .includes("superadmin")
                ? "super_admin"
                : null;

            if (!role) {
                return res.status(400).json({
                    message:
                        "Public signup is restricted. Please contact your company administrator to create an account.",
                });
            }

            const user = await storage.createUser({
                email: validatedData.email,
                displayName: validatedData.displayName,
                password: hashedPassword,
                role,
            });

            const { password: _, ...userWithoutPassword } = user;
            res.json(userWithoutPassword);
        } catch (error) {
            if (error instanceof z.ZodError) {
                return res
                    .status(400)
                    .json({ message: error.errors[0].message });
            }
            next(error);
        }
    });

    app.post("/api/auth/login", async (req, res, next) => {
        try {
            const validatedData = loginSchema.parse(req.body);

            const user = await storage.getUserByEmail(validatedData.email);
            if (!user || !user.password) {
                return res
                    .status(401)
                    .json({ message: "Invalid email or password" });
            }

            const isValidPassword = await bcrypt.compare(
                validatedData.password,
                user.password
            );
            if (!isValidPassword) {
                return res
                    .status(401)
                    .json({ message: "Invalid email or password" });
            }

            const { password: _, ...userWithoutPassword } = user;

            let companyProfileComplete = true;
            if (user.role === "company_admin" && user.companyId) {
                const company = await storage.getCompanyById(user.companyId);
                if (company) {
                    companyProfileComplete = !!(
                        company.companyType &&
                        company.designation &&
                        company.address &&
                        company.pincode &&
                        company.city &&
                        company.state &&
                        company.country &&
                        company.employees &&
                        company.annualTurnover &&
                        company.yearEstablished
                    );
                }
            }

            res.json({ ...userWithoutPassword, companyProfileComplete });
        } catch (error) {
            if (error instanceof z.ZodError) {
                return res
                    .status(400)
                    .json({ message: error.errors[0].message });
            }
            next(error);
        }
    });

    app.post("/api/auth/signin", async (req, res, next) => {
        try {
            const validatedData = firebaseSigninSchema.parse(req.body);

            let user = await storage.getUserByFirebaseUid(
                validatedData.firebaseUid
            );

            if (!user) {
                user = await storage.getUserByEmail(validatedData.email);

                if (!user) {
                    // Firebase signin only creates super admins
                    // Company users must be created by admins
                    const role = validatedData.email
                        .toLowerCase()
                        .includes("superadmin")
                        ? "super_admin"
                        : null;

                    if (!role) {
                        return res.status(400).json({
                            message:
                                "Account not found. Please contact your company administrator to create an account.",
                        });
                    }

                    user = await storage.createUser({
                        email: validatedData.email,
                        displayName: validatedData.displayName,
                        photoURL: validatedData.photoURL,
                        firebaseUid: validatedData.firebaseUid,
                        role,
                    });
                }
            }

            const { password: _, ...userWithoutPassword } = user;

            let companyProfileComplete = true;
            if (user.role === "company_admin" && user.companyId) {
                const company = await storage.getCompanyById(user.companyId);
                if (company) {
                    companyProfileComplete = !!(
                        company.companyType &&
                        company.designation &&
                        company.address &&
                        company.pincode &&
                        company.city &&
                        company.state &&
                        company.country &&
                        company.employees &&
                        company.annualTurnover &&
                        company.yearEstablished
                    );
                }
            }

            res.json({ ...userWithoutPassword, companyProfileComplete });
        } catch (error) {
            if (error instanceof z.ZodError) {
                return res
                    .status(400)
                    .json({ message: error.errors[0].message });
            }
            next(error);
        }
    });

    app.get("/api/users", async (req, res, next) => {
        try {
            const requestingUserId = req.headers["x-user-id"];
            if (!requestingUserId) {
                return res
                    .status(401)
                    .json({ message: "Authentication required" });
            }

            const requestingUser = await storage.getUserById(
                parseInt(requestingUserId as string)
            );
            if (!requestingUser) {
                return res.status(404).json({ message: "User not found" });
            }

            const { includeDeleted } = req.query;
            let users = await storage.getAllUsers(includeDeleted === "true");

            // Filter by company unless super_admin
            if (requestingUser.role === "super_admin") {
                // Super admins can see all users
            } else if (requestingUser.companyId) {
                // Company admins and members can only see users in their company
                users = users.filter(
                    (u) => u.companyId === requestingUser.companyId
                );
            } else {
                // Users without a company can't see any users
                users = [];
            }

            const usersWithoutPasswords = users.map(
                ({ password: _, ...user }) => user
            );
            res.json(usersWithoutPasswords);
        } catch (error) {
            next(error);
        }
    });

    app.get("/api/users/:id", async (req, res, next) => {
        try {
            const requestingUserId = req.headers["x-user-id"];
            if (!requestingUserId) {
                return res
                    .status(401)
                    .json({ message: "Authentication required" });
            }

            const requestingUser = await storage.getUserById(
                parseInt(requestingUserId as string)
            );
            if (!requestingUser) {
                return res
                    .status(404)
                    .json({ message: "Requesting user not found" });
            }

            const user = await storage.getUserById(parseInt(req.params.id));
            if (!user) {
                return res.status(404).json({ message: "User not found" });
            }

            // Company scoping: users can only view users in their company (or all if super_admin)
            if (
                requestingUser.role !== "super_admin" &&
                user.companyId !== requestingUser.companyId
            ) {
                return res.status(403).json({ message: "Access denied" });
            }

            const { password: _, ...userWithoutPassword } = user;
            res.json(userWithoutPassword);
        } catch (error) {
            next(error);
        }
    });

    // Get the assigned team leader for the current user
    app.get("/api/team-leader/me", requireAuth, async (req, res, next) => {
        try {
            const requestingUserId = parseInt(
                req.headers["x-user-id"] as string
            );
            const requestingUser = await storage.getUserById(requestingUserId);

            if (!requestingUser) {
                return res.status(404).json({ message: "User not found" });
            }

            // Only company members can use this endpoint
            if (requestingUser.role !== "company_member") {
                return res.status(403).json({
                    message: "Only company members can view their team leader",
                });
            }

            // Get the assigned team leader
            const teamLeader = await storage.getTeamLeaderByMember(
                requestingUser.id
            );

            if (!teamLeader) {
                return res.status(404).json({ message: "NOT_ASSIGNED" });
            }

            // Return minimal leader payload (normalize null photoURL to undefined)
            const leaderData = {
                id: teamLeader.id,
                displayName: teamLeader.displayName,
                email: teamLeader.email,
                photoURL: teamLeader.photoURL || undefined,
            };

            res.json(leaderData);
        } catch (error) {
            next(error);
        }
    });

    app.patch("/api/users/:id/role", async (req, res, next) => {
        try {
            const requestingUserId = req.headers["x-user-id"];
            if (!requestingUserId) {
                return res
                    .status(401)
                    .json({ message: "Authentication required" });
            }

            const requestingUser = await storage.getUserById(
                parseInt(requestingUserId as string)
            );
            if (
                !requestingUser ||
                (requestingUser.role !== "company_admin" &&
                    requestingUser.role !== "super_admin")
            ) {
                return res
                    .status(403)
                    .json({ message: "Only admins can update roles" });
            }

            const targetUser = await storage.getUserById(
                parseInt(req.params.id)
            );
            if (!targetUser) {
                return res.status(404).json({ message: "User not found" });
            }

            // Company scoping: admins can only update users in their company (or all if super_admin)
            if (
                requestingUser.role !== "super_admin" &&
                targetUser.companyId !== requestingUser.companyId
            ) {
                return res.status(403).json({ message: "Access denied" });
            }

            const { role } = req.body;
            await storage.updateUserRole(parseInt(req.params.id), role);
            res.json({ message: "Role updated successfully" });
        } catch (error) {
            next(error);
        }
    });

    app.post("/api/users", async (req, res, next) => {
        try {
            const requestingUserId = req.headers["x-user-id"];

            if (!requestingUserId) {
                return res
                    .status(401)
                    .json({ message: "Authentication required" });
            }

            const requestingUser = await storage.getUserById(
                parseInt(requestingUserId as string)
            );

            if (
                !requestingUser ||
                (requestingUser.role !== "company_admin" &&
                    requestingUser.role !== "super_admin")
            ) {
                return res
                    .status(403)
                    .json({ message: "Only admins can create users" });
            }

            const validatedData = insertUserSchema.parse(req.body);

            const existingUser = await storage.getUserByEmail(
                validatedData.email
            );
            if (existingUser) {
                return res.status(400).json({ message: "User already exists" });
            }

            // Check slot availability for company admins
            if (
                requestingUser.role === "company_admin" &&
                requestingUser.companyId
            ) {
                const company = await storage.getCompanyById(
                    requestingUser.companyId
                );
                const users = await storage.getUsersByCompanyId(
                    requestingUser.companyId
                );

                if (!company) {
                    return res
                        .status(404)
                        .json({ message: "Company not found" });
                }

                const adminCount = users.filter(
                    (u) => u.role === "company_admin"
                ).length;
                const memberCount = users.filter(
                    (u) =>
                        u.role === "company_member" || u.role === "team_leader"
                ).length;

                if (
                    validatedData.role === "company_admin" &&
                    adminCount >= company.maxAdmins
                ) {
                    return res.status(400).json({
                        message: `Admin slots full. Current: ${adminCount}/${company.maxAdmins}. Please upgrade your plan.`,
                    });
                }

                // Team leaders and members count against maxMembers limit
                if (
                    (validatedData.role === "company_member" ||
                        validatedData.role === "team_leader") &&
                    memberCount >= company.maxMembers
                ) {
                    return res.status(400).json({
                        message: `Member slots full (includes team leaders). Current: ${memberCount}/${company.maxMembers}. Please upgrade your plan.`,
                    });
                }

                validatedData.companyId = requestingUser.companyId;
            }

            const hashedPassword = validatedData.password
                ? await bcrypt.hash(validatedData.password, 10)
                : undefined;
            const user = await storage.createUser({
                ...validatedData,
                password: hashedPassword,
            });

            const { password: _, ...userWithoutPassword } = user;
            res.json(userWithoutPassword);
        } catch (error) {
            if (error instanceof z.ZodError) {
                return res
                    .status(400)
                    .json({ message: error.errors[0].message });
            }
            next(error);
        }
    });

    app.patch("/api/users/:id/status", async (req, res, next) => {
        try {
            const requestingUserId = req.headers["x-user-id"];

            if (!requestingUserId) {
                return res
                    .status(401)
                    .json({ message: "Authentication required" });
            }

            const requestingUser = await storage.getUserById(
                parseInt(requestingUserId as string)
            );

            if (
                !requestingUser ||
                (requestingUser.role !== "company_admin" &&
                    requestingUser.role !== "super_admin")
            ) {
                return res
                    .status(403)
                    .json({ message: "Only admins can change user status" });
            }

            const userId = parseInt(req.params.id);

            if (userId === requestingUser.id) {
                return res
                    .status(400)
                    .json({ message: "Cannot change your own account status" });
            }

            const targetUser = await storage.getUserById(userId);
            if (!targetUser) {
                return res.status(404).json({ message: "User not found" });
            }

            // Company scoping: admins can only modify users in their company (or all if super_admin)
            if (
                requestingUser.role !== "super_admin" &&
                targetUser.companyId !== requestingUser.companyId
            ) {
                return res.status(403).json({ message: "Access denied" });
            }

            const { isActive } = req.body;
            if (typeof isActive !== "boolean") {
                return res
                    .status(400)
                    .json({ message: "isActive must be a boolean" });
            }

            await storage.toggleUserStatus(userId, isActive);

            const { broadcast } = await import("./index");
            if (broadcast) {
                if (!isActive) {
                    broadcast({ type: "USER_SUSPENDED", userId });
                }
                broadcast({ type: "USERS_UPDATED" });
            }

            res.json({
                message: `User ${
                    isActive ? "activated" : "suspended"
                } successfully`,
            });
        } catch (error) {
            next(error);
        }
    });

    // Team Assignment routes
    app.post("/api/team-assignments", async (req, res, next) => {
        try {
            const requestingUserId = req.headers["x-user-id"];
            if (!requestingUserId) {
                return res
                    .status(401)
                    .json({ message: "Authentication required" });
            }

            const requestingUser = await storage.getUserById(
                parseInt(requestingUserId as string)
            );
            if (
                !requestingUser ||
                (requestingUser.role !== "company_admin" &&
                    requestingUser.role !== "super_admin")
            ) {
                return res
                    .status(403)
                    .json({ message: "Only admins can assign team members" });
            }

            const { teamLeaderId, memberIds } = req.body;

            if (!teamLeaderId || !memberIds || !Array.isArray(memberIds)) {
                return res.status(400).json({
                    message: "Team leader ID and member IDs are required",
                });
            }

            const teamLeader = await storage.getUserById(teamLeaderId);
            if (!teamLeader) {
                return res
                    .status(404)
                    .json({ message: "Team leader not found" });
            }

            // Validate team leader role
            if (teamLeader.role !== "team_leader") {
                return res.status(400).json({
                    message:
                        "User must have team_leader role to be assigned members",
                });
            }

            // Company scoping
            if (
                requestingUser.role !== "super_admin" &&
                teamLeader.companyId !== requestingUser.companyId
            ) {
                return res.status(403).json({ message: "Access denied" });
            }

            // Get existing assignments to avoid duplicates
            const existingMembers = await storage.getTeamMembersByLeader(
                teamLeaderId
            );
            const existingMemberIds = new Set(existingMembers.map((m) => m.id));

            const assignments = [];
            const skipped = [];

            for (const memberId of memberIds) {
                // Skip if already assigned (either previously or earlier in this request)
                if (existingMemberIds.has(memberId)) {
                    skipped.push(memberId);
                    continue;
                }

                const member = await storage.getUserById(memberId);
                if (!member) {
                    continue;
                }

                // Verify member is in same company
                if (member.companyId !== teamLeader.companyId) {
                    continue;
                }

                const assignment = await storage.createTeamAssignment({
                    teamLeaderId,
                    memberId,
                    companyId: teamLeader.companyId as number,
                });
                assignments.push(assignment);

                // Add to set to prevent duplicate assignments within same request
                existingMemberIds.add(memberId);
            }

            res.json({
                message: "Team members assigned successfully",
                assignments,
                skipped:
                    skipped.length > 0
                        ? `${skipped.length} members were already assigned`
                        : undefined,
            });
        } catch (error) {
            next(error);
        }
    });

    app.get(
        "/api/team-assignments/:teamLeaderId/members",
        async (req, res, next) => {
            try {
                const requestingUserId = req.headers["x-user-id"];
                if (!requestingUserId) {
                    return res
                        .status(401)
                        .json({ message: "Authentication required" });
                }

                const requestingUser = await storage.getUserById(
                    parseInt(requestingUserId as string)
                );
                if (!requestingUser) {
                    return res.status(404).json({ message: "User not found" });
                }

                const teamLeaderId = parseInt(req.params.teamLeaderId);
                const teamLeader = await storage.getUserById(teamLeaderId);

                if (!teamLeader) {
                    return res
                        .status(404)
                        .json({ message: "Team leader not found" });
                }

                // Company scoping: ensure team leader is in same company (except super_admin)
                if (
                    requestingUser.role !== "super_admin" &&
                    teamLeader.companyId !== requestingUser.companyId
                ) {
                    return res.status(403).json({ message: "Access denied" });
                }

                // Additional role-based access control
                if (
                    requestingUser.role !== "super_admin" &&
                    requestingUser.role !== "company_admin" &&
                    requestingUser.id !== teamLeaderId
                ) {
                    return res.status(403).json({ message: "Access denied" });
                }

                const members = await storage.getTeamMembersByLeader(
                    teamLeaderId
                );
                res.json(members);
            } catch (error) {
                next(error);
            }
        }
    );

    // Get team attendance for today
    app.get(
        "/api/team-assignments/:teamLeaderId/attendance/today",
        async (req, res, next) => {
            try {
                const requestingUserId = req.headers["x-user-id"];
                if (!requestingUserId) {
                    return res
                        .status(401)
                        .json({ message: "Authentication required" });
                }

                const requestingUser = await storage.getUserById(
                    parseInt(requestingUserId as string)
                );
                if (!requestingUser) {
                    return res.status(404).json({ message: "User not found" });
                }

                const teamLeaderId = parseInt(req.params.teamLeaderId);
                const teamLeader = await storage.getUserById(teamLeaderId);

                if (!teamLeader) {
                    return res
                        .status(404)
                        .json({ message: "Team leader not found" });
                }

                // Company scoping: ensure team leader is in same company (except super_admin)
                if (
                    requestingUser.role !== "super_admin" &&
                    teamLeader.companyId !== requestingUser.companyId
                ) {
                    return res.status(403).json({ message: "Access denied" });
                }

                // Additional role-based access control
                if (
                    requestingUser.role !== "super_admin" &&
                    requestingUser.role !== "company_admin" &&
                    requestingUser.id !== teamLeaderId
                ) {
                    return res.status(403).json({ message: "Access denied" });
                }

                // Get team members
                const members = await storage.getTeamMembersByLeader(
                    teamLeaderId
                );
                const memberIds = members.map((m) => m.id);

                // Get today's attendance for all team members
                const today = new Date().toISOString().split("T")[0];
                if (!teamLeader.companyId) {
                    return res.json([]);
                }

                const allAttendance = await storage.getDailyAttendance(
                    teamLeader.companyId,
                    today
                );
                const teamAttendance = allAttendance.filter((record) =>
                    memberIds.includes(record.userId)
                );

                res.json(teamAttendance);
            } catch (error) {
                next(error);
            }
        }
    );

    app.get(
        "/api/team-assignments/:teamLeaderId/attendance/reports",
        async (req, res, next) => {
            try {
                const requestingUserId = req.headers["x-user-id"];
                if (!requestingUserId) {
                    return res
                        .status(401)
                        .json({ message: "Authentication required" });
                }

                const requestingUser = await storage.getUserById(
                    parseInt(requestingUserId as string)
                );
                if (!requestingUser) {
                    return res.status(404).json({ message: "User not found" });
                }

                const teamLeaderId = parseInt(req.params.teamLeaderId);

                // Verify the requesting user is the team leader
                if (requestingUser.id !== teamLeaderId) {
                    return res.status(403).json({ message: "Access denied" });
                }

                const teamLeader = await storage.getUserById(teamLeaderId);
                if (!teamLeader || !teamLeader.companyId) {
                    return res
                        .status(404)
                        .json({ message: "Team leader not found" });
                }

                // Get team members
                const members = await storage.getTeamMembersByLeader(
                    teamLeaderId
                );

                // Get date range from query params (default to current month)
                const now = new Date();
                const startDate =
                    (req.query.startDate as string) ||
                    new Date(now.getFullYear(), now.getMonth(), 1)
                        .toISOString()
                        .split("T")[0];
                const endDate =
                    (req.query.endDate as string) ||
                    now.toISOString().split("T")[0];

                // Calculate stats for each team member
                const memberStats = [];
                for (const member of members) {
                    const attendanceHistory =
                        await storage.getAttendanceHistory(
                            member.id,
                            startDate,
                            endDate
                        );

                    const presentDays = attendanceHistory.filter(
                        (a) => a.status === "present" || a.status === "late"
                    ).length;
                    const absentDays = attendanceHistory.filter(
                        (a) => a.status === "absent"
                    ).length;
                    const lateDays = attendanceHistory.filter(
                        (a) => a.status === "late"
                    ).length;

                    // Calculate average working hours
                    const totalMinutes = attendanceHistory
                        .filter((a) => a.workDuration)
                        .reduce((sum, a) => sum + (a.workDuration || 0), 0);
                    const avgMinutes =
                        attendanceHistory.length > 0
                            ? Math.round(
                                  totalMinutes / attendanceHistory.length
                              )
                            : 0;
                    const avgHours =
                        avgMinutes > 0
                            ? `${Math.floor(avgMinutes / 60)}.${Math.round(
                                  (avgMinutes % 60) / 6
                              )}h`
                            : "0h";

                    // Determine trend (compare to previous period)
                    const previousStartDate = new Date(
                        new Date(startDate).getTime() -
                            (new Date(endDate).getTime() -
                                new Date(startDate).getTime())
                    );
                    const previousEndDate = startDate;
                    const previousHistory = await storage.getAttendanceHistory(
                        member.id,
                        previousStartDate.toISOString().split("T")[0],
                        previousEndDate
                    );

                    const currentAttendanceRate =
                        attendanceHistory.length > 0
                            ? presentDays / attendanceHistory.length
                            : 0;
                    const previousAttendanceRate =
                        previousHistory.length > 0
                            ? previousHistory.filter(
                                  (a) =>
                                      a.status === "present" ||
                                      a.status === "late"
                              ).length / previousHistory.length
                            : 0;

                    let trend = "stable";
                    if (currentAttendanceRate > previousAttendanceRate + 0.05)
                        trend = "up";
                    if (currentAttendanceRate < previousAttendanceRate - 0.05)
                        trend = "down";

                    memberStats.push({
                        id: member.id,
                        name: member.displayName,
                        presentDays,
                        absentDays,
                        lateDays,
                        avgHours,
                        trend,
                    });
                }

                // Calculate overall team stats
                const totalPresent = memberStats.reduce(
                    (sum, m) => sum + m.presentDays,
                    0
                );
                const totalRecords = memberStats.reduce(
                    (sum, m) => sum + m.presentDays + m.absentDays,
                    0
                );
                const attendanceRate =
                    totalRecords > 0
                        ? ((totalPresent / totalRecords) * 100).toFixed(1)
                        : "0.0";

                const totalLate = memberStats.reduce(
                    (sum, m) => sum + m.lateDays,
                    0
                );

                // Calculate average working hours
                const allAvgHours = memberStats.map((m) => {
                    const hours = parseFloat(m.avgHours.replace("h", ""));
                    return isNaN(hours) ? 0 : hours;
                });
                const overallAvgHours =
                    allAvgHours.length > 0
                        ? (
                              allAvgHours.reduce((a, b) => a + b, 0) /
                              allAvgHours.length
                          ).toFixed(1)
                        : "0.0";

                res.json({
                    teamAttendanceRate: attendanceRate,
                    avgWorkingHours: `${overallAvgHours}h`,
                    lateArrivals: totalLate,
                    memberStats,
                });
            } catch (error) {
                next(error);
            }
        }
    );

    app.delete(
        "/api/team-assignments/:teamLeaderId/members/:memberId",
        async (req, res, next) => {
            try {
                const requestingUserId = req.headers["x-user-id"];
                if (!requestingUserId) {
                    return res
                        .status(401)
                        .json({ message: "Authentication required" });
                }

                const requestingUser = await storage.getUserById(
                    parseInt(requestingUserId as string)
                );
                if (
                    !requestingUser ||
                    (requestingUser.role !== "company_admin" &&
                        requestingUser.role !== "super_admin")
                ) {
                    return res.status(403).json({
                        message: "Only admins can remove team assignments",
                    });
                }

                const teamLeaderId = parseInt(req.params.teamLeaderId);
                const memberId = parseInt(req.params.memberId);

                // Verify team leader exists and is in same company
                const teamLeader = await storage.getUserById(teamLeaderId);
                if (!teamLeader) {
                    return res
                        .status(404)
                        .json({ message: "Team leader not found" });
                }

                // Company scoping: ensure team leader is in same company (except super_admin)
                if (
                    requestingUser.role !== "super_admin" &&
                    teamLeader.companyId !== requestingUser.companyId
                ) {
                    return res.status(403).json({ message: "Access denied" });
                }

                await storage.removeTeamAssignment(teamLeaderId, memberId);
                res.json({ message: "Team member removed successfully" });
            } catch (error) {
                next(error);
            }
        }
    );

    app.get("/api/team-assignments", async (req, res, next) => {
        try {
            const requestingUserId = req.headers["x-user-id"];
            if (!requestingUserId) {
                return res
                    .status(401)
                    .json({ message: "Authentication required" });
            }

            const requestingUser = await storage.getUserById(
                parseInt(requestingUserId as string)
            );
            if (
                !requestingUser ||
                (requestingUser.role !== "company_admin" &&
                    requestingUser.role !== "super_admin")
            ) {
                return res
                    .status(403)
                    .json({ message: "Only admins can view team assignments" });
            }

            const companyId = requestingUser.companyId as number;
            const assignments = await storage.getAllTeamAssignments(companyId);
            res.json(assignments);
        } catch (error) {
            next(error);
        }
    });

    // Company routes (Super Admin only)
    app.post("/api/companies", async (req, res, next) => {
        try {
            const requestingUserId = req.headers["x-user-id"];
            if (!requestingUserId) {
                return res
                    .status(401)
                    .json({ message: "Authentication required" });
            }

            const requestingUser = await storage.getUserById(
                parseInt(requestingUserId as string)
            );
            if (!requestingUser || requestingUser.role !== "super_admin") {
                return res.status(403).json({
                    message: "Only super admins can create companies",
                });
            }

            const validatedCompany = insertCompanySchema.parse(req.body);
            const company = await storage.createCompany(validatedCompany);
            res.json(company);
        } catch (error) {
            if (error instanceof z.ZodError) {
                return res
                    .status(400)
                    .json({ message: error.errors[0].message });
            }
            next(error);
        }
    });

    app.get("/api/companies", async (req, res, next) => {
        try {
            const requestingUserId = req.headers["x-user-id"];
            if (!requestingUserId) {
                return res
                    .status(401)
                    .json({ message: "Authentication required" });
            }

            const requestingUser = await storage.getUserById(
                parseInt(requestingUserId as string)
            );
            if (!requestingUser || requestingUser.role !== "super_admin") {
                return res.status(403).json({
                    message: "Only super admins can view all companies",
                });
            }

            const companies = await storage.getAllCompanies();
            res.json(companies);
        } catch (error) {
            next(error);
        }
    });

    app.get("/api/companies/:id", async (req, res, next) => {
        try {
            const requestingUserId = req.headers["x-user-id"];
            if (!requestingUserId) {
                return res
                    .status(401)
                    .json({ message: "Authentication required" });
            }

            const requestingUser = await storage.getUserById(
                parseInt(requestingUserId as string)
            );
            if (!requestingUser || requestingUser.role !== "super_admin") {
                return res.status(403).json({
                    message: "Only super admins can view company details",
                });
            }

            const company = await storage.getCompanyById(
                parseInt(req.params.id)
            );
            if (!company) {
                return res.status(404).json({ message: "Company not found" });
            }
            res.json(company);
        } catch (error) {
            next(error);
        }
    });

    app.get("/api/companies/:id/users", async (req, res, next) => {
        try {
            const requestingUserId = req.headers["x-user-id"];
            if (!requestingUserId) {
                return res
                    .status(401)
                    .json({ message: "Authentication required" });
            }

            const requestingUser = await storage.getUserById(
                parseInt(requestingUserId as string)
            );
            if (!requestingUser || requestingUser.role !== "super_admin") {
                return res.status(403).json({
                    message: "Only super admins can view company users",
                });
            }

            const users = await storage.getUsersByCompanyId(
                parseInt(req.params.id)
            );
            const usersWithoutPasswords = users.map(
                ({ password: _, ...user }) => user
            );
            res.json(usersWithoutPasswords);
        } catch (error) {
            next(error);
        }
    });

    app.patch("/api/companies/:id", async (req, res, next) => {
        try {
            const requestingUserId = req.headers["x-user-id"];
            if (!requestingUserId) {
                return res
                    .status(401)
                    .json({ message: "Authentication required" });
            }

            const requestingUser = await storage.getUserById(
                parseInt(requestingUserId as string)
            );
            if (!requestingUser) {
                return res.status(401).json({ message: "User not found" });
            }

            const companyId = parseInt(req.params.id);

            if (requestingUser.role === "company_admin") {
                if (requestingUser.companyId !== companyId) {
                    return res.status(403).json({
                        message: "You can only update your own company",
                    });
                }
            } else if (requestingUser.role !== "super_admin") {
                return res
                    .status(403)
                    .json({ message: "Insufficient permissions" });
            }

            const updates = req.body;
            await storage.updateCompany(companyId, updates);
            res.json({ message: "Company updated successfully" });
        } catch (error) {
            next(error);
        }
    });

    app.delete("/api/companies/:id", async (req, res, next) => {
        try {
            const requestingUserId = req.headers["x-user-id"];
            if (!requestingUserId) {
                return res
                    .status(401)
                    .json({ message: "Authentication required" });
            }

            const requestingUser = await storage.getUserById(
                parseInt(requestingUserId as string)
            );
            if (!requestingUser || requestingUser.role !== "super_admin") {
                return res.status(403).json({
                    message: "Only super admins can delete companies",
                });
            }

            await storage.deleteCompany(parseInt(req.params.id));

            await storage.createAdminActivityLog({
                actionType: "delete_company",
                performedBy: requestingUser.id,
                targetCompanyId: parseInt(req.params.id),
                details: `Company ${req.params.id} deleted`,
            });

            res.json({ message: "Company deleted successfully" });
        } catch (error) {
            next(error);
        }
    });

    // Super Admin Dashboard Routes
    app.get("/api/super-admin/companies-with-stats", async (req, res, next) => {
        try {
            const requestingUserId = req.headers["x-user-id"];
            if (!requestingUserId) {
                return res
                    .status(401)
                    .json({ message: "Authentication required" });
            }

            const requestingUser = await storage.getUserById(
                parseInt(requestingUserId as string)
            );
            if (!requestingUser || requestingUser.role !== "super_admin") {
                return res.status(403).json({ message: "Access denied" });
            }

            const companiesWithStats = await storage.getAllCompaniesWithStats();
            res.json(companiesWithStats);
        } catch (error) {
            next(error);
        }
    });

    app.get("/api/super-admin/companies/:id/stats", async (req, res, next) => {
        try {
            const requestingUserId = req.headers["x-user-id"];
            if (!requestingUserId) {
                return res
                    .status(401)
                    .json({ message: "Authentication required" });
            }

            const requestingUser = await storage.getUserById(
                parseInt(requestingUserId as string)
            );
            if (!requestingUser || requestingUser.role !== "super_admin") {
                return res.status(403).json({ message: "Access denied" });
            }

            const companyStats = await storage.getCompanyWithStats(
                parseInt(req.params.id)
            );
            if (!companyStats) {
                return res.status(404).json({ message: "Company not found" });
            }
            res.json(companyStats);
        } catch (error) {
            next(error);
        }
    });

    app.post(
        "/api/super-admin/companies/:id/suspend",
        async (req, res, next) => {
            try {
                const requestingUserId = req.headers["x-user-id"];
                if (!requestingUserId) {
                    return res
                        .status(401)
                        .json({ message: "Authentication required" });
                }

                const requestingUser = await storage.getUserById(
                    parseInt(requestingUserId as string)
                );
                if (!requestingUser || requestingUser.role !== "super_admin") {
                    return res.status(403).json({ message: "Access denied" });
                }

                await storage.suspendCompany(
                    parseInt(req.params.id),
                    requestingUser.id
                );
                res.json({ message: "Company suspended successfully" });
            } catch (error) {
                next(error);
            }
        }
    );

    app.post(
        "/api/super-admin/companies/:id/reactivate",
        async (req, res, next) => {
            try {
                const requestingUserId = req.headers["x-user-id"];
                if (!requestingUserId) {
                    return res
                        .status(401)
                        .json({ message: "Authentication required" });
                }

                const requestingUser = await storage.getUserById(
                    parseInt(requestingUserId as string)
                );
                if (!requestingUser || requestingUser.role !== "super_admin") {
                    return res.status(403).json({ message: "Access denied" });
                }

                await storage.reactivateCompany(
                    parseInt(req.params.id),
                    requestingUser.id
                );
                res.json({ message: "Company reactivated successfully" });
            } catch (error) {
                next(error);
            }
        }
    );

    app.get("/api/super-admin/analytics", async (req, res, next) => {
        try {
            const requestingUserId = req.headers["x-user-id"];
            if (!requestingUserId) {
                return res
                    .status(401)
                    .json({ message: "Authentication required" });
            }

            const requestingUser = await storage.getUserById(
                parseInt(requestingUserId as string)
            );
            if (!requestingUser || requestingUser.role !== "super_admin") {
                return res.status(403).json({ message: "Access denied" });
            }

            const analytics = await storage.getSuperAdminAnalytics();
            res.json(analytics);
        } catch (error) {
            next(error);
        }
    });

    app.get("/api/super-admin/activity-logs", async (req, res, next) => {
        try {
            const requestingUserId = req.headers["x-user-id"];
            if (!requestingUserId) {
                return res
                    .status(401)
                    .json({ message: "Authentication required" });
            }

            const requestingUser = await storage.getUserById(
                parseInt(requestingUserId as string)
            );
            if (!requestingUser || requestingUser.role !== "super_admin") {
                return res.status(403).json({ message: "Access denied" });
            }

            const limit = req.query.limit
                ? parseInt(req.query.limit as string)
                : undefined;
            const logs = await storage.getAllAdminActivityLogs(limit);
            res.json(logs);
        } catch (error) {
            next(error);
        }
    });

    app.get(
        "/api/super-admin/activity-logs/company/:companyId",
        async (req, res, next) => {
            try {
                const requestingUserId = req.headers["x-user-id"];
                if (!requestingUserId) {
                    return res
                        .status(401)
                        .json({ message: "Authentication required" });
                }

                const requestingUser = await storage.getUserById(
                    parseInt(requestingUserId as string)
                );
                if (!requestingUser || requestingUser.role !== "super_admin") {
                    return res.status(403).json({ message: "Access denied" });
                }

                const logs = await storage.getAdminActivityLogsByCompany(
                    parseInt(req.params.companyId)
                );
                res.json(logs);
            } catch (error) {
                next(error);
            }
        }
    );

    app.get("/api/super-admin/payments", async (req, res, next) => {
        try {
            const requestingUserId = req.headers["x-user-id"];
            if (!requestingUserId) {
                return res
                    .status(401)
                    .json({ message: "Authentication required" });
            }

            const requestingUser = await storage.getUserById(
                parseInt(requestingUserId as string)
            );
            if (!requestingUser || requestingUser.role !== "super_admin") {
                return res.status(403).json({ message: "Access denied" });
            }

            const { startDate, endDate, status } = req.query;

            let payments;
            if (startDate && endDate) {
                payments = await storage.getPaymentsByDateRange(
                    new Date(startDate as string),
                    new Date(endDate as string)
                );
            } else if (status) {
                payments = await storage.getPaymentsByStatus(status as string);
            } else {
                payments = await storage.getAllCompanyPayments();
            }

            res.json(payments);
        } catch (error) {
            next(error);
        }
    });

    // Company Admin routes (for managing their own company)
    app.get("/api/my-company", async (req, res, next) => {
        try {
            const requestingUserId = req.headers["x-user-id"];
            if (!requestingUserId) {
                return res
                    .status(401)
                    .json({ message: "Authentication required" });
            }

            const requestingUser = await storage.getUserById(
                parseInt(requestingUserId as string)
            );
            if (!requestingUser || !requestingUser.companyId) {
                return res
                    .status(404)
                    .json({ message: "User not associated with a company" });
            }

            const company = await storage.getCompanyById(
                requestingUser.companyId
            );
            if (!company) {
                return res.status(404).json({ message: "Company not found" });
            }

            const users = await storage.getUsersByCompanyId(
                requestingUser.companyId
            );
            const adminCount = users.filter(
                (u) => u.role === "company_admin"
            ).length;
            const memberCount = users.filter(
                (u) => u.role === "company_member" || u.role === "team_leader"
            ).length;

            res.json({
                ...company,
                currentAdmins: adminCount,
                currentMembers: memberCount,
            });
        } catch (error) {
            next(error);
        }
    });

    app.patch("/api/my-company", async (req, res, next) => {
        try {
            const requestingUserId = req.headers["x-user-id"];
            if (!requestingUserId) {
                return res
                    .status(401)
                    .json({ message: "Authentication required" });
            }

            const requestingUser = await storage.getUserById(
                parseInt(requestingUserId as string)
            );
            if (!requestingUser || requestingUser.role !== "company_admin") {
                return res.status(403).json({
                    message: "Only company admins can update company settings",
                });
            }

            if (!requestingUser.companyId) {
                return res
                    .status(404)
                    .json({ message: "User not associated with a company" });
            }

            const updates = req.body;
            await storage.updateCompany(requestingUser.companyId, updates);
            res.json({ message: "Company updated successfully" });
        } catch (error) {
            next(error);
        }
    });

    // Task routes
    app.post("/api/tasks", async (req, res, next) => {
        try {
            const requestingUserId = req.headers["x-user-id"];
            if (!requestingUserId) {
                return res
                    .status(401)
                    .json({ message: "Authentication required" });
            }

            const requestingUser = await storage.getUserById(
                parseInt(requestingUserId as string)
            );
            if (!requestingUser || !requestingUser.companyId) {
                return res
                    .status(403)
                    .json({ message: "User must belong to a company" });
            }

            const validatedTask = insertTaskSchema.parse({
                ...req.body,
                companyId: requestingUser.companyId,
            });
            const task = await storage.createTask(validatedTask);

            if (validatedTask.assignedTo) {
                const assignedByUser = validatedTask.assignedBy
                    ? await storage.getUserById(validatedTask.assignedBy)
                    : null;
                const assignedToUser = await storage.getUserById(
                    validatedTask.assignedTo
                );

                let notificationMessageType:
                    | "team_leader_to_employee"
                    | "admin_to_team_leader"
                    | "admin_to_employee"
                    | "employee_to_team_leader" = "team_leader_to_employee";
                if (assignedByUser && assignedToUser) {
                    if (
                        assignedByUser.role === "company_admin" &&
                        assignedToUser.role === "team_leader"
                    ) {
                        notificationMessageType = "admin_to_team_leader";
                    } else if (
                        assignedByUser.role === "company_admin" &&
                        assignedToUser.role === "company_member"
                    ) {
                        notificationMessageType = "admin_to_employee";
                    } else if (
                        assignedByUser.role === "team_leader" &&
                        assignedToUser.role === "company_member"
                    ) {
                        notificationMessageType = "team_leader_to_employee";
                    }
                }

                await storage.createMessage({
                    senderId: validatedTask.assignedBy || 0,
                    receiverId: validatedTask.assignedTo,
                    message: `New task assigned: ${validatedTask.title}`,
                    messageType: notificationMessageType,
                    relatedTaskId: task.id,
                    readStatus: false,
                });
            }

            res.json(task);
        } catch (error) {
            next(error);
        }
    });

    app.get("/api/tasks", async (req, res, next) => {
        try {
            const requestingUserId = req.headers["x-user-id"];
            if (!requestingUserId) {
                return res
                    .status(401)
                    .json({ message: "Authentication required" });
            }

            const requestingUser = await storage.getUserById(
                parseInt(requestingUserId as string)
            );
            if (!requestingUser) {
                return res.status(404).json({ message: "User not found" });
            }

            const { userId, assignedBy } = req.query;

            if (userId) {
                const tasks = await storage.getTasksByUserId(
                    parseInt(userId as string)
                );
                // Filter by company unless super_admin
                if (requestingUser.role === "super_admin") {
                    res.json(tasks);
                } else {
                    res.json(
                        tasks.filter(
                            (task) =>
                                task.companyId === requestingUser.companyId
                        )
                    );
                }
            } else if (assignedBy) {
                const tasks = await storage.getTasksByAssignedBy(
                    parseInt(assignedBy as string)
                );
                // Filter by company unless super_admin
                if (requestingUser.role === "super_admin") {
                    res.json(tasks);
                } else {
                    res.json(
                        tasks.filter(
                            (task) =>
                                task.companyId === requestingUser.companyId
                        )
                    );
                }
            } else if (requestingUser.role === "super_admin") {
                const tasks = await storage.getAllTasks();
                res.json(tasks);
            } else if (requestingUser.role === "company_admin") {
                // Admin sees all tasks in their company
                const tasks = await storage.getTasksByCompanyId(
                    requestingUser.companyId
                );
                res.json(tasks);
            } else if (requestingUser.role === "team_leader") {
                // Team leader sees tasks assigned to their team members AND tasks assigned to them
                const teamMembers = await storage.getTeamMembersByLeader(
                    requestingUser.id
                );
                const teamMemberIds = teamMembers.map((m) => m.id);
                const allTasks = await storage.getTasksByCompanyId(
                    requestingUser.companyId
                );
                res.json(
                    allTasks.filter(
                        (task) =>
                            teamMemberIds.includes(task.assignedTo) ||
                            task.assignedTo === requestingUser.id
                    )
                );
            } else if (requestingUser.role === "company_member") {
                // Employee sees only their assigned tasks
                const tasks = await storage.getTasksByUserId(requestingUser.id);
                res.json(tasks);
            } else {
                res.json([]);
            }
        } catch (error) {
            next(error);
        }
    });

    app.get("/api/tasks/:id", async (req, res, next) => {
        try {
            const requestingUserId = req.headers["x-user-id"];
            if (!requestingUserId) {
                return res
                    .status(401)
                    .json({ message: "Authentication required" });
            }

            const requestingUser = await storage.getUserById(
                parseInt(requestingUserId as string)
            );
            if (!requestingUser) {
                return res.status(404).json({ message: "User not found" });
            }

            const task = await storage.getTaskById(parseInt(req.params.id));
            if (!task) {
                return res.status(404).json({ message: "Task not found" });
            }

            // Check company access unless super_admin
            if (
                requestingUser.role !== "super_admin" &&
                task.companyId !== requestingUser.companyId
            ) {
                return res.status(403).json({ message: "Access denied" });
            }

            res.json(task);
        } catch (error) {
            next(error);
        }
    });

    app.patch("/api/tasks/:id/status", async (req, res, next) => {
        try {
            const requestingUserId = req.headers["x-user-id"];
            if (!requestingUserId) {
                return res
                    .status(401)
                    .json({ message: "Authentication required" });
            }

            const requestingUser = await storage.getUserById(
                parseInt(requestingUserId as string)
            );
            if (!requestingUser) {
                return res.status(404).json({ message: "User not found" });
            }

            const task = await storage.getTaskById(parseInt(req.params.id));
            if (!task) {
                return res.status(404).json({ message: "Task not found" });
            }

            // Check company access unless super_admin
            if (
                requestingUser.role !== "super_admin" &&
                task.companyId !== requestingUser.companyId
            ) {
                return res.status(403).json({ message: "Access denied" });
            }

            const { status } = req.body;
            console.log(
                `[TaskStatus] Updating task ${parseInt(
                    req.params.id
                )} to status: ${status}`
            );

            // Set completedAt when status changes to completed
            const updates: any = { status };
            if (status === "completed") {
                updates.completedAt = new Date();
            }

            await storage.updateTask(parseInt(req.params.id), updates);
            console.log(
                `[TaskStatus] Broadcasting task update: ${parseInt(
                    req.params.id
                )} -> ${status}`
            );
            broadcast({
                type: "task_updated",
                taskId: parseInt(req.params.id),
                status,
            });
            res.json({ message: "Task status updated" });
        } catch (error) {
            next(error);
        }
    });

    // Get task details with time logs and rework count
    app.get("/api/tasks/:id/details", async (req, res, next) => {
        try {
            const requestingUserId = req.headers["x-user-id"];
            if (!requestingUserId) {
                return res
                    .status(401)
                    .json({ message: "Authentication required" });
            }

            const requestingUser = await storage.getUserById(
                parseInt(requestingUserId as string)
            );
            if (!requestingUser) {
                return res.status(404).json({ message: "User not found" });
            }

            const task = await storage.getTaskById(parseInt(req.params.id));
            if (!task) {
                return res.status(404).json({ message: "Task not found" });
            }

            // Check company access unless super_admin
            if (
                requestingUser.role !== "super_admin" &&
                task.companyId !== requestingUser.companyId
            ) {
                return res.status(403).json({ message: "Access denied" });
            }

            // Get time logs for the user the task is assigned to
            const timeLogs = await storage.getTaskTimeLogs(
                parseInt(req.params.id),
                task.assignedTo
            );

            // Aggregate all time logs for this task
            let totalSeconds = 0;
            let oldTimeSeconds = 0;
            let newTimeSeconds = 0;

            timeLogs.forEach((log) => {
                if (log.totalSeconds) {
                    totalSeconds += log.totalSeconds;
                    if (log.oldTimeSeconds) {
                        oldTimeSeconds += log.oldTimeSeconds;
                    }
                    if (log.newTimeSeconds) {
                        newTimeSeconds += log.newTimeSeconds;
                    }
                }
            });

            // Get rework history with dates from message history
            const messages = await storage.getAllMessages();
            const reworkHistory = messages
                .filter(
                    (m) =>
                        m.relatedTaskId === parseInt(req.params.id) &&
                        m.message.includes("returned")
                )
                .map((m) => ({
                    date: m.createdAt,
                    message: m.message,
                }))
                .sort(
                    (a, b) =>
                        new Date(b.date).getTime() - new Date(a.date).getTime()
                );

            res.json({
                task,
                timeLogs:
                    totalSeconds > 0
                        ? {
                              totalSeconds,
                              oldTimeSeconds,
                              newTimeSeconds,
                          }
                        : null,
                reworkHistory,
                returnCount: reworkHistory.length,
            });
        } catch (error) {
            next(error);
        }
    });

    app.patch("/api/tasks/:id", async (req, res, next) => {
        try {
            const requestingUserId = req.headers["x-user-id"];
            if (!requestingUserId) {
                return res
                    .status(401)
                    .json({ message: "Authentication required" });
            }

            const requestingUser = await storage.getUserById(
                parseInt(requestingUserId as string)
            );
            if (!requestingUser) {
                return res.status(404).json({ message: "User not found" });
            }

            const task = await storage.getTaskById(parseInt(req.params.id));
            if (!task) {
                return res.status(404).json({ message: "Task not found" });
            }

            // Check company access unless super_admin
            if (
                requestingUser.role !== "super_admin" &&
                task.companyId !== requestingUser.companyId
            ) {
                return res.status(403).json({ message: "Access denied" });
            }

            const updates = req.body;
            // Convert deadline string to Date object if present
            if (updates.deadline && typeof updates.deadline === "string") {
                updates.deadline = new Date(updates.deadline);
            }
            await storage.updateTask(parseInt(req.params.id), updates);

            // Get the updated task to broadcast the actual status
            const updatedTask = await storage.getTaskById(
                parseInt(req.params.id)
            );
            if (updatedTask) {
                broadcast({
                    type: "task_updated",
                    taskId: parseInt(req.params.id),
                    status: updatedTask.status,
                });
            }

            res.json({ message: "Task updated" });
        } catch (error) {
            next(error);
        }
    });

    app.delete("/api/tasks/:id", async (req, res, next) => {
        try {
            const requestingUserId = req.headers["x-user-id"];
            if (!requestingUserId) {
                return res
                    .status(401)
                    .json({ message: "Authentication required" });
            }

            const requestingUser = await storage.getUserById(
                parseInt(requestingUserId as string)
            );
            if (!requestingUser) {
                return res.status(404).json({ message: "User not found" });
            }

            const task = await storage.getTaskById(parseInt(req.params.id));
            if (!task) {
                return res.status(404).json({ message: "Task not found" });
            }

            // Check company access unless super_admin
            if (
                requestingUser.role !== "super_admin" &&
                task.companyId !== requestingUser.companyId
            ) {
                return res.status(403).json({ message: "Access denied" });
            }

            await storage.deleteTask(parseInt(req.params.id));
            broadcast({
                type: "task_deleted",
                taskId: parseInt(req.params.id),
            });
            res.json({ message: "Task deleted" });
        } catch (error) {
            next(error);
        }
    });

    // Task timer routes
    app.get("/api/tasks/:id/timer", async (req, res, next) => {
        try {
            const { userId, date } = req.query;
            if (!userId || !date) {
                return res
                    .status(400)
                    .json({ message: "userId and date are required" });
            }

            const timeLog = await storage.getTaskTimeLog(
                parseInt(req.params.id),
                parseInt(userId as string),
                date as string
            );
            res.json(timeLog);
        } catch (error) {
            next(error);
        }
    });

    app.post("/api/tasks/:id/timer/start", async (req, res, next) => {
        try {
            const { userId, date } = req.body;
            if (!userId || !date) {
                return res
                    .status(400)
                    .json({ message: "userId and date are required" });
            }

            const timeLog = await storage.startTaskTimer(
                parseInt(req.params.id),
                userId,
                date
            );
            res.json(timeLog);
        } catch (error) {
            next(error);
        }
    });

    app.post("/api/tasks/:id/timer/pause", async (req, res, next) => {
        try {
            const { userId, date } = req.body;
            if (!userId || !date) {
                return res
                    .status(400)
                    .json({ message: "userId and date are required" });
            }

            const timeLog = await storage.pauseTaskTimer(
                parseInt(req.params.id),
                userId,
                date
            );
            res.json(timeLog);
        } catch (error) {
            next(error);
        }
    });

    app.post("/api/tasks/:id/timer/complete", async (req, res, next) => {
        try {
            const { userId, date } = req.body;
            if (!userId || !date) {
                return res
                    .status(400)
                    .json({ message: "userId and date are required" });
            }

            const timeLog = await storage.completeTaskTimer(
                parseInt(req.params.id),
                userId,
                date
            );
            res.json(timeLog);
        } catch (error) {
            next(error);
        }
    });

    app.get("/api/tasks/:id/timer/logs", async (req, res, next) => {
        try {
            const { userId } = req.query;
            if (!userId) {
                return res.status(400).json({ message: "userId is required" });
            }

            const timeLogs = await storage.getTaskTimeLogs(
                parseInt(req.params.id),
                parseInt(userId as string)
            );
            res.json(timeLogs);
        } catch (error) {
            next(error);
        }
    });

    // Report routes
    app.post("/api/reports", async (req, res, next) => {
        try {
            const requestingUserId = req.headers["x-user-id"];
            if (!requestingUserId) {
                return res
                    .status(401)
                    .json({ message: "Authentication required" });
            }

            const requestingUser = await storage.getUserById(
                parseInt(requestingUserId as string)
            );
            if (!requestingUser || !requestingUser.companyId) {
                return res
                    .status(403)
                    .json({ message: "User must belong to a company" });
            }

            const validatedReport = insertReportSchema.parse({
                ...req.body,
                companyId: requestingUser.companyId,
            });
            const report = await storage.createReport(validatedReport);

            // Get user information and company admin email for notification
            const user = await storage.getUserById(validatedReport.userId);
            if (user) {
                // Get company to find admin email
                const company = await storage.getCompanyById(user.companyId!);
                if (company && company.email) {
                    // Send email notification to company admin asynchronously (don't wait for it)
                    sendReportNotification({
                        adminEmail: company.email,
                        userName: user.displayName,
                        reportType: validatedReport.reportType,
                        plannedTasks: validatedReport.plannedTasks,
                        completedTasks: validatedReport.completedTasks,
                        pendingTasks: validatedReport.pendingTasks,
                        notes: validatedReport.notes,
                        createdAt: report.createdAt,
                    }).catch((err) =>
                        console.error("Failed to send email notification:", err)
                    );
                }
            }

            res.json(report);
        } catch (error) {
            next(error);
        }
    });

    app.get("/api/reports", async (req, res, next) => {
        try {
            const requestingUserId = req.headers["x-user-id"];
            if (!requestingUserId) {
                return res
                    .status(401)
                    .json({ message: "Authentication required" });
            }

            const requestingUser = await storage.getUserById(
                parseInt(requestingUserId as string)
            );
            if (!requestingUser) {
                return res.status(404).json({ message: "User not found" });
            }

            const { userId, startDate, endDate } = req.query;

            if (userId && startDate && endDate) {
                const reports = await storage.getReportsByUserAndDate(
                    parseInt(userId as string),
                    new Date(startDate as string),
                    new Date(endDate as string)
                );
                // Filter by company unless super_admin
                if (requestingUser.role === "super_admin") {
                    res.json(reports);
                } else {
                    res.json(
                        reports.filter(
                            (report) =>
                                report.companyId === requestingUser.companyId
                        )
                    );
                }
            } else if (userId) {
                const reports = await storage.getReportsByUserId(
                    parseInt(userId as string)
                );
                // Filter by company unless super_admin
                if (requestingUser.role === "super_admin") {
                    res.json(reports);
                } else {
                    res.json(
                        reports.filter(
                            (report) =>
                                report.companyId === requestingUser.companyId
                        )
                    );
                }
            } else if (startDate && endDate) {
                const reports = await storage.getReportsByDate(
                    new Date(startDate as string),
                    new Date(endDate as string)
                );
                // Filter by company unless super_admin
                if (requestingUser.role === "super_admin") {
                    res.json(reports);
                } else {
                    res.json(
                        reports.filter(
                            (report) =>
                                report.companyId === requestingUser.companyId
                        )
                    );
                }
            } else if (requestingUser.role === "super_admin") {
                const reports = await storage.getAllReports();
                res.json(reports);
            } else if (requestingUser.companyId) {
                const reports = await storage.getReportsByCompanyId(
                    requestingUser.companyId
                );
                res.json(reports);
            } else {
                res.json([]);
            }
        } catch (error) {
            next(error);
        }
    });

    // Message routes
    app.post("/api/messages", async (req, res, next) => {
        try {
            const requestingUserId = req.headers["x-user-id"];
            if (!requestingUserId) {
                return res
                    .status(401)
                    .json({ message: "Authentication required" });
            }

            const requestingUser = await storage.getUserById(
                parseInt(requestingUserId as string)
            );
            if (!requestingUser) {
                return res.status(404).json({ message: "User not found" });
            }

            const receiverUser = await storage.getUserById(req.body.receiverId);
            if (!receiverUser) {
                return res.status(404).json({ message: "Receiver not found" });
            }

            // Same-company check: ensure both users belong to the same company
            if (
                requestingUser.companyId !== receiverUser.companyId &&
                requestingUser.role !== "super_admin"
            ) {
                return res.status(403).json({
                    message: "Cannot send messages across different companies",
                });
            }

            // Determine message type based on sender and receiver roles
            let messageType = "team_leader_to_employee";

            // Super admin sending messages
            if (
                requestingUser.role === "super_admin" &&
                receiverUser.role === "team_leader"
            ) {
                messageType = "admin_to_team_leader";
            } else if (
                requestingUser.role === "super_admin" &&
                receiverUser.role === "company_member"
            ) {
                messageType = "admin_to_employee";
            } else if (
                requestingUser.role === "super_admin" &&
                receiverUser.role === "company_admin"
            ) {
                messageType = "admin_to_admin";
            }
            // Company admin sending messages
            else if (
                requestingUser.role === "company_admin" &&
                receiverUser.role === "team_leader"
            ) {
                messageType = "admin_to_team_leader";
            } else if (
                requestingUser.role === "company_admin" &&
                receiverUser.role === "company_member"
            ) {
                messageType = "admin_to_employee";
            }
            // Team leader sending messages
            else if (
                requestingUser.role === "team_leader" &&
                receiverUser.role === "company_member"
            ) {
                messageType = "team_leader_to_employee";
            } else if (
                requestingUser.role === "team_leader" &&
                receiverUser.role === "company_admin"
            ) {
                messageType = "team_leader_to_admin";
            }
            // Employee (company member) sending messages
            else if (
                requestingUser.role === "company_member" &&
                receiverUser.role === "team_leader"
            ) {
                messageType = "employee_to_team_leader";
            } else if (
                requestingUser.role === "company_member" &&
                receiverUser.role === "company_admin"
            ) {
                messageType = "employee_to_admin";
            }

            // Authorization: Team leaders can message their team members and admins, employees can reply to their team leader or admin
            if (requestingUser.role === "team_leader") {
                // Team leader can message admins or their team members
                if (
                    receiverUser.role !== "company_admin" &&
                    receiverUser.role !== "super_admin"
                ) {
                    // Check if receiver is in their team
                    const teamMembers = await storage.getTeamMembersByLeader(
                        requestingUser.id
                    );
                    const teamMemberIds = teamMembers.map((m) => m.id);
                    if (!teamMemberIds.includes(receiverUser.id)) {
                        return res.status(403).json({
                            message:
                                "You can only message your team members or admins",
                        });
                    }
                }
            } else if (requestingUser.role === "company_member") {
                // Employee replying to team leader - check if sender is their team leader
                const teamAssignments =
                    await storage.getTeamAssignmentsByMemberId(
                        requestingUser.id
                    );
                const leaderIds = teamAssignments.map((t) => t.teamLeaderId);
                if (
                    !leaderIds.includes(receiverUser.id) ||
                    receiverUser.role !== "team_leader"
                ) {
                    return res.status(403).json({
                        message: "You can only reply to your team leader",
                    });
                }
            } else if (
                requestingUser.role !== "super_admin" &&
                requestingUser.role !== "company_admin"
            ) {
                return res
                    .status(403)
                    .json({ message: "Unauthorized to send messages" });
            }

            const messageData = {
                senderId: requestingUser.id,
                receiverId: req.body.receiverId,
                message: req.body.message,
                messageType,
                relatedTaskId: req.body.relatedTaskId,
                readStatus: false,
            };

            const validatedMessage = insertMessageSchema.parse(messageData);
            const message = await storage.createMessage(validatedMessage);

            // Broadcast new message via WebSocket
            const { broadcast } = await import("./index.js");
            broadcast({
                type: "NEW_MESSAGE",
                data: {
                    ...message,
                    senderName: requestingUser.displayName,
                    receiverName: receiverUser.displayName,
                },
            });

            // Send push notification to receiver
            sendPushNotificationToUser(
                message.receiverId,
                "New Message",
                `${requestingUser.displayName}: ${message.message.substring(
                    0,
                    50
                )}${message.message.length > 50 ? "..." : ""}`,
                {
                    messageId: message.id.toString(),
                    url: "/user/messages",
                },
                storage
            ).catch((error) =>
                console.error("Failed to send push notification:", error)
            );

            res.json(message);
        } catch (error) {
            next(error);
        }
    });

    app.get("/api/messages", async (req, res, next) => {
        try {
            const requestingUserId = req.headers["x-user-id"];
            if (!requestingUserId) {
                return res
                    .status(401)
                    .json({ message: "Authentication required" });
            }

            const requestingUser = await storage.getUserById(
                parseInt(requestingUserId as string)
            );
            if (!requestingUser) {
                return res.status(404).json({ message: "User not found" });
            }

            const { receiverId, unreadOnly } = req.query;

            if (receiverId) {
                // Only super_admin can query other users' messages
                if (
                    requestingUser.role !== "super_admin" &&
                    parseInt(receiverId as string) !== requestingUser.id
                ) {
                    return res.status(403).json({
                        message: "You can only view your own messages",
                    });
                }

                const messages =
                    unreadOnly === "true"
                        ? await storage.getUnreadMessagesByReceiverId(
                              parseInt(receiverId as string)
                          )
                        : await storage.getMessagesByReceiverId(
                              parseInt(receiverId as string)
                          );
                res.json(messages);
            } else if (requestingUser.role === "super_admin") {
                const messages = await storage.getAllMessages();
                res.json(messages);
            } else {
                // Return all messages where user is either sender or receiver
                const allMessages = await storage.getAllMessages();
                const userMessages = allMessages.filter(
                    (msg) =>
                        msg.senderId === requestingUser.id ||
                        msg.receiverId === requestingUser.id
                );
                res.json(userMessages);
            }
        } catch (error) {
            next(error);
        }
    });

    app.patch("/api/messages/:id/read", async (req, res, next) => {
        try {
            await storage.markMessageAsRead(parseInt(req.params.id));
            res.json({ message: "Message marked as read" });
        } catch (error) {
            next(error);
        }
    });

    // Rating routes
    app.post("/api/ratings", async (req, res, next) => {
        try {
            const requestingUserId = req.headers["x-user-id"];

            if (!requestingUserId) {
                return res
                    .status(401)
                    .json({ message: "Authentication required" });
            }

            const requestingUser = await storage.getUserById(
                parseInt(requestingUserId as string)
            );
            if (!requestingUser) {
                return res.status(404).json({ message: "User not found" });
            }

            const targetUser = await storage.getUserById(req.body.userId);
            if (!targetUser) {
                return res
                    .status(404)
                    .json({ message: "Target user not found" });
            }

            // Prevent self-rating
            if (requestingUser.id === req.body.userId) {
                return res
                    .status(403)
                    .json({ message: "You cannot rate yourself" });
            }

            // Authorization checks
            if (requestingUser.role === "team_leader") {
                // Team leader can only rate their team members (not themselves or other leaders)
                const teamMembers = await storage.getTeamMembersByLeader(
                    requestingUser.id
                );
                const teamMemberIds = teamMembers
                    .map((m) => m.id)
                    .filter((id) => id !== requestingUser.id);
                if (!teamMemberIds.includes(req.body.userId)) {
                    return res.status(403).json({
                        message: "You can only rate your team members",
                    });
                }
                // Ensure target is a team member, not another leader
                if (
                    targetUser.role === "team_leader" ||
                    targetUser.role === "company_admin" ||
                    targetUser.role === "super_admin"
                ) {
                    return res
                        .status(403)
                        .json({ message: "You can only rate team members" });
                }
            } else if (requestingUser.role === "company_admin") {
                // Admin can rate both team leaders and employees in their company
                if (targetUser.companyId !== requestingUser.companyId) {
                    return res.status(403).json({
                        message: "You can only rate users in your company",
                    });
                }
                if (
                    targetUser.role !== "team_leader" &&
                    targetUser.role !== "company_member"
                ) {
                    return res.status(403).json({
                        message: "You can only rate team leaders and employees",
                    });
                }
            } else {
                // Super admins can also rate both team leaders and employees
                if (
                    targetUser.role !== "team_leader" &&
                    targetUser.role !== "company_member"
                ) {
                    return res.status(403).json({
                        message: "You can only rate team leaders and employees",
                    });
                }
            }

            const ratingData = {
                userId: req.body.userId,
                ratedBy: requestingUser.id,
                rating: req.body.rating,
                feedback: req.body.feedback,
                period: req.body.period,
            };

            const validatedRating = insertRatingSchema.parse(ratingData);

            try {
                const rating = await storage.createRating(validatedRating);

                // Ratings are now shown only in the Ratings Section, not in messages
                res.json(rating);
            } catch (dbError: any) {
                // Catch unique constraint violation (PostgreSQL error code 23505)
                if (
                    dbError.code === "23505" ||
                    dbError.message?.includes("unique_rating_per_period")
                ) {
                    return res.status(409).json({
                        message: `You have already rated this user for the ${validatedRating.period} period`,
                    });
                }
                throw dbError;
            }
        } catch (error) {
            next(error);
        }
    });

    app.get("/api/ratings", async (req, res, next) => {
        try {
            const requestingUserId = req.headers["x-user-id"];
            if (!requestingUserId) {
                return res
                    .status(401)
                    .json({ message: "Authentication required" });
            }

            const requestingUser = await storage.getUserById(
                parseInt(requestingUserId as string)
            );
            if (!requestingUser) {
                return res.status(404).json({ message: "User not found" });
            }

            const { userId, latest } = req.query;

            if (userId && latest === "true") {
                // Verify target user exists and belongs to same company
                const ratedUser = await storage.getUserById(
                    parseInt(userId as string)
                );
                if (
                    !ratedUser ||
                    ratedUser.companyId !== requestingUser.companyId
                ) {
                    return res.status(403).json({ message: "Access denied" });
                }

                const rating = await storage.getLatestRatingByUserId(
                    parseInt(userId as string)
                );
                res.json(rating);
            } else if (userId) {
                // Verify target user exists and belongs to same company
                const ratedUser = await storage.getUserById(
                    parseInt(userId as string)
                );
                if (
                    !ratedUser ||
                    ratedUser.companyId !== requestingUser.companyId
                ) {
                    return res.json([]);
                }

                const ratings = await storage.getRatingsByUserId(
                    parseInt(userId as string)
                );
                res.json(ratings);
            } else if (requestingUser.role === "super_admin") {
                const ratings = await storage.getAllRatings();
                res.json(ratings);
            } else if (requestingUser.companyId) {
                // Return ratings for users in the same company
                const companyUsers = await storage.getUsersByCompanyId(
                    requestingUser.companyId
                );
                const companyUserIds = companyUsers.map((u) => u.id);
                const allRatings = await storage.getAllRatings();
                const companyRatings = allRatings.filter((r) =>
                    companyUserIds.includes(r.userId)
                );
                res.json(companyRatings);
            } else {
                res.json([]);
            }
        } catch (error) {
            next(error);
        }
    });

    // Feedback routes
    app.post("/api/feedbacks", async (req, res, next) => {
        try {
            const requestingUserId = req.headers["x-user-id"];
            if (!requestingUserId) {
                return res
                    .status(401)
                    .json({ message: "Authentication required" });
            }

            const requestingUser = await storage.getUserById(
                parseInt(requestingUserId as string)
            );
            if (!requestingUser || !requestingUser.companyId) {
                return res.status(404).json({ message: "User not found" });
            }

            // Validate request body first
            const validatedInput = z
                .object({
                    recipientType: z.enum(["Admin", "TeamLeader", "Employee"]),
                    message: z.string().min(1, "Message is required"),
                })
                .parse(req.body);

            const feedbackData = {
                companyId: requestingUser.companyId,
                submittedBy: requestingUser.id,
                recipientType: validatedInput.recipientType,
                message: validatedInput.message,
                adminResponse: null,
            };

            const validatedFeedback = insertFeedbackSchema.parse(feedbackData);
            const feedback = await storage.createFeedback(validatedFeedback);

            res.json(feedback);
        } catch (error) {
            next(error);
        }
    });

    app.get("/api/feedbacks", async (req, res, next) => {
        try {
            const requestingUserId = req.headers["x-user-id"];
            if (!requestingUserId) {
                return res
                    .status(401)
                    .json({ message: "Authentication required" });
            }

            const requestingUser = await storage.getUserById(
                parseInt(requestingUserId as string)
            );
            if (!requestingUser) {
                return res.status(404).json({ message: "User not found" });
            }

            const { submittedBy } = req.query;

            let feedbacks;
            if (submittedBy) {
                // Only allow users to query their own feedback or admins to query anyone's
                const targetUserId = parseInt(submittedBy as string);
                if (
                    targetUserId !== requestingUser.id &&
                    requestingUser.role !== "super_admin" &&
                    requestingUser.role !== "company_admin"
                ) {
                    return res.status(403).json({
                        message:
                            "You can only view your own submitted feedback",
                    });
                }

                const targetUser = await storage.getUserById(targetUserId);
                if (
                    !targetUser ||
                    targetUser.companyId !== requestingUser.companyId
                ) {
                    return res.json([]);
                }
                feedbacks = await storage.getFeedbacksByUserId(targetUserId);
            } else if (requestingUser.role === "super_admin") {
                feedbacks = await storage.getAllFeedbacks();
            } else if (
                requestingUser.role === "company_admin" &&
                requestingUser.companyId
            ) {
                // Admins see all feedbacks in their company
                feedbacks = await storage.getFeedbacksByCompanyId(
                    requestingUser.companyId
                );
            } else if (
                requestingUser.role === "team_leader" &&
                requestingUser.companyId
            ) {
                // Team leaders see feedbacks intended for them (recipientType = 'TeamLeader')
                const allCompanyFeedbacks =
                    await storage.getFeedbacksByCompanyId(
                        requestingUser.companyId
                    );
                feedbacks = allCompanyFeedbacks.filter(
                    (f) => f.recipientType === "TeamLeader"
                );
            } else {
                // Regular users see their own submitted feedbacks
                feedbacks = await storage.getFeedbacksByUserId(
                    requestingUser.id
                );
            }

            // Enrich feedbacks with submitter information
            const enrichedFeedbacks = await Promise.all(
                feedbacks.map(async (feedback) => {
                    const submitter = await storage.getUserById(
                        feedback.submittedBy
                    );
                    return {
                        ...feedback,
                        submitterName: submitter?.displayName || null,
                        submitterRole: submitter?.role || null,
                    };
                })
            );

            res.json(enrichedFeedbacks);
        } catch (error) {
            next(error);
        }
    });

    app.patch("/api/feedbacks/:id/respond", async (req, res, next) => {
        try {
            const requestingUserId = req.headers["x-user-id"];
            if (!requestingUserId) {
                return res
                    .status(401)
                    .json({ message: "Authentication required" });
            }

            const requestingUser = await storage.getUserById(
                parseInt(requestingUserId as string)
            );
            if (
                !requestingUser ||
                (requestingUser.role !== "company_admin" &&
                    requestingUser.role !== "super_admin")
            ) {
                return res
                    .status(403)
                    .json({ message: "Only admins can respond to feedback" });
            }

            // Validate admin response
            const validatedInput = z
                .object({
                    adminResponse: z.enum([
                        "Good",
                        "Bad",
                        "Excellent",
                        "Satisfactory",
                        "Needs Improvement",
                    ]),
                })
                .parse(req.body);

            // Get feedback by ID
            const feedbackId = parseInt(req.params.id);
            if (isNaN(feedbackId)) {
                return res.status(404).json({ message: "Feedback not found" });
            }

            const feedback = await storage.getFeedbackById(feedbackId);

            // Return generic 404 to prevent ID enumeration
            if (!feedback) {
                return res.status(404).json({ message: "Feedback not found" });
            }

            // Verify company scoping (super_admin can respond to any, company_admin only to their company's)
            if (
                requestingUser.role === "company_admin" &&
                feedback.companyId !== requestingUser.companyId
            ) {
                return res.status(404).json({ message: "Feedback not found" });
            }

            await storage.respondToFeedback(
                feedbackId,
                validatedInput.adminResponse
            );
            res.json({ message: "Response sent successfully" });
        } catch (error) {
            next(error);
        }
    });

    // File upload routes
    app.post("/api/files", async (req, res, next) => {
        try {
            const validatedFile = insertFileUploadSchema.parse(req.body);
            const file = await storage.createFileUpload(validatedFile);
            res.json(file);
        } catch (error) {
            next(error);
        }
    });

    app.get("/api/files", async (req, res, next) => {
        try {
            const { userId, reportId } = req.query;

            if (userId) {
                const files = await storage.getFilesByUserId(
                    parseInt(userId as string)
                );
                res.json(files);
            } else if (reportId) {
                const files = await storage.getFilesByReportId(
                    parseInt(reportId as string)
                );
                res.json(files);
            } else {
                const files = await storage.getAllFiles();
                res.json(files);
            }
        } catch (error) {
            next(error);
        }
    });

    // Archive routes
    app.post("/api/archive", async (req, res, next) => {
        try {
            const { month, year } = req.body;
            await storage.archiveReports(month, year);
            res.json({ message: "Reports archived successfully" });
        } catch (error) {
            next(error);
        }
    });

    app.get("/api/archive", async (req, res, next) => {
        try {
            const { userId } = req.query;
            const archives = await storage.getArchivedReports(
                userId ? parseInt(userId as string) : undefined
            );
            res.json(archives);
        } catch (error) {
            next(error);
        }
    });

    // Dashboard stats
    app.get("/api/dashboard/stats", async (req, res, next) => {
        try {
            const requestingUserId = req.headers["x-user-id"];

            let companyId: number | undefined;

            if (requestingUserId) {
                const requestingUser = await storage.getUserById(
                    parseInt(requestingUserId as string)
                );

                if (
                    requestingUser &&
                    requestingUser.role !== "super_admin" &&
                    requestingUser.companyId
                ) {
                    companyId = requestingUser.companyId;
                }
            }

            const stats = await storage.getDashboardStats(companyId);
            res.json(stats);
        } catch (error) {
            next(error);
        }
    });

    // Group message routes
    app.post("/api/group-messages", async (req, res, next) => {
        try {
            const requestingUserId = req.headers["x-user-id"];

            if (!requestingUserId) {
                return res
                    .status(401)
                    .json({ message: "Authentication required" });
            }

            const requestingUser = await storage.getUserById(
                parseInt(requestingUserId as string)
            );

            if (
                !requestingUser ||
                (requestingUser.role !== "company_admin" &&
                    requestingUser.role !== "super_admin")
            ) {
                return res
                    .status(403)
                    .json({ message: "Only admins can send announcements" });
            }

            if (!requestingUser.companyId) {
                return res
                    .status(403)
                    .json({ message: "User must belong to a company" });
            }

            const messageData = {
                companyId: requestingUser.companyId,
                senderId: requestingUser.id,
                title: req.body.title,
                message: req.body.message,
            };

            const validatedMessage =
                insertGroupMessageSchema.parse(messageData);
            const message = await storage.createGroupMessage(validatedMessage);

            // Broadcast new group message via WebSocket
            const { broadcast } = await import("./index.js");
            broadcast({
                type: "NEW_GROUP_MESSAGE",
                data: {
                    ...message,
                    senderName: requestingUser.displayName,
                },
            });

            // Send push notification to all company users
            const companyUsers = await storage.getUsersByCompanyId(
                requestingUser.companyId
            );
            const otherUsers = companyUsers.filter(
                (u) => u.id !== requestingUser.id
            );
            for (const user of otherUsers) {
                sendPushNotificationToUser(
                    user.id,
                    message.title,
                    message.message.substring(0, 100),
                    {
                        messageId: message.id.toString(),
                        url: "/user/announcements",
                    },
                    storage
                ).catch((error) =>
                    console.error("Failed to send push notification:", error)
                );
            }

            res.json(message);
        } catch (error) {
            next(error);
        }
    });

    app.get("/api/group-messages", async (req, res, next) => {
        try {
            const requestingUserId = req.headers["x-user-id"];
            if (!requestingUserId) {
                return res
                    .status(401)
                    .json({ message: "Authentication required" });
            }

            const requestingUser = await storage.getUserById(
                parseInt(requestingUserId as string)
            );
            if (!requestingUser) {
                return res.status(404).json({ message: "User not found" });
            }

            const { limit } = req.query;

            if (requestingUser.role === "super_admin") {
                if (limit) {
                    const messages = await storage.getRecentGroupMessages(
                        parseInt(limit as string)
                    );
                    res.json(messages);
                } else {
                    const messages = await storage.getAllGroupMessages();
                    res.json(messages);
                }
            } else if (requestingUser.companyId) {
                const messages = await storage.getGroupMessagesByCompanyId(
                    requestingUser.companyId
                );
                if (limit) {
                    res.json(messages.slice(0, parseInt(limit as string)));
                } else {
                    res.json(messages);
                }
            } else {
                res.json([]);
            }
        } catch (error) {
            next(error);
        }
    });

    // Group message reply routes
    app.post(
        "/api/group-messages/:messageId/replies",
        async (req, res, next) => {
            try {
                const requestingUserId = req.headers["x-user-id"];
                if (!requestingUserId) {
                    return res
                        .status(401)
                        .json({ message: "Authentication required" });
                }

                const requestingUser = await storage.getUserById(
                    parseInt(requestingUserId as string)
                );
                if (!requestingUser) {
                    return res.status(404).json({ message: "User not found" });
                }

                if (!requestingUser.isActive) {
                    return res.status(401).json({
                        message: "User account disabled",
                        code: "USER_INACTIVE",
                    });
                }

                if (!requestingUser.companyId) {
                    return res
                        .status(403)
                        .json({ message: "User must belong to a company" });
                }

                const messageId = parseInt(req.params.messageId);

                const groupMessage = await storage.getGroupMessageById(
                    messageId
                );
                if (!groupMessage) {
                    return res
                        .status(404)
                        .json({ message: "Group message not found" });
                }

                if (groupMessage.companyId !== requestingUser.companyId) {
                    return res.status(403).json({
                        message:
                            "Access denied: you can only reply to messages in your company",
                    });
                }

                if (
                    typeof req.body.message !== "string" ||
                    !req.body.message.trim()
                ) {
                    return res.status(400).json({
                        message: "Reply message must be a non-empty string",
                    });
                }

                const replyData = {
                    groupMessageId: messageId,
                    senderId: requestingUser.id,
                    message: req.body.message,
                };

                const validatedReply =
                    insertGroupMessageReplySchema.parse(replyData);
                const reply = await storage.createGroupMessageReply(
                    validatedReply
                );

                if (broadcast) {
                    broadcast({
                        type: "GROUP_MESSAGE_REPLY",
                        reply,
                        groupMessageId: messageId,
                    });
                }

                res.json(reply);
            } catch (error) {
                if (error instanceof z.ZodError) {
                    return res
                        .status(400)
                        .json({ message: error.errors[0].message });
                }
                next(error);
            }
        }
    );

    app.get(
        "/api/group-messages/:messageId/replies",
        async (req, res, next) => {
            try {
                const requestingUserId = req.headers["x-user-id"];
                if (!requestingUserId) {
                    return res
                        .status(401)
                        .json({ message: "Authentication required" });
                }

                const requestingUser = await storage.getUserById(
                    parseInt(requestingUserId as string)
                );
                if (!requestingUser) {
                    return res.status(404).json({ message: "User not found" });
                }

                if (!requestingUser.isActive) {
                    return res.status(401).json({
                        message: "User account disabled",
                        code: "USER_INACTIVE",
                    });
                }

                if (!requestingUser.companyId) {
                    return res
                        .status(403)
                        .json({ message: "User must belong to a company" });
                }

                const messageId = parseInt(req.params.messageId);

                const groupMessage = await storage.getGroupMessageById(
                    messageId
                );
                if (!groupMessage) {
                    return res
                        .status(404)
                        .json({ message: "Group message not found" });
                }

                if (groupMessage.companyId !== requestingUser.companyId) {
                    return res.status(403).json({
                        message:
                            "Access denied: you can only view replies for messages in your company",
                    });
                }

                const replies = await storage.getGroupMessageReplies(messageId);
                res.json(replies);
            } catch (error) {
                next(error);
            }
        }
    );

    // Device token routes
    app.post("/api/device-tokens", async (req, res, next) => {
        try {
            const requestingUserId = req.headers["x-user-id"];
            if (!requestingUserId) {
                return res
                    .status(401)
                    .json({ message: "Authentication required" });
            }

            const requestingUser = await storage.getUserById(
                parseInt(requestingUserId as string)
            );
            if (!requestingUser) {
                return res.status(404).json({ message: "User not found" });
            }

            if (!requestingUser.isActive) {
                return res.status(401).json({
                    message: "User account disabled",
                    code: "USER_INACTIVE",
                });
            }

            const { token, deviceType } = req.body;
            if (!token) {
                return res.status(400).json({ message: "Token is required" });
            }

            const deviceToken = await storage.createOrUpdateDeviceToken({
                userId: requestingUser.id,
                token,
                deviceType: deviceType || "web",
            });

            res.json(deviceToken);
        } catch (error) {
            next(error);
        }
    });

    app.delete("/api/device-tokens/:token", async (req, res, next) => {
        try {
            const requestingUserId = req.headers["x-user-id"];
            if (!requestingUserId) {
                return res
                    .status(401)
                    .json({ message: "Authentication required" });
            }

            const requestingUser = await storage.getUserById(
                parseInt(requestingUserId as string)
            );
            if (!requestingUser) {
                return res.status(404).json({ message: "User not found" });
            }

            if (!requestingUser.isActive) {
                return res.status(401).json({
                    message: "User account disabled",
                    code: "USER_INACTIVE",
                });
            }

            const { token } = req.params;
            await storage.deleteDeviceToken(token);

            res.json({ message: "Device token deleted successfully" });
        } catch (error) {
            next(error);
        }
    });

    // Feedback routes
    app.post("/api/feedbacks", async (req, res, next) => {
        try {
            const validatedFeedback = insertFeedbackSchema.parse(req.body);
            const feedback = await storage.createFeedback(validatedFeedback);
            res.json(feedback);
        } catch (error) {
            if (error instanceof z.ZodError) {
                return res
                    .status(400)
                    .json({ message: error.errors[0].message });
            }
            next(error);
        }
    });

    app.get("/api/feedbacks", async (req, res, next) => {
        try {
            const requestingUserId = req.headers["x-user-id"];
            if (!requestingUserId) {
                return res
                    .status(401)
                    .json({ message: "Authentication required" });
            }

            const requestingUser = await storage.getUserById(
                parseInt(requestingUserId as string)
            );
            if (!requestingUser) {
                return res.status(404).json({ message: "User not found" });
            }

            const { userId } = req.query;

            if (userId) {
                const feedbacks = await storage.getFeedbacksByUserId(
                    parseInt(userId as string)
                );
                res.json(feedbacks);
            } else {
                // Admin viewing all company feedbacks
                if (
                    requestingUser.role === "company_admin" ||
                    requestingUser.role === "super_admin"
                ) {
                    const allFeedbacks = await storage.getAllFeedbacks();
                    // Filter by company unless super_admin
                    if (requestingUser.role === "super_admin") {
                        res.json(allFeedbacks);
                    } else {
                        // Get all users in the company
                        const companyUsers = await storage.getUsersByCompanyId(
                            requestingUser.companyId!
                        );
                        const companyUserIds = companyUsers.map((u) => u.id);
                        const companyFeedbacks = allFeedbacks.filter((f) =>
                            companyUserIds.includes(f.submittedBy)
                        );
                        res.json(companyFeedbacks);
                    }
                } else if (requestingUser.role === "team_leader") {
                    // Team leaders can view feedback from their team members
                    const teamMembers = await storage.getTeamMembersByLeader(
                        requestingUser.id
                    );
                    const teamMemberIds = teamMembers.map((m) => m.id);
                    const allFeedbacks = await storage.getAllFeedbacks();
                    const teamFeedbacks = allFeedbacks.filter((f) =>
                        teamMemberIds.includes(f.submittedBy)
                    );
                    res.json(teamFeedbacks);
                } else {
                    // Regular users can only see their own feedbacks
                    const feedbacks = await storage.getFeedbacksByUserId(
                        requestingUser.id
                    );
                    res.json(feedbacks);
                }
            }
        } catch (error) {
            next(error);
        }
    });

    // Slot Pricing routes
    app.get("/api/slot-pricing", async (req, res, next) => {
        try {
            const requestingUserId = req.headers["x-user-id"];
            if (!requestingUserId) {
                return res
                    .status(401)
                    .json({ message: "Authentication required" });
            }

            const requestingUser = await storage.getUserById(
                parseInt(requestingUserId as string)
            );
            if (!requestingUser) {
                return res.status(404).json({ message: "User not found" });
            }

            // Allow super_admin and company_admin to view pricing
            if (
                requestingUser.role !== "super_admin" &&
                requestingUser.role !== "company_admin"
            ) {
                return res.status(403).json({ message: "Access denied" });
            }

            const pricing = await storage.getAllSlotPricing();
            res.json(pricing);
        } catch (error) {
            next(error);
        }
    });

    app.post("/api/slot-pricing", async (req, res, next) => {
        try {
            const requestingUserId = req.headers["x-user-id"];
            if (!requestingUserId) {
                return res
                    .status(401)
                    .json({ message: "Authentication required" });
            }

            const requestingUser = await storage.getUserById(
                parseInt(requestingUserId as string)
            );
            if (!requestingUser || requestingUser.role !== "super_admin") {
                return res.status(403).json({
                    message: "Only super admins can modify slot pricing",
                });
            }

            const validatedData = insertSlotPricingSchema.parse(req.body);
            const pricing = await storage.createOrUpdateSlotPricing(
                validatedData
            );

            res.json(pricing);
        } catch (error) {
            if (error instanceof z.ZodError) {
                return res
                    .status(400)
                    .json({ message: error.errors[0].message });
            }
            next(error);
        }
    });

    // Purchase Slots
    app.post("/api/purchase-slots", async (req, res, next) => {
        try {
            const requestingUserId = req.headers["x-user-id"];
            if (!requestingUserId) {
                return res
                    .status(401)
                    .json({ message: "Authentication required" });
            }

            const requestingUser = await storage.getUserById(
                parseInt(requestingUserId as string)
            );
            if (!requestingUser || !requestingUser.companyId) {
                return res
                    .status(403)
                    .json({ message: "User must belong to a company" });
            }

            if (requestingUser.role !== "company_admin") {
                return res.status(403).json({
                    message: "Only company admins can purchase slots",
                });
            }

            const validatedData = slotPurchaseSchema.parse(req.body);

            const pricing = await storage.getSlotPricingByType(
                validatedData.slotType
            );
            if (!pricing) {
                return res.status(404).json({
                    message: `Pricing not found for ${validatedData.slotType} slots`,
                });
            }

            const totalAmount = pricing.pricePerSlot * validatedData.quantity;

            const payment = await storage.createCompanyPayment({
                companyId: requestingUser.companyId,
                slotType: validatedData.slotType,
                slotQuantity: validatedData.quantity,
                amount: totalAmount,
                currency: pricing.currency,
                paymentStatus: "paid",
                paymentMethod: "online",
                transactionId: `TXN-${Date.now()}`,
            });

            const updateData =
                validatedData.slotType === "admin"
                    ? { maxAdmins: validatedData.quantity }
                    : { maxMembers: validatedData.quantity };

            await storage.incrementCompanySlots(
                requestingUser.companyId,
                updateData
            );

            res.json({
                success: true,
                message: `Successfully purchased ${validatedData.quantity} ${validatedData.slotType} slot(s)`,
                payment,
            });
        } catch (error) {
            if (error instanceof z.ZodError) {
                return res
                    .status(400)
                    .json({ message: error.errors[0].message });
            }
            next(error);
        }
    });

    // Stripe Payment Intent Creation
    app.post("/api/create-payment-intent", async (req, res, next) => {
        try {
            if (!stripe) {
                return res
                    .status(500)
                    .json({ message: "Payment gateway not configured" });
            }

            const requestingUserId = req.headers["x-user-id"];
            if (!requestingUserId) {
                return res
                    .status(401)
                    .json({ message: "Authentication required" });
            }

            const requestingUser = await storage.getUserById(
                parseInt(requestingUserId as string)
            );
            if (!requestingUser || !requestingUser.companyId) {
                return res
                    .status(403)
                    .json({ message: "User must belong to a company" });
            }

            if (requestingUser.role !== "company_admin") {
                return res.status(403).json({
                    message: "Only company admins can purchase slots",
                });
            }

            const { slotType, quantity } = req.body;

            // Fetch server-side pricing to prevent tampering
            const pricing = await storage.getSlotPricingByType(slotType);
            if (!pricing) {
                return res.status(400).json({ message: "Invalid slot type" });
            }

            // Calculate amount server-side from authoritative pricing
            const calculatedAmount = pricing.pricePerSlot * quantity;

            // Create payment record with server-calculated amount
            const payment = await storage.createCompanyPayment({
                companyId: requestingUser.companyId,
                slotType,
                slotQuantity: quantity,
                amount: calculatedAmount,
                currency: "INR",
                paymentStatus: "pending",
                paymentMethod: "stripe",
            });

            // Create Stripe payment intent with server-calculated amount
            // Automatic payment methods - Stripe will show available options based on:
            // 1. Currency (INR)
            // 2. Amount
            // 3. Customer location
            // 4. Payment methods enabled in your Stripe Dashboard
            const paymentIntent = await stripe.paymentIntents.create({
                amount: Math.round(calculatedAmount * 100), // Convert to paise (INR smallest unit)
                currency: "inr",
                automatic_payment_methods: {
                    enabled: true,
                    allow_redirects: "always",
                },
                metadata: {
                    paymentId: payment.id.toString(),
                    companyId: requestingUser.companyId.toString(),
                    slotType,
                    quantity: quantity.toString(),
                },
            });

            console.log("Payment Intent created:", {
                id: paymentIntent.id,
                amount: paymentIntent.amount,
                currency: paymentIntent.currency,
                status: paymentIntent.status,
                hasClientSecret: !!paymentIntent.client_secret,
                clientSecretPreview: paymentIntent.client_secret
                    ? paymentIntent.client_secret.substring(0, 30) + "..."
                    : "MISSING",
            });

            // Update payment with Stripe payment intent ID
            await storage.updatePaymentStripeId(payment.id, paymentIntent.id);

            const responseData = {
                clientSecret: paymentIntent.client_secret,
                paymentId: payment.id,
            };

            console.log("Sending response:", {
                hasClientSecret: !!responseData.clientSecret,
                paymentId: responseData.paymentId,
            });

            res.json(responseData);
        } catch (error: any) {
            console.error("Payment intent creation error:", error);
            if (error instanceof z.ZodError) {
                return res
                    .status(400)
                    .json({ message: error.errors[0].message });
            }
            next(error);
        }
    });

    // Verify Payment and Update Slots
    app.post("/api/verify-payment", async (req, res, next) => {
        try {
            if (!stripe) {
                return res
                    .status(500)
                    .json({ message: "Payment gateway not configured" });
            }

            const { paymentIntentId, paymentId } = req.body;

            // Retrieve payment intent from Stripe
            const paymentIntent = await stripe.paymentIntents.retrieve(
                paymentIntentId
            );

            if (paymentIntent.status !== "succeeded") {
                return res
                    .status(400)
                    .json({ message: "Payment not successful" });
            }

            // Get payment record
            const payment = await storage.getPaymentById(paymentId);
            if (!payment) {
                return res
                    .status(404)
                    .json({ message: "Payment record not found" });
            }

            // Verify metadata matches to prevent tampering
            if (paymentIntent.metadata.paymentId !== paymentId.toString()) {
                return res.status(400).json({
                    message: "Payment verification failed: metadata mismatch",
                });
            }

            // Prevent duplicate processing
            if (payment.paymentStatus === "paid") {
                // Payment already processed - return success with existing receipt
                return res.json({
                    success: true,
                    message: "Payment already processed",
                    payment,
                    receiptNumber: payment.receiptNumber,
                    emailSent: payment.emailSent,
                });
            }

            // Get company details for email
            const company = await storage.getCompanyById(payment.companyId);
            if (!company) {
                return res.status(404).json({ message: "Company not found" });
            }

            // Generate unique receipt number using payment ID for guaranteed uniqueness
            const date = new Date();
            const dateStr = date.toISOString().slice(0, 10).replace(/-/g, "");
            const receiptNumber = `WL-RCPT-${dateStr}-${paymentId
                .toString()
                .padStart(6, "0")}`;

            // Prepare slot updates
            const slotUpdates =
                payment.slotType === "admin"
                    ? { maxAdmins: payment.slotQuantity || 0 }
                    : { maxMembers: payment.slotQuantity || 0 };

            // CRITICAL: Atomic transaction - complete payment and update slots together
            const updatedPayment = await storage.completePaymentWithSlots(
                paymentId,
                payment.companyId,
                receiptNumber,
                paymentIntent.id,
                slotUpdates
            );

            // If null, payment was already processed by concurrent request - fetch current state
            if (!updatedPayment) {
                const currentPayment = await storage.getPaymentById(paymentId);
                if (!currentPayment) {
                    return res
                        .status(404)
                        .json({ message: "Payment record not found" });
                }
                // Return existing receipt data (idempotent retry succeeded)
                return res.json({
                    success: true,
                    message: "Payment already processed",
                    payment: currentPayment,
                    receiptNumber: currentPayment.receiptNumber,
                    emailSent: currentPayment.emailSent,
                });
            }

            // Send email asynchronously (non-fatal - don't block on email failure)
            let emailSent = false;
            try {
                emailSent = await sendPaymentConfirmationEmail({
                    companyName: company.name,
                    companyEmail: company.email,
                    receiptNumber,
                    amount: payment.amount,
                    currency: payment.currency,
                    slotType: payment.slotType || "member",
                    slotQuantity: payment.slotQuantity || 1,
                    transactionId: paymentIntent.id,
                    paymentDate: date,
                });

                // Update email sent status if successful
                if (emailSent) {
                    await storage.updatePaymentEmailStatus(paymentId, true);
                }
            } catch (emailError: any) {
                console.error("Email sending failed (non-fatal):", emailError);
                // Email failure is logged but doesn't fail the payment
            }

            res.json({
                success: true,
                message: "Payment verified and slots added successfully",
                payment: updatedPayment,
                receiptNumber,
                emailSent,
            });
        } catch (error: any) {
            console.error("Payment verification error:", error);
            next(error);
        }
    });

    // Get company's own payment history (Company Admin)
    app.get("/api/my-company-payments", async (req, res, next) => {
        try {
            const requestingUserId = req.headers["x-user-id"];
            if (!requestingUserId) {
                return res
                    .status(401)
                    .json({ message: "Authentication required" });
            }

            const requestingUser = await storage.getUserById(
                parseInt(requestingUserId as string)
            );
            if (!requestingUser || !requestingUser.companyId) {
                return res
                    .status(403)
                    .json({ message: "User must belong to a company" });
            }

            if (requestingUser.role !== "company_admin") {
                return res.status(403).json({
                    message: "Only company admins can view payment history",
                });
            }

            const payments = await storage.getPaymentsByCompanyId(
                requestingUser.companyId
            );
            res.json(payments);
        } catch (error) {
            next(error);
        }
    });

    // Company Payment routes (Super Admin only)
    app.get("/api/company-payments", async (req, res, next) => {
        try {
            const requestingUserId = req.headers["x-user-id"];
            if (!requestingUserId) {
                return res
                    .status(401)
                    .json({ message: "Authentication required" });
            }

            const requestingUser = await storage.getUserById(
                parseInt(requestingUserId as string)
            );
            if (!requestingUser || requestingUser.role !== "super_admin") {
                return res.status(403).json({
                    message: "Only super admins can access company payments",
                });
            }

            const { companyId } = req.query;

            if (companyId) {
                const payments = await storage.getPaymentsByCompanyId(
                    parseInt(companyId as string)
                );
                res.json(payments);
            } else {
                const payments = await storage.getAllCompanyPayments();
                res.json(payments);
            }
        } catch (error) {
            next(error);
        }
    });

    app.post("/api/company-payments", async (req, res, next) => {
        try {
            const requestingUserId = req.headers["x-user-id"];
            if (!requestingUserId) {
                return res
                    .status(401)
                    .json({ message: "Authentication required" });
            }

            const requestingUser = await storage.getUserById(
                parseInt(requestingUserId as string)
            );
            if (!requestingUser || requestingUser.role !== "super_admin") {
                return res.status(403).json({
                    message: "Only super admins can create company payments",
                });
            }

            const validatedData = insertCompanyPaymentSchema.parse(req.body);
            const payment = await storage.createCompanyPayment(validatedData);
            res.json(payment);
        } catch (error) {
            if (error instanceof z.ZodError) {
                return res
                    .status(400)
                    .json({ message: error.errors[0].message });
            }
            next(error);
        }
    });

    app.patch("/api/company-payments/:id/status", async (req, res, next) => {
        try {
            const requestingUserId = req.headers["x-user-id"];
            if (!requestingUserId) {
                return res
                    .status(401)
                    .json({ message: "Authentication required" });
            }

            const requestingUser = await storage.getUserById(
                parseInt(requestingUserId as string)
            );
            if (!requestingUser || requestingUser.role !== "super_admin") {
                return res.status(403).json({
                    message: "Only super admins can update payment status",
                });
            }

            const { id } = req.params;
            const validatedData = updatePaymentStatusSchema.parse(req.body);

            const paymentId = parseInt(id);
            if (isNaN(paymentId)) {
                return res.status(400).json({ message: "Invalid payment ID" });
            }

            await storage.updatePaymentStatus(paymentId, {
                paymentStatus: validatedData.status,
            });
            res.json({ message: "Payment status updated successfully" });
        } catch (error) {
            if (error instanceof z.ZodError) {
                return res
                    .status(400)
                    .json({ message: error.errors[0].message });
            }
            next(error);
        }
    });

    // Password Reset routes
    const handlePasswordResetRequest = async (
        req: express.Request,
        res: express.Response,
        next: express.NextFunction
    ) => {
        try {
            const validatedData = passwordResetRequestSchema.parse(req.body);

            const user = await storage.getUserByEmail(validatedData.email);
            const company = await storage.getCompanyByEmail(
                validatedData.email
            );

            if (!user && !company) {
                return res.json({
                    message:
                        "If an account exists with this email, a password reset link has been sent.",
                });
            }

            const resetToken = crypto.randomBytes(32).toString("hex");
            const expiresAt = new Date(Date.now() + 15 * 60 * 1000);

            await storage.createPasswordResetToken(
                validatedData.email,
                resetToken,
                expiresAt
            );

            const protocol =
                req.headers["x-forwarded-proto"] || req.protocol || "https";
            const host = req.headers["x-forwarded-host"] || req.headers.host;
            const baseUrl = `${protocol}://${host}`;

            await sendPasswordResetEmail({
                email: validatedData.email,
                resetToken,
                userName: user?.displayName || company?.name || "User",
                baseUrl,
            });

            res.json({
                message:
                    "If an account exists with this email, a password reset link has been sent.",
            });
        } catch (error) {
            if (error instanceof z.ZodError) {
                return res
                    .status(400)
                    .json({ message: error.errors[0].message });
            }
            next(error);
        }
    };

    app.post("/api/auth/request-password-reset", handlePasswordResetRequest);
    app.post("/api/auth/forgot-password", handlePasswordResetRequest);

    app.post("/api/auth/forgot-company-id", async (req, res, next) => {
        try {
            const { email } = req.body;

            if (!email) {
                return res.status(400).json({ message: "Email is required" });
            }

            const company = await storage.getCompanyByEmail(email);

            if (company) {
                await sendCompanyServerIdEmail({
                    companyName: company.name,
                    companyEmail: company.email,
                    serverId: company.serverId,
                });
            }

            res.json({
                message:
                    "If a company exists with this email, the Company Server ID has been sent.",
            });
        } catch (error) {
            next(error);
        }
    });

    app.post("/api/auth/reset-password", async (req, res, next) => {
        try {
            const validatedData = passwordResetSchema.parse(req.body);

            const tokenData = await storage.getPasswordResetToken(
                validatedData.token
            );

            if (!tokenData) {
                return res
                    .status(400)
                    .json({ message: "Invalid or expired reset token" });
            }

            if (tokenData.used) {
                return res.status(400).json({
                    message: "This reset token has already been used",
                });
            }

            if (new Date() > new Date(tokenData.expiresAt)) {
                return res
                    .status(400)
                    .json({ message: "This reset token has expired" });
            }

            const user = await storage.getUserByEmail(tokenData.email);
            const company = await storage.getCompanyByEmail(tokenData.email);

            if (!user && !company) {
                return res.status(400).json({ message: "Account not found" });
            }

            const hashedPassword = await bcrypt.hash(
                validatedData.newPassword,
                10
            );

            if (user) {
                await storage.updateUserPassword(user.id, hashedPassword);

                if (user.role === "company_admin" && user.companyId) {
                    await storage.updateCompany(user.companyId, {
                        password: hashedPassword,
                    });
                }
            }

            if (company) {
                await storage.updateCompany(company.id, {
                    password: hashedPassword,
                });
            }

            await storage.markTokenAsUsed(validatedData.token);

            res.json({ message: "Password reset successfully" });
        } catch (error) {
            if (error instanceof z.ZodError) {
                return res
                    .status(400)
                    .json({ message: error.errors[0].message });
            }
            next(error);
        }
    });

    app.post(
        "/api/tasks-report/submit",
        requireAuth,
        async (req, res, next) => {
            try {
                const userId = parseInt(req.headers["x-user-id"] as string);
                const { companyId, tasksCompleted, notes } = req.body;

                if (!companyId || !tasksCompleted) {
                    return res.status(400).json({
                        message: "Company ID and tasks completed are required",
                    });
                }

                const today = new Date().toISOString().split("T")[0];

                const existingReport = await storage.getTasksReportByDate(
                    userId,
                    today
                );
                if (existingReport) {
                    return res.status(400).json({
                        message: "Report already submitted for today",
                    });
                }

                const report = await storage.createTasksReport({
                    userId,
                    companyId,
                    date: today,
                    tasksCompleted,
                    notes: notes || null,
                    allowedEarlyLogout: true,
                });

                res.json(report);
            } catch (error) {
                next(error);
            }
        }
    );

    app.get("/api/tasks-report/today", requireAuth, async (req, res, next) => {
        try {
            const userId = parseInt(req.headers["x-user-id"] as string);
            const today = new Date().toISOString().split("T")[0];
            const report = await storage.getTasksReportByDate(userId, today);
            res.json(report);
        } catch (error) {
            next(error);
        }
    });

    app.get("/api/tasks-report/user", requireAuth, async (req, res, next) => {
        try {
            const userId = parseInt(req.headers["x-user-id"] as string);
            const reports = await storage.getTasksReportsByUserId(userId);
            res.json(reports);
        } catch (error) {
            next(error);
        }
    });

    app.get("/api/me", requireAuth, async (req, res, next) => {
        try {
            const userId = parseInt(req.headers["x-user-id"] as string);
            const user = await storage.getUserById(userId);

            if (!user) {
                return res.status(404).json({ message: "User not found" });
            }

            res.json({
                id: user.id,
                uniqueUserId: user.uniqueUserId,
                email: user.email,
                displayName: user.displayName,
                role: user.role,
                companyId: user.companyId,
                photoURL: user.photoURL,
                isActive: user.isActive,
            });
        } catch (error) {
            next(error);
        }
    });

    app.post("/api/leaves", requireAuth, async (req, res, next) => {
        try {
            const userId = parseInt(req.headers["x-user-id"] as string);
            const user = await storage.getUserById(userId);

            if (!user || !user.companyId) {
                return res
                    .status(400)
                    .json({ message: "User not associated with a company" });
            }

            const leave = await storage.createLeave({
                userId,
                companyId: user.companyId,
                startDate: req.body.startDate,
                endDate: req.body.endDate,
                leaveType: req.body.leaveType,
                reason: req.body.reason,
                status: "pending",
            });

            res.json(leave);
        } catch (error) {
            next(error);
        }
    });

    app.get("/api/leaves/me", requireAuth, async (req, res, next) => {
        try {
            const userId = parseInt(req.headers["x-user-id"] as string);
            const leaves = await storage.getLeavesByUserId(userId);
            res.json(leaves);
        } catch (error) {
            next(error);
        }
    });

    app.get(
        "/api/leaves/company/:companyId",
        requireAuth,
        async (req, res, next) => {
            try {
                const requestingUserId = parseInt(
                    req.headers["x-user-id"] as string
                );
                const requestingUser = await storage.getUserById(
                    requestingUserId
                );
                const companyId = parseInt(req.params.companyId);

                if (!requestingUser) {
                    return res.status(401).json({ message: "User not found" });
                }

                // Allow admins and team leaders
                if (
                    requestingUser.role !== "company_admin" &&
                    requestingUser.role !== "super_admin" &&
                    requestingUser.role !== "team_leader"
                ) {
                    return res.status(403).json({ message: "Access denied" });
                }

                // Verify company access
                if (
                    requestingUser.role === "company_admin" &&
                    requestingUser.companyId !== companyId
                ) {
                    return res.status(403).json({
                        message:
                            "You can only view leave requests for your own company",
                    });
                }

                if (
                    requestingUser.role === "team_leader" &&
                    requestingUser.companyId !== companyId
                ) {
                    return res.status(403).json({ message: "Access denied" });
                }

                let leaves;
                if (requestingUser.role === "team_leader") {
                    // Team leaders can only see their team members' leaves
                    const teamMembers = await storage.getTeamMembersByLeader(
                        requestingUserId
                    );
                    const teamMemberIds = teamMembers.map((m) => m.id);
                    leaves = await storage.getLeavesByUserIds(teamMemberIds);
                } else {
                    // Admins can see all company leaves
                    leaves = await storage.getLeavesByCompanyId(companyId);
                }

                res.json(leaves);
            } catch (error) {
                next(error);
            }
        }
    );

    app.patch(
        "/api/leaves/:leaveId/approve",
        requireAuth,
        async (req, res, next) => {
            try {
                const requestingUserId = parseInt(
                    req.headers["x-user-id"] as string
                );
                const requestingUser = await storage.getUserById(
                    requestingUserId
                );
                const leaveId = parseInt(req.params.leaveId);

                if (!requestingUser) {
                    return res.status(401).json({ message: "User not found" });
                }

                // Allow admins and team leaders
                if (
                    requestingUser.role !== "company_admin" &&
                    requestingUser.role !== "super_admin" &&
                    requestingUser.role !== "team_leader"
                ) {
                    return res.status(403).json({ message: "Access denied" });
                }

                const leave = await storage.getLeaveById(leaveId);
                if (!leave) {
                    return res
                        .status(404)
                        .json({ message: "Leave request not found" });
                }

                // Verify company access
                if (requestingUser.companyId !== leave.companyId) {
                    return res.status(403).json({
                        message:
                            "You can only approve leave requests for your own company",
                    });
                }

                // Team leaders can only approve their team members' leaves
                if (requestingUser.role === "team_leader") {
                    const teamMembers = await storage.getTeamMembersByLeader(
                        requestingUserId
                    );
                    const teamMemberIds = teamMembers.map((m) => m.id);
                    if (!teamMemberIds.includes(leave.userId)) {
                        return res.status(403).json({
                            message:
                                "You can only approve leave requests for your team members",
                        });
                    }
                }

                await storage.updateLeaveStatus(
                    leaveId,
                    "approved",
                    req.body.approvedBy || requestingUserId
                );

                // Broadcast WebSocket update for real-time notifications
                const { broadcast } = await import("./index.js");
                const leaveUser = await storage.getUserById(leave.userId);
                broadcast({
                    type: "LEAVE_STATUS_UPDATE",
                    data: {
                        leaveId,
                        userId: leave.userId,
                        userName: leaveUser?.displayName,
                        status: "approved",
                        approvedBy: requestingUser.displayName,
                        companyId: leave.companyId,
                    },
                });

                res.json({ message: "Leave approved successfully" });
            } catch (error) {
                next(error);
            }
        }
    );

    app.patch(
        "/api/leaves/:leaveId/reject",
        requireAuth,
        async (req, res, next) => {
            try {
                const requestingUserId = parseInt(
                    req.headers["x-user-id"] as string
                );
                const requestingUser = await storage.getUserById(
                    requestingUserId
                );
                const leaveId = parseInt(req.params.leaveId);

                if (!requestingUser) {
                    return res.status(401).json({ message: "User not found" });
                }

                // Allow admins and team leaders
                if (
                    requestingUser.role !== "company_admin" &&
                    requestingUser.role !== "super_admin" &&
                    requestingUser.role !== "team_leader"
                ) {
                    return res.status(403).json({ message: "Access denied" });
                }

                const leave = await storage.getLeaveById(leaveId);
                if (!leave) {
                    return res
                        .status(404)
                        .json({ message: "Leave request not found" });
                }

                // Verify company access
                if (requestingUser.companyId !== leave.companyId) {
                    return res.status(403).json({
                        message:
                            "You can only reject leave requests for your own company",
                    });
                }

                // Team leaders can only reject their team members' leaves
                if (requestingUser.role === "team_leader") {
                    const teamMembers = await storage.getTeamMembersByLeader(
                        requestingUserId
                    );
                    const teamMemberIds = teamMembers.map((m) => m.id);
                    if (!teamMemberIds.includes(leave.userId)) {
                        return res.status(403).json({
                            message:
                                "You can only reject leave requests for your team members",
                        });
                    }
                }

                await storage.updateLeaveStatus(
                    leaveId,
                    "rejected",
                    req.body.rejectedBy || requestingUserId
                );

                // Broadcast WebSocket update for real-time notifications
                const { broadcast } = await import("./index.js");
                const leaveUser = await storage.getUserById(leave.userId);
                broadcast({
                    type: "LEAVE_STATUS_UPDATE",
                    data: {
                        leaveId,
                        userId: leave.userId,
                        userName: leaveUser?.displayName,
                        status: "rejected",
                        rejectedBy: requestingUser.displayName,
                        companyId: leave.companyId,
                    },
                });

                res.json({ message: "Leave rejected successfully" });
            } catch (error) {
                next(error);
            }
        }
    );

    app.patch(
        "/api/leaves/:leaveId/status",
        requireAuth,
        async (req, res, next) => {
            try {
                const requestingUserId = parseInt(
                    req.headers["x-user-id"] as string
                );
                const requestingUser = await storage.getUserById(
                    requestingUserId
                );
                const leaveId = parseInt(req.params.leaveId);

                if (!requestingUser) {
                    return res.status(401).json({ message: "User not found" });
                }

                if (
                    requestingUser.role !== "company_admin" &&
                    requestingUser.role !== "super_admin"
                ) {
                    return res.status(403).json({
                        message: "Only admins can directly change leave status",
                    });
                }

                const validatedInput = z
                    .object({
                        status: z.enum(["pending", "approved", "rejected"], {
                            errorMap: () => ({
                                message:
                                    "Invalid status. Must be: pending, approved, or rejected",
                            }),
                        }),
                    })
                    .parse(req.body);

                const leave = await storage.getLeaveById(leaveId);
                if (!leave) {
                    return res
                        .status(404)
                        .json({ message: "Leave request not found" });
                }

                if (requestingUser.companyId !== leave.companyId) {
                    return res.status(403).json({
                        message:
                            "You can only modify leave requests for your own company",
                    });
                }

                await storage.updateLeaveStatus(
                    leaveId,
                    validatedInput.status,
                    requestingUserId
                );

                const { broadcast } = await import("./index.js");
                const leaveUser = await storage.getUserById(leave.userId);
                broadcast({
                    type: "LEAVE_STATUS_UPDATE",
                    data: {
                        leaveId,
                        userId: leave.userId,
                        userName: leaveUser?.displayName,
                        status: validatedInput.status,
                        changedBy: requestingUser.displayName,
                        companyId: leave.companyId,
                    },
                });

                res.json({
                    message: `Leave status changed to ${validatedInput.status} successfully`,
                });
            } catch (error) {
                next(error);
            }
        }
    );

    app.post("/api/holidays", requireAuth, async (req, res, next) => {
        try {
            const requestingUserId = parseInt(
                req.headers["x-user-id"] as string
            );
            const requestingUser = await storage.getUserById(requestingUserId);

            if (
                !requestingUser ||
                (requestingUser.role !== "company_admin" &&
                    requestingUser.role !== "super_admin")
            ) {
                return res
                    .status(403)
                    .json({ message: "Only admins can create holidays" });
            }

            if (!requestingUser.companyId) {
                return res
                    .status(400)
                    .json({ message: "User not associated with a company" });
            }

            const holiday = await storage.createHoliday({
                companyId: requestingUser.companyId,
                name: req.body.name,
                date: req.body.date,
                description: req.body.description,
            });

            res.json(holiday);
        } catch (error) {
            next(error);
        }
    });

    app.get(
        "/api/holidays/company/:companyId",
        requireAuth,
        async (req, res, next) => {
            try {
                const requestingUserId = parseInt(
                    req.headers["x-user-id"] as string
                );
                const requestingUser = await storage.getUserById(
                    requestingUserId
                );
                const companyId = parseInt(req.params.companyId);

                if (
                    requestingUser &&
                    requestingUser.role === "company_admin" &&
                    requestingUser.companyId !== companyId
                ) {
                    return res.status(403).json({
                        message:
                            "You can only view holidays for your own company",
                    });
                }

                const holidays = await storage.getHolidaysByCompanyId(
                    companyId
                );
                res.json(holidays);
            } catch (error) {
                next(error);
            }
        }
    );

    app.delete(
        "/api/holidays/:holidayId",
        requireAuth,
        async (req, res, next) => {
            try {
                const requestingUserId = parseInt(
                    req.headers["x-user-id"] as string
                );
                const requestingUser = await storage.getUserById(
                    requestingUserId
                );
                const holidayId = parseInt(req.params.holidayId);

                if (
                    !requestingUser ||
                    (requestingUser.role !== "company_admin" &&
                        requestingUser.role !== "super_admin")
                ) {
                    return res
                        .status(403)
                        .json({ message: "Only admins can delete holidays" });
                }

                const holiday = await storage.getHolidayById(holidayId);
                if (!holiday) {
                    return res
                        .status(404)
                        .json({ message: "Holiday not found" });
                }

                if (
                    requestingUser.role === "company_admin" &&
                    requestingUser.companyId !== holiday.companyId
                ) {
                    return res.status(403).json({
                        message:
                            "You can only delete holidays for your own company",
                    });
                }

                await storage.deleteHoliday(holidayId);
                res.json({ message: "Holiday deleted successfully" });
            } catch (error) {
                next(error);
            }
        }
    );

    app.get("/api/badges", requireAuth, async (req, res, next) => {
        try {
            const badges = await storage.getAllBadges();
            res.json(badges);
        } catch (error) {
            next(error);
        }
    });

    app.post("/api/badges", requireAuth, async (req, res, next) => {
        try {
            const badge = await storage.createBadge(req.body);
            res.json(badge);
        } catch (error) {
            next(error);
        }
    });

    // Company Profile Management
    app.get("/api/my-company/profile", requireAuth, async (req, res, next) => {
        try {
            const requestingUserId = parseInt(
                req.headers["x-user-id"] as string
            );
            const requestingUser = await storage.getUserById(requestingUserId);

            if (!requestingUser || !requestingUser.companyId) {
                return res.status(404).json({ message: "Company not found" });
            }

            const company = await storage.getCompanyById(
                requestingUser.companyId
            );
            if (!company) {
                return res.status(404).json({ message: "Company not found" });
            }

            res.json(company);
        } catch (error) {
            next(error);
        }
    });

    app.patch(
        "/api/my-company/profile",
        requireAuth,
        async (req, res, next) => {
            try {
                const requestingUserId = parseInt(
                    req.headers["x-user-id"] as string
                );
                const requestingUser = await storage.getUserById(
                    requestingUserId
                );

                if (
                    !requestingUser ||
                    requestingUser.role !== "company_admin"
                ) {
                    return res.status(403).json({
                        message:
                            "Only company admins can update company profile",
                    });
                }

                if (!requestingUser.companyId) {
                    return res
                        .status(404)
                        .json({ message: "Company not found" });
                }

                // Add audit trail
                const updateData = {
                    ...req.body,
                    updatedBy:
                        requestingUser.displayName || requestingUser.email,
                    updatedAt: new Date(),
                };

                const updatedCompany = await storage.updateCompany(
                    requestingUser.companyId,
                    updateData
                );
                res.json(updatedCompany);
            } catch (error) {
                next(error);
            }
        }
    );

    // ==================== ATTENDANCE MANAGEMENT ====================

    // Validation schemas
    const checkInSchema = z.object({
        gpsLocation: z.string().nullable().optional(),
        deviceId: z.string().optional(),
    });

    const dailyAttendanceQuerySchema = z.object({
        date: z.string().optional(),
        companyId: z.string().optional(),
    });

    const manualAttendanceSchema = z.object({
        userId: z.number(),
        companyId: z.number(),
        date: z.string(),
        checkIn: z
            .string()
            .or(z.date())
            .optional()
            .transform((val) => {
                if (typeof val === "string") return new Date(val);
                return val;
            }),
        checkOut: z
            .string()
            .or(z.date())
            .optional()
            .nullable()
            .transform((val) => {
                if (val === null || val === undefined) return null;
                if (typeof val === "string") return new Date(val);
                return val;
            }),
        status: z.enum(["present", "absent", "late", "leave"]),
        workDuration: z.number().optional().nullable(),
        gpsLocation: z.string().nullable().optional(),
    });

    const updateAttendanceSchema = z.object({
        checkIn: z
            .string()
            .or(z.date())
            .optional()
            .transform((val) => {
                if (typeof val === "string") return new Date(val);
                return val;
            }),
        checkOut: z
            .string()
            .or(z.date())
            .optional()
            .nullable()
            .transform((val) => {
                if (val === null || val === undefined) return null;
                if (typeof val === "string") return new Date(val);
                return val;
            }),
        status: z.enum(["present", "absent", "late", "leave"]).optional(),
        workDuration: z.number().optional().nullable(),
        remarks: z.string().optional().nullable(),
    });

    const reportsQuerySchema = z.object({
        startDate: z.string().optional(),
        endDate: z.string().optional(),
        userId: z.string().optional(),
        companyId: z.string().optional(),
    });

    const correctionRequestSchema = z.object({
        attendanceId: z.number(),
        requestedCheckIn: z.string().or(z.date()).optional().nullable(),
        requestedCheckOut: z.string().or(z.date()).optional().nullable(),
        reason: z.string().min(1, "Reason is required"),
    });

    // Employee: Check-in
    app.post(
        "/api/attendance/check-in",
        requireAuth,
        async (req, res, next) => {
            try {
                const validatedBody = checkInSchema.parse(req.body);
                const userId = parseInt(req.headers["x-user-id"] as string);
                const user = await storage.getUserById(userId);

                if (!user || !user.companyId) {
                    return res
                        .status(404)
                        .json({ message: "User or company not found" });
                }

                const today = new Date().toISOString().split("T")[0];

                // Check if already checked in today
                const existingRecord = await storage.getAttendanceByUserAndDate(
                    userId,
                    today
                );
                if (existingRecord && existingRecord.checkIn) {
                    return res
                        .status(400)
                        .json({ message: "Already checked in today" });
                }

                // Get company policy to check if GPS is required
                const policy = await storage.getAttendancePolicyByCompany(
                    user.companyId
                );

                const checkInTime = new Date();
                const checkInHour = checkInTime.getHours();
                const checkInMinutes = checkInTime.getMinutes();
                const totalMinutes = checkInHour * 60 + checkInMinutes;
                const tenAM = 10 * 60;

                const isLate = totalMinutes > tenAM;
                const status: "late" | "present" = isLate ? "late" : "present";

                const checkInData = {
                    userId,
                    companyId: user.companyId,
                    date: today,
                    checkIn: checkInTime,
                    status,
                    gpsLocation: validatedBody.gpsLocation || null,
                    ipAddress: req.ip || null,
                    deviceId: validatedBody.deviceId || null,
                };

                const record = existingRecord
                    ? await storage.updateAttendanceRecord(
                          existingRecord.id,
                          checkInData
                      )
                    : await storage.createAttendanceRecord(checkInData);

                res.json(record);
            } catch (error) {
                next(error);
            }
        }
    );

    // Employee: Check-out
    app.post(
        "/api/attendance/check-out",
        requireAuth,
        async (req, res, next) => {
            try {
                const userId = parseInt(req.headers["x-user-id"] as string);
                const today = new Date().toISOString().split("T")[0];

                const record = await storage.getAttendanceByUserAndDate(
                    userId,
                    today
                );
                if (!record) {
                    return res.status(404).json({
                        message: "No check-in record found for today",
                    });
                }

                if (record.checkOut) {
                    return res
                        .status(400)
                        .json({ message: "Already checked out today" });
                }

                const checkOut = new Date();
                const checkIn = new Date(record.checkIn!);
                const workDuration = Math.floor(
                    (checkOut.getTime() - checkIn.getTime()) / 1000 / 60
                ); // in minutes

                const updatedRecord = await storage.updateAttendanceRecord(
                    record.id,
                    {
                        checkOut,
                        workDuration,
                    }
                );

                res.json(updatedRecord);
            } catch (error) {
                next(error);
            }
        }
    );

    // Employee: Get today's attendance
    app.get("/api/attendance/today", requireAuth, async (req, res, next) => {
        try {
            const userId = parseInt(req.headers["x-user-id"] as string);
            const today = new Date().toISOString().split("T")[0];

            const record = await storage.getAttendanceByUserAndDate(
                userId,
                today
            );
            res.json(record || null);
        } catch (error) {
            next(error);
        }
    });

    // Employee: Get attendance history
    app.get("/api/attendance/history", requireAuth, async (req, res, next) => {
        try {
            const userId = parseInt(req.headers["x-user-id"] as string);
            const { startDate, endDate } = req.query;

            // Default to current month if not provided
            const now = new Date();
            const defaultStartDate = new Date(
                now.getFullYear(),
                now.getMonth(),
                1
            )
                .toISOString()
                .split("T")[0];
            const defaultEndDate = new Date(
                now.getFullYear(),
                now.getMonth() + 1,
                0
            )
                .toISOString()
                .split("T")[0];

            const records = await storage.getAttendanceHistory(
                userId,
                (startDate as string) || defaultStartDate,
                (endDate as string) || defaultEndDate
            );

            res.json(records);
        } catch (error) {
            next(error);
        }
    });

    // Employee: Get monthly attendance summary
    app.get(
        "/api/attendance/monthly-summary",
        requireAuth,
        async (req, res, next) => {
            try {
                const userId = parseInt(req.headers["x-user-id"] as string);
                const { month, year } = req.query;

                // Default to current month/year if not provided
                const now = new Date();
                const targetMonth = month
                    ? parseInt(month as string)
                    : now.getMonth() + 1;
                const targetYear = year
                    ? parseInt(year as string)
                    : now.getFullYear();

                const summary = await storage.getMonthlyAttendanceSummary(
                    userId,
                    targetMonth,
                    targetYear
                );

                res.json(summary);
            } catch (error) {
                next(error);
            }
        }
    );

    // Employee: Mark as leave
    app.post(
        "/api/attendance/mark-leave",
        requireAuth,
        async (req, res, next) => {
            try {
                const userId = parseInt(req.headers["x-user-id"] as string);
                const user = await storage.getUserById(userId);

                if (!user || !user.companyId) {
                    return res
                        .status(404)
                        .json({ message: "User or company not found" });
                }

                const markLeaveSchema = z.object({
                    reason: z
                        .string()
                        .min(10, "Reason must be at least 10 characters"),
                    date: z.string().optional(),
                });

                const validatedBody = markLeaveSchema.parse(req.body);
                const targetDate =
                    validatedBody.date ||
                    new Date().toISOString().split("T")[0];

                // Check if already has attendance record for this date
                const existingRecord = await storage.getAttendanceByUserAndDate(
                    userId,
                    targetDate
                );
                if (existingRecord && existingRecord.checkIn) {
                    return res.status(400).json({
                        message:
                            "Already checked in for this date. Cannot mark as leave.",
                    });
                }

                const leaveData = {
                    userId,
                    companyId: user.companyId,
                    date: targetDate,
                    status: "leave" as const,
                    remarks: validatedBody.reason,
                };

                const record = existingRecord
                    ? await storage.updateAttendanceRecord(
                          existingRecord.id,
                          leaveData
                      )
                    : await storage.createAttendanceRecord(leaveData);

                res.json(record);
            } catch (error) {
                next(error);
            }
        }
    );

    // Employee: Request correction
    app.post(
        "/api/attendance/correction-request",
        requireAuth,
        async (req, res, next) => {
            try {
                const userId = parseInt(req.headers["x-user-id"] as string);
                const user = await storage.getUserById(userId);

                if (!user || !user.companyId) {
                    return res
                        .status(404)
                        .json({ message: "User or company not found" });
                }

                const correctionSchema = insertCorrectionRequestSchema
                    .omit({
                        userId: true,
                        companyId: true,
                        status: true,
                        reviewedBy: true,
                        reviewComments: true,
                        requestedCheckIn: true,
                        requestedCheckOut: true,
                    })
                    .extend({
                        attendanceId: z.number().optional().nullable(),
                        requestedCheckIn: z
                            .string()
                            .or(z.date())
                            .optional()
                            .nullable()
                            .transform((val) => {
                                if (typeof val === "string" && val)
                                    return new Date(val);
                                if (val instanceof Date) return val;
                                return null;
                            }),
                        requestedCheckOut: z
                            .string()
                            .or(z.date())
                            .optional()
                            .nullable()
                            .transform((val) => {
                                if (typeof val === "string" && val)
                                    return new Date(val);
                                if (val instanceof Date) return val;
                                return null;
                            }),
                    });

                const validatedBody = correctionSchema.parse(req.body);

                const correctionData = {
                    userId,
                    companyId: user.companyId,
                    ...validatedBody,
                };

                const request = await storage.createCorrectionRequest(
                    correctionData
                );
                res.json(request);
            } catch (error) {
                next(error);
            }
        }
    );

    // Employee: Get my correction requests
    app.get(
        "/api/attendance/my-corrections",
        requireAuth,
        async (req, res, next) => {
            try {
                const userId = parseInt(req.headers["x-user-id"] as string);
                const requests = await storage.getCorrectionRequestsByUser(
                    userId
                );
                res.json(requests);
            } catch (error) {
                next(error);
            }
        }
    );

    // Employee: Get my rewards
    app.get(
        "/api/attendance/my-rewards",
        requireAuth,
        async (req, res, next) => {
            try {
                const userId = parseInt(req.headers["x-user-id"] as string);
                const rewards = await storage.getRewardsByUser(userId);
                res.json(rewards);
            } catch (error) {
                next(error);
            }
        }
    );

    // Admin: Get daily attendance monitor
    app.get(
        "/api/admin/attendance/daily",
        requireAdmin,
        async (req, res, next) => {
            try {
                const validatedQuery = dailyAttendanceQuerySchema.parse(
                    req.query
                );
                const requestingUserId = parseInt(
                    req.headers["x-user-id"] as string
                );
                const requestingUser = await storage.getUserById(
                    requestingUserId
                );

                if (
                    !requestingUser ||
                    (requestingUser.role !== "company_admin" &&
                        requestingUser.role !== "super_admin")
                ) {
                    return res.status(403).json({
                        message: "Only admins can view attendance monitor",
                    });
                }

                const { date, companyId } = validatedQuery;
                const targetCompanyId =
                    requestingUser.role === "super_admin"
                        ? parseInt(companyId as string)
                        : requestingUser.companyId;

                if (!targetCompanyId) {
                    if (process.env.NODE_ENV === "development") {
                        console.warn("[Attendance] Admin missing companyId:", {
                            userId: requestingUser.id,
                            role: requestingUser.role,
                        });
                    }
                    return res
                        .status(400)
                        .json({ message: "Company ID required" });
                }

                const requestedDate =
                    (date as string) || new Date().toISOString().split("T")[0];
                const records = await storage.getDailyAttendance(
                    targetCompanyId,
                    requestedDate
                );

                if (process.env.NODE_ENV === "development") {
                    console.log("[Attendance] Query:", {
                        adminId: requestingUser.id,
                        adminRole: requestingUser.role,
                        targetCompanyId,
                        date: requestedDate,
                        recordsFound: records.length,
                    });
                }

                res.json(records);
            } catch (error) {
                if (process.env.NODE_ENV === "development") {
                    console.error(
                        "[Attendance] Error fetching daily attendance:",
                        error
                    );
                }
                next(error);
            }
        }
    );

    // Admin: Manual attendance entry/update
    app.post(
        "/api/admin/attendance/manual",
        requireAdmin,
        async (req, res, next) => {
            try {
                const validatedBody = manualAttendanceSchema.parse(req.body);
                const requestingUserId = parseInt(
                    req.headers["x-user-id"] as string
                );
                const requestingUser = await storage.getUserById(
                    requestingUserId
                );

                if (
                    !requestingUser ||
                    (requestingUser.role !== "company_admin" &&
                        requestingUser.role !== "super_admin")
                ) {
                    return res.status(403).json({
                        message: "Only admins can add manual attendance",
                    });
                }

                const record = await storage.createAttendanceRecord({
                    ...validatedBody,
                    remarks: `Manual entry by ${requestingUser.displayName}`,
                });

                // Log the action
                await storage.createAttendanceLog({
                    attendanceId: record.id,
                    action: "manual_entry",
                    performedBy: requestingUserId,
                    newValue: JSON.stringify(record),
                });

                res.json(record);
            } catch (error) {
                next(error);
            }
        }
    );

    // Admin: Update attendance record
    app.patch(
        "/api/admin/attendance/:id",
        requireAdmin,
        async (req, res, next) => {
            try {
                const validatedBody = updateAttendanceSchema.parse(req.body);
                const requestingUserId = parseInt(
                    req.headers["x-user-id"] as string
                );
                const requestingUser = await storage.getUserById(
                    requestingUserId
                );

                if (
                    !requestingUser ||
                    (requestingUser.role !== "company_admin" &&
                        requestingUser.role !== "super_admin")
                ) {
                    return res
                        .status(403)
                        .json({ message: "Only admins can update attendance" });
                }

                const recordId = parseInt(req.params.id);
                const oldRecord = await storage.getAttendanceById(recordId);

                if (!oldRecord) {
                    return res
                        .status(404)
                        .json({ message: "Attendance record not found" });
                }

                const updatedRecord = await storage.updateAttendanceRecord(
                    recordId,
                    validatedBody
                );

                // Log the action
                await storage.createAttendanceLog({
                    attendanceId: recordId,
                    action: "admin_update",
                    performedBy: requestingUserId,
                    oldValue: JSON.stringify(oldRecord),
                    newValue: JSON.stringify(updatedRecord),
                });

                res.json(updatedRecord);
            } catch (error) {
                next(error);
            }
        }
    );

    // Team Leader: Get correction requests for team members
    app.get(
        "/api/corrections/team/:teamLeaderId",
        requireAuth,
        async (req, res, next) => {
            try {
                const requestingUserId = parseInt(
                    req.headers["x-user-id"] as string
                );
                const teamLeaderId = parseInt(req.params.teamLeaderId);
                const requestingUser = await storage.getUserById(
                    requestingUserId
                );

                // Verify the requesting user is the team leader
                if (requestingUserId !== teamLeaderId) {
                    return res.status(403).json({ message: "Access denied" });
                }

                if (!requestingUser || !requestingUser.companyId) {
                    return res
                        .status(401)
                        .json({ message: "Authentication required" });
                }

                // Get team member IDs
                const teamMembers = await storage.getTeamMembersByLeader(
                    teamLeaderId
                );
                const teamMemberIds = teamMembers.map((m) => m.id);

                // Get all corrections for the company
                const allCorrections =
                    await storage.getPendingCorrectionRequests(
                        requestingUser.companyId
                    );

                // Filter to only team members' corrections
                const teamCorrections = allCorrections.filter((corr) =>
                    teamMemberIds.includes(corr.userId)
                );

                res.json(teamCorrections);
            } catch (error) {
                next(error);
            }
        }
    );

    // Team Leader: Approve correction request
    app.patch(
        "/api/corrections/:id/approve",
        requireAuth,
        async (req, res, next) => {
            try {
                const requestingUserId = parseInt(
                    req.headers["x-user-id"] as string
                );
                const requestingUser = await storage.getUserById(
                    requestingUserId
                );

                if (!requestingUser) {
                    return res
                        .status(401)
                        .json({ message: "Authentication required" });
                }

                const requestId = parseInt(req.params.id);
                const correctionRequest =
                    await storage.getCorrectionRequestById(requestId);

                if (!correctionRequest) {
                    return res
                        .status(404)
                        .json({ message: "Correction request not found" });
                }

                // Verify the user making the correction is from the team
                const teamMembers = await storage.getTeamMembersByLeader(
                    requestingUserId
                );
                const teamMemberIds = teamMembers.map((m) => m.id);

                if (!teamMemberIds.includes(correctionRequest.userId)) {
                    return res.status(403).json({
                        message:
                            "You can only approve corrections for your team members",
                    });
                }

                // Update correction request status
                const updatedRequest = await storage.updateCorrectionRequest(
                    requestId,
                    {
                        status: "approved",
                        reviewedBy: requestingUserId,
                        reviewComments: req.body.comments,
                    }
                );

                // Apply the correction to attendance record
                if (correctionRequest.attendanceId) {
                    const attendanceUpdate: any = {};
                    if (correctionRequest.requestedCheckIn) {
                        attendanceUpdate.checkIn =
                            correctionRequest.requestedCheckIn;
                    }
                    if (correctionRequest.requestedCheckOut) {
                        attendanceUpdate.checkOut =
                            correctionRequest.requestedCheckOut;
                    }

                    if (attendanceUpdate.checkIn || attendanceUpdate.checkOut) {
                        await storage.updateAttendanceRecord(
                            correctionRequest.attendanceId,
                            attendanceUpdate
                        );

                        // Log the correction
                        await storage.createAttendanceLog({
                            attendanceId: correctionRequest.attendanceId,
                            action: "correction_applied",
                            performedBy: requestingUserId,
                            newValue: JSON.stringify(correctionRequest),
                        });
                    }
                }

                res.json(updatedRequest);
            } catch (error) {
                next(error);
            }
        }
    );

    // Team Leader: Reject correction request
    app.patch(
        "/api/corrections/:id/reject",
        requireAuth,
        async (req, res, next) => {
            try {
                const requestingUserId = parseInt(
                    req.headers["x-user-id"] as string
                );
                const requestingUser = await storage.getUserById(
                    requestingUserId
                );

                if (!requestingUser) {
                    return res
                        .status(401)
                        .json({ message: "Authentication required" });
                }

                const requestId = parseInt(req.params.id);
                const correctionRequest =
                    await storage.getCorrectionRequestById(requestId);

                if (!correctionRequest) {
                    return res
                        .status(404)
                        .json({ message: "Correction request not found" });
                }

                // Verify the user making the rejection is from the team
                const teamMembers = await storage.getTeamMembersByLeader(
                    requestingUserId
                );
                const teamMemberIds = teamMembers.map((m) => m.id);

                if (!teamMemberIds.includes(correctionRequest.userId)) {
                    return res.status(403).json({
                        message:
                            "You can only reject corrections for your team members",
                    });
                }

                const updatedRequest = await storage.updateCorrectionRequest(
                    requestId,
                    {
                        status: "rejected",
                        reviewedBy: requestingUserId,
                        reviewComments: req.body.comments,
                    }
                );

                res.json(updatedRequest);
            } catch (error) {
                next(error);
            }
        }
    );

    // Admin: Get pending correction requests
    app.get(
        "/api/admin/attendance/corrections/pending",
        requireAdmin,
        async (req, res, next) => {
            try {
                const requestingUserId = parseInt(
                    req.headers["x-user-id"] as string
                );
                const requestingUser = await storage.getUserById(
                    requestingUserId
                );

                if (
                    !requestingUser ||
                    (requestingUser.role !== "company_admin" &&
                        requestingUser.role !== "super_admin")
                ) {
                    return res.status(403).json({
                        message: "Only admins can view correction requests",
                    });
                }

                const companyId =
                    requestingUser.role === "super_admin"
                        ? parseInt(req.query.companyId as string)
                        : requestingUser.companyId;

                if (!companyId) {
                    return res
                        .status(400)
                        .json({ message: "Company ID required" });
                }

                const requests = await storage.getPendingCorrectionRequests(
                    companyId
                );
                res.json(requests);
            } catch (error) {
                next(error);
            }
        }
    );

    // Admin: Approve correction request
    app.patch(
        "/api/admin/attendance/corrections/:id/approve",
        requireAdmin,
        async (req, res, next) => {
            try {
                const requestingUserId = parseInt(
                    req.headers["x-user-id"] as string
                );
                const requestingUser = await storage.getUserById(
                    requestingUserId
                );

                if (
                    !requestingUser ||
                    (requestingUser.role !== "company_admin" &&
                        requestingUser.role !== "super_admin")
                ) {
                    return res.status(403).json({
                        message: "Only admins can approve corrections",
                    });
                }

                const requestId = parseInt(req.params.id);
                const correctionRequest =
                    await storage.getCorrectionRequestById(requestId);

                if (!correctionRequest) {
                    return res
                        .status(404)
                        .json({ message: "Correction request not found" });
                }

                // Update correction request status
                const updatedRequest = await storage.updateCorrectionRequest(
                    requestId,
                    {
                        status: "approved",
                        reviewedBy: requestingUserId,
                        reviewComments: req.body.comments,
                    }
                );

                // Apply the correction to attendance record
                if (correctionRequest.attendanceId) {
                    const attendanceUpdate: any = {};
                    if (correctionRequest.requestedCheckIn) {
                        attendanceUpdate.checkIn =
                            correctionRequest.requestedCheckIn;
                    }
                    if (correctionRequest.requestedCheckOut) {
                        attendanceUpdate.checkOut =
                            correctionRequest.requestedCheckOut;
                    }

                    if (attendanceUpdate.checkIn || attendanceUpdate.checkOut) {
                        await storage.updateAttendanceRecord(
                            correctionRequest.attendanceId,
                            attendanceUpdate
                        );

                        // Log the correction
                        await storage.createAttendanceLog({
                            attendanceId: correctionRequest.attendanceId,
                            action: "correction_applied",
                            performedBy: requestingUserId,
                            newValue: JSON.stringify(correctionRequest),
                        });
                    }
                }

                res.json(updatedRequest);
            } catch (error) {
                next(error);
            }
        }
    );

    // Admin: Reject correction request
    app.patch(
        "/api/admin/attendance/corrections/:id/reject",
        requireAdmin,
        async (req, res, next) => {
            try {
                const requestingUserId = parseInt(
                    req.headers["x-user-id"] as string
                );
                const requestingUser = await storage.getUserById(
                    requestingUserId
                );

                if (
                    !requestingUser ||
                    (requestingUser.role !== "company_admin" &&
                        requestingUser.role !== "super_admin")
                ) {
                    return res.status(403).json({
                        message: "Only admins can reject corrections",
                    });
                }

                const requestId = parseInt(req.params.id);
                const updatedRequest = await storage.updateCorrectionRequest(
                    requestId,
                    {
                        status: "rejected",
                        reviewedBy: requestingUserId,
                        reviewComments: req.body.comments,
                    }
                );

                res.json(updatedRequest);
            } catch (error) {
                next(error);
            }
        }
    );

    // Admin: Get attendance reports
    app.get(
        "/api/admin/attendance/reports",
        requireAdmin,
        async (req, res, next) => {
            try {
                const validatedQuery = reportsQuerySchema.parse(req.query);
                const requestingUserId = parseInt(
                    req.headers["x-user-id"] as string
                );
                const requestingUser = await storage.getUserById(
                    requestingUserId
                );

                if (
                    !requestingUser ||
                    (requestingUser.role !== "company_admin" &&
                        requestingUser.role !== "super_admin")
                ) {
                    return res
                        .status(403)
                        .json({ message: "Only admins can view reports" });
                }

                const { companyId, startDate, endDate } = validatedQuery;
                const type = req.query.type;
                const targetCompanyId =
                    requestingUser.role === "super_admin"
                        ? parseInt(companyId as string)
                        : requestingUser.companyId;

                if (!targetCompanyId) {
                    return res
                        .status(400)
                        .json({ message: "Company ID required" });
                }

                const report = await storage.getAttendanceReport(
                    targetCompanyId,
                    startDate as string,
                    endDate as string,
                    type as string
                );

                res.json(report);
            } catch (error) {
                next(error);
            }
        }
    );

    // Admin: Get user attendance history
    app.get(
        "/api/admin/attendance/history/:userId",
        requireAdmin,
        async (req, res, next) => {
            try {
                const requestingUserId = parseInt(
                    req.headers["x-user-id"] as string
                );
                const requestingUser = await storage.getUserById(
                    requestingUserId
                );
                const targetUserId = parseInt(req.params.userId);
                const { month, year } = req.query;

                if (
                    !requestingUser ||
                    (requestingUser.role !== "company_admin" &&
                        requestingUser.role !== "super_admin")
                ) {
                    return res.status(403).json({
                        message: "Only admins can view user attendance history",
                    });
                }

                // Get target user to verify company access
                const targetUser = await storage.getUserById(targetUserId);
                if (!targetUser) {
                    return res.status(404).json({ message: "User not found" });
                }

                // Ensure admin can only view users from their company (unless super admin)
                if (
                    requestingUser.role === "company_admin" &&
                    targetUser.companyId !== requestingUser.companyId
                ) {
                    return res.status(403).json({
                        message:
                            "You can only view attendance for users in your company",
                    });
                }

                // Default to current month if not provided
                const now = new Date();
                const targetMonth = month
                    ? parseInt(month as string)
                    : now.getMonth() + 1;
                const targetYear = year
                    ? parseInt(year as string)
                    : now.getFullYear();

                const startDate = `${targetYear}-${targetMonth
                    .toString()
                    .padStart(2, "0")}-01`;
                const lastDay = new Date(targetYear, targetMonth, 0).getDate();
                const endDate = `${targetYear}-${targetMonth
                    .toString()
                    .padStart(2, "0")}-${lastDay.toString().padStart(2, "0")}`;

                const records = await storage.getAttendanceHistory(
                    targetUserId,
                    startDate,
                    endDate
                );
                const summary = await storage.getMonthlyAttendanceSummary(
                    targetUserId,
                    targetMonth,
                    targetYear
                );

                res.json({
                    records,
                    summary,
                    user: {
                        id: targetUser.id,
                        displayName: targetUser.displayName,
                        email: targetUser.email,
                    },
                });
            } catch (error) {
                next(error);
            }
        }
    );

    // Shifts Management
    app.post("/api/admin/shifts", requireAdmin, async (req, res, next) => {
        try {
            const requestingUserId = parseInt(
                req.headers["x-user-id"] as string
            );
            const requestingUser = await storage.getUserById(requestingUserId);

            if (
                !requestingUser ||
                (requestingUser.role !== "company_admin" &&
                    requestingUser.role !== "super_admin")
            ) {
                return res
                    .status(403)
                    .json({ message: "Only admins can create shifts" });
            }

            const shift = await storage.createShift({
                ...req.body,
                companyId: requestingUser.companyId!,
            });

            res.json(shift);
        } catch (error) {
            next(error);
        }
    });

    app.get(
        "/api/shifts/company/:companyId",
        requireAuth,
        async (req, res, next) => {
            try {
                const companyId = parseInt(req.params.companyId);
                const shifts = await storage.getShiftsByCompany(companyId);
                res.json(shifts);
            } catch (error) {
                next(error);
            }
        }
    );

    // Attendance Policy Management
    app.get(
        "/api/admin/attendance-policy",
        requireAdmin,
        async (req, res, next) => {
            try {
                const requestingUserId = parseInt(
                    req.headers["x-user-id"] as string
                );
                const requestingUser = await storage.getUserById(
                    requestingUserId
                );

                if (!requestingUser || !requestingUser.companyId) {
                    return res
                        .status(404)
                        .json({ message: "Company not found" });
                }

                const policy = await storage.getAttendancePolicyByCompany(
                    requestingUser.companyId
                );
                res.json(policy || null);
            } catch (error) {
                next(error);
            }
        }
    );

    app.post(
        "/api/admin/attendance-policy",
        requireAdmin,
        async (req, res, next) => {
            try {
                const requestingUserId = parseInt(
                    req.headers["x-user-id"] as string
                );
                const requestingUser = await storage.getUserById(
                    requestingUserId
                );

                if (
                    !requestingUser ||
                    (requestingUser.role !== "company_admin" &&
                        requestingUser.role !== "super_admin")
                ) {
                    return res
                        .status(403)
                        .json({ message: "Only admins can manage policies" });
                }

                const policy = await storage.createOrUpdateAttendancePolicy({
                    ...req.body,
                    companyId: requestingUser.companyId!,
                });

                res.json(policy);
            } catch (error) {
                next(error);
            }
        }
    );

    // CRM - Enquiry Routes (Admin Only)
    app.get("/api/crm/enquiries", requireAdmin, async (req, res, next) => {
        try {
            const requestingUserId = parseInt(
                req.headers["x-user-id"] as string
            );
            const requestingUser = await storage.getUserById(requestingUserId);

            if (!requestingUser || !requestingUser.companyId) {
                return res.status(404).json({ message: "Company not found" });
            }

            const enquiries = await storage.getEnquiriesByCompanyId(
                requestingUser.companyId
            );
            res.json(enquiries);
        } catch (error) {
            next(error);
        }
    });

    app.get("/api/crm/enquiries/:id", requireAdmin, async (req, res, next) => {
        try {
            const requestingUserId = parseInt(
                req.headers["x-user-id"] as string
            );
            const requestingUser = await storage.getUserById(requestingUserId);

            if (!requestingUser || !requestingUser.companyId) {
                return res.status(404).json({ message: "Company not found" });
            }

            const enquiry = await storage.getEnquiryById(
                parseInt(req.params.id)
            );
            if (!enquiry) {
                return res.status(404).json({ message: "Enquiry not found" });
            }

            // Verify enquiry belongs to user's company
            if (enquiry.companyId !== requestingUser.companyId) {
                return res.status(403).json({ message: "Access denied" });
            }

            res.json(enquiry);
        } catch (error) {
            next(error);
        }
    });

    app.post("/api/crm/enquiries", requireAdmin, async (req, res, next) => {
        try {
            const requestingUserId = parseInt(
                req.headers["x-user-id"] as string
            );
            const requestingUser = await storage.getUserById(requestingUserId);

            if (!requestingUser || !requestingUser.companyId) {
                return res.status(404).json({ message: "Company not found" });
            }

            const enquiry = await storage.createEnquiry({
                ...req.body,
                companyId: requestingUser.companyId,
                createdBy: requestingUserId,
            });

            res.json(enquiry);
        } catch (error) {
            next(error);
        }
    });

    app.patch(
        "/api/crm/enquiries/:id",
        requireAdmin,
        async (req, res, next) => {
            try {
                const requestingUserId = parseInt(
                    req.headers["x-user-id"] as string
                );
                const requestingUser = await storage.getUserById(
                    requestingUserId
                );

                if (!requestingUser || !requestingUser.companyId) {
                    return res
                        .status(404)
                        .json({ message: "Company not found" });
                }

                const enquiry = await storage.getEnquiryById(
                    parseInt(req.params.id)
                );
                if (!enquiry) {
                    return res
                        .status(404)
                        .json({ message: "Enquiry not found" });
                }

                // Verify enquiry belongs to user's company
                if (enquiry.companyId !== requestingUser.companyId) {
                    return res.status(403).json({ message: "Access denied" });
                }

                await storage.updateEnquiry(parseInt(req.params.id), req.body);
                res.json({ message: "Enquiry updated successfully" });
            } catch (error) {
                next(error);
            }
        }
    );

    app.delete(
        "/api/crm/enquiries/:id",
        requireAdmin,
        async (req, res, next) => {
            try {
                const requestingUserId = parseInt(
                    req.headers["x-user-id"] as string
                );
                const requestingUser = await storage.getUserById(
                    requestingUserId
                );

                if (!requestingUser || !requestingUser.companyId) {
                    return res
                        .status(404)
                        .json({ message: "Company not found" });
                }

                const enquiry = await storage.getEnquiryById(
                    parseInt(req.params.id)
                );
                if (!enquiry) {
                    return res
                        .status(404)
                        .json({ message: "Enquiry not found" });
                }

                // Verify enquiry belongs to user's company
                if (enquiry.companyId !== requestingUser.companyId) {
                    return res.status(403).json({ message: "Access denied" });
                }

                await storage.deleteEnquiry(parseInt(req.params.id));
                res.json({ message: "Enquiry deleted successfully" });
            } catch (error) {
                next(error);
            }
        }
    );

    app.get("/api/crm/stats", requireAdmin, async (req, res, next) => {
        try {
            const requestingUserId = parseInt(
                req.headers["x-user-id"] as string
            );
            const requestingUser = await storage.getUserById(requestingUserId);

            if (!requestingUser || !requestingUser.companyId) {
                return res.status(404).json({ message: "Company not found" });
            }

            const stats = await storage.getEnquiryStats(
                requestingUser.companyId
            );
            res.json(stats);
        } catch (error) {
            next(error);
        }
    });

    // CRM - Followup Routes (Admin Only)
    app.get("/api/crm/followups", requireAdmin, async (req, res, next) => {
        try {
            const requestingUserId = parseInt(
                req.headers["x-user-id"] as string
            );
            const requestingUser = await storage.getUserById(requestingUserId);

            if (!requestingUser || !requestingUser.companyId) {
                return res.status(404).json({ message: "Company not found" });
            }

            const followups = await storage.getFollowupsByCompanyId(
                requestingUser.companyId
            );
            res.json(followups);
        } catch (error) {
            next(error);
        }
    });

    app.get(
        "/api/crm/followups/enquiry/:enquiryId",
        requireAdmin,
        async (req, res, next) => {
            try {
                const requestingUserId = parseInt(
                    req.headers["x-user-id"] as string
                );
                const requestingUser = await storage.getUserById(
                    requestingUserId
                );

                if (!requestingUser || !requestingUser.companyId) {
                    return res
                        .status(404)
                        .json({ message: "Company not found" });
                }

                // Verify enquiry belongs to user's company
                const enquiry = await storage.getEnquiryById(
                    parseInt(req.params.enquiryId)
                );
                if (!enquiry) {
                    return res
                        .status(404)
                        .json({ message: "Enquiry not found" });
                }

                if (enquiry.companyId !== requestingUser.companyId) {
                    return res.status(403).json({ message: "Access denied" });
                }

                const followups = await storage.getFollowupsByEnquiryId(
                    parseInt(req.params.enquiryId)
                );
                res.json(followups);
            } catch (error) {
                next(error);
            }
        }
    );

    app.post("/api/crm/followups", requireAdmin, async (req, res, next) => {
        try {
            const requestingUserId = parseInt(
                req.headers["x-user-id"] as string
            );
            const requestingUser = await storage.getUserById(requestingUserId);

            if (!requestingUser || !requestingUser.companyId) {
                return res.status(404).json({ message: "Company not found" });
            }

            // Verify the enquiry belongs to the user's company
            const enquiry = await storage.getEnquiryById(
                parseInt(req.body.enquiryId)
            );
            if (!enquiry) {
                return res.status(404).json({ message: "Enquiry not found" });
            }

            if (enquiry.companyId !== requestingUser.companyId) {
                return res.status(403).json({
                    message:
                        "Access denied - enquiry belongs to another company",
                });
            }

            const followup = await storage.createFollowup({
                ...req.body,
                companyId: requestingUser.companyId,
                createdBy: requestingUserId,
            });

            res.json(followup);
        } catch (error) {
            next(error);
        }
    });

    app.patch(
        "/api/crm/followups/:id",
        requireAdmin,
        async (req, res, next) => {
            try {
                const requestingUserId = parseInt(
                    req.headers["x-user-id"] as string
                );
                const requestingUser = await storage.getUserById(
                    requestingUserId
                );

                if (!requestingUser || !requestingUser.companyId) {
                    return res
                        .status(404)
                        .json({ message: "Company not found" });
                }

                const followup = await storage.getFollowupById(
                    parseInt(req.params.id)
                );
                if (!followup) {
                    return res
                        .status(404)
                        .json({ message: "Followup not found" });
                }

                // Verify followup belongs to user's company
                if (followup.companyId !== requestingUser.companyId) {
                    return res.status(403).json({ message: "Access denied" });
                }

                await storage.updateFollowup(parseInt(req.params.id), req.body);
                res.json({ message: "Followup updated successfully" });
            } catch (error) {
                next(error);
            }
        }
    );

    app.delete(
        "/api/crm/followups/:id",
        requireAdmin,
        async (req, res, next) => {
            try {
                const requestingUserId = parseInt(
                    req.headers["x-user-id"] as string
                );
                const requestingUser = await storage.getUserById(
                    requestingUserId
                );

                if (!requestingUser || !requestingUser.companyId) {
                    return res
                        .status(404)
                        .json({ message: "Company not found" });
                }

                const followup = await storage.getFollowupById(
                    parseInt(req.params.id)
                );
                if (!followup) {
                    return res
                        .status(404)
                        .json({ message: "Followup not found" });
                }

                // Verify followup belongs to user's company
                if (followup.companyId !== requestingUser.companyId) {
                    return res.status(403).json({ message: "Access denied" });
                }

                await storage.deleteFollowup(parseInt(req.params.id));
                res.json({ message: "Followup deleted successfully" });
            } catch (error) {
                next(error);
            }
        }
    );

    const httpServer = createServer(app);

    return httpServer;
}
