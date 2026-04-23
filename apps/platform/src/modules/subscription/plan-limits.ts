export type PlanType = 'free' | 'pro' | 'team';

export interface PlanLimit {
  projects: number;
  jobs: number;
  executionsPerMonth: number;
  minIntervalSeconds: number;
  logRetentionDays: number;
  retries: number;
  fanOutPerRun: number;
  alertChannels: string[];
  teamMembers: number;
}

export const PLAN_LIMITS: Record<PlanType, PlanLimit> = {
  free: {
    projects: 1,
    jobs: 5,
    executionsPerMonth: 1_000,
    minIntervalSeconds: 60,
    logRetentionDays: 1,
    retries: 1,
    fanOutPerRun: 0,
    alertChannels: ['email'],
    teamMembers: 1,
  },
  pro: {
    projects: 5,
    jobs: 50,
    executionsPerMonth: 50_000,
    minIntervalSeconds: 10,
    logRetentionDays: 30,
    retries: 5,
    fanOutPerRun: 10,
    alertChannels: ['email', 'webhook'],
    teamMembers: 1,
  },
  team: {
    projects: Infinity,
    jobs: Infinity,
    executionsPerMonth: 500_000,
    minIntervalSeconds: 10,
    logRetentionDays: 90,
    retries: 10,
    fanOutPerRun: 100,
    alertChannels: ['email', 'webhook'],
    teamMembers: 10,
  },
};
