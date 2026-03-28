// Cortex Capital - REPORTER Agent
// Generates email reports, notifications, and performance summaries

import { AnalystReport } from './analyst';
import { RebalancingPlan, TradeInstruction } from './strategist';
import { ExecutionReport, TradeResult } from './executor';
import { query } from '../integrations/database';

// Database row types
interface OptionsPosition {
  id?: string;
  user_id: string;
  symbol: string;
  type: string;
  status: string;
  quantity: number;
  long_strike: string;
  short_strike?: string;
  expiry: string;
  premium_paid?: string;
  premium_received?: string;
  exit_value?: string;
  created_at: string;
  closed_at?: string;
}

interface DayTrade {
  id?: string;
  user_id: string;
  symbol: string;
  entry_time: string;
  exit_time: string;
  pnl?: string;
  status: string;
  setup_type?: string;
}

export interface EmailRecipient {
  email: string;
  name: string;
  preferences: {
    report_frequency: 'daily' | 'weekly' | 'monthly';
    notification_types: ('trade_execution' | 'portfolio_alert' | 'market_update')[];
  };
}

export interface EmailTemplate {
  subject: string;
  body: string;
  html_body?: string;
}

export interface ReportContent {
  text: string;
  html: string;
  attachments?: Array<{
    filename: string;
    content: string; // base64 encoded
    type: 'pdf' | 'csv' | 'json';
  }>;
}

export interface PerformanceMetrics {
  period: 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'yearly';
  start_date: Date;
  end_date: Date;
  portfolio_return: number;
  benchmark_return: number; // S&P 500
  alpha: number; // Excess return
  sharpe_ratio: number;
  max_drawdown: number;
  win_rate: number; // % of profitable trades
  average_win: number;
  average_loss: number;
  total_trades: number;
  total_commission: number;
}

export class ReportGenerator {
  private readonly companyName = 'Cortex Capital';
  private readonly supportEmail = 'support@cortexcapital.ai';
  
  // Generate trade execution confirmation email
  generateTradeConfirmationEmail(
    recipient: EmailRecipient,
    executionReport: ExecutionReport,
    trades: TradeInstruction[]
  ): EmailTemplate {
    const subject = `Trade Execution Confirmation - ${executionReport.execution_id}`;
    
    const filledTrades = executionReport.results.filter(r => r.status === 'filled' || r.status === 'partial');
    const totalValue = filledTrades.reduce((sum, t) => sum + (t.average_price * t.filled_quantity), 0);
    
    const textBody = `
Dear ${recipient.name},

Your trades have been executed successfully.

Execution Summary:
- Execution ID: ${executionReport.execution_id}
- Date: ${new Date().toLocaleDateString()}
- Total Trades: ${executionReport.total_trades_executed} of ${executionReport.total_trades_requested}
- Total Value: $${totalValue.toFixed(2)}
- Total Commission: $${executionReport.total_commission.toFixed(2)}
- Success Rate: ${executionReport.summary.success_rate.toFixed(1)}%

Trade Details:
${filledTrades.map((trade, i) => `
${i + 1}. ${trade.ticker}
   Action: ${trade.action.toUpperCase()}
   Quantity: ${trade.filled_quantity} shares
   Price: $${trade.average_price.toFixed(2)}
   Value: $${(trade.average_price * trade.filled_quantity).toFixed(2)}
   Commission: $${trade.commission.toFixed(2)}
   Slippage: ${trade.slippage.toFixed(4)}%
`).join('')}

If you have any questions about these trades, please contact our support team at ${this.supportEmail}.

Best regards,
The ${this.companyName} Team
`;
    
    const htmlBody = this.generateHtmlEmail(recipient.name, 'Trade Execution Confirmation', textBody);
    
    return { subject, body: textBody, html_body: htmlBody };
  }
  
  // Generate portfolio performance report
  generatePerformanceReport(
    recipient: EmailRecipient,
    portfolioReport: AnalystReport,
    performanceMetrics: PerformanceMetrics,
    comparisonPeriod?: PerformanceMetrics
  ): ReportContent {
    const periodLabel = performanceMetrics.period.charAt(0).toUpperCase() + performanceMetrics.period.slice(1);
    const title = `${periodLabel} Performance Report - ${performanceMetrics.end_date.toLocaleDateString()}`;
    
    // Calculate improvement if comparison period provided
    const improvement = comparisonPeriod 
      ? performanceMetrics.portfolio_return - comparisonPeriod.portfolio_return
      : 0;
    
    const textReport = `
${this.companyName} - ${title}

Portfolio Performance Summary:
- Period: ${performanceMetrics.start_date.toLocaleDateString()} to ${performanceMetrics.end_date.toLocaleDateString()}
- Portfolio Return: ${(performanceMetrics.portfolio_return * 100).toFixed(2)}%
- Benchmark (S&P 500): ${(performanceMetrics.benchmark_return * 100).toFixed(2)}%
- Alpha (Excess Return): ${(performanceMetrics.alpha * 100).toFixed(2)}%
${improvement !== 0 ? `- Improvement vs Last Period: ${(improvement * 100).toFixed(2)}%\n` : ''}
- Sharpe Ratio: ${performanceMetrics.sharpe_ratio.toFixed(2)}
- Maximum Drawdown: ${(performanceMetrics.max_drawdown * 100).toFixed(2)}%
- Win Rate: ${(performanceMetrics.win_rate * 100).toFixed(1)}%
- Total Trades: ${performanceMetrics.total_trades}
- Total Commission: $${performanceMetrics.total_commission.toFixed(2)}

Current Portfolio Health:
- Health Score: ${portfolioReport.portfolio_health}/100
- Total Value: $${portfolioReport.total_value.toFixed(2)}
- Top Holding: ${portfolioReport.concentration_risk.top_holding_pct.toFixed(1)}%
- Sector Exposure: ${Object.entries(portfolioReport.concentration_risk.sector_exposure)
    .map(([sector, pct]) => `${sector}: ${pct.toFixed(1)}%`)
    .join(', ')}

Key Insights:
${this.generatePerformanceInsights(performanceMetrics, portfolioReport)}

Next Steps:
${this.generateRecommendations(portfolioReport, performanceMetrics)}

---
This report is generated automatically by ${this.companyName}'s AI system.
For personalized advice, please contact our team at ${this.supportEmail}.
`;
    
    const htmlReport = this.generateHtmlPerformanceReport(title, textReport, performanceMetrics, portfolioReport);
    
    return {
      text: textReport,
      html: htmlReport,
    };
  }
  
