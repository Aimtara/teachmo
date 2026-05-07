import type { NextFunction, Request, RequestHandler, Response } from 'express';

export interface AuthContext {
  userId?: string;
  role?: string;
  isService?: boolean;
  organizationId?: string;
  schoolId?: string | null;
  [key: string]: unknown;
}

export interface TenantContext {
  organizationId?: string;
  schoolId?: string | null;
  [key: string]: unknown;
}

export interface ApiError extends Error {
  statusCode?: number;
  reason?: string;
}

export type AuthenticatedRequest = Request & {
  auth?: AuthContext;
};

export type TenantScopedRequest = AuthenticatedRequest & {
  tenant?: TenantContext;
};

export type JsonResponse<T extends Record<string, unknown> = Record<string, unknown>> = Response<T>;

export function asyncHandler(
  handler: (req: TenantScopedRequest, res: Response, next: NextFunction) => Promise<unknown>
): RequestHandler {
  return (req, res, next) => {
    void handler(req as TenantScopedRequest, res, next).catch(next);
  };
}

declare global {
  namespace Express {
    interface Request {
      auth?: AuthContext;
      tenant?: TenantContext;
    }
  }
}
