export default function Terms() {
  return (
    <div className="mx-auto max-w-3xl p-6 prose">
      <h1>Terms of Use</h1>
      <p><strong>Plain English:</strong> This app is for education. Be respectful, don’t try to break it, and don’t share your account.</p>

      <h2>Allowed use</h2>
      <ul>
        <li>Use the app to practice and learn pediatric cardiology concepts.</li>
        <li>Create one account per person. Keep your password private.</li>
      </ul>

      <h2>Prohibited</h2>
      <ul>
        <li>No scraping, automated abuse, or attempts to bypass security.</li>
        <li>No sharing of copyrighted content you don’t own rights to.</li>
        <li>No uploading of protected health information (PHI).</li>
      </ul>

      <h2>Data & privacy</h2>
      <p>See our <a href="/privacy">Privacy Policy</a> for what we collect and why.</p>

      <h2>Availability</h2>
      <p>We aim for reliable service, but downtime or maintenance may occur.</p>

      <h2>Liability</h2>
      <p>This is an educational tool. It does not provide medical advice. Use clinical judgment and official guidelines.</p>

      <h2>Contact</h2>
      <p>Email: <a href="mailto:stevetodman@hotmail.com">stevetodman@hotmail.com</a></p>

      <p><em>Effective date:</em> {new Date().toISOString().slice(0,10)}</p>
    </div>
  );
}