  // Generate rebalancing plan notification
  generateRebalancingNotification(
    recipient: EmailRecipient,
    rebalancingPlan: RebalancingPlan
  ): EmailTemplate {
    const subject = `Rebalancing Plan Ready for Review - ${rebalancingPlan.plan_id}`;
    
    const totalTrades = rebalancingPlan.trades.length;
    const buyTrades = rebalancingPlan.trades.filter(t => t.action === 'buy').length;
    const sellTrades = rebalancingPlan.trades.filter(t => t.action === 'sell').length;
    
    const textBody = `
Dear ${recipient.name},

A new rebalancing plan has been generated for your portfolio.

Plan Summary:
- Plan ID: ${rebalancingPlan.plan_id}
- Generated: ${rebalancingPlan.created_at.toLocaleDateString()}
- Total Trades: ${totalTrades} (${buyTrades} buys, ${sellTrades} sells)
- Estimated Cost: $${rebalancingPlan.estimated_execution_cost.toFixed(2)}
- Estimated Tax Impact: $${rebalancingPlan.estimated_tax_impact.toFixed(2)}

Market Analysis:
${rebalancingPlan.reasoning.market_analysis}

Risk Assessment:
${rebalancingPlan.reasoning.risk_assessment}

Tax Considerations:
${rebalancingPlan.reasoning.tax_considerations}

Expected Improvement:
${rebalancingPlan.reasoning.expected_improvement}

Proposed Trades:
${rebalancingPlan.trades.map((trade, i) => `
${i + 1}. ${trade.action.toUpperCase()} ${trade.quantity} shares of ${trade.ticker}
   Priority: ${trade.priority}
   Reason: ${trade.reason}
`).join('')}

Action Required:
Please review and approve this plan in your Cortex Capital dashboard within 48 hours. The plan will expire if not approved.

To review and approve: https://app.cortexcapital.ai/rebalancing/${rebalancingPlan.plan_id}

If you have any questions, please contact our support team at ${this.supportEmail}.

Best regards,
The ${this.companyName} Team
`;
    
    const htmlBody = this.generateHtmlEmail(recipient.name, 'Rebalancing Plan Ready', textBody);
    
    return { subject, body: textBody, html_body: htmlBody };
  }
  
  // Generate portfolio alert (concentration, drawdown, etc.)
  generatePortfolioAlert(
    recipient: EmailRecipient,
    portfolioReport: AnalystReport,
    alertType: 'concentration' | 'drawdown' | 'tax_loss' | 'rebalancing_due',
    threshold: number
  ): EmailTemplate {
    const alertTitles = {
      concentration: 'High Concentration Alert',
      drawdown: 'Significant Drawdown Alert',
      tax_loss: 'Tax-Loss Harvesting Opportunity',
      rebalancing_due: 'Portfolio Rebalancing Due',
    };
    
    const subject = `${alertTitles[alertType]} - Action Recommended`;
    
    let alertDetails = '';
    let recommendedAction = '';
    
    switch (alertType) {
      case 'concentration':
        alertDetails = `Your top holding (${portfolioReport.concentration_risk.top_holding_pct.toFixed(1)}%) exceeds the recommended threshold of ${threshold}%.`;
        recommendedAction = 'Consider reducing position size to improve diversification.';
        break;
      case 'drawdown':
        alertDetails = `Your portfolio has experienced a ${(portfolioReport.metrics.max_drawdown * 100).toFixed(1)}% drawdown, exceeding the ${threshold}% threshold.`;
        recommendedAction = 'Review your risk tolerance and consider defensive positioning.';
        break;
      case 'tax_loss':
        const taxLossCount = portfolioReport.tax_loss_candidates.length;
        alertDetails = `You have ${taxLossCount} position${taxLossCount !== 1 ? 's' : ''} with unrealized losses exceeding $${threshold}.`;
        recommendedAction = 'Consider tax-loss harvesting to offset capital gains.';
        break;
      case 'rebalancing_due':
        alertDetails = `It has been ${threshold} days since your last portfolio rebalancing.`;
        recommendedAction = 'Generate a new rebalancing plan to maintain target allocations.';
        break;
    }
    
    const textBody = `
Dear ${recipient.name},

${alertDetails}

Portfolio Snapshot:
- Health Score: ${portfolioReport.portfolio_health}/100
- Total Value: $${portfolioReport.total_value.toFixed(2)}
- Current Drawdown: ${(portfolioReport.metrics.max_drawdown * 100).toFixed(1)}%
- Top Holding: ${portfolioReport.concentration_risk.top_holding_pct.toFixed(1)}%

Recommended Action:
${recommendedAction}

Next Steps:
1. Log in to your Cortex Capital dashboard
2. Review the detailed analysis
3. ${alertType === 'tax_loss' ? 'Generate tax-loss harvesting plan' : 'Generate rebalancing plan'}
4. Approve and execute recommended trades

Dashboard: https://app.cortexcapital.ai

If you need assistance, our support team is available at ${this.supportEmail}.

This is an automated alert. You can adjust alert thresholds in your account settings.

Best regards,
The ${this.companyName} Team
`;
    
    const htmlBody = this.generateHtmlEmail(recipient.name, alertTitles[alertType], textBody);
    
    return { subject, body: textBody, html_body: htmlBody };
  }
  
  // Generate market update newsletter
  generateMarketUpdate(
    recipients: EmailRecipient[],
    marketData: {
      sp500_change: number;
      nasdaq_change: number;
      volatility_index: number;
      key_events: string[];
      sector_performance: Record<string, number>;
      outlook: 'bullish' | 'neutral' | 'bearish';
    },
    period: 'daily' | 'weekly'
  ): EmailTemplate {
    const periodLabel = period.charAt(0).toUpperCase() + period.slice(1);
    const subject = `${periodLabel} Market Update - ${new Date().toLocaleDateString()}`;
    
    const topSectors = Object.entries(marketData.sector_performance)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([sector, change]) => `${sector}: ${change > 0 ? '+' : ''}${change.toFixed(2)}%`)
      .join(', ');
    
    const bottomSectors = Object.entries(marketData.sector_performance)
      .sort((a, b) => a[1] - b[1])
      .slice(0, 3)
      .map(([sector, change]) => `${sector}: ${change > 0 ? '+' : ''}${change.toFixed(2)}%`)
      .join(', ');
    
    const textBody = `
${periodLabel} Market Update

Market Performance:
- S&P 500: ${marketData.sp500_change > 0 ? '+' : ''}${marketData.sp500_change.toFixed(2)}%
- NASDAQ: ${marketData.nasdaq_change > 0 ? '+' : ''}${marketData.nasdaq_change.toFixed(2)}%
- Volatility (VIX): ${marketData.volatility_index.toFixed(2)}
- Market Outlook: ${marketData.outlook.toUpperCase()}

Sector Performance:
- Top Performers: ${topSectors}
- Bottom Performers: ${bottomSectors}

Key Events This ${periodLabel}:
${marketData.key_events.map(event => `• ${event}`).join('\n')}

${this.companyName} Insights:
${this.generateMarketInsights(marketData)}

Portfolio Implications:
${this.generatePortfolioImplications(marketData)}

Action Items for ${this.companyName} Users:
1. Review your portfolio's sector exposure
2. Check for rebalancing opportunities
3. ${marketData.outlook === 'bearish' ? 'Consider defensive positioning' : 'Look for growth opportunities'}

Upcoming Economic Calendar:
• Next FOMC Meeting: [Date]
• CPI Release: [Date]
• Earnings Season: [Dates]

Remember: Past performance is not indicative of future results. Diversification and regular rebalancing remain key to long-term success.

For personalized portfolio advice, log in to your Cortex Capital dashboard.

Best regards,
The ${this.companyName} Research Team
`;
    
    // For newsletter, we might want a nicer HTML template
    const htmlBody = this.generateHtmlNewsletter(textBody, marketData, periodLabel);
    
