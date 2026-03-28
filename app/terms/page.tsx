import Link from 'next/link'

export const metadata = {
  title: 'Terms of Service - Cortex Capital',
  description: 'Terms of Service for Cortex Capital AI trading platform',
}

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-4xl mx-auto px-6 py-16">
        <Link 
          href="/" 
          className="text-primary hover:underline mb-8 inline-block"
        >
          ← Back to Home
        </Link>

        <h1 className="text-4xl font-bold mb-4">Terms of Service</h1>
        <p className="text-text-secondary mb-8">Last Updated: March 21, 2026</p>

        <div className="space-y-8 text-text-secondary leading-relaxed">
          <section>
            <h2 className="text-2xl font-semibold text-text-primary mb-4">1. Service Description</h2>
            <p>
              Cortex Capital provides AI-powered trading signals and market analysis (the "Service"). 
              Our platform uses artificial intelligence to analyze market data and generate trading insights.
            </p>
            <p className="mt-4 font-semibold text-warning">
              IMPORTANT: Cortex Capital is NOT a financial advisor, broker-dealer, or registered investment adviser. 
              The signals and information provided are for informational and educational purposes only and do not 
              constitute financial, investment, trading, or legal advice.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-text-primary mb-4">2. User Responsibilities</h2>
            <p>By using Cortex Capital, you acknowledge and agree that:</p>
            <ul className="list-disc pl-6 mt-4 space-y-2">
              <li>You are solely responsible for all trading decisions made based on our signals</li>
              <li>You will conduct your own research and due diligence before making any trades</li>
              <li>You understand the risks associated with trading and investing</li>
              <li>You will comply with all applicable laws and regulations in your jurisdiction</li>
              <li>You will not hold Cortex Capital liable for any trading losses</li>
              <li>You have the legal capacity to enter into this agreement</li>
              <li>You will maintain the confidentiality of your account credentials</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-text-primary mb-4">3. Risk Disclaimers</h2>
            <div className="bg-surface-elevated border border-danger/30 rounded-lg p-6 space-y-4">
              <p className="font-semibold text-danger">TRADING AND INVESTING INVOLVES SUBSTANTIAL RISK OF LOSS</p>
              <ul className="list-disc pl-6 space-y-2">
                <li>You can lose some or all of your invested capital</li>
                <li>Past performance is not indicative of future results</li>
                <li>No trading system or methodology is guaranteed to be profitable</li>
                <li>Market conditions can change rapidly and unpredictably</li>
                <li>Leverage amplifies both gains and losses</li>
                <li>Our AI models may produce inaccurate signals or predictions</li>
                <li>Technical failures, bugs, or delays may occur</li>
              </ul>
            </div>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-text-primary mb-4">4. Limitation of Liability</h2>
            <p>
              TO THE MAXIMUM EXTENT PERMITTED BY LAW, CORTEX CAPITAL AND ITS OFFICERS, DIRECTORS, EMPLOYEES, 
              AND AFFILIATES SHALL NOT BE LIABLE FOR:
            </p>
            <ul className="list-disc pl-6 mt-4 space-y-2">
              <li>Any trading losses or lost profits resulting from use of the Service</li>
              <li>Inaccurate, delayed, or incomplete signals or data</li>
              <li>Service interruptions, downtime, or technical failures</li>
              <li>Unauthorized access to your account or data breaches</li>
              <li>Any indirect, incidental, consequential, or punitive damages</li>
            </ul>
            <p className="mt-4">
              In no event shall Cortex Capital's total liability exceed the amount you paid for the Service 
              in the twelve (12) months preceding the claim.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-text-primary mb-4">5. Account Termination</h2>
            <p>We reserve the right to suspend or terminate your account at any time, with or without notice, for:</p>
            <ul className="list-disc pl-6 mt-4 space-y-2">
              <li>Violation of these Terms of Service</li>
              <li>Fraudulent or abusive behavior</li>
              <li>Non-payment of fees</li>
              <li>Any reason we deem necessary to protect our business or users</li>
            </ul>
            <p className="mt-4">
              You may cancel your account at any time. Upon termination, you will lose access to all Service features 
              and data. No refunds will be provided for partial subscription periods.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-text-primary mb-4">6. Intellectual Property</h2>
            <p>
              All content, algorithms, software, and materials provided through the Service are the exclusive 
              property of Cortex Capital and are protected by copyright, trademark, and other intellectual property laws.
            </p>
            <p className="mt-4">You may not:</p>
            <ul className="list-disc pl-6 mt-4 space-y-2">
              <li>Copy, reverse engineer, or redistribute our algorithms or software</li>
              <li>Use our signals or data for commercial purposes without permission</li>
              <li>Remove or alter any proprietary notices or labels</li>
              <li>Create derivative works based on the Service</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-text-primary mb-4">7. Modifications to Terms</h2>
            <p>
              We may modify these Terms of Service at any time. Material changes will be communicated via email 
              or through the Service. Continued use of the Service after changes constitutes acceptance of the 
              modified terms.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-text-primary mb-4">8. Governing Law</h2>
            <p>
              These Terms of Service shall be governed by and construed in accordance with the laws of the 
              State of Delaware, without regard to its conflict of law provisions. Any disputes arising from 
              these terms shall be resolved in the courts of Delaware.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-text-primary mb-4">9. Contact Information</h2>
            <p>
              For questions about these Terms of Service, please contact us at:
            </p>
            <p className="mt-4">
              Email: <span className="text-primary">support@zerogtrading.com</span><br />
              support@zerogtrading.com
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-text-primary mb-4">10. Severability</h2>
            <p>
              If any provision of these Terms is found to be unenforceable or invalid, that provision will be 
              limited or eliminated to the minimum extent necessary, and the remaining provisions will remain 
              in full force and effect.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-text-primary mb-4">11. Entire Agreement</h2>
            <p>
              These Terms of Service, together with our Privacy Policy and Investment Disclaimer, constitute 
              the entire agreement between you and Cortex Capital regarding use of the Service.
            </p>
          </section>
        </div>

        <div className="mt-12 pt-8 border-t border-gray-700">
          <p className="text-text-muted text-sm">
            By using Cortex Capital, you acknowledge that you have read, understood, and agree to be bound by 
            these Terms of Service.
          </p>
        </div>
      </div>
    </div>
  )
}
