import { CurrentUser } from './current-user';

export interface AuthenticationResult {
  accessToken: string;
  refreshToken: string;
  user: CurrentUser;
}