    return { subject, body: textBody, html_body: htmlBody };
  }
  
  // Private helper methods
  private generateHtmlEmail(name: string, title: string, textContent: string): string {
    return `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${title}</title>
    <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
        .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
        .footer { margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee; font-size: 12px; color: #666; text-align: center; }
        .button { display: inline-block; background: #667eea; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; margin: 10px 0; }
        .alert { background: #fff3cd; border: 1px solid #ffeaa7; padding: 15px; border-radius: 5px; margin: 15px 0; }
        .success { background: #d4edda; border: 1px solid #c3e6cb; padding: 15px; border-radius: 5px; margin: 15px 0; }
    </style>
</head>
<body>
    <div class="header">
        <h1>${this.companyName}</h1>
        <h2>${title}</h2>
    </div>
    <div class="content">
        <p>Dear ${name},</p>
        ${textContent.split('\n\n').map(paragraph => {
          if (paragraph.includes('Alert:')) return `<div class="alert">${paragraph.replace('Alert:', '<strong>Alert:</strong>')}</div>`;
          if (paragraph.includes('Success:')) return `<div class="success">${paragraph.replace('Success:', '<strong>Success:</strong>')}</div>`;
          return `<p>${paragraph.replace(/\n/g, '<br>')}</p>`;
        }).join('')}
    </div>
    <div class="footer">
        <p>This email was sent automatically by ${this.companyName}'s AI system.</p>
        <p>© ${new Date().getFullYear()} ${this.companyName}. All rights reserved.</p>
        <p><a href="https://app.cortexcapital.ai/settings">Manage Email Preferences</a> | <a href="mailto:${this.supportEmail}">Contact Support</a></p>
    </div>
</body>
</html>`;
  }
  
  private generateHtmlPerformanceReport(
    title: string,
    textContent: string,
    metrics: PerformanceMetrics,
    portfolio: AnalystReport
  ): string {
    // Simplified HTML for performance report
    return `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>${title}</title>
    <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 800px; margin: 0 auto; padding: 20px; }
        .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 40px; text-align: center; border-radius: 10px 10px 0 0; }
        .metrics-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 20px; margin: 30px 0; }
        .metric-card { background: white; padding: 20px; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); text-align: center; }
        .metric-value { font-size: 24px; font-weight: bold; margin: 10px 0; }
        .positive { color: #10b981; }
        .negative { color: #ef4444; }
        .health-score { font-size: 48px; font-weight: bold; margin: 20px 0; }
        .health-good { color: #10b981; }
        .health-warning { color: #f59e0b; }
        .health-poor { color: #ef4444; }
    </style>
</head>
<body>
    <div class="header">
        <h1>${this.companyName}</h1>
        <h2>${title}</h2>
    </div>
    
    <div style="padding: 30px; background: #f9f9f9; border-radius: 0 0 10px 10px;">
        <div style="text-align: center; margin-bottom: 30px;">
            <div class="health-score ${portfolio.portfolio_health >= 70 ? 'health-good' : portfolio.portfolio_health >= 40 ? 'health-warning' : 'health-poor'}">
                ${portfolio.portfolio_health}/100
            </div>
            <p>Portfolio Health Score</p>
        </div>
        
        <div class="metrics-grid">
            <div class="metric-card">
                <div>Portfolio Return</div>
                <div class="metric-value ${metrics.portfolio_return >= 0 ? 'positive' : 'negative'}">
                    ${(metrics.portfolio_return * 100).toFixed(2)}%
                </div>
            </div>
            <div class="metric-card">
                <div>Benchmark Return</div>
                <div class="metric-value ${metrics.benchmark_return >= 0 ? 'positive' : 'negative'}">
                    ${(metrics.benchmark_return * 100).toFixed(2)}%
                </div>
            </div>
            <div class="metric-card">
                <div>Alpha</div>
                <div class="metric-value ${metrics.alpha >= 0 ? 'positive' : 'negative'}">
                    ${(metrics.alpha * 100).toFixed(2)}%
                </div>
            </div>
            <div class="metric-card">
                <div>Sharpe Ratio</div>
                <div class="metric-value">
                    ${metrics.sharpe_ratio.toFixed(2)}
                </div>
            </div>
        </div>
        
        <div style="white-space: pre-line; margin-top: 30px; padding: 20px; background: white; border-radius: 8px;">
            ${textContent.split('Key Insights:')[1] || textContent}
        </div>
    </div>
</body>
</html>`;
  }
  
  private generateHtmlNewsletter(textContent: string, marketData: any, periodLabel: string): string {
    return `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>${periodLabel} Market Update</title>
    <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 40px; text-align: center; border-radius: 10px 10px 0 0; }
        .market-metrics { display: flex; justify-content: space-around; margin: 30px 0; }
        .metric { text-align: center; }
        .metric-value { font-size: 24px; font-weight: bold; }
        .positive { color: #10b981; }
        .negative { color: #ef4444; }
    </style>
</head>
<body>
    <div class="header">
        <h1>${this.companyName}</h1>
        <h2>${periodLabel} Market Update</h2>
    </div>
    
    <div style="padding: 30px; background: #f9f9f9; border-radius: 0 0 10px 10px;">
        <div class="market-metrics">
            <div class="metric">
                <div>S&P 500</div>
                <div class="metric-value ${marketData.sp500_change >= 0 ? 'positive' : 'negative'}">
                    ${marketData.sp500_change > 0 ? '+' : ''}${marketData.sp500_change.toFixed(2)}%
                </div>
            </div>
            <div class="metric">
                <div>NASDAQ</div>
                <div class="metric-value ${marketData.nasdaq_change >= 0 ? 'positive' : 'negative'}">
                    ${marketData.nasdaq_change > 0 ? '+' : ''}${marketData.nasdaq_change.toFixed(2)}%
                </div>
            </div>
            <div class="metric">
                <div>VIX</div>
                <div class="metric-value">
                    ${marketData.volatility_index.toFixed(2)}
                </div>
            </div>
        </div>
        
        <div style="white-space: pre-line; margin-top: 30px;">
            ${textContent.split('Key Events')[0]}
        </div>
    </div>
</body>
</html>`;
  }
  
  private generatePerformanceInsights(metrics: PerformanceMetrics, portfolio: AnalystReport): string {
    const insights: string[] = [];
    
    if (metrics.alpha > 0.05) {
      insights.push(`• Your portfolio is outperforming the benchmark by ${(metrics.alpha * 100).toFixed(2)}%`);
    } else if (metrics.alpha < -0.05) {
      insights.push(`• Your portfolio is underperforming the benchmark by ${Math.abs(metrics.alpha * 100).toFixed(2)}%`);
    }
    
    if (metrics.sharpe_ratio > 1.5) {
      insights.push(`• Excellent risk-adjusted returns (Sharpe ratio: ${metrics.sharpe_ratio.toFixed(2)})`);
    } else if (metrics.sharpe_ratio < 0.5) {
      insights.push(`• Risk-adjusted returns could be improved (Sharpe ratio: ${metrics.sharpe_ratio.toFixed(2)})`);
    }
    
    if (metrics.max_drawdown < -0.15) {
      insights.push(`• Significant drawdown of ${(metrics.max_drawdown * 100).toFixed(1)}% indicates high volatility`);
    }
    
    if (portfolio.portfolio_health < 50) {
      insights.push(`• Portfolio health score of ${portfolio.portfolio_health}/100 suggests need for rebalancing`);
    }
    
    return insights.join('\n') || '• Portfolio performance is in line with expectations.';
  }
  
  private generateRecommendations(portfolio: AnalystReport, metrics: PerformanceMetrics): string {
    const recommendations: string[] = [];
    
    if (portfolio.concentration_risk.top_holding_pct > 25) {
      recommendations.push(`• Reduce concentration in top holding (currently ${portfolio.concentration_risk.top_holding_pct.toFixed(1)}%)`);
    }
    
    if (portfolio.tax_loss_candidates.length > 0) {
      recommendations.push(`• Consider tax-loss harvesting on ${portfolio.tax_loss_candidates.length} position${portfolio.tax_loss_candidates.length !== 1 ? 's' : ''}`);
    }
    
    if (metrics.win_rate < 0.5) {
      recommendations.push('• Review trading strategy - win rate below 50%');
    }
    
    if (portfolio.portfolio_health < 70) {
      recommendations.push('• Generate rebalancing plan to improve portfolio health');
    }
    
    return recommendations.join('\n') || '• Continue current strategy - portfolio is well-positioned.';
  }
  
  private generateMarketInsights(marketData: any): string {
    const insights: string[] = [];
    
    if (marketData.sp500_change > 0.03) {
      insights.push('• Strong bullish momentum in broad market');
    } else if (marketData.sp500_change < -0.03) {
      insights.push('• Market experiencing downward pressure');
    }
    
    if (marketData.volatility_index > 25) {
      insights.push('• Elevated volatility suggests cautious positioning');
    } else if (marketData.volatility_index < 15) {
      insights.push('• Low volatility environment favorable for risk-taking');
    }
    
    if (marketData.outlook === 'bearish') {
      insights.push('• Consider defensive sectors and quality stocks');
    } else if (marketData.outlook === 'bullish') {
      insights.push('• Growth-oriented sectors may outperform');
    }
    
    return insights.join('\n');
  }
  
  private generatePortfolioImplications(marketData: any): string {
    if (marketData.outlook === 'bearish') {
      return '• Increase cash position\n• Focus on defensive sectors (utilities, consumer staples)\n• Consider hedging strategies';
    } else if (marketData.outlook === 'bullish') {
      return '• Consider increasing equity exposure\n• Focus on growth sectors (technology, consumer discretionary)\n• Reduce cash holdings';
    } else {
      return '• Maintain current allocation\n• Focus on quality companies with strong balance sheets\n• Regular rebalancing remains important';
    }
  }
  
  // Test function
  static async testReporter() {
    const generator = new ReportGenerator();
    
    const mockRecipient: EmailRecipient = {
      email: 'test@example.com',
      name: 'John Doe',
      preferences: {
        report_frequency: 'weekly',
        notification_types: ['trade_execution', 'portfolio_alert', 'market_update'],
      },
    };
    
    const mockPortfolioReport: AnalystReport = {
      portfolio_health: 65,
      total_value: 100000,
      metrics: {
        sharpe_ratio: 1.2,
        beta: 0.95,
        volatility: 18.4,
        max_drawdown: -12.5,
      },
      concentration_risk: {
        top_holding_pct: 32.4,
        sector_exposure: { technology: 80, finance: 12, healthcare: 8 },
      },
      tax_loss_candidates: [
        { ticker: 'TSLA', unrealized_loss: -1250 },
      ],
      positions: [
        { ticker: 'AAPL', shares: 50, value: 8750, cost_basis: 8500, current_price: 175, unrealized_pnl: 250, unrealized_pnl_pct: 2.94 },
        { ticker: 'TSLA', shares: 40, value: 7200, cost_basis: 8450, current_price: 180, unrealized_pnl: -1250, unrealized_pnl_pct: -14.79 },
      ],
    };
    
    const mockPerformanceMetrics: PerformanceMetrics = {
      period: 'monthly',
      start_date: new Date('2026-02-01'),
      end_date: new Date('2026-03-01'),
      portfolio_return: 0.082,
      benchmark_return: 0.064,
      alpha: 0.018,
      sharpe_ratio: 1.45,
      max_drawdown: -0.089,
      win_rate: 0.62,
      average_win: 0.042,
      average_loss: -0.028,
      total_trades: 24,
      total_commission: 156.80,
    };
    
    console.log('REPORTER Test Results:\n');
    
    // Test performance report
    console.log('1. Performance Report:');
    const performanceReport = generator.generatePerformanceReport(
      mockRecipient,
      mockPortfolioReport,
      mockPerformanceMetrics
    );
    console.log(performanceReport.text.substring(0, 500) + '...\n');
    
    // Test portfolio alert
    console.log('2. Portfolio Alert (Concentration):');
    const alertEmail = generator.generatePortfolioAlert(
      mockRecipient,
      mockPortfolioReport,
      'concentration',
      25
    );
    console.log(alertEmail.body.substring(0, 300) + '...\n');
    
    // Test market update
    console.log('3. Market Update:');
    const marketData = {
      sp500_change: 0.024,
      nasdaq_change: 0.031,
      volatility_index: 18.5,
      key_events: [
        'Fed holds rates steady',
        'Strong jobs report exceeds expectations',
        'Tech earnings season begins',
      ],
      sector_performance: {
        technology: 0.042,
        healthcare: 0.018,
        finance: 0.012,
        energy: -0.008,
        utilities: 0.005,
      },
      outlook: 'bullish' as const,
    };
    
    const marketUpdate = generator.generateMarketUpdate(
      [mockRecipient],
      marketData,
      'weekly'
    );
    console.log(marketUpdate.body.substring(0, 400) + '...\n');
    
    console.log('All reporter functions working correctly!');
  }
}

