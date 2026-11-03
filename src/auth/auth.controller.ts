import {
  Controller,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  Get,
  Headers,
  Ip,
  HttpCode,
  HttpStatus,
  UseGuards,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
} from '@nestjs/swagger';
import { AuthService } from './auth.service.js';
import { RegisterDto } from './dto/register.dto.js';
import { LoginDto } from './dto/login.dto.js';
import { RefreshTokenDto } from './dto/refresh-token.dto.js';
import { ForgotPasswordDto } from './dto/forgot-password.dto.js';
import { ResetPasswordDto } from './dto/reset-password.dto.js';
import { ChangePasswordDto } from './dto/change-password.dto.js';
import { VerifyEmailDto } from './dto/verify-email.dto.js';
import { ResendVerificationDto } from './dto/resend-verification.dto.js';
import { TestEmailDto } from './dto/test-email.dto.js';
import { Public } from '../common/decorators/public.decorator.js';
import { CurrentUser } from '../common/decorators/current-user.decorator.js';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard.js';

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Public()
  @Post('register')
  @ApiOperation({
    summary:
      'Register a new Customer or Agent account (dispatches 6-digit email verification code)',
  })
  @ApiResponse({
    status: 201,
    description:
      'Account created with PENDING status, verification code sent to email',
  })
  @ApiResponse({
    status: 409,
    description: 'Email or phone number already in use',
  })
  async register(@Body() dto: RegisterDto) {
    return this.authService.register(dto);
  }

  @Public()
  @Post('verify-email')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary:
      'Verify customer/agent email address with 6-digit code and activate account',
  })
  @ApiResponse({
    status: 200,
    description:
      'Email verified, account activated, and authentication tokens issued',
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid or expired verification code',
  })
  async verifyEmail(
    @Body() dto: VerifyEmailDto,
    @Headers('user-agent') userAgent?: string,
    @Ip() ip?: string,
  ) {
    return this.authService.verifyEmail(dto, userAgent, ip);
  }

  @Public()
  @Post('resend-verification')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary:
      'Resend a fresh 6-digit email verification code to an unverified account',
  })
  @ApiResponse({
    status: 200,
    description: 'Verification code dispatched if account is pending',
  })
  async resendVerification(@Body() dto: ResendVerificationDto) {
    return this.authService.resendVerificationCode(dto);
  }

  @Public()
  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Log in with email and password' })
  @ApiResponse({
    status: 200,
    description: 'Login successful with access & refresh tokens',
  })
  @ApiResponse({ status: 401, description: 'Invalid email or password' })
  async login(
    @Body() dto: LoginDto,
    @Headers('user-agent') userAgent?: string,
    @Ip() ip?: string,
  ) {
    return this.authService.login(dto, userAgent, ip);
  }

  @Public()
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Rotate refresh token and issue a fresh access token',
  })
  @ApiResponse({ status: 200, description: 'Tokens rotated successfully' })
  @ApiResponse({ status: 401, description: 'Invalid or expired refresh token' })
  async refreshTokens(
    @Body() dto: RefreshTokenDto,
    @Headers('user-agent') userAgent?: string,
    @Ip() ip?: string,
  ) {
    return this.authService.refreshTokens(dto.refreshToken, userAgent, ip);
  }

  @Public()
  @Post('forgot-password')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary:
      'Request password reset email with secure 6-digit verification code',
  })
  @ApiResponse({
    status: 200,
    description: 'Password reset email dispatched if account exists',
  })
  async forgotPassword(@Body() dto: ForgotPasswordDto) {
    return this.authService.forgotPassword(dto);
  }

  @Public()
  @Post('reset-password')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary:
      'Reset account password using the security token/PIN received in email',
  })
  @ApiResponse({
    status: 200,
    description: 'Password reset successfully',
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid, expired, or already used reset token',
  })
  async resetPassword(@Body() dto: ResetPasswordDto) {
    return this.authService.resetPassword(dto);
  }

  @UseGuards(JwtAuthGuard)
  @Patch('change-password')
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary:
      'Change password for authenticated user (requires current password verification)',
  })
  @ApiResponse({
    status: 200,
    description: 'Password changed successfully',
  })
  @ApiResponse({
    status: 400,
    description: 'Current password does not match or validation failed',
  })
  async changePassword(
    @CurrentUser('id') userId: string,
    @Body() dto: ChangePasswordDto,
  ) {
    return this.authService.changePassword(userId, dto);
  }

  @UseGuards(JwtAuthGuard)
  @Post('logout')
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Revoke user refresh tokens and log out' })
  @ApiResponse({ status: 200, description: 'Logged out successfully' })
  async logout(@CurrentUser('id') userId: string) {
    return this.authService.logout(userId);
  }

  @UseGuards(JwtAuthGuard)
  @Get('me')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'Get current authenticated user identity and active roles',
  })
  @ApiResponse({
    status: 200,
    description: 'Returns authenticated user identity',
  })
  async getMe(@CurrentUser() user: any) {
    return {
      user,
    };
  }

  // ==========================================
  // SESSION MANAGEMENT
  // ==========================================

  @UseGuards(JwtAuthGuard)
  @Get('sessions')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'Get all active login sessions / devices for authenticated user',
  })
  @ApiResponse({
    status: 200,
    description: 'List of active sessions with device and IP information',
  })
  getActiveSessions(@CurrentUser('id') userId: string) {
    return this.authService.getActiveSessions(userId);
  }

  @UseGuards(JwtAuthGuard)
  @Delete('sessions/:sessionId')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'Remotely revoke a specific active login session',
  })
  @ApiParam({ name: 'sessionId', description: 'Refresh token session UUID' })
  @ApiResponse({
    status: 200,
    description: 'Session revoked successfully',
  })
  revokeSession(
    @CurrentUser('id') userId: string,
    @Param('sessionId') sessionId: string,
  ) {
    return this.authService.revokeSession(userId, sessionId);
  }

  @UseGuards(JwtAuthGuard)
  @Post('revoke-other-sessions')
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'Revoke all other active sessions and log out of all other devices',
  })
  @ApiResponse({
    status: 200,
    description: 'All other sessions revoked successfully',
  })
  revokeOtherSessions(@CurrentUser('id') userId: string) {
    return this.authService.revokeOtherSessions(userId);
  }

  @Public()
  @Post('test-email')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Test email delivery subsystem',
    description:
      'Dispatches a test verification email to confirm that SMTP credentials and delivery are active.',
  })
  @ApiResponse({
    status: 200,
    description: 'Email test result with delivery status or dev console simulation',
  })
  testEmail(@Body() dto: TestEmailDto) {
    return this.authService.testEmail(dto.email);
  }
}
