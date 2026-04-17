import {
  Entity, PrimaryGeneratedColumn, Column, CreateDateColumn,
  ManyToOne, JoinColumn, Index,
} from 'typeorm';
import { Project } from '../projects/project.entity';

@Entity('api_keys')
export class ApiKey {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid', name: 'project_id' })
  projectId: string;

  @ManyToOne(() => Project, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'project_id' })
  project: Project;

  @Column({ type: 'text' })
  name: string;

  @Index()
  @Column({ type: 'text', name: 'key_hash' })
  keyHash: string;

  @Column({ type: 'text', name: 'key_prefix' })
  keyPrefix: string;

  @Column({ type: 'timestamp', nullable: true, name: 'last_used_at' })
  lastUsedAt: Date;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
