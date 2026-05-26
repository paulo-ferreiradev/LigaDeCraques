import { Controller, Post, Body, HttpCode, HttpStatus, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { AccessTokenGuard } from './guards/accessToken.guard';
import { RefreshTokenGuard } from './guards/refreshToken.guard';
import { GetCurrentUser } from './decorators/getCurrentUser.decorator';

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('register')
  @ApiOperation({ summary: 'Register a new user' })
  register(@Body() registerDto: RegisterDto) {
    return this.authService.register(registerDto);
  }

  @Post('login')
  @HttpCode(HttpStatus.OK) // WHY: Login shouldn't return 201 Created (default for @Post), but 200 OK.
  @ApiOperation({ summary: 'Authenticate user and return tokens' })
  login(@Body() loginDto: LoginDto) {
    return this.authService.login(loginDto);
  }

  @UseGuards(AccessTokenGuard)
  @Post('logout')
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth() // WHY: Documents in Swagger that this route requires a Bearer Access Token.
  @ApiOperation({ summary: 'Logout a user (invalidates refresh token)' })
  logout(@GetCurrentUser('userId') userId: string) {
    return this.authService.logout(userId);
  }

  @UseGuards(RefreshTokenGuard)
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth() // WHY: Documents in Swagger that this route requires a Bearer Refresh Token.
  @ApiOperation({ summary: 'Refresh tokens using a valid refresh token' })
  refresh(
    @GetCurrentUser('userId') userId: string,
    @GetCurrentUser('refreshToken') refreshToken: string,
  ) {
    return this.authService.refreshTokens(userId, refreshToken);
  }
}