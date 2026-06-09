import {
  IsInt,
  Min,
  IsArray,
  IsUUID,
  IsNotEmpty,
  IsDateString,
  IsOptional,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

// WHY: Validates retroactive ("legacy") match insertion — a game played before the app existed.
// Unlike the scheduling flow, the score and rosters are supplied up-front so the match is created
// directly as COMPLETED and is picked up by the standings engine with no manual point overrides.
export class CreateLegacyMatchDto {
  @ApiProperty({ example: 'uuid-of-season' })
  @IsUUID()
  @IsNotEmpty()
  seasonId: string;

  @ApiProperty({ example: '2026-01-14T22:30:00.000Z', description: 'Actual date the match was played.' })
  @IsDateString()
  @IsNotEmpty()
  playedAt: string;

  @ApiProperty({ example: 3 })
  @IsInt()
  @Min(0)
  teamAScore: number;

  @ApiProperty({ example: 2 })
  @IsInt()
  @Min(0)
  teamBScore: number;

  @ApiProperty({ example: ['uuid-player-1', 'uuid-player-2'] })
  @IsArray()
  @IsUUID(undefined, { each: true })
  @IsNotEmpty()
  teamAPlayerIds: string[];

  @ApiProperty({ example: ['uuid-player-3', 'uuid-player-4'] })
  @IsArray()
  @IsUUID(undefined, { each: true })
  @IsNotEmpty()
  teamBPlayerIds: string[];

  // WHY: Optional — many legacy games have no recorded MVP. Must be one of the rostered players.
  @ApiPropertyOptional({ example: 'uuid-player-1' })
  @IsOptional()
  @IsUUID()
  mvpId?: string;
}
