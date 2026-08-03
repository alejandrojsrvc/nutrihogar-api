import {
  CanActivate,
  ExecutionContext,
  Inject,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { InvalidIdentityError } from '../../application/errors/invalid-identity.error';
import {
  GET_CURRENT_USER_USE_CASE,
  GetCurrentUserUseCase,
} from '../../application/use-cases/get-current-user.use-case';
import { AuthenticatedRequest } from './authenticated-request';

function extractBearerToken(authorization: string | undefined): string | null {
  const match = /^Bearer\s+(.+)$/i.exec(authorization ?? '');

  return match?.[1] ?? null;
}

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    @Inject(GET_CURRENT_USER_USE_CASE)
    private readonly getCurrentUser: GetCurrentUserUseCase,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const accessToken = extractBearerToken(request.headers.authorization);

    if (!accessToken) {
      throw new UnauthorizedException('Authentication is required.');
    }

    try {
      request.user = await this.getCurrentUser.execute(accessToken);
      return true;
    } catch (error) {
      if (error instanceof InvalidIdentityError) {
        throw new UnauthorizedException('Invalid or expired access token.');
      }

      throw error;
    }
  }
}
