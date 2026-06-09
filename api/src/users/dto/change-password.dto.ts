import { IsNotEmpty, IsString, MinLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

// WHY: Validates the self-service password change payload for an already-authenticated user.
export class ChangePasswordDto {
  // WHY: We require the current password as a re-authentication step. This prevents session
  // hijacking from escalating into a permanent account takeover: even with a stolen access token,
  // an attacker cannot rotate the password to lock out the owner without knowing the old one.
  @ApiProperty({ example: 'CurrentPassword123!' })
  @IsString()
  @IsNotEmpty()
  oldPassword: string;

  // WHY: MinLength(6) mirrors the constraint enforced at registration so the password policy
  // stays consistent across every entry point.
  @ApiProperty({ example: 'NewStrongPassword456!' })
  @IsString()
  @IsNotEmpty()
  @MinLength(6)
  newPassword: string;
}
