import {
  Injectable,
  ConflictException,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as argon2 from 'argon2';
import { User } from './entities/user.entity.js';
import { UserRole } from './enums/user-role.enum.js';
import { UpdateProfileDto } from './dto/update-profile.dto.js';
import { CreateUserDto } from './dto/create-user.dto.js';
import { FilterUserDto } from './dto/filter-user.dto.js';
import { AdminUpdateUserDto } from './dto/admin-update-user.dto.js';
import type { PaginatedResult } from '../../common/dto/pagination.dto.js';

export type PaginatedUsersResult = PaginatedResult<Omit<User, 'passwordHash'>>;


@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
  ) {}

  async findByEmail(email: string): Promise<User | null> {
    return this.userRepository.findOne({
      where: { email: email.toLowerCase().trim() },
    });
  }

  async findById(id: string): Promise<User | null> {
    return this.userRepository.findOne({
      where: { id },
    });
  }

  async create(data: {
    email: string;
    passwordHash: string;
    role?: UserRole;
  }): Promise<User> {
    const existing = await this.findByEmail(data.email);
    if (existing) {
      throw new ConflictException('Email này đã được sử dụng');
    }

    const user = this.userRepository.create({
      email: data.email.toLowerCase().trim(),
      passwordHash: data.passwordHash,
      role: data.role ?? UserRole.USER,
    });

    return this.userRepository.save(user);
  }

  async updateProfile(
    userId: string,
    dto: UpdateProfileDto,
  ): Promise<Omit<User, 'passwordHash'>> {
    const user = await this.findById(userId);
    if (!user) {
      throw new NotFoundException('Không tìm thấy người dùng');
    }

    if (dto.fullName !== undefined) {
      user.fullName = dto.fullName.trim() || null;
    }
    if (dto.avatarUrl !== undefined) {
      user.avatarUrl = dto.avatarUrl || null;
    }
    if (dto.avatarMediaId !== undefined) {
      user.avatarMediaId = dto.avatarMediaId || null;
    }

    const saved = await this.userRepository.save(user);
    const { passwordHash: _passwordHash, ...safeUser } = saved;
    return safeUser;
  }

  async findAll(filter: FilterUserDto): Promise<PaginatedUsersResult> {
    const page = filter.page && Number(filter.page) > 0 ? Number(filter.page) : 1;
    const limit = filter.limit && Number(filter.limit) > 0 ? Number(filter.limit) : 10;
    const skip = (page - 1) * limit;

    const qb = this.userRepository.createQueryBuilder('user');

    if (filter.search && filter.search.trim().length > 0) {
      const search = `%${filter.search.toLowerCase().trim()}%`;
      qb.andWhere(
        '(LOWER(user.email) LIKE :search OR LOWER(COALESCE(user.fullName, \'\')) LIKE :search)',
        { search },
      );
    }

    if (filter.role) {
      qb.andWhere('user.role = :role', { role: filter.role });
    }

    if (filter.isActive !== undefined) {
      qb.andWhere('user.isActive = :isActive', { isActive: filter.isActive });
    }

    qb.orderBy('user.createdAt', 'DESC');
    qb.skip(skip).take(limit);

    const [users, total] = await qb.getManyAndCount();

    const items = users.map(
      ({ passwordHash: _passwordHash, ...safeUser }) => safeUser,
    );

    return {
      items,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit) || 1,
    };
  }

  async adminCreate(dto: CreateUserDto): Promise<Omit<User, 'passwordHash'>> {
    const existing = await this.findByEmail(dto.email);
    if (existing) {
      throw new ConflictException('Email này đã được sử dụng');
    }

    const passwordHash = await argon2.hash(dto.password);

    const user = this.userRepository.create({
      email: dto.email.toLowerCase().trim(),
      passwordHash,
      fullName: dto.fullName?.trim() || null,
      role: dto.role ?? UserRole.USER,
      isActive: dto.isActive ?? true,
    });

    const saved = await this.userRepository.save(user);
    const { passwordHash: _passwordHash, ...safeUser } = saved;
    return safeUser;
  }

  async adminUpdate(
    currentAdminId: string,
    targetUserId: string,
    dto: AdminUpdateUserDto,
  ): Promise<Omit<User, 'passwordHash'>> {
    const user = await this.findById(targetUserId);
    if (!user) {
      throw new NotFoundException('Không tìm thấy người dùng');
    }

    if (currentAdminId === targetUserId) {
      if (dto.role && dto.role !== UserRole.ADMIN) {
        throw new BadRequestException(
          'Bạn không thể tự hạ quyền Admin của chính mình',
        );
      }
      if (dto.isActive === false) {
        throw new BadRequestException(
          'Bạn không thể tự khóa tài khoản của chính mình',
        );
      }
    }

    if (dto.fullName !== undefined) {
      user.fullName = dto.fullName.trim() || null;
    }
    if (dto.role !== undefined) {
      user.role = dto.role;
    }
    if (dto.isActive !== undefined) {
      user.isActive = dto.isActive;
    }
    if (dto.password) {
      user.passwordHash = await argon2.hash(dto.password);
    }

    const saved = await this.userRepository.save(user);
    const { passwordHash: _passwordHash, ...safeUser } = saved;
    return safeUser;
  }

  async adminDelete(
    currentAdminId: string,
    targetUserId: string,
  ): Promise<{ message: string }> {
    if (currentAdminId === targetUserId) {
      throw new BadRequestException(
        'Bạn không thể tự xóa tài khoản của chính mình',
      );
    }

    const user = await this.findById(targetUserId);
    if (!user) {
      throw new NotFoundException('Không tìm thấy người dùng');
    }

    await this.userRepository.remove(user);
    return { message: 'Đã xóa người dùng thành công' };
  }
}
