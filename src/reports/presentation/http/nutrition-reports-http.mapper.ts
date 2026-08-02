import type {
  DailyNutritionReport,
  WeeklyNutritionReport,
} from '../../application/use-cases/get-nutrition-reports.query';
import {
  NutritionReportResponseDto,
  WeeklyNutritionReportResponseDto,
} from './dto/nutrition-report.dto';

export function toDailyNutritionReportResponse(
  report: DailyNutritionReport,
): NutritionReportResponseDto {
  return report;
}
export function toWeeklyNutritionReportResponse(
  report: WeeklyNutritionReport,
): WeeklyNutritionReportResponseDto {
  return report;
}
