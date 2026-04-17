import {
  Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn,
  ManyToOne, JoinColumn, Unique, Index,
} from 'typeorm';
import { Project } from '../projects/project.entity';

@Entity('jobs')
@Unique(['projectId', 'name'])
@Index(['status', 'nextRunAt'])
export class Job {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid', name: 'project_id' })
  projectId: string;

  @ManyToOne(() => Project, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'project_id' })
  project: Project;

  @Column({ type: 'text' })
  name: string;

  @Column({ type: 'text', nullable: true })
  schedule: string;

  @Column({ type: 'enum', enum: ['active', 'paused', 'inactive'], default: 'active' })
  status: 'active' | 'paused' | 'inactive';

  @Column({ type: 'timestamp', nullable: true, name: 'next_run_at' })
  nextRunAt: Date;

  @Column({ type: 'timestamp', nullable: true, name: 'last_run_at' })
  lastRunAt: Date;

  @Column({ type: 'int', default: 0 })
  retries: number;

  @Column({ type: 'int', default: 30, name: 'timeout_seconds' })
  timeoutSeconds: number;

  @Column({ type: 'int', default: 1 })
  concurrency: number;

  @Column({ type: 'enum', enum: ['sdk', 'manual'], default: 'sdk' })
  source: 'sdk' | 'manual';

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
