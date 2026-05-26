import { IsNotEmpty, IsUUID, IsOptional, IsDateString } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

// WHY: Enforces type safety and request validation when creating (scheduling) a new match.
export class CreateMatchDto {
  @ApiProperty({ example: 'uuid-of-season' })
  @IsUUID()
  @IsNotEmpty()
  seasonId: string;

  @ApiPropertyOptional({ example: '2026-05-25T20:00:00.000Z' })
  @IsOptional()
  @IsDateString()
  playedAt?: string;
}
