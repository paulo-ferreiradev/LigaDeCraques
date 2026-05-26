import { IsOptional, IsString, IsInt, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';

// WHY: Supports cursor-based pagination for the financial payments list.
export class QueryPaymentDto {
  @ApiPropertyOptional({ description: 'UUID of the last payment from the previous page' })
  @IsOptional()
  @IsString()
  cursor?: string;

  @ApiPropertyOptional({ description: 'Number of payments to return', default: 10 })
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
