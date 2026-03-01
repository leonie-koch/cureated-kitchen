import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateRecipeDto } from './dto/create-recipe.dto';
import { UpdateRecipeDto } from './dto/update-recipe.dto';

const RECIPE_INCLUDE = {
  recipeIngredients: {
    include: {
      ingredient: true,
    },
  },
  propertyScores: {
    include: {
      property: true,
    },
  },
} satisfies Prisma.RecipeInclude;

@Injectable()
export class RecipesService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateRecipeDto) {
    try {
      return await this.prisma.$transaction(async (tx) => {
        const recipe = await tx.recipe.create({
          data: {
            title: dto.title,
            description: dto.description,
            servings: dto.servings,
            prepMinutes: dto.prepMinutes,
            cookMinutes: dto.cookMinutes,
            instructions: dto.instructions,
          },
        });

        if (dto.ingredients?.length) {
          await tx.recipeIngredient.createMany({
            data: dto.ingredients.map((ingredient) => ({
              recipeId: recipe.id,
              ingredientId: ingredient.ingredientId,
              amount: ingredient.amount,
              unit: ingredient.unit,
            })),
          });
        }

        return tx.recipe.findUniqueOrThrow({
          where: { id: recipe.id },
          include: RECIPE_INCLUDE,
        });
      });
    } catch (error) {
      this.throwKnownPrismaError(error);
      throw error;
    }
  }

  async findAll() {
    return this.prisma.recipe.findMany({
      include: RECIPE_INCLUDE,
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  async findOne(id: string) {
    const recipe = await this.prisma.recipe.findUnique({
      where: { id },
      include: RECIPE_INCLUDE,
    });

    if (!recipe) {
      throw new NotFoundException(`Recipe with id "${id}" not found`);
    }

    return recipe;
  }

  async update(id: string, dto: UpdateRecipeDto) {
    try {
      return await this.prisma.$transaction(async (tx) => {
        const existing = await tx.recipe.findUnique({
          where: { id },
          select: { id: true },
        });

        if (!existing) {
          throw new NotFoundException(`Recipe with id "${id}" not found`);
        }

        await tx.recipe.update({
          where: { id },
          data: {
            title: dto.title,
            description: dto.description,
            servings: dto.servings,
            prepMinutes: dto.prepMinutes,
            cookMinutes: dto.cookMinutes,
            instructions: dto.instructions,
          },
        });

        if (dto.ingredients) {
          await tx.recipeIngredient.deleteMany({
            where: { recipeId: id },
          });

          if (dto.ingredients.length) {
            await tx.recipeIngredient.createMany({
              data: dto.ingredients.map((ingredient) => ({
                recipeId: id,
                ingredientId: ingredient.ingredientId,
                amount: ingredient.amount,
                unit: ingredient.unit,
              })),
            });
          }
        }

        return tx.recipe.findUniqueOrThrow({
          where: { id },
          include: RECIPE_INCLUDE,
        });
      });
    } catch (error) {
      this.throwKnownPrismaError(error);
      throw error;
    }
  }

  async remove(id: string) {
    try {
      await this.prisma.recipe.delete({
        where: { id },
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') {
        throw new NotFoundException(`Recipe with id "${id}" not found`);
      }
      throw error;
    }
  }

  private throwKnownPrismaError(error: unknown): void {
    if (!(error instanceof Prisma.PrismaClientKnownRequestError)) {
      return;
    }

    if (error.code === 'P2003') {
      throw new BadRequestException(
        'One or more ingredientIds do not exist or violate relation constraints.',
      );
    }

    if (error.code === 'P2002') {
      throw new BadRequestException('Duplicate recipe ingredients are not allowed.');
    }
  }
}
