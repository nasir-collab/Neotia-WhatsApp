import { Inject, Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
  ForbiddenException,
  SetMetadata, } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import jwt from 'jsonwebtoken';

export const IS_PUBLIC_KEY = 'isPublic';
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);

export const ROLES_KEY = 'roles';
export const Roles = (...roles: string[]) => SetMetadata(ROLES_KEY, roles);

export interface AuthenticatedUser {
  id: string;
  email: string;
  fullName: string;
  roleCode: string;
  hospitalId: string | null;
}

@Injectable()
export class JwtRbacGuard implements CanActivate {
  constructor(@Inject(Reflector) private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const authHeader = request.headers['authorization'];
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new UnauthorizedException('Authentication token required.');
    }

    const token = authHeader.slice(7);
    const secret = process.env.JWT_SECRET || 'anhvl-local-dev-jwt-secret-key-plan-d-media-2026-non-prod';

    let payload: AuthenticatedUser;
    try {
      payload = jwt.verify(token, secret) as AuthenticatedUser;
    } catch {
      throw new UnauthorizedException('Invalid or expired session token.');
    }

    request.user = payload;

    // Role-based access check
    const requiredRoles = this.reflector.getAllAndOverride<string[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (requiredRoles && requiredRoles.length > 0) {
      if (!requiredRoles.includes(payload.roleCode)) {
        throw new ForbiddenException(
          `Role '${payload.roleCode}' is not authorized for this operation. Required: ${requiredRoles.join(', ')}`
        );
      }
    }

    // Read-only viewer cannot perform mutating HTTP methods (except logout/refresh)
    if (
      payload.roleCode === 'MANAGEMENT_VIEWER' &&
      ['POST', 'PATCH', 'PUT', 'DELETE'].includes(request.method) &&
      !String(request.url).includes('/auth/')
    ) {
      throw new ForbiddenException('Management / Read-only Viewer role cannot modify operational records.');
    }

    return true;
  }
}

export function enforceHospitalScope(
  user: AuthenticatedUser | undefined,
  requestedHospitalId?: string
): string | undefined {
  if (!user) return requestedHospitalId;
  // Hospital-bound roles (HOSPITAL_ADMIN, OPS_EXECUTIVE, CALL_CENTRE_AGENT) are restricted to their assigned hospital
  if (user.hospitalId) {
    if (requestedHospitalId && requestedHospitalId !== 'ALL' && requestedHospitalId !== user.hospitalId) {
      throw new ForbiddenException('Access restricted to your assigned hospital unit.');
    }
    return user.hospitalId;
  }
  if (!requestedHospitalId || requestedHospitalId === 'ALL') {
    return undefined;
  }
  return requestedHospitalId;
}
