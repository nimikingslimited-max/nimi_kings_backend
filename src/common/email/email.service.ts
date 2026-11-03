import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import nodemailer, { Transporter } from 'nodemailer';

export interface SendMailOptions {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

export interface SendMailResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

@Injectable()
export class EmailService implements OnModuleInit {
  private readonly logger = new Logger(EmailService.name);
  private transporter: Transporter | null = null;
  private readonly fromAddress: string;

  constructor(private readonly configService: ConfigService) {
    const host = this.configService.get<string>('SMTP_HOST');
    const port = Number(this.configService.get<number>('SMTP_PORT')) || 465;
    const secureVal = this.configService.get<string>('SMTP_SECURE');
    const secure =
      secureVal !== undefined ? secureVal === 'true' || secureVal === '1' : port === 465;
    const user = this.configService.get<string>('SMTP_USER');
    const pass = this.configService.get<string>('SMTP_PASS');
    this.fromAddress =
      this.configService.get<string>('SMTP_FROM') ||
      (user ? `"NIMI KINGS LTD" <${user}>` : '"NIMI KINGS LTD" <noreply@nimikingsltd.com>');

    if (host && user && pass) {
      this.transporter = nodemailer.createTransport({
        host,
        port,
        secure,
        auth: { user, pass },
        tls: {
          rejectUnauthorized: false,
        },
      });
      this.logger.log(`📧 SMTP Transporter initialized (host: ${host}, port: ${port}, secure: ${secure})`);
    } else {
      this.logger.warn(
        '⚠️ SMTP credentials not fully configured in .env. EmailService running in Development Console mode.',
      );
    }
  }

  async onModuleInit() {
    if (this.transporter) {
      try {
        await this.transporter.verify();
        this.logger.log(
          `✅ [EmailService] SMTP connection verified successfully! Ready to dispatch live emails.`,
        );
      } catch (err: any) {
        this.logger.error(
          `❌ [EmailService] SMTP verification failed: ${err.message}. If using Gmail, make sure to generate a 16-character App Password at https://myaccount.google.com/apppasswords`,
        );
      }
    }
  }

  isConfigured(): boolean {
    return this.transporter !== null;
  }

  async sendMail(options: SendMailOptions): Promise<SendMailResult> {
    try {
      if (this.transporter) {
        const info = await this.transporter.sendMail({
          from: this.fromAddress,
          to: options.to,
          subject: options.subject,
          html: options.html,
          text: options.text,
        });
        this.logger.log(`✅ Email delivered to ${options.to} (MessageId: ${info.messageId}) [${options.subject}]`);
        return { success: true, messageId: info.messageId };
      } else {
        // Fallback logger in dev mode with clearly formatted banner
        this.logger.warn(`⚠️ [DEV EMAIL SIMULATION - NO SMTP CONFIGURED]`);
        this.logger.log(
          `\n============================== 📨 OUTGOING EMAIL ==============================\n` +
          `TO:      ${options.to}\n` +
          `FROM:    ${this.fromAddress}\n` +
          `SUBJECT: ${options.subject}\n` +
          `TIME:    ${new Date().toISOString()}\n` +
          `---------------------------------- CONTENT ------------------------------------\n` +
          `${options.text || options.html.replace(/<[^>]*>?/gm, ' ').replace(/\s+/g, ' ').trim()}\n` +
          `===============================================================================\n`,
        );
        return { success: true };
      }
    } catch (error: any) {
      this.logger.error(
        `❌ Failed to dispatch email to ${options.to}: ${error.message}`,
        error.stack,
      );
      return { success: false, error: error.message };
    }
  }

