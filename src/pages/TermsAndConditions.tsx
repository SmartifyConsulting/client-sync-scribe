import { LegalDocLayout } from "@/components/legal/LegalDocLayout";

export default function TermsAndConditions() {
  return (
    <LegalDocLayout title="Terms and Conditions" subtitle="The terms governing your use of Holarc Wealth">
      <>
        <h2>1. Acceptance of Terms</h2>
        <p>
          By creating an account, accessing, or using Holarc Wealth (the "Platform"), you agree to be bound by
          these Terms and Conditions ("Terms"). If you do not agree to these Terms, you must not access or use the
          Platform.
        </p>

        <h2>2. Description of Service</h2>
        <p>
          Holarc Wealth is a wealth-management communication platform that enables Wealth Managers and their
          clients to interact through a unified client profile. The Platform facilitates information sharing,
          communication, and financial-planning coordination. It does not provide financial advice itself — all
          advice comes from your licensed Wealth Manager.
        </p>

        <h2>3. Not a Licensed Financial Services Provider</h2>
        <p>
          <strong>IMPORTANT:</strong> Holarc Wealth is a technology platform provider. We do not provide financial
          advice or make product recommendations. The Platform connects users but does not itself act as a
          Financial Services Provider under FAIS. All advice and financial decisions remain solely between your
          Wealth Manager and you.
        </p>

        <h2>4. User Accounts and Eligibility</h2>
        <h3>4.1 Account Types</h3>
        <p>The Platform supports two account types: Wealth Manager accounts and Client accounts.</p>

        <h3>4.2 Eligibility Requirements</h3>
        <p>By creating an account, you represent and warrant that:</p>
        <ul>
          <li>You are at least 18 years old, or are creating the account as a parent/guardian of a dependant</li>
          <li>Wealth Managers hold any licences or authorisations required to provide financial advice in their jurisdiction (e.g. FSP/representative status under FAIS)</li>
          <li>All information you provide is accurate and complete</li>
        </ul>

        <h2>5. Account Responsibilities</h2>
        <p>You are responsible for maintaining the confidentiality of your login credentials and for all activity under your account. Notify us immediately of any unauthorised use.</p>

        <h2>6. Fees and Payment</h2>
        <p>
          The Platform may charge subscription or usage fees to Wealth Managers. Any fees for financial advice or
          services are a matter between you and your Wealth Manager and are not set by Holarc Wealth.
        </p>

        <h2 id="intellectual-property">7. Intellectual Property</h2>
        <p>
          The Platform, including its design, text, graphics, and underlying software, is owned by Holarc Wealth
          (Pty) Ltd and protected by intellectual property laws. You may not copy, modify, or distribute any part
          of the Platform without our written permission.
        </p>

        <h2>8. Data and Privacy</h2>
        <p>
          Your use of the Platform is also governed by our Client Consent and Privacy Notice and our Privacy
          Policy, which describe how we collect, use, and protect your information in accordance with POPIA.
        </p>

        <h2>9. Electronic Communications</h2>
        <p>
          By using the Platform, you consent to receive electronic communications from us, including email, SMS,
          and in-app notifications relating to your account and the services.
        </p>

        <h2>10. Disclaimers</h2>
        <p>
          The Platform is provided "as is" and "as available" without warranties of any kind, express or implied.
          We do not warrant that the Platform will be uninterrupted, secure, or error-free.
        </p>

        <h2>11. Limitation of Liability</h2>
        <p>
          <strong>
            TO THE FULLEST EXTENT PERMITTED BY LAW, HOLARC WEALTH SHALL NOT BE LIABLE FOR ANY INDIRECT,
            INCIDENTAL, OR CONSEQUENTIAL DAMAGES ARISING FROM YOUR USE OF THE PLATFORM, INCLUDING ANY LOSS ARISING
            FROM FINANCIAL ADVICE GIVEN BY A WEALTH MANAGER, WHICH REMAINS THEIR SOLE RESPONSIBILITY.
          </strong>
        </p>

        <h2>12. Dispute Resolution</h2>
        <p>
          Any disputes arising from these Terms will first be addressed through our complaints process. Where not
          resolved, disputes may be referred to arbitration or to the applicable regulatory ombud (e.g. the FAIS
          Ombud for advice-related complaints), at the complainant's election, or to the courts of South Africa.
        </p>

        <h2>13. Termination</h2>
        <p>
          We may suspend or terminate your account if you violate these Terms, provide false information, or as
          required by law. You may close your account at any time through Platform settings or by contacting
          support.
        </p>

        <h2>14. Changes to These Terms</h2>
        <p>
          We may update these Terms from time to time. We will notify you by email or in-app notice. Your
          continued use of the Platform after changes take effect constitutes acceptance of the updated Terms.
        </p>

        <h2>15. Governing Law</h2>
        <p>These Terms are governed by the laws of the Republic of South Africa.</p>

        <h2>16. Contact</h2>
        <p>
          For questions about these Terms, contact:
          <br />
          <strong>Holarc Wealth (Pty) Ltd</strong>
          <br />
          Email: support@holarchealth.com
        </p>
      </>
    </LegalDocLayout>
  );
}
