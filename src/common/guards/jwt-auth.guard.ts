import {
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AuthGuard } from '@nestjs/passport';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator.js';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  constructor(private reflector: Reflector) {
    super();
  }

  canActivate(context: ExecutionContext) {
    if (context.getType() === 'ws') {
      return true;
    }

    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (isPublic) {
      return true;
    }

    return super.canActivate(context);
  }

  handleRequest(err: any, user: any, info: any) {
    if (err || !user) {
      if (info?.name === 'TokenExpiredError') {
        throw new UnauthorizedException(
          'Your access token has expired (access tokens expire after 15 minutes). Use POST /auth/refresh-token with your refresh token to obtain a new access token, or log in again.',
        );
      }
      if (info?.name === 'JsonWebTokenError') {
        throw new UnauthorizedException(
          `Invalid authentication token (${info.message}). Make sure you are using the 'accessToken' (not 'refreshToken'), and do not prefix with an extra 'Bearer ' keyword if using Swagger UI.`,
        );
      }
      if (info?.message === 'No auth token' || !info) {
        throw new UnauthorizedException(
          'No authorization token was provided. Please include an "Authorization: Bearer <accessToken>" header in your request, or click the "Authorize" button in Swagger UI.',
        );
      }
      throw err || new UnauthorizedException(info?.message || 'Unauthorized access');
    }
    return user;
  }
}
