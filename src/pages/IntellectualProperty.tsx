import { LegalDocLayout } from "@/components/legal/LegalDocLayout";

export default function IntellectualProperty() {
  const year = new Date().getFullYear();

  return (
    <LegalDocLayout
      title="Intellectual Property & Anti-Cloning Notice"
      subtitle="Ownership, trademark, and anti-cloning terms governing the Holarc platform."
    >
      <>
          <p className="text-muted-foreground">
            <strong>© {year} Holarc Health (Pty) Ltd. All rights reserved.</strong>
          </p>

          <h2>1. Ownership</h2>
          <p>
            The Holarc Health platform — including, without limitation, its source code,
            user interface, visual design, layouts, iconography, copy, terminology
            (including but not limited to <em>Holarchive</em>, <em>Round Table</em>,
            <em> Vula</em>, <em>My Holarchive</em>), workflows, AI prompts, document
            templates, and the overall look and feel — is the exclusive property of
            Holarc Health (Pty) Ltd and is protected by copyright, trademark, trade
            dress, database, and other intellectual property laws of South Africa and
            international treaties.
          </p>

          <h2>2. Trademarks</h2>
          <p>
            <strong>Holarc™</strong> and <strong>Holarc Health™</strong>, together
            with associated logos and product names, are trademarks of Holarc Health
            (Pty) Ltd. Use of these marks without prior written permission is strictly
            prohibited.
          </p>

          <h2>3. Prohibited Acts</h2>
          <p>You may not, and you may not permit any third party to:</p>
          <ul>
            <li>Reverse engineer, decompile, disassemble, or otherwise attempt to derive the source code, structure, or organisation of the platform.</li>
            <li>Copy, reproduce, republish, frame, mirror, or create derivative works of any portion of the platform's user interface, visual design, copy, workflows, or terminology.</li>
            <li>Use screenshots, screen recordings, automated capture, or any other means of observation to recreate, clone, "white-label", or build a competing or substantially similar product or service.</li>
            <li>Scrape, harvest, crawl, or use automated agents, bots, or scripts to access, collect, or index any data, content, or functionality of the platform.</li>
            <li>Bypass, disable, or interfere with security, authentication, or access controls.</li>
            <li>Use the platform's name, marks, copy, or distinctive elements in any way that creates confusion as to source, sponsorship, or affiliation.</li>
          </ul>

          <h2>4. Enforcement</h2>
          <p>
            Holarc Health actively monitors for unauthorised use of its intellectual
            property. Breach of this notice may result in immediate account
            termination, takedown notices (including DMCA and equivalent
            jurisdictional procedures), trademark and copyright infringement
            proceedings, and claims for damages, profits, statutory damages, and legal
            costs to the maximum extent permitted by law.
          </p>

          <h2>5. Reporting Infringement</h2>
          <p>
            If you become aware of any product or service that you believe infringes
            on Holarc Health's intellectual property, please contact us at{" "}
            <a href="mailto:legal@holarchealth.com">legal@holarchealth.com</a>.
          </p>

          <h2>6. Governing Law</h2>
          <p>
            This notice is governed by the laws of the Republic of South Africa.
            Disputes shall be subject to the exclusive jurisdiction of South African
            courts, without prejudice to Holarc Health's right to seek injunctive
            relief in any jurisdiction where infringement occurs.
          </p>
      </>
    </LegalDocLayout>
  );
}
