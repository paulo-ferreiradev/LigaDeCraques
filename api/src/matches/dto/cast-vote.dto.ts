import { IsNotEmpty, IsUUID } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CastVoteDto {
  @ApiProperty({
    example: '69b2ec35-6ca9-4622-b5a4-e44f20c6cd06',
    description: 'The UUID of the player being voted for the MVP',
  })
  @IsUUID()
  @IsNotEmpty()
  candidateId: string;
}
