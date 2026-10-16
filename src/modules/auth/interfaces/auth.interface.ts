import { UserRole } from '../../users/enums/user-role.enum.js';

export interface JwtPayload {
  sub: string;
  email: string;
  role: UserRole;
  sessionId?: string;
}

export interface Tokens {
  accessToken: string;
  refreshToken: string;
}
