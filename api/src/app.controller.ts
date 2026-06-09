import { Controller, Get } from '@nestjs/common';
import { AppService } from './app.service';

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get()
  getHello(): string {
    return this.appService.getHello();
  }

  // WHY: Lightweight, unauthenticated health/liveness probe. Also a convenient deploy marker —
  // a 200 here confirms the running build includes this revision.
  @Get('health')
  getHealth() {
    return { status: 'ok', service: 'tercas-fc-api' };
  }
}
