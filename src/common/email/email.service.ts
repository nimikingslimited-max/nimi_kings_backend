import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import nodemailer, { Transporter } from 'nodemailer';

export interface SendMailOptions {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private transporter: Transporter | null = null;
  private readonly fromAddress: string;

  constructor(private readonly configService: ConfigService) {
    const host = this.configService.get<string>('SMTP_HOST');
    const port = this.configService.get<number>('SMTP_PORT') || 587;
    const user = this.configService.get<string>('SMTP_USER');
    const pass = this.configService.get<string>('SMTP_PASS');
    this.fromAddress =
      this.configService.get<string>('SMTP_FROM') ||
      '"NIMI KINGS LTD" <noreply@nimikingsltd.com>';

    if (host && user && pass) {
      this.transporter = nodemailer.createTransport({
        host,
        port,
        secure: port === 465,
        auth: { user, pass },
      });
      this.logger.log(`📧 SMTP Transporter initialized with host: ${host}`);
    } else {
      this.logger.warn(
        '⚠️ SMTP credentials not fully configured in .env. EmailService running in Development Console mode.',
      );
    }
  }

  async sendMail(options: SendMailOptions): Promise<boolean> {
    try {
      if (this.transporter) {
        await this.transporter.sendMail({
          from: this.fromAddress,
          to: options.to,
          subject: options.subject,
          html: options.html,
          text: options.text,
        });
        this.logger.log(`✅ Email sent to ${options.to}: [${options.subject}]`);
      } else {
        // Fallback logger in dev mode
        this.logger.log(
          `📨 [DEV EMAIL SIMULATION] To: ${options.to} | Subject: "${options.subject}"`,
        );
      }
      return true;
    } catch (error: any) {
      this.logger.error(
        `❌ Failed to dispatch email to ${options.to}: ${error.message}`,
      );
      return false;
    }
  }

