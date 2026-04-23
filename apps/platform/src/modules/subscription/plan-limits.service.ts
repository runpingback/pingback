import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../../entities/user.entity';
import { Project } from '../projects/project.entity';
import { Job } from '../jobs/job.entity';
import { PLAN_LIMITS, PlanType } from './plan-limits';

interface LimitCheck {
  allowed: boolean;
  message?: string;
}

@Injectable()
export class PlanLimitsService {
  constructor(
    @InjectRepository(Project) private projectRepo: Repository<Project>,
    @InjectRepository(Job) private jobRepo: Repository<Job>,
  ) {}

  private limits(user: User) {
    return PLAN_LIMITS[user.plan as PlanType] || PLAN_LIMITS.free;
  }

  async canCreateProject(user: User): Promise<LimitCheck> {
    const limits = this.limits(user);
    if (limits.projects === Infinity) return { allowed: true };
    const count = await this.projectRepo.count({ where: { userId: user.id } });
    if (count >= limits.projects) {
      return {
        allowed: false,
        message: `Project limit reached (${count}/${limits.projects}). Upgrade your plan.`,
      };
    }
    return { allowed: true };
  }

  async canCreateJob(user: User, projectId: string): Promise<LimitCheck> {
    const limits = this.limits(user);
    if (limits.jobs === Infinity) return { allowed: true };
    const count = await this.jobRepo.count({
      where: { projectId, status: 'active' as any },
    });
    if (count >= limits.jobs) {
      return {
        allowed: false,
        message: `Job limit reached (${count}/${limits.jobs}). Upgrade your plan.`,
      };
    }
    return { allowed: true };
  }

  canExecute(user: User): LimitCheck {
    const limits = this.limits(user);
    if (user.executionsThisMonth >= limits.executionsPerMonth) {
      return {
        allowed: false,
        message: 'Monthly execution limit reached. Upgrade your plan.',
      };
    }
    return { allowed: true };
  }

  checkInterval(user: User, intervalSeconds: number): LimitCheck {
    const limits = this.limits(user);
    if (intervalSeconds < limits.minIntervalSeconds) {
      return {
        allowed: false,
        message: `Minimum interval is ${limits.minIntervalSeconds}s on ${user.plan} plan.`,
      };
    }
    return { allowed: true };
  }

  capRetries(user: User, retries: number): number {
    const limits = this.limits(user);
    return Math.min(retries, limits.retries);
  }

  capFanOut(user: User, tasks: any[]): any[] {
    const limits = this.limits(user);
    return tasks.slice(0, limits.fanOutPerRun);
  }

  checkAlertChannel(user: User, channel: string): LimitCheck {
    const limits = this.limits(user);
    if (!limits.alertChannels.includes(channel)) {
      return {
        allowed: false,
        message: `${channel} alerts require Pro or Team plan.`,
      };
    }
    return { allowed: true };
  }

  async getUsage(user: User) {
    const limits = this.limits(user);
    const projectCount = await this.projectRepo.count({ where: { userId: user.id } });

    const jobCount = await this.jobRepo
      .createQueryBuilder('job')
      .innerJoin('job.project', 'project')
      .where('project.user_id = :userId', { userId: user.id })
      .andWhere('job.status = :status', { status: 'active' })
      .getCount();

    return {
      plan: user.plan,
      projects: { used: projectCount, limit: limits.projects },
      jobs: { used: jobCount, limit: limits.jobs },
      executions: {
        used: user.executionsThisMonth,
        limit: limits.executionsPerMonth,
        resetsAt: user.executionsResetAt,
      },
    };
  }
}
