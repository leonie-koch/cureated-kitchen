import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateIngredientDto } from './dto/create-ingredient.dto';
import { UpdateIngredientDto } from './dto/update-ingredient.dto';

@Injectable()
export class IngredientsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateIngredientDto) {
    try {
      return await this.prisma.ingredient.create({
        data: {
          name: dto.name,
          defaultUnit: dto.defaultUnit,
          kcalPer100g: dto.kcalPer100g,
          sugarPer100g: dto.sugarPer100g,
          magnesiumPer100gMg: dto.magnesiumPer100gMg,
          vitaminB12Per100g: dto.vitaminB12Per100g,
        },
      });
    } catch (error) {
      this.throwKnownPrismaError(error);
      throw error;
    }
  }

  async findAll() {
    return this.prisma.ingredient.findMany({
      orderBy: {
        name: 'asc',
      },
    });
  }

  async findOne(id: string) {
    const ingredient = await this.prisma.ingredient.findUnique({
      where: { id },
    });

    if (!ingredient) {
      throw new NotFoundException(`Ingredient with id "${id}" not found`);
    }

    return ingredient;
  }

  async update(id: string, dto: UpdateIngredientDto) {
    try {
      return await this.prisma.ingredient.update({
        where: { id },
        data: {
          name: dto.name,
          defaultUnit: dto.defaultUnit,
          kcalPer100g: dto.kcalPer100g,
          sugarPer100g: dto.sugarPer100g,
          magnesiumPer100gMg: dto.magnesiumPer100gMg,
          vitaminB12Per100g: dto.vitaminB12Per100g,
        },
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') {
        throw new NotFoundException(`Ingredient with id "${id}" not found`);
      }
      this.throwKnownPrismaError(error);
      throw error;
    }
  }

  async remove(id: string) {
    try {
      await this.prisma.ingredient.delete({
        where: { id },
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') {
        throw new NotFoundException(`Ingredient with id "${id}" not found`);
      }
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2003') {
        throw new BadRequestException(
          'Ingredient is still referenced by recipes and cannot be deleted.',
        );
      }
      throw error;
    }
  }

  private throwKnownPrismaError(error: unknown): void {
    if (!(error instanceof Prisma.PrismaClientKnownRequestError)) {
      return;
    }

    if (error.code === 'P2002') {
      throw new BadRequestException('Ingredient name must be unique.');
    }
  }
}
