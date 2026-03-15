const errorMessages: Record<string, string> = {
  google: "Google sign-in failed before the session could be created.",
  AccessDenied: "Your Google account is not in the admin allowlist."
};
const devAuthBypass = process.env.DEV_AUTH_BYPASS === "true";

export default function SignInPage({
  searchParams
}: {
  searchParams?: { error?: string };
}) {
  const error = searchParams?.error;
  const errorMessage = error ? errorMessages[error] ?? `Authentication error: ${error}` : null;

  return (
    <main className="signin">
      <section className="hero signin__panel">
        <div className="hero__eyebrow">Digital Barn Finds</div>
        <h1 className="hero__title">Find the cars history forgot.</h1>
        <p className="hero__copy">
          Search authenticated source records, surface deep provenance gaps,
          and track the cars that look most likely to have slipped out of
          public view.
        </p>
        <p>
          {devAuthBypass ? (
            <a className="button" href="/dashboard">
              Continue to dashboard
            </a>
          ) : (
            <a className="button" href="/api/auth/signin/google?callbackUrl=/dashboard">
              Sign in with Google
            </a>
          )}
        </p>
        {errorMessage ? <p className="empty">{errorMessage}</p> : null}
      </section>
    </main>
  );
}
