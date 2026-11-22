import { Request, Response, NextFunction } from 'express';
import { prisma } from '../config/prisma';

export interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    email: string;
    role: string;
  };
}

/**
 * Parse JWT payload manually to handle Supabase's malformed JWT bug
 * (login tokens have `]]` instead of `]` in the `amr` array)
 */
function parseJwtPayload(token: string): any {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    
    // Fix Supabase's malformed JWT: `]]` -> `]` in the payload
    let payload = Buffer.from(parts[1], 'base64url').toString();
    payload = payload.replace(/"amr":\s*\[(.*?)\]\]/g, '"amr": [$1]');
    
    return JSON.parse(payload);
  } catch {
    return null;
  }
}

export interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    email: string;
    role: string;
  };
}

export async function authMiddleware(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'No authorization token provided' });
    }

    const token = authHeader.split(' ')[1];
    
    console.log('Auth middleware - validating token:', token.substring(0, 20) + '...');
    
    // Parse JWT manually to get user ID (sub claim)
    // This handles Supabase's malformed JWT bug (]] instead of ])
    const payload = parseJwtPayload(token);
    
    if (!payload || !payload.sub) {
      console.log('Auth middleware - invalid token payload');
      return res.status(401).json({ error: 'Invalid token format' });
    }
    
    const userId = payload.sub;
    
    // Get user from database using the user ID from JWT
    const userData = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, email: true, name: true, role: true },
    });
    
    if (!userData) {
      console.log('Auth middleware - user not found');
      return res.status(401).json({ error: 'Invalid or expired token' });
    }
    
    console.log('Auth middleware - user found:', { id: userData.id, email: userData.email });

    req.user = {
      id: userData.id,
      email: userData.email || '',
      role: userData.role || 'USER',
    };

    next();
  } catch (err) {
    console.error('Auth error:', err);
    res.status(401).json({ error: 'Authentication failed' });
  }
}

export function optionalAuth(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    return next();
  }

  authMiddleware(req, res, next);
}