import { sql } from "drizzle-orm";
import { pgTable, text, varchar, timestamp, boolean, integer, serial, uniqueIndex } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const companies = pgTable("companies", {
  id: serial("id").primaryKey(),
  serverId: varchar("server_id", { length: 50 }).notNull().unique(),
  name: varchar("name", { length: 255 }).notNull(),
  email: text("email").notNull().unique(),
  password: text("password").notNull(),
  phone: varchar("phone", { length: 20 }),
  website: text("website"),
  location: varchar("location", { length: 100 }),
  description: text("description"),
  
  companyType: varchar("company_type", { length: 50 }),
  contactPerson: varchar("contact_person", { length: 255 }),
  designation: varchar("designation", { length: 100 }),
  mobile: varchar("mobile", { length: 20 }),
  
  address: text("address"),
  pincode: varchar("pincode", { length: 10 }),
  city: varchar("city", { length: 100 }),
  state: varchar("state", { length: 100 }),
  country: varchar("country", { length: 100 }),
  
  employees: integer("employees"),
  annualTurnover: varchar("annual_turnover", { length: 50 }),
  yearEstablished: integer("year_established"),
  logo: text("logo"),
  
  verificationToken: varchar("verification_token", { length: 255 }),
  verificationTokenExpiry: timestamp("verification_token_expiry"),
  emailVerified: boolean("email_verified").notNull().default(false),
  
  maxAdmins: integer("max_admins").notNull().default(1),
  maxMembers: integer("max_members").notNull().default(10),
  isActive: boolean("is_active").notNull().default(true),
  
  createdBy: varchar("created_by", { length: 255 }),
  updatedBy: varchar("updated_by", { length: 255 }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  uniqueUserId: varchar("unique_user_id", { length: 50 }).notNull().unique(),
  email: text("email").notNull().unique(),
  displayName: text("display_name").notNull(),
  password: text("password"),
  photoURL: text("photo_url"),
  role: varchar("role", { length: 20 }).notNull().default("company_member"),
  companyId: integer("company_id").references(() => companies.id),
  firebaseUid: text("firebase_uid").unique(),
  isActive: boolean("is_active").notNull().default(true),
  deletedAt: timestamp("deleted_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const tasks = pgTable("tasks", {
  id: serial("id").primaryKey(),
  companyId: integer("company_id").references(() => companies.id).notNull(),
  assignedBy: integer("assigned_by").references(() => users.id),
  assignedTo: integer("assigned_to").references(() => users.id).notNull(),
  title: varchar("title", { length: 255 }).notNull(),
  description: text("description"),
  priority: varchar("priority", { length: 20 }).notNull().default("medium"),
  deadline: timestamp("deadline"),
  status: varchar("status", { length: 20 }).notNull().default("pending"),
  completedAt: timestamp("completed_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const reports = pgTable("reports", {
  id: serial("id").primaryKey(),
  companyId: integer("company_id").references(() => companies.id).notNull(),
  userId: integer("user_id").references(() => users.id).notNull(),
  reportType: varchar("report_type", { length: 20 }).notNull(),
  plannedTasks: text("planned_tasks"),
  completedTasks: text("completed_tasks"),
  pendingTasks: text("pending_tasks"),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const messages = pgTable("messages", {
  id: serial("id").primaryKey(),
  senderId: integer("sender_id").references(() => users.id).notNull(),
  receiverId: integer("receiver_id").references(() => users.id).notNull(),
  message: text("message").notNull(),
  messageType: varchar("message_type", { length: 30 }).notNull().default("team_leader_to_employee"),
  relatedTaskId: integer("related_task_id").references(() => tasks.id),
  readStatus: boolean("read_status").notNull().default(false),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const ratings = pgTable("ratings", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id).notNull(),
  ratedBy: integer("rated_by").references(() => users.id).notNull(),
  rating: varchar("rating", { length: 30 }).notNull(),
  feedback: text("feedback"),
  period: varchar("period", { length: 20 }).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => ({
  uniqueRatingPerPeriod: uniqueIndex("unique_rating_per_period").on(table.userId, table.ratedBy, table.period),
}));

export const fileUploads = pgTable("file_uploads", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id).notNull(),
  reportId: integer("report_id").references(() => reports.id),
  fileName: text("file_name").notNull(),
  fileUrl: text("file_url").notNull(),
  fileType: varchar("file_type", { length: 20 }).notNull(),
  uploadedAt: timestamp("uploaded_at").defaultNow().notNull(),
});

export const archiveReports = pgTable("archive_reports", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id).notNull(),
  reportType: varchar("report_type", { length: 20 }).notNull(),
  plannedTasks: text("planned_tasks"),
  completedTasks: text("completed_tasks"),
  pendingTasks: text("pending_tasks"),
  notes: text("notes"),
  originalDate: timestamp("original_date").notNull(),
  archivedAt: timestamp("archived_at").defaultNow().notNull(),
});

export const groupMessages = pgTable("group_messages", {
  id: serial("id").primaryKey(),
  companyId: integer("company_id").references(() => companies.id).notNull(),
  senderId: integer("sender_id").references(() => users.id).notNull(),
  message: text("message").notNull(),
  title: varchar("title", { length: 255 }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const groupMessageReplies = pgTable("group_message_replies", {
  id: serial("id").primaryKey(),
  groupMessageId: integer("group_message_id").references(() => groupMessages.id).notNull(),
  senderId: integer("sender_id").references(() => users.id).notNull(),
  message: text("message").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const taskTimeLogs = pgTable("task_time_logs", {
  id: serial("id").primaryKey(),
  taskId: integer("task_id").references(() => tasks.id).notNull(),
  userId: integer("user_id").references(() => users.id).notNull(),
  date: varchar("date", { length: 10 }).notNull(),
  totalSeconds: integer("total_seconds").notNull().default(0),
  oldTimeSeconds: integer("old_time_seconds").notNull().default(0),
  newTimeSeconds: integer("new_time_seconds").notNull().default(0),
  timerStartedAt: timestamp("timer_started_at"),
  timerStatus: varchar("timer_status", { length: 20 }).notNull().default("stopped"),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const feedbacks = pgTable("feedbacks", {
  id: serial("id").primaryKey(),
  companyId: integer("company_id").references(() => companies.id).notNull(),
  submittedBy: integer("submitted_by").references(() => users.id).notNull(),
  recipientType: varchar("recipient_type", { length: 20 }).notNull(),
  message: text("message").notNull(),
  adminResponse: varchar("admin_response", { length: 50 }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  respondedAt: timestamp("responded_at"),
});

export const slotPricing = pgTable("slot_pricing", {
  id: serial("id").primaryKey(),
  slotType: varchar("slot_type", { length: 20 }).notNull(),
  pricePerSlot: integer("price_per_slot").notNull(),
  currency: varchar("currency", { length: 10 }).notNull().default("USD"),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const companyPayments = pgTable("company_payments", {
  id: serial("id").primaryKey(),
  companyId: integer("company_id").references(() => companies.id).notNull(),
  slotType: varchar("slot_type", { length: 20 }),
  slotQuantity: integer("slot_quantity"),
  amount: integer("amount").notNull(),
  currency: varchar("currency", { length: 10 }).notNull().default("INR"),
  paymentStatus: varchar("payment_status", { length: 20 }).notNull().default("pending"),
  paymentMethod: varchar("payment_method", { length: 50 }),
  transactionId: varchar("transaction_id", { length: 255 }),
  stripePaymentIntentId: varchar("stripe_payment_intent_id", { length: 255 }),
  receiptNumber: varchar("receipt_number", { length: 50 }).unique(),
  invoiceUrl: text("invoice_url"),
  emailSent: boolean("email_sent").notNull().default(false),
  billingPeriodStart: timestamp("billing_period_start"),
  billingPeriodEnd: timestamp("billing_period_end"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const passwordResetTokens = pgTable("password_reset_tokens", {
  id: serial("id").primaryKey(),
  email: text("email").notNull(),
  token: varchar("token", { length: 255 }).notNull().unique(),
  expiresAt: timestamp("expires_at").notNull(),
  used: boolean("used").notNull().default(false),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const adminActivityLogs = pgTable("admin_activity_logs", {
  id: serial("id").primaryKey(),
  actionType: varchar("action_type", { length: 50 }).notNull(),
  performedBy: integer("performed_by").references(() => users.id).notNull(),
  targetCompanyId: integer("target_company_id").references(() => companies.id),
  targetUserId: integer("target_user_id").references(() => users.id),
  details: text("details"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const badges = pgTable("badges", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 100 }).notNull(),
  description: text("description"),
  icon: varchar("icon", { length: 50 }),
  criteria: text("criteria"),
  type: varchar("type", { length: 50 }).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const autoTasks = pgTable("auto_tasks", {
  id: serial("id").primaryKey(),
  taskName: varchar("task_name", { length: 100 }).notNull(),
  taskType: varchar("task_type", { length: 50 }).notNull(),
  status: varchar("status", { length: 20 }).notNull(),
  details: text("details"),
  executedAt: timestamp("executed_at").defaultNow().notNull(),
});

export const leaves = pgTable("leaves", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id).notNull(),
  companyId: integer("company_id").references(() => companies.id).notNull(),
  leaveType: varchar("leave_type", { length: 50 }).notNull(),
  startDate: varchar("start_date", { length: 10 }).notNull(),
  endDate: varchar("end_date", { length: 10 }).notNull(),
  reason: text("reason").notNull(),
  status: varchar("status", { length: 20 }).notNull().default("pending"),
  approvedBy: integer("approved_by").references(() => users.id),
  remarks: text("remarks"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const holidays = pgTable("holidays", {
  id: serial("id").primaryKey(),
  companyId: integer("company_id").references(() => companies.id).notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  date: varchar("date", { length: 10 }).notNull(),
  description: text("description"),
  isOptional: boolean("is_optional").notNull().default(false),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const tasksReports = pgTable("tasks_reports", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id).notNull(),
  companyId: integer("company_id").references(() => companies.id).notNull(),
  date: varchar("date", { length: 10 }).notNull(),
  tasksCompleted: text("tasks_completed").notNull(),
  notes: text("notes"),
  submitTime: timestamp("submit_time").defaultNow().notNull(),
  allowedEarlyLogout: boolean("allowed_early_logout").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const shifts = pgTable("shifts", {
  id: serial("id").primaryKey(),
  companyId: integer("company_id").references(() => companies.id).notNull(),
  name: varchar("name", { length: 100 }).notNull(),
  startTime: varchar("start_time", { length: 10 }).notNull(),
  endTime: varchar("end_time", { length: 10 }).notNull(),
  gracePeriod: integer("grace_period").notNull().default(15),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const attendancePolicies = pgTable("attendance_policies", {
  id: serial("id").primaryKey(),
  companyId: integer("company_id").references(() => companies.id).notNull(),
  halfDayHours: integer("half_day_hours").notNull().default(4),
  fullDayHours: integer("full_day_hours").notNull().default(8),
  lateMarkThreshold: integer("late_mark_threshold").notNull().default(3),
  autoAbsentHours: integer("auto_absent_hours").notNull().default(2),
  allowSelfCheckIn: boolean("allow_self_check_in").notNull().default(true),
  requireGPS: boolean("require_gps").notNull().default(false),
  requireDeviceBinding: boolean("require_device_binding").notNull().default(false),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const attendanceRecords = pgTable("attendance_records", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id).notNull(),
  companyId: integer("company_id").references(() => companies.id).notNull(),
  shiftId: integer("shift_id").references(() => shifts.id),
  date: varchar("date", { length: 10 }).notNull(),
  checkIn: timestamp("check_in"),
  checkOut: timestamp("check_out"),
  workDuration: integer("work_duration"),
  status: varchar("status", { length: 20 }).notNull().default("absent"),
  gpsLocation: text("gps_location"),
  ipAddress: varchar("ip_address", { length: 50 }),
  deviceId: varchar("device_id", { length: 255 }),
  remarks: text("remarks"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const correctionRequests = pgTable("correction_requests", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id).notNull(),
  companyId: integer("company_id").references(() => companies.id).notNull(),
  attendanceId: integer("attendance_id").references(() => attendanceRecords.id),
  date: varchar("date", { length: 10 }).notNull(),
  requestedCheckIn: timestamp("requested_check_in"),
  requestedCheckOut: timestamp("requested_check_out"),
  reason: text("reason").notNull(),
  attachment: text("attachment"),
  status: varchar("status", { length: 20 }).notNull().default("pending"),
  reviewedBy: integer("reviewed_by").references(() => users.id),
  reviewComments: text("review_comments"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const rewards = pgTable("rewards", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id).notNull(),
  companyId: integer("company_id").references(() => companies.id).notNull(),
  points: integer("points").notNull(),
  reason: varchar("reason", { length: 255 }).notNull(),
  date: varchar("date", { length: 10 }).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const attendanceLogs = pgTable("attendance_logs", {
  id: serial("id").primaryKey(),
  attendanceId: integer("attendance_id").references(() => attendanceRecords.id).notNull(),
  action: varchar("action", { length: 100 }).notNull(),
  performedBy: integer("performed_by").references(() => users.id).notNull(),
  oldValue: text("old_value"),
  newValue: text("new_value"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const teamAssignments = pgTable("team_assignments", {
  id: serial("id").primaryKey(),
  teamLeaderId: integer("team_leader_id").references(() => users.id).notNull(),
  memberId: integer("member_id").references(() => users.id).notNull(),
  companyId: integer("company_id").references(() => companies.id).notNull(),
  assignedAt: timestamp("assigned_at").defaultNow().notNull(),
  removedAt: timestamp("removed_at"),
}, (table) => ({
  uniqueAssignment: sql`UNIQUE (team_leader_id, member_id, company_id, COALESCE(removed_at, '1970-01-01'))`,
}));

export const enquiries = pgTable("enquiries", {
  id: serial("id").primaryKey(),
  companyId: integer("company_id").references(() => companies.id).notNull(),
  customerName: varchar("customer_name", { length: 255 }).notNull(),
  address: text("address"),
  mobileNo: varchar("mobile_no", { length: 20 }).notNull(),
  productName: varchar("product_name", { length: 255 }),
  productVariant: varchar("product_variant", { length: 255 }),
  color: varchar("color", { length: 100 }),
  paymentMethod: varchar("payment_method", { length: 50 }),
  enquiryDate: varchar("enquiry_date", { length: 10 }).notNull(),
  leadSource: varchar("lead_source", { length: 100 }),
  status: varchar("status", { length: 50 }).notNull().default("new"),
  createdBy: integer("created_by").references(() => users.id).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const followups = pgTable("followups", {
  id: serial("id").primaryKey(),
  enquiryId: integer("enquiry_id").references(() => enquiries.id).notNull(),
  companyId: integer("company_id").references(() => companies.id).notNull(),
  followupDate: varchar("followup_date", { length: 10 }).notNull(),
  remark: text("remark").notNull(),
  enquiryStatus: varchar("enquiry_status", { length: 50 }).notNull(),
  nextFollowupDate: varchar("next_followup_date", { length: 10 }),
  payment: varchar("payment", { length: 100 }),
  expectedDeliveryDate: varchar("expected_delivery_date", { length: 10 }),
  createdBy: integer("created_by").references(() => users.id).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertCompanySchema = createInsertSchema(companies).omit({
  id: true,
  serverId: true,
  createdAt: true,
  updatedAt: true,
});

export const insertUserSchema = createInsertSchema(users).omit({
  id: true,
  uniqueUserId: true,
  createdAt: true,
});

export const loginSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

export const signupSchema = z.object({
  email: z.string().email("Invalid email address"),
  displayName: z.string().min(2, "Name must be at least 2 characters"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

export const firebaseSigninSchema = z.object({
  email: z.string().email("Invalid email address"),
  displayName: z.string().min(1, "Display name is required"),
  photoURL: z.string().optional(),
  firebaseUid: z.string().min(1, "Firebase UID is required"),
});

const strongPasswordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;

export const companyBasicRegistrationSchema = z.object({
  companyName: z.string().min(2, "Company name must be at least 2 characters"),
  email: z.string().email("Invalid email address"),
  password: z.string()
    .min(8, "Password must be at least 8 characters")
    .regex(strongPasswordRegex, "Password must contain at least 1 uppercase, 1 lowercase, 1 number, and 1 special character (@$!%*?&)"),
  confirmPassword: z.string(),
  acceptTerms: z.literal(true, {
    errorMap: () => ({ message: "You must accept the terms and conditions" }),
  }),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords do not match",
  path: ["confirmPassword"],
});

export const companyGoogleRegistrationSchema = z.object({
  companyName: z.string().min(2, "Company name must be at least 2 characters"),
  email: z.string().email("Invalid email address"),
  firebaseUid: z.string().min(1, "Firebase UID is required"),
  photoURL: z.string().optional(),
  acceptTerms: z.literal(true, {
    errorMap: () => ({ message: "You must accept the terms and conditions" }),
  }),
});

export const companyRegistrationSchema = z.object({
  fullName: z.string().min(2, "Full name must be at least 2 characters"),
  email: z.string().email("Invalid email address"),
  password: z.string()
    .min(8, "Password must be at least 8 characters")
    .regex(strongPasswordRegex, "Password must contain at least 1 uppercase, 1 lowercase, 1 number, and 1 special character (@$!%*?&)"),
  confirmPassword: z.string(),
  
  name: z.string().min(2, "Company name must be at least 2 characters"),
  companyType: z.string().min(1, "Please select a company type"),
  contactPerson: z.string().min(2, "Contact person name is required"),
  designation: z.string().min(1, "Please select a designation"),
  mobile: z.string().regex(/^\d{10}$/, "Please enter a valid 10-digit mobile number"),
  website: z.string().url("Please enter a valid URL").optional().or(z.literal("")),
  
  address: z.string().min(5, "Please enter a complete address"),
  pincode: z.string().regex(/^\d{6}$/, "Please enter a valid 6-digit pincode"),
  city: z.string().min(2, "City is required"),
  state: z.string().min(2, "State is required"),
  country: z.string().min(2, "Country is required"),
  
  employees: z.number().min(1, "Number of employees must be at least 1"),
  annualTurnover: z.string().min(1, "Please select annual turnover range"),
  yearEstablished: z.number()
    .min(1800, "Year must be valid")
    .max(new Date().getFullYear(), "Year cannot be in the future"),
  description: z.string().optional(),
  logo: z.string().optional(),
  
  acceptTerms: z.literal(true, {
    errorMap: () => ({ message: "You must accept the terms and conditions" }),
  }),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords do not match",
  path: ["confirmPassword"],
});

export const superAdminLoginSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

export const companyAdminLoginSchema = z.object({
  companyName: z.string().min(1, "Company name is required"),
  email: z.string().email("Invalid email address"),
  serverId: z.string().min(1, "Company Server ID is required"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

export const companyUserLoginSchema = z.object({
  username: z.string().min(1, "Username is required"),
  userId: z.string().min(1, "User ID is required"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

export const insertTaskSchema = createInsertSchema(tasks).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
}).extend({
  deadline: z.string().nullable().optional().transform(val => val ? new Date(val) : null),
});

export const insertReportSchema = createInsertSchema(reports).omit({
  id: true,
  createdAt: true,
});

export const insertMessageSchema = createInsertSchema(messages).omit({
  id: true,
  createdAt: true,
}).extend({
  messageType: z.enum(['admin_to_employee', 'admin_to_team_leader', 'team_leader_to_employee', 'employee_to_team_leader', 'team_leader_to_admin', 'employee_to_admin', 'admin_to_admin']),
});

export const insertRatingSchema = createInsertSchema(ratings).omit({
  id: true,
  createdAt: true,
});

export const insertFileUploadSchema = createInsertSchema(fileUploads).omit({
  id: true,
  uploadedAt: true,
});

export const insertGroupMessageSchema = createInsertSchema(groupMessages).omit({
  id: true,
  createdAt: true,
});

export const insertGroupMessageReplySchema = createInsertSchema(groupMessageReplies).omit({
  id: true,
  createdAt: true,
});

export const insertTaskTimeLogSchema = createInsertSchema(taskTimeLogs).omit({
  id: true,
  updatedAt: true,
});

export const insertFeedbackSchema = createInsertSchema(feedbacks).omit({
  id: true,
  createdAt: true,
  respondedAt: true,
}).extend({
  recipientType: z.enum(['Admin', 'TeamLeader', 'Employee']),
});

export const insertSlotPricingSchema = createInsertSchema(slotPricing).omit({
  id: true,
  updatedAt: true,
}).extend({
  slotType: z.enum(['admin', 'member']),
  pricePerSlot: z.number().min(0, "Price must be non-negative"),
});

export const insertCompanyPaymentSchema = createInsertSchema(companyPayments).omit({
  id: true,
  createdAt: true,
}).extend({
  slotType: z.enum(['admin', 'member']).optional(),
  paymentStatus: z.enum(['pending', 'paid', 'failed', 'cancelled']),
});

export const slotPurchaseSchema = z.object({
  slotType: z.enum(['admin', 'member']),
  quantity: z.number().min(1, "Quantity must be at least 1"),
});

export const updatePaymentStatusSchema = z.object({
  status: z.enum(['pending', 'paid', 'failed', 'cancelled']),
});

export const passwordResetRequestSchema = z.object({
  email: z.string().email("Invalid email address"),
});

export const passwordResetSchema = z.object({
  token: z.string().min(1, "Token is required"),
  newPassword: z.string().min(6, "Password must be at least 6 characters"),
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;

export type InsertTask = z.infer<typeof insertTaskSchema>;
export type Task = typeof tasks.$inferSelect;

export type InsertReport = z.infer<typeof insertReportSchema>;
export type Report = typeof reports.$inferSelect;

export type InsertMessage = z.infer<typeof insertMessageSchema>;
export type Message = typeof messages.$inferSelect;

export type InsertRating = z.infer<typeof insertRatingSchema>;
export type Rating = typeof ratings.$inferSelect;

export type InsertFileUpload = z.infer<typeof insertFileUploadSchema>;
export type FileUpload = typeof fileUploads.$inferSelect;

export type InsertGroupMessage = z.infer<typeof insertGroupMessageSchema>;
export type GroupMessage = typeof groupMessages.$inferSelect;

export type InsertGroupMessageReply = z.infer<typeof insertGroupMessageReplySchema>;
export type GroupMessageReply = typeof groupMessageReplies.$inferSelect;

export type InsertTaskTimeLog = z.infer<typeof insertTaskTimeLogSchema>;
export type TaskTimeLog = typeof taskTimeLogs.$inferSelect;

export type InsertFeedback = z.infer<typeof insertFeedbackSchema>;
export type Feedback = typeof feedbacks.$inferSelect;

export type ArchiveReport = typeof archiveReports.$inferSelect;

export type InsertCompany = z.infer<typeof insertCompanySchema>;
export type Company = typeof companies.$inferSelect;

export type InsertSlotPricing = z.infer<typeof insertSlotPricingSchema>;
export type SlotPricing = typeof slotPricing.$inferSelect;

export type InsertCompanyPayment = z.infer<typeof insertCompanyPaymentSchema>;
export type CompanyPayment = typeof companyPayments.$inferSelect;

export type PasswordResetToken = typeof passwordResetTokens.$inferSelect;

export const insertAdminActivityLogSchema = createInsertSchema(adminActivityLogs).omit({
  id: true,
  createdAt: true,
});

export type InsertAdminActivityLog = z.infer<typeof insertAdminActivityLogSchema>;
export type AdminActivityLog = typeof adminActivityLogs.$inferSelect;

export const insertBadgeSchema = createInsertSchema(badges).omit({
  id: true,
  createdAt: true,
});

export type InsertBadge = z.infer<typeof insertBadgeSchema>;
export type Badge = typeof badges.$inferSelect;

export const insertAutoTaskSchema = createInsertSchema(autoTasks).omit({
  id: true,
  executedAt: true,
});

export type InsertAutoTask = z.infer<typeof insertAutoTaskSchema>;
export type AutoTask = typeof autoTasks.$inferSelect;

export const insertLeaveSchema = createInsertSchema(leaves).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertLeave = z.infer<typeof insertLeaveSchema>;
export type Leave = typeof leaves.$inferSelect;

export const insertHolidaySchema = createInsertSchema(holidays).omit({
  id: true,
  createdAt: true,
});

export type InsertHoliday = z.infer<typeof insertHolidaySchema>;
export type Holiday = typeof holidays.$inferSelect;

export const insertTasksReportSchema = createInsertSchema(tasksReports).omit({
  id: true,
  createdAt: true,
  submitTime: true,
});

export type InsertTasksReport = z.infer<typeof insertTasksReportSchema>;
export type TasksReport = typeof tasksReports.$inferSelect;

export const insertShiftSchema = createInsertSchema(shifts).omit({
  id: true,
  createdAt: true,
});

export type InsertShift = z.infer<typeof insertShiftSchema>;
export type Shift = typeof shifts.$inferSelect;

export const insertAttendancePolicySchema = createInsertSchema(attendancePolicies).omit({
  id: true,
  updatedAt: true,
});

export type InsertAttendancePolicy = z.infer<typeof insertAttendancePolicySchema>;
export type AttendancePolicy = typeof attendancePolicies.$inferSelect;

export const insertAttendanceRecordSchema = createInsertSchema(attendanceRecords).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertAttendanceRecord = z.infer<typeof insertAttendanceRecordSchema>;
export type AttendanceRecord = typeof attendanceRecords.$inferSelect;

export type DailyAttendanceRecord = AttendanceRecord & {
  userName: string | null;
  userEmail: string | null;
  userPhotoURL: string | null;
};

export const insertCorrectionRequestSchema = createInsertSchema(correctionRequests).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertCorrectionRequest = z.infer<typeof insertCorrectionRequestSchema>;
export type CorrectionRequest = typeof correctionRequests.$inferSelect;

export const insertRewardSchema = createInsertSchema(rewards).omit({
  id: true,
  createdAt: true,
});

export type InsertReward = z.infer<typeof insertRewardSchema>;
export type Reward = typeof rewards.$inferSelect;

export const insertAttendanceLogSchema = createInsertSchema(attendanceLogs).omit({
  id: true,
  createdAt: true,
});

export type InsertAttendanceLog = z.infer<typeof insertAttendanceLogSchema>;
export type AttendanceLog = typeof attendanceLogs.$inferSelect;

export const insertTeamAssignmentSchema = createInsertSchema(teamAssignments).omit({
  id: true,
  assignedAt: true,
});

export type InsertTeamAssignment = z.infer<typeof insertTeamAssignmentSchema>;
export type TeamAssignment = typeof teamAssignments.$inferSelect;

export const insertEnquirySchema = createInsertSchema(enquiries).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertEnquiry = z.infer<typeof insertEnquirySchema>;
export type Enquiry = typeof enquiries.$inferSelect;

export const insertFollowupSchema = createInsertSchema(followups).omit({
  id: true,
  createdAt: true,
});

export type InsertFollowup = z.infer<typeof insertFollowupSchema>;
export type Followup = typeof followups.$inferSelect;

export const deviceTokens = pgTable("device_tokens", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id).notNull(),
  token: text("token").notNull().unique(),
  deviceType: varchar("device_type", { length: 20 }).notNull().default("web"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertDeviceTokenSchema = createInsertSchema(deviceTokens).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertDeviceToken = z.infer<typeof insertDeviceTokenSchema>;
export type DeviceToken = typeof deviceTokens.$inferSelect;
