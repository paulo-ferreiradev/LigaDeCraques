import { IsString, IsNotEmpty, MinLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

// WHY: Payload for an Admin-forced password reset. There is intentionally no `oldPassword` here —
// the Admin does not (and should not) know the user's current password; authorization comes from
// the Admin role guard on the route, not from proving the previous credential.
export class AdminResetPasswordDto {
  // WHY: MinLength(6) keeps the password policy identical to registration and self-service change.
  @ApiProperty({ example: 'TempPassword123!' })
  @IsString()
  @IsNotEmpty()
  @MinLength(6)
  newPassword: string;
}
