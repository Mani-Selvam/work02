import { Resend } from "resend";

let connectionSettings: any;

async function getCredentials(): Promise<{
    apiKey: string;
    fromEmail: string;
}> {
    // Check if we have a direct RESEND_API_KEY (for local dev or Render deployment)
    if (process.env.RESEND_API_KEY) {
        console.log("[EMAIL] Using direct RESEND_API_KEY from environment");
        return {
            apiKey: process.env.RESEND_API_KEY,
            fromEmail: process.env.RESEND_FROM_EMAIL || "noreply@worklogix.com",
        };
    }

    // Try Replit connector (for Replit environment)
    const hostname = process.env.REPLIT_CONNECTORS_HOSTNAME;
    const xReplitToken = process.env.REPL_IDENTITY
        ? "repl " + process.env.REPL_IDENTITY
        : process.env.WEB_REPL_RENEWAL
        ? "depl " + process.env.WEB_REPL_RENEWAL
        : null;

    if (hostname && xReplitToken) {
        try {
            connectionSettings = await fetch(
                "https://" +
                    hostname +
                    "/api/v2/connection?include_secrets=true&connector_names=resend",
                {
                    headers: {
                        Accept: "application/json",
                        X_REPLIT_TOKEN: xReplitToken,
                    },
                }
            )
                .then((res) => res.json())
                .then((data) => data.items?.[0]);

            if (connectionSettings?.settings?.api_key) {
                console.log("[EMAIL] Using Replit connector for Resend");
                return {
                    apiKey: connectionSettings.settings.api_key,
                    fromEmail:
                        connectionSettings.settings.from_email ||
                        "noreply@worklogix.com",
                };
            }
        } catch (error) {
            console.warn(
                "[EMAIL] Failed to get Replit connector credentials:",
                error
            );
        }
    }

    // No credentials available
    throw new Error(
        "Resend not configured. Set RESEND_API_KEY environment variable or configure Replit connector."
    );
}

async function getResendClient() {
    const { apiKey, fromEmail } = await getCredentials();
    return {
        client: new Resend(apiKey),
        fromEmail: fromEmail,
    };
}

