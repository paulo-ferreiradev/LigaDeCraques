import { IsNotEmpty, IsIn, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class RsvpResponseDto {
  @ApiProperty({
    example: 'CONFIRMED',
    enum: ['CONFIRMED', 'DECLINED'],
    description: 'The player response status for the match convocatória',
  })
  @IsString()
  @IsNotEmpty()
  @IsIn(['CONFIRMED', 'DECLINED'])
  status: string;
}
