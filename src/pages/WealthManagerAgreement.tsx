import { LegalDocLayout } from "@/components/legal/LegalDocLayout";

export default function WealthManagerAgreement() {
  return (
    <LegalDocLayout
      title="Wealth Manager Operator Agreement"
      subtitle="Data processing terms between Holarc Wealth and Wealth Managers using the Platform"
    >
      <>
        <div className="bg-primary/10 border border-primary/20 rounded-lg p-4 mb-8">
          <h2 className="text-lg font-semibold text-primary mt-0">ACCEPTANCE BY USE</h2>
          <p className="mb-0">
            <strong>
              IF YOU ARE A WEALTH MANAGER, BY CREATING A WEALTH MANAGER ACCOUNT OR USING THE PLATFORM TO ACCESS
              CLIENT PERSONAL INFORMATION, YOU ACCEPT AND AGREE TO THIS WEALTH MANAGER OPERATOR AGREEMENT.
            </strong>
          </p>
        </div>

        <p>
          This Wealth Manager Operator Agreement ("Agreement") is formed between Holarc Wealth (Pty) Ltd
          ("Operator") and any Wealth Manager who creates an account or uses the Platform to process client
          personal information on their own behalf as a "Responsible Party" under the Protection of Personal
          Information Act, 2013 ("POPIA").

        </p>

        <h2>Background</h2>
        <p>By using the Platform as a Wealth Manager, you acknowledge that:</p>
        <ul>
          <li>You are a financial services provider, representative, or firm providing wealth-management services to clients</li>
          <li>Operator provides technology services through the Holarc Wealth platform that involve the creation, receipt, storage, or transmission of your clients' personal information on your behalf</li>
          <li>POPIA requires a written agreement between a Responsible Party and an Operator that processes personal information on its behalf</li>
          <li>Your use of the Platform constitutes your acceptance of this Agreement</li>
        </ul>

        <h2>1. Definitions</h2>
        <p>Terms used but not otherwise defined in this Agreement have the meanings given in POPIA.</p>
        <p>
          <strong>"Personal Information"</strong> means information relating to an identifiable, living natural
          person (or existing juristic person), including financial information, as defined in POPIA.
        </p>
        <p>
          <strong>"Security Compromise"</strong> means the unauthorised acquisition, access, use, or disclosure of
          Personal Information.
        </p>
        <p>
          <strong>"Responsible Party"</strong> means the Wealth Manager, who determines the purpose and means of
          processing their clients' Personal Information. <strong>"Operator"</strong> means Holarc Wealth, which
          processes Personal Information on the Wealth Manager's behalf.
        </p>

        <h2>2. Obligations of Operator</h2>
        <h3>2.1 Processing Only on Instruction</h3>
        <p>
          Operator will process Personal Information only to provide the Platform's services to the Wealth
          Manager and their clients, and not for any other purpose, except as required by law.
        </p>

        <h3>2.2 Security Safeguards</h3>
        <p>
          Operator will implement and maintain appropriate technical and organisational security measures to
          prevent loss, damage, or unauthorised access to Personal Information, including:
        </p>
        <ul>
          <li>Encryption of data in transit and at rest</li>
          <li>Access controls and authentication measures</li>
          <li>Audit logging and monitoring</li>
          <li>Incident response procedures</li>
          <li>Regular security assessments</li>
        </ul>

        <h3>2.3 Security Compromise Notification</h3>
        <p>
          Operator will notify the Wealth Manager as soon as reasonably possible after becoming aware of a
          Security Compromise affecting their clients' Personal Information, and provide sufficient information
          to allow the Wealth Manager to meet any notification obligations under POPIA.
        </p>

        <h3>2.4 Sub-Operators</h3>
        <p>
          Operator will ensure that any sub-processors who handle Personal Information on its behalf are bound by
          written terms no less protective than this Agreement.
        </p>

        <h3>2.5 Deletion or Return</h3>
        <p>
          On termination of this Agreement, Operator will, at the Wealth Manager's direction, delete or return
          Personal Information it holds on the Wealth Manager's behalf, except to the extent retention is
          required by law.
        </p>

        <h2>3. Obligations of the Wealth Manager</h2>
        <p>As the Responsible Party, the Wealth Manager:</p>
        <ul>
          <li>Remains responsible for compliance with POPIA and FAIS in respect of their clients' information and advice</li>
          <li>Must have a lawful basis (such as client consent) for the collection and processing of client Personal Information</li>
          <li>Must inform Operator of any restriction on, or withdrawal of, a client's consent that affects processing on the Platform</li>
          <li>Must only use the Platform to request processing that is lawful under POPIA</li>
          <li>Remains responsible for the suitability of financial advice given to clients, in accordance with FAIS</li>
          <li>Must maintain records of advice as required by FAIS</li>
        </ul>

        <h2>4. Term and Termination</h2>
        <p>
          This Agreement commences when the Wealth Manager first uses the Platform to process client Personal
          Information and continues until the Wealth Manager's account is closed. Either party may terminate for
          material breach that is not cured within 30 days of written notice.
        </p>

        <h2>5. Effect of Termination</h2>
        <p>On termination, Operator will, within a reasonable period:</p>
        <ul>
          <li>Make exported client records available to the Wealth Manager</li>
          <li>Delete or de-identify Personal Information no longer required, except where retention is required by law</li>
        </ul>
        <p>The Wealth Manager remains responsible for notifying their clients of any change in how their information is managed following termination.</p>

        <h2>6. Indemnification</h2>
        <p>
          Each party indemnifies the other against claims, liabilities, and reasonable costs arising from that
          party's breach of this Agreement or of POPIA, to the extent caused by that party's acts or omissions.
        </p>

        <h2>7. Limitation of Liability</h2>
        <p>
          Each party's liability under this Agreement is limited as set out in the Platform's Terms and
          Conditions, except that limitations do not apply to breaches of confidentiality or security obligations,
          indemnification obligations, or gross negligence or wilful misconduct.
        </p>

        <h2>8. Security Measures</h2>
        <p><strong>Administrative:</strong> security management process, access authorisation procedures, incident response, periodic security evaluations, staff training.</p>
        <p><strong>Physical:</strong> secure data-centre facilities with restricted and monitored access.</p>
        <p>
          <strong>Technical:</strong> unique user identification, encryption in transit (TLS 1.2+) and at rest
          (AES-256 or equivalent), access controls, audit logging, automatic session timeout.
        </p>

        <h2>9. Miscellaneous</h2>
        <h3>9.1 Governing Law</h3>
        <p>This Agreement is governed by the laws of the Republic of South Africa, including POPIA.</p>
        <h3>9.2 Amendment</h3>
        <p>Operator may amend this Agreement on 30 days' notice to comply with legal requirements. Continued use after the effective date constitutes acceptance.</p>
        <h3>9.3 Entire Agreement</h3>
        <p>This Agreement, together with the Platform's Terms and Conditions and Privacy Policy, constitutes the entire agreement between the parties regarding the processing of client Personal Information.</p>
        <h3>9.4 Electronic Acceptance</h3>
        <p>Creating a Wealth Manager account and using the Platform to process client Personal Information constitutes electronic acceptance of this Agreement.</p>

        <h2>10. Acknowledgment and Acceptance</h2>
        <div className="bg-muted/50 border border-border rounded-lg p-4 my-6">
          <p>
            <strong>IF YOU ARE A WEALTH MANAGER, BY CREATING AN ACCOUNT OR USING THE PLATFORM TO ACCESS CLIENT
            PERSONAL INFORMATION, YOU ACKNOWLEDGE AND ACCEPT THAT:</strong>
          </p>
          <ul>
            <li>✓ You have read and understand this Agreement</li>
            <li>✓ This Agreement is now in effect between you and Holarc Wealth</li>
            <li>✓ You remain responsible for POPIA and FAIS compliance as the Responsible Party</li>
            <li>✓ You accept Operator's security measures and breach notification procedures</li>
            <li>✓ You agree to the limitation of liability provisions</li>
            <li>✓ Your continued use constitutes ongoing acceptance of this Agreement</li>
          </ul>
        </div>

        <hr className="my-8" />

        <p>
          For questions about this Agreement, contact:
          <br />
          <strong>Holarc Wealth (Pty) Ltd</strong> — Privacy Officer
          <br />
          Email: support@holarchealth.com
        </p>
      </>
    </LegalDocLayout>
  );
}
