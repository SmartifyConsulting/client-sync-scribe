import { useNavigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";

export default function TermsAndConditions() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-background border-b border-border">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate("/")}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-xl font-semibold text-foreground">Terms and Conditions</h1>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="prose prose-sm dark:prose-invert max-w-none">
          <p className="text-muted-foreground mb-8">
            <strong>Last Updated: {new Date().toLocaleDateString()}</strong>
          </p>

          <h2>1. Acceptance of Terms</h2>
          <p>
            By creating an account, accessing, or using Holarc (the "Platform"), you agree to be bound by these Terms and Conditions ("Terms"). Your use of the Platform constitutes your acceptance of these Terms. If you do not agree to these Terms, you must not access or use the Platform.
          </p>
          <p>
            <strong>By clicking "I Accept," "Sign Up," "Create Account," or by accessing or using the Platform, you acknowledge that you have read, understood, and agree to be bound by these Terms.</strong>
          </p>

          <h2>2. Description of Service</h2>
          <p>
            MediPad is a healthcare communication platform that enables doctors and patients to interact through a unified patient profile. The Platform facilitates information sharing, communication, and healthcare coordination but does not provide medical advice, diagnosis, or treatment.
          </p>

          <h2>3. Not a Medical Service Provider</h2>
          <p>
            <strong>IMPORTANT:</strong> Smartify Solutions is a technology platform provider only. We do not practice medicine, provide medical advice, or make medical recommendations. The Platform connects users but does not create a doctor-patient relationship between Smartify Solutions and any user. All medical decisions and care remain solely between healthcare providers and their patients.
          </p>

          <h2>4. User Accounts and Eligibility</h2>
          <h3>4.1 Account Types</h3>
          <p>The Platform supports two account types: Healthcare Provider accounts and Patient accounts.</p>
          
          <h3>4.2 Eligibility Requirements</h3>
          <p>By creating an account, you represent and warrant that:</p>
          <ul>
            <li>You are at least 18 years old</li>
            <li>Healthcare providers possess valid, current professional licenses in all jurisdictions where they will provide services</li>
            <li>Patients under 18 may use the Platform only under parental or guardian supervision with parental consent</li>
            <li>All information you provide during registration is accurate, current, and complete</li>
            <li>You will maintain and update your information to keep it accurate and current</li>
          </ul>

          <h3>4.3 Account Security</h3>
          <p>
            You are responsible for maintaining the confidentiality of your login credentials and for all activities that occur under your account. You must immediately notify us of any unauthorized access or security breach.
          </p>

          <h3>4.4 Account Creation Constitutes Agreement</h3>
          <p>
            By completing the account registration process, you agree to comply with all applicable terms, including the{" "}
            <a href="/business-associate-agreement" target="_blank" rel="noopener noreferrer" className="text-primary underline hover:text-primary/80">
              Healthcare Provider Agreement
            </a>{" "}
            (for providers) or{" "}
            <a href="/patient-consent" target="_blank" rel="noopener noreferrer" className="text-primary underline hover:text-primary/80">
              Patient Consent and Authorization
            </a>{" "}
            (for patients).
          </p>

          <h2>5. Healthcare Provider Responsibilities</h2>
          <p>
            By creating a healthcare provider account and using the Platform, healthcare providers automatically agree to and accept the{" "}
            <a href="/business-associate-agreement" target="_blank" rel="noopener noreferrer" className="text-primary underline hover:text-primary/80">
              Healthcare Provider Agreement
            </a>
            , and represent and warrant that they:
          </p>
          <ul>
            <li>Maintain all required professional licenses and certifications in good standing</li>
            <li>Comply with all applicable medical standards of care</li>
            <li>Verify patient identity before providing medical information</li>
            <li>Use the Platform in accordance with HIPAA and other applicable healthcare regulations</li>
            <li>Maintain professional liability insurance with minimum coverage of $1,000,000 per occurrence and $3,000,000 aggregate</li>
            <li>Will not use the Platform as a substitute for in-person examination when clinically necessary</li>
            <li>Make independent medical judgments and do not rely solely on Platform features</li>
            <li>Accept full professional liability for all medical care and clinical decisions</li>
            <li>Will immediately notify us of any license suspension, restriction, or disciplinary action</li>
          </ul>

          <h2>6. Patient Responsibilities</h2>
          <p>
            By creating a patient account and using the Platform, patients automatically agree to and accept the{" "}
            <a href="/patient-consent" target="_blank" rel="noopener noreferrer" className="text-primary underline hover:text-primary/80">
              Patient Consent and Authorization
            </a>
            , and agree to:
          </p>
          <ul>
            <li>Provide accurate and complete health information</li>
            <li>Understand that the Platform supplements but does not replace in-person medical care</li>
            <li>Seek emergency medical attention when appropriate, not relying on the Platform for emergencies</li>
            <li>Follow their healthcare provider's instructions regarding Platform use</li>
            <li>Not share their account credentials with others</li>
            <li>Keep their health information current and accurate</li>
            <li>Authorize information sharing with healthcare providers they add to their care team</li>
          </ul>

          <h2>7. Emergency Disclaimer</h2>
          <p>
            <strong>THE PLATFORM IS NOT FOR EMERGENCIES. If you are experiencing a medical emergency, immediately call emergency services or go to the nearest emergency room. Do not use the Platform for urgent or emergency medical situations.</strong>
          </p>
          <p>By using the Platform, you acknowledge and accept this limitation.</p>

          <h2>8. Privacy and Data Protection</h2>
          <h3>8.1 HIPAA Compliance and Acceptance</h3>
          <p>
            By using the Platform, you automatically accept and agree to our Privacy Policy and Notice of Privacy Practices. We are committed to complying with the Health Insurance Portability and Accountability Act (HIPAA) and maintaining the privacy and security of Protected Health Information (PHI).
          </p>

          <h3>8.2 Automatic Data Use Consent</h3>
          <p>
            By creating an account and using the Platform, you consent to our collection, use, and disclosure of your information as described in our Privacy Policy.
          </p>

          <h3>8.3 Business Associate Relationship</h3>
          <p>
            Healthcare providers who are HIPAA Covered Entities acknowledge that by using the Platform, they automatically enter into and accept our{" "}
            <a href="/business-associate-agreement" target="_blank" rel="noopener noreferrer" className="text-primary underline hover:text-primary/80">
              Business Associate Agreement
            </a>
            , which governs our handling of Protected Health Information.
          </p>

          <h3>8.4 Data Security</h3>
          <p>
            While we implement industry-standard security measures, no electronic transmission or storage is completely secure. You acknowledge that you use the Platform at your own risk.
          </p>

          <h2>9. Intellectual Property Rights</h2>
          <h3>9.1 Platform Ownership</h3>
          <p>
            The Platform, including all content, features, functionality, software, and design, is owned by Smartify Solutions and is protected by copyright, trademark, and other intellectual property laws.
          </p>

          <h3>9.2 User Content</h3>
          <p>
            Users retain ownership of content they submit to the Platform. By submitting content, you automatically grant Smartify Solutions a worldwide, non-exclusive, royalty-free license to use, reproduce, modify, and display such content solely for operating and improving the Platform.
          </p>

          <h3>9.3 Prohibited Uses</h3>
          <p>
            You may not reproduce, distribute, modify, create derivative works of, publicly display, or exploit the Platform or any portion thereof without our express written permission.
          </p>

          <h2>10. Prohibited Conduct</h2>
          <p>By using the Platform, you agree not to:</p>
          <ul>
            <li>Violate any applicable laws or regulations</li>
            <li>Infringe upon the rights of others</li>
            <li>Upload malicious code, viruses, or harmful content</li>
            <li>Attempt to gain unauthorized access to the Platform or user accounts</li>
            <li>Use the Platform for fraudulent purposes</li>
            <li>Harass, abuse, or harm other users</li>
            <li>Misrepresent your identity or credentials</li>
            <li>Use the Platform for marketing or solicitation without authorization</li>
            <li>Share or sell access to your account</li>
            <li>Scrape, data mine, or use automated systems to access the Platform</li>
            <li>Practice medicine outside your scope of licensure (for providers)</li>
            <li>Provide false health information (for patients)</li>
          </ul>

          <h2>11. Disclaimer of Warranties</h2>
          <p>
            <strong>BY USING THE PLATFORM, YOU ACCEPT THAT THE PLATFORM IS PROVIDED "AS IS" AND "AS AVAILABLE" WITHOUT WARRANTIES OF ANY KIND, EITHER EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO IMPLIED WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE, AND NON-INFRINGEMENT.</strong>
          </p>
          <p>We do not warrant that:</p>
          <ul>
            <li>The Platform will be uninterrupted, secure, or error-free</li>
            <li>Any defects or errors will be corrected</li>
            <li>The Platform is free of viruses or harmful components</li>
            <li>The results obtained from using the Platform will be accurate or reliable</li>
          </ul>

          <h2>12. Limitation of Liability</h2>
          <p>
            <strong>BY USING THE PLATFORM, YOU ACCEPT THAT, TO THE MAXIMUM EXTENT PERMITTED BY LAW, SMARTIFY SOLUTIONS SHALL NOT BE LIABLE FOR ANY INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES, INCLUDING BUT NOT LIMITED TO LOSS OF PROFITS, DATA, USE, OR GOODWILL, ARISING OUT OF OR RELATED TO YOUR USE OF THE PLATFORM, EVEN IF WE HAVE BEEN ADVISED OF THE POSSIBILITY OF SUCH DAMAGES.</strong>
          </p>
          <p>
            <strong>IN NO EVENT SHALL OUR TOTAL LIABILITY TO YOU EXCEED THE AMOUNT YOU PAID US IN THE TWELVE (12) MONTHS PRECEDING THE EVENT GIVING RISE TO LIABILITY, OR ONE HUNDRED DOLLARS ($100), WHICHEVER IS GREATER.</strong>
          </p>
          <p>Some jurisdictions do not allow the exclusion or limitation of certain damages, so some of the above limitations may not apply to you.</p>

          <h2>13. Indemnification</h2>
          <p>
            By using the Platform, you automatically agree to indemnify, defend, and hold harmless Smartify Solutions, its affiliates, officers, directors, employees, and agents from and against any claims, liabilities, damages, losses, costs, or expenses (including reasonable attorneys' fees) arising out of or related to:
          </p>
          <ul>
            <li>Your use of the Platform</li>
            <li>Your violation of these Terms</li>
            <li>Your violation of any rights of another party</li>
            <li>Any medical malpractice or professional negligence (for healthcare provider users)</li>
            <li>Your content or information submitted to the Platform</li>
            <li>Your failure to comply with applicable laws or professional standards</li>
          </ul>

          <h2>14. Third-Party Services and Links</h2>
          <p>
            The Platform may contain links to third-party websites or integrate with third-party services. We are not responsible for the content, accuracy, privacy practices, or services of third parties. Your use of third-party services is at your own risk and subject to their terms and conditions. By using the Platform, you accept this limitation.
          </p>

          <h2>15. Termination</h2>
          <h3>15.1 Termination by You</h3>
          <p>
            You may terminate your account at any time by following the account closure process in the Platform settings. Termination does not relieve you of obligations that accrued prior to termination.
          </p>

          <h3>15.2 Termination by Us</h3>
          <p>
            We reserve the right to suspend or terminate your account and access to the Platform at any time, with or without cause, with or without notice. By using the Platform, you accept this right. Grounds for termination include:
          </p>
          <ul>
            <li>Violation of these Terms</li>
            <li>Fraudulent, abusive, or illegal activity</li>
            <li>Extended periods of inactivity</li>
            <li>Requests by law enforcement or regulatory authorities</li>
            <li>Technical or security issues</li>
            <li>For healthcare providers: license suspension or revocation, failure to maintain insurance, quality of care concerns, or unprofessional conduct</li>
            <li>For patients: providing false information, abusive behavior, or misuse of Platform</li>
          </ul>

          <h3>15.3 Effect of Termination</h3>
          <p>
            Upon termination, your right to use the Platform ceases immediately. Healthcare providers must ensure appropriate continuity of care for their patients. We may retain certain information as required by law or for legitimate business purposes. Provisions regarding liability, indemnification, and dispute resolution survive termination.
          </p>

          <h2>16. Modifications to Terms</h2>
          <p>We reserve the right to modify these Terms at any time. We will provide notice of material changes by:</p>
          <ul>
            <li>Posting the updated Terms on the Platform with a new "Last Updated" date</li>
            <li>Sending email notification (for material changes)</li>
            <li>Displaying a prominent notice on the Platform</li>
          </ul>
          <p>
            <strong>Your continued use of the Platform after such modifications constitutes your acceptance of the updated Terms.</strong> If you do not agree to the modified Terms, you must stop using the Platform and close your account.
          </p>

          <h2>17. Modifications to the Platform</h2>
          <p>
            We reserve the right to modify, suspend, or discontinue the Platform (or any part thereof) at any time, with or without notice. By using the Platform, you accept this right. We shall not be liable to you or any third party for any modification, suspension, or discontinuation of the Platform.
          </p>

          <h2>18. Regulatory Compliance</h2>
          <h3>18.1 Healthcare Regulations</h3>
          <p>
            Healthcare providers are solely responsible for compliance with all applicable healthcare regulations, including but not limited to HIPAA, state medical practice acts, telemedicine regulations, and professional standards. By using the Platform, providers accept this responsibility.
          </p>

          <h3>18.2 Licensing</h3>
          <p>
            Healthcare providers must maintain valid licenses in all jurisdictions where they provide services through the Platform. By creating a provider account, you represent that you possess all required licenses. We do not verify or monitor provider licenses; users rely on provider representations at their own risk.
          </p>

          <h3>18.3 Prescribing and Treatment</h3>
          <p>
            Any prescribing of medications or provision of treatment through the Platform must comply with applicable laws, including the Ryan Haight Act for controlled substances. By using the Platform to prescribe, providers accept full responsibility for compliance.
          </p>

          <h2>19. Dispute Resolution</h2>
          <h3>19.1 Governing Law</h3>
          <p>
            By using the Platform, you agree that these Terms shall be governed by and construed in accordance with the laws of South Africa, without regard to its conflict of law provisions.
          </p>

          <h3>19.2 Arbitration Agreement</h3>
          <p>
            <strong>BY USING THE PLATFORM, YOU AGREE</strong> that any dispute arising out of or relating to these Terms or the Platform shall be resolved through binding arbitration in accordance with the rules of the Arbitration Foundation of Southern Africa, rather than in court, except that you may assert claims in small claims court if your claims qualify. You waive any right to a jury trial.
          </p>

          <h3>19.3 Class Action Waiver</h3>
          <p>
            <strong>BY USING THE PLATFORM, YOU AGREE</strong> that any arbitration or proceeding shall be limited to the dispute between you and Smartify Solutions individually. To the full extent permitted by law, no arbitration or proceeding shall be joined with any other, and there is no right or authority for any dispute to be arbitrated or resolved on a class action basis or in a purported representative capacity.
          </p>

          <h3>19.4 Opt-Out of Arbitration</h3>
          <p>
            You have the right to opt out of this arbitration agreement within 30 days of first using the Platform by sending written notice to our registered address with your name, contact information, and a clear statement that you wish to opt out of arbitration. If you opt out, disputes will be resolved in court.
          </p>

          <h3>19.5 Exceptions</h3>
          <p>
            Either party may seek injunctive or equitable relief in any court of competent jurisdiction for disputes related to intellectual property, confidentiality, or unauthorized access to the Platform.
          </p>

          <h2>20. Communications</h2>
          <p>
            By using the Platform, you automatically consent to receive electronic communications from us, including emails, push notifications, text messages (if you provide your phone number), and in-app messages. These communications may include:
          </p>
          <ul>
            <li>Notices about your account</li>
            <li>Transactional information</li>
            <li>Administrative messages</li>
            <li>Service updates</li>
            <li>Security alerts</li>
            <li>Changes to these Terms or our Privacy Policy</li>
          </ul>
          <p>
            You agree that all agreements, notices, and other communications that we provide electronically satisfy any legal requirement that such communications be in writing. You may opt out of non-essential communications but will continue to receive transactional and administrative messages.
          </p>

          <h2>21. Assignment</h2>
          <p>
            You may not assign or transfer these Terms or your rights under these Terms, in whole or in part, without our prior written consent. We may assign these Terms at any time without notice or consent. Any attempted assignment in violation of this section shall be null and void. By using the Platform, you accept these assignment terms.
          </p>

          <h2>22. Severability</h2>
          <p>
            If any provision of these Terms is found to be unlawful, void, or unenforceable, that provision shall be deemed severable and shall not affect the validity and enforceability of the remaining provisions. By using the Platform, you accept that severable provisions will be modified to the minimum extent necessary to make them enforceable.
          </p>

          <h2>23. Waiver</h2>
          <p>
            No waiver of any term of these Terms shall be deemed a further or continuing waiver of such term or any other term. Our failure to assert any right or provision under these Terms shall not constitute a waiver of such right or provision.
          </p>

          <h2>24. Entire Agreement</h2>
          <p>
            By using the Platform, you acknowledge that these Terms, together with our Privacy Policy, Business Associate Agreement (for providers), Healthcare Provider Agreement (for providers), Patient Consent and Authorization (for patients), and any other legal notices published on the Platform, constitute the entire agreement between you and Smartify Solutions regarding the Platform and supersede all prior agreements and understandings.
          </p>

          <h2>25. Force Majeure</h2>
          <p>
            We shall not be liable for any failure or delay in performance due to circumstances beyond our reasonable control, including acts of God, war, terrorism, pandemics, natural disasters, government actions, or failures of third-party services. By using the Platform, you accept this limitation.
          </p>

          <h2>26. Survival</h2>
          <p>
            Provisions of these Terms that by their nature should survive termination shall survive, including but not limited to intellectual property rights, disclaimers, limitations of liability, indemnification, and dispute resolution provisions.
          </p>

          <h2>27. Contact Information</h2>
          <p>For questions about these Terms, please contact us at:</p>
          <p>
            <strong>Smartify Solutions</strong><br />
            Email: support@medipad.com
          </p>

          <h2>28. Special Provisions for Specific Jurisdictions</h2>
          <h3>28.1 South African Users</h3>
          <p>
            Users in South Africa are subject to the Protection of Personal Information Act (POPIA) and the Consumer Protection Act. Please see our Privacy Policy for more information on how we protect your personal information.
          </p>

          <h3>28.2 European Users</h3>
          <p>
            If you are located in the European Economic Area, you have certain rights under the General Data Protection Regulation (GDPR). Please see our Privacy Policy for more information. By using the Platform from the EEA, you consent to the transfer of your data to South Africa for processing.
          </p>

          <h3>28.3 Other Jurisdictions</h3>
          <p>
            Additional provisions may apply based on your location. We will provide notice of any jurisdiction-specific terms as applicable. By using the Platform, you agree to comply with all local laws and regulations.
          </p>

          <h2>29. Acknowledgment and Acceptance</h2>
          <p>
            <strong>BY CLICKING "I ACCEPT," "SIGN UP," "CREATE ACCOUNT," OR BY ACCESSING OR USING THE PLATFORM, YOU ACKNOWLEDGE THAT:</strong>
          </p>
          <ul>
            <li>You have read and understood these Terms and Conditions in their entirety</li>
            <li>You agree to be legally bound by these Terms</li>
            <li>You accept all risks associated with using the Platform</li>
            <li>You understand that the Platform is not for medical emergencies</li>
            <li>You accept the limitation of liability and disclaimer of warranties</li>
            <li>You agree to binding arbitration and waive class action rights</li>
            <li>You consent to electronic communications</li>
            <li>Healthcare providers accept the Healthcare Provider Agreement</li>
            <li>Patients accept the Patient Consent and Authorization</li>
            <li>You understand that Smartify Solutions does not practice medicine</li>
            <li>You accept responsibility for your use of the Platform</li>
          </ul>
          <p>
            <strong>IF YOU DO NOT AGREE TO THESE TERMS, DO NOT USE THE PLATFORM.</strong>
          </p>

          <hr className="my-8" />

          <p className="text-muted-foreground">
            Your continued use of the Platform constitutes ongoing acceptance of these Terms as they may be modified from time to time.
          </p>
        </div>
      </div>
    </div>
  );
}