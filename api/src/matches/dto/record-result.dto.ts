import { IsInt, Min, IsArray, IsUUID, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

// WHY: Validates match score entries and associated Team A/B player rosters for result saving.
export class RecordResultDto {
  @ApiProperty({ example: 3 })
  @IsInt()
  @Min(0)
  @IsNotEmpty()
  teamAScore: number;

  @ApiProperty({ example: 2 })
  @IsInt()
  @Min(0)
  @IsNotEmpty()
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
}