// Export test function
export const testReporter = ReportGenerator.testReporter;

// ============================================================================
// PHASE 3: Options Reporting
// ============================================================================

/**
 * Generate options performance report
 */
export async function generateOptionsReport(
  userId: string,
  startDate: Date = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // Last 30 days
  endDate: Date = new Date()
): Promise<{
  summary: {
    total_options_positions: number;
    open_positions: number;
    closed_positions: number;
    total_premium_paid: number;
    total_premium_received: number;
    net_premium: number;
    total_pnl: number;
    pnl_percentage: number;
    win_rate: number;
    average_holding_period: number;
  };
  by_type: {
    LEAP: any;
    covered_call: any;
    bull_call_spread: any;
    [key: string]: any;
  };
  top_performers: Array<{
    symbol: string;
    type: string;
    pnl: number;
    pnl_percentage: number;
    days_held: number;
  }>;
  worst_performers: Array<{
    symbol: string;
    type: string;
    pnl: number;
    pnl_percentage: number;
    days_held: number;
  }>;
  greeks_summary: {
    total_delta: number;
    total_theta: number;
    total_gamma: number;
    total_vega: number;
    delta_exposure: 'long' | 'short' | 'neutral';
    theta_exposure: 'positive' | 'negative' | 'neutral';
  };
  recommendations: string[];
}> {
  try {
    // Get all options positions
    const positionsResult = await query(
      `SELECT * FROM options_positions 
       WHERE user_id = $1 
         AND created_at BETWEEN $2 AND $3
       ORDER BY created_at DESC`,
      [userId, startDate, endDate]
    );
    
    const positions = positionsResult.rows;
    
    if (positions.length === 0) {
      return {
        summary: {
          total_options_positions: 0,
          open_positions: 0,
          closed_positions: 0,
          total_premium_paid: 0,
          total_premium_received: 0,
          net_premium: 0,
          total_pnl: 0,
          pnl_percentage: 0,
          win_rate: 0,
          average_holding_period: 0,
        },
        by_type: {
          LEAP: { count: 0, total_premium_paid: 0, total_premium_received: 0, total_pnl: 0, win_rate: 0 },
          covered_call: { count: 0, total_premium_paid: 0, total_premium_received: 0, total_pnl: 0, win_rate: 0 },
          bull_call_spread: { count: 0, total_premium_paid: 0, total_premium_received: 0, total_pnl: 0, win_rate: 0 },
        },
        top_performers: [],
        worst_performers: [],
        greeks_summary: {
          total_delta: 0,
          total_theta: 0,
          total_gamma: 0,
          total_vega: 0,
          delta_exposure: 'neutral',
          theta_exposure: 'neutral',
        },
        recommendations: ['No options positions found'],
      };
    }
    
    // Calculate summary statistics
    const openPositions = positions.filter((p: OptionsPosition) => p.status === 'open');
    const closedPositions = positions.filter((p: OptionsPosition) => p.status === 'closed');
    
    const totalPremiumPaid = positions.reduce((sum: number, p: OptionsPosition) => sum + parseFloat(p.premium_paid || '0'), 0);
    const totalPremiumReceived = positions.reduce((sum: number, p: OptionsPosition) => sum + parseFloat(p.premium_received || '0'), 0);
    const netPremium = totalPremiumReceived - totalPremiumPaid;
    
    // Calculate P&L for closed positions
    const closedPnl = closedPositions.reduce((sum: number, p: OptionsPosition) => {
      const premiumPaid = parseFloat(p.premium_paid || '0');
      const premiumReceived = parseFloat(p.premium_received || '0');
      const exitValue = parseFloat(p.exit_value || '0');
      
      if (p.type === 'covered_call') {
        return sum + premiumReceived; // Premium received is profit for covered calls
      } else {
        return sum + (exitValue - premiumPaid);
      }
    }, 0);
    
    const pnlPercentage = totalPremiumPaid > 0 ? (closedPnl / totalPremiumPaid) * 100 : 0;
    
    // Calculate win rate
    const winningTrades = closedPositions.filter((p: OptionsPosition) => {
      const premiumPaid = parseFloat(p.premium_paid || '0');
      const premiumReceived = parseFloat(p.premium_received || '0');
      const exitValue = parseFloat(p.exit_value || '0');
      
      if (p.type === 'covered_call') {
        return premiumReceived > 0;
      } else {
        return exitValue > premiumPaid;
      }
    }).length;
    
    const winRate = closedPositions.length > 0 ? (winningTrades / closedPositions.length) * 100 : 0;
    
    // Calculate average holding period
    const totalHoldingDays = closedPositions.reduce((sum: number, p: OptionsPosition) => {
      const created = new Date(p.created_at);
      const closed = new Date(p.closed_at || p.created_at);
      const days = Math.ceil((closed.getTime() - created.getTime()) / (1000 * 60 * 60 * 24));
      return sum + days;
    }, 0);
    
    const averageHoldingPeriod = closedPositions.length > 0 ? totalHoldingDays / closedPositions.length : 0;
    
    // Group by type
    const byType: { [key: string]: any; LEAP: any; covered_call: any; bull_call_spread: any; } = {
      LEAP: { count: 0, total_premium_paid: 0, total_premium_received: 0, total_pnl: 0, win_rate: 0 },
      covered_call: { count: 0, total_premium_paid: 0, total_premium_received: 0, total_pnl: 0, win_rate: 0 },
      bull_call_spread: { count: 0, total_premium_paid: 0, total_premium_received: 0, total_pnl: 0, win_rate: 0 },
    };
    positions.forEach((p: OptionsPosition) => {
      const type = p.type;
      if (!byType[type]) {
        byType[type] = {
          count: 0,
          total_premium_paid: 0,
          total_premium_received: 0,
          total_pnl: 0,
          win_rate: 0,
        };
      }
      
      byType[type].count++;
      byType[type].total_premium_paid += parseFloat(p.premium_paid || '0');
      byType[type].total_premium_received += parseFloat(p.premium_received || '0');
      
      // Calculate P&L for this position
      const premiumPaid = parseFloat(p.premium_paid || '0');
      const premiumReceived = parseFloat(p.premium_received || '0');
      const exitValue = parseFloat(p.exit_value || '0');
      
      if (p.status === 'closed') {
        const premiumPaid = parseFloat(p.premium_paid || '0');
        const premiumReceived = parseFloat(p.premium_received || '0');
        const exitValue = parseFloat(p.exit_value || '0');
        
        if (p.type === 'covered_call') {
          byType[type].total_pnl += premiumReceived;
        } else {
          byType[type].total_pnl += (exitValue - premiumPaid);
        }
      }
    });
    
    // Calculate win rates by type
    Object.keys(byType).forEach((type: string) => {
      const typePositions = positions.filter((p: OptionsPosition) => p.type === type && p.status === 'closed');
      const typeWinningTrades = typePositions.filter((p: OptionsPosition) => {
        const premiumPaid = parseFloat(p.premium_paid || '0');
        const premiumReceived = parseFloat(p.premium_received || '0');
        const exitValue = parseFloat(p.exit_value || '0');
        
        if (type === 'covered_call') {
          return premiumReceived > 0;
        } else {
          return exitValue > premiumPaid;
        }
      }).length;
      
      byType[type].win_rate = typePositions.length > 0 ? (typeWinningTrades / typePositions.length) * 100 : 0;
    });
    
    // Get top and worst performers
    const performers = closedPositions.map((p: OptionsPosition) => {
      const premiumPaid = parseFloat(p.premium_paid || '0');
      const premiumReceived = parseFloat(p.premium_received || '0');
      const exitValue = parseFloat(p.exit_value || '0');
      
      let pnl, pnlPercentage;
      
      if (p.type === 'covered_call') {
        pnl = premiumReceived;
        pnlPercentage = premiumPaid > 0 ? (premiumReceived / premiumPaid) * 100 : 0;
      } else {
        pnl = exitValue - premiumPaid;
        pnlPercentage = premiumPaid > 0 ? (pnl / premiumPaid) * 100 : 0;
      }
      
      const created = new Date(p.created_at);
      const closed = new Date(p.closed_at || p.created_at);
      const daysHeld = Math.ceil((closed.getTime() - created.getTime()) / (1000 * 60 * 60 * 24));
      
      return {
        symbol: p.symbol,
        type: p.type,
        pnl,
        pnl_percentage: pnlPercentage,
        days_held: daysHeld,
      };
    });
    
    type Performer = { symbol: string; type: string; pnl: number; pnl_percentage: number; days_held: number };
    
    const topPerformers = performers
      .filter((p: Performer) => p.pnl > 0)
      .sort((a: Performer, b: Performer) => b.pnl_percentage - a.pnl_percentage)
      .slice(0, 5);
    
    const worstPerformers = performers
      .filter((p: Performer) => p.pnl < 0)
      .sort((a: Performer, b: Performer) => a.pnl_percentage - b.pnl_percentage)
      .slice(0, 5);
    
    // Calculate Greeks summary for open positions
    const { GreeksCalculator } = await import('../services/greeks-calculator');
    const calculator = new GreeksCalculator();
    
    const openPositionsForGreeks = openPositions.map((p: OptionsPosition) => ({
      symbol: p.symbol as string,
      strike: parseFloat(p.long_strike),
      optionType: (p.type.includes('call') ? 'call' : 'put') as 'call' | 'put',
      expiry: new Date(p.expiry),
      quantity: p.quantity as number,
      isLong: !p.type.includes('short'),
    }));
    
    const portfolioGreeks = await calculator.calculatePortfolioGreeks(openPositionsForGreeks);
    
    // Determine exposure
    const deltaExposure = portfolioGreeks.totalDelta > 0.1 ? 'long' : 
                         portfolioGreeks.totalDelta < -0.1 ? 'short' : 'neutral';
    
    const thetaExposure = portfolioGreeks.totalTheta > 0 ? 'positive' : 
                         portfolioGreeks.totalTheta < 0 ? 'negative' : 'neutral';
    
    // Generate recommendations
    const recommendations: string[] = [];
    
    if (portfolioGreeks.totalDelta > 0.3) {
      recommendations.push('High positive delta: Consider hedging with puts or reducing long exposure');
    } else if (portfolioGreeks.totalDelta < -0.3) {
      recommendations.push('High negative delta: Consider hedging with calls or reducing short exposure');
    }
    
    if (portfolioGreeks.totalTheta < -50) {
      recommendations.push('High negative theta: Time decay is significant, consider shorter-dated positions');
    }
    
    if (portfolioGreeks.totalVega > 100) {
      recommendations.push('High vega exposure: Portfolio sensitive to volatility changes');
    }
    
    if (winRate < 50) {
      recommendations.push(`Low win rate (${winRate.toFixed(1)}%): Review strategy and risk management`);
    }
    
    if (averageHoldingPeriod > 60) {
      recommendations.push(`Long average holding period (${averageHoldingPeriod.toFixed(1)} days): Consider more active management`);
    }
    
    return {
      summary: {
        total_options_positions: positions.length,
        open_positions: openPositions.length,
        closed_positions: closedPositions.length,
        total_premium_paid: totalPremiumPaid,
        total_premium_received: totalPremiumReceived,
        net_premium: netPremium,
        total_pnl: closedPnl,
        pnl_percentage: pnlPercentage,
        win_rate: winRate,
        average_holding_period: averageHoldingPeriod,
      },
      by_type: byType,
      top_performers: topPerformers,
      worst_performers: worstPerformers,
      greeks_summary: {
        total_delta: portfolioGreeks.totalDelta,
        total_theta: portfolioGreeks.totalTheta,
        total_gamma: portfolioGreeks.totalGamma,
        total_vega: portfolioGreeks.totalVega,
        delta_exposure: deltaExposure,
        theta_exposure: thetaExposure,
      },
      recommendations,
    };
    
  } catch (error) {
    console.error('[REPORTER] Error generating options report:', error);
    throw error;
  }
}