export async function sendCompanyServerIdEmail(companyData: {
    companyName: string;
    companyEmail: string;
    serverId: string;
}) {
    try {
        const { client, fromEmail } = await getResendClient();

        const htmlContent = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f9fafb;">
        <div style="background-color: white; border-radius: 8px; padding: 30px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
          <div style="text-align: center; margin-bottom: 30px;">
            <h1 style="color: #4F46E5; margin: 0;">Company Registration Successful!</h1>
          </div>
          
          <p style="font-size: 16px; color: #333;">Hello <strong>${companyData.companyName}</strong>,</p>
          <p style="font-size: 14px; color: #666; line-height: 1.6;">Your company registration was successful! Welcome to WorkLogix - your centralized system for managing teams, slots, and activities.</p>
          
          <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); border-radius: 8px; padding: 20px; margin: 25px 0; text-align: center;">
            <p style="color: white; font-size: 14px; margin: 0 0 10px 0; opacity: 0.9;">Your Company Server ID:</p>
            <p style="font-size: 32px; font-weight: bold; color: white; margin: 0; letter-spacing: 2px;">${companyData.serverId}</p>
          </div>
          
          <div style="background-color: #FEF3C7; border-left: 4px solid #F59E0B; padding: 15px; margin: 20px 0; border-radius: 4px;">
            <p style="color: #92400E; font-size: 14px; margin: 0;">
              <strong>Important Security Notice:</strong><br/>
              Please save your Company Server ID securely. You will need it to log in to your admin portal along with your email and password.
            </p>
          </div>
          
          <div style="background-color: #F3F4F6; padding: 20px; border-radius: 8px; margin: 25px 0;">
            <h3 style="color: #333; margin-top: 0; font-size: 16px;">How to Access Your Dashboard:</h3>
            <ol style="color: #666; font-size: 14px; line-height: 1.8; margin: 10px 0;">
              <li>Go to the WorkLogix login page</li>
              <li>Select <strong>"Company Admin"</strong> tab</li>
              <li>Enter your company name, email, server ID, and password</li>
              <li>Start managing your team!</li>
            </ol>
          </div>
          
          <div style="background-color: #E0E7FF; padding: 15px; border-radius: 8px; margin: 20px 0;">
            <p style="color: #3730A3; font-size: 13px; margin: 0;">
              <strong>Free Plan Includes:</strong> Manage up to 10 users at no cost. Additional user slots can be purchased from your dashboard as your team grows.
            </p>
          </div>
          
          <hr style="border: none; border-top: 1px solid #E5E7EB; margin: 30px 0;" />
          
          <p style="font-size: 14px; color: #666;">Best regards,<br/><strong>The WorkLogix Team</strong></p>
          <p style="font-size: 12px; color: #9CA3AF; margin-top: 20px;">This is an automated message. Please do not reply to this email.</p>
        </div>
      </div>
    `;

        const { data, error } = await client.emails.send({
            from: `WorkLogix <${fromEmail}>`,
            to: [companyData.companyEmail],
            subject: `Company Registration Successful! - Company ID: ${companyData.serverId}`,
            html: htmlContent,
        });

        if (error) {
            console.error(
                "[EMAIL] Error sending company server ID email:",
                error
            );
            return false;
        }

        console.log(
            `[EMAIL] Company Server ID email sent to ${companyData.companyEmail}, ID: ${data?.id}`
        );
        return true;
    } catch (error) {
        console.error("[EMAIL] Error sending company server ID email:", error);
        return false;
    }
}

export async function sendUserIdEmail(userData: {
    userName: string;
    userEmail: string;
    uniqueUserId: string;
    role: string;
}) {
    try {
        const { client, fromEmail } = await getResendClient();

        const htmlContent = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h2 style="color: #333;">Welcome to WorkLogix!</h2>
        <p>Dear ${userData.userName},</p>
        <p>Your account has been successfully created.</p>
        
        <div style="background-color: #f5f5f5; border-left: 4px solid #2196F3; padding: 15px; margin: 20px 0;">
          <h3 style="color: #333; margin-top: 0;">Your Unique User ID:</h3>
          <p style="font-size: 24px; font-weight: bold; color: #2196F3; margin: 10px 0;">${
              userData.uniqueUserId
          }</p>
          <p style="color: #666; font-size: 14px; margin: 5px 0;">Please save this ID for your records. It is unique to your account.</p>
        </div>
        
        <p><strong>Your Role:</strong> ${
            userData.role === "company_admin"
                ? "Company Administrator"
                : "Company Member"
        }</p>
        
        ${
            userData.role === "company_admin"
                ? `
          <p>As a company administrator, you can:</p>
          <ul>
            <li>Manage users within your company</li>
            <li>Monitor user activity</li>
            <li>View company slot usage</li>
            <li>Purchase additional user slots when needed</li>
          </ul>
        `
                : ""
        }
        
        <p>Best regards,<br/>The WorkLogix Team</p>
      </div>
    `;

        const { data, error } = await client.emails.send({
            from: `WorkLogix <${fromEmail}>`,
            to: [userData.userEmail],
            subject: `WorkLogix - Your User ID: ${userData.uniqueUserId}`,
            html: htmlContent,
        });

        if (error) {
            console.error("[EMAIL] Error sending user ID email:", error);
            return false;
        }

        console.log(
            `[EMAIL] User ID email sent to ${userData.userEmail}, ID: ${data?.id}`
        );
        return true;
    } catch (error) {
        console.error("[EMAIL] Error sending user ID email:", error);
        return false;
    }
}

