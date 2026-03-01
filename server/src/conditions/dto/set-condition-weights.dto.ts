export class ConditionWeightInputDto {
  propertyKey: string;
  weight: number;
}

export class SetConditionWeightsDto {
  items: ConditionWeightInputDto[];
}
