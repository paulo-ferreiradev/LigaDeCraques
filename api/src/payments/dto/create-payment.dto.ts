import { IsNotEmpty, IsUUID, IsNumber, Min } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

// WHY: Ensures positive amount values and valid player UUID references for payments.
export class CreatePaymentDto {
  @ApiProperty({ example: 'uuid-of-a-player' })
  @IsUUID()
  @IsNotEmpty()
  playerId: string;

  @ApiProperty({ example: 50.00 })
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0.01)
  @IsNotEmpty()
  amount: number;
}
