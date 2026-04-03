/**
 * Market Calendar Utilities
 * 
 * Fetches and caches market holidays from reliable sources.
 * Falls back to hardcoded list if APIs fail.
 */

// NYSE Market Holidays - These are the STOCK MARKET holidays, not general US holidays
// Source: https://www.nyse.com/markets/hours-calendars
const NYSE_HOLIDAYS_2026 = [
  '2026-01-01', // New Year's Day
  '2026-01-19', // Martin Luther King Jr. Day
  '2026-02-16', // Presidents Day
  '2026-04-03', // Good Friday
  '2026-05-25', // Memorial Day
  '2026-07-03', // Independence Day (observed - July 4 is Saturday)
  '2026-09-07', // Labor Day
  '2026-11-26', // Thanksgiving Day
  '2026-12-25', // Christmas Day
];

const NYSE_HOLIDAYS_2027 = [
  '2027-01-01', // New Year's Day
  '2027-01-18', // Martin Luther King Jr. Day
  '2027-02-15', // Presidents Day
  '2027-03-26', // Good Friday
  '2027-05-31', // Memorial Day
  '2027-07-05', // Independence Day (observed - July 4 is Sunday)
  '2027-09-06', // Labor Day
  '2027-11-25', // Thanksgiving Day
  '2027-12-24', // Christmas Day (observed - Dec 25 is Saturday)
];

// Early close days (market closes at 1 PM ET)
const EARLY_CLOSE_2026 = [
  '2026-07-02', // Day before Independence Day (observed)
  '2026-11-27', // Day after Thanksgiving
  '2026-12-24', // Christmas Eve
];

const EARLY_CLOSE_2027 = [
  '2027-07-02', // Day before Independence Day
  '2027-11-26', // Day after Thanksgiving
];

// Cache for dynamically fetched holidays
let cachedHolidays: { [year: string]: string[] } = {};
let lastFetch: number = 0;
const CACHE_DURATION_MS = 24 * 60 * 60 * 1000; // 24 hours

/**
 * Get market holidays for a given year
 * Tries to fetch from API, falls back to hardcoded list
 */
export async function getMarketHolidays(year: number): Promise<string[]> {
  // Check hardcoded first
  if (year === 2026) return NYSE_HOLIDAYS_2026;
  if (year === 2027) return NYSE_HOLIDAYS_2027;
  
  // For other years, try to fetch from Nager.at (free, no auth)
  // and filter to NYSE-observed holidays only
  const cacheKey = String(year);
  const now = Date.now();
  
  if (cachedHolidays[cacheKey] && now - lastFetch < CACHE_DURATION_MS) {
    return cachedHolidays[cacheKey];
  }
  
  try {
    const response = await fetch(`https://date.nager.at/api/v3/PublicHolidays/${year}/US`);
    if (!response.ok) throw new Error('API error');
    
    const holidays = await response.json() as Array<{
      date: string;
      localName: string;
      global: boolean;
    }>;
    
    // Filter to NYSE-observed holidays (global federal holidays + Good Friday)
    const nyseHolidays = holidays
      .filter(h => 
        h.global || 
        h.localName === 'Good Friday'
      )
      .filter(h => 
        // NYSE observes these specific holidays
        h.localName.includes('New Year') ||
        h.localName.includes('Martin Luther King') ||
        h.localName.includes('President') ||
        h.localName.includes('Washington') ||
        h.localName.includes('Good Friday') ||
        h.localName.includes('Memorial') ||
        h.localName.includes('Independence') ||
        h.localName.includes('Labor') ||
        h.localName.includes('Thanksgiving') ||
        h.localName.includes('Christmas')
      )
      .map(h => h.date);
    
    cachedHolidays[cacheKey] = nyseHolidays;
    lastFetch = now;
    
    return nyseHolidays;
  } catch (error) {
    console.warn(`[MarketCalendar] Failed to fetch holidays for ${year}, using fallback`);
    // Return closest known year as fallback
    return year < 2026 ? NYSE_HOLIDAYS_2026 : NYSE_HOLIDAYS_2027;
  }
}

/**
 * Check if a specific date is a market holiday
 */
export async function isMarketHoliday(date: Date | string): Promise<boolean> {
  const d = typeof date === 'string' ? new Date(date) : date;
  const year = d.getFullYear();
  const dateStr = d.toISOString().split('T')[0];
  
  const holidays = await getMarketHolidays(year);
  return holidays.includes(dateStr);
}

/**
 * Check if a specific date is an early close day
 */
export function isEarlyCloseDay(date: Date | string): boolean {
  const d = typeof date === 'string' ? new Date(date) : date;
  const year = d.getFullYear();
  const dateStr = d.toISOString().split('T')[0];
  
  if (year === 2026) return EARLY_CLOSE_2026.includes(dateStr);
  if (year === 2027) return EARLY_CLOSE_2027.includes(dateStr);
  return false;
}

/**
 * Get market close time for a date (accounts for early close days)
 * Returns hour in ET (16 = 4 PM, 13 = 1 PM for early close)
 */
export function getMarketCloseHourET(date: Date | string): number {
  return isEarlyCloseDay(date) ? 13 : 16;
}

/**
 * Get upcoming market holidays
 */
export async function getUpcomingHolidays(count: number = 3): Promise<Array<{ date: string; name: string }>> {
  const now = new Date();
  const year = now.getFullYear();
  
  const holidayNames: { [date: string]: string } = {
    // 2026
    '2026-01-01': 'New Year\'s Day',
    '2026-01-19': 'Martin Luther King Jr. Day',
    '2026-02-16': 'Presidents Day',
    '2026-04-03': 'Good Friday',
    '2026-05-25': 'Memorial Day',
    '2026-07-03': 'Independence Day (observed)',
    '2026-09-07': 'Labor Day',
    '2026-11-26': 'Thanksgiving Day',
    '2026-12-25': 'Christmas Day',
    // 2027
    '2027-01-01': 'New Year\'s Day',
    '2027-01-18': 'Martin Luther King Jr. Day',
    '2027-02-15': 'Presidents Day',
    '2027-03-26': 'Good Friday',
    '2027-05-31': 'Memorial Day',
    '2027-07-05': 'Independence Day (observed)',
    '2027-09-06': 'Labor Day',
    '2027-11-25': 'Thanksgiving Day',
    '2027-12-24': 'Christmas Day (observed)',
  };
  
  const allHolidays = [...NYSE_HOLIDAYS_2026, ...NYSE_HOLIDAYS_2027]
    .filter(d => new Date(d) >= now)
    .slice(0, count);
  
  return allHolidays.map(date => ({
    date,
    name: holidayNames[date] || 'Market Holiday',
  }));
}

export default {
  getMarketHolidays,
  isMarketHoliday,
  isEarlyCloseDay,
  getMarketCloseHourET,
  getUpcomingHolidays,
};
