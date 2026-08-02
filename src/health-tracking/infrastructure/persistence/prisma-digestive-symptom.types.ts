export interface PrismaDigestiveSymptomLinkRecord {
  mealId?: string | null;
  foodId?: string;
  source?: string;
  snapshot?: Record<string, unknown> | null;
}
export interface PrismaDigestiveSymptomRecord {
  id: string;
  adultProfileId: string;
  type: string;
  customTypeName: string | null;
  intensity: number;
  startAt: Date;
  endAt: Date | null;
  notes: string | null;
  status: string;
  correctedFromId: string | null;
  mealLinks: PrismaDigestiveSymptomLinkRecord[];
  foodLinks: PrismaDigestiveSymptomLinkRecord[];
}
export interface DigestiveSymptomDelegate {
  findFirst(args: unknown): Promise<PrismaDigestiveSymptomRecord | null>;
  findMany(args: unknown): Promise<PrismaDigestiveSymptomRecord[]>;
  count(args: unknown): Promise<number>;
  upsert(args: unknown): Promise<PrismaDigestiveSymptomRecord>;
}
export interface DigestiveSymptomMealLinkDelegate {
  createMany(args: unknown): Promise<unknown>;
}
export interface DigestiveSymptomFoodLinkDelegate {
  createMany(args: unknown): Promise<unknown>;
}
