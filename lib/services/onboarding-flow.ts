/**
 * CORTEX CAPITAL - ONBOARDING FLOW
 * Step-by-step user onboarding with portfolio preview
 * 
 * THE EXPERIENCE:
 * 1. Basic info
 * 2. Risk assessment (5 questions)
 * 3. Goals & timeline
 * 4. Sector interests
 * 5. Theme preferences
 * 6. Custom stock picks (optional)
 * 7. Exclusions (ESG)
 * 8. Income preferences
 * 9. Options comfort
 * 10. Generate preview portfolio
 * 11. Select tier
 * 12. Payment (Stripe)
 * 13. Connect broker (Tradier OAuth)
 */

import type {
  UserPreferences,
  OnboardingProgress,
  Sector,
  Theme,
  Exclusion,
  InvestmentGoal,
  TimeHorizon,
  DividendPreference,
  OptionsComfort,
  RiskProfile,
} from '../preferences';
import { DEFAULT_PREFERENCES, TIER_CONFIG } from '../preferences';
import { buildPortfolio, type BuiltPortfolio } from '../portfolio-builder';
import { analyzeStocks } from '../stock-analyzer';

/**
 * ONBOARDING STEPS
 */
export enum OnboardingStep {
  BASIC_INFO = 1,
  RISK_ASSESSMENT = 2,
  GOALS_TIMELINE = 3,
  SECTOR_INTERESTS = 4,
  THEME_PREFERENCES = 5,
  CUSTOM_STOCKS = 6,
  EXCLUSIONS = 7,
  INCOME_PREFERENCES = 8,
  OPTIONS_COMFORT = 9,
  PREVIEW_PORTFOLIO = 10,
  SELECT_TIER = 11,
  PAYMENT = 12,
  CONNECT_BROKER = 13,
}

/**
 * RISK ASSESSMENT QUESTIONS
 */
export const RISK_QUESTIONS = [
  {
    id: 'volatility_comfort',
    question: 'How would you react if your portfolio dropped 20% in a month?',
    options: [
      { value: 'sell_all', label: 'Sell everything immediately', score: 1 },
      { value: 'sell_some', label: 'Sell some positions', score: 2 },
      { value: 'hold', label: 'Hold and wait', score: 3 },
      { value: 'buy_more', label: 'Buy more at lower prices', score: 4 },
    ],
  },
  {
    id: 'investment_experience',
    question: 'What is your investing experience?',
    options: [
      { value: 'none', label: 'Just starting out', score: 1 },
      { value: 'some', label: 'Invested before, but not regularly', score: 2 },
      { value: 'regular', label: 'Active investor for 3+ years', score: 3 },
      { value: 'advanced', label: 'Experienced with options/margin', score: 4 },
    ],
  },
  {
    id: 'time_commitment',
    question: 'How often do you want to monitor your portfolio?',
    options: [
      { value: 'never', label: 'Set and forget', score: 1 },
      { value: 'monthly', label: 'Check monthly', score: 2 },
      { value: 'weekly', label: 'Check weekly', score: 3 },
      { value: 'daily', label: 'Monitor daily', score: 4 },
    ],
  },
  {
    id: 'loss_tolerance',
    question: 'What is the maximum loss you could tolerate in a year?',
    options: [
      { value: 'low', label: '-5%', score: 1 },
      { value: 'medium', label: '-15%', score: 2 },
      { value: 'high', label: '-30%', score: 3 },
      { value: 'very_high', label: '-50%+', score: 4 },
    ],
  },
  {
    id: 'return_expectations',
    question: 'What annual return are you targeting?',
    options: [
      { value: 'conservative', label: '5-7% (stable)', score: 1 },
      { value: 'moderate', label: '10-12% (balanced)', score: 2 },
      { value: 'aggressive', label: '15-20% (growth)', score: 3 },
      { value: 'very_aggressive', label: '25%+ (speculative)', score: 4 },
    ],
  },
];

/**
 * Calculate risk profile from assessment
 */
function calculateRiskProfile(answers: Record<string, string>): RiskProfile {
  const scores = RISK_QUESTIONS.map(q => {
    const answer = answers[q.id];
    const option = q.options.find(opt => opt.value === answer);
    return option?.score || 0;
  });
  
  const avgScore = scores.reduce((sum, s) => sum + s, 0) / scores.length;
  
  if (avgScore <= 1.5) return 'conservative';
  if (avgScore <= 2.5) return 'moderate';
  return 'aggressive';
}

/**
 * ONBOARDING STATE MANAGEMENT
 */
export class OnboardingService {
  private progress: OnboardingProgress;
  
  constructor(userId: string) {
    this.progress = {
      user_id: userId,
      current_step: OnboardingStep.BASIC_INFO,
      total_steps: 13,
      completed_steps: [],
      step_data: {},
      created_at: new Date(),
      updated_at: new Date(),
    };
  }
  
