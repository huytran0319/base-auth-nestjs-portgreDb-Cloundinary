import {
  Controller,
  Post,
  Body,
  Req,
  Res,
  Get,
  HttpCode,
  HttpStatus,
  UseGuards,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import { AuthService } from './auth.service.js';
import { RegisterDto } from './dto/register.dto.js';
import { LoginDto } from './dto/login.dto.js';
import { Public } from '../../common/decorators/public.decorator.js';
import { CurrentUser } from '../../common/decorators/current-user.decorator.js';
import { JwtRefreshGuard } from '../../common/guards/jwt-refresh.guard.js';
import { JwtPayload } from './interfaces/auth.interface.js';
import { UsersService } from '../users/users.service.js';

@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly usersService: UsersService,
  ) {}

  @Public()
  @Post('register')
  async register(
    @Body() dto: RegisterDto,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const ip = req.ip || req.socket.remoteAddress;
    const userAgent = req.headers['user-agent'];

    const result = await this.authService.register(dto, ip, userAgent);

    this.setRefreshTokenCookie(res, result.tokens.refreshToken);

    return {
      user: result.user,
      accessToken: result.tokens.accessToken,
    };
  }

  @Public()
  @HttpCode(HttpStatus.OK)
  @Post('login')
  async login(
    @Body() dto: LoginDto,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const ip = req.ip || req.socket.remoteAddress;
    const userAgent = req.headers['user-agent'];

    const result = await this.authService.login(dto, ip, userAgent);

    this.setRefreshTokenCookie(res, result.tokens.refreshToken);

    return {
      user: result.user,
      accessToken: result.tokens.accessToken,
    };
  }

  @Public()
  @UseGuards(JwtRefreshGuard)
  @HttpCode(HttpStatus.OK)
  @Post('refresh')
  async refresh(
    @Req() req: Request & { user: JwtPayload & { refreshToken: string } },
    @Res({ passthrough: true }) res: Response,
  ) {
    const ip = req.ip || req.socket.remoteAddress;
    const userAgent = req.headers['user-agent'];

    const tokens = await this.authService.refreshTokens(
      req.user.sub,
      req.user.sessionId!,
      req.user.refreshToken,
      ip,
      userAgent,
    );

    this.setRefreshTokenCookie(res, tokens.refreshToken);

    const user = await this.usersService.findById(req.user.sub);
    if (!user) {
      return {
        user: null,
        accessToken: tokens.accessToken,
      };
    }

    const { passwordHash: _passwordHash, ...safeUser } = user;

    return {
      user: safeUser,
      accessToken: tokens.accessToken,
    };
  }

  @HttpCode(HttpStatus.OK)
  @Post('logout')
  async logout(
    @CurrentUser('sessionId') sessionId: string,
    @Res({ passthrough: true }) res: Response,
  ) {
    await this.authService.logout(sessionId);
    this.clearRefreshTokenCookie(res);
    return { message: 'Đăng xuất thành công' };
  }

  @HttpCode(HttpStatus.OK)
  @Post('logout-all')
  async logoutAll(
    @CurrentUser('sub') userId: string,
    @Res({ passthrough: true }) res: Response,
  ) {
    await this.authService.logoutAll(userId);
    this.clearRefreshTokenCookie(res);
    return { message: 'Đã đăng xuất khỏi tất cả thiết bị' };
  }

  @Get('me')
  async getProfile(@CurrentUser('sub') userId: string) {
    const user = await this.usersService.findById(userId);
    if (!user) {
      return null;
    }
    const { passwordHash: _passwordHash, ...safeUser } = user;
    return safeUser;
  }

  private setRefreshTokenCookie(res: Response, token: string) {
    res.cookie('refreshToken', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000,
      path: '/',
    });
  }

  private clearRefreshTokenCookie(res: Response) {
    res.clearCookie('refreshToken', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
    });
  }
}
