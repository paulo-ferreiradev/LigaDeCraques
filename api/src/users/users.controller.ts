import {
  Controller,
  Patch,
  Param,
  Body,
  HttpCode,
  HttpStatus,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { UsersService } from './users.service';
import { AdminResetPasswordDto } from './dto/admin-reset-password.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { AccessTokenGuard } from '../auth/guards/accessToken.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { GetCurrentUser } from '../auth/decorators/getCurrentUser.decorator';

@ApiTags('Users')
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  // WHY: Literal `me/password` route is declared before the `:id/...` param route so it can never
  // be shadowed by the dynamic segment.
  @UseGuards(AccessTokenGuard)
  @Patch('me/password')
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth() // WHY: Requires a valid Access Token — only the logged-in user reaches this.
  @ApiOperation({ summary: "Change your own password (authenticated user)" })
  changeMyPassword(
    @GetCurrentUser('userId') userId: string,
    @Body() changePasswordDto: ChangePasswordDto,
  ) {
    return this.usersService.changePassword(userId, changePasswordDto);
  }

  @UseGuards(AccessTokenGuard, RolesGuard)
  @Roles('ADMIN')
  @Patch(':id/reset-password')
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth() // WHY: Restricted to the ADMIN role via RolesGuard — a privileged operation.
  @ApiOperation({ summary: 'Force-reset a user password (Admin only)' })
  adminResetPassword(
    @Param('id') id: string,
    @Body() adminResetPasswordDto: AdminResetPasswordDto,
  ) {
    return this.usersService.adminResetPassword(id, adminResetPasswordDto);
  }
}
