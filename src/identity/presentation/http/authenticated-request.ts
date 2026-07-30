import { Request } from 'express';
import { CurrentUser } from '../../application/models/current-user';

export type AuthenticatedRequest = Request & {
  user?: CurrentUser;
};
