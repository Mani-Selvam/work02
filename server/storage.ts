﻿import { db } from "./db";
import {
    companies,
    users,
    tasks,
    reports,
    messages,
    ratings,
    fileUploads,
    archiveReports,
    groupMessages,
    groupMessageReplies,
    taskTimeLogs,
    feedbacks,
    slotPricing,
    companyPayments,
    passwordResetTokens,
    adminActivityLogs,
    badges,
    autoTasks,
    leaves,
    holidays,
    tasksReports,
    shifts,
    attendancePolicies,
    attendanceRecords,
    correctionRequests,
    rewards,
    attendanceLogs,
    teamAssignments,
    enquiries,
    followups,
    deviceTokens,
    type Company,
    type InsertCompany,
    type User,
    type InsertUser,
    type Task,
    type InsertTask,
    type Report,
    type InsertReport,
    type Message,
    type InsertMessage,
    type Rating,
    type InsertRating,
    type FileUpload,
    type InsertFileUpload,
    type ArchiveReport,
    type GroupMessage,
    type InsertGroupMessage,
    type GroupMessageReply,
    type InsertGroupMessageReply,
    type TaskTimeLog,
    type InsertTaskTimeLog,
    type Feedback,
    type InsertFeedback,
    type SlotPricing,
    type InsertSlotPricing,
    type CompanyPayment,
    type InsertCompanyPayment,
    type PasswordResetToken,
    type AdminActivityLog,
    type InsertAdminActivityLog,
    type Badge,
    type InsertBadge,
    type AutoTask,
    type InsertAutoTask,
    type Leave,
    type InsertLeave,
    type Holiday,
    type InsertHoliday,
    type TasksReport,
    type InsertTasksReport,
    type Shift,
    type InsertShift,
    type AttendancePolicy,
    type InsertAttendancePolicy,
    type AttendanceRecord,
    type InsertAttendanceRecord,
    type DailyAttendanceRecord,
    type CorrectionRequest,
    type InsertCorrectionRequest,
    type Reward,
    type InsertReward,
    type AttendanceLog,
    type InsertAttendanceLog,
    type TeamAssignment,
    type InsertTeamAssignment,
    type Enquiry,
    type InsertEnquiry,
    type Followup,
    type InsertFollowup,
    type DeviceToken,
    type InsertDeviceToken,
} from "@shared/schema";
import { eq, and, or, desc, gte, lte, sql, inArray } from "drizzle-orm";

