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

  // WHY: Allows creating and linking a player profile with the user's name during registration.
  @ApiPropertyOptional({ example: 'Paulo Ferreira' })
  @IsOptional()
  @IsString()
  playerName?: string;
}