  async sendEmailVerificationCode(
    to: string,
    name: string,
    code: string,
    verifyUrl?: string,
  ): Promise<boolean> {
    const subject = 'Verify Your Email Address – NIMI KINGS LTD';
    const fallbackUrl =
      verifyUrl || `https://www.nimikingsltd.com/auth/verify-email?code=${code}&email=${encodeURIComponent(to)}`;

    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f4f7f6; margin: 0; padding: 0; color: #1e293b; }
            .container { max-width: 600px; margin: 30px auto; background: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 12px rgba(0,0,0,0.06); }
            .header { background: linear-gradient(135deg, #0f172a 0%, #1e3a8a 100%); padding: 35px 30px; text-align: center; color: #ffffff; }
            .header h1 { margin: 0; font-size: 24px; font-weight: 700; letter-spacing: 0.5px; }
            .header p { margin: 6px 0 0; font-size: 13px; opacity: 0.85; }
            .body { padding: 35px 30px; line-height: 1.6; }
            .code-box { background: #f8fafc; border: 2px dashed #2563eb; border-radius: 8px; padding: 22px; text-align: center; margin: 25px 0; }
            .code-digits { font-family: 'Courier New', monospace; font-size: 34px; font-weight: 800; letter-spacing: 8px; color: #1e3a8a; }
            .btn { display: inline-block; background-color: #2563eb; color: #ffffff !important; padding: 14px 28px; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 15px; margin: 15px 0 20px; }
            .footer { background: #f8fafc; padding: 25px 30px; text-align: center; font-size: 12px; color: #64748b; border-top: 1px solid #e2e8f0; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>NIMI KINGS LTD</h1>
              <p>Email Verification</p>
            </div>
            <div class="body">
              <p>Hello <strong>${name}</strong>,</p>
              <p>Thank you for registering with <strong>NIMI KINGS LTD</strong>. To activate your account and complete your registration, please verify your email address using the 6-digit verification code below:</p>

              <div class="code-box">
                <span class="code-digits">${code}</span>
                <p style="margin: 8px 0 0; font-size: 12px; color: #64748b;">This verification code is valid for 24 hours.</p>
              </div>

              <div style="text-align: center;">
                <a href="${fallbackUrl}" class="btn">Verify Email Address</a>
              </div>

              <p style="font-size: 13px; color: #64748b;">If you did not register an account with NIMI KINGS LTD, please disregard this email.</p>
            </div>
            <div class="footer">
              <p>© ${new Date().getFullYear()} NIMI KINGS LTD. All rights reserved.</p>
              <p>Account Activation • <a href="mailto:support@nimikingsltd.com" style="color: #2563eb;">support@nimikingsltd.com</a></p>
            </div>
          </div>
        </body>
      </html>
    `;
    const text = `Hello ${name},\n\nThank you for registering with NIMI KINGS LTD. Your email verification code is:\n\n${code}\n\nOr click here to verify: ${fallbackUrl}\n\nThis code expires in 24 hours.`;

    const res = await this.sendMail({ to, subject, html, text });
    return res.success;
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
              <p>Thank you for verifying your email and activating your account with <strong>NIMI KINGS LTD</strong>. We are thrilled to partner with you as you explore prime properties, verified land titles, and investment assets across Nigeria.</p>
              
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
    const text = `Welcome to NIMI KINGS LTD, ${name}!\n\nYour account has been verified and activated successfully. You can now browse verified properties, book site visits, and track your transactions at https://www.nimikingsltd.com/dashboard.\n\nNIMI KINGS LTD Team`;

    const res = await this.sendMail({ to, subject, html, text });
    return res.success;
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

    const res = await this.sendMail({ to, subject, html, text });
    return res.success;
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

    const res = await this.sendMail({ to, subject, html, text });
    return res.success;
  }

  async sendTestEmail(to: string): Promise<{ success: boolean; message: string; messageId?: string }> {
    const subject = 'Test Email – NIMI KINGS LTD System Verification';
    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f4f7f6; margin: 0; padding: 0; color: #1e293b; }
            .container { max-width: 600px; margin: 30px auto; background: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 12px rgba(0,0,0,0.06); }
            .header { background: linear-gradient(135deg, #0f172a 0%, #1e3a8a 100%); padding: 35px 30px; text-align: center; color: #ffffff; }
            .header h1 { margin: 0; font-size: 22px; font-weight: 700; }
            .body { padding: 35px 30px; line-height: 1.6; }
            .status-badge { display: inline-block; background-color: #dcfce7; color: #166534; font-weight: 700; font-size: 14px; padding: 6px 14px; border-radius: 9999px; margin-bottom: 15px; }
            .info-box { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 18px; margin: 20px 0; font-size: 14px; }
            .footer { background: #f8fafc; padding: 25px 30px; text-align: center; font-size: 12px; color: #64748b; border-top: 1px solid #e2e8f0; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>NIMI KINGS LTD</h1>
              <p style="margin: 5px 0 0; opacity: 0.8; font-size: 13px;">Email Subsystem Verification</p>
            </div>
            <div class="body">
              <span class="status-badge">✅ Email System Operational</span>
              <p>Hello,</p>
              <p>This is a test notification confirming that the NIMI KINGS LTD transactional email delivery subsystem has been configured successfully and is live.</p>
              
              <div class="info-box">
                <strong>Subsystem Status Details:</strong><br>
                • Recipient: ${to}<br>
                • Dispatch Time: ${new Date().toUTCString()}<br>
                • Environment: ${this.configService.get('NODE_ENV') || 'development'}<br>
                • From Address: ${this.fromAddress}
              </div>

              <p>Emails for email verification OTPs, welcome messages, password resets, and transaction alerts will now be delivered via this channel.</p>
            </div>
            <div class="footer">
              <p>© ${new Date().getFullYear()} NIMI KINGS LTD. All rights reserved.</p>
            </div>
          </div>
        </body>
      </html>
    `;
    const text = `NIMI KINGS LTD - Email Subsystem Test\n\nThis is a test email confirming that email delivery is working properly.\nRecipient: ${to}\nTimestamp: ${new Date().toUTCString()}\nFrom: ${this.fromAddress}`;

    const res = await this.sendMail({ to, subject, html, text });
    if (res.success) {
      return {
        success: true,
        message: `Test email successfully sent to ${to}`,
        messageId: res.messageId,
      };
    } else {
      return {
        success: false,
        message: `Failed to deliver test email: ${res.error || 'Unknown error'}`,
      };
    }
  }
}