export async function sendPasswordResetEmail(data: {
    email: string;
    resetToken: string;
    userName?: string;
    baseUrl?: string;
}) {
    try {
        const { client, fromEmail } = await getResendClient();

        // Determine the correct frontend URL for password reset
        let frontendUrl: string;

        if (data.baseUrl) {
            frontendUrl = data.baseUrl;
        } else if (process.env.REPLIT_DEV_DOMAIN) {
            frontendUrl = `https://${process.env.REPLIT_DEV_DOMAIN}`;
        } else if (process.env.REPLIT_DOMAINS) {
            const domains = process.env.REPLIT_DOMAINS.split(",");
            frontendUrl = `https://${domains[0].trim()}`;
        } else if (process.env.FRONTEND_URL) {
            frontendUrl = process.env.FRONTEND_URL;
        } else if (process.env.VITE_API_URL) {
            frontendUrl = process.env.VITE_API_URL;
        } else {
            frontendUrl = "http://localhost:5000";
        }

        // Get the base path for frontend routes (e.g., /worklogix)
        const basePath = process.env.FRONTEND_BASE_PATH || "";
        const resetUrl = `${frontendUrl}${basePath}/reset-password?token=${data.resetToken}`;
        console.log(`[EMAIL] Password reset URL: ${resetUrl}`);

        const htmlContent = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f9fafb;">
        <div style="background-color: white; border-radius: 8px; padding: 30px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
          <div style="text-align: center; margin-bottom: 30px;">
            <h1 style="color: #DC2626; margin: 0;">Reset Your WorkLogix Password</h1>
          </div>
          
          <p style="font-size: 16px; color: #333;">Hello <strong>${
              data.userName || "User"
          }</strong>,</p>
          <p style="font-size: 14px; color: #666; line-height: 1.6;">You requested a password reset for your WorkLogix account.</p>
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="${resetUrl}" style="display: inline-block; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 16px 40px; text-decoration: none; border-radius: 6px; font-weight: bold; font-size: 16px; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
              Reset Your Password
            </a>
          </div>
          
          <div style="background-color: #F3F4F6; padding: 15px; border-radius: 6px; margin: 20px 0;">
            <p style="color: #6B7280; font-size: 12px; margin: 0; word-break: break-all;">
              <strong>Or copy this secure link:</strong><br/>
              ${resetUrl}
            </p>
          </div>
          
          <div style="background-color: #FEE2E2; border-left: 4px solid #DC2626; padding: 15px; margin: 25px 0; border-radius: 4px;">
            <p style="color: #991B1B; font-size: 14px; margin: 0;">
              <strong>Security Notice:</strong><br/>
              This link expires in <strong>15 minutes</strong> for your security. If you didn't request this password reset, please ignore this email and your password will remain unchanged.
            </p>
          </div>
          
          <div style="background-color: #E0F2FE; padding: 15px; border-radius: 6px; margin: 20px 0;">
            <p style="color: #075985; font-size: 13px; margin: 0;">
              <strong>Password Requirements:</strong><br/>
              Your new password must contain at least 8 characters, including uppercase, lowercase, numbers, and special characters (@$!%*?&).
            </p>
          </div>
          
          <hr style="border: none; border-top: 1px solid #E5E7EB; margin: 30px 0;" />
          
          <p style="font-size: 14px; color: #666;">Best regards,<br/><strong>The WorkLogix Team</strong></p>
          <p style="font-size: 12px; color: #9CA3AF; margin-top: 20px;">This is an automated security message. Please do not reply to this email.</p>
        </div>
      </div>
    `;

        const { data: emailData, error } = await client.emails.send({
            from: `WorkLogix <${fromEmail}>`,
            to: [data.email],
            subject: "Reset Your WorkLogix Password",
            html: htmlContent,
        });

        if (error) {
            console.error("[EMAIL] Error sending password reset email:", error);
            return false;
        }

        console.log(
            `[EMAIL] Password reset email sent to ${data.email}, ID: ${emailData?.id}`
        );
        return true;
    } catch (error) {
        console.error("[EMAIL] Error sending password reset email:", error);
        return false;
    }
}

export async function sendPaymentConfirmationEmail(paymentData: {
    companyName: string;
    companyEmail: string;
    receiptNumber: string;
    amount: number;
    currency: string;
    slotType: string;
    slotQuantity: number;
    transactionId: string;
    paymentDate: Date;
}) {
    try {
        const { client, fromEmail } = await getResendClient();

        const currencySymbol = paymentData.currency === "INR" ? "Rs." : "$";
        const slotTypeLabel =
            paymentData.slotType === "admin" ? "Admin" : "Member";

        const htmlContent = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f9f9f9;">
        <div style="background-color: white; border-radius: 8px; padding: 30px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
          <div style="text-align: center; margin-bottom: 30px;">
            <div style="background-color: #4CAF50; color: white; width: 60px; height: 60px; border-radius: 50%; display: inline-flex; align-items: center; justify-content: center; font-size: 30px;">
              <span style="line-height: 60px;">&#10003;</span>
            </div>
            <h1 style="color: #333; margin: 15px 0 5px 0;">Payment Successful!</h1>
            <p style="color: #666; margin: 0;">Thank you for your purchase</p>
          </div>
          
          <div style="background-color: #f5f5f5; border-left: 4px solid #4CAF50; padding: 20px; margin: 25px 0; border-radius: 4px;">
            <h2 style="color: #333; margin: 0 0 15px 0; font-size: 18px;">Payment Details</h2>
            <table style="width: 100%; border-collapse: collapse;">
              <tr>
                <td style="padding: 8px 0; color: #666; width: 40%;">Receipt Number:</td>
                <td style="padding: 8px 0; color: #333; font-weight: bold;">${
                    paymentData.receiptNumber
                }</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; color: #666;">Company:</td>
                <td style="padding: 8px 0; color: #333; font-weight: bold;">${
                    paymentData.companyName
                }</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; color: #666;">Date:</td>
                <td style="padding: 8px 0; color: #333;">${paymentData.paymentDate.toLocaleString(
                    "en-IN",
                    { dateStyle: "long", timeStyle: "short" }
                )}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; color: #666;">Transaction ID:</td>
                <td style="padding: 8px 0; color: #333; font-size: 12px; word-break: break-all;">${
                    paymentData.transactionId
                }</td>
              </tr>
            </table>
          </div>
          
          <div style="background-color: #f5f5f5; padding: 20px; margin: 25px 0; border-radius: 4px;">
            <h2 style="color: #333; margin: 0 0 15px 0; font-size: 18px;">Order Summary</h2>
            <table style="width: 100%; border-collapse: collapse;">
              <tr>
                <td style="padding: 8px 0; color: #666;">Item:</td>
                <td style="padding: 8px 0; color: #333; text-align: right;">${slotTypeLabel} Slots (${
            paymentData.slotQuantity
        })</td>
              </tr>
              <tr style="border-top: 1px solid #ddd;">
                <td style="padding: 12px 0; color: #333; font-weight: bold; font-size: 16px;">Total Amount:</td>
                <td style="padding: 12px 0; color: #4CAF50; font-weight: bold; font-size: 18px; text-align: right;">${currencySymbol}${paymentData.amount.toLocaleString()}</td>
              </tr>
            </table>
          </div>
          
          <div style="background-color: #E8F5E9; border: 1px solid #4CAF50; border-radius: 4px; padding: 15px; margin: 25px 0;">
            <p style="margin: 0; color: #2E7D32; font-size: 14px;">
              Your ${slotTypeLabel.toLowerCase()} slots have been added to your company account and are ready to use.
            </p>
          </div>
          
          <div style="text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee;">
            <p style="color: #666; font-size: 14px; margin: 5px 0;">Questions about your payment?</p>
            <p style="color: #666; font-size: 14px; margin: 5px 0;">Contact us at support@worklogix.com</p>
          </div>
          
          <div style="text-align: center; margin-top: 25px;">
            <p style="color: #999; font-size: 12px; margin: 5px 0;">This is an automated email. Please do not reply.</p>
            <p style="color: #999; font-size: 12px; margin: 5px 0;">${new Date().getFullYear()} WorkLogix. All rights reserved.</p>
          </div>
        </div>
      </div>
    `;

        const { data, error } = await client.emails.send({
            from: `WorkLogix <${fromEmail}>`,
            to: [paymentData.companyEmail],
            subject: `Payment Receipt - ${paymentData.receiptNumber} | WorkLogix`,
            html: htmlContent,
        });

        if (error) {
            console.error(
                "[EMAIL] Error sending payment confirmation email:",
                error
            );
            return false;
        }

        console.log(
            `[EMAIL] Payment confirmation email sent to ${paymentData.companyEmail} with receipt ${paymentData.receiptNumber}, ID: ${data?.id}`
        );
        return true;
    } catch (error) {
        console.error(
            "[EMAIL] Error sending payment confirmation email:",
            error
        );
        return false;
    }
}

