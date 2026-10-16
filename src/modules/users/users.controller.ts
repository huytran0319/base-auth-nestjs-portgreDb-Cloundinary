import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  NotFoundException,
} from '@nestjs/common';
import { UsersService } from './users.service.js';
import type { PaginatedUsersResult } from './users.service.js';
import { CurrentUser } from '../../common/decorators/current-user.decorator.js';
import { Roles } from '../../common/decorators/roles.decorator.js';
import { UserRole } from './enums/user-role.enum.js';
import { UpdateProfileDto } from './dto/update-profile.dto.js';
import { CreateUserDto } from './dto/create-user.dto.js';
import { FilterUserDto } from './dto/filter-user.dto.js';
import { AdminUpdateUserDto } from './dto/admin-update-user.dto.js';
import { User } from './entities/user.entity.js';

@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Patch('profile')
  async updateProfile(
    @CurrentUser('sub') userId: string,
    @Body() dto: UpdateProfileDto,
  ): Promise<Omit<User, 'passwordHash'>> {
    return this.usersService.updateProfile(userId, dto);
  }

  @Get()
  @Roles(UserRole.ADMIN)
  async findAll(@Query() filter: FilterUserDto): Promise<PaginatedUsersResult> {
    return this.usersService.findAll(filter);
  }

  @Post()
  @Roles(UserRole.ADMIN)
  async create(
    @Body() dto: CreateUserDto,
  ): Promise<Omit<User, 'passwordHash'>> {
    return this.usersService.adminCreate(dto);
  }

  @Get(':id')
  @Roles(UserRole.ADMIN)
  async findOne(@Param('id') id: string): Promise<Omit<User, 'passwordHash'>> {
    const user = await this.usersService.findById(id);
    if (!user) {
      throw new NotFoundException('Không tìm thấy người dùng');
    }
    const { passwordHash: _passwordHash, ...safeUser } = user;
    return safeUser;
  }

  @Patch(':id')
  @Roles(UserRole.ADMIN)
  async adminUpdate(
    @CurrentUser('sub') adminId: string,
    @Param('id') id: string,
    @Body() dto: AdminUpdateUserDto,
  ): Promise<Omit<User, 'passwordHash'>> {
    return this.usersService.adminUpdate(adminId, id, dto);
  }

  @Delete(':id')
  @Roles(UserRole.ADMIN)
  async adminDelete(
    @CurrentUser('sub') adminId: string,
    @Param('id') id: string,
  ): Promise<{ message: string }> {
    return this.usersService.adminDelete(adminId, id);
  }
}
