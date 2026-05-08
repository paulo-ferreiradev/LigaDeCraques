import { IsOptional, IsString, IsInt, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class QuerySeasonDto {
  // WHY: The cursor is the ID of the last element from the previous page.
  @ApiPropertyOptional({
    description: 'UUID of the last season from the previous page',
  })
  @IsOptional()
  @IsString()
  cursor?: string;

  @ApiPropertyOptional({
    description: 'Number of items to return',
    default: 10,
  })
  @IsOptional()
  @Type(() => Number) // WHY: Query params are parsed as strings; we need to cast to Number.
  @IsInt()
  @Min(1)
  @Max(50) // WHY: Prevent malicious clients from requesting huge datasets at once.
  limit?: number;

  constructor() {
    this.limit = 10;
  }

}