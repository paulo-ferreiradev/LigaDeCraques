import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  Req,
  ForbiddenException,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { PlayersService } from './players.service';
import { CreatePlayerDto } from './dto/create-player.dto';
import { UpdatePlayerDto } from './dto/update-player.dto';
import { LinkUserDto } from './dto/link-user.dto';
import { AccessTokenGuard } from '../auth/guards/accessToken.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';

@ApiTags('Players')
@Controller('players')
export class PlayersController {
  constructor(private readonly playersService: PlayersService) {}

  @Post()
  @UseGuards(AccessTokenGuard, RolesGuard)
  @Roles('ADMIN')
  @ApiBearerAuth() // WHY: Declares this endpoint requires JWT Bearer authorization in Swagger UI.
  @ApiOperation({ summary: 'Create a new player (Admin only)' })
  create(@Body() createPlayerDto: CreatePlayerDto) {
    return this.playersService.create(createPlayerDto);
  }

  @Get()
  @ApiOperation({ summary: 'Retrieve all players (Public)' })
  findAll() {
    return this.playersService.findAll();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Retrieve player details by ID (Public)' })
  findOne(@Param('id') id: string) {
    return this.playersService.findOne(id);
  }

  @Patch(':id')
  @UseGuards(AccessTokenGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update player details (Admin or profile owner)' })
  update(
    @Param('id') id: string,
    @Body() updatePlayerDto: UpdatePlayerDto,
    @Req() req: any,
  ) {
    // WHY: A player can only update their own profile details, unless they have the ADMIN role.
    if (req.user.role !== 'ADMIN' && req.user.playerId !== id) {
      throw new ForbiddenException('You are not authorized to update this player profile');
    }
    return this.playersService.update(id, updatePlayerDto);
  }

  @Delete(':id')
  @UseGuards(AccessTokenGuard, RolesGuard)
  @Roles('ADMIN')
  @ApiBearerAuth() // WHY: Only Admins are authorized to remove player records.
  @ApiOperation({ summary: 'Delete a player (Admin only)' })
  remove(@Param('id') id: string) {
    return this.playersService.remove(id);
  }

  @Post(':id/link-user')
  @UseGuards(AccessTokenGuard, RolesGuard)
  @Roles('ADMIN')
  @ApiBearerAuth()
  @ApiOperation({
    summary:
      'Associate a registered user account (by email) with this pre-existing player profile, discarding the duplicate created at registration (Admin only)',
  })
  linkUser(@Param('id') id: string, @Body() linkUserDto: LinkUserDto) {
    return this.playersService.linkUser(id, linkUserDto);
  }
}
