import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ConditionsModule } from './conditions/conditions.module';
import { IngredientsModule } from './ingredients/ingredients.module';
import { PrismaModule } from './prisma/prisma.module';
import { RecipesModule } from './recipes/recipes.module';

@Module({
  imports: [
    ConfigModule.forRoot(),
    PrismaModule,
    RecipesModule,
    IngredientsModule,
    ConditionsModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