export async function sendCompanyVerificationEmail(data: {
    companyName: string;
    email: string;
    serverId: string;
    verificationToken: string;
    baseUrl?: string;
}) {
    try {
        const { client, fromEmail } = await getResendClient();

        console.log(
            `[EMAIL] Attempting to send verification email to: ${data.email}`
        );
        console.log(`[EMAIL] From: ${fromEmail}`);

        // Determine the correct frontend URL for verification
        let frontendUrl: string;

        if (data.baseUrl) {
            frontendUrl = data.baseUrl;
        } else if (process.env.REPLIT_DEV_DOMAIN) {
            frontendUrl = `https://${process.env.REPLIT_DEV_DOMAIN}`;
        } else if (process.env.REPLIT_DOMAINS) {
            const domains = process.env.REPLIT_DOMAINS.split(",");
            frontendUrl = `https://${domains[0].trim()}`;
        } else if (process.env.FRONTEND_URL) {
            frontendUrl = process.env.FRONTEND_URL;
        } else if (process.env.VITE_API_URL) {
            frontendUrl = process.env.VITE_API_URL;
        } else {
            frontendUrl = "http://localhost:5000";
        }

        // Get the base path for frontend routes (e.g., /worklogix)
        const basePath = process.env.FRONTEND_BASE_PATH || "";
        const verificationUrl = `${frontendUrl}${basePath}/verify?token=${data.verificationToken}`;
        console.log(`[EMAIL] Verification URL: ${verificationUrl}`);

        const htmlContent = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f9fafb;">
        <div style="background-color: white; border-radius: 8px; padding: 30px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
          <div style="text-align: center; margin-bottom: 30px;">
            <h1 style="color: #4F46E5; margin: 0;">Company Registration Successful!</h1>
          </div>
          
          <p style="font-size: 16px; color: #333;">Hello <strong>${data.companyName}</strong>,</p>
          <p style="font-size: 14px; color: #666; line-height: 1.6;">Your company registration was successful! Welcome to WorkLogix.</p>
          
          <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); border-radius: 8px; padding: 20px; margin: 25px 0; text-align: center;">
            <p style="color: white; font-size: 14px; margin: 0 0 10px 0; opacity: 0.9;">Your Company Server ID:</p>
            <p style="font-size: 32px; font-weight: bold; color: white; margin: 0; letter-spacing: 2px;">${data.serverId}</p>
          </div>
          
          <div style="background-color: #FEF3C7; border-left: 4px solid #F59E0B; padding: 15px; margin: 20px 0; border-radius: 4px;">
            <p style="color: #92400E; font-size: 14px; margin: 0;">
              <strong>Important:</strong> Please save your Company Server ID securely. You will need it to log in.
            </p>
          </div>
          
          <div style="text-align: center; margin: 30px 0;">
            <p style="font-size: 14px; color: #333; margin-bottom: 15px;">Please confirm your registration by clicking the button below:</p>
            <a href="${verificationUrl}" style="display: inline-block; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 16px 40px; text-decoration: none; border-radius: 6px; font-weight: bold; font-size: 16px; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
              Verify Your Email
            </a>
          </div>
          
          <div style="background-color: #F3F4F6; padding: 15px; border-radius: 6px; margin: 20px 0;">
            <p style="color: #6B7280; font-size: 12px; margin: 0; word-break: break-all;">
              <strong>Or copy this link:</strong><br/>
              ${verificationUrl}
            </p>
          </div>
          
          <div style="background-color: #FEE2E2; border-left: 4px solid #DC2626; padding: 15px; margin: 25px 0; border-radius: 4px;">
            <p style="color: #991B1B; font-size: 14px; margin: 0;">
              <strong>Important:</strong> This verification link expires in <strong>24 hours</strong>. After confirmation, you can log in to your company dashboard.
            </p>
          </div>
          
          <hr style="border: none; border-top: 1px solid #E5E7EB; margin: 30px 0;" />
          
          <p style="font-size: 14px; color: #666;">Best regards,<br/><strong>The WorkLogix Team</strong></p>
          <p style="font-size: 12px; color: #9CA3AF; margin-top: 20px;">This is an automated message. Please do not reply to this email.</p>
        </div>
      </div>
    `;

        const { data: emailData, error } = await client.emails.send({
            from: `WorkLogix <${fromEmail}>`,
            to: [data.email],
            subject: `Verify Your WorkLogix Registration - Company ID: ${data.serverId}`,
            html: htmlContent,
        });

        if (error) {
            console.error("[EMAIL] Error sending verification email:", error);
            return false;
        }

        console.log(
            `[EMAIL] Verification email sent successfully to ${data.email}, ID: ${emailData?.id}`
        );
        return true;
    } catch (error) {
        console.error("[EMAIL] Error sending verification email:", error);
        if (error instanceof Error) {
            console.error("[EMAIL] Error message:", error.message);
            console.error("[EMAIL] Error stack:", error.stack);
        }
        return false;
    }
}

export async function sendReportNotification(reportData: {
    adminEmail: string;
    userName: string;
    reportType: string;
    plannedTasks?: string | null;
    completedTasks?: string | null;
    pendingTasks?: string | null;
    notes?: string | null;
    createdAt: Date;
}) {
    try {
        const { client, fromEmail } = await getResendClient();

        const htmlContent = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #333;">New ${
            reportData.reportType.charAt(0).toUpperCase() +
            reportData.reportType.slice(1)
        } Report Submitted</h2>
        <p><strong>User:</strong> ${reportData.userName}</p>
        <p><strong>Report Type:</strong> ${
            reportData.reportType.charAt(0).toUpperCase() +
            reportData.reportType.slice(1)
        }</p>
        <p><strong>Submitted At:</strong> ${reportData.createdAt.toLocaleString()}</p>
        
        ${
            reportData.plannedTasks
                ? `
          <div style="margin: 20px 0;">
            <h3 style="color: #555;">Planned Tasks:</h3>
            <p style="white-space: pre-wrap;">${reportData.plannedTasks}</p>
          </div>
        `
                : ""
        }
        
        ${
            reportData.completedTasks
                ? `
          <div style="margin: 20px 0;">
            <h3 style="color: #555;">Completed Tasks:</h3>
            <p style="white-space: pre-wrap;">${reportData.completedTasks}</p>
          </div>
        `
                : ""
        }
        
        ${
            reportData.pendingTasks
                ? `
          <div style="margin: 20px 0;">
            <h3 style="color: #555;">Pending Tasks:</h3>
            <p style="white-space: pre-wrap;">${reportData.pendingTasks}</p>
          </div>
        `
                : ""
        }
        
        ${
            reportData.notes
                ? `
          <div style="margin: 20px 0;">
            <h3 style="color: #555;">Notes:</h3>
            <p style="white-space: pre-wrap;">${reportData.notes}</p>
          </div>
        `
                : ""
        }
      </div>
    `;

        const { data, error } = await client.emails.send({
            from: `WorkLogix <${fromEmail}>`,
            to: [reportData.adminEmail],
            subject: `New ${
                reportData.reportType.charAt(0).toUpperCase() +
                reportData.reportType.slice(1)
            } Report - ${reportData.userName}`,
            html: htmlContent,
        });

        if (error) {
            console.error("[EMAIL] Error sending report notification:", error);
            return false;
        }

        console.log(
            `[EMAIL] Report notification sent for ${reportData.reportType} report by ${reportData.userName} to ${reportData.adminEmail}, ID: ${data?.id}`
        );
        return true;
    } catch (error) {
        console.error("[EMAIL] Error sending report notification:", error);
        return false;
    }
}

