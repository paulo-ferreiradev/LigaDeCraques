import { IsString, MinLength } from 'class-validator';

export class CreatePlayerDto {
  @IsString()
  @MinLength(3)
  name: string;
}
