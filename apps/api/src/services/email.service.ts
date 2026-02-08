import nodemailer from "nodemailer";
import type { Transporter } from "nodemailer";

interface SendInvitationEmailParams {
    to: string;
    tempPassword: string;
    invitedBy: string;
}

export class EmailService {
    private static transporter: Transporter | null = null;

    private static getTransporter(): Transporter {
        if (!this.transporter) {
            const host = process.env.SMTP_HOST;
            const port = process.env.SMTP_PORT;
            const user = process.env.SMTP_USER;
            const pass = process.env.SMTP_PASS;

            if (!host || !user || !pass) {
                throw new Error("SMTP credentials not configured (SMTP_HOST, SMTP_USER, SMTP_PASS required)");
            }

            this.transporter = nodemailer.createTransport({
                host,
                port: port ? parseInt(port, 10) : 465,
                secure: true,
                auth: { user, pass },
            });
        }

        return this.transporter;
    }

    static async sendInvitationEmail({ to, tempPassword, invitedBy }: SendInvitationEmailParams) {
        const fromEmail = process.env.SMTP_USER || process.env.EMAIL_FROM || "surveys@pfm-qa.com";
        const fromName = process.env.EMAIL_FROM_NAME || "PFM Surveys";

        const html = `
<!DOCTYPE html>
<html>
<head>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
      line-height: 1.6;
      color: #333;
      max-width: 600px;
      margin: 0 auto;
      padding: 20px;
    }
    .container {
      background: #f9f9f9;
      border-radius: 8px;
      padding: 30px;
      margin: 20px 0;
    }
    .header {
      text-align: center;
      margin-bottom: 30px;
    }
    .header h1 {
      color: #667eea;
      margin: 0;
    }
    .credentials {
      background: white;
      border: 1px solid #ddd;
      border-radius: 6px;
      padding: 20px;
      margin: 20px 0;
    }
    .credentials strong {
      color: #667eea;
    }
    .password-box {
      background: #f5f5f5;
      border: 2px solid #667eea;
      border-radius: 4px;
      padding: 12px;
      font-family: monospace;
      font-size: 16px;
      font-weight: bold;
      color: #667eea;
      margin: 10px 0;
      word-break: break-all;
    }
    .button {
      display: inline-block;
      background: #667eea;
      color: white;
      text-decoration: none;
      padding: 12px 30px;
      border-radius: 6px;
      margin: 20px 0;
      font-weight: 500;
    }
    .footer {
      text-align: center;
      color: #666;
      font-size: 12px;
      margin-top: 30px;
      padding-top: 20px;
      border-top: 1px solid #ddd;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>🎉 You've Been Invited!</h1>
    </div>

    <p><strong>${invitedBy}</strong> has invited you to join their team on <strong>PFM Surveys</strong>.</p>

    <div class="credentials">
      <p><strong>Your Login Credentials:</strong></p>
      <p>
        <strong>Email:</strong> ${to}<br>
        <strong>Temporary Password:</strong>
      </p>
      <div class="password-box">${tempPassword}</div>
      <p style="font-size: 12px; color: #666;">
        ⚠️ Please change this password after your first login.
      </p>
    </div>

    <p style="text-align: center;">
      <a href="${process.env.ADMIN_URL || "http://localhost:5173"}" class="button">
        Log In Now
      </a>
    </p>

    <p>Welcome aboard! 🚀</p>

    <div class="footer">
      <p>PFM Surveys Team</p>
    </div>
  </div>
</body>
</html>
`;

        const text = `Hi!

${invitedBy} has invited you to join their team on PFM Surveys.

Your temporary login credentials:
Email: ${to}
Password: ${tempPassword}

Please log in and change your password after your first login.

Login here: ${process.env.ADMIN_URL || "http://localhost:5173"}

Welcome aboard!

---
PFM Surveys Team`;

        try {
            const info = await this.getTransporter().sendMail({
                from: `"${fromName}" <${fromEmail}>`,
                to,
                subject: "You've been invited to PFM Surveys",
                text,
                html,
            });

            return { success: true, messageId: info.messageId };
        } catch (error: any) {
            console.error("Failed to send invitation email:", error);
            throw new Error(`Failed to send email: ${error.message}`);
        }
    }

    static async testConnection() {
        try {
            await this.getTransporter().verify();
            return true;
        } catch {
            return false;
        }
    }
}
