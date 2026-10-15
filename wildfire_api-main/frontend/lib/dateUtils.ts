/**
 * Utility functions for date operations in the wildfire application
 */

/**
 * Calculate the day of year (doy) where January 1 = 1, January 30 = 30, February 1 = 31, etc.
 * @param date - The date to calculate day of year for
 * @returns The day of year (1-365/366)
 */
export function calculateDayOfYear(date: Date): number {
  const start = new Date(date.getFullYear(), 0, 0);
  const diff = (date.getTime() - start.getTime()) + ((start.getTimezoneOffset() - date.getTimezoneOffset()) * 60 * 1000);
  const oneDay = 1000 * 60 * 60 * 24;
  const dayOfYear = Math.floor(diff / oneDay);
  return dayOfYear;
}

/**
 * Get the current day of year for today's date
 * @returns The day of year for today
 */
export function getCurrentDayOfYear(): number {
  return calculateDayOfYear(new Date());
}

/**
 * Validate if a date is within the allowed range (Jan 1 - Sept 30)
 * @param date - The date to validate
 * @returns True if the date is within the allowed range
 */
export function isValidWildfireDate(date: Date): boolean {
  const month = date.getMonth() + 1; // getMonth() returns 0-11, we want 1-12
  const day = date.getDate();
  
  // Valid months: 1-9 (January to September)
  if (month < 1 || month > 9) {
    return false;
  }
  
  // For September, only allow up to day 30
  if (month === 9 && day > 30) {
    return false;
  }
  
  return true;
}

/**
 * Get maximum day of year for the current year up to September 30
 * @param year - The year to calculate for (optional, defaults to current year)
 * @returns The maximum day of year (September 30)
 */
export function getMaxDayOfYear(year?: number): number {
  const currentYear = year || new Date().getFullYear();
  const sept30 = new Date(currentYear, 8, 30); // Month is 0-indexed, so 8 = September
  return calculateDayOfYear(sept30);
}