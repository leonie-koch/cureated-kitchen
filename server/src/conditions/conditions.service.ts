import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateConditionDto } from './dto/create-condition.dto';
import { UpdateConditionDto } from './dto/update-condition.dto';

const CONDITION_INCLUDE = {
  weights: {
    include: {
      property: true,
    },
  },
} satisfies Prisma.ConditionInclude;

@Injectable()
export class ConditionsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateConditionDto) {
    try {
      return await this.prisma.condition.create({
        data: {
          key: dto.key,
          label: dto.label,
          description: dto.description,
        },
        include: CONDITION_INCLUDE,
      });
    } catch (error) {
      this.throwKnownPrismaError(error);
      throw error;
    }
  }

  async findAll() {
    return this.prisma.condition.findMany({
      include: CONDITION_INCLUDE,
      orderBy: {
        label: 'asc',
      },
    });
  }

  async findOne(id: string) {
    const condition = await this.prisma.condition.findUnique({
      where: { id },
      include: CONDITION_INCLUDE,
    });

    if (!condition) {
      throw new NotFoundException(`Condition with id "${id}" not found`);
    }

    return condition;
  }

  async update(id: string, dto: UpdateConditionDto) {
    try {
      return await this.prisma.condition.update({
        where: { id },
        data: {
          key: dto.key,
          label: dto.label,
          description: dto.description,
        },
        include: CONDITION_INCLUDE,
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') {
        throw new NotFoundException(`Condition with id "${id}" not found`);
      }
      this.throwKnownPrismaError(error);
      throw error;
    }
  }

  async remove(id: string) {
    try {
      await this.prisma.condition.delete({
        where: { id },
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') {
        throw new NotFoundException(`Condition with id "${id}" not found`);
      }
      throw error;
    }
  }

  private throwKnownPrismaError(error: unknown): void {
    if (!(error instanceof Prisma.PrismaClientKnownRequestError)) {
      return;
    }

    if (error.code === 'P2002') {
      throw new BadRequestException('Condition key must be unique.');
    }
  }
}