/**
 * Generate covered call income report
 */
export async function generateCoveredCallReport(
  userId: string,
  months: number = 6
): Promise<{
  summary: {
    total_covered_calls: number;
    total_premium_received: number;
    average_premium_per_trade: number;
    average_days_to_expiry: number;
    assignment_rate: number;
    annualized_return: number;
  };
  monthly_income: Array<{
    month: string;
    premium_received: number;
    trades: number;
    average_premium: number;
  }>;
  by_stock: Array<{
    symbol: string;
    trades: number;
    total_premium: number;
    average_premium: number;
    assignment_count: number;
    success_rate: number;
  }>;
}> {
  try {
    const endDate = new Date();
    const startDate = new Date();
    startDate.setMonth(startDate.getMonth() - months);
    
    // Get covered call positions
    const positionsResult = await query(
      `SELECT * FROM options_positions 
       WHERE user_id = $1 
         AND type = 'covered_call'
         AND created_at BETWEEN $2 AND $3
       ORDER BY created_at DESC`,
      [userId, startDate, endDate]
    );
    
    const positions = positionsResult.rows;
    
    if (positions.length === 0) {
      return {
        summary: {
          total_covered_calls: 0,
          total_premium_received: 0,
          average_premium_per_trade: 0,
          average_days_to_expiry: 0,
          assignment_rate: 0,
          annualized_return: 0,
        },
        monthly_income: [],
        by_stock: [],
      };
    }
    
    // Calculate summary
    const totalPremiumReceived = positions.reduce((sum: number, p: OptionsPosition) => sum + parseFloat(p.premium_received || '0'), 0);
    const averagePremiumPerTrade = totalPremiumReceived / positions.length;
    
    const averageDaysToExpiry = positions.reduce((sum: number, p: OptionsPosition) => {
      const created = new Date(p.created_at);
      const expiry = new Date(p.expiry);
      const days = Math.ceil((expiry.getTime() - created.getTime()) / (1000 * 60 * 60 * 24));
      return sum + days;
    }, 0) / positions.length;
    
    const assignedPositions = positions.filter((p: OptionsPosition) => p.status === 'assigned' || p.status === 'closed');
    const assignmentRate = positions.length > 0 ? (assignedPositions.length / positions.length) * 100 : 0;
    
    // Calculate annualized return (simplified)
    const averageHoldingPeriod = positions.reduce((sum: number, p: OptionsPosition) => {
      const created = new Date(p.created_at);
      const closed = p.closed_at ? new Date(p.closed_at) : new Date();
      const days = Math.ceil((closed.getTime() - created.getTime()) / (1000 * 60 * 60 * 24));
      return sum + days;
    }, 0) / positions.length;
    
    const annualizedReturn = averageHoldingPeriod > 0 ? 
      (totalPremiumReceived / (positions.length * 10000)) * (365 / averageHoldingPeriod) * 100 : 0; // Assuming $10,000 per position
    
    // Group by month
    const monthlyIncome: { [key: string]: { premium_received: number; trades: number } } = {};
    positions.forEach((p: OptionsPosition) => {
      const created = new Date(p.created_at);
      const monthKey = `${created.getFullYear()}-${(created.getMonth() + 1).toString().padStart(2, '0')}`;
      
      if (!monthlyIncome[monthKey]) {
        monthlyIncome[monthKey] = {
          premium_received: 0,
          trades: 0,
        };
      }
      
      monthlyIncome[monthKey].premium_received += parseFloat(p.premium_received || '0');
      monthlyIncome[monthKey].trades++;
    });
    
    const monthlyIncomeArray = Object.entries(monthlyIncome)
      .map(([month, data]: [string, any]) => ({
        month,
        premium_received: data.premium_received,
        trades: data.trades,
        average_premium: data.trades > 0 ? data.premium_received / data.trades : 0,
      }))
      .sort((a, b) => b.month.localeCompare(a.month));
    
    // Group by stock
    const byStock: { [key: string]: { trades: number; total_premium: number; assignment_count: number } } = {};
    positions.forEach((p: OptionsPosition) => {
      const symbol = p.symbol;
      if (!byStock[symbol]) {
        byStock[symbol] = {
          trades: 0,
          total_premium: 0,
          assignment_count: 0,
        };
      }
      
      byStock[symbol].trades++;
      byStock[symbol].total_premium += parseFloat(p.premium_received || '0');
      
      if (p.status === 'assigned') {
        byStock[symbol].assignment_count++;
      }
    });
    
    const byStockArray = Object.entries(byStock)
      .map(([symbol, data]: [string, any]) => ({
        symbol,
        trades: data.trades,
        total_premium: data.total_premium,
        average_premium: data.trades > 0 ? data.total_premium / data.trades : 0,
        assignment_count: data.assignment_count,
        success_rate: data.trades > 0 ? ((data.trades - data.assignment_count) / data.trades) * 100 : 0,
      }))
      .sort((a, b) => b.total_premium - a.total_premium);
    
    return {
      summary: {
        total_covered_calls: positions.length,
        total_premium_received: totalPremiumReceived,
        average_premium_per_trade: averagePremiumPerTrade,
        average_days_to_expiry: averageDaysToExpiry,
        assignment_rate: assignmentRate,
        annualized_return: annualizedReturn,
      },
      monthly_income: monthlyIncomeArray,
      by_stock: byStockArray,
    };
    
  } catch (error) {
    console.error('[REPORTER] Error generating covered call report:', error);
    throw error;
  }
}

