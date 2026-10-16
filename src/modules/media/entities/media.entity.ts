import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { User } from '../../users/entities/user.entity.js';

@Entity('media')
export class Media {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'user_id', type: 'uuid' })
  userId: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column({ name: 'public_id', type: 'varchar', length: 255 })
  publicId: string;

  @Column({ name: 'secure_url', type: 'varchar', length: 1000 })
  secureUrl: string;

  @Column({ type: 'varchar', length: 50, nullable: true })
  format: string | null;

  @Column({ type: 'int', nullable: true })
  width: number | null;

  @Column({ type: 'int', nullable: true })
  height: number | null;

  @Column({ type: 'int', nullable: true })
  bytes: number | null;

  @Column({ name: 'original_filename', type: 'varchar', length: 255, nullable: true })
  originalFilename: string | null;

  @Column({ name: 'resource_type', type: 'varchar', length: 100, default: 'image' })
  resourceType: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  folder: string | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamp' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamp' })
  updatedAt: Date;
}
