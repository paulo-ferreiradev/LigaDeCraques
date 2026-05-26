import { createParamDecorator, ExecutionContext } from '@nestjs/common';

// WHY: Custom param decorator provides a clean, type-safe, and self-documenting way 
// to extract the user object or specific fields (e.g. @GetCurrentUser('userId')) from the Request.
export const GetCurrentUser = createParamDecorator(
  (data: string | undefined, context: ExecutionContext) => {
    const request = context.switchToHttp().getRequest();
    if (!request.user) {
      return null;
    }
    return data ? request.user[data] : request.user;
  },
);
