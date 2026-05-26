import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Query,
  Delete,
  UseGuards,
} from '@nestjs/common';
import { PaymentsService } from './payments.service';
import { CreatePaymentDto } from './dto/create-payment.dto';
import { QueryPaymentDto } from './dto/query-payment.dto';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { AccessTokenGuard } from '../auth/guards/accessToken.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { GetCurrentUser } from '../auth/decorators/getCurrentUser.decorator';

@ApiTags('Payments')
@Controller('payments')
@UseGuards(AccessTokenGuard, RolesGuard) // WHY: The financial module is entirely protected by default.
@ApiBearerAuth()
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  @Post()
  @Roles('ADMIN', 'TREASURER') // WHY: Only Admin and Treasurer are authorized to post a new payment bill.
  @ApiOperation({ summary: 'Create a new pending payment ledger (Admin/Treasurer only)' })
  create(@Body() createPaymentDto: CreatePaymentDto) {
    return this.paymentsService.create(createPaymentDto);
  }

  @Get()
  @Roles('ADMIN', 'TREASURER', 'USER') // WHY: All authenticated roles can request payments, but normal USERs are filtered contextually.
  @ApiOperation({ summary: 'List payments (Users see only their own; Admins/Treasurers see all)' })
  findAll(
    @Query() query: QueryPaymentDto,
    @GetCurrentUser() user: { userId: string; role: string },
  ) {
    return this.paymentsService.findAll(query, user);
  }

  @Patch(':id/pay')
  @Roles('ADMIN', 'TREASURER') // WHY: Setting payments as completed (PAID) requires Treasurer or Admin oversight.
  @ApiOperation({ summary: 'Complete a payment and mark as PAID (Admin/Treasurer only)' })
  pay(@Param('id') id: string) {
    return this.paymentsService.pay(id);
  }

  @Patch(':id/cancel')
  @Roles('ADMIN', 'TREASURER')
  @ApiOperation({ summary: 'Cancel a pending payment ledger (Admin/Treasurer only)' })
  cancel(@Param('id') id: string) {
    return this.paymentsService.cancel(id);
  }

  @Delete(':id')
  @Roles('ADMIN', 'TREASURER')
  @ApiOperation({ summary: 'Soft delete a payment record (Admin/Treasurer only)' })
  remove(@Param('id') id: string) {
    return this.paymentsService.remove(id);
  }
}
