import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ROLES_KEY } from '../decorators/roles.decorator';

@Injectable()
export class RolesGuard implements CanActivate {
  // WHY: Reflector is injected to extract metadata attached using @Roles decorator.
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    // WHY: We read metadata from the handler level (method) and controller level (class).
    // getAllAndOverride ensures that method-level roles override class-level roles if both exist.
    const requiredRoles = this.reflector.getAllAndOverride<string[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    // WHY: If no roles are specified, the endpoint is public by default for any authenticated user.
    if (!requiredRoles || requiredRoles.length === 0) {
      return true;
    }

    const { user } = context.switchToHttp().getRequest();

    // WHY: Safe check in case the developer forgot to place the AccessTokenGuard before the RolesGuard.
    // If there is no authenticated user context, request is immediately forbidden.
    if (!user || !user.role) {
      return false;
    }

    // WHY: Enforce that the user's role exactly matches at least one of the required boundaries.
    return requiredRoles.includes(user.role);
  }
}