  /**
   * Load existing progress from database
   */
  static async load(userId: string): Promise<OnboardingService> {
    // TODO: Load from database
    // For now, create new instance
    return new OnboardingService(userId);
  }
  
  /**
   * Save progress to database
   */
  async save(): Promise<void> {
    this.progress.updated_at = new Date();
    // TODO: Save to database (onboarding_progress table)
    console.log('Saving onboarding progress:', this.progress);
  }
  
  /**
   * Get current progress
   */
  getProgress(): OnboardingProgress {
    return this.progress;
  }
  
  /**
   * STEP 1: Basic Info
   */
  async submitBasicInfo(data: { name: string; email: string }): Promise<void> {
    this.progress.step_data.basic_info = data;
    this.completeStep(OnboardingStep.BASIC_INFO);
    await this.save();
  }
  
  /**
   * STEP 2: Risk Assessment
   */
  async submitRiskAssessment(answers: Record<string, string>): Promise<RiskProfile> {
    const risk_profile = calculateRiskProfile(answers);
    
    this.progress.step_data.risk_assessment = { answers };
    this.completeStep(OnboardingStep.RISK_ASSESSMENT);
    await this.save();
    
    return risk_profile;
  }
  
  /**
   * STEP 3: Goals & Timeline
   */
  async submitGoalsTimeline(data: {
    goal: InvestmentGoal;
    time_horizon: TimeHorizon;
  }): Promise<void> {
    this.progress.step_data.goals = data;
    this.completeStep(OnboardingStep.GOALS_TIMELINE);
    await this.save();
  }
  
  /**
   * STEP 4: Sector Interests
   */
  async submitSectorInterests(sectors: Sector[]): Promise<void> {
    this.progress.step_data.sectors = { selected: sectors };
    this.completeStep(OnboardingStep.SECTOR_INTERESTS);
    await this.save();
  }
  
  /**
   * STEP 5: Theme Preferences
   */
  async submitThemePreferences(themes: Theme[]): Promise<void> {
    this.progress.step_data.themes = { selected: themes };
    this.completeStep(OnboardingStep.THEME_PREFERENCES);
    await this.save();
  }
  
  /**
   * STEP 6: Custom Stock Picks (OPTIONAL)
   */
  async submitCustomStocks(symbols: string[]): Promise<{
    approved: string[];
    rejected: string[];
    analyses: Record<string, any>;
  }> {
    // Analyze all picks
    const analyses = await analyzeStocks(symbols);
    
    const approved: string[] = [];
    const rejected: string[] = [];
    
    Object.entries(analyses).forEach(([symbol, analysis]) => {
      if (analysis.investable) {
        approved.push(symbol);
      } else {
        rejected.push(symbol);
      }
    });
    
    this.progress.step_data.custom_stocks = { symbols: approved };
    this.completeStep(OnboardingStep.CUSTOM_STOCKS);
    await this.save();
    
    return { approved, rejected, analyses };
  }
  
  /**
   * STEP 7: Exclusions (ESG)
   */
  async submitExclusions(exclusions: Exclusion[]): Promise<void> {
    this.progress.step_data.exclusions = { selected: exclusions };
    this.completeStep(OnboardingStep.EXCLUSIONS);
    await this.save();
  }
  
  /**
   * STEP 8: Income Preferences
   */
  async submitIncomePreferences(data: {
    dividend_preference: DividendPreference;
    covered_calls_interest: boolean;
  }): Promise<void> {
    this.progress.step_data.income = data;
    this.completeStep(OnboardingStep.INCOME_PREFERENCES);
    await this.save();
  }
  
  /**
   * STEP 9: Options Comfort
   */
  async submitOptionsComfort(data: {
    comfort: OptionsComfort;
    max_allocation: number;
  }): Promise<void> {
    this.progress.step_data.options = data;
    this.completeStep(OnboardingStep.OPTIONS_COMFORT);
    await this.save();
  }
  
  /**
   * STEP 10: Generate Preview Portfolio
   */
  async generatePreview(): Promise<{
    scout: BuiltPortfolio;
    operator: BuiltPortfolio;
    partner: BuiltPortfolio;
  }> {
    const prefs = this.buildPreferences();
    
    // Generate all 3 tier portfolios for comparison
    const [scout, operator, partner] = await Promise.all([
      buildPortfolio(prefs, 'scout'),
      buildPortfolio(prefs, 'operator'),
      buildPortfolio(prefs, 'partner'),
    ]);
    
    // Store preview in progress
    this.progress.preview_portfolio = {
      recommended_tier: this.recommendTier(prefs),
      allocation: {},
      expected_return: scout.expected_return,
      expected_volatility: scout.expected_volatility,
      holdings_count: scout.allocations.length,
    };
    
    this.completeStep(OnboardingStep.PREVIEW_PORTFOLIO);
    await this.save();
    
    return { scout, operator, partner };
  }
  
