import {
  Entity, PrimaryGeneratedColumn, Column, CreateDateColumn,
  ManyToOne, JoinColumn, Index,
} from 'typeorm';
import { Job } from '../jobs/job.entity';

@Entity('executions')
@Index(['jobId', 'createdAt'])
@Index(['status'])
export class Execution {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid', name: 'job_id' })
  jobId: string;

  @ManyToOne(() => Job, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'job_id' })
  job: Job;

  @Column({ type: 'enum', enum: ['pending', 'running', 'success', 'failed'], default: 'pending' })
  status: 'pending' | 'running' | 'success' | 'failed';

  @Column({ type: 'int', default: 1 })
  attempt: number;

  @Column({ type: 'timestamp', name: 'scheduled_at' })
  scheduledAt: Date;

  @Column({ type: 'timestamp', nullable: true, name: 'started_at' })
  startedAt: Date;

  @Column({ type: 'timestamp', nullable: true, name: 'completed_at' })
  completedAt: Date;

  @Column({ type: 'int', nullable: true, name: 'duration_ms' })
  durationMs: number;

  @Column({ type: 'int', nullable: true, name: 'http_status' })
  httpStatus: number;

  @Column({ type: 'text', nullable: true, name: 'response_body' })
  responseBody: string;

  @Column({ type: 'text', nullable: true, name: 'error_message' })
  errorMessage: string;

  @Column({ type: 'jsonb', default: '[]' })
  logs: Array<{ timestamp: number; message: string }>;

  @Column({ type: 'uuid', nullable: true, name: 'parent_id' })
  parentId: string | null;

  @ManyToOne(() => Execution, { nullable: true })
  @JoinColumn({ name: 'parent_id' })
  parent: Execution;

  @Column({ type: 'jsonb', nullable: true })
  payload: any;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
