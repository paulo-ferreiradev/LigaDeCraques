import { Controller, Get, Post, Body, Query } from '@nestjs/common';
import { SeasonsService } from './seasons.service';
import { CreateSeasonDto } from './dto/create-season.dto';
import { QuerySeasonDto } from './dto/query-season.dto';
import { ApiTags, ApiOperation } from '@nestjs/swagger';

@ApiTags('Seasons')
@Controller('seasons')
export class SeasonsController {
  constructor(private readonly seasonsService: SeasonsService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new season' })
  create(@Body() createSeasonDto: CreateSeasonDto) {
    return this.seasonsService.create(createSeasonDto);
  }

  @Get()
  @ApiOperation({ summary: 'List all seasons with cursor-based pagination' })
  findAll(@Query() query: QuerySeasonDto) {
    return this.seasonsService.findAll(query);
  }
}

