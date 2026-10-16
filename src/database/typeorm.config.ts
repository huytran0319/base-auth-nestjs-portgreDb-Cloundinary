import { ConfigService } from '@nestjs/config';
import { TypeOrmModuleOptions } from '@nestjs/typeorm';
import { User } from '../modules/users/entities/user.entity.js';
import { Session } from '../modules/auth/entities/session.entity.js';
import { Media } from '../modules/media/entities/media.entity.js';

export const getTypeOrmConfig = (
  configService: ConfigService,
): TypeOrmModuleOptions => ({
  type: 'postgres',
  host: configService.get<string>('DB_HOST', 'localhost'),
  port: configService.get<number>('DB_PORT', 5432),
  username: configService.get<string>('DB_USERNAME', 'postgres'),
  password: configService.get<string>('DB_PASSWORD', 'postgres'),
  database: configService.get<string>('DB_NAME', 'nest_auth'),
  entities: [User, Session, Media],
  synchronize: configService.get<string>('DB_SYNC', 'true') === 'true',
  autoLoadEntities: true,
  logging: configService.get<string>('NODE_ENV') === 'development',
});
