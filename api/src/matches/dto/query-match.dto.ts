import { IsOptional, IsString, IsInt, Min, Max, IsUUID } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';

// WHY: Validates pagination queries and optional season filters for mobile feeds.
export class QueryMatchDto {
  @ApiPropertyOptional({ description: 'Filter matches by season UUID' })
  @IsOptional()
  @IsUUID()
  seasonId?: string;

  @ApiPropertyOptional({ description: 'UUID of the last match from the previous page' })
  @IsOptional()
  @IsString()
  cursor?: string;

  @ApiPropertyOptional({ description: 'Number of matches to return', default: 10 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(50)
  limit?: number;

  constructor() {
    this.limit = 10;
  }
}
