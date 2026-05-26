import { IsString, IsOptional, IsIn } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class UpdatePlayerDto {
  @ApiProperty({ example: 'Cristiano Ronaldo', required: false })
  @IsString()
  @IsOptional()
  name?: string;

  // WHY: Validates allowed player types in the league dashboard.
  @ApiProperty({ example: 'FIXED', enum: ['FIXED', 'GUEST'], required: false })
  @IsString()
  @IsOptional()
  @IsIn(['FIXED', 'GUEST'])
  playerType?: string;

  // WHY: Validates system roles which will propagate to the linked user account.
  @ApiProperty({ example: 'USER', enum: ['ADMIN', 'TREASURER', 'USER'], required: false })
  @IsString()
  @IsOptional()
  @IsIn(['ADMIN', 'TREASURER', 'USER'])
  role?: string;
}
