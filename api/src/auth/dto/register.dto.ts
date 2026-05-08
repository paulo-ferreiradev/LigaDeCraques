import { IsEmail, IsNotEmpty, IsOptional, IsString, IsUUID, MinLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class RegisterDto {
  @ApiProperty({ example: 'admin@ligacraques.com' })
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @ApiProperty({ example: 'StrongPassword123!' })
  @IsString()
  @IsNotEmpty()
  @MinLength(6)
  password: string;

  // WHY: Allows optionally linking this user account to a specific player profile
  // at registration time (e.g., if an Admin is creating accounts for existing players).
  @ApiPropertyOptional({ example: 'uuid-of-a-player' })
  @IsOptional()
  @IsUUID()
  playerId?: string;
}