export class UpdateIngredientDto {
  name?: string;
  defaultUnit?: string | null;
  kcalPer100g?: number | null;
  sugarPer100g?: number | null;
  magnesiumPer100gMg?: number | null;
  vitaminB12Per100g?: number | null;
}
