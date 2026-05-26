import {
  Controller,
  Get,
  Post,
  Body,
  Query,
  Param,
  Patch,
  UseGuards,
  Delete,
} from '@nestjs/common';
import { SeasonsService } from './seasons.service';
import { CreateSeasonDto } from './dto/create-season.dto';
import { QuerySeasonDto } from './dto/query-season.dto';
import { UpdateSeasonDto } from './dto/update-season.dto';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { AccessTokenGuard } from '../auth/guards/accessToken.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';

@ApiTags('Seasons')
@Controller('seasons')
export class SeasonsController {
  constructor(private readonly seasonsService: SeasonsService) {}

  @Post()
  @UseGuards(AccessTokenGuard, RolesGuard)
  @Roles('ADMIN')
  @ApiBearerAuth() // WHY: Enforces that only administrators can configure new football seasons.
  @ApiOperation({ summary: 'Create a new season (Admin only)' })
  create(@Body() createSeasonDto: CreateSeasonDto) {
    return this.seasonsService.create(createSeasonDto);
  }

  @Get()
  @ApiOperation({ summary: 'List all seasons with cursor-based pagination' })
  findAll(@Query() query: QuerySeasonDto) {
    return this.seasonsService.findAll(query);
  }

  @Get('hall-of-fame')
  @ApiOperation({ summary: 'Retrieve the league Hall of Fame (Historic Champions)' })
  getHallOfFame() {
    // WHY: Returns aggregated championship counts to show a premium list of all historic league champions.
    return this.seasonsService.getHallOfFame();
  }

  @Get('active')
  @ApiOperation({ summary: 'Retrieve the currently active season' })
  findActive() {
    return this.seasonsService.findActive();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Retrieve details of a single season by ID' })
  findOne(@Param('id') id: string) {
    return this.seasonsService.findOne(id);
  }

  @Patch(':id')
  @UseGuards(AccessTokenGuard, RolesGuard)
  @Roles('ADMIN')
  @ApiBearerAuth() // WHY: Restricting editing status/metadata (e.g. closing a season) to Admins.
  @ApiOperation({ summary: 'Update season details (Admin only)' })
  update(@Param('id') id: string, @Body() updateSeasonDto: UpdateSeasonDto) {
    return this.seasonsService.update(id, updateSeasonDto);
  }

  @Get(':id/leaderboard')
  @ApiOperation({ summary: 'Retrieve dynamic standings leaderboard for a given season' })
  getLeaderboard(@Param('id') id: string) {
    return this.seasonsService.getLeaderboard(id);
  }

  @Delete(':id')
  @UseGuards(AccessTokenGuard, RolesGuard)
  @Roles('ADMIN')
  @ApiBearerAuth() // WHY: Deleting seasons is a high-impact operation that removes all matches/records, so it must be guarded for Admins only.
  @ApiOperation({ summary: 'Delete a season and its matches transactionally (Admin only)' })
  remove(@Param('id') id: string) {
    return this.seasonsService.remove(id);
  }
}

