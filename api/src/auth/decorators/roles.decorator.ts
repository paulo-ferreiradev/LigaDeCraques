import { SetMetadata } from '@nestjs/common';

// WHY: A metadata key is required to retrieve role boundaries during request lifecycle.
export const ROLES_KEY = 'roles';

// WHY: Custom decorator allows easily assigning multiple role constraints (e.g. 'ADMIN', 'TREASURER')
// directly at the handler level using @Roles('ADMIN').
export const Roles = (...roles: string[]) => SetMetadata(ROLES_KEY, roles);
