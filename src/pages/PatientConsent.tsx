import { useNavigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function PatientConsent() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-background border-b border-border">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate("/")}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-xl font-semibold text-foreground">Patient Consent and Authorization</h1>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="prose prose-sm dark:prose-invert max-w-none">
          <p className="text-muted-foreground mb-8">
            <strong>Last Updated: {new Date().toLocaleDateString()}</strong>
          </p>

          <h2>ACCEPTANCE BY USE</h2>
          <p>
            <strong>BY CREATING A PATIENT ACCOUNT, CLICKING "I ACCEPT," "SIGN UP," OR BY USING THE PLATFORM IN ANY WAY, YOU AUTOMATICALLY ACCEPT AND AGREE TO THIS PATIENT CONSENT AND AUTHORIZATION.</strong>
          </p>
          <p>
            This Patient Consent and Authorization ("Patient Consent") explains how mIRI360 (the "Platform") works and what you are agreeing to when you use it. Your use of the Platform constitutes your binding acceptance of all terms herein.
          </p>

          <h2>1. Introduction and Purpose</h2>
          <p>
            By creating an account and using the Platform, you automatically consent to and accept the following terms and authorizations. The Platform is a healthcare technology service that allows you to communicate with your healthcare providers and maintain your health information in one place.
          </p>
          <p>
            <strong>Important:</strong> The Platform is a communication and information tool. It does not provide medical advice, diagnosis, or treatment. All medical care comes from your healthcare providers, not from Smartify Solutions.
          </p>

          <h2>2. Description of Services You Are Accepting</h2>
          <p>By using the Platform, you accept that it provides:</p>
          <ul>
            <li>Secure messaging with your healthcare providers</li>
            <li>A unified profile containing your health information</li>
            <li>Ability to share your health information with multiple providers you authorize</li>
            <li>Storage of medical records, test results, and health documents</li>
            <li>Appointment scheduling and reminders (if available)</li>
            <li>Health tracking tools (if available)</li>
            <li>Communication tools for coordinating care among your providers</li>
          </ul>

          <h2>3. EMERGENCY DISCLAIMER - MANDATORY ACKNOWLEDGMENT</h2>
          <p>
            <strong>BY USING THE PLATFORM, YOU ACKNOWLEDGE AND ACCEPT THAT THE PLATFORM IS NOT FOR MEDICAL EMERGENCIES.</strong>
          </p>
          <p>By creating an account, you agree that if you are experiencing a medical emergency, you will:</p>
          <ul>
            <li>Call emergency services immediately, or</li>
            <li>Go to the nearest emergency room</li>
            <li>NOT use the Platform to request emergency help</li>
          </ul>
          <p>You understand and accept that your healthcare providers may not see your messages immediately.</p>
          <p><strong>Emergency situations include:</strong></p>
          <ul>
            <li>Chest pain or pressure</li>
            <li>Difficulty breathing</li>
            <li>Severe bleeding</li>
            <li>Loss of consciousness</li>
            <li>Sudden severe headache</li>
            <li>Signs of stroke (facial drooping, arm weakness, speech difficulty)</li>
            <li>Severe allergic reaction</li>
            <li>Suicidal thoughts or intent to harm yourself or others</li>
            <li>Any life-threatening condition</li>
          </ul>

          <h2>4. Your Responsibilities - Automatic Agreement</h2>
          <p>By using the Platform, you automatically agree to:</p>
          <ul>
            <li>✓ Provide accurate and complete health information</li>
            <li>✓ Update your information when it changes</li>
            <li>✓ Keep your login credentials secure and confidential</li>
            <li>✓ Not share your account with others</li>
            <li>✓ Use the Platform appropriately and lawfully</li>
            <li>✓ Follow your healthcare provider's instructions</li>
            <li>✓ Understand that the Platform supplements, but does not replace, in-person medical care</li>
            <li>✓ Seek in-person care when appropriate or when your provider recommends it</li>
            <li>✓ Inform your providers of all medications, allergies, and health conditions</li>
            <li>✓ Tell your provider if you don't understand something about your care</li>
            <li>✓ Not use the Platform for illegal purposes</li>
            <li>✓ Not upload false or misleading health information</li>
            <li>✓ Respond to provider communications in a timely manner</li>
            <li>✓ Pay any applicable fees for Platform use or provider services</li>
          </ul>

          <h2>5. Privacy and Use of Your Health Information</h2>
          
          <h3>5.1 Automatic Consent to Privacy Practices</h3>
          <p>By creating an account and using the Platform, you automatically consent to our privacy practices, including:</p>
          <ul>
            <li>Collection of your personal and health information</li>
            <li>Use of your information to operate the Platform</li>
            <li>Storage of your information on secure servers</li>
            <li>Disclosure of your information as described in our Privacy Policy</li>
            <li>Our Notice of Privacy Practices (HIPAA Notice)</li>
          </ul>
          <p>Your health information is protected by federal law (HIPAA). We use secure technology to protect your information, including encryption and secure servers.</p>

          <h3>5.2 Who Can Access Your Information - Automatic Authorization</h3>
          <p>By using the Platform, you automatically authorize the following access to your health information:</p>
          <ul>
            <li>Healthcare providers you add to your care team</li>
            <li>Smartify Solutions staff who need access to operate and maintain the Platform</li>
            <li>Business associates who provide services on our behalf (all under HIPAA-compliant agreements)</li>
            <li>Other parties as required by law or with your additional specific consent</li>
          </ul>

          <h3>5.3 Our Privacy Policy - Mandatory Review</h3>
          <p>
            Our complete Privacy Policy describes how we collect, use, and protect your information in detail. By using the Platform, you confirm that you have reviewed and accept our Privacy Policy. The Privacy Policy is incorporated into and made part of this Patient Consent.
          </p>

          <h3>5.4 Your Privacy Rights - Acknowledgment</h3>
          <p>By using the Platform, you acknowledge that you have the following rights:</p>
          <ul>
            <li>Access your health information</li>
            <li>Request corrections to your information</li>
            <li>Receive an accounting of disclosures</li>
            <li>Request restrictions on who can see your information (though we may not always be able to accommodate such requests)</li>
            <li>Request confidential communications</li>
            <li>Receive a paper copy of our Notice of Privacy Practices</li>
            <li>File a complaint if you believe your privacy rights have been violated</li>
          </ul>
          <p>To exercise these rights, contact our Privacy Officer.</p>

          <h3>5.5 No Retaliation</h3>
          <p>You will not be retaliated against for filing a privacy complaint or exercising your privacy rights.</p>

          <h2>6. Consent to Treatment via the Platform</h2>

          <h3>6.1 Virtual Care - Automatic Consent</h3>
          <p>By communicating with healthcare providers through the Platform, you automatically consent to your healthcare providers using the Platform to:</p>
          <ul>
            <li>Communicate with you about your health</li>
            <li>Review your medical history</li>
            <li>Provide medical advice and treatment recommendations</li>
            <li>Prescribe medications</li>
            <li>Order tests or referrals</li>
            <li>Coordinate your care with other providers</li>
            <li>Document your care in medical records</li>
            <li>Send you appointment reminders and health information</li>
          </ul>

          <h3>6.2 Limitations of Virtual Care - Mandatory Acknowledgment</h3>
          <p>By using the Platform, you acknowledge and accept that:</p>
          <ul>
            <li>Some medical conditions require in-person examination</li>
            <li>Your provider may not be able to diagnose or treat you without seeing you in person</li>
            <li>Technology problems may interfere with communication</li>
            <li>Virtual consultations may not be appropriate for all situations</li>
            <li>Your provider will tell you if you need to be seen in person</li>
            <li>You should follow your provider's recommendations for in-person visits</li>
            <li>The quality of virtual care depends on technology working properly</li>
            <li>You are responsible for having adequate internet connectivity</li>
          </ul>

          <h3>6.3 Provider-Patient Relationship - Understanding and Acceptance</h3>
          <p>By using the Platform, you understand and accept that:</p>
          <ul>
            <li>Your healthcare provider is responsible for your medical care, not Smartify Solutions</li>
            <li>Smartify Solutions provides the technology platform but does not practice medicine</li>
            <li>Your provider-patient relationship is with your healthcare provider only</li>
            <li>Smartify Solutions is not liable for your healthcare provider's medical decisions</li>
            <li>You should discuss any concerns about your care directly with your healthcare provider</li>
            <li>You may terminate the provider-patient relationship at any time</li>
            <li>Your providers may terminate the relationship in accordance with professional standards</li>
          </ul>

          <h2>7. Information Sharing and Coordination of Care</h2>

          <h3>7.1 Authorization to Share Among Your Providers - Automatic</h3>
          <p>By adding healthcare providers to your care team on the Platform, you automatically authorize:</p>
          <ul>
            <li>Sharing of your complete health information among all providers on your care team</li>
            <li>Access by all authorized providers to your entire medical history in the Platform</li>
            <li>Communication between your providers regarding your care</li>
            <li>Coordination of care activities among your providers</li>
            <li>Access by healthcare staff working under your providers' supervision</li>
          </ul>
          <p>This authorization applies to all past, present, and future health information in your Platform profile.</p>

          <h3>7.2 Scope of Authorization</h3>
          <p>By using the Platform, you specifically authorize disclosure of:</p>
          <ul>
            <li>All medical history and physical examination findings</li>
            <li>All laboratory and diagnostic test results</li>
            <li>All diagnoses and treatment plans</li>
            <li>All medications and prescriptions</li>
            <li>All mental health information, including psychotherapy notes if uploaded</li>
            <li>All substance abuse treatment information</li>
            <li>All HIV/AIDS testing and treatment information</li>
            <li>All genetic testing information</li>
            <li>All reproductive health information</li>
            <li>All information related to sexually transmitted infections</li>
            <li>All other health information in your profile</li>
          </ul>

          <h3>7.3 Benefits of Information Sharing - Acknowledgment</h3>
          <p>By using the Platform, you acknowledge the benefits of information sharing:</p>
          <ul>
            <li>Better coordinated care among all your providers</li>
            <li>Reduced risk of duplicate testing</li>
            <li>Reduced risk of medication interactions</li>
            <li>More informed treatment decisions</li>
            <li>Continuity of care across providers</li>
            <li>Emergency access to your medical history</li>
          </ul>

          <h3>7.4 Risks of Information Sharing - Acknowledgment</h3>
          <p>By using the Platform, you acknowledge and accept the risks:</p>
          <ul>
            <li>More people will have access to your health information</li>
            <li>Information cannot be "taken back" once shared</li>
            <li>Providers you add can see your complete medical history</li>
            <li>Sensitive information (mental health, substance abuse, HIV status, etc.) will be visible to all providers you authorize</li>
            <li>While the Platform is secure, no electronic system is 100% secure</li>
          </ul>

          <h3>7.5 Managing Your Authorizations</h3>
          <p>You may:</p>
          <ul>
            <li>Remove providers from your care team at any time (though they may retain records they previously accessed)</li>
            <li>Add new providers at any time</li>
            <li>Request restrictions (though providers may need full information to treat you safely)</li>
          </ul>
          <p>To manage your authorizations, use the Platform's settings or contact support.</p>

          <h3>7.6 Duration of Authorization</h3>
          <p>This authorization for information sharing:</p>
          <ul>
            <li>Begins when you create your account</li>
            <li>Continues for as long as you use the Platform</li>
            <li>Applies to all providers you add to your care team</li>
            <li>Does not expire unless you revoke it</li>
          </ul>

          <h3>7.7 Right to Revoke</h3>
          <p>You may revoke this authorization at any time by:</p>
          <ul>
            <li>Closing your account</li>
            <li>Removing specific providers from your care team</li>
            <li>Contacting us in writing</li>
          </ul>
          <p>Revocation does not affect information already shared before revocation.</p>

          <h2>8. Consent for Electronic Communications</h2>

          <h3>8.1 Automatic Consent to Communications</h3>
          <p>By using the Platform, you automatically consent to receive electronic communications, including:</p>
          <ul>
            <li>Email messages</li>
            <li>Text messages (SMS) if you provide your phone number</li>
            <li>Push notifications through the app</li>
            <li>In-app messages</li>
            <li>Phone calls from your providers or Company</li>
          </ul>

          <h3>8.2 Types of Communications</h3>
          <p>You consent to receiving:</p>
          <ul>
            <li>Medical information from your providers</li>
            <li>Appointment reminders</li>
            <li>Medication reminders</li>
            <li>Lab results and health alerts</li>
            <li>Account and security notifications</li>
            <li>Billing and payment information</li>
            <li>Updates to Terms and Privacy Policy</li>
            <li>Service announcements</li>
            <li>Technical support communications</li>
          </ul>

          <h3>8.3 Understanding Electronic Communication Risks</h3>
          <p>By using the Platform, you acknowledge:</p>
          <ul>
            <li>Electronic communications are not 100% secure</li>
            <li>Messages could be intercepted or misdirected</li>
            <li>You should not send sensitive information via text message</li>
            <li>You should use secure Platform messaging for health information</li>
            <li>You are responsible for protecting your devices and accounts</li>
          </ul>

          <h3>8.4 Managing Communication Preferences</h3>
          <p>You may adjust communication preferences in Platform settings, but you cannot opt out of:</p>
          <ul>
            <li>Essential account and security notifications</li>
            <li>Transactional communications from your providers</li>
            <li>Legal and regulatory required notices</li>
          </ul>

          <h2>9. Financial Responsibility</h2>

          <h3>9.1 Payment Obligations - Automatic Agreement</h3>
          <p>By using the Platform, you agree that:</p>
          <ul>
            <li>You are responsible for any Platform fees (subscription, per-use, etc.)</li>
            <li>You are responsible for paying your healthcare providers for their services</li>
            <li>The Platform may facilitate payment but does not control provider fees</li>
            <li>You will keep payment information current</li>
            <li>You authorize charges to your payment method on file</li>
            <li>Unpaid fees may result in account suspension or collection actions</li>
          </ul>

          <h3>9.2 Insurance</h3>
          <p>You understand that:</p>
          <ul>
            <li>The Platform may or may not be covered by your health insurance</li>
            <li>You should verify coverage with your insurance company</li>
            <li>You are responsible for any amounts not covered by insurance</li>
            <li>You must provide accurate insurance information to your providers</li>
            <li>Insurance coverage is between you and your insurance company</li>
          </ul>

          <h3>9.3 Refund Policy</h3>
          <p>Refunds, if any, are subject to Company's refund policy and are at Company's discretion.</p>

          <h2>10. Minors and Parental Consent</h2>

          <h3>10.1 If You Are Creating an Account for a Minor</h3>
          <p>By creating an account for a minor (under age 18), you represent that:</p>
          <ul>
            <li>You are the parent or legal guardian of the minor</li>
            <li>You have authority to consent to healthcare for the minor</li>
            <li>You consent to all terms on behalf of the minor</li>
            <li>You will supervise the minor's use of the Platform</li>
            <li>You understand that you are responsible for the minor's account</li>
          </ul>

          <h3>10.2 Minor's Rights</h3>
          <p>In some jurisdictions, minors have the right to consent to certain healthcare services without parental consent. If applicable:</p>
          <ul>
            <li>The minor may control access to that specific health information</li>
            <li>Parents may not have access to information the minor has the right to keep confidential</li>
            <li>The Platform will comply with applicable laws regarding minor consent</li>
          </ul>

          <h3>10.3 Transition to Adult Account</h3>
          <p>When a minor turns 18:</p>
          <ul>
            <li>The account automatically becomes an adult account</li>
            <li>The minor (now adult) has full control</li>
            <li>Parent/guardian access may be terminated unless the adult authorizes continued access</li>
          </ul>

          <h2>11. Research and Quality Improvement</h2>

          <h3>11.1 De-identified Data Use - Automatic Consent</h3>
          <p>By using the Platform, you consent to Company's use of de-identified data (data that cannot identify you) for:</p>
          <ul>
            <li>Research purposes</li>
            <li>Quality improvement</li>
            <li>Platform development</li>
            <li>Healthcare analytics</li>
            <li>Public health purposes</li>
            <li>Academic or scientific publications</li>
          </ul>
          <p>De-identified data is no longer considered your personal health information and is not protected by HIPAA.</p>

          <h3>11.2 Participation in Research Studies</h3>
          <p>Company may offer optional research studies. Participation is always voluntary and requires separate, specific consent.</p>

          <h2>12. Account Termination</h2>

          <h3>12.1 Your Right to Close Your Account</h3>
          <p>You may close your account at any time by:</p>
          <ul>
            <li>Using the account closure feature in Platform settings</li>
            <li>Contacting support</li>
            <li>Sending written notice</li>
          </ul>

          <h3>12.2 Effect of Account Closure - Acknowledgment</h3>
          <p>By closing your account, you acknowledge:</p>
          <ul>
            <li>You will lose access to the Platform</li>
            <li>Your providers may retain medical records as required by law</li>
            <li>Company may retain certain information as required by law</li>
            <li>Closed accounts cannot always be reopened</li>
            <li>You remain responsible for any unpaid fees</li>
            <li>Your providers will need to arrange alternative methods for communication</li>
          </ul>

          <h3>12.3 Company's Right to Terminate - Acceptance</h3>
          <p>By using the Platform, you accept that Company may suspend or terminate your account if:</p>
          <ul>
            <li>You violate these terms</li>
            <li>You provide false information</li>
            <li>You engage in abusive behavior</li>
            <li>You fail to pay required fees</li>
            <li>Required by law or regulation</li>
            <li>The Platform is discontinued</li>
          </ul>

          <h2>13. Limitation of Liability - Mandatory Acknowledgment</h2>
          <p><strong>BY USING THE PLATFORM, YOU ACKNOWLEDGE AND ACCEPT THAT:</strong></p>
          <ul>
            <li><strong>SMARTIFY SOLUTIONS IS NOT LIABLE FOR YOUR HEALTHCARE PROVIDER'S MEDICAL DECISIONS OR CARE</strong></li>
            <li><strong>SMARTIFY SOLUTIONS IS NOT LIABLE FOR ANY MEDICAL MALPRACTICE</strong></li>
            <li><strong>THE PLATFORM IS PROVIDED "AS IS" WITHOUT ANY WARRANTIES</strong></li>
            <li><strong>SMARTIFY SOLUTIONS'S LIABILITY IS LIMITED TO THE MAXIMUM EXTENT PERMITTED BY LAW</strong></li>
            <li><strong>YOU USE THE PLATFORM AT YOUR OWN RISK</strong></li>
          </ul>
          <p>See the Platform's Terms and Conditions for complete limitation of liability provisions.</p>

          <h2>14. Dispute Resolution - Binding Arbitration</h2>

          <h3>14.1 Automatic Agreement to Arbitrate</h3>
          <p>By using the Platform, you automatically agree that:</p>
          <ul>
            <li>Any disputes will be resolved through binding arbitration</li>
            <li>You waive your right to go to court</li>
            <li>You waive your right to a jury trial</li>
            <li>You waive your right to participate in a class action</li>
            <li>Arbitration will be conducted under applicable arbitration rules</li>
            <li>The arbitrator's decision is final and binding</li>
          </ul>

          <h3>14.2 Opt-Out Right</h3>
          <p>You have 30 days from account creation to opt out of arbitration by sending written notice. If you opt out, disputes will be resolved in court.</p>

          <h2>15. Changes to This Patient Consent</h2>

          <h3>15.1 Right to Modify - Acceptance by Continued Use</h3>
          <p>Company may modify this Patient Consent at any time. Notice will be provided by:</p>
          <ul>
            <li>Email notification</li>
            <li>Posted notice on the Platform</li>
            <li>In-app notification</li>
          </ul>
          <p>
            <strong>Your continued use of the Platform after changes take effect constitutes automatic acceptance of the modified Patient Consent.</strong>
          </p>
          <p>If you do not agree to changes, you must stop using the Platform and close your account before the changes take effect.</p>

          <h2>16. Questions and Concerns</h2>
          <p>For questions about this Patient Consent, contact:</p>
          <p>
            <strong>Smartify Solutions</strong><br />
            Email: support@miri360.com
          </p>
          <p>For privacy questions, contact our Privacy Officer.</p>

          <h2>17. Your Acknowledgment and Acceptance</h2>
          <p><strong>BY CREATING AN ACCOUNT, CLICKING "I ACCEPT," OR BY USING THE PLATFORM IN ANY WAY, YOU ACKNOWLEDGE AND ACCEPT THAT:</strong></p>
          <ul>
            <li>✓ You have read and understand this entire Patient Consent</li>
            <li>✓ You agree to be legally bound by all terms</li>
            <li>✓ You consent to treatment and communication via the Platform</li>
            <li>✓ You authorize sharing of your health information among your care team</li>
            <li>✓ You understand the Platform is not for emergencies</li>
            <li>✓ You understand the limitations of virtual care</li>
            <li>✓ You accept the risks of electronic communication</li>
            <li>✓ You authorize electronic communications</li>
            <li>✓ You consent to use of de-identified data</li>
            <li>✓ You agree to pay applicable fees</li>
            <li>✓ You accept the limitation of liability</li>
            <li>✓ You agree to binding arbitration (unless you opt out)</li>
            <li>✓ You understand Smartify Solutions does not provide medical care</li>
            <li>✓ Your healthcare providers are solely responsible for your medical treatment</li>
            <li>✓ You will not use the Platform for emergencies</li>
            <li>✓ Continued use constitutes ongoing consent</li>
          </ul>
          <p><strong>IF YOU DO NOT AGREE TO THIS PATIENT CONSENT, DO NOT CREATE AN ACCOUNT OR USE THE PLATFORM.</strong></p>

          <hr className="my-8" />

          <h2>HIPAA Notice of Privacy Practices</h2>
          <p>This Patient Consent incorporates by reference our Notice of Privacy Practices, which describes in detail:</p>
          <ul>
            <li>How we may use and disclose your health information</li>
            <li>Your rights regarding your health information</li>
            <li>Our legal duties regarding your health information</li>
            <li>How to file a complaint</li>
          </ul>
          <p>The complete Notice of Privacy Practices is provided to you when you create your account.</p>

          <hr className="my-8" />

          <h2>Special Notices</h2>

          <h3>For South African Residents</h3>
          <p>Your privacy rights under POPIA (Protection of Personal Information Act) apply. See our Privacy Policy for details.</p>

          <h3>For EU Residents</h3>
          <p>If you are in the European Economic Area, additional privacy rights under GDPR apply. See our Privacy Policy for details.</p>

          <h3>Telemedicine Consent</h3>
          <p>This Patient Consent serves as your informed consent for telemedicine services provided through the Platform by your healthcare providers.</p>

          <h3>Medical Records</h3>
          <p>Your healthcare providers are responsible for maintaining complete medical records of your care. The Platform facilitates record-keeping but providers remain responsible for compliance with medical record requirements.</p>

          <hr className="my-8" />

          <p className="text-muted-foreground">
            Your continued use of the Platform constitutes ongoing acceptance of this Patient Consent as it may be modified from time to time.
          </p>
        </div>
      </div>
    </div>
  );
}