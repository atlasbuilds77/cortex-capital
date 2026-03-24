// Cortex Capital - Profile Configurations
// Defines the 3 risk profiles with their specific allocations and rules

export type RiskProfile = 'conservative' | 'moderate' | 'ultra_aggressive';

export interface ProfileConfig {
  name: RiskProfile;
  description: string;
  targetAge: string;
  targetCapital: string;
  
  // Asset allocation
  allocation: {
    stocks: number;
    bonds: number;
    cash: number;
    leaps?: number;
    spreads?: number;
    dayTrading?: number;
  };
  
  // Instrument rules
  instruments: string[];
  etfPercentage?: number;
  individualStockPercentage?: number;
  
  // Rebalancing rules
  rebalanceFrequency: 'quarterly' | 'monthly' | 'weekly';
  driftThreshold: number; // % drift before rebalancing
  maxTrades: number | 'unlimited';
  
  // Options rules
  options?: {
    leaps?: {
      maxAllocation: number;
      deltaRange: [number, number]; // [min, max]
      minDTE: number; // days to expiry
    };
    spreads?: {
      maxAllocation: number;
      maxRiskPerSpread: number;
    };
    coveredCalls?: {
      otmRange: [number, number]; // % OTM
      dteRange: [number, number]; // days to expiry
    };
  };
  
  // Day trading rules (ultra aggressive only)
  dayTrading?: {
    allocation: number;
    maxRiskPerTrade: number; // % of day trading capital
    noOvernightHolds: boolean;
    forceExitTime: string; // e.g., "15:45"
  };
  
  // Execution rules
  execution: {
    window: string; // e.g., "10:00-14:00", "market_open", "24/7"
    orderType: 'limit' | 'market' | 'prefer_limit';
    speedPriority: 'low' | 'medium' | 'high';
  };
  
  // Tax optimization
  taxOptimize: 'maximize' | 'balanced' | 'minimal';
  
  // Sector preferences
  sectors: string[];
}

export const PROFILE_CONFIGS: Record<RiskProfile, ProfileConfig> = {
  conservative: {
    name: 'conservative',
    description: 'Stocks only, ETFs, quarterly rebalancing. Focus on capital preservation.',
    targetAge: '50+ years',
    targetCapital: '$50K-$100K',
    
    allocation: {
      stocks: 50,
      bonds: 40,
      cash: 10,
    },
    
    instruments: ['ETFs only'],
    etfPercentage: 100,
    individualStockPercentage: 0,
    
    rebalanceFrequency: 'quarterly',
    driftThreshold: 0.10, // 10%
    maxTrades: 5,
    
    execution: {
      window: '10:00-14:00',
      orderType: 'limit',
      speedPriority: 'low',
    },
    
    taxOptimize: 'maximize',
    sectors: ['defensive'],
  },
  
  moderate: {
    name: 'moderate',
    description: 'Stocks + LEAPS, monthly rebalancing. Balanced growth with options exposure.',
    targetAge: '30-50 years',
    targetCapital: '$10K-$75K',
    
    allocation: {
      stocks: 50,
      leaps: 20,
      bonds: 20,
      cash: 10,
    },
    
    instruments: ['stocks', 'ETFs', 'LEAPS'],
    etfPercentage: 60,
    individualStockPercentage: 40,
    
    rebalanceFrequency: 'monthly',
    driftThreshold: 0.05, // 5%
    maxTrades: 15,
    
    options: {
      leaps: {
        maxAllocation: 0.20, // 20% of portfolio
        deltaRange: [0.70, 0.80], // Deep ITM
        minDTE: 365, // 1+ year
      },
    },
    
    execution: {
      window: 'market_open',
      orderType: 'prefer_limit',
      speedPriority: 'medium',
    },
    
    taxOptimize: 'balanced',
    sectors: ['rotation allowed'],
  },
  
  ultra_aggressive: {
    name: 'ultra_aggressive',
    description: 'Full options + day trading + weekly rotation. Maximum growth potential.',
    targetAge: '25-40 years',
    targetCapital: '$5K-$50K',
    
    allocation: {
      stocks: 30,
      bonds: 0,
      leaps: 30,
      spreads: 20,
      dayTrading: 20,
      cash: 0,
    },
    
    instruments: ['stocks', 'LEAPS', 'spreads', 'covered_calls'],
    etfPercentage: 0,
    individualStockPercentage: 100,
    
    rebalanceFrequency: 'weekly',
    driftThreshold: 0.03, // 3%
    maxTrades: 'unlimited',
    
    options: {
      leaps: {
        maxAllocation: 0.30, // 30% of portfolio
        deltaRange: [0.70, 0.80],
        minDTE: 365,
      },
      spreads: {
        maxAllocation: 0.20,
        maxRiskPerSpread: 1000,
      },
      coveredCalls: {
        otmRange: [0.10, 0.15], // 10-15% OTM
        dteRange: [30, 45], // 30-45 days to expiry
      },
    },
    
    dayTrading: {
      allocation: 0.20, // 20% of portfolio
      maxRiskPerTrade: 0.05, // 5% of day trading capital
      noOvernightHolds: true,
      forceExitTime: '15:45', // 3:45 PM
    },
    
    execution: {
      window: '24/7',
      orderType: 'market',
      speedPriority: 'high',
    },
    
    taxOptimize: 'minimal',
    sectors: ['momentum', 'growth', 'speculative'],
  },
};

