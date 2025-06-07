// TypeScript declaration to augment Express Request type
import { User } from '../../../shared/types';

declare global {
  namespace Express {
    interface Request {
      user?: User;
      sessionId?: string;
      sessionToken?: string;
    }
  }
}

export {};
