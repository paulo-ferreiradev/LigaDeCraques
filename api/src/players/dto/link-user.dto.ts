import { IsEmail } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class LinkUserDto {
  @ApiProperty({ example: 'joao.guedes@example.com' })
  @IsEmail()
  email: string;
}