// Helper functions
export function getProfileConfig(profile: RiskProfile): ProfileConfig {
  return PROFILE_CONFIGS[profile];
}

export function isValidProfile(profile: string): profile is RiskProfile {
  return profile in PROFILE_CONFIGS;
}

export function getProfileAllocation(profile: RiskProfile) {
  return PROFILE_CONFIGS[profile].allocation;
}

export function getRebalanceFrequency(profile: RiskProfile) {
  return PROFILE_CONFIGS[profile].rebalanceFrequency;
}

export function getMaxTrades(profile: RiskProfile): number {
  const maxTrades = PROFILE_CONFIGS[profile].maxTrades;
  return maxTrades === 'unlimited' ? Infinity : maxTrades;
}

export function shouldIncludeOptions(profile: RiskProfile): boolean {
  return profile === 'moderate' || profile === 'ultra_aggressive';
}

export function shouldIncludeDayTrading(profile: RiskProfile): boolean {
  return profile === 'ultra_aggressive';
}

// Execution window helpers
export function isInExecutionWindow(profile: RiskProfile, currentTime: Date = new Date()): boolean {
  const config = PROFILE_CONFIGS[profile];
  const window = config.execution.window;
  
  if (window === '24/7') return true;
  if (window === 'market_open') {
    // Market hours: 6:30 AM - 1:00 PM PST (9:30 AM - 4:00 PM EST)
    const hour = currentTime.getHours();
    const minute = currentTime.getMinutes();
    const timeInMinutes = hour * 60 + minute;
    
    // Convert to PST (assuming server is in PST)
    // Market open: 6:30 PST = 6*60 + 30 = 390
    // Market close: 13:00 PST = 13*60 = 780
    return timeInMinutes >= 390 && timeInMinutes <= 780;
  }
  if (window.includes('-')) {
    // Specific window like "10:00-14:00"
    const [startStr, endStr] = window.split('-');
    const [startHour, startMinute] = startStr.split(':').map(Number);
    const [endHour, endMinute] = endStr.split(':').map(Number);
    
    const currentHour = currentTime.getHours();
    const currentMinute = currentTime.getMinutes();
    const currentTimeInMinutes = currentHour * 60 + currentMinute;
    const startTimeInMinutes = startHour * 60 + startMinute;
    const endTimeInMinutes = endHour * 60 + endMinute;
    
    return currentTimeInMinutes >= startTimeInMinutes && currentTimeInMinutes <= endTimeInMinutes;
  }
  
  return true; // Default to true if window format not recognized
}

// Order type helper
export function getOrderType(profile: RiskProfile): 'limit' | 'market' {
  const config = PROFILE_CONFIGS[profile];
  if (config.execution.orderType === 'prefer_limit') {
    return 'limit';
  }
  return config.execution.orderType;
}

// Test function
export function testProfileConfigs() {
  console.log('Testing Profile Configurations:');
  
  Object.entries(PROFILE_CONFIGS).forEach(([profile, config]) => {
    console.log(`\n${profile.toUpperCase()}:`);
    console.log(`  Description: ${config.description}`);
    console.log(`  Allocation: ${JSON.stringify(config.allocation)}`);
    console.log(`  Rebalance: ${config.rebalanceFrequency}`);
    console.log(`  Max Trades: ${config.maxTrades}`);
    console.log(`  Execution Window: ${config.execution.window}`);
    
    if (config.options) {
      console.log(`  Options: ${JSON.stringify(config.options)}`);
    }
    
    if (config.dayTrading) {
      console.log(`  Day Trading: ${JSON.stringify(config.dayTrading)}`);
    }
  });
  
  // Test helper functions
  console.log('\nHelper Function Tests:');
  console.log(`Conservative includes options: ${shouldIncludeOptions('conservative')}`);
  console.log(`Moderate includes options: ${shouldIncludeOptions('moderate')}`);
  console.log(`Ultra Aggressive includes day trading: ${shouldIncludeDayTrading('ultra_aggressive')}`);
  console.log(`Moderate max trades: ${getMaxTrades('moderate')}`);
  console.log(`Ultra Aggressive max trades: ${getMaxTrades('ultra_aggressive')}`);
  
  // Test execution window
  const testTime = new Date();
  testTime.setHours(11, 30); // 11:30 AM
  console.log(`\nExecution window test (11:30 AM):`);
  console.log(`Conservative in window: ${isInExecutionWindow('conservative', testTime)}`);
  console.log(`Moderate in window: ${isInExecutionWindow('moderate', testTime)}`);
  console.log(`Ultra Aggressive in window: ${isInExecutionWindow('ultra_aggressive', testTime)}`);
}

// Run test if this file is executed directly
if (require.main === module) {
  testProfileConfigs();
}