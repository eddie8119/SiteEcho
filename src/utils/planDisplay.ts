/**
 * Formats plan name for display.
 */
export const formatPlanDisplayName = (
  plan: string | null | undefined,
  _translate?: (key: string) => string
): string => {
  if (!plan) return '';

  return plan;
};
