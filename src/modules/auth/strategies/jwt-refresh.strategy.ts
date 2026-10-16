import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { Request } from 'express';
import { JwtPayload } from '../interfaces/auth.interface.js';

@Injectable()
export class JwtRefreshStrategy extends PassportStrategy(
  Strategy,
  'jwt-refresh',
) {
  constructor(configService: ConfigService) {
    super({
      jwtFromRequest: ExtractJwt.fromExtractors([
        (request: Request) => {
          let token = null;
          if (request?.cookies && request.cookies['refreshToken']) {
            token = request.cookies['refreshToken'];
          }
          if (!token && request?.headers?.authorization) {
            token = request.headers.authorization.replace('Bearer ', '').trim();
          }
          return token;
        },
      ]),
      ignoreExpiration: false,
      secretOrKey: configService.get<string>(
        'JWT_REFRESH_SECRET',
        'default_refresh_secret',
      ),
      passReqToCallback: true,
    });
  }

  async validate(req: Request, payload: JwtPayload) {
    let refreshToken = null;
    if (req?.cookies && req.cookies['refreshToken']) {
      refreshToken = req.cookies['refreshToken'];
    } else if (req?.headers?.authorization) {
      refreshToken = req.headers.authorization.replace('Bearer ', '').trim();
    }

    if (!refreshToken) {
      throw new UnauthorizedException('Refresh token không tồn tại');
    }

    return {
      ...payload,
      refreshToken,
    };
  }
}
