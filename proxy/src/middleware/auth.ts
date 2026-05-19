import { Request, Response, NextFunction } from 'express';
import { adminAuth } from '../services/firebase';

export interface AuthedRequest extends Request {
  uid: string;
}

export async function authMiddleware(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Missing or invalid authorization header' });
    return;
  }

  const token = authHeader.slice(7);
  try {
    const decoded = await adminAuth.verifyIdToken(token);
    (req as AuthedRequest).uid = decoded.uid;
    next();
  } catch {
    res.status(401).json({ error: 'Invalid token' });
  }
}