  /**
   * STEP 11: Select Tier
   */
  async selectTier(tier: 'scout' | 'operator' | 'partner'): Promise<void> {
    if (this.progress.preview_portfolio) {
      this.progress.preview_portfolio.recommended_tier = tier;
    }
    
    this.completeStep(OnboardingStep.SELECT_TIER);
    await this.save();
  }
  
  /**
   * STEP 12: Payment (Stripe)
   */
  async processPayment(stripeToken: string, tier: 'scout' | 'operator' | 'partner'): Promise<{
    success: boolean;
    subscription_id?: string;
    error?: string;
  }> {
    // TODO: Integrate with Stripe
    // - Create customer
    // - Create subscription
    // - Handle payment
    
    const tierConfig = TIER_CONFIG[tier];
    
    console.log(`Processing payment: ${tierConfig.price}/month via Stripe token ${stripeToken}`);
    
    // Mock success for now
    const success = true;
    const subscription_id = `sub_${Date.now()}`;
    
    if (success) {
      this.completeStep(OnboardingStep.PAYMENT);
      await this.save();
    }
    
    return { success, subscription_id };
  }
  
  /**
   * STEP 13: Connect Broker (Tradier OAuth)
   */
  async connectBroker(broker: 'tradier' | 'webull', authCode: string): Promise<{
    success: boolean;
    account_id?: string;
    error?: string;
  }> {
    // TODO: Integrate with Tradier OAuth
    // - Exchange auth code for access token
    // - Fetch account info
    // - Store encrypted credentials
    
    console.log(`Connecting broker: ${broker} with auth code ${authCode}`);
    
    // Mock success
    const success = true;
    const account_id = `acc_${Date.now()}`;
    
    if (success) {
      this.completeStep(OnboardingStep.CONNECT_BROKER);
      await this.save();
    }
    
    return { success, account_id };
  }
  
  /**
   * HELPERS
   */
  
  private completeStep(step: OnboardingStep): void {
    const stepName = OnboardingStep[step];
    if (!this.progress.completed_steps.includes(stepName)) {
      this.progress.completed_steps.push(stepName);
    }
    this.progress.current_step = step + 1;
  }
  
  private buildPreferences(): UserPreferences {
    const { step_data } = this.progress;
    
    // Build preferences from collected data
    const risk_profile = step_data.risk_assessment 
      ? calculateRiskProfile(step_data.risk_assessment.answers)
      : DEFAULT_PREFERENCES.risk_profile;
    
    return {
      risk_profile,
      goal: step_data.goals?.goal || DEFAULT_PREFERENCES.goal,
      time_horizon: step_data.goals?.time_horizon || DEFAULT_PREFERENCES.time_horizon,
      sectors: step_data.sectors?.selected || DEFAULT_PREFERENCES.sectors,
      themes: step_data.themes?.selected || DEFAULT_PREFERENCES.themes,
      must_have_stocks: step_data.custom_stocks?.symbols || DEFAULT_PREFERENCES.must_have_stocks,
      excluded_stocks: DEFAULT_PREFERENCES.excluded_stocks,
      excluded_sectors: step_data.exclusions?.selected || DEFAULT_PREFERENCES.excluded_sectors,
      dividend_preference: step_data.income?.dividend_preference || DEFAULT_PREFERENCES.dividend_preference,
      covered_calls_interest: step_data.income?.covered_calls_interest || DEFAULT_PREFERENCES.covered_calls_interest,
      options_comfort: step_data.options?.comfort || DEFAULT_PREFERENCES.options_comfort,
      max_options_allocation: step_data.options?.max_allocation || DEFAULT_PREFERENCES.max_options_allocation,
      day_trading_interest: step_data.day_trading?.interest || DEFAULT_PREFERENCES.day_trading_interest,
      max_daily_risk: step_data.day_trading?.max_risk || DEFAULT_PREFERENCES.max_daily_risk,
    };
  }
  
  private recommendTier(prefs: UserPreferences): 'scout' | 'operator' | 'partner' {
    // Scout: No custom picks, no options, conservative
    if (
      prefs.must_have_stocks.length === 0 &&
      prefs.options_comfort === 'none' &&
      !prefs.day_trading_interest
    ) {
      return 'scout';
    }
    
    // Partner: Wants day trading or full options
    if (prefs.day_trading_interest || prefs.options_comfort === 'full_options') {
      return 'partner';
    }
    
    // Operator: Everything else
    return 'operator';
  }
  
  /**
   * Is onboarding complete?
   */
  isComplete(): boolean {
    return this.progress.current_step > OnboardingStep.CONNECT_BROKER;
  }
  
  /**
   * Get completion percentage
   */
  getCompletionPercentage(): number {
    return Math.round((this.progress.completed_steps.length / this.progress.total_steps) * 100);
  }
}

/**
 * EXPORT CONVENIENCE FUNCTIONS
 */

export async function startOnboarding(userId: string): Promise<OnboardingService> {
  return new OnboardingService(userId);
}

export async function resumeOnboarding(userId: string): Promise<OnboardingService> {
  return OnboardingService.load(userId);
}
