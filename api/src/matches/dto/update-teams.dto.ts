import { IsArray, IsUUID, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

// WHY: Validates the arrays of player UUIDs for Team A and Team B to guarantee list consistency.
export class UpdateTeamsDto {
  @ApiProperty({ example: ['uuid-player-1', 'uuid-player-2'] })
  @IsArray()
  @IsUUID('all', { each: true })
  @IsNotEmpty()
  teamAPlayerIds: string[];

  @ApiProperty({ example: ['uuid-player-3', 'uuid-player-4'] })
  @IsArray()
  @IsUUID('all', { each: true })
  @IsNotEmpty()
  teamBPlayerIds: string[];
}
