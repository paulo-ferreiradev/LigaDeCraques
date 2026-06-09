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
  Req,
} from '@nestjs/common';
import { MatchesService } from './matches.service';
import { CreateMatchDto } from './dto/create-match.dto';
import { CreateLegacyMatchDto } from './dto/create-legacy-match.dto';
import { UpdateTeamsDto } from './dto/update-teams.dto';
import { RecordResultDto } from './dto/record-result.dto';
import { QueryMatchDto } from './dto/query-match.dto';
import { CastVoteDto } from './dto/cast-vote.dto';
import { RsvpResponseDto } from './dto/rsvp-response.dto';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { AccessTokenGuard } from '../auth/guards/accessToken.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';

@ApiTags('Matches')
@Controller('matches')
export class MatchesController {
  constructor(private readonly matchesService: MatchesService) {}

  @Post()
  @UseGuards(AccessTokenGuard, RolesGuard)
  @Roles('ADMIN')
  @ApiBearerAuth() // WHY: Restricts match scheduling actions strictly to authorized Administrators.
  @ApiOperation({ summary: 'Schedule a new match (Admin only)' })
  create(@Body() createMatchDto: CreateMatchDto) {
    return this.matchesService.create(createMatchDto);
  }

  @Post('legacy')
  @UseGuards(AccessTokenGuard, RolesGuard)
  @Roles('ADMIN')
  @ApiBearerAuth() // WHY: Backfilling historical results directly affects standings, so Admin only.
  @ApiOperation({ summary: 'Insert a retroactive, already-finished match with final score (Admin only)' })
  createLegacy(@Body() createLegacyMatchDto: CreateLegacyMatchDto) {
    return this.matchesService.createLegacyMatch(createLegacyMatchDto);
  }

  @Get()
  @ApiOperation({ summary: 'List all matches with cursor-based pagination and optional season filter' })
  findAll(@Query() query: QueryMatchDto) {
    return this.matchesService.findAll(query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get details of a single match by ID' })
  findOne(@Param('id') id: string) {
    return this.matchesService.findOne(id);
  }

  @Patch(':id/teams')
  @UseGuards(AccessTokenGuard, RolesGuard)
  @Roles('ADMIN')
  @ApiBearerAuth() // WHY: Rebuilding match rosters post-schedule is an administrative task.
  @ApiOperation({ summary: 'Assign players to Team A and Team B rosters (Admin only)' })
  updateTeams(
    @Param('id') id: string,
    @Body() updateTeamsDto: UpdateTeamsDto,
  ) {
    return this.matchesService.updateTeams(id, updateTeamsDto);
  }

  @Patch(':id/result')
  @UseGuards(AccessTokenGuard, RolesGuard)
  @Roles('ADMIN')
  @ApiBearerAuth() // WHY: Entering the final scores and MVP awards is highly restricted to Admin.
  @ApiOperation({ summary: 'Record final score and MVP award (Admin only)' })
  recordResult(
    @Param('id') id: string,
    @Body() recordResultDto: RecordResultDto,
  ) {
    return this.matchesService.recordResult(id, recordResultDto);
  }

  @Post(':id/votes')
  @UseGuards(AccessTokenGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Cast an MVP vote for a match in voting status' })
  castVote(
    @Param('id') id: string,
    @Body() castVoteDto: CastVoteDto,
    @Req() req: any,
  ) {
    // WHY: Extract userId from authenticated request to cast vote for their linked player profile.
    return this.matchesService.castMvpVote(id, req.user.userId, castVoteDto);
  }

  @Get(':id/votes/my')
  @UseGuards(AccessTokenGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Retrieve the active user\'s cast vote for this match' })
  getMyVote(@Param('id') id: string, @Req() req: any) {
    return this.matchesService.getMyVote(id, req.user.userId);
  }

  @Post(':id/votes/finalize')
  @UseGuards(AccessTokenGuard, RolesGuard)
  @Roles('ADMIN')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Force close voting and calculate match MVP (Admin only)' })
  finalizeVoting(@Param('id') id: string) {
    return this.matchesService.finalizeVoting(id);
  }

  @Post(':id/rsvp')
  @UseGuards(AccessTokenGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Submit RSVP response for a scheduled match' })
  submitRsvp(
    @Param('id') id: string,
    @Body() rsvpResponseDto: RsvpResponseDto,
    @Req() req: any,
  ) {
    // WHY: Submits active user RSVP response. Enforces deadline checks.
    return this.matchesService.submitRsvp(id, req.user.userId, rsvpResponseDto);
  }

  @Get(':id/rsvp/my')
  @UseGuards(AccessTokenGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Retrieve the active user\'s RSVP status for this match' })
  getMyRsvp(@Param('id') id: string, @Req() req: any) {
    return this.matchesService.getMyRsvp(id, req.user.userId);
  }

  @Get(':id/rsvps')
  @UseGuards(AccessTokenGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'List all RSVP responses for a match' })
  getRsvps(@Param('id') id: string) {
    return this.matchesService.getRsvps(id);
  }

  @Delete(':id')
  @UseGuards(AccessTokenGuard, RolesGuard)
  @Roles('ADMIN')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Delete a match record (Admin only)' })
  remove(@Param('id') id: string) {
    return this.matchesService.remove(id);
  }
}
