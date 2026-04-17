import {
  Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn,
  ManyToOne, JoinColumn,
} from 'typeorm';
import { Project } from '../projects/project.entity';
import { Job } from '../jobs/job.entity';

@Entity('alerts')
export class Alert {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid', name: 'project_id' })
  projectId: string;

  @ManyToOne(() => Project, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'project_id' })
  project: Project;

  @Column({ type: 'uuid', nullable: true, name: 'job_id' })
  jobId: string;

  @ManyToOne(() => Job, { nullable: true })
  @JoinColumn({ name: 'job_id' })
  job: Job;

  @Column({ type: 'enum', enum: ['email'], default: 'email' })
  channel: 'email';

  @Column({ type: 'text' })
  target: string;

  @Column({ type: 'enum', enum: ['consecutive_failures', 'duration_exceeded', 'missed_run'], name: 'trigger_type' })
  triggerType: 'consecutive_failures' | 'duration_exceeded' | 'missed_run';

  @Column({ type: 'int', name: 'trigger_value' })
  triggerValue: number;

  @Column({ type: 'boolean', default: true })
  enabled: boolean;

  @Column({ type: 'timestamp', nullable: true, name: 'last_fired_at' })
  lastFiredAt: Date;

  @Column({ type: 'int', default: 3600, name: 'cooldown_seconds' })
  cooldownSeconds: number;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
