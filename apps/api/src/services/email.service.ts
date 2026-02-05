import Mailjet from 'node-mailjet';

interface SendInvitationEmailParams {
  to: string;
  tempPassword: string;
  invitedBy: string;
}

export class EmailService {
  private static client: any;

  private static getClient() {
    if (!this.client) {
      const apiKey = process.env.MAILJET_API_KEY;
      const secretKey = process.env.MAILJET_SECRET_KEY;

      if (!apiKey || !secretKey) {
        throw new Error('Mailjet API credentials not configured');
      }

      this.client = new Mailjet({
        apiKey,
        apiSecret: secretKey,
      });
    }

    return this.client;
  }

  static async sendInvitationEmail({ to, tempPassword, invitedBy }: SendInvitationEmailParams) {
    const fromEmail = process.env.MAILJET_FROM_EMAIL || process.env.EMAIL_FROM || 'noreply@yourdomain.com';
    const fromName = process.env.MAILJET_FROM_NAME || process.env.EMAIL_FROM_NAME || 'PFM Surveys';

    try {
      const request = this.getClient()
        .post('send', { version: 'v3.1' })
        .request({
          Messages: [
            {
              From: {
                Email: fromEmail,
                Name: fromName,
              },
              To: [
                {
                  Email: to,
                },
              ],
              Subject: 'You\'ve been invited to PFM Surveys',
              TextPart: `Hi!

${invitedBy} has invited you to join their team on PFM Surveys.

Your temporary login credentials:
Email: ${to}
Password: ${tempPassword}

Please log in and change your password after your first login.

Login here: ${process.env.ADMIN_URL || 'http://localhost:5173'}

Welcome aboard!

---
PFM Surveys Team`,
              HTMLPart: `
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
      <a href="${process.env.ADMIN_URL || 'http://localhost:5173'}" class="button">
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
`,
            },
          ],
        });

      const result = await request;
      return { success: true, messageId: result.body.Messages[0].Status };
    } catch (error: any) {
      console.error('Failed to send invitation email:', error);
      throw new Error(`Failed to send email: ${error.message}`);
    }
  }

  static async testConnection() {
    try {
      this.getClient();
      return true;
    } catch (error) {
      return false;
    }
  }
}
