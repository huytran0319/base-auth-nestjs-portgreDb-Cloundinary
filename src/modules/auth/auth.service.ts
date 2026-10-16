import {
  Injectable,
  UnauthorizedException,
  ForbiddenException,
} from '@nestjs/common';
import { JwtService, type JwtSignOptions } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as argon2 from 'argon2';
import { UsersService } from '../users/users.service.js';
import { Session } from './entities/session.entity.js';
import { RegisterDto } from './dto/register.dto.js';
import { LoginDto } from './dto/login.dto.js';
import { JwtPayload, Tokens } from './interfaces/auth.interface.js';
import { User } from '../users/entities/user.entity.js';

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    @InjectRepository(Session)
    private readonly sessionRepository: Repository<Session>,
  ) {}

  async register(
    dto: RegisterDto,
    ipAddress?: string,
    userAgent?: string,
  ): Promise<{ user: Partial<User>; tokens: Tokens }> {
    const passwordHash = await argon2.hash(dto.password);
    const user = await this.usersService.create({
      email: dto.email,
      passwordHash,
    });

    const tokens = await this.createSessionAndTokens(
      user,
      ipAddress,
      userAgent,
    );

    const { passwordHash: _passwordHash, ...safeUser } = user;

    return {
      user: safeUser,
      tokens,
    };
  }

  async login(
    dto: LoginDto,
    ipAddress?: string,
    userAgent?: string,
  ): Promise<{ user: Partial<User>; tokens: Tokens }> {
    const user = await this.usersService.findByEmail(dto.email);
    if (!user) {
      throw new UnauthorizedException('Email hoặc mật khẩu không chính xác');
    }

    if (!user.isActive) {
      throw new UnauthorizedException('Tài khoản đã bị vô hiệu hóa');
    }

    const isPasswordValid = await argon2.verify(
      user.passwordHash,
      dto.password,
    );

    if (!isPasswordValid) {
      throw new UnauthorizedException('Email hoặc mật khẩu không chính xác');
    }

    const tokens = await this.createSessionAndTokens(
      user,
      ipAddress,
      userAgent,
    );

    const { passwordHash: _passwordHash, ...safeUser } = user;

    return {
      user: safeUser,
      tokens,
    };
  }

  async refreshTokens(
    userId: string,
    sessionId: string,
    refreshToken: string,
    ipAddress?: string,
    userAgent?: string,
  ): Promise<Tokens> {
    const session = await this.sessionRepository.findOne({
      where: { id: sessionId, userId, isRevoked: false },
    });

    if (!session || new Date() > session.expiresAt) {
      throw new UnauthorizedException(
        'Phiên đăng nhập đã hết hạn hoặc không hợp lệ',
      );
    }

    const isTokenMatch = await argon2.verify(
      session.refreshTokenHash,
      refreshToken,
    );

    if (!isTokenMatch) {
      await this.sessionRepository.update({ userId }, { isRevoked: true });
      throw new ForbiddenException(
        'Phát hiện hành vi bất thường. Vui lòng đăng nhập lại.',
      );
    }

    const user = await this.usersService.findById(userId);
    if (!user || !user.isActive) {
      throw new UnauthorizedException('Tài khoản không khả dụng');
    }

    const tokens = await this.generateTokens({
      sub: user.id,
      email: user.email,
      role: user.role,
      sessionId: session.id,
    });

    const newRefreshTokenHash = await argon2.hash(tokens.refreshToken);
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    session.refreshTokenHash = newRefreshTokenHash;
    session.expiresAt = expiresAt;
    if (ipAddress) session.ipAddress = ipAddress;
    if (userAgent) session.userAgent = userAgent;

    await this.sessionRepository.save(session);

    return tokens;
  }

  async logout(sessionId?: string): Promise<void> {
    if (sessionId) {
      await this.sessionRepository.update(
        { id: sessionId },
        { isRevoked: true },
      );
    }
  }

  async logoutAll(userId: string): Promise<void> {
    await this.sessionRepository.update({ userId }, { isRevoked: true });
  }

  private async createSessionAndTokens(
    user: User,
    ipAddress?: string,
    userAgent?: string,
  ): Promise<Tokens> {
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    const session = this.sessionRepository.create({
      userId: user.id,
      refreshTokenHash: 'temporary_hash',
      expiresAt,
      ipAddress: ipAddress ?? null,
      userAgent: userAgent ?? null,
    });
    const savedSession = await this.sessionRepository.save(session);

    const tokens = await this.generateTokens({
      sub: user.id,
      email: user.email,
      role: user.role,
      sessionId: savedSession.id,
    });

    savedSession.refreshTokenHash = await argon2.hash(tokens.refreshToken);
    await this.sessionRepository.save(savedSession);

    return tokens;
  }

  private async generateTokens(payload: JwtPayload): Promise<Tokens> {
    const accessSecret = this.configService.get<string>(
      'JWT_ACCESS_SECRET',
      'default_access_secret',
    );
    const accessExpiresIn = this.configService.get<
      NonNullable<JwtSignOptions['expiresIn']>
    >('JWT_ACCESS_EXPIRES_IN', '15m');

    const refreshSecret = this.configService.get<string>(
      'JWT_REFRESH_SECRET',
      'default_refresh_secret',
    );
    const refreshExpiresIn = this.configService.get<
      NonNullable<JwtSignOptions['expiresIn']>
    >('JWT_REFRESH_EXPIRES_IN', '7d');

    const [accessToken, refreshToken] = await Promise.all([
      this.jwtService.signAsync(payload, {
        secret: accessSecret,
        expiresIn: accessExpiresIn,
      }),
      this.jwtService.signAsync(payload, {
        secret: refreshSecret,
        expiresIn: refreshExpiresIn,
      }),
    ]);

    return {
      accessToken,
      refreshToken,
    };
  }
}
