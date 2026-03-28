/**
 * CORTEX CAPITAL GROUP - WEEKLY MARKET PULSE
 * Bloomberg-inspired professional finance newsletter
 * Dark theme, no emojis, institutional aesthetic
 */

export interface EmailTemplateData {
  dateRange: string;
  marketRecap: {
    sp500: { change: number; value: number };
    qqq: { change: number; value: number };
    nasdaq: { change: number; value: number };
  };
  topMovers: Array<{
    symbol: string;
    change: number;
    reason: string;
  }>;
  cortexHighlight: string;
  healthScoreTip: string;
  upcomingCatalysts: string[];
  actionableInsight: string;
  unsubscribeUrl?: string;
}

export function generateEmailTemplate(data: EmailTemplateData): string {
  const arrow = (change: number) => change >= 0 ? '+' : '';
  const color = (change: number) => change >= 0 ? '#00C805' : '#ff3b3b';
  
  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Weekly Market Pulse | Cortex Capital Group</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: 'SF Mono', 'Consolas', 'Liberation Mono', Menlo, monospace;
      background-color: #000000;
      color: #cccccc;
      line-height: 1.5;
      -webkit-font-smoothing: antialiased;
    }
    .container {
      max-width: 640px;
      margin: 0 auto;
      background-color: #0a0a0a;
      border: 1px solid #1a1a1a;
    }
    .header {
      background-color: #000000;
      padding: 32px 28px 24px;
      border-bottom: 1px solid #00C805;
    }
    .header-brand {
      font-size: 11px;
      font-weight: 600;
      color: #00C805;
      letter-spacing: 3px;
      text-transform: uppercase;
      margin-bottom: 4px;
    }
    .header-title {
      font-size: 22px;
      font-weight: 400;
      color: #ffffff;
      letter-spacing: -0.3px;
    }
    .header-date {
      font-size: 12px;
      color: #666666;
      margin-top: 8px;
      letter-spacing: 0.5px;
    }
    .content {
      padding: 0;
    }
    .section {
      padding: 28px 28px;
      border-bottom: 1px solid #1a1a1a;
    }
    .section-label {
      font-size: 10px;
      font-weight: 600;
      color: #666666;
      letter-spacing: 2px;
      text-transform: uppercase;
      margin-bottom: 16px;
    }
    .market-table {
      width: 100%;
      border-collapse: collapse;
    }
    .market-table th {
      font-size: 10px;
      font-weight: 600;
      color: #444444;
      letter-spacing: 1.5px;
      text-transform: uppercase;
      text-align: left;
      padding: 8px 0;
      border-bottom: 1px solid #1a1a1a;
    }
    .market-table th:nth-child(2),
    .market-table th:nth-child(3) {
      text-align: right;
    }
    .market-table td {
      padding: 12px 0;
      border-bottom: 1px solid #111111;
      font-size: 14px;
    }
    .market-table td:first-child {
      font-weight: 600;
      color: #ffffff;
    }
    .market-table td:nth-child(2) {
      text-align: right;
      color: #ffffff;
      font-weight: 500;
    }
    .market-table td:nth-child(3) {
      text-align: right;
      font-weight: 600;
    }
    .mover-row {
      padding: 14px 0;
      border-bottom: 1px solid #111111;
    }
    .mover-row:last-child {
      border-bottom: none;
    }
    .mover-header {
      display: flex;
      justify-content: space-between;
      align-items: baseline;
      margin-bottom: 4px;
    }
    .mover-symbol {
      font-size: 15px;
      font-weight: 600;
      color: #ffffff;
    }
    .mover-change {
      font-size: 15px;
      font-weight: 600;
    }
    .mover-reason {
      font-size: 13px;
      color: #888888;
      line-height: 1.4;
    }
    .highlight-block {
      background-color: #0f0f0f;
      border-left: 2px solid #00C805;
      padding: 18px 20px;
      font-size: 14px;
      color: #cccccc;
      line-height: 1.6;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Inter', Roboto, sans-serif;
    }
    .tip-block {
      background-color: #0f0f0f;
      border-left: 2px solid #333333;
      padding: 18px 20px;
      font-size: 13px;
      color: #999999;
      line-height: 1.6;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Inter', Roboto, sans-serif;
    }
    .catalyst-item {
      padding: 10px 0;
      border-bottom: 1px solid #111111;
      font-size: 13px;
      color: #cccccc;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Inter', Roboto, sans-serif;
    }
    .catalyst-item:last-child {
      border-bottom: none;
    }
    .catalyst-item:before {
      content: ">";
      color: #00C805;
      margin-right: 10px;
      font-weight: 600;
    }
    .insight-block {
      background-color: #0a1a0a;
      border: 1px solid #00C805;
      padding: 22px 24px;
      font-size: 14px;
      color: #ffffff;
      line-height: 1.6;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Inter', Roboto, sans-serif;
    }
    .footer {
      background-color: #000000;
      padding: 24px 28px;
      border-top: 1px solid #1a1a1a;
    }
    .footer-brand {
      font-size: 10px;
      font-weight: 600;
      color: #00C805;
      letter-spacing: 2px;
      text-transform: uppercase;
      margin-bottom: 12px;
    }
    .footer-disclaimer {
      font-size: 11px;
      color: #444444;
      line-height: 1.5;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Inter', Roboto, sans-serif;
    }
    .footer-links {
      margin-top: 16px;
      font-size: 11px;
    }
    .footer-link {
      color: #666666;
      text-decoration: none;
      margin-right: 16px;
    }
    .footer-link:hover {
      color: #00C805;
    }
    .unsubscribe {
      font-size: 11px;
      color: #333333;
      margin-top: 16px;
    }
    .unsubscribe a {
      color: #444444;
      text-decoration: underline;
    }
    
    @media only screen and (max-width: 600px) {
      .header { padding: 24px 20px 20px; }
      .section { padding: 24px 20px; }
      .footer { padding: 20px; }
      .header-title { font-size: 20px; }
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <div class="header-brand">CORTEX CAPITAL GROUP</div>
      <div class="header-title">Weekly Market Pulse</div>
      <div class="header-date">${data.dateRange}</div>
    </div>

    <div class="content">
      
      <div class="section">
        <div class="section-label">MARKET OVERVIEW</div>
        <table class="market-table">
          <thead>
            <tr>
              <th>INDEX</th>
              <th>CLOSE</th>
              <th>WEEKLY</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>S&P 500</td>
              <td>${data.marketRecap.sp500.value.toLocaleString(undefined, {minimumFractionDigits: 2})}</td>
              <td style="color: ${color(data.marketRecap.sp500.change)}">${arrow(data.marketRecap.sp500.change)}${data.marketRecap.sp500.change.toFixed(2)}%</td>
            </tr>
            <tr>
              <td>QQQ</td>
              <td>${data.marketRecap.qqq.value.toLocaleString(undefined, {minimumFractionDigits: 2})}</td>
              <td style="color: ${color(data.marketRecap.qqq.change)}">${arrow(data.marketRecap.qqq.change)}${data.marketRecap.qqq.change.toFixed(2)}%</td>
            </tr>
            <tr>
              <td>NASDAQ</td>
              <td>${data.marketRecap.nasdaq.value.toLocaleString(undefined, {minimumFractionDigits: 2})}</td>
              <td style="color: ${color(data.marketRecap.nasdaq.change)}">${arrow(data.marketRecap.nasdaq.change)}${data.marketRecap.nasdaq.change.toFixed(2)}%</td>
            </tr>
          </tbody>
        </table>
      </div>

      <div class="section">
        <div class="section-label">NOTABLE MOVERS</div>
        ${data.topMovers.map(mover => `
        <div class="mover-row">
          <div class="mover-header">
            <span class="mover-symbol">${mover.symbol}</span>
            <span class="mover-change" style="color: ${color(mover.change)}">${arrow(mover.change)}${mover.change.toFixed(2)}%</span>
          </div>
          <div class="mover-reason">${mover.reason}</div>
        </div>
        `).join('')}
      </div>

      <div class="section">
        <div class="section-label">AGENT ACTIVITY</div>
        <div class="highlight-block">
          ${data.cortexHighlight}
        </div>
      </div>

      <div class="section">
        <div class="section-label">PORTFOLIO INSIGHT</div>
        <div class="tip-block">
          ${data.healthScoreTip}
        </div>
      </div>

      <div class="section">
        <div class="section-label">WEEK AHEAD</div>
        ${data.upcomingCatalysts.map(catalyst => `
        <div class="catalyst-item">${catalyst}</div>
        `).join('')}
      </div>

      <div class="section">
        <div class="section-label">KEY TAKEAWAY</div>
        <div class="insight-block">
          ${data.actionableInsight}
        </div>
      </div>

    </div>

    <div class="footer">
      <div class="footer-brand">CORTEX CAPITAL GROUP</div>
      <div class="footer-disclaimer">
        This communication is for informational purposes only and does not constitute investment advice, 
        a recommendation, or an offer to buy or sell securities. Past performance is not indicative of 
        future results. All investments carry risk of loss. Consult a qualified financial advisor before 
        making investment decisions.
      </div>
      <div class="footer-links">
        <a href="https://cortexcapitalgroup.com" class="footer-link">Dashboard</a>
        <a href="https://cortexcapitalgroup.com/about" class="footer-link">About</a>
        <a href="https://cortexcapitalgroup.com/disclaimer" class="footer-link">Disclosures</a>
      </div>
      ${data.unsubscribeUrl ? `
      <div class="unsubscribe">
        <a href="${data.unsubscribeUrl}">Unsubscribe</a> from market communications
      </div>
      ` : ''}
    </div>
  </div>
</body>
</html>
  `.trim();
}
