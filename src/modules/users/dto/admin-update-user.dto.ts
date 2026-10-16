import { IsOptional, IsEnum, IsString, MinLength, IsBoolean } from 'class-validator';
import { UserRole } from '../enums/user-role.enum.js';

export class AdminUpdateUserDto {
  @IsOptional()
  @IsString({ message: 'Họ tên phải là chuỗi' })
  fullName?: string;

  @IsOptional()
  @IsEnum(UserRole, { message: 'Role không hợp lệ' })
  role?: UserRole;

  @IsOptional()
  @IsBoolean({ message: 'Trạng thái hoạt động phải là boolean' })
  isActive?: boolean;

  @IsOptional()
  @MinLength(6, { message: 'Mật khẩu mới phải có ít nhất 6 ký tự' })
  password?: string;
}