function generateUniqueId(prefix: string): string {
    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
    let id = "";
    for (let i = 0; i < 6; i++) {
        id += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return `${prefix}-${id}`;
}

export interface IStorage {
    // Company operations
    createCompany(company: InsertCompany): Promise<Company>;
    getCompanyById(id: number): Promise<Company | null>;
    getCompanyByServerId(serverId: string): Promise<Company | null>;
    getCompanyByEmail(email: string): Promise<Company | null>;
    getCompanyByVerificationToken(token: string): Promise<Company | null>;
    verifyCompanyEmail(token: string): Promise<Company | null>;
    getAllCompanies(): Promise<Company[]>;
    updateCompany(id: number, updates: Partial<InsertCompany>): Promise<void>;
    incrementCompanySlots(
        id: number,
        updates: { maxAdmins?: number; maxMembers?: number }
    ): Promise<void>;
    deleteCompany(id: number): Promise<void>;
    getUsersByCompanyId(companyId: number): Promise<User[]>;

    // User operations
    getUserByEmail(email: string): Promise<User | null>;
    getUserById(id: number): Promise<User | null>;
    getUserByFirebaseUid(uid: string): Promise<User | null>;
    getUserByUniqueUserId(uniqueUserId: string): Promise<User | null>;
    getUserByDisplayName(displayName: string): Promise<User | null>;
    createUser(user: InsertUser): Promise<User>;
    updateUserRole(id: number, role: string): Promise<void>;
    updateUserPassword(id: number, password: string): Promise<void>;
    toggleUserStatus(id: number, isActive: boolean): Promise<void>;
    getAllUsers(includeDeleted?: boolean): Promise<User[]>;
    deleteUser(id: number): Promise<void>;
    softDeleteUser(id: number): Promise<void>;

    // Task operations
    createTask(task: InsertTask): Promise<Task>;
    getTaskById(id: number): Promise<Task | null>;
    getTasksByUserId(userId: number): Promise<Task[]>;
    getTasksByAssignedBy(assignedBy: number): Promise<Task[]>;
    getTasksByCompanyId(companyId: number): Promise<Task[]>;
    getAllTasks(): Promise<Task[]>;
    updateTaskStatus(id: number, status: string): Promise<void>;
    updateTask(id: number, updates: Partial<InsertTask>): Promise<void>;
    deleteTask(id: number): Promise<void>;

    // Report operations
    createReport(report: InsertReport): Promise<Report>;
    getReportsByUserId(userId: number): Promise<Report[]>;
    getReportsByUserAndDate(
        userId: number,
        startDate: Date,
        endDate: Date
    ): Promise<Report[]>;
    getReportsByCompanyId(companyId: number): Promise<Report[]>;
    getAllReports(): Promise<Report[]>;
    getReportsByDate(startDate: Date, endDate: Date): Promise<Report[]>;

    // Message operations
    createMessage(message: InsertMessage): Promise<Message>;
    getMessagesByReceiverId(receiverId: number): Promise<Message[]>;
    getUnreadMessagesByReceiverId(receiverId: number): Promise<Message[]>;
    markMessageAsRead(id: number): Promise<void>;
    getAllMessages(): Promise<Message[]>;

    // Device token operations
    createOrUpdateDeviceToken(token: InsertDeviceToken): Promise<DeviceToken>;
    getDeviceTokensByUserId(userId: number): Promise<DeviceToken[]>;
    deleteDeviceToken(token: string): Promise<void>;

    // Rating operations
    createRating(rating: InsertRating): Promise<Rating>;
    getRatingsByUserId(userId: number): Promise<Rating[]>;
    getLatestRatingByUserId(userId: number): Promise<Rating | null>;
    getAllRatings(): Promise<Rating[]>;

    // File upload operations
    createFileUpload(file: InsertFileUpload): Promise<FileUpload>;
    getFilesByUserId(userId: number): Promise<FileUpload[]>;
    getFilesByReportId(reportId: number): Promise<FileUpload[]>;
    getAllFiles(): Promise<FileUpload[]>;

    // Archive operations
    archiveReports(month: number, year: number): Promise<void>;
    getArchivedReports(userId?: number): Promise<ArchiveReport[]>;

    // Group message operations
    createGroupMessage(message: InsertGroupMessage): Promise<GroupMessage>;
    getGroupMessageById(id: number): Promise<GroupMessage | null>;
    getAllGroupMessages(): Promise<GroupMessage[]>;
    getGroupMessagesByCompanyId(companyId: number): Promise<GroupMessage[]>;
    getRecentGroupMessages(limit: number): Promise<GroupMessage[]>;

    // Group message reply operations
    createGroupMessageReply(
        reply: InsertGroupMessageReply
    ): Promise<GroupMessageReply>;
    getGroupMessageReplies(
        groupMessageId: number
    ): Promise<GroupMessageReply[]>;

    // Task time log operations
    getTaskTimeLog(
        taskId: number,
        userId: number,
        date: string
    ): Promise<TaskTimeLog | null>;
    createOrUpdateTaskTimeLog(log: InsertTaskTimeLog): Promise<TaskTimeLog>;
    startTaskTimer(
        taskId: number,
        userId: number,
        date: string
    ): Promise<TaskTimeLog>;
    pauseTaskTimer(
        taskId: number,
        userId: number,
        date: string
    ): Promise<TaskTimeLog>;
    completeTaskTimer(
        taskId: number,
        userId: number,
        date: string
    ): Promise<TaskTimeLog>;
    getTaskTimeLogs(taskId: number, userId: number): Promise<TaskTimeLog[]>;

    // Feedback operations
    createFeedback(feedback: InsertFeedback): Promise<Feedback>;
    getAllFeedbacks(): Promise<Feedback[]>;
    getFeedbacksByUserId(userId: number): Promise<Feedback[]>;
    getFeedbacksByCompanyId(companyId: number): Promise<Feedback[]>;
    getFeedbackById(id: number): Promise<Feedback | null>;
    respondToFeedback(id: number, adminResponse: string): Promise<void>;

    // Slot pricing operations
    createOrUpdateSlotPricing(pricing: InsertSlotPricing): Promise<SlotPricing>;
    getAllSlotPricing(): Promise<SlotPricing[]>;
    getSlotPricingByType(slotType: string): Promise<SlotPricing | null>;

    // Company payment operations
    createCompanyPayment(
        payment: InsertCompanyPayment
    ): Promise<CompanyPayment>;
    getPaymentsByCompanyId(companyId: number): Promise<CompanyPayment[]>;
    getAllCompanyPayments(): Promise<CompanyPayment[]>;
    getPaymentById(id: number): Promise<CompanyPayment | null>;
    updatePaymentStatus(
        id: number,
        updates: { paymentStatus: string; transactionId?: string }
    ): Promise<void>;
    updatePaymentStripeId(
        id: number,
        stripePaymentIntentId: string
    ): Promise<void>;
    completePaymentWithSlots(
        paymentId: number,
        companyId: number,
        receiptNumber: string,
        transactionId: string,
        slotUpdates: { maxAdmins?: number; maxMembers?: number }
    ): Promise<CompanyPayment | null>;
    updatePaymentEmailStatus(id: number, emailSent: boolean): Promise<void>;

    // Password reset operations
    createPasswordResetToken(
        email: string,
        token: string,
        expiresAt: Date
    ): Promise<PasswordResetToken>;
    getPasswordResetToken(token: string): Promise<PasswordResetToken | null>;
    markTokenAsUsed(token: string): Promise<void>;

    // Dashboard stats
    getDashboardStats(companyId?: number): Promise<{
        totalUsers: number;
        todayReports: number;
        pendingTasks: number;
        completedTasks: number;
        totalFiles: number;
    }>;

    // Admin activity log operations
    createAdminActivityLog(
        log: InsertAdminActivityLog
    ): Promise<AdminActivityLog>;
    getAllAdminActivityLogs(limit?: number): Promise<AdminActivityLog[]>;
    getAdminActivityLogsByCompany(
        companyId: number
    ): Promise<AdminActivityLog[]>;
    getAdminActivityLogsByUser(userId: number): Promise<AdminActivityLog[]>;

    // Super Admin analytics
    getSuperAdminAnalytics(): Promise<{
        totalCompanies: number;
        activeCompanies: number;
        suspendedCompanies: number;
        totalUsers: number;
        totalAdmins: number;
        totalMembers: number;
        totalTasks: number;
        totalPayments: number;
        totalRevenue: number;
        recentPayments: CompanyPayment[];
    }>;

    getCompanyWithStats(companyId: number): Promise<{
        company: Company;
        userCount: number;
        adminCount: number;
        memberCount: number;
        taskCount: number;
        totalPayments: number;
        totalRevenue: number;
    } | null>;

    getAllCompaniesWithStats(): Promise<
        Array<{
            company: Company;
            userCount: number;
            adminCount: number;
            memberCount: number;
        }>
    >;

    suspendCompany(companyId: number, performedBy: number): Promise<void>;
    reactivateCompany(companyId: number, performedBy: number): Promise<void>;

    // Enhanced payment tracking
    getPaymentsByDateRange(
        startDate: Date,
        endDate: Date
    ): Promise<CompanyPayment[]>;
    getPaymentsByStatus(status: string): Promise<CompanyPayment[]>;

    // Badge operations
    createBadge(badge: InsertBadge): Promise<Badge>;
    getAllBadges(): Promise<Badge[]>;
    getBadgeById(id: number): Promise<Badge | null>;

    // Auto task operations
    createAutoTask(task: InsertAutoTask): Promise<AutoTask>;
    getRecentAutoTasks(limit: number): Promise<AutoTask[]>;

    // Leave operations
    createLeave(leave: InsertLeave): Promise<Leave>;
    getLeavesByUserId(userId: number): Promise<Leave[]>;
    getLeavesByCompanyId(companyId: number): Promise<Leave[]>;
    getLeavesByUserIds(userIds: number[]): Promise<Leave[]>;
    getPendingLeaves(companyId: number): Promise<Leave[]>;
    updateLeaveStatus(
        leaveId: number,
        status: string,
        approvedBy: number,
        remarks?: string
    ): Promise<void>;
    getLeaveById(id: number): Promise<Leave | null>;

    // Holiday operations
    createHoliday(holiday: InsertHoliday): Promise<Holiday>;
    getHolidaysByCompanyId(companyId: number): Promise<Holiday[]>;
    getHolidayByDate(companyId: number, date: string): Promise<Holiday | null>;
    deleteHoliday(id: number): Promise<void>;
    updateHoliday(id: number, updates: Partial<InsertHoliday>): Promise<void>;

    // Tasks report operations
    createTasksReport(report: InsertTasksReport): Promise<TasksReport>;
    getTasksReportByDate(
        userId: number,
        date: string
    ): Promise<TasksReport | null>;
    getTasksReportsByUserId(userId: number): Promise<TasksReport[]>;

    // NEW ATTENDANCE SYSTEM - Shift Management
    createShift(shift: InsertShift): Promise<Shift>;
    getShiftsByCompany(companyId: number): Promise<Shift[]>;
    getShiftById(id: number): Promise<Shift | null>;

    // NEW ATTENDANCE SYSTEM - Policy Management
    createOrUpdateAttendancePolicy(
        policy: InsertAttendancePolicy
    ): Promise<AttendancePolicy>;
    getAttendancePolicyByCompany(
        companyId: number
    ): Promise<AttendancePolicy | null>;

    // NEW ATTENDANCE SYSTEM - Attendance Records
    createAttendanceRecord(
        record: InsertAttendanceRecord
    ): Promise<AttendanceRecord>;
    updateAttendanceRecord(
        id: number,
        updates: Partial<InsertAttendanceRecord>
    ): Promise<AttendanceRecord>;
    getAttendanceById(id: number): Promise<AttendanceRecord | null>;
    getAttendanceByUserAndDate(
        userId: number,
        date: string
    ): Promise<AttendanceRecord | null>;
    getAttendanceHistory(
        userId: number,
        startDate: string,
        endDate: string
    ): Promise<AttendanceRecord[]>;
    getDailyAttendance(
        companyId: number,
        date: string
    ): Promise<DailyAttendanceRecord[]>;
    getMonthlyAttendanceSummary(
        userId: number,
        month: number,
        year: number
    ): Promise<{
        totalDays: number;
        presentDays: number;
        lateDays: number;
        absentDays: number;
        totalHours: number;
    }>;
    getAttendanceReport(
        companyId: number,
        startDate: string,
        endDate: string,
        type: string
    ): Promise<any>;

    // NEW ATTENDANCE SYSTEM - Correction Requests
    createCorrectionRequest(
        request: InsertCorrectionRequest
    ): Promise<CorrectionRequest>;
    updateCorrectionRequest(
        id: number,
        updates: Partial<InsertCorrectionRequest>
    ): Promise<CorrectionRequest>;
    getCorrectionRequestById(id: number): Promise<CorrectionRequest | null>;
    getCorrectionRequestsByUser(userId: number): Promise<CorrectionRequest[]>;
    getPendingCorrectionRequests(
        companyId: number
    ): Promise<CorrectionRequest[]>;

    // NEW ATTENDANCE SYSTEM - Rewards
    createReward(reward: InsertReward): Promise<Reward>;
    getRewardsByUser(userId: number): Promise<Reward[]>;

    // NEW ATTENDANCE SYSTEM - Attendance Logs (Audit Trail)
    createAttendanceLog(log: InsertAttendanceLog): Promise<AttendanceLog>;

    // Team Assignment operations
    createTeamAssignment(
        assignment: InsertTeamAssignment
    ): Promise<TeamAssignment>;
    removeTeamAssignment(teamLeaderId: number, memberId: number): Promise<void>;
    getTeamMembersByLeader(teamLeaderId: number): Promise<User[]>;
    getTeamLeaderByMember(memberId: number): Promise<User | null>;
    getAllTeamAssignments(companyId: number): Promise<TeamAssignment[]>;
    getTeamAssignmentsByMemberId(memberId: number): Promise<TeamAssignment[]>;

    // CRM - Enquiry operations
    createEnquiry(enquiry: InsertEnquiry): Promise<Enquiry>;
    getEnquiryById(id: number): Promise<Enquiry | null>;
    getEnquiriesByCompanyId(companyId: number): Promise<Enquiry[]>;
    updateEnquiry(id: number, updates: Partial<InsertEnquiry>): Promise<void>;
    deleteEnquiry(id: number): Promise<void>;
    getEnquiryStats(companyId: number): Promise<{
        totalEnquiries: number;
        monthEnquiries: number;
        totalSales: number;
        monthSales: number;
        todayFollowups: number;
        totalDrops: number;
    }>;

    // CRM - Followup operations
    createFollowup(followup: InsertFollowup): Promise<Followup>;
    getFollowupsByEnquiryId(enquiryId: number): Promise<Followup[]>;
    getFollowupsByCompanyId(companyId: number): Promise<Followup[]>;
    updateFollowup(id: number, updates: Partial<InsertFollowup>): Promise<void>;
    deleteFollowup(id: number): Promise<void>;
}

export class DbStorage implements IStorage {
    async createCompany(company: InsertCompany): Promise<Company> {
        const maxAttempts = 10;

        for (let attempt = 0; attempt < maxAttempts; attempt++) {
            try {
                return await db.transaction(async (tx) => {
                    const latestCompany = await tx
                        .select({ serverId: companies.serverId })
                        .from(companies)
                        .orderBy(desc(companies.id))
                        .limit(1);

                    let nextNumber = 10001;

                    if (latestCompany.length > 0 && latestCompany[0].serverId) {
                        const match =
                            latestCompany[0].serverId.match(/CMP-(\d+)/);
                        if (match) {
                            nextNumber = parseInt(match[1], 10) + 1;
                        }
                    }

                    const serverId = `CMP-${(nextNumber + attempt)
                        .toString()
                        .padStart(5, "0")}`;

                    const result = await tx
                        .insert(companies)
                        .values({ ...company, serverId })
                        .returning();

                    return result[0];
                });
            } catch (error: any) {
                if (error.code === "23505" && attempt < maxAttempts - 1) {
                    continue;
                }
                throw error;
            }
        }

        throw new Error(
            "Failed to generate unique company server ID after multiple attempts"
        );
    }

    async getCompanyById(id: number): Promise<Company | null> {
        const result = await db
            .select()
            .from(companies)
            .where(eq(companies.id, id))
            .limit(1);
        return result[0] || null;
    }

    async getCompanyByServerId(serverId: string): Promise<Company | null> {
        const result = await db
            .select()
            .from(companies)
            .where(eq(companies.serverId, serverId))
            .limit(1);
        return result[0] || null;
    }

    async getCompanyByEmail(email: string): Promise<Company | null> {
        const result = await db
            .select()
            .from(companies)
            .where(eq(companies.email, email))
            .limit(1);
        return result[0] || null;
    }

    async getCompanyByVerificationToken(
        token: string
    ): Promise<Company | null> {
        console.log(
            `[STORAGE] Looking up company by verification token: ${token.substring(
                0,
                20
            )}...`
        );
        const result = await db
            .select()
            .from(companies)
            .where(eq(companies.verificationToken, token))
            .limit(1);
        console.log(
            `[STORAGE] Found ${result.length} company(ies) with this token`
        );
        if (result[0]) {
            console.log(
                `[STORAGE] Company found: ${result[0].serverId}, emailVerified: ${result[0].emailVerified}`
            );
        }
        return result[0] || null;
    }

    async verifyCompanyEmail(token: string): Promise<Company | null> {
        const company = await this.getCompanyByVerificationToken(token);
        if (!company) {
            console.log("[STORAGE] No company found with verification token");
            return null;
        }

        console.log(
            `[STORAGE] Token expiry: ${
                company.verificationTokenExpiry
            }, Current time: ${new Date()}`
        );
        if (
            company.verificationTokenExpiry &&
            company.verificationTokenExpiry < new Date()
        ) {
            console.log("[STORAGE] Verification token has expired");
            return null;
        }

        console.log(
            `[STORAGE] Updating company ${company.serverId} to verified`
        );
        await db
            .update(companies)
            .set({
                emailVerified: true,
                verificationToken: null,
                verificationTokenExpiry: null,
                updatedAt: new Date(),
            })
            .where(eq(companies.id, company.id));

        return await this.getCompanyById(company.id);
    }

    async getAllCompanies(): Promise<Company[]> {
        return await db
            .select()
            .from(companies)
            .where(eq(companies.isActive, true));
    }

    async updateCompany(
        id: number,
        updates: Partial<InsertCompany>
    ): Promise<void> {
        await db.update(companies).set(updates).where(eq(companies.id, id));
    }

    async incrementCompanySlots(
        id: number,
        updates: { maxAdmins?: number; maxMembers?: number }
    ): Promise<void> {
        const company = await this.getCompanyById(id);
        if (!company) {
            throw new Error("Company not found");
        }

        const newMaxAdmins = updates.maxAdmins
            ? company.maxAdmins + updates.maxAdmins
            : company.maxAdmins;
        const newMaxMembers = updates.maxMembers
            ? company.maxMembers + updates.maxMembers
            : company.maxMembers;

        await db
            .update(companies)
            .set({
                maxAdmins: newMaxAdmins,
                maxMembers: newMaxMembers,
                updatedAt: new Date(),
            })
            .where(eq(companies.id, id));
    }

    async deleteCompany(id: number): Promise<void> {
        const companyUsers = await db
            .select()
            .from(users)
            .where(eq(users.companyId, id));
        const userIds = companyUsers.map((u) => u.id);
        const companyTasks = await db
            .select()
            .from(tasks)
            .where(eq(tasks.companyId, id));
        const taskIds = companyTasks.map((t) => t.id);

        if (taskIds.length > 0) {
            await db
                .delete(taskTimeLogs)
                .where(inArray(taskTimeLogs.taskId, taskIds));
        }

        if (userIds.length > 0) {
            await db
                .delete(messages)
                .where(
                    or(
                        inArray(messages.senderId, userIds),
                        inArray(messages.receiverId, userIds)
                    )
                );
            await db
                .delete(ratings)
                .where(
                    or(
                        inArray(ratings.userId, userIds),
                        inArray(ratings.ratedBy, userIds)
                    )
                );
            await db
                .delete(fileUploads)
                .where(inArray(fileUploads.userId, userIds));
            await db
                .delete(feedbacks)
                .where(inArray(feedbacks.submittedBy, userIds));
            await db
                .delete(archiveReports)
                .where(inArray(archiveReports.userId, userIds));

            const userEmails = companyUsers.map((u) => u.email);
            if (userEmails.length > 0) {
                await db
                    .delete(passwordResetTokens)
                    .where(inArray(passwordResetTokens.email, userEmails));
            }
        }

        await db.delete(groupMessages).where(eq(groupMessages.companyId, id));
        await db.delete(reports).where(eq(reports.companyId, id));
        await db.delete(tasks).where(eq(tasks.companyId, id));
        await db
            .delete(companyPayments)
            .where(eq(companyPayments.companyId, id));
        await db.delete(users).where(eq(users.companyId, id));
        await db.delete(companies).where(eq(companies.id, id));
    }

    async getUsersByCompanyId(companyId: number): Promise<User[]> {
        return await db
            .select()
            .from(users)
            .where(
                and(eq(users.companyId, companyId), eq(users.isActive, true))
            );
    }

    async getUserByEmail(email: string): Promise<User | null> {
        const result = await db
            .select()
            .from(users)
            .where(eq(users.email, email))
            .limit(1);
        return result[0] || null;
    }

    async getUserById(id: number): Promise<User | null> {
        const result = await db
            .select()
            .from(users)
            .where(eq(users.id, id))
            .limit(1);
        return result[0] || null;
    }

    async getUserByFirebaseUid(uid: string): Promise<User | null> {
        const result = await db
            .select()
            .from(users)
            .where(eq(users.firebaseUid, uid))
            .limit(1);
        return result[0] || null;
    }

    async getUserByUniqueUserId(uniqueUserId: string): Promise<User | null> {
        const result = await db
            .select()
            .from(users)
            .where(eq(users.uniqueUserId, uniqueUserId))
            .limit(1);
        return result[0] || null;
    }

    async getUserByDisplayName(displayName: string): Promise<User | null> {
        const result = await db
            .select()
            .from(users)
            .where(eq(users.displayName, displayName))
            .limit(1);
        return result[0] || null;
    }

    async createUser(user: InsertUser): Promise<User> {
        const prefix = user.role === "team_leader" ? "TEAM" : "USER";
        const uniqueUserId = generateUniqueId(prefix);
        const result = await db
            .insert(users)
            .values({ ...user, uniqueUserId })
            .returning();
        return result[0];
    }

    async updateUserRole(id: number, role: string): Promise<void> {
        await db.update(users).set({ role }).where(eq(users.id, id));
    }

    async updateUserPassword(id: number, password: string): Promise<void> {
        await db.update(users).set({ password }).where(eq(users.id, id));
    }

    async toggleUserStatus(id: number, isActive: boolean): Promise<void> {
        await db.update(users).set({ isActive }).where(eq(users.id, id));
    }

    async getAllUsers(includeDeleted: boolean = false): Promise<User[]> {
        if (includeDeleted) {
            return await db.select().from(users);
        }
        return await db.select().from(users).where(eq(users.isActive, true));
    }

    async deleteUser(id: number): Promise<void> {
        await db.delete(users).where(eq(users.id, id));
    }

    async softDeleteUser(id: number): Promise<void> {
        await db
            .update(users)
            .set({
                isActive: false,
                deletedAt: new Date(),
            })
            .where(eq(users.id, id));
    }

    async createTask(task: InsertTask): Promise<Task> {
        const result = await db.insert(tasks).values(task).returning();
        return result[0];
    }

    async getTaskById(id: number): Promise<Task | null> {
        const result = await db
            .select()
            .from(tasks)
            .where(eq(tasks.id, id))
            .limit(1);
        return result[0] || null;
    }

    async getTasksByUserId(userId: number): Promise<Task[]> {
        return await db
            .select()
            .from(tasks)
            .where(eq(tasks.assignedTo, userId))
            .orderBy(desc(tasks.createdAt));
    }

    async getTasksByAssignedBy(assignedBy: number): Promise<Task[]> {
        return await db
            .select()
            .from(tasks)
            .where(eq(tasks.assignedBy, assignedBy))
            .orderBy(desc(tasks.createdAt));
    }

    async getTasksByCompanyId(companyId: number): Promise<Task[]> {
        return await db
            .select()
            .from(tasks)
            .where(eq(tasks.companyId, companyId))
            .orderBy(desc(tasks.createdAt));
    }

    async getAllTasks(): Promise<Task[]> {
        return await db.select().from(tasks).orderBy(desc(tasks.createdAt));
    }

    async updateTaskStatus(id: number, status: string): Promise<void> {
        await db
            .update(tasks)
            .set({ status, updatedAt: new Date() })
            .where(eq(tasks.id, id));
    }

    async updateTask(id: number, updates: Partial<InsertTask>): Promise<void> {
        await db
            .update(tasks)
            .set({ ...updates, updatedAt: new Date() })
            .where(eq(tasks.id, id));
    }

    async deleteTask(id: number): Promise<void> {
        // Clear any messages that reference this task first
        await db
            .update(messages)
            .set({ relatedTaskId: null })
            .where(eq(messages.relatedTaskId, id));

        // Delete any task time logs for this task
        await db.delete(taskTimeLogs).where(eq(taskTimeLogs.taskId, id));

        await db.delete(tasks).where(eq(tasks.id, id));
    }

    async createReport(report: InsertReport): Promise<Report> {
        const result = await db.insert(reports).values(report).returning();
        return result[0];
    }

    async getReportsByUserId(userId: number): Promise<Report[]> {
        return await db
            .select()
            .from(reports)
            .where(eq(reports.userId, userId))
            .orderBy(desc(reports.createdAt));
    }

    async getReportsByUserAndDate(
        userId: number,
        startDate: Date,
        endDate: Date
    ): Promise<Report[]> {
        return await db
            .select()
            .from(reports)
            .where(
                and(
                    eq(reports.userId, userId),
                    gte(reports.createdAt, startDate),
                    lte(reports.createdAt, endDate)
                )
            )
            .orderBy(desc(reports.createdAt));
    }

    async getReportsByCompanyId(companyId: number): Promise<Report[]> {
        return await db
            .select()
            .from(reports)
            .where(eq(reports.companyId, companyId))
            .orderBy(desc(reports.createdAt));
    }

    async getAllReports(): Promise<Report[]> {
        return await db.select().from(reports).orderBy(desc(reports.createdAt));
    }

    async getReportsByDate(startDate: Date, endDate: Date): Promise<Report[]> {
        return await db
            .select()
            .from(reports)
            .where(
                and(
                    gte(reports.createdAt, startDate),
                    lte(reports.createdAt, endDate)
                )
            )
            .orderBy(desc(reports.createdAt));
    }

    async createMessage(message: InsertMessage): Promise<Message> {
        const result = await db.insert(messages).values(message).returning();
        return result[0];
    }

    async getMessagesByReceiverId(receiverId: number): Promise<Message[]> {
        return await db
            .select()
            .from(messages)
            .where(eq(messages.receiverId, receiverId))
            .orderBy(desc(messages.createdAt));
    }

    async getUnreadMessagesByReceiverId(
        receiverId: number
    ): Promise<Message[]> {
        return await db
            .select()
            .from(messages)
            .where(
                and(
                    eq(messages.receiverId, receiverId),
                    eq(messages.readStatus, false)
                )
            )
            .orderBy(desc(messages.createdAt));
    }

    async markMessageAsRead(id: number): Promise<void> {
        await db
            .update(messages)
            .set({ readStatus: true })
            .where(eq(messages.id, id));
    }

    async getAllMessages(): Promise<Message[]> {
        return await db
            .select()
            .from(messages)
            .orderBy(desc(messages.createdAt));
    }

    async createOrUpdateDeviceToken(
        tokenData: InsertDeviceToken
    ): Promise<DeviceToken> {
        const existing = await db
            .select()
            .from(deviceTokens)
            .where(eq(deviceTokens.token, tokenData.token))
            .limit(1);

        if (existing.length > 0) {
            await db
                .update(deviceTokens)
                .set({ ...tokenData, updatedAt: new Date() })
                .where(eq(deviceTokens.token, tokenData.token));

            const result = await db
                .select()
                .from(deviceTokens)
                .where(eq(deviceTokens.token, tokenData.token))
                .limit(1);
            return result[0];
        }

        const result = await db
            .insert(deviceTokens)
            .values(tokenData)
            .returning();
        return result[0];
    }

    async getDeviceTokensByUserId(userId: number): Promise<DeviceToken[]> {
        return await db
            .select()
            .from(deviceTokens)
            .where(eq(deviceTokens.userId, userId));
    }

    async deleteDeviceToken(token: string): Promise<void> {
        await db.delete(deviceTokens).where(eq(deviceTokens.token, token));
    }

    async createRating(rating: InsertRating): Promise<Rating> {
        const result = await db.insert(ratings).values(rating).returning();
        return result[0];
    }

    async getRatingsByUserId(userId: number): Promise<Rating[]> {
        return await db
            .select()
            .from(ratings)
            .where(eq(ratings.userId, userId))
            .orderBy(desc(ratings.createdAt));
    }

    async getLatestRatingByUserId(userId: number): Promise<Rating | null> {
        const result = await db
            .select()
            .from(ratings)
            .where(eq(ratings.userId, userId))
            .orderBy(desc(ratings.createdAt))
            .limit(1);
        return result[0] || null;
    }

    async getAllRatings(): Promise<Rating[]> {
        return await db.select().from(ratings).orderBy(desc(ratings.createdAt));
    }

    async createFileUpload(file: InsertFileUpload): Promise<FileUpload> {
        const result = await db.insert(fileUploads).values(file).returning();
        return result[0];
    }

    async getFilesByUserId(userId: number): Promise<FileUpload[]> {
        return await db
            .select()
            .from(fileUploads)
            .where(eq(fileUploads.userId, userId))
            .orderBy(desc(fileUploads.uploadedAt));
    }

    async getFilesByReportId(reportId: number): Promise<FileUpload[]> {
        return await db
            .select()
            .from(fileUploads)
            .where(eq(fileUploads.reportId, reportId))
            .orderBy(desc(fileUploads.uploadedAt));
    }

    async getAllFiles(): Promise<FileUpload[]> {
        return await db
            .select()
            .from(fileUploads)
            .orderBy(desc(fileUploads.uploadedAt));
    }

    async archiveReports(month: number, year: number): Promise<void> {
        const startDate = new Date(year, month - 1, 1);
        const endDate = new Date(year, month, 0, 23, 59, 59);

        const reportsToArchive = await db
            .select()
            .from(reports)
            .where(
                and(
                    gte(reports.createdAt, startDate),
                    lte(reports.createdAt, endDate)
                )
            );

        if (reportsToArchive.length > 0) {
            const archiveData = reportsToArchive.map((report) => ({
                userId: report.userId,
                reportType: report.reportType,
                plannedTasks: report.plannedTasks,
                completedTasks: report.completedTasks,
                pendingTasks: report.pendingTasks,
                notes: report.notes,
                originalDate: report.createdAt,
            }));

            await db.insert(archiveReports).values(archiveData);
            await db
                .delete(reports)
                .where(
                    and(
                        gte(reports.createdAt, startDate),
                        lte(reports.createdAt, endDate)
                    )
                );
        }
    }

    async getArchivedReports(userId?: number): Promise<ArchiveReport[]> {
        if (userId) {
            return await db
                .select()
                .from(archiveReports)
                .where(eq(archiveReports.userId, userId))
                .orderBy(desc(archiveReports.originalDate));
        }
        return await db
            .select()
            .from(archiveReports)
            .orderBy(desc(archiveReports.originalDate));
    }

    async createGroupMessage(
        message: InsertGroupMessage
    ): Promise<GroupMessage> {
        const result = await db
            .insert(groupMessages)
            .values(message)
            .returning();
        return result[0];
    }

    async getGroupMessageById(id: number): Promise<GroupMessage | null> {
        const result = await db
            .select()
            .from(groupMessages)
            .where(eq(groupMessages.id, id))
            .limit(1);
        return result[0] || null;
    }

    async getAllGroupMessages(): Promise<GroupMessage[]> {
        return await db
            .select()
            .from(groupMessages)
            .orderBy(desc(groupMessages.createdAt));
    }

    async getGroupMessagesByCompanyId(
        companyId: number
    ): Promise<GroupMessage[]> {
        return await db
            .select()
            .from(groupMessages)
            .where(eq(groupMessages.companyId, companyId))
            .orderBy(desc(groupMessages.createdAt));
    }

    async getRecentGroupMessages(limit: number): Promise<GroupMessage[]> {
        return await db
            .select()
            .from(groupMessages)
            .orderBy(desc(groupMessages.createdAt))
            .limit(limit);
    }

    async createGroupMessageReply(
        reply: InsertGroupMessageReply
    ): Promise<GroupMessageReply> {
        const result = await db
            .insert(groupMessageReplies)
            .values(reply)
            .returning();
        return result[0];
    }

    async getGroupMessageReplies(
        groupMessageId: number
    ): Promise<GroupMessageReply[]> {
        return await db
            .select()
            .from(groupMessageReplies)
            .where(eq(groupMessageReplies.groupMessageId, groupMessageId))
            .orderBy(groupMessageReplies.createdAt);
    }

    async getTaskTimeLog(
        taskId: number,
        userId: number,
        date: string
    ): Promise<TaskTimeLog | null> {
        const result = await db
            .select()
            .from(taskTimeLogs)
            .where(
                and(
                    eq(taskTimeLogs.taskId, taskId),
                    eq(taskTimeLogs.userId, userId),
                    eq(taskTimeLogs.date, date)
                )
            )
            .limit(1);
        return result[0] || null;
    }

    async createOrUpdateTaskTimeLog(
        log: InsertTaskTimeLog
    ): Promise<TaskTimeLog> {
        const existing = await this.getTaskTimeLog(
            log.taskId,
            log.userId,
            log.date
        );

        if (existing) {
            const result = await db
                .update(taskTimeLogs)
                .set({
                    totalSeconds: log.totalSeconds,
                    timerStartedAt: log.timerStartedAt,
                    timerStatus: log.timerStatus,
                    updatedAt: new Date(),
                })
                .where(
                    and(
                        eq(taskTimeLogs.taskId, log.taskId),
                        eq(taskTimeLogs.userId, log.userId),
                        eq(taskTimeLogs.date, log.date)
                    )
                )
                .returning();
            return result[0];
        } else {
            const result = await db
                .insert(taskTimeLogs)
                .values(log)
                .returning();
            return result[0];
        }
    }

    async startTaskTimer(
        taskId: number,
        userId: number,
        date: string
    ): Promise<TaskTimeLog> {
        const existing = await this.getTaskTimeLog(taskId, userId, date);

        const log: InsertTaskTimeLog = {
            taskId,
            userId,
            date,
            totalSeconds: existing?.totalSeconds || 0,
            timerStartedAt: new Date(),
            timerStatus: "running",
        };

        return await this.createOrUpdateTaskTimeLog(log);
    }

    async pauseTaskTimer(
        taskId: number,
        userId: number,
        date: string
    ): Promise<TaskTimeLog> {
        const existing = await this.getTaskTimeLog(taskId, userId, date);

        if (!existing || !existing.timerStartedAt) {
            throw new Error("Timer not running");
        }

        const elapsedSeconds = Math.floor(
            (Date.now() - new Date(existing.timerStartedAt).getTime()) / 1000
        );

        const log: InsertTaskTimeLog = {
            taskId,
            userId,
            date,
            totalSeconds: existing.totalSeconds + elapsedSeconds,
            timerStartedAt: null,
            timerStatus: "paused",
        };

        return await this.createOrUpdateTaskTimeLog(log);
    }

    async completeTaskTimer(
        taskId: number,
        userId: number,
        date: string
    ): Promise<TaskTimeLog> {
        const existing = await this.getTaskTimeLog(taskId, userId, date);

        let totalSeconds = existing?.totalSeconds || 0;

        if (existing?.timerStartedAt) {
            const elapsedSeconds = Math.floor(
                (Date.now() - new Date(existing.timerStartedAt).getTime()) /
                    1000
            );
            totalSeconds += elapsedSeconds;
        }

        const log: InsertTaskTimeLog = {
            taskId,
            userId,
            date,
            totalSeconds,
            timerStartedAt: null,
            timerStatus: "completed",
        };

        return await this.createOrUpdateTaskTimeLog(log);
    }

    async getTaskTimeLogs(
        taskId: number,
        userId: number
    ): Promise<TaskTimeLog[]> {
        return await db
            .select()
            .from(taskTimeLogs)
            .where(
                and(
                    eq(taskTimeLogs.taskId, taskId),
                    eq(taskTimeLogs.userId, userId)
                )
            )
            .orderBy(desc(taskTimeLogs.date));
    }

    async createFeedback(feedback: InsertFeedback): Promise<Feedback> {
        const result = await db.insert(feedbacks).values(feedback).returning();
        return result[0];
    }

    async getAllFeedbacks(): Promise<Feedback[]> {
        return await db
            .select()
            .from(feedbacks)
            .orderBy(desc(feedbacks.createdAt));
    }

    async getFeedbacksByUserId(userId: number): Promise<Feedback[]> {
        return await db
            .select()
            .from(feedbacks)
            .where(eq(feedbacks.submittedBy, userId))
            .orderBy(desc(feedbacks.createdAt));
    }

    async getFeedbacksByCompanyId(companyId: number): Promise<Feedback[]> {
        return await db
            .select()
            .from(feedbacks)
            .where(eq(feedbacks.companyId, companyId))
            .orderBy(desc(feedbacks.createdAt));
    }

    async getFeedbackById(id: number): Promise<Feedback | null> {
        const result = await db
            .select()
            .from(feedbacks)
            .where(eq(feedbacks.id, id))
            .limit(1);
        return result[0] || null;
    }

    async respondToFeedback(id: number, adminResponse: string): Promise<void> {
        await db
            .update(feedbacks)
            .set({ adminResponse, respondedAt: new Date() })
            .where(eq(feedbacks.id, id));
    }

    async createOrUpdateSlotPricing(
        pricing: InsertSlotPricing
    ): Promise<SlotPricing> {
        const existing = await this.getSlotPricingByType(pricing.slotType);

        if (existing) {
            await db
                .update(slotPricing)
                .set({ ...pricing, updatedAt: new Date() })
                .where(eq(slotPricing.slotType, pricing.slotType));

            return (await this.getSlotPricingByType(pricing.slotType))!;
        } else {
            const result = await db
                .insert(slotPricing)
                .values(pricing)
                .returning();
            return result[0];
        }
    }

    async getAllSlotPricing(): Promise<SlotPricing[]> {
        return await db.select().from(slotPricing);
    }

    async getSlotPricingByType(slotType: string): Promise<SlotPricing | null> {
        const result = await db
            .select()
            .from(slotPricing)
            .where(eq(slotPricing.slotType, slotType))
            .limit(1);
        return result[0] || null;
    }

    async createCompanyPayment(
        payment: InsertCompanyPayment
    ): Promise<CompanyPayment> {
        const result = await db
            .insert(companyPayments)
            .values(payment)
            .returning();
        return result[0];
    }

    async getPaymentsByCompanyId(companyId: number): Promise<CompanyPayment[]> {
        return await db
            .select()
            .from(companyPayments)
            .where(eq(companyPayments.companyId, companyId))
            .orderBy(desc(companyPayments.createdAt));
    }

    async getAllCompanyPayments(): Promise<CompanyPayment[]> {
        return await db
            .select()
            .from(companyPayments)
            .orderBy(desc(companyPayments.createdAt));
    }

    async getPaymentById(id: number): Promise<CompanyPayment | null> {
        const result = await db
            .select()
            .from(companyPayments)
            .where(eq(companyPayments.id, id))
            .limit(1);
        return result[0] || null;
    }

    async updatePaymentStatus(
        id: number,
        updates: { paymentStatus: string; transactionId?: string }
    ): Promise<void> {
        await db
            .update(companyPayments)
            .set(updates)
            .where(eq(companyPayments.id, id));
    }

    async updatePaymentStripeId(
        id: number,
        stripePaymentIntentId: string
    ): Promise<void> {
        await db
            .update(companyPayments)
            .set({ stripePaymentIntentId })
            .where(eq(companyPayments.id, id));
    }

    async completePaymentWithSlots(
        paymentId: number,
        companyId: number,
        receiptNumber: string,
        transactionId: string,
        slotUpdates: { maxAdmins?: number; maxMembers?: number }
    ): Promise<CompanyPayment | null> {
        return await db.transaction(async (tx) => {
            // Step 1: Mark payment as paid ONLY if still pending (gate check first!)
            const result = await tx
                .update(companyPayments)
                .set({
                    paymentStatus: "paid",
                    receiptNumber,
                    transactionId,
                    emailSent: false,
                })
                .where(
                    and(
                        eq(companyPayments.id, paymentId),
                        eq(companyPayments.paymentStatus, "pending")
                    )
                )
                .returning();

            // If payment already processed, return null immediately (don't touch slots)
            if (result.length === 0) {
                return null;
            }

            // Step 2: Increment company slots ONLY if payment update succeeded
            if (slotUpdates.maxAdmins) {
                await tx
                    .update(companies)
                    .set({
                        maxAdmins: sql`${companies.maxAdmins} + ${slotUpdates.maxAdmins}`,
                    })
                    .where(eq(companies.id, companyId));
            }
            if (slotUpdates.maxMembers) {
                await tx
                    .update(companies)
                    .set({
                        maxMembers: sql`${companies.maxMembers} + ${slotUpdates.maxMembers}`,
                    })
                    .where(eq(companies.id, companyId));
            }

            return result[0];
        });
    }

    async updatePaymentEmailStatus(
        id: number,
        emailSent: boolean
    ): Promise<void> {
        await db
            .update(companyPayments)
            .set({ emailSent })
            .where(eq(companyPayments.id, id));
    }

    async createPasswordResetToken(
        email: string,
        token: string,
        expiresAt: Date
    ): Promise<PasswordResetToken> {
        const result = await db
            .insert(passwordResetTokens)
            .values({ email, token, expiresAt })
            .returning();
        return result[0];
    }

    async getPasswordResetToken(
        token: string
    ): Promise<PasswordResetToken | null> {
        const result = await db
            .select()
            .from(passwordResetTokens)
            .where(eq(passwordResetTokens.token, token))
            .limit(1);
        return result[0] || null;
    }

    async markTokenAsUsed(token: string): Promise<void> {
        await db
            .update(passwordResetTokens)
            .set({ used: true })
            .where(eq(passwordResetTokens.token, token));
    }

    async getDashboardStats(companyId?: number): Promise<{
        totalUsers: number;
        todayReports: number;
        pendingTasks: number;
        completedTasks: number;
        totalFiles: number;
    }> {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);

        const [userCount] = companyId
            ? await db
                  .select({ count: sql<number>`count(*)` })
                  .from(users)
                  .where(
                      and(
                          eq(users.companyId, companyId),
                          eq(users.isActive, true)
                      )
                  )
            : await db
                  .select({ count: sql<number>`count(*)` })
                  .from(users)
                  .where(eq(users.isActive, true));

        const [todayReportCount] = companyId
            ? await db
                  .select({ count: sql<number>`count(*)` })
                  .from(reports)
                  .where(
                      and(
                          gte(reports.createdAt, today),
                          eq(reports.companyId, companyId)
                      )
                  )
            : await db
                  .select({ count: sql<number>`count(*)` })
                  .from(reports)
                  .where(gte(reports.createdAt, today));

        const [pendingTaskCount] = companyId
            ? await db
                  .select({ count: sql<number>`count(*)` })
                  .from(tasks)
                  .where(
                      and(
                          eq(tasks.status, "pending"),
                          eq(tasks.companyId, companyId)
                      )
                  )
            : await db
                  .select({ count: sql<number>`count(*)` })
                  .from(tasks)
                  .where(eq(tasks.status, "pending"));

        const [completedTaskCount] = companyId
            ? await db
                  .select({ count: sql<number>`count(*)` })
                  .from(tasks)
                  .where(
                      and(
                          eq(tasks.status, "completed"),
                          eq(tasks.companyId, companyId)
                      )
                  )
            : await db
                  .select({ count: sql<number>`count(*)` })
                  .from(tasks)
                  .where(eq(tasks.status, "completed"));

        const [fileCount] = companyId
            ? await db
                  .select({ count: sql<number>`count(*)` })
                  .from(fileUploads)
                  .innerJoin(users, eq(fileUploads.userId, users.id))
                  .where(eq(users.companyId, companyId))
            : await db
                  .select({ count: sql<number>`count(*)` })
                  .from(fileUploads);

        return {
            totalUsers: Number(userCount.count),
            todayReports: Number(todayReportCount.count),
            pendingTasks: Number(pendingTaskCount.count),
            completedTasks: Number(completedTaskCount.count),
            totalFiles: Number(fileCount.count),
        };
    }

    async createAdminActivityLog(
        log: InsertAdminActivityLog
    ): Promise<AdminActivityLog> {
        const result = await db
            .insert(adminActivityLogs)
            .values(log)
            .returning();
        return result[0];
    }

    async getAllAdminActivityLogs(limit?: number): Promise<AdminActivityLog[]> {
        const query = db
            .select()
            .from(adminActivityLogs)
            .orderBy(desc(adminActivityLogs.createdAt));
        if (limit) {
            return await query.limit(limit);
        }
        return await query;
    }

    async getAdminActivityLogsByCompany(
        companyId: number
    ): Promise<AdminActivityLog[]> {
        return await db
            .select()
            .from(adminActivityLogs)
            .where(eq(adminActivityLogs.targetCompanyId, companyId))
            .orderBy(desc(adminActivityLogs.createdAt));
    }

    async getAdminActivityLogsByUser(
        userId: number
    ): Promise<AdminActivityLog[]> {
        return await db
            .select()
            .from(adminActivityLogs)
            .where(
                or(
                    eq(adminActivityLogs.performedBy, userId),
                    eq(adminActivityLogs.targetUserId, userId)
                )
            )
            .orderBy(desc(adminActivityLogs.createdAt));
    }

    async getSuperAdminAnalytics(): Promise<{
        totalCompanies: number;
        activeCompanies: number;
        suspendedCompanies: number;
        totalUsers: number;
        totalAdmins: number;
        totalMembers: number;
        totalTasks: number;
        totalPayments: number;
        totalRevenue: number;
        recentPayments: CompanyPayment[];
    }> {
        const [totalCompaniesResult] = await db
            .select({ count: sql<number>`count(*)` })
            .from(companies);
        const [activeCompaniesResult] = await db
            .select({ count: sql<number>`count(*)` })
            .from(companies)
            .where(eq(companies.isActive, true));
        const [suspendedCompaniesResult] = await db
            .select({ count: sql<number>`count(*)` })
            .from(companies)
            .where(eq(companies.isActive, false));
        const [totalUsersResult] = await db
            .select({ count: sql<number>`count(*)` })
            .from(users)
            .where(eq(users.isActive, true));
        const [totalAdminsResult] = await db
            .select({ count: sql<number>`count(*)` })
            .from(users)
            .where(
                and(eq(users.isActive, true), eq(users.role, "company_admin"))
            );
        const [totalMembersResult] = await db
            .select({ count: sql<number>`count(*)` })
            .from(users)
            .where(
                and(
                    eq(users.isActive, true),
                    or(
                        eq(users.role, "company_member"),
                        eq(users.role, "team_leader")
                    )
                )
            );
        const [totalTasksResult] = await db
            .select({ count: sql<number>`count(*)` })
            .from(tasks);
        const [totalPaymentsResult] = await db
            .select({ count: sql<number>`count(*)` })
            .from(companyPayments);
        const [totalRevenueResult] = await db
            .select({ total: sql<number>`COALESCE(SUM(amount), 0)` })
            .from(companyPayments)
            .where(eq(companyPayments.paymentStatus, "paid"));

        const recentPayments = await db
            .select()
            .from(companyPayments)
            .orderBy(desc(companyPayments.createdAt))
            .limit(10);

        return {
            totalCompanies: Number(totalCompaniesResult.count),
            activeCompanies: Number(activeCompaniesResult.count),
            suspendedCompanies: Number(suspendedCompaniesResult.count),
            totalUsers: Number(totalUsersResult.count),
            totalAdmins: Number(totalAdminsResult.count),
            totalMembers: Number(totalMembersResult.count),
            totalTasks: Number(totalTasksResult.count),
            totalPayments: Number(totalPaymentsResult.count),
            totalRevenue: Number(totalRevenueResult.total),
            recentPayments,
        };
    }

    async getCompanyWithStats(companyId: number): Promise<{
        company: Company;
        userCount: number;
        adminCount: number;
        memberCount: number;
        taskCount: number;
        totalPayments: number;
        totalRevenue: number;
    } | null> {
        const company = await this.getCompanyById(companyId);
        if (!company) {
            return null;
        }

        const [userCountResult] = await db
            .select({ count: sql<number>`count(*)` })
            .from(users)
            .where(
                and(eq(users.companyId, companyId), eq(users.isActive, true))
            );
        const [adminCountResult] = await db
            .select({ count: sql<number>`count(*)` })
            .from(users)
            .where(
                and(
                    eq(users.companyId, companyId),
                    eq(users.isActive, true),
                    eq(users.role, "company_admin")
                )
            );
        const [memberCountResult] = await db
            .select({ count: sql<number>`count(*)` })
            .from(users)
            .where(
                and(
                    eq(users.companyId, companyId),
                    eq(users.isActive, true),
                    or(
                        eq(users.role, "company_member"),
                        eq(users.role, "team_leader")
                    )
                )
            );
        const [taskCountResult] = await db
            .select({ count: sql<number>`count(*)` })
            .from(tasks)
            .where(eq(tasks.companyId, companyId));
        const [paymentCountResult] = await db
            .select({ count: sql<number>`count(*)` })
            .from(companyPayments)
            .where(eq(companyPayments.companyId, companyId));
        const [revenueResult] = await db
            .select({ total: sql<number>`COALESCE(SUM(amount), 0)` })
            .from(companyPayments)
            .where(
                and(
                    eq(companyPayments.companyId, companyId),
                    eq(companyPayments.paymentStatus, "paid")
                )
            );

        return {
            company,
            userCount: Number(userCountResult.count),
            adminCount: Number(adminCountResult.count),
            memberCount: Number(memberCountResult.count),
            taskCount: Number(taskCountResult.count),
            totalPayments: Number(paymentCountResult.count),
            totalRevenue: Number(revenueResult.total),
        };
    }

    async getAllCompaniesWithStats(): Promise<
        Array<{
            company: Company;
            userCount: number;
            adminCount: number;
            memberCount: number;
        }>
    > {
        const allCompanies = await db
            .select()
            .from(companies)
            .orderBy(desc(companies.createdAt));

        const companiesWithStats = await Promise.all(
            allCompanies.map(async (company) => {
                const [userCountResult] = await db
                    .select({ count: sql<number>`count(*)` })
                    .from(users)
                    .where(
                        and(
                            eq(users.companyId, company.id),
                            eq(users.isActive, true)
                        )
                    );
                const [adminCountResult] = await db
                    .select({ count: sql<number>`count(*)` })
                    .from(users)
                    .where(
                        and(
                            eq(users.companyId, company.id),
                            eq(users.isActive, true),
                            eq(users.role, "company_admin")
                        )
                    );
                const [memberCountResult] = await db
                    .select({ count: sql<number>`count(*)` })
                    .from(users)
                    .where(
                        and(
                            eq(users.companyId, company.id),
                            eq(users.isActive, true),
                            or(
                                eq(users.role, "company_member"),
                                eq(users.role, "team_leader")
                            )
                        )
                    );

                return {
                    company,
                    userCount: Number(userCountResult.count),
                    adminCount: Number(adminCountResult.count),
                    memberCount: Number(memberCountResult.count),
                };
            })
        );

        return companiesWithStats;
    }

    async suspendCompany(
        companyId: number,
        performedBy: number
    ): Promise<void> {
        await db
            .update(companies)
            .set({ isActive: false, updatedAt: new Date() })
            .where(eq(companies.id, companyId));

        await this.createAdminActivityLog({
            actionType: "suspend_company",
            performedBy,
            targetCompanyId: companyId,
            details: "Company suspended by Super Admin",
        });
    }

    async reactivateCompany(
        companyId: number,
        performedBy: number
    ): Promise<void> {
        await db
            .update(companies)
            .set({ isActive: true, updatedAt: new Date() })
            .where(eq(companies.id, companyId));

        await this.createAdminActivityLog({
            actionType: "reactivate_company",
            performedBy,
            targetCompanyId: companyId,
            details: "Company reactivated by Super Admin",
        });
    }

    async getPaymentsByDateRange(
        startDate: Date,
        endDate: Date
    ): Promise<CompanyPayment[]> {
        return await db
            .select()
            .from(companyPayments)
            .where(
                and(
                    gte(companyPayments.createdAt, startDate),
                    lte(companyPayments.createdAt, endDate)
                )
            )
            .orderBy(desc(companyPayments.createdAt));
    }

    async getPaymentsByStatus(status: string): Promise<CompanyPayment[]> {
        return await db
            .select()
            .from(companyPayments)
            .where(eq(companyPayments.paymentStatus, status))
            .orderBy(desc(companyPayments.createdAt));
    }

    async createBadge(badge: InsertBadge): Promise<Badge> {
        const result = await db.insert(badges).values(badge).returning();
        return result[0];
    }

    async getAllBadges(): Promise<Badge[]> {
        return await db.select().from(badges).orderBy(badges.name);
    }

    async getBadgeById(id: number): Promise<Badge | null> {
        const result = await db
            .select()
            .from(badges)
            .where(eq(badges.id, id))
            .limit(1);
        return result[0] || null;
    }

    async createLeave(leave: InsertLeave): Promise<Leave> {
        const result = await db.insert(leaves).values(leave).returning();
        return result[0];
    }

    async getLeavesByUserId(userId: number): Promise<any[]> {
        const results = await db
            .select()
            .from(leaves)
            .where(eq(leaves.userId, userId))
            .orderBy(desc(leaves.createdAt));

        return results.map((r) => ({
            ...r,
            appliedDate: r.createdAt,
        }));
    }

    async getLeavesByCompanyId(companyId: number): Promise<any[]> {
        const results = await db
            .select({
                id: leaves.id,
                userId: leaves.userId,
                companyId: leaves.companyId,
                leaveType: leaves.leaveType,
                startDate: leaves.startDate,
                endDate: leaves.endDate,
                reason: leaves.reason,
                status: leaves.status,
                approvedBy: leaves.approvedBy,
                remarks: leaves.remarks,
                createdAt: leaves.createdAt,
                updatedAt: leaves.updatedAt,
                userName: users.displayName,
            })
            .from(leaves)
            .leftJoin(users, eq(leaves.userId, users.id))
            .where(eq(leaves.companyId, companyId))
            .orderBy(desc(leaves.createdAt));

        return results.map((r) => ({
            ...r,
            appliedDate: r.createdAt,
        }));
    }

    async getLeavesByUserIds(userIds: number[]): Promise<any[]> {
        if (userIds.length === 0) {
            return [];
        }

        const results = await db
            .select({
                id: leaves.id,
                userId: leaves.userId,
                companyId: leaves.companyId,
                leaveType: leaves.leaveType,
                startDate: leaves.startDate,
                endDate: leaves.endDate,
                reason: leaves.reason,
                status: leaves.status,
                approvedBy: leaves.approvedBy,
                remarks: leaves.remarks,
                createdAt: leaves.createdAt,
                updatedAt: leaves.updatedAt,
                userName: users.displayName,
            })
            .from(leaves)
            .leftJoin(users, eq(leaves.userId, users.id))
            .where(inArray(leaves.userId, userIds))
            .orderBy(desc(leaves.createdAt));

        return results.map((r) => ({
            ...r,
            appliedDate: r.createdAt,
        }));
    }

    async updateLeaveStatus(
        leaveId: number,
        status: string,
        approvedBy: number,
        remarks?: string
    ): Promise<void> {
        await db
            .update(leaves)
            .set({
                status,
                approvedBy,
                remarks,
                updatedAt: new Date(),
            })
            .where(eq(leaves.id, leaveId));
    }

    async getLeaveById(id: number): Promise<Leave | null> {
        const result = await db
            .select()
            .from(leaves)
            .where(eq(leaves.id, id))
            .limit(1);
        return result[0] || null;
    }

    async createHoliday(holiday: InsertHoliday): Promise<Holiday> {
        const result = await db.insert(holidays).values(holiday).returning();
        return result[0];
    }

    async getHolidaysByCompanyId(companyId: number): Promise<Holiday[]> {
        return await db
            .select()
            .from(holidays)
            .where(eq(holidays.companyId, companyId))
            .orderBy(desc(holidays.date));
    }

    async getHolidayByDate(
        companyId: number,
        date: string
    ): Promise<Holiday | null> {
        const result = await db
            .select()
            .from(holidays)
            .where(
                and(eq(holidays.companyId, companyId), eq(holidays.date, date))
            )
            .limit(1);
        return result[0] || null;
    }

    async deleteHoliday(id: number): Promise<void> {
        await db.delete(holidays).where(eq(holidays.id, id));
    }

    async updateHoliday(
        id: number,
        updates: Partial<InsertHoliday>
    ): Promise<void> {
        await db.update(holidays).set(updates).where(eq(holidays.id, id));
    }

    async createTasksReport(report: InsertTasksReport): Promise<TasksReport> {
        const result = await db.insert(tasksReports).values(report).returning();
        return result[0];
    }

    async getTasksReportByDate(
        userId: number,
        date: string
    ): Promise<TasksReport | null> {
        const result = await db
            .select()
            .from(tasksReports)
            .where(
                and(
                    eq(tasksReports.userId, userId),
                    eq(tasksReports.date, date)
                )
            )
            .limit(1);
        return result[0] || null;
    }

    async getTasksReportsByUserId(userId: number): Promise<TasksReport[]> {
        return await db
            .select()
            .from(tasksReports)
            .where(eq(tasksReports.userId, userId))
            .orderBy(desc(tasksReports.date));
    }

    async getHolidayById(id: number): Promise<Holiday | null> {
        const result = await db
            .select()
            .from(holidays)
            .where(eq(holidays.id, id))
            .limit(1);
        return result[0] || null;
    }

    // Auto Task operations (stub)
    async createAutoTask(task: InsertAutoTask): Promise<AutoTask> {
        const result = await db.insert(autoTasks).values(task).returning();
        return result[0];
    }

    async getRecentAutoTasks(limit: number): Promise<AutoTask[]> {
        return await db
            .select()
            .from(autoTasks)
            .orderBy(desc(autoTasks.executedAt))
            .limit(limit);
    }

    async getPendingLeaves(companyId: number): Promise<Leave[]> {
        return await db
            .select()
            .from(leaves)
            .where(
                and(
                    eq(leaves.companyId, companyId),
                    eq(leaves.status, "pending")
                )
            )
            .orderBy(desc(leaves.createdAt));
    }

    // ==================== NEW ATTENDANCE SYSTEM IMPLEMENTATIONS ====================

    // Shift Management
    async createShift(shift: InsertShift): Promise<Shift> {
        const result = await db.insert(shifts).values(shift).returning();
        return result[0];
    }

    async getShiftsByCompany(companyId: number): Promise<Shift[]> {
        return await db
            .select()
            .from(shifts)
            .where(eq(shifts.companyId, companyId))
            .orderBy(desc(shifts.createdAt));
    }

    async getShiftById(id: number): Promise<Shift | null> {
        const result = await db
            .select()
            .from(shifts)
            .where(eq(shifts.id, id))
            .limit(1);
        return result[0] || null;
    }

    // Attendance Policy Management
    async createOrUpdateAttendancePolicy(
        policy: InsertAttendancePolicy
    ): Promise<AttendancePolicy> {
        const existing = await db
            .select()
            .from(attendancePolicies)
            .where(eq(attendancePolicies.companyId, policy.companyId))
            .limit(1);

        if (existing.length > 0) {
            const updated = await db
                .update(attendancePolicies)
                .set({ ...policy, updatedAt: new Date() })
                .where(eq(attendancePolicies.companyId, policy.companyId))
                .returning();
            return updated[0];
        } else {
            const result = await db
                .insert(attendancePolicies)
                .values(policy)
                .returning();
            return result[0];
        }
    }

    async getAttendancePolicyByCompany(
        companyId: number
    ): Promise<AttendancePolicy | null> {
        const result = await db
            .select()
            .from(attendancePolicies)
            .where(eq(attendancePolicies.companyId, companyId))
            .limit(1);
        return result[0] || null;
    }

    // Attendance Record Management
    async createAttendanceRecord(
        record: InsertAttendanceRecord
    ): Promise<AttendanceRecord> {
        const result = await db
            .insert(attendanceRecords)
            .values(record)
            .returning();
        return result[0];
    }

    async updateAttendanceRecord(
        id: number,
        updates: Partial<InsertAttendanceRecord>
    ): Promise<AttendanceRecord> {
        const result = await db
            .update(attendanceRecords)
            .set({ ...updates, updatedAt: new Date() })
            .where(eq(attendanceRecords.id, id))
            .returning();
        return result[0];
    }

    async getAttendanceById(id: number): Promise<AttendanceRecord | null> {
        const result = await db
            .select()
            .from(attendanceRecords)
            .where(eq(attendanceRecords.id, id))
            .limit(1);
        return result[0] || null;
    }

    async getAttendanceByUserAndDate(
        userId: number,
        date: string
    ): Promise<AttendanceRecord | null> {
        const result = await db
            .select()
            .from(attendanceRecords)
            .where(
                and(
                    eq(attendanceRecords.userId, userId),
                    eq(attendanceRecords.date, date)
                )
            )
            .limit(1);
        return result[0] || null;
    }

    async getAttendanceHistory(
        userId: number,
        startDate: string,
        endDate: string
    ): Promise<AttendanceRecord[]> {
        return await db
            .select()
            .from(attendanceRecords)
            .where(
                and(
                    eq(attendanceRecords.userId, userId),
                    gte(attendanceRecords.date, startDate),
                    lte(attendanceRecords.date, endDate)
                )
            )
            .orderBy(desc(attendanceRecords.date));
    }

    async getDailyAttendance(
        companyId: number,
        date: string
    ): Promise<DailyAttendanceRecord[]> {
        const results = await db
            .select({
                id: attendanceRecords.id,
                userId: attendanceRecords.userId,
                companyId: attendanceRecords.companyId,
                shiftId: attendanceRecords.shiftId,
                date: attendanceRecords.date,
                checkIn: attendanceRecords.checkIn,
                checkOut: attendanceRecords.checkOut,
                workDuration: attendanceRecords.workDuration,
                status: attendanceRecords.status,
                gpsLocation: attendanceRecords.gpsLocation,
                ipAddress: attendanceRecords.ipAddress,
                deviceId: attendanceRecords.deviceId,
                remarks: attendanceRecords.remarks,
                createdAt: attendanceRecords.createdAt,
                updatedAt: attendanceRecords.updatedAt,
                userName: users.displayName,
                userEmail: users.email,
                userPhotoURL: users.photoURL,
            })
            .from(attendanceRecords)
            .leftJoin(users, eq(attendanceRecords.userId, users.id))
            .where(
                and(
                    eq(attendanceRecords.companyId, companyId),
                    eq(attendanceRecords.date, date)
                )
            )
            .orderBy(attendanceRecords.userId);

        return results;
    }

    async getMonthlyAttendanceSummary(
        userId: number,
        month: number,
        year: number
    ): Promise<{
        totalDays: number;
        presentDays: number;
        lateDays: number;
        absentDays: number;
        totalHours: number;
    }> {
        const startDate = `${year}-${month.toString().padStart(2, "0")}-01`;
        const lastDay = new Date(year, month, 0).getDate();
        const endDate = `${year}-${month
            .toString()
            .padStart(2, "0")}-${lastDay}`;

        const records = await this.getAttendanceHistory(
            userId,
            startDate,
            endDate
        );

        const presentDays = records.filter(
            (r) => r.status === "present"
        ).length;
        const lateDays = records.filter((r) => r.status === "late").length;
        const absentDays = records.filter((r) => r.status === "absent").length;
        const totalHours =
            records.reduce((sum, r) => sum + (r.workDuration || 0), 0) / 60;

        return {
            totalDays: records.length,
            presentDays,
            lateDays,
            absentDays,
            totalHours: Math.round(totalHours * 10) / 10,
        };
    }

    async getAttendanceReport(
        companyId: number,
        startDate: string,
        endDate: string,
        type: string
    ): Promise<any> {
        const records = await db
            .select()
            .from(attendanceRecords)
            .where(
                and(
                    eq(attendanceRecords.companyId, companyId),
                    gte(attendanceRecords.date, startDate),
                    lte(attendanceRecords.date, endDate)
                )
            )
            .orderBy(attendanceRecords.date);

        if (type === "summary") {
            const totalRecords = records.length;
            const presentCount = records.filter(
                (r) => r.status === "present"
            ).length;
            const lateCount = records.filter((r) => r.status === "late").length;
            const absentCount = records.filter(
                (r) => r.status === "absent"
            ).length;

            return {
                totalRecords,
                presentCount,
                lateCount,
                absentCount,
                presentPercentage:
                    totalRecords > 0
                        ? Math.round((presentCount / totalRecords) * 100)
                        : 0,
            };
        }

        return records;
    }

    // Correction Request Management
    async createCorrectionRequest(
        request: InsertCorrectionRequest
    ): Promise<CorrectionRequest> {
        const result = await db
            .insert(correctionRequests)
            .values(request)
            .returning();
        return result[0];
    }

    async updateCorrectionRequest(
        id: number,
        updates: Partial<InsertCorrectionRequest>
    ): Promise<CorrectionRequest> {
        const result = await db
            .update(correctionRequests)
            .set({ ...updates, updatedAt: new Date() })
            .where(eq(correctionRequests.id, id))
            .returning();
        return result[0];
    }

    async getCorrectionRequestById(
        id: number
    ): Promise<CorrectionRequest | null> {
        const result = await db
            .select()
            .from(correctionRequests)
            .where(eq(correctionRequests.id, id))
            .limit(1);
        return result[0] || null;
    }

    async getCorrectionRequestsByUser(
        userId: number
    ): Promise<CorrectionRequest[]> {
        return await db
            .select()
            .from(correctionRequests)
            .where(eq(correctionRequests.userId, userId))
            .orderBy(desc(correctionRequests.createdAt));
    }

    async getPendingCorrectionRequests(
        companyId: number
    ): Promise<CorrectionRequest[]> {
        return await db
            .select()
            .from(correctionRequests)
            .where(
                and(
                    eq(correctionRequests.companyId, companyId),
                    eq(correctionRequests.status, "pending")
                )
            )
            .orderBy(desc(correctionRequests.createdAt));
    }

    // Reward Management
    async createReward(reward: InsertReward): Promise<Reward> {
        const result = await db.insert(rewards).values(reward).returning();
        return result[0];
    }

    async getRewardsByUser(userId: number): Promise<Reward[]> {
        return await db
            .select()
            .from(rewards)
            .where(eq(rewards.userId, userId))
            .orderBy(desc(rewards.createdAt));
    }

    // Attendance Log (Audit Trail)
    async createAttendanceLog(
        log: InsertAttendanceLog
    ): Promise<AttendanceLog> {
        const result = await db.insert(attendanceLogs).values(log).returning();
        return result[0];
    }

    // Mark users as absent if they haven't checked in
    async markAbsentUsers(date: string): Promise<number> {
        const allActiveUsers = await this.getAllUsers(false);
        let markedCount = 0;

        for (const user of allActiveUsers) {
            if (!user.companyId) continue;

            const existingRecord = await this.getAttendanceByUserAndDate(
                user.id,
                date
            );

            if (!existingRecord) {
                const absentRecord = {
                    userId: user.id,
                    companyId: user.companyId,
                    date: date,
                    status: "absent" as const,
                    checkIn: null,
                    checkOut: null,
                    workDuration: null,
                    remarks: "Auto-marked absent - no check-in",
                };

                await this.createAttendanceRecord(absentRecord);
                markedCount++;
            }
        }

        return markedCount;
    }

    // Team Assignment Management
    async createTeamAssignment(
        assignment: InsertTeamAssignment
    ): Promise<TeamAssignment> {
        const result = await db
            .insert(teamAssignments)
            .values(assignment)
            .returning();
        return result[0];
    }

    async removeTeamAssignment(
        teamLeaderId: number,
        memberId: number
    ): Promise<void> {
        await db
            .update(teamAssignments)
            .set({ removedAt: new Date() })
            .where(
                and(
                    eq(teamAssignments.teamLeaderId, teamLeaderId),
                    eq(teamAssignments.memberId, memberId),
                    sql`${teamAssignments.removedAt} IS NULL`
                )
            );
    }

    async getTeamMembersByLeader(teamLeaderId: number): Promise<User[]> {
        const assignments = await db
            .select({
                user: users,
            })
            .from(teamAssignments)
            .innerJoin(users, eq(teamAssignments.memberId, users.id))
            .where(
                and(
                    eq(teamAssignments.teamLeaderId, teamLeaderId),
                    sql`${teamAssignments.removedAt} IS NULL`,
                    eq(users.isActive, true)
                )
            );

        return assignments.map((a) => a.user);
    }

    async getTeamLeaderByMember(memberId: number): Promise<User | null> {
        const assignment = await db
            .select({
                leader: users,
            })
            .from(teamAssignments)
            .innerJoin(users, eq(teamAssignments.teamLeaderId, users.id))
            .where(
                and(
                    eq(teamAssignments.memberId, memberId),
                    sql`${teamAssignments.removedAt} IS NULL`,
                    eq(users.isActive, true)
                )
            )
            .limit(1);

        return assignment[0]?.leader || null;
    }

    async getAllTeamAssignments(companyId: number): Promise<TeamAssignment[]> {
        // Join with users table to filter out assignments with inactive members or leaders
        return await db
            .select({
                id: teamAssignments.id,
                companyId: teamAssignments.companyId,
                teamLeaderId: teamAssignments.teamLeaderId,
                memberId: teamAssignments.memberId,
                assignedAt: teamAssignments.assignedAt,
                removedAt: teamAssignments.removedAt,
            })
            .from(teamAssignments)
            .innerJoin(users, eq(teamAssignments.memberId, users.id))
            .where(
                and(
                    eq(teamAssignments.companyId, companyId),
                    sql`${teamAssignments.removedAt} IS NULL`,
                    eq(users.isActive, true)
                )
            )
            .orderBy(desc(teamAssignments.assignedAt));
    }

    async getTeamAssignmentsByMemberId(
        memberId: number
    ): Promise<TeamAssignment[]> {
        return await db
            .select()
            .from(teamAssignments)
            .where(
                and(
                    eq(teamAssignments.memberId, memberId),
                    sql`${teamAssignments.removedAt} IS NULL`
                )
            )
            .orderBy(desc(teamAssignments.assignedAt));
    }

    // CRM - Enquiry operations
    async createEnquiry(enquiry: InsertEnquiry): Promise<Enquiry> {
        const result = await db.insert(enquiries).values(enquiry).returning();
        return result[0];
    }

    async getEnquiryById(id: number): Promise<Enquiry | null> {
        const result = await db
            .select()
            .from(enquiries)
            .where(eq(enquiries.id, id))
            .limit(1);
        return result[0] || null;
    }

    async getEnquiriesByCompanyId(companyId: number): Promise<Enquiry[]> {
        return await db
            .select()
            .from(enquiries)
            .where(eq(enquiries.companyId, companyId))
            .orderBy(desc(enquiries.createdAt));
    }

    async updateEnquiry(
        id: number,
        updates: Partial<InsertEnquiry>
    ): Promise<void> {
        await db
            .update(enquiries)
            .set({ ...updates, updatedAt: new Date() })
            .where(eq(enquiries.id, id));
    }

    async deleteEnquiry(id: number): Promise<void> {
        await db.delete(enquiries).where(eq(enquiries.id, id));
    }

    async getEnquiryStats(companyId: number): Promise<{
        totalEnquiries: number;
        monthEnquiries: number;
        totalSales: number;
        monthSales: number;
        todayFollowups: number;
        totalDrops: number;
        monthDrops: number;
    }> {
        const now = new Date();
        const year = now.getFullYear();
        const month = String(now.getMonth() + 1).padStart(2, "0");
        const day = String(now.getDate()).padStart(2, "0");
        const currentMonth = `${year}-${month}`;
        const today = `${year}-${month}-${day}`;

        const allEnquiries = await this.getEnquiriesByCompanyId(companyId);

        const totalEnquiries = allEnquiries.length;
        const monthEnquiries = allEnquiries.filter((e) =>
            e.enquiryDate.startsWith(currentMonth)
        ).length;
        const totalSales = allEnquiries.filter(
            (e) => e.status === "sales_closed"
        ).length;
        const monthSales = allEnquiries.filter(
            (e) =>
                e.status === "sales_closed" &&
                e.enquiryDate.startsWith(currentMonth)
        ).length;
        const totalDrops = allEnquiries.filter(
            (e) => e.status === "dropped"
        ).length;
        const monthDrops = allEnquiries.filter(
            (e) =>
                e.status === "dropped" && e.enquiryDate.startsWith(currentMonth)
        ).length;

        const allFollowups = await this.getFollowupsByCompanyId(companyId);
        const todayFollowups = allFollowups.filter(
            (f) => f.nextFollowupDate === today
        ).length;

        return {
            totalEnquiries,
            monthEnquiries,
            totalSales,
            monthSales,
            todayFollowups,
            totalDrops,
            monthDrops,
        };
    }

    // CRM - Followup operations
    async createFollowup(followup: InsertFollowup): Promise<Followup> {
        const result = await db.insert(followups).values(followup).returning();

        await this.updateEnquiry(followup.enquiryId, {
            status: followup.enquiryStatus,
        });

        return result[0];
    }

    async getFollowupsByEnquiryId(enquiryId: number): Promise<Followup[]> {
        return await db
            .select()
            .from(followups)
            .where(eq(followups.enquiryId, enquiryId))
            .orderBy(desc(followups.createdAt));
    }

    async getFollowupsByCompanyId(companyId: number): Promise<Followup[]> {
        return await db
            .select()
            .from(followups)
            .where(eq(followups.companyId, companyId))
            .orderBy(desc(followups.createdAt));
    }

    async updateFollowup(
        id: number,
        updates: Partial<InsertFollowup>
    ): Promise<void> {
        await db.update(followups).set(updates).where(eq(followups.id, id));
    }

    async deleteFollowup(id: number): Promise<void> {
        await db.delete(followups).where(eq(followups.id, id));
    }
}

export const storage = new DbStorage();
