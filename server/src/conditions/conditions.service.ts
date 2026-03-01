import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateConditionDto } from './dto/create-condition.dto';
import { SetConditionWeightsDto } from './dto/set-condition-weights.dto';
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

  async setWeights(conditionId: string, dto: SetConditionWeightsDto) {
    const condition = await this.prisma.condition.findUnique({
      where: { id: conditionId },
      select: { id: true },
    });

    if (!condition) {
      throw new NotFoundException(`Condition with id "${conditionId}" not found`);
    }

    const items = dto.items ?? [];
    for (const item of items) {
      if (!item.propertyKey) {
        throw new BadRequestException('Each item must provide propertyKey.');
      }
      if (!Number.isFinite(item.weight) || item.weight < 0 || item.weight > 1) {
        throw new BadRequestException('Each weight must be a number between 0.0 and 1.0.');
      }
    }

    const uniqueKeys = Array.from(new Set(items.map((item) => item.propertyKey)));
    const properties = uniqueKeys.length
      ? await this.prisma.property.findMany({
          where: { key: { in: uniqueKeys } },
          select: { id: true, key: true },
        })
      : [];

    if (properties.length !== uniqueKeys.length) {
      const knownKeys = new Set(properties.map((property) => property.key));
      const missingKeys = uniqueKeys.filter((key) => !knownKeys.has(key));
      throw new BadRequestException(`Unknown propertyKey(s): ${missingKeys.join(', ')}`);
    }

    const propertyIdByKey = new Map(properties.map((property) => [property.key, property.id]));
    const rows = items.map((item) => ({
      conditionId,
      propertyId: propertyIdByKey.get(item.propertyKey)!,
      weight: item.weight,
    }));

    await this.prisma.$transaction(async (tx) => {
      await tx.conditionPropertyWeight.deleteMany({
        where: { conditionId },
      });

      if (rows.length) {
        await tx.conditionPropertyWeight.createMany({
          data: rows,
        });
      }
    });

    return this.prisma.condition.findUniqueOrThrow({
      where: { id: conditionId },
      include: CONDITION_INCLUDE,
    });
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