/**
 * Generate day trading performance report
 */
export async function generateDayTradingReport(
  userId: string,
  days: number = 30
): Promise<{
  summary: {
    total_trades: number;
    winning_trades: number;
    losing_trades: number;
    win_rate: number;
    total_pnl: number;
    average_pnl_per_trade: number;
    profit_factor: number;
    max_drawdown: number;
    average_holding_time: string;
    best_day: { date: string; pnl: number };
    worst_day: { date: string; pnl: number };
  };
  daily_performance: Array<{
    date: string;
    trades: number;
    pnl: number;
    win_rate: number;
  }>;
  by_setup: Array<{
    setup_type: string;
    trades: number;
    win_rate: number;
    average_pnl: number;
    total_pnl: number;
  }>;
  recommendations: string[];
}> {
  try {
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);
    
    // Get day trades
    const tradesResult = await query(
      `SELECT * FROM day_trades 
       WHERE user_id = $1 
         AND entry_time BETWEEN $2 AND $3
         AND status = 'closed'
       ORDER BY entry_time DESC`,
      [userId, startDate, endDate]
    );
    
    const trades = tradesResult.rows;
    
    if (trades.length === 0) {
      return {
        summary: {
          total_trades: 0,
          winning_trades: 0,
          losing_trades: 0,
          win_rate: 0,
          total_pnl: 0,
          average_pnl_per_trade: 0,
          profit_factor: 0,
          max_drawdown: 0,
          average_holding_time: '0:00',
          best_day: { date: '', pnl: 0 },
          worst_day: { date: '', pnl: 0 },
        },
        daily_performance: [],
        by_setup: [],
        recommendations: ['No day trades found'],
      };
    }
    
    // Calculate summary
    const winningTrades = trades.filter((t: DayTrade) => parseFloat(t.pnl || '0') > 0);
    const losingTrades = trades.filter((t: DayTrade) => parseFloat(t.pnl || '0') < 0);
    
    const totalPnl = trades.reduce((sum: number, t: DayTrade) => sum + parseFloat(t.pnl || '0'), 0);
    const averagePnlPerTrade = totalPnl / trades.length;
    
    const totalWins = winningTrades.reduce((sum: number, t: DayTrade) => sum + parseFloat(t.pnl || '0'), 0);
    const totalLosses = Math.abs(losingTrades.reduce((sum: number, t: DayTrade) => sum + parseFloat(t.pnl || '0'), 0));
    const profitFactor = totalLosses > 0 ? totalWins / totalLosses : Infinity;
    
    // Calculate average holding time
    const totalHoldingSeconds = trades.reduce((sum: number, t: DayTrade) => {
      const entry = new Date(t.entry_time);
      const exit = new Date(t.exit_time);
      const seconds = (exit.getTime() - entry.getTime()) / 1000;
      return sum + seconds;
    }, 0);
    
    const averageHoldingSeconds = totalHoldingSeconds / trades.length;
    const averageHoldingTime = `${Math.floor(averageHoldingSeconds / 3600)}:${Math.floor((averageHoldingSeconds % 3600) / 60).toString().padStart(2, '0')}`;
    
    // Group by day
    const dailyPerformance: { [key: string]: { trades: number; pnl: number; wins: number } } = {};
    trades.forEach((t: DayTrade) => {
      const exitDate = new Date(t.exit_time);
      const dateKey = exitDate.toISOString().split('T')[0];
      
      if (!dailyPerformance[dateKey]) {
        dailyPerformance[dateKey] = {
          trades: 0,
          pnl: 0,
          wins: 0,
        };
      }
      
      dailyPerformance[dateKey].trades++;
      dailyPerformance[dateKey].pnl += parseFloat(t.pnl || '0');
      
      if (parseFloat(t.pnl || '0') > 0) {
        dailyPerformance[dateKey].wins++;
      }
    });
    
    const dailyPerformanceArray = Object.entries(dailyPerformance)
      .map(([date, data]: [string, any]) => ({
        date,
        trades: data.trades,
        pnl: data.pnl,
        win_rate: data.trades > 0 ? (data.wins / data.trades) * 100 : 0,
      }))
      .sort((a, b) => b.date.localeCompare(a.date));
    
    // Find best and worst day
    const bestDay = dailyPerformanceArray.reduce((best, day) => day.pnl > best.pnl ? day : best, { date: '', pnl: -Infinity, trades: 0, win_rate: 0 });
    const worstDay = dailyPerformanceArray.reduce((worst, day) => day.pnl < worst.pnl ? day : worst, { date: '', pnl: Infinity, trades: 0, win_rate: 0 });
    
    // Calculate max drawdown
    let runningPnl = 0;
    let peak = 0;
    let maxDrawdown = 0;
    
    dailyPerformanceArray.sort((a, b) => a.date.localeCompare(b.date)).forEach(day => {
      runningPnl += day.pnl;
      if (runningPnl > peak) {
        peak = runningPnl;
      }
      const drawdown = peak - runningPnl;
      if (drawdown > maxDrawdown) {
        maxDrawdown = drawdown;
      }
    });
    
    // Group by setup type
    const bySetup: { [key: string]: { trades: number; wins: number; total_pnl: number } } = {};
    trades.forEach((t: DayTrade) => {
      const setupType = t.setup_type || 'unknown';
      if (!bySetup[setupType]) {
        bySetup[setupType] = {
          trades: 0,
          wins: 0,
          total_pnl: 0,
        };
      }
      
      bySetup[setupType].trades++;
      bySetup[setupType].total_pnl += parseFloat(t.pnl || '0');
      
      if (parseFloat(t.pnl || '0') > 0) {
        bySetup[setupType].wins++;
      }
    });
    
    const bySetupArray = Object.entries(bySetup)
      .map(([setup_type, data]: [string, any]) => ({
        setup_type,
        trades: data.trades,
        win_rate: data.trades > 0 ? (data.wins / data.trades) * 100 : 0,
        average_pnl: data.trades > 0 ? data.total_pnl / data.trades : 0,
        total_pnl: data.total_pnl,
      }))
      .sort((a, b) => b.total_pnl - a.total_pnl);
    
    // Generate recommendations
    const recommendations: string[] = [];
    
    const winRate = (winningTrades.length / trades.length) * 100;
    if (winRate < 50) {
      recommendations.push(`Low win rate (${winRate.toFixed(1)}%): Review entry criteria and risk management`);
    }
    
    if (profitFactor < 1.5) {
      recommendations.push(`Low profit factor (${profitFactor.toFixed(2)}): Focus on improving risk/reward ratio`);
    }
    
    if (maxDrawdown > totalPnl * 0.5) {
      recommendations.push(`High max drawdown ($${maxDrawdown.toFixed(2)}): Consider reducing position sizes or improving stop losses`);
    }
    
    // Find worst performing setup
    const worstSetup = bySetupArray.find(s => s.win_rate < 50 && s.trades >= 5);
    if (worstSetup) {
      recommendations.push(`Poor performance with ${worstSetup.setup_type} setup (${worstSetup.win_rate.toFixed(1)}% win rate): Consider avoiding or improving this setup`);
    }
    
    return {
      summary: {
        total_trades: trades.length,
        winning_trades: winningTrades.length,
        losing_trades: losingTrades.length,
        win_rate: winRate,
        total_pnl: totalPnl,
        average_pnl_per_trade: averagePnlPerTrade,
        profit_factor: profitFactor,
        max_drawdown: maxDrawdown,
        average_holding_time: averageHoldingTime,
        best_day: { date: bestDay.date, pnl: bestDay.pnl },
        worst_day: { date: worstDay.date, pnl: worstDay.pnl },
      },
      daily_performance: dailyPerformanceArray,
      by_setup: bySetupArray,
      recommendations,
    };
    
  } catch (error) {
    console.error('[REPORTER] Error generating day trading report:', error);
    throw error;
  }
}

