import Link from 'next/link'

export const metadata = {
  title: 'Investment Disclaimer - Cortex Capital',
  description: 'Investment and risk disclaimer for Cortex Capital',
}

export default function DisclaimerPage() {
  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-4xl mx-auto px-6 py-16">
        <Link 
          href="/" 
          className="text-primary hover:underline mb-8 inline-block"
        >
          ← Back to Home
        </Link>

        <h1 className="text-4xl font-bold mb-4">Investment Disclaimer</h1>
        <p className="text-text-secondary mb-8">Last Updated: March 21, 2026</p>

        <div className="space-y-8 text-text-secondary leading-relaxed">
          <div className="bg-danger/10 border-2 border-danger rounded-lg p-8">
            <h2 className="text-2xl font-bold text-danger mb-4">IMPORTANT DISCLAIMER - PLEASE READ CAREFULLY</h2>
            <p className="text-lg font-semibold text-text-primary">
              Cortex Capital is NOT a registered investment adviser, broker-dealer, or financial institution. 
              The information provided through our Service does NOT constitute investment advice.
            </p>
          </div>

          <section>
            <h2 className="text-2xl font-semibold text-text-primary mb-4">1. Not Financial Advice</h2>
            <p>
              The trading signals, market analysis, and information provided by Cortex Capital are for 
              <strong> informational and educational purposes only</strong>. They do not constitute:
            </p>
            <ul className="list-disc pl-6 mt-4 space-y-2">
              <li>Financial advice or recommendations</li>
              <li>Investment advice</li>
              <li>Tax advice</li>
              <li>Legal advice</li>
              <li>An offer to buy or sell securities</li>
              <li>A solicitation to trade or invest</li>
            </ul>
            <p className="mt-4 font-semibold text-warning">
              You should NOT rely solely on our signals or analysis when making investment decisions.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-text-primary mb-4">2. Not a Registered Investment Adviser</h2>
            <p>
              Cortex Capital is not registered with the U.S. Securities and Exchange Commission (SEC), the 
              Financial Industry Regulatory Authority (FINRA), or any other financial regulatory body as an 
              investment adviser or broker-dealer.
            </p>
            <p className="mt-4">
              We do not provide personalized investment advice tailored to your specific financial situation, 
              goals, or risk tolerance.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-text-primary mb-4">3. Past Performance Disclaimer</h2>
            <div className="bg-surface-elevated border border-warning/30 rounded-lg p-6 space-y-4">
              <p className="font-bold text-warning text-lg">
                PAST PERFORMANCE IS NOT INDICATIVE OF FUTURE RESULTS
              </p>
              <ul className="list-disc pl-6 space-y-2">
                <li>Historical returns, backtests, and performance metrics are not guarantees of future performance</li>
                <li>Backtested results may not reflect actual trading conditions, slippage, or market impact</li>
                <li>Live trading performance may differ significantly from historical or simulated results</li>
                <li>Market conditions change, and strategies that worked in the past may not work in the future</li>
                <li>Results shown may represent a cherry-picked time period or best-case scenarios</li>
              </ul>
            </div>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-text-primary mb-4">4. Risk of Loss</h2>
            <p className="font-bold text-danger text-lg mb-4">
              TRADING AND INVESTING INVOLVES SUBSTANTIAL RISK OF LOSS
            </p>
            <p>You acknowledge and understand that:</p>
            <ul className="list-disc pl-6 mt-4 space-y-2">
              <li><strong>You can lose money</strong> - potentially all of your invested capital</li>
              <li><strong>Leveraged products are especially risky</strong> - options, futures, and margin trading can amplify losses</li>
              <li><strong>Markets are unpredictable</strong> - even sophisticated AI models cannot predict all market movements</li>
              <li><strong>Volatility can be extreme</strong> - prices can move rapidly against your position</li>
              <li><strong>Liquidity can disappear</strong> - you may not be able to exit positions when needed</li>
              <li><strong>Gaps and slippage occur</strong> - execution prices may differ from expected prices</li>
              <li><strong>Black swan events happen</strong> - unexpected events can cause catastrophic losses</li>
            </ul>
            <p className="mt-4 font-semibold text-danger">
              Only invest money you can afford to lose completely without affecting your financial well-being.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-text-primary mb-4">5. AI and Algorithm Limitations</h2>
            <p>Our AI-powered trading system has inherent limitations:</p>
            <ul className="list-disc pl-6 mt-4 space-y-2">
              <li><strong>Models can be wrong</strong> - AI predictions are probabilistic, not certain</li>
              <li><strong>Training data limitations</strong> - models are based on historical data that may not represent future conditions</li>
              <li><strong>Overfitting risk</strong> - models may perform well in backtests but fail in live trading</li>
              <li><strong>Black box risk</strong> - complex AI models may make decisions that are difficult to understand or explain</li>
              <li><strong>Technical failures</strong> - bugs, errors, or system outages can occur</li>
              <li><strong>Market regime changes</strong> - AI models may struggle when market dynamics shift</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-text-primary mb-4">6. No Guarantees or Warranties</h2>
            <p>Cortex Capital makes NO guarantees or warranties regarding:</p>
            <ul className="list-disc pl-6 mt-4 space-y-2">
              <li>The accuracy, completeness, or timeliness of signals or data</li>
              <li>The profitability of any trades or strategies</li>
              <li>The performance or uptime of the Service</li>
              <li>The suitability of our Service for your specific needs</li>
              <li>The achievement of any financial goals or objectives</li>
            </ul>
            <p className="mt-4">
              The Service is provided "as is" and "as available" without warranties of any kind, express or implied.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-text-primary mb-4">7. Your Responsibility</h2>
            <p className="font-semibold mb-4">
              YOU ARE SOLELY RESPONSIBLE FOR:
            </p>
            <ul className="list-disc pl-6 space-y-2">
              <li>All trading and investment decisions made</li>
              <li>Conducting your own research and due diligence</li>
              <li>Understanding the risks of each trade</li>
              <li>Monitoring your positions and account</li>
              <li>Managing your risk and position sizing</li>
              <li>Complying with applicable laws and regulations</li>
              <li>Paying all taxes on gains (if any)</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-text-primary mb-4">8. Consult a Professional</h2>
            <div className="bg-primary/10 border border-primary/30 rounded-lg p-6">
              <p className="font-semibold text-primary mb-4">
                BEFORE TRADING OR INVESTING, YOU SHOULD CONSULT WITH:
              </p>
              <ul className="list-disc pl-6 space-y-2">
                <li>A licensed financial adviser to discuss your personal financial situation</li>
                <li>A qualified tax professional regarding tax implications</li>
                <li>A legal professional if you have legal questions</li>
                <li>Your broker regarding account-specific questions</li>
              </ul>
            </div>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-text-primary mb-4">9. Hypothetical and Simulated Results</h2>
            <p>
              Any backtested, hypothetical, or simulated performance results have inherent limitations:
            </p>
            <ul className="list-disc pl-6 mt-4 space-y-2">
              <li>They do not represent actual trading</li>
              <li>They may not account for all costs (commissions, fees, slippage, taxes)</li>
              <li>They assume perfect execution at desired prices</li>
              <li>They may benefit from hindsight bias or data snooping</li>
              <li>They do not reflect the impact of real-world constraints</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-text-primary mb-4">10. Market-Specific Risks</h2>
            
            <h3 className="text-xl font-semibold text-text-primary mb-3 mt-6">Stocks and ETFs</h3>
            <p>Individual stocks can decline significantly or become worthless. Diversification does not guarantee profit or protect against loss.</p>

            <h3 className="text-xl font-semibold text-text-primary mb-3 mt-6">Options</h3>
            <p>Options can expire worthless, resulting in 100% loss of premium paid. Writing uncovered options carries unlimited risk.</p>

            <h3 className="text-xl font-semibold text-text-primary mb-3 mt-6">Futures and Commodities</h3>
            <p>Futures are highly leveraged and volatile. You can lose more than your initial investment.</p>

            <h3 className="text-xl font-semibold text-text-primary mb-3 mt-6">Cryptocurrencies</h3>
            <p>Cryptocurrencies are extremely volatile, largely unregulated, and can decline to zero. Exchanges can be hacked or shut down.</p>

            <h3 className="text-xl font-semibold text-text-primary mb-3 mt-6">Forex</h3>
            <p>Foreign exchange trading is highly leveraged and speculative. Currency values can fluctuate rapidly.</p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-text-primary mb-4">11. International Users</h2>
            <p>
              If you are accessing Cortex Capital from outside the United States, you are responsible for 
              complying with your local laws and regulations regarding online trading and investment services.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-text-primary mb-4">12. Testimonials and Endorsements</h2>
            <p>
              Any testimonials, reviews, or user experiences shared on our platform represent individual results 
              and do not guarantee that you will achieve similar outcomes. Results vary widely based on many factors.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-text-primary mb-4">13. Contact Information</h2>
            <p>
              For questions about this disclaimer, contact us at:
            </p>
            <p className="mt-4">
              Email: <span className="text-primary">support@zerogtrading.com</span><br />
              support@zerogtrading.com
            </p>
          </section>

          <div className="bg-danger/10 border-2 border-danger rounded-lg p-8 mt-12">
            <h2 className="text-2xl font-bold text-danger mb-4">Final Warning</h2>
            <p className="text-lg font-semibold">
              By using Cortex Capital, you acknowledge that you have read and understood this disclaimer, 
              accept the risks involved in trading and investing, and agree that Cortex Capital is not liable 
              for any losses you may incur.
            </p>
            <p className="mt-4 text-warning font-semibold">
              If you do not accept these terms, DO NOT use the Service.
            </p>
          </div>
        </div>

        <div className="mt-12 pt-8 border-t border-gray-700">
          <p className="text-text-muted text-sm">
            This disclaimer was last updated on March 21, 2026 and is subject to change without notice.
          </p>
        </div>
      </div>
    </div>
  )
}
