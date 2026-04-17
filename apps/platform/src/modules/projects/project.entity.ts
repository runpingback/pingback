import {
  Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn,
  ManyToOne, JoinColumn, Unique,
} from 'typeorm';
import { User } from '../../entities/user.entity';

@Entity('projects')
@Unique(['userId', 'name'])
export class Project {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid', name: 'user_id' })
  userId: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column({ type: 'text' })
  name: string;

  @Column({ type: 'text', nullable: true })
  domain: string;

  @Column({ type: 'text', name: 'cron_secret' })
  cronSecret: string;

  @Column({ type: 'text', name: 'endpoint_url' })
  endpointUrl: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
