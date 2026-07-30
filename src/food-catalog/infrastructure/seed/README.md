# Fuente del catálogo nutricional inicial

Los valores del seed están expresados por `100 g` y fueron transcritos de registros oficiales de
[USDA FoodData Central](https://fdc.nal.usda.gov/). Cada alimento conserva:

- el dataset en `source`;
- el identificador FDC estable en `sourceReference`;
- la descripción original utilizada en `description`.

Datasets consultados:

- `USDA_FDC_SR_LEGACY`: FoodData Central SR Legacy, publicación final de abril de 2018.
- `USDA_FDC_FNDDS_2021_2023`: Food and Nutrient Database for Dietary Studies 2021-2023,
  publicación de octubre de 2024.

Mapeo de nutrientes FDC:

| Código NutriHogar | FDC nutrient ID |
| --- | ---: |
| ENERGY_KCAL | 1008 |
| PROTEIN | 1003 |
| CARBOHYDRATE | 1005 |
| FAT | 1004 |
| FIBER | 1079 |
| SUGAR | 2000 |
| SATURATED_FAT | 1258 |
| SODIUM | 1093 |
| CALCIUM | 1087 |
| IRON | 1089 |
| POTASSIUM | 1092 |
| MAGNESIUM | 1090 |
| VITAMIN_C | 1162 |
| VITAMIN_A | 1106 |

No se convierten nutrientes ausentes en cero. Los ceros versionados son valores explícitamente
reportados por el registro FDC correspondiente.
