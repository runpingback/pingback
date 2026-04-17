import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { randomBytes } from 'crypto';
import { Project } from './project.entity';
import { CreateProjectDto } from './dto/create-project.dto';

@Injectable()
export class ProjectsService {
  constructor(
    @InjectRepository(Project) private projectRepo: Repository<Project>,
  ) {}

  async create(userId: string, dto: CreateProjectDto) {
    const cronSecret = randomBytes(32).toString('hex');
    const project = this.projectRepo.create({
      userId,
      name: dto.name,
      endpointUrl: dto.endpointUrl,
      domain: dto.domain,
      cronSecret,
    });
    return this.projectRepo.save(project);
  }

  async findAllByUser(userId: string) {
    return this.projectRepo.find({ where: { userId } });
  }

  async findOneByUser(id: string, userId: string) {
    const project = await this.projectRepo.findOne({
      where: { id, userId },
    });
    if (!project) throw new NotFoundException('Project not found');
    return project;
  }

  async update(id: string, userId: string, dto: Partial<CreateProjectDto>) {
    const project = await this.findOneByUser(id, userId);
    if (dto.name) project.name = dto.name;
    if (dto.endpointUrl) project.endpointUrl = dto.endpointUrl;
    if (dto.domain !== undefined) project.domain = dto.domain;
    return this.projectRepo.save(project);
  }

  async remove(id: string, userId: string) {
    await this.findOneByUser(id, userId);
    await this.projectRepo.delete(id);
  }
}
