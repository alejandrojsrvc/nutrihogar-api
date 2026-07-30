export interface HouseholdView {
  id: string;
  name: string;
  timezone: string;
  currency: string;
  weeklyBudget: string | null;
  createdById: string;
  createdAt: Date;
  updatedAt: Date;
}