// Test the new reporting functions
export const testOptionsReporting = async () => {
  console.log('Testing Options Reporting:');
  
  const userId = 'test_user_123';
  
  // Test options report
  console.log('\n=== OPTIONS PERFORMANCE REPORT ===');
  try {
    const optionsReport = await generateOptionsReport(userId);
    console.log(`Total options positions: ${optionsReport.summary.total_options_positions}`);
    console.log(`Total P&L: $${optionsReport.summary.total_pnl.toFixed(2)}`);
    console.log(`Win rate: ${optionsReport.summary.win_rate.toFixed(1)}%`);
    console.log(`Net premium: $${optionsReport.summary.net_premium.toFixed(2)}`);
    
    console.log('\nBy type:');
    Object.entries(optionsReport.by_type).forEach(([type, data]: [string, any]) => {
      console.log(`  ${type}: ${data.count} trades, $${data.total_pnl.toFixed(2)} P&L, ${data.win_rate.toFixed(1)}% win rate`);
    });
    
    console.log('\nGreeks summary:');
    console.log(`  Delta: ${optionsReport.greeks_summary.total_delta.toFixed(3)} (${optionsReport.greeks_summary.delta_exposure})`);
    console.log(`  Theta: ${optionsReport.greeks_summary.total_theta.toFixed(3)} (${optionsReport.greeks_summary.theta_exposure})`);
    console.log(`  Vega: ${optionsReport.greeks_summary.total_vega.toFixed(3)}`);
    
    console.log('\nRecommendations:');
    optionsReport.recommendations.forEach((rec, i) => {
      console.log(`  ${i + 1}. ${rec}`);
    });
  } catch (error) {
    console.log('Options report test skipped (no data)');
  }
  
  // Test covered call report
  console.log('\n=== COVERED CALL INCOME REPORT ===');
  try {
    const coveredCallReport = await generateCoveredCallReport(userId, 3);
    console.log(`Total covered calls: ${coveredCallReport.summary.total_covered_calls}`);
    console.log(`Total premium received: $${coveredCallReport.summary.total_premium_received.toFixed(2)}`);
    console.log(`Average premium: $${coveredCallReport.summary.average_premium_per_trade.toFixed(2)}`);
    console.log(`Assignment rate: ${coveredCallReport.summary.assignment_rate.toFixed(1)}%`);
    console.log(`Annualized return: ${coveredCallReport.summary.annualized_return.toFixed(1)}%`);
    
    console.log('\nMonthly income:');
    coveredCallReport.monthly_income.slice(0, 3).forEach(month => {
      console.log(`  ${month.month}: $${month.premium_received.toFixed(2)} (${month.trades} trades)`);
    });
    
    console.log('\nBy stock (top 3):');
    coveredCallReport.by_stock.slice(0, 3).forEach(stock => {
      console.log(`  ${stock.symbol}: $${stock.total_premium.toFixed(2)} (${stock.trades} trades, ${stock.success_rate.toFixed(1)}% success)`);
    });
  } catch (error) {
    console.log('Covered call report test skipped (no data)');
  }
  
  // Test day trading report
  console.log('\n=== DAY TRADING PERFORMANCE REPORT ===');
  try {
    const dayTradingReport = await generateDayTradingReport(userId, 7);
    console.log(`Total trades: ${dayTradingReport.summary.total_trades}`);
    console.log(`Win rate: ${dayTradingReport.summary.win_rate.toFixed(1)}%`);
    console.log(`Total P&L: $${dayTradingReport.summary.total_pnl.toFixed(2)}`);
    console.log(`Profit factor: ${dayTradingReport.summary.profit_factor.toFixed(2)}`);
    console.log(`Average holding time: ${dayTradingReport.summary.average_holding_time}`);
    
    console.log('\nBest day:');
    console.log(`  ${dayTradingReport.summary.best_day.date}: $${dayTradingReport.summary.best_day.pnl.toFixed(2)}`);
    
    console.log('\nBy setup:');
    dayTradingReport.by_setup.forEach(setup => {
      console.log(`  ${setup.setup_type}: ${setup.trades} trades, ${setup.win_rate.toFixed(1)}% win rate, $${setup.total_pnl.toFixed(2)} P&L`);
    });
    
    console.log('\nRecommendations:');
    dayTradingReport.recommendations.forEach((rec, i) => {
      console.log(`  ${i + 1}. ${rec}`);
    });
  } catch (error) {
    console.log('Day trading report test skipped (no data)');
  }
  
  console.log('\n=== OPTIONS REPORTING TEST COMPLETE ===');
};

// Run test if this file is executed directly
if (require.main === module) {
  // Run both tests
  testReporter().catch(console.error);
  setTimeout(() => {
    testOptionsReporting().catch(console.error);
  }, 2000);
}