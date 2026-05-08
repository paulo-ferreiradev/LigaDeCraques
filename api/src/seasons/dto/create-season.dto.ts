import { IsInt, IsNotEmpty, IsString, IsIn } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateSeasonDto {
  @ApiProperty({
    example: 2026,
    description: 'The year the season takes place',
  })
  @IsInt()
  @IsNotEmpty()
  year: number;

  //WHY: Restricting to specific enums ensures data consistency.
  // We use string validation here mapped to known application states.
  @ApiProperty({
    example: 'SUMMER',
    enum: ['WINTER', 'SUMMER'],
  })
  @IsString()
  @IsNotEmpty()
  @IsIn(['WINTER', 'SUMMER'])
  seasonType: string;

  @ApiProperty({
    example: 'ACTIVE',
    enum: ['ACTIVE', 'FINISHED'],
  })
  @IsString()
  @IsNotEmpty()
  @IsIn(['ACTIVE', 'FINISHED'])
  status: string;
}
