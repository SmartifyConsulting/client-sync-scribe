import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";

const BusinessAssociateAgreement = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-4xl mx-auto px-4 py-8">
        <Button
          variant="ghost"
          onClick={() => navigate("/")}
          className="mb-6"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back
        </Button>

        <div className="prose prose-sm max-w-none dark:prose-invert">
          <h1 className="text-3xl font-bold text-foreground mb-2">Business Associate Agreement (HIPAA)</h1>
          <p className="text-muted-foreground mb-8"><strong>Last Updated: December 2024</strong></p>

          <div className="bg-primary/10 border border-primary/20 rounded-lg p-4 mb-8">
            <h2 className="text-lg font-semibold text-primary mt-0">AUTOMATIC ACCEPTANCE BY USE</h2>
            <p className="mb-0"><strong>IF YOU ARE A HEALTHCARE PROVIDER WHO IS A HIPAA COVERED ENTITY, BY CREATING A PROVIDER ACCOUNT OR USING THE PLATFORM TO ACCESS PROTECTED HEALTH INFORMATION, YOU AUTOMATICALLY ACCEPT AND AGREE TO THIS BUSINESS ASSOCIATE AGREEMENT.</strong></p>
          </div>

          <p>This Business Associate Agreement ("BAA") is automatically formed between Smartify Solutions ("Business Associate") and any healthcare provider who is a HIPAA Covered Entity ("Covered Entity") when such Covered Entity creates an account or uses the Platform.</p>

          <h2>Recitals and Background</h2>
          <p>By using the Platform as a HIPAA Covered Entity, you acknowledge that:</p>
          <ul>
            <li>You are a healthcare provider or covered entity as defined under the Health Insurance Portability and Accountability Act of 1996 ("HIPAA") and its implementing regulations</li>
            <li>Business Associate provides technology services through the mIRI360 platform that involve the creation, receipt, maintenance, or transmission of Protected Health Information ("PHI") on your behalf</li>
            <li>HIPAA requires a Business Associate Agreement between Covered Entities and Business Associates</li>
            <li>Your use of the Platform constitutes your acceptance of this BAA</li>
            <li>This BAA satisfies the requirements of HIPAA, the Health Information Technology for Economic and Clinical Health Act ("HITECH Act"), and their implementing regulations, including the Privacy, Security, and Breach Notification Rules (collectively, the "HIPAA Rules")</li>
          </ul>

          <h2>1. Definitions</h2>
          <p>Terms used but not otherwise defined in this BAA have the meanings established under the HIPAA Rules at 45 CFR Parts 160 and 164.</p>
          <p><strong>"Breach"</strong> means the acquisition, access, use, or disclosure of PHI in a manner not permitted under the Privacy Rule that compromises the security or privacy of the PHI.</p>
          <p><strong>"Protected Health Information" or "PHI"</strong> means information that relates to: (i) the past, present, or future physical or mental health or condition of an individual; (ii) the provision of health care to an individual; or (iii) the past, present, or future payment for the provision of health care to an individual, and that identifies the individual or for which there is a reasonable basis to believe can be used to identify the individual.</p>
          <p><strong>"Security Incident"</strong> means the attempted or successful unauthorized access, use, disclosure, modification, or destruction of information or interference with system operations in an information system.</p>
          <p><strong>"Unsecured PHI"</strong> means PHI that is not secured through the use of a technology or methodology specified by the Secretary of HHS in guidance.</p>

          <h2>2. Obligations of Business Associate - Automatic Acceptance</h2>
          <p>By using the Platform to access PHI, Business Associate automatically agrees and commits to the following:</p>

          <h3>2.1 Permitted Uses and Disclosures</h3>
          <p>Business Associate will use or disclose PHI only as permitted by this BAA or as required by law. Business Associate will not use or disclose PHI in any manner that would violate the HIPAA Rules if done by Covered Entity, except as provided in Section 2.2.</p>

          <h3>2.2 Specific Use and Disclosure Provisions</h3>
          <p>Business Associate may:</p>
          <p>a) Use PHI for the proper management and administration of Business Associate or to carry out the legal responsibilities of Business Associate;</p>
          <p>b) Disclose PHI for the proper management and administration of Business Associate, provided that:</p>
          <ul>
            <li>The disclosure is required by law; or</li>
            <li>Business Associate obtains reasonable assurances from the person to whom the information is disclosed that it will remain confidential and be used or further disclosed only as required by law or for the purpose for which it was disclosed, and the person notifies Business Associate of any instances of which it is aware in which the confidentiality of the information has been breached;</li>
          </ul>
          <p>c) Use PHI to provide Data Aggregation services to Covered Entity as permitted by 45 CFR § 164.504(e)(2)(i)(B);</p>
          <p>d) De-identify any and all PHI in accordance with 45 CFR § 164.514(a)-(c), provided that de-identified information is no longer subject to this BAA.</p>

          <h3>2.3 Safeguards - Automatic Implementation</h3>
          <p>By providing the Platform, Business Associate automatically commits to implement and maintain appropriate administrative, physical, and technical safeguards to prevent use or disclosure of PHI other than as provided for by this BAA, and to comply with the Security Rule at 45 CFR Part 164, Subpart C, including:</p>
          <ul>
            <li>Encryption of PHI in transit and at rest</li>
            <li>Access controls and authentication measures</li>
            <li>Audit logging and monitoring</li>
            <li>Incident response procedures</li>
            <li>Regular security assessments</li>
            <li>Employee training</li>
            <li>Physical security measures</li>
            <li>Business continuity and disaster recovery plans</li>
          </ul>

          <h3>2.4 Breach Notification - Automatic Obligation</h3>
          <p>By using the Platform, Business Associate commits to report to Covered Entity:</p>
          <p>a) Any use or disclosure of PHI not provided for by this BAA of which Business Associate becomes aware, including breaches of unsecured PHI as required by 45 CFR § 164.410, <strong>without unreasonable delay and in no case later than ten (10) calendar days after discovery</strong>;</p>
          <p>b) Any Security Incident of which Business Associate becomes aware that results or may result in unauthorized acquisition, access, use, or disclosure of PHI, without unreasonable delay;</p>
          <p>c) All information necessary for Covered Entity to fulfill its breach notification obligations under HIPAA.</p>
          <p>Discovery of a Breach or Security Incident is deemed to have occurred as of the first day on which the Breach or Security Incident is known or reasonably should have been known to Business Associate or any employee, officer, or agent of Business Associate.</p>
          <p><strong>Covered Entity acknowledges</strong> that this section constitutes notice and acknowledgment that general, unsuccessful Security Incidents such as pings, port scans, unsuccessful login attempts, denial of service attacks, and similar incidents occur regularly and Business Associate has implemented measures to address such incidents. Business Associate is not required to report such unsuccessful Security Incidents.</p>

          <h3>2.5 Subcontractors - Automatic Requirements</h3>
          <p>Business Associate will ensure that any subcontractors that create, receive, maintain, or transmit PHI on behalf of Business Associate agree in writing to the same restrictions and conditions that apply to Business Associate with respect to such PHI and implement reasonable and appropriate safeguards to protect such PHI.</p>
          <p>By using the Platform, Covered Entity consents to Business Associate's use of subcontractors, provided they comply with HIPAA requirements.</p>

          <h3>2.6 Access to PHI - Automatic Rights</h3>
          <p>By using the Platform, Covered Entity retains the right to access PHI in a Designated Record Set. Business Associate will provide access to PHI in a Designated Record Set to Covered Entity or, as directed by Covered Entity, to an Individual to meet the requirements under 45 CFR § 164.524, within ten (10) business days of a request.</p>
          <p>Covered Entity may access their patients' PHI directly through the Platform at any time.</p>

          <h3>2.7 Amendment of PHI - Automatic Capability</h3>
          <p>Business Associate will make any amendments to PHI in a Designated Record Set that Covered Entity directs or agrees to pursuant to 45 CFR § 164.526 within ten (10) business days of the request.</p>
          <p>Covered Entity may amend PHI directly through the Platform at any time.</p>

          <h3>2.8 Accounting of Disclosures - Automatic Records</h3>
          <p>Business Associate will document disclosures of PHI and information related to such disclosures as would be required for Covered Entity to respond to a request by an Individual for an accounting of disclosures in accordance with 45 CFR § 164.528.</p>
          <p>Business Associate will provide to Covered Entity or an Individual, within ten (10) business days of a request, information collected to permit Covered Entity to respond to such accounting request. Covered Entity may access disclosure logs directly through the Platform.</p>

          <h3>2.9 Government Access - Automatic Availability</h3>
          <p>Business Associate will make its internal practices, books, and records relating to the use and disclosure of PHI received from, or created or received by Business Associate on behalf of, Covered Entity available to the Secretary of HHS for purposes of determining compliance with the HIPAA Rules.</p>

          <h3>2.10 Minimum Necessary - Automatic Compliance</h3>
          <p>Business Associate will request, use, and disclose only the minimum amount of PHI necessary to accomplish the intended purpose of such use, disclosure, or request, in accordance with the Minimum Necessary requirements at 45 CFR § 164.502(b) and § 164.514(d).</p>

          <h2>3. Obligations of Covered Entity - Automatic by Use</h2>
          <p>By using the Platform, Covered Entity automatically:</p>

          <h3>3.1 Authorizes Uses and Disclosures</h3>
          <p>Authorizes Business Associate to use and disclose PHI as necessary to provide the Platform services and as described in this BAA.</p>

          <h3>3.2 Provides Notice of Privacy Practices</h3>
          <p>Agrees to provide Business Associate with a copy of Covered Entity's Notice of Privacy Practices, as well as any changes to such notice, if requested by Business Associate.</p>

          <h3>3.3 Informs of Permission Changes</h3>
          <p>Agrees to notify Business Associate of any changes in, or revocation of, permission by an Individual to use or disclose PHI, to the extent that such changes may affect Business Associate's use or disclosure of PHI.</p>

          <h3>3.4 Informs of Restrictions</h3>
          <p>Agrees to notify Business Associate of any restriction to the use or disclosure of PHI that Covered Entity has agreed to in accordance with 45 CFR § 164.522, to the extent that such restriction may affect Business Associate's use or disclosure of PHI.</p>

          <h3>3.5 Makes Permissible Requests Only</h3>
          <p>Agrees not to request Business Associate to use or disclose PHI in any manner that would not be permissible under the HIPAA Rules if done by Covered Entity.</p>

          <h3>3.6 Ensures Compliance</h3>
          <p>Remains responsible for compliance with all HIPAA requirements applicable to Covered Entities and for the actions of Covered Entity's workforce members.</p>

          <h2>4. Term and Termination</h2>

          <h3>4.1 Term - Automatic Commencement</h3>
          <p>This BAA commences automatically when Covered Entity first uses the Platform to access or transmit PHI and continues until all PHI provided by Covered Entity to Business Associate, or created or received by Business Associate on behalf of Covered Entity, is destroyed or returned to Covered Entity, or, if it is not feasible to return or destroy PHI, protections are extended to such information.</p>

          <h3>4.2 Termination for Cause - Automatic Rights</h3>
          <p>Upon Covered Entity's knowledge of a material breach by Business Associate, Covered Entity may:</p>
          <p>a) Provide an opportunity for Business Associate to cure the breach or end the violation and terminate this BAA if Business Associate does not cure the breach or end the violation within the time specified by Covered Entity;</p>
          <p>b) Immediately terminate this BAA if Business Associate has breached a material term of this BAA and cure is not possible; or</p>
          <p>c) If neither termination nor cure is feasible, report the violation to the Secretary of HHS.</p>
          <p>Business Associate may terminate this BAA with 30 days' written notice if Covered Entity materially breaches this BAA.</p>

          <h3>4.3 Effect of Termination - Automatic Obligations</h3>
          <p>Upon termination of this BAA for any reason:</p>
          <p><strong>Business Associate shall:</strong></p>
          <p>a) Retain only that PHI which is necessary for Business Associate to continue its proper management and administration or to carry out its legal responsibilities;</p>
          <p>b) Return to Covered Entity or, if agreed to by Covered Entity in writing, destroy the remaining PHI that Business Associate maintains in any form within 30 days of termination;</p>
          <p>c) Continue to use appropriate safeguards and comply with Subpart C of 45 CFR Part 164 with respect to electronic PHI to prevent use or disclosure of the PHI, other than as provided for in this Section, for as long as Business Associate retains the PHI;</p>
          <p>d) Not use or disclose the PHI retained by Business Associate other than for the purposes for which such PHI was retained and subject to the same conditions that applied prior to termination;</p>
          <p>e) Return to Covered Entity or destroy the PHI retained by Business Associate when it is no longer needed by Business Associate for its proper management and administration or to carry out its legal responsibilities.</p>
          <p><strong>Covered Entity acknowledges</strong> that in the event of termination, Covered Entity is responsible for:</p>
          <ul>
            <li>Retrieving all patient PHI through the Platform export function</li>
            <li>Ensuring continuity of care for patients</li>
            <li>Maintaining medical records as required by law</li>
            <li>Notifying patients of alternative communication methods</li>
          </ul>

          <h3>4.4 Infeasibility of Return or Destruction</h3>
          <p>If Business Associate determines that returning or destroying PHI is infeasible, Business Associate will:</p>
          <ul>
            <li>Notify Covered Entity in writing of the conditions that make return or destruction infeasible</li>
            <li>Extend the protections of this BAA to such PHI</li>
            <li>Limit further uses and disclosures to those purposes that make return or destruction infeasible</li>
            <li>Retain such PHI only for so long as necessary for such purposes</li>
          </ul>

          <h3>4.5 Survival</h3>
          <p>The obligations of Business Associate under this Section 4.3 shall survive the termination of this BAA and Covered Entity's use of the Platform.</p>

          <h2>5. Indemnification - Automatic Agreement</h2>

          <h3>5.1 Business Associate Indemnification</h3>
          <p>Business Associate agrees to indemnify, defend, and hold harmless Covered Entity from and against any claims, liabilities, damages, losses, costs, and expenses (including reasonable attorneys' fees) arising out of or related to:</p>
          <ul>
            <li>Business Associate's breach of this BAA</li>
            <li>Business Associate's violation of the HIPAA Rules</li>
            <li>Business Associate's unauthorized use or disclosure of PHI</li>
            <li>Breaches of PHI caused by Business Associate's failure to implement adequate safeguards</li>
          </ul>
          <p><strong>EXCEPTION:</strong> This indemnification does not apply to claims arising from:</p>
          <ul>
            <li>Covered Entity's breach of this BAA</li>
            <li>Covered Entity's violation of HIPAA Rules</li>
            <li>Covered Entity's unauthorized instructions to Business Associate</li>
            <li>Acts or omissions of Covered Entity's workforce</li>
          </ul>

          <h3>5.2 Covered Entity Indemnification</h3>
          <p>Covered Entity agrees to indemnify Business Associate from claims arising solely from:</p>
          <ul>
            <li>Covered Entity's breach of this BAA</li>
            <li>Covered Entity's violation of HIPAA requirements</li>
            <li>Covered Entity's provision of false or misleading information</li>
            <li>Covered Entity's unauthorized instructions</li>
          </ul>

          <h2>6. Limitation of Liability - Acceptance by Use</h2>
          <p>By using the Platform, both parties accept that:</p>
          <p><strong>For Business Associate:</strong></p>
          <ul>
            <li>Business Associate's liability under this BAA is limited as specified in the Platform's Terms and Conditions</li>
            <li>EXCEPT that limitations do not apply to: (i) obligations specific to Business Associate under HIPAA Rules; (ii) breaches of security or confidentiality of PHI; (iii) indemnification obligations under this BAA; or (iv) gross negligence or willful misconduct</li>
          </ul>
          <p><strong>For Covered Entity:</strong></p>
          <ul>
            <li>Covered Entity's liability under this BAA is limited to direct damages caused by Covered Entity's breach</li>
            <li>EXCEPT for Covered Entity's indemnification obligations</li>
          </ul>

          <h2>7. Miscellaneous Provisions</h2>

          <h3>7.1 Regulatory References - Automatic Updates</h3>
          <p>A reference in this BAA to a section in the HIPAA Rules means the section as in effect or as amended. This BAA automatically incorporates future amendments to HIPAA Rules.</p>

          <h3>7.2 Amendment - Automatic as Needed</h3>
          <p>By using the Platform, both parties agree to take such action as is necessary to amend this BAA from time to time as is necessary for compliance with the requirements of the HIPAA Rules and any other applicable law.</p>
          <p>Business Associate may amend this BAA upon 30 days' notice to comply with legal requirements. Covered Entity's continued use constitutes acceptance of amendments.</p>

          <h3>7.3 Interpretation</h3>
          <p>Any ambiguity in this BAA shall be resolved in favor of a meaning that permits Covered Entity to comply with the HIPAA Rules.</p>

          <h3>7.4 No Third-Party Beneficiaries</h3>
          <p>Nothing express or implied in this BAA is intended to confer, nor shall anything herein confer, upon any person other than the parties and their respective successors or assigns, any rights, remedies, obligations, or liabilities whatsoever.</p>

          <h3>7.5 Notices - Automatic Delivery</h3>
          <p>All notices required or permitted under this BAA shall be delivered electronically to:</p>
          <p><strong>For Covered Entity:</strong><br />The email address associated with the Covered Entity's Platform account</p>
          <p><strong>For Business Associate:</strong><br />support@smartifysolutions.com</p>
          <p>Covered Entity must keep their contact information current. Notices are deemed received when sent.</p>

          <h3>7.6 Governing Law</h3>
          <p>This BAA shall be governed by and construed in accordance with applicable federal law, including HIPAA, and the laws of the applicable state, without regard to its conflict of law provisions, except to the extent preempted by federal law.</p>

          <h3>7.7 Entire Agreement</h3>
          <p>This BAA, together with the Platform's Terms and Conditions, Healthcare Provider Agreement, and Privacy Policy, constitutes the entire agreement between the parties with respect to Business Associate's handling of PHI and supersedes all prior agreements and understandings relating to such subject matter.</p>

          <h3>7.8 Severability</h3>
          <p>If any provision of this BAA is held to be invalid or unenforceable, the remaining provisions shall continue in full force and effect. Invalid provisions will be modified to the minimum extent necessary to make them enforceable while preserving HIPAA compliance.</p>

          <h3>7.9 Survival of Obligations</h3>
          <p>Obligations that by their nature should survive termination (including confidentiality, security, return/destruction of PHI, and indemnification) shall survive termination of this BAA.</p>

          <h3>7.10 Relationship to Other Agreements</h3>
          <p>This BAA supplements the Platform's Terms and Conditions and Healthcare Provider Agreement. In the event of conflict, this BAA controls with respect to PHI handling and HIPAA compliance.</p>

          <h3>7.11 Counterparts and Electronic Acceptance</h3>
          <p>This BAA may be accepted electronically. Covered Entity's creation of a provider account and use of the Platform to access PHI constitutes electronic acceptance and creates a binding agreement equivalent to a signed written agreement.</p>

          <h2>8. Breach Notification Procedures</h2>

          <h3>8.1 Business Associate's Notification to Covered Entity</h3>
          <p>In the event of a Breach of Unsecured PHI, Business Associate will:</p>
          <ol>
            <li><strong>Within 10 calendar days of discovery</strong>, notify Covered Entity via email and phone</li>
            <li>Provide the following information (to the extent known):
              <ul>
                <li>Identification of each individual whose PHI was or is reasonably believed to have been breached</li>
                <li>Description of the Breach, including date and circumstances</li>
                <li>Types of PHI involved</li>
                <li>Actions taken to mitigate harm</li>
                <li>Actions taken to prevent future breaches</li>
                <li>Contact information for individuals to ask questions</li>
              </ul>
            </li>
            <li>Provide ongoing updates as investigation continues</li>
            <li>Cooperate fully with Covered Entity's response efforts</li>
            <li>Document all breach-related activities</li>
          </ol>

          <h3>8.2 Covered Entity's Responsibilities</h3>
          <p>By using the Platform, Covered Entity acknowledges that:</p>
          <ul>
            <li>Covered Entity is responsible for determining whether notification to individuals is required</li>
            <li>Covered Entity is responsible for notifying individuals of breaches (unless Business Associate agrees to do so)</li>
            <li>Covered Entity is responsible for notifying HHS and potentially media as required by HIPAA</li>
            <li>Covered Entity should review its breach notification procedures</li>
          </ul>

          <h3>8.3 Business Associate's Assistance</h3>
          <p>Business Associate will provide reasonable assistance to Covered Entity in fulfilling Covered Entity's breach notification obligations.</p>

          <h2>9. Security Measures</h2>

          <h3>9.1 Current Security Measures - Automatic Implementation</h3>
          <p>By providing the Platform, Business Associate represents that it has implemented the following security measures:</p>
          <p><strong>Administrative Safeguards:</strong></p>
          <ul>
            <li>Security management process with risk analysis and risk management</li>
            <li>Security personnel designated</li>
            <li>Workforce security training and management</li>
            <li>Access authorization and establishment procedures</li>
            <li>Security incident procedures</li>
            <li>Contingency planning including disaster recovery</li>
            <li>Periodic security evaluations</li>
          </ul>
          <p><strong>Physical Safeguards:</strong></p>
          <ul>
            <li>Facility access controls</li>
            <li>Workstation and device security policies</li>
            <li>Secure data center facilities with restricted access</li>
            <li>Environmental controls and monitoring</li>
          </ul>
          <p><strong>Technical Safeguards:</strong></p>
          <ul>
            <li>Unique user identification and authentication</li>
            <li>Encryption of PHI in transit (TLS 1.2 or higher)</li>
            <li>Encryption of PHI at rest (AES-256 or equivalent)</li>
            <li>Access controls and authorization checks</li>
            <li>Audit logging and monitoring</li>
            <li>Automatic log-off after inactivity</li>
            <li>Data backup and recovery procedures</li>
            <li>Integrity controls to prevent improper alteration</li>
          </ul>

          <h3>9.2 Ongoing Security Obligations</h3>
          <p>Business Associate commits to:</p>
          <ul>
            <li>Maintain security measures at least at the level described above</li>
            <li>Update security measures as technology and threats evolve</li>
            <li>Conduct annual security risk assessments</li>
            <li>Promptly address identified vulnerabilities</li>
            <li>Maintain security incident response procedures</li>
            <li>Provide security training to workforce members</li>
            <li>Monitor for security incidents continuously</li>
          </ul>

          <h3>9.3 Security Audits</h3>
          <p>Business Associate will:</p>
          <ul>
            <li>Conduct regular internal security audits</li>
            <li>Engage third-party security auditors periodically</li>
            <li>Provide summary security assessment reports to Covered Entity upon request (subject to confidentiality)</li>
          </ul>

          <h2>10. Acknowledgment and Acceptance</h2>
          <div className="bg-muted/50 border border-border rounded-lg p-4 my-6">
            <p><strong>IF YOU ARE A HEALTHCARE PROVIDER WHO IS A HIPAA COVERED ENTITY, BY CREATING A PROVIDER ACCOUNT OR USING THE PLATFORM TO ACCESS PROTECTED HEALTH INFORMATION, YOU ACKNOWLEDGE AND ACCEPT THAT:</strong></p>
            <ul>
              <li>✓ You are a HIPAA Covered Entity</li>
              <li>✓ This Business Associate Agreement is now in effect</li>
              <li>✓ You have read and understand all terms of this BAA</li>
              <li>✓ You agree to comply with your obligations as Covered Entity</li>
              <li>✓ You authorize Business Associate to use and disclose PHI as described</li>
              <li>✓ You accept Business Associate's security measures</li>
              <li>✓ You will notify Business Associate of permission changes and restrictions</li>
              <li>✓ You remain responsible for HIPAA compliance</li>
              <li>✓ You accept the breach notification procedures</li>
              <li>✓ You agree to the limitation of liability provisions</li>
              <li>✓ This BAA satisfies HIPAA's requirement for a written Business Associate Agreement</li>
              <li>✓ Your continued use constitutes ongoing acceptance of this BAA</li>
            </ul>
            <p className="mb-0"><strong>IF YOU ARE NOT A HIPAA COVERED ENTITY, THIS BAA DOES NOT APPLY TO YOU</strong> (though you remain subject to the Platform's Terms and Conditions and Healthcare Provider Agreement).</p>
          </div>

          <hr className="my-8" />

          <p><strong>Last Updated: December 2024</strong></p>
          <p>This Business Associate Agreement is automatically in effect when you use the Platform as a HIPAA Covered Entity and remains in effect until properly terminated. Your continued use constitutes ongoing acceptance of this BAA as it may be modified from time to time to ensure HIPAA compliance.</p>

          <hr className="my-8" />

          <p><strong>For questions about this Business Associate Agreement:</strong></p>
          <p>
            Business Associate Privacy Officer:<br />
            Smartify Solutions<br />
            Email: privacy@smartifysolutions.com
          </p>
        </div>
      </div>
    </div>
  );
};

export default BusinessAssociateAgreement;
