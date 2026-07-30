import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InvalidIdentityError } from '../../application/errors/invalid-identity.error';
import { AuthenticatedIdentity } from '../../application/models/authenticated-identity';
import { IdentityProvider } from '../../application/ports/identity-provider.port';

interface SupabaseAuthUserResponse {
  id?: unknown;
  email?: unknown;
  user_metadata?: unknown;
}

function readString(
  metadata: Record<string, unknown>,
  ...keys: string[]
): string | null {
  for (const key of keys) {
    const value = metadata[key];

    if (typeof value === 'string' && value.trim() !== '') {
      return value;
    }
  }

  return null;
}

function readMetadata(value: unknown): Record<string, unknown> {
  return typeof value === 'object' && value !== null
    ? (value as Record<string, unknown>)
    : {};
}

@Injectable()
export class SupabaseIdentityProvider implements IdentityProvider {
  private readonly supabaseUrl: string;
  private readonly publishableKey: string;

  constructor(configService: ConfigService) {
    this.supabaseUrl = (
      configService.get<string>('SUPABASE_URL') ?? ''
    ).replace(/\/+$/, '');
    this.publishableKey =
      configService.get<string>('SUPABASE_PUBLISHABLE_KEY') ?? '';
  }

  async verifyAccessToken(accessToken: string): Promise<AuthenticatedIdentity> {
    if (!this.supabaseUrl || !this.publishableKey) {
      throw new InvalidIdentityError();
    }

    let response: Response;

    try {
      response = await fetch(`${this.supabaseUrl}/auth/v1/user`, {
        headers: {
          Accept: 'application/json',
          apikey: this.publishableKey,
          Authorization: `Bearer ${accessToken}`,
        },
      });
    } catch {
      throw new InvalidIdentityError();
    }

    if (!response.ok) {
      throw new InvalidIdentityError();
    }

    let payload: SupabaseAuthUserResponse;

    try {
      payload = (await response.json()) as SupabaseAuthUserResponse;
    } catch {
      throw new InvalidIdentityError();
    }

    if (typeof payload.id !== 'string' || typeof payload.email !== 'string') {
      throw new InvalidIdentityError();
    }

    const metadata = readMetadata(payload.user_metadata);

    return {
      authProviderId: payload.id,
      email: payload.email,
      displayName: readString(
        metadata,
        'displayName',
        'display_name',
        'full_name',
        'name',
      ),
      avatarUrl: readString(metadata, 'avatarUrl', 'avatar_url', 'picture'),
      timezone: readString(metadata, 'timezone') ?? undefined,
      locale: readString(metadata, 'locale') ?? undefined,
    };
  }
}
