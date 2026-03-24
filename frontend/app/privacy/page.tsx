import Link from 'next/link'

export const metadata = {
  title: 'Privacy Policy - Cortex Capital',
  description: 'Privacy Policy for Cortex Capital AI trading platform',
}

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-4xl mx-auto px-6 py-16">
        <Link 
          href="/" 
          className="text-primary hover:underline mb-8 inline-block"
        >
          ← Back to Home
        </Link>

        <h1 className="text-4xl font-bold mb-4">Privacy Policy</h1>
        <p className="text-text-secondary mb-8">Last Updated: March 21, 2026</p>

        <div className="space-y-8 text-text-secondary leading-relaxed">
          <section>
            <h2 className="text-2xl font-semibold text-text-primary mb-4">1. Introduction</h2>
            <p>
              Cortex Capital ("we", "our", or "us") is committed to protecting your privacy. This Privacy Policy 
              explains how we collect, use, disclose, and safeguard your information when you use our Service.
            </p>
            <p className="mt-4 font-semibold text-primary">
              We value your trust and take data protection seriously.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-text-primary mb-4">2. Information We Collect</h2>
            
            <h3 className="text-xl font-semibold text-text-primary mb-3 mt-6">Account Information</h3>
            <ul className="list-disc pl-6 space-y-2">
              <li>Email address (required for account creation and communication)</li>
              <li>Name (optional)</li>
              <li>Password (encrypted and never stored in plain text)</li>
              <li>Payment information (processed securely through third-party providers)</li>
            </ul>

            <h3 className="text-xl font-semibold text-text-primary mb-3 mt-6">Broker Connection Data</h3>
            <ul className="list-disc pl-6 space-y-2">
              <li>Broker API credentials (encrypted)</li>
              <li>Account positions and balances</li>
              <li>Trade execution data</li>
              <li>Portfolio performance metrics</li>
            </ul>

            <h3 className="text-xl font-semibold text-text-primary mb-3 mt-6">Trading Preferences</h3>
            <ul className="list-disc pl-6 space-y-2">
              <li>Risk tolerance settings</li>
              <li>Asset preferences and watchlists</li>
              <li>Notification preferences</li>
              <li>Trading strategy selections</li>
            </ul>

            <h3 className="text-xl font-semibold text-text-primary mb-3 mt-6">Usage Data</h3>
            <ul className="list-disc pl-6 space-y-2">
              <li>Login timestamps and IP addresses</li>
              <li>Pages visited and features used</li>
              <li>Device and browser information</li>
              <li>Performance and error logs</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-text-primary mb-4">3. How We Use Your Information</h2>
            <p>We use the collected information to:</p>
            <ul className="list-disc pl-6 mt-4 space-y-2">
              <li><strong>Provide the Service:</strong> Generate trading signals, execute trades, and maintain your account</li>
              <li><strong>Improve Our Algorithms:</strong> Analyze aggregate data to enhance AI model performance</li>
              <li><strong>Communicate:</strong> Send important updates, signals, and account notifications</li>
              <li><strong>Security:</strong> Detect and prevent fraud, abuse, and unauthorized access</li>
              <li><strong>Compliance:</strong> Meet legal and regulatory obligations</li>
              <li><strong>Support:</strong> Respond to your questions and technical issues</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-text-primary mb-4">4. What We DON'T Do With Your Data</h2>
            <div className="bg-surface-elevated border border-success/30 rounded-lg p-6 space-y-4">
              <p className="font-semibold text-success">Your Data Privacy Protections:</p>
              <ul className="list-disc pl-6 space-y-2">
                <li><strong>We DO NOT sell your data</strong> to advertisers, data brokers, or third parties</li>
                <li><strong>We DO NOT share your personal information</strong> except with your broker (when you authorize trades) and essential service providers</li>
                <li><strong>We DO NOT use your data for advertising</strong> or marketing to third parties</li>
                <li><strong>We DO NOT train our AI on your individual trading patterns</strong> without anonymization</li>
                <li><strong>We DO NOT provide your trading data</strong> to competitors or research firms</li>
              </ul>
            </div>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-text-primary mb-4">5. Data Sharing and Third Parties</h2>
            <p>We share your information only in the following limited circumstances:</p>
            
            <h3 className="text-xl font-semibold text-text-primary mb-3 mt-6">Broker Integration</h3>
            <p>
              When you connect your brokerage account, we share necessary authentication and trade instructions 
              with your chosen broker to execute trades on your behalf.
            </p>

            <h3 className="text-xl font-semibold text-text-primary mb-3 mt-6">Service Providers</h3>
            <p>We use trusted third-party services for:</p>
            <ul className="list-disc pl-6 mt-2 space-y-2">
              <li>Payment processing (Stripe)</li>
              <li>Cloud infrastructure (AWS)</li>
              <li>Email delivery</li>
              <li>Analytics (anonymized data only)</li>
            </ul>

            <h3 className="text-xl font-semibold text-text-primary mb-3 mt-6">Legal Obligations</h3>
            <p>
              We may disclose information if required by law, court order, or government request, or to protect 
              our rights and safety.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-text-primary mb-4">6. Data Retention</h2>
            <p>We retain your data for as long as:</p>
            <ul className="list-disc pl-6 mt-4 space-y-2">
              <li>Your account is active</li>
              <li>Needed to provide you the Service</li>
              <li>Required by law or regulation (typically 7 years for financial records)</li>
            </ul>
            <p className="mt-4">
              When you delete your account, we will delete or anonymize your personal data within 90 days, 
              except where retention is required by law.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-text-primary mb-4">7. Your Privacy Rights</h2>
            <p>You have the right to:</p>
            <ul className="list-disc pl-6 mt-4 space-y-2">
              <li><strong>Access:</strong> Request a copy of the personal data we hold about you</li>
              <li><strong>Correction:</strong> Update or correct inaccurate information</li>
              <li><strong>Deletion:</strong> Request deletion of your account and data</li>
              <li><strong>Export:</strong> Download your data in a portable format</li>
              <li><strong>Opt-Out:</strong> Unsubscribe from marketing communications</li>
              <li><strong>Object:</strong> Object to certain processing of your data</li>
            </ul>
            <p className="mt-4">
              To exercise these rights, contact us at <span className="text-primary">support@zerogtrading.com</span>
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-text-primary mb-4">8. Cookies and Tracking</h2>
            <p>We use cookies and similar technologies to:</p>
            <ul className="list-disc pl-6 mt-4 space-y-2">
              <li>Keep you logged in securely</li>
              <li>Remember your preferences</li>
              <li>Analyze how the Service is used (anonymized)</li>
              <li>Prevent fraud and abuse</li>
            </ul>
            <p className="mt-4">
              You can control cookies through your browser settings, but some features may not work properly 
              if cookies are disabled.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-text-primary mb-4">9. Data Security</h2>
            <p>We implement industry-standard security measures including:</p>
            <ul className="list-disc pl-6 mt-4 space-y-2">
              <li>Encryption of data in transit (TLS/SSL) and at rest (AES-256)</li>
              <li>Regular security audits and penetration testing</li>
              <li>Access controls and authentication requirements</li>
              <li>Monitoring for suspicious activity</li>
              <li>Employee training on data protection</li>
            </ul>
            <p className="mt-4 text-warning">
              However, no system is 100% secure. You should protect your account credentials and report any 
              suspicious activity immediately.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-text-primary mb-4">10. CCPA & GDPR Compliance</h2>
            
            <h3 className="text-xl font-semibold text-text-primary mb-3 mt-6">California Residents (CCPA)</h3>
            <p>If you are a California resident, you have additional rights including:</p>
            <ul className="list-disc pl-6 mt-2 space-y-2">
              <li>Right to know what personal information is collected</li>
              <li>Right to know if your information is sold or disclosed</li>
              <li>Right to opt-out of sale (we do not sell your data)</li>
              <li>Right to deletion</li>
              <li>Right to non-discrimination for exercising your rights</li>
            </ul>

            <h3 className="text-xl font-semibold text-text-primary mb-3 mt-6">European Residents (GDPR)</h3>
            <p>If you are in the EU/EEA, you have rights under GDPR including:</p>
            <ul className="list-disc pl-6 mt-2 space-y-2">
              <li>Right to access, rectification, and erasure</li>
              <li>Right to data portability</li>
              <li>Right to restrict or object to processing</li>
              <li>Right to withdraw consent</li>
              <li>Right to lodge a complaint with a supervisory authority</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-text-primary mb-4">11. Children's Privacy</h2>
            <p>
              Our Service is not intended for individuals under 18 years of age. We do not knowingly collect 
              personal information from children. If you believe we have collected data from a child, please 
              contact us immediately.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-text-primary mb-4">12. International Data Transfers</h2>
            <p>
              Your data may be transferred to and processed in countries other than your own. We ensure 
              appropriate safeguards are in place to protect your data in accordance with this Privacy Policy 
              and applicable laws.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-text-primary mb-4">13. Changes to This Policy</h2>
            <p>
              We may update this Privacy Policy periodically. Material changes will be communicated via email 
              or through the Service. The "Last Updated" date at the top will reflect when changes were made.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-text-primary mb-4">14. Contact Us</h2>
            <p>
              For questions or concerns about this Privacy Policy or our data practices, contact us at:
            </p>
            <p className="mt-4">
              Email: <span className="text-primary">support@zerogtrading.com</span><br />
              support@zerogtrading.com
            </p>
          </section>
        </div>

        <div className="mt-12 pt-8 border-t border-gray-700">
          <p className="text-text-muted text-sm">
            This Privacy Policy was last updated on March 21, 2026. By using Cortex Capital, you consent to 
            the collection and use of information as described in this policy.
          </p>
        </div>
      </div>
    </div>
  )
}
