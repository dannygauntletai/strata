/**
 * Academic Year Utilities
 * Handles logic for determining the next academic year based on current date
 */

/**
 * Get the next academic year in YYYY-YYYY format
 * If it's currently spring semester (Jan-June), returns the current year's fall semester
 * If it's currently fall semester (July-Dec), returns next year's fall semester
 */
export function getNextAcademicYear(): string {
  const now = new Date()
  const currentYear = now.getFullYear()
  const currentMonth = now.getMonth() + 1 // getMonth() returns 0-11
  
  // If we're in spring semester (January through June), the next academic year
  // starts in the fall of the same calendar year
  if (currentMonth >= 1 && currentMonth <= 6) {
    return `${currentYear}-${currentYear + 1}`
  } 
  // If we're in fall semester (July through December), the next academic year
  // starts in the fall of the next calendar year
  else {
    return `${currentYear + 1}-${currentYear + 2}`
  }
}

/**
 * Get the current academic year in YYYY-YYYY format
 * Academic year runs from August to July
 */
export function getCurrentAcademicYear(): string {
  const now = new Date()
  const currentYear = now.getFullYear()
  const currentMonth = now.getMonth() + 1
  
  // If we're in January through July, we're in the spring of the academic year
  // that started the previous August
  if (currentMonth >= 1 && currentMonth <= 7) {
    return `${currentYear - 1}-${currentYear}`
  }
  // If we're in August through December, we're in the fall of the current academic year
  else {
    return `${currentYear}-${currentYear + 1}`
  }
}

/**
 * Check if we're currently in spring semester
 */
export function isSpringSemester(): boolean {
  const now = new Date()
  const currentMonth = now.getMonth() + 1
  return currentMonth >= 1 && currentMonth <= 6
} 