export async function sendMonthlyAchievementEmail(achievementData: {
    userName: string;
    userEmail: string;
    badges: string[];
    totalPoints: number;
    presentDays: number;
    perfectMonths: number;
    currentStreak: number;
}) {
    try {
        const { client, fromEmail } = await getResendClient();

        const badgesList = achievementData.badges
            .map(
                (badge) => `
      <li style="padding: 5px 0; color: #333; font-size: 14px;">Badge: ${badge}</li>
    `
            )
            .join("");

        const htmlContent = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f9fafb;">
        <div style="background-color: white; border-radius: 8px; padding: 30px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
          <div style="text-align: center; margin-bottom: 30px;">
            <h1 style="color: #4F46E5; margin: 0;">Monthly Achievement Report!</h1>
          </div>
          
          <p style="font-size: 16px; color: #333;">Hello <strong>${
              achievementData.userName
          }</strong>,</p>
          <p style="font-size: 14px; color: #666; line-height: 1.6;">Congratulations on completing another month! Here's a summary of your achievements:</p>
          
          <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); border-radius: 8px; padding: 20px; margin: 25px 0; text-align: center;">
            <p style="color: white; font-size: 14px; margin: 0 0 10px 0; opacity: 0.9;">Total Points This Month:</p>
            <p style="font-size: 48px; font-weight: bold; color: white; margin: 0;">${
                achievementData.totalPoints
            }</p>
          </div>
          
          <div style="background-color: #F3F4F6; padding: 20px; border-radius: 8px; margin: 25px 0;">
            <h3 style="color: #333; margin-top: 0; font-size: 16px;">Monthly Stats:</h3>
            <table style="width: 100%; border-collapse: collapse;">
              <tr>
                <td style="padding: 10px; color: #666; font-size: 14px;">Present Days:</td>
                <td style="padding: 10px; color: #10B981; font-size: 16px; font-weight: bold; text-align: right;">${
                    achievementData.presentDays
                } days</td>
              </tr>
              <tr>
                <td style="padding: 10px; color: #666; font-size: 14px;">Current Streak:</td>
                <td style="padding: 10px; color: #F59E0B; font-size: 16px; font-weight: bold; text-align: right;">${
                    achievementData.currentStreak
                } days</td>
              </tr>
              <tr>
                <td style="padding: 10px; color: #666; font-size: 14px;">Perfect Months:</td>
                <td style="padding: 10px; color: #4F46E5; font-size: 16px; font-weight: bold; text-align: right;">${
                    achievementData.perfectMonths
                }</td>
              </tr>
            </table>
          </div>
          
          ${
              achievementData.badges.length > 0
                  ? `
            <div style="background-color: #FEF3C7; border-left: 4px solid #F59E0B; padding: 20px; margin: 20px 0; border-radius: 4px;">
              <h3 style="color: #92400E; margin-top: 0; font-size: 16px;">New Badges Earned:</h3>
              <ul style="margin: 10px 0; padding-left: 20px;">
                ${badgesList}
              </ul>
            </div>
          `
                  : ""
          }
          
          <div style="background: linear-gradient(135deg, #10B981 0%, #059669 100%); border-radius: 8px; padding: 20px; margin: 25px 0; text-align: center;">
            <p style="color: white; font-size: 16px; margin: 0;">Keep up your dedication!</p>
            <p style="color: white; font-size: 14px; margin: 10px 0; opacity: 0.9;">Your consistency is paying off. Let's make next month even better!</p>
          </div>
          
          <hr style="border: none; border-top: 1px solid #E5E7EB; margin: 30px 0;" />
          
          <p style="font-size: 14px; color: #666;">Best regards,<br/><strong>The WorkLogix Team</strong></p>
          <p style="font-size: 12px; color: #9CA3AF; margin-top: 20px;">This is an automated message. Please do not reply to this email.</p>
        </div>
      </div>
    `;

        const { data, error } = await client.emails.send({
            from: `WorkLogix Achievements <${fromEmail}>`,
            to: [achievementData.userEmail],
            subject: `Your Monthly Achievement Report!`,
            html: htmlContent,
        });

        if (error) {
            console.error(
                "[EMAIL] Error sending monthly achievement email:",
                error
            );
            return false;
        }

        console.log(
            `[EMAIL] Monthly achievement email sent to ${achievementData.userEmail}, ID: ${data?.id}`
        );
        return true;
    } catch (error) {
        console.error(
            "[EMAIL] Error sending monthly achievement email:",
            error
        );
        return false;
    }
}