  async sendWelcomeEmail(to: string, name: string): Promise<boolean> {
    const subject = 'Welcome to NIMI KINGS LTD – Your Real Estate Journey Begins';
    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f4f7f6; margin: 0; padding: 0; color: #1e293b; }
            .container { max-width: 600px; margin: 30px auto; background: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 12px rgba(0,0,0,0.06); }
            .header { background: linear-gradient(135deg, #0f172a 0%, #1e3a8a 100%); padding: 40px 30px; text-align: center; color: #ffffff; }
            .header h1 { margin: 0; font-size: 26px; font-weight: 700; letter-spacing: 0.5px; }
            .header p { margin: 8px 0 0; font-size: 14px; opacity: 0.85; }
            .body { padding: 35px 30px; line-height: 1.6; }
            .body h2 { color: #0f172a; font-size: 20px; margin-top: 0; }
            .feature-box { background: #f8fafc; border-left: 4px solid #2563eb; padding: 16px 20px; margin: 20px 0; border-radius: 0 8px 8px 0; }
            .feature-box ul { margin: 0; padding-left: 18px; }
            .feature-box li { margin: 6px 0; font-size: 14px; color: #475569; }
            .btn { display: inline-block; background-color: #2563eb; color: #ffffff !important; padding: 14px 28px; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 15px; margin: 25px 0 10px; }
            .footer { background: #f8fafc; padding: 25px 30px; text-align: center; font-size: 12px; color: #64748b; border-top: 1px solid #e2e8f0; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>NIMI KINGS LTD</h1>
              <p>Real Estate • Due Diligence • Construction • Agriculture</p>
            </div>
            <div class="body">
              <h2>Welcome, ${name}!</h2>
              <p>Thank you for creating an account with <strong>NIMI KINGS LTD</strong>. We are thrilled to partner with you as you explore prime properties, verified land titles, and investment assets across Nigeria.</p>
              
              <div class="feature-box">
                <strong>What you can do on your account:</strong>
                <ul>
                  <li><strong>Verified Real Estate:</strong> Browse prime properties with authentic C of O, Deed, and Government Consents.</li>
                  <li><strong>Book Site Inspections:</strong> Schedule on-site visits with our licensed field agents with a single click.</li>
                  <li><strong>Real-Time Tracking:</strong> Follow your enquiries, construction milestones, and transaction status in real-time.</li>
                  <li><strong>Instant Support:</strong> Connect directly with assigned consultants via our live chat platform.</li>
                </ul>
              </div>

              <p>Ready to start? Access your customer dashboard to personalize your property preferences.</p>
              <div style="text-align: center;">
                <a href="https://www.nimikingsltd.com/dashboard" class="btn">Explore Your Dashboard</a>
              </div>
            </div>
            <div class="footer">
              <p>© ${new Date().getFullYear()} NIMI KINGS LTD. All rights reserved.</p>
              <p>For inquiries, contact us at <a href="mailto:support@nimikingsltd.com" style="color: #2563eb;">support@nimikingsltd.com</a> or visit <a href="https://www.nimikingsltd.com" style="color: #2563eb;">www.nimikingsltd.com</a>.</p>
            </div>
          </div>
        </body>
      </html>
    `;
    const text = `Welcome to NIMI KINGS LTD, ${name}!\n\nYour account has been registered successfully. You can now browse verified properties, book site visits, and track your transactions at https://www.nimikingsltd.com/dashboard.\n\nNIMI KINGS LTD Team`;

    return this.sendMail({ to, subject, html, text });
  }

  async sendPasswordResetEmail(
    to: string,
    name: string,
    token: string,
    resetUrl?: string,
  ): Promise<boolean> {
    const subject = 'Reset Your NIMI KINGS Password';
    const fallbackUrl =
      resetUrl || `https://www.nimikingsltd.com/auth/reset-password?token=${token}`;

    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f4f7f6; margin: 0; padding: 0; color: #1e293b; }
            .container { max-width: 600px; margin: 30px auto; background: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 12px rgba(0,0,0,0.06); }
            .header { background: linear-gradient(135deg, #0f172a 0%, #1e3a8a 100%); padding: 35px 30px; text-align: center; color: #ffffff; }
            .header h1 { margin: 0; font-size: 24px; font-weight: 700; }
            .body { padding: 35px 30px; line-height: 1.6; }
            .token-card { background: #f1f5f9; border: 1px dashed #94a3b8; border-radius: 8px; padding: 18px; text-align: center; margin: 25px 0; }
            .token-code { font-family: 'Courier New', monospace; font-size: 28px; font-weight: 700; letter-spacing: 4px; color: #1e3a8a; }
            .btn { display: inline-block; background-color: #2563eb; color: #ffffff !important; padding: 14px 28px; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 15px; margin: 15px 0 25px; }
            .footer { background: #f8fafc; padding: 25px 30px; text-align: center; font-size: 12px; color: #64748b; border-top: 1px solid #e2e8f0; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>Password Reset Request</h1>
            </div>
            <div class="body">
              <p>Hello <strong>${name}</strong>,</p>
              <p>We received a request to reset the password for your NIMI KINGS account. You can use the security code below or click the button to set a new password:</p>

              <div class="token-card">
                <span class="token-code">${token}</span>
                <p style="margin: 8px 0 0; font-size: 12px; color: #64748b;">This security token expires in 15 minutes.</p>
              </div>

              <div style="text-align: center;">
                <a href="${fallbackUrl}" class="btn">Reset Password</a>
              </div>

              <p style="font-size: 13px; color: #64748b;">If you did not request a password reset, please ignore this email or contact support immediately if you suspect unauthorized activity. Your current password remains secure.</p>
            </div>
            <div class="footer">
              <p>© ${new Date().getFullYear()} NIMI KINGS LTD. All rights reserved.</p>
              <p>Security & Account Protection • <a href="mailto:security@nimikingsltd.com" style="color: #2563eb;">security@nimikingsltd.com</a></p>
            </div>
          </div>
        </body>
      </html>
    `;
    const text = `Hello ${name},\n\nWe received a request to reset your password. Use the token code below:\n\n${token}\n\nReset Link: ${fallbackUrl}\n\nThis token will expire in 15 minutes. If you did not request this, please disregard this email.`;

    return this.sendMail({ to, subject, html, text });
  }

  async sendPasswordChangedAlert(to: string, name: string): Promise<boolean> {
    const subject = 'Security Alert: Your NIMI KINGS Password Was Changed';
    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f4f7f6; margin: 0; padding: 0; color: #1e293b; }
            .container { max-width: 600px; margin: 30px auto; background: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 12px rgba(0,0,0,0.06); }
            .header { background: #0f172a; padding: 30px; text-align: center; color: #ffffff; }
            .body { padding: 35px 30px; line-height: 1.6; }
            .alert-box { background: #fef2f2; border-left: 4px solid #ef4444; padding: 16px 20px; margin: 20px 0; border-radius: 0 8px 8px 0; color: #991b1b; }
            .footer { background: #f8fafc; padding: 25px 30px; text-align: center; font-size: 12px; color: #64748b; border-top: 1px solid #e2e8f0; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h2 style="margin: 0;">Security Notification</h2>
            </div>
            <div class="body">
              <p>Hello <strong>${name}</strong>,</p>
              <div class="alert-box">
                <strong>Password Successfully Changed</strong><br>
                The password for your account (${to}) was updated on ${new Date().toUTCString()}.
              </div>
              <p>All previous sessions and device refresh tokens have been revoked for your safety.</p>
              <p>If you made this change, no further action is needed. If you did <strong>NOT</strong> perform this change, please contact our security team immediately at <a href="mailto:security@nimikingsltd.com" style="color: #ef4444; font-weight: 600;">security@nimikingsltd.com</a>.</p>
            </div>
            <div class="footer">
              <p>© ${new Date().getFullYear()} NIMI KINGS LTD. Security & Trust Operations.</p>
            </div>
          </div>
        </body>
      </html>
    `;
    const text = `Hello ${name},\n\nYour NIMI KINGS password was successfully updated on ${new Date().toUTCString()}.\n\nIf you did not make this change, please contact security@nimikingsltd.com immediately.`;

    return this.sendMail({ to, subject, html, text });
  }
}
