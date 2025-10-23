export default function Privacy() {
  return (
    <div className="mx-auto max-w-3xl p-6 prose">
      <h1>Privacy Policy</h1>
      <p><strong>Plain English:</strong> We collect only what we need to run this learning app and to show your progress. We do not sell your data.</p>

      <h2>What we collect</h2>
      <ul>
        <li><strong>Account info:</strong> Your email (for login and password resets).</li>
        <li><strong>App activity:</strong> Your answers, flags, and progress metrics.</li>
        <li><strong>Device basics:</strong> Standard logs (errors, performance) to improve reliability.</li>
      </ul>

      <h2>What we do <em>not</em> collect</h2>
      <ul>
        <li>No protected health information (PHI).</li>
        <li>No sensitive personal details beyond your email.</li>
      </ul>

      <h2>How we use your data</h2>
      <ul>
        <li>To sign you in and secure your account.</li>
        <li>To show your progress and leaderboards (using aliases, not real names).</li>
        <li>To fix bugs and improve the app.</li>
      </ul>

      <h2>Who can see your data</h2>
      <ul>
        <li><strong>You:</strong> Your own activity and progress.</li>
        <li><strong>Admins:</strong> May see aggregate stats and limited details to support you.</li>
        <li><strong>Nobody else:</strong> Students cannot see each other’s data.</li>
      </ul>

      <h2>Storage and security</h2>
      <p>Your data is stored in Supabase (managed Postgres). We use per-user access rules to prevent other users from seeing your data. Files (if any) are stored in private buckets.</p>

      <h2>How long we keep it</h2>
      <p>We retain your account and activity while the course/app is active. We may delete inactive accounts after a period of time.</p>

      <h2>Your choices</h2>
      <ul>
        <li>Request account deletion or data export by emailing us.</li>
        <li>Change your alias in your profile (if allowed).</li>
      </ul>

      <h2>Contact</h2>
      <p>Email: <a href="mailto:stevetodman@hotmail.com">stevetodman@hotmail.com</a></p>

      <h2>Updates</h2>
      <p>If we change this policy, we’ll update this page and the “Effective date.”</p>

      <p><em>Effective date:</em> {new Date().toISOString().slice(0,10)}</p>
    </div>
  );
}
