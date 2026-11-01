import {
  Injectable,
  ConflictException,
  UnauthorizedException,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import bcrypt from 'bcryptjs';
import { RoleType } from '@prisma/client';
import { PrismaService } from '../common/prisma/prisma.service.js';
import { EmailService } from '../common/email/email.service.js';
import { RegisterDto } from './dto/register.dto.js';
import { LoginDto } from './dto/login.dto.js';
import { ForgotPasswordDto } from './dto/forgot-password.dto.js';
import { ResetPasswordDto } from './dto/reset-password.dto.js';
import { ChangePasswordDto } from './dto/change-password.dto.js';
import { VerifyEmailDto } from './dto/verify-email.dto.js';
import { ResendVerificationDto } from './dto/resend-verification.dto.js';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly emailService: EmailService,
  ) {}

  async register(dto: RegisterDto) {
    const existing = await this.prisma.user.findFirst({
      where: {
        OR: [
          { email: dto.email.toLowerCase() },
          dto.phone ? { phone: dto.phone } : {},
        ],
      },
    });

    if (existing) {
      throw new ConflictException(
        'An account with this email or phone number already exists',
      );
    }

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(dto.password, salt);

    const roleName = dto.role ?? RoleType.CUSTOMER;

    // Ensure role exists in the database
    let role = await this.prisma.role.findUnique({
      where: { name: roleName },
    });

    if (!role) {
      role = await this.prisma.role.create({
        data: {
          name: roleName,
          description: `Default system role for ${roleName}`,
        },
      });
    }

    // Create user, profile, and email verification token in a single atomic transaction
    const { user, verificationCode } = await this.prisma.$transaction(
      async (tx) => {
        const newUser = await tx.user.create({
          data: {
            firstName: dto.firstName,
            lastName: dto.lastName,
            email: dto.email.toLowerCase(),
            phone: dto.phone,
            passwordHash,
            status: 'PENDING',
            userRoles: {
              create: {
                roleId: role.id,
              },
            },
          },
        });

        if (roleName === RoleType.CUSTOMER) {
          await tx.customerProfile.create({
            data: {
              userId: newUser.id,
            },
          });
        } else if (roleName === RoleType.AGENT) {
          const agentCode = `NK-AG-${Math.floor(1000 + Math.random() * 9000)}`;
          await tx.agentProfile.create({
            data: {
              userId: newUser.id,
              agentCode,
            },
          });
        }

        // Generate 6-digit email verification code
        const code = Math.floor(100000 + Math.random() * 900000).toString();
        const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

        await tx.emailVerificationToken.create({
          data: {
            userId: newUser.id,
            token: code,
            expiresAt,
          },
        });

        return { user: newUser, verificationCode: code };
      },
      {
        maxWait: 10000,
        timeout: 20000,
      },
    );

    // Send Email Verification Code asynchronously
    this.emailService
      .sendEmailVerificationCode(user.email, user.firstName, verificationCode)
      .catch((err) => {
        // Non-blocking error handling
      });

    return {
      message:
        'Account successfully registered. Please verify your email using the 6-digit code sent to your inbox before logging in.',
      user: {
        id: user.id,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        phone: user.phone,
        status: user.status,
        roles: [roleName],
      },
    };
  }

  async login(dto: LoginDto) {
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email.toLowerCase() },
      include: {
        userRoles: {
          include: {
            role: true,
          },
        },
      },
    });

    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    if (!user.emailVerifiedAt || user.status === 'PENDING') {
      throw new UnauthorizedException(
        'Your email address has not been verified yet. Please check your email for the verification code or request a new one.',
      );
    }

    if (user.status !== 'ACTIVE') {
      throw new UnauthorizedException(
        `Account is currently ${user.status}. Please contact support.`,
      );
    }

    const isMatch = await bcrypt.compare(dto.password, user.passwordHash);
    if (!isMatch) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const roles = user.userRoles.map((ur) => ur.role.name);
    const tokens = await this.generateTokens(user.id, user.email, roles);

    await this.storeRefreshToken(user.id, tokens.refreshToken);

    await this.prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });

    return {
      message: 'Login successful',
      user: {
        id: user.id,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        phone: user.phone,
        roles,
      },
      tokens,
    };
  }

  async refreshTokens(refreshToken: string) {
    try {
      const refreshSecret =
        this.configService.get<string>('JWT_REFRESH_SECRET') ||
        'nimi_kings_super_secret_refresh_jwt_key_2026';

      const decoded = this.jwtService.verify(refreshToken, {
        secret: refreshSecret,
      });

      const user = await this.prisma.user.findUnique({
        where: { id: decoded.sub },
        include: {
          userRoles: {
            include: {
              role: true,
            },
          },
          refreshTokens: {
            where: { isRevoked: false },
          },
        },
      });

      if (!user || user.status !== 'ACTIVE') {
        throw new UnauthorizedException('Invalid token or inactive user');
      }

      // Check if matching refresh token exists
      let matchedTokenRecord = null;
      for (const tokenRecord of user.refreshTokens) {
        const isMatch = await bcrypt.compare(
          refreshToken,
          tokenRecord.tokenHash,
        );
        if (isMatch) {
          matchedTokenRecord = tokenRecord;
          break;
        }
      }

      if (!matchedTokenRecord || matchedTokenRecord.expiresAt < new Date()) {
        throw new UnauthorizedException('Invalid or expired refresh token');
      }

      // Revoke the used refresh token (Token rotation pattern)
      await this.prisma.refreshToken.update({
        where: { id: matchedTokenRecord.id },
        data: { isRevoked: true },
      });

      const roles = user.userRoles.map((ur) => ur.role.name);
      const newTokens = await this.generateTokens(user.id, user.email, roles);

      await this.storeRefreshToken(user.id, newTokens.refreshToken);

      return {
        message: 'Tokens refreshed successfully',
        tokens: newTokens,
      };
    } catch {
      throw new UnauthorizedException('Invalid refresh token');
    }
  }

  async logout(userId: string) {
    await this.prisma.refreshToken.updateMany({
      where: { userId, isRevoked: false },
      data: { isRevoked: true },
    });

    return { message: 'Logged out successfully' };
  }

  async verifyEmail(dto: VerifyEmailDto) {
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email.toLowerCase() },
      include: {
        userRoles: {
          include: {
            role: true,
          },
        },
      },
    });

    if (!user) {
      throw new BadRequestException('Invalid email or verification code.');
    }

    if (user.emailVerifiedAt && user.status === 'ACTIVE') {
      return {
        message: 'Email is already verified. You can proceed to log in.',
      };
    }

    const verificationRecord =
      await this.prisma.emailVerificationToken.findFirst({
        where: {
          userId: user.id,
          token: dto.code.trim(),
          isUsed: false,
        },
        orderBy: { createdAt: 'desc' },
      });

    if (!verificationRecord || verificationRecord.expiresAt < new Date()) {
      throw new BadRequestException(
        'Invalid or expired email verification code. Please request a new one.',
      );
    }

    // Activate user and mark verification code as used
    await this.prisma.$transaction([
      this.prisma.user.update({
        where: { id: user.id },
        data: {
          status: 'ACTIVE',
          emailVerifiedAt: new Date(),
        },
      }),
      this.prisma.emailVerificationToken.update({
        where: { id: verificationRecord.id },
        data: { isUsed: true },
      }),
    ]);

    // Send Welcome Email once email is verified
    this.emailService
      .sendWelcomeEmail(user.email, user.firstName)
      .catch(() => {});

    // Generate tokens so user is immediately logged in upon email verification
    const roles = user.userRoles.map((ur) => ur.role.name);
    const tokens = await this.generateTokens(user.id, user.email, roles);
    await this.storeRefreshToken(user.id, tokens.refreshToken);

    return {
      message: 'Email verified successfully. Your account is now active.',
      user: {
        id: user.id,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        phone: user.phone,
        roles,
      },
      tokens,
    };
  }

  async resendVerificationCode(dto: ResendVerificationDto) {
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email.toLowerCase() },
    });

    if (user && user.emailVerifiedAt && user.status === 'ACTIVE') {
      return {
        message:
          'This email address is already verified. You can log in directly.',
      };
    }

    if (user && user.status === 'PENDING') {
      // Invalidate previous unused codes
      await this.prisma.emailVerificationToken.updateMany({
        where: { userId: user.id, isUsed: false },
        data: { isUsed: true },
      });

      // Generate fresh 6-digit code
      const code = Math.floor(100000 + Math.random() * 900000).toString();
      const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

      await this.prisma.emailVerificationToken.create({
        data: {
          userId: user.id,
          token: code,
          expiresAt,
        },
      });

      this.emailService
        .sendEmailVerificationCode(user.email, user.firstName, code)
        .catch(() => {});
    }

    return {
      message:
        'If an unverified account exists with this email address, a new verification code has been dispatched.',
    };
  }

  async forgotPassword(dto: ForgotPasswordDto) {
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email.toLowerCase() },
    });

    if (user && user.status === 'ACTIVE') {
      // Generate a user-friendly 6-digit security token code
      const token = `NK-${Math.floor(100000 + Math.random() * 900000)}`;
      const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 mins expiry

      // Invalidate any previous unused reset tokens
      await this.prisma.passwordResetToken.updateMany({
        where: { userId: user.id, isUsed: false },
        data: { isUsed: true },
      });

      await this.prisma.passwordResetToken.create({
        data: {
          userId: user.id,
          token,
          expiresAt,
        },
      });

      // Send the email with the reset code
      this.emailService
        .sendPasswordResetEmail(user.email, user.firstName, token)
        .catch(() => {});
    }

    // Always return a generic success response to prevent email enumeration
    return {
      message:
        'If an account exists with this email address, a password reset code has been sent.',
    };
  }

  async resetPassword(dto: ResetPasswordDto) {
    const resetRecord = await this.prisma.passwordResetToken.findUnique({
      where: { token: dto.token.trim() },
      include: { user: true },
    });

    if (
      !resetRecord ||
      resetRecord.isUsed ||
      resetRecord.expiresAt < new Date()
    ) {
      throw new BadRequestException(
        'Invalid, expired, or already used password reset token.',
      );
    }

    const salt = await bcrypt.genSalt(10);
    const newPasswordHash = await bcrypt.hash(dto.newPassword, salt);

    // Update password, mark token as used, and revoke all active refresh tokens
    await this.prisma.$transaction([
      this.prisma.user.update({
        where: { id: resetRecord.userId },
        data: { passwordHash: newPasswordHash },
      }),
      this.prisma.passwordResetToken.update({
        where: { id: resetRecord.id },
        data: { isUsed: true },
      }),
      this.prisma.refreshToken.updateMany({
        where: { userId: resetRecord.userId, isRevoked: false },
        data: { isRevoked: true },
      }),
    ]);

    // Send confirmation alert
    this.emailService
      .sendPasswordChangedAlert(
        resetRecord.user.email,
        resetRecord.user.firstName,
      )
      .catch(() => {});

    return {
      message:
        'Your password has been reset successfully. Please log in with your new credentials.',
    };
  }

  async changePassword(userId: string, dto: ChangePasswordDto) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    const isMatch = await bcrypt.compare(
      dto.currentPassword,
      user.passwordHash,
    );
    if (!isMatch) {
      throw new BadRequestException('Current password does not match');
    }

    const salt = await bcrypt.genSalt(10);
    const newPasswordHash = await bcrypt.hash(dto.newPassword, salt);

    await this.prisma.$transaction([
      this.prisma.user.update({
        where: { id: userId },
        data: { passwordHash: newPasswordHash },
      }),
      this.prisma.refreshToken.updateMany({
        where: { userId, isRevoked: false },
        data: { isRevoked: true },
      }),
    ]);

    this.emailService
      .sendPasswordChangedAlert(user.email, user.firstName)
      .catch(() => {});

    return {
      message:
        'Password changed successfully. All previous sessions have been invalidated.',
    };
  }

  private async generateTokens(
    userId: string,
    email: string,
    roles: string[],
  ) {
    const payload = { sub: userId, email, roles };

    const accessSecret =
      this.configService.get<string>('JWT_ACCESS_SECRET') ||
      'nimi_kings_super_secret_access_jwt_key_2026';
    const accessExpiration =
      this.configService.get<string>('JWT_ACCESS_EXPIRATION') || '15m';

    const refreshSecret =
      this.configService.get<string>('JWT_REFRESH_SECRET') ||
      'nimi_kings_super_secret_refresh_jwt_key_2026';
    const refreshExpiration =
      this.configService.get<string>('JWT_REFRESH_EXPIRATION') || '7d';

    const [accessToken, refreshToken] = await Promise.all([
      this.jwtService.signAsync(payload, {
        secret: accessSecret,
        expiresIn: accessExpiration as any,
      }),
      this.jwtService.signAsync(payload, {
        secret: refreshSecret,
        expiresIn: refreshExpiration as any,
      }),
    ]);

    return {
      accessToken,
      refreshToken,
      tokenType: 'Bearer',
      expiresIn: accessExpiration,
    };
  }

  private async storeRefreshToken(userId: string, refreshToken: string) {
    const salt = await bcrypt.genSalt(10);
    const tokenHash = await bcrypt.hash(refreshToken, salt);

    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    await this.prisma.refreshToken.create({
      data: {
        userId,
        tokenHash,
        expiresAt,
      },
    });
  }
}
