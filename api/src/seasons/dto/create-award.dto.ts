import {
  IsInt,
  IsNotEmpty,
  IsString,
  IsIn,
  IsUUID,
  IsOptional,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

// WHY: Validates a manually-granted honor — primarily historical ("Champion 2024") titles that
// predate the app and therefore have no backing Season record.
export class CreateAwardDto {
  @ApiProperty({ example: 'uuid-of-player' })
  @IsUUID()
  @IsNotEmpty()
  playerId: string;

  @ApiProperty({ example: 2024, description: 'Year the honor refers to.' })
  @IsInt()
  @IsNotEmpty()
  year: number;

  @ApiPropertyOptional({ example: 'CHAMPION', enum: ['CHAMPION', 'TOP_SCORER', 'MVP_OF_SEASON'] })
  @IsOptional()
  @IsString()
  @IsIn(['CHAMPION', 'TOP_SCORER', 'MVP_OF_SEASON'])
  type?: string;

  @ApiPropertyOptional({ example: 'Champion 2024 Winter' })
  @IsOptional()
  @IsString()
  title?: string;

  // WHY: Optional link to a real Season. Omit for pre-app legacy honors.
  @ApiPropertyOptional({ example: 'uuid-of-season' })
  @IsOptional()
  @IsUUID()
  seasonId?: string;
}
