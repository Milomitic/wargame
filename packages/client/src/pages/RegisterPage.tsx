import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuthStore } from "../stores/authStore.js";

export default function RegisterPage() {
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [loading, setLoading] = useState(false);
  const register = useAuthStore((s) => s.register);
  const error = useAuthStore((s) => s.error);
  const navigate = useNavigate();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      await register({ username, email, password, displayName });
      navigate("/dashboard");
    } catch {
      // error is set in store
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 relative">
      {/* Background decoration */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div
          className="absolute top-1/3 right-1/3 w-[500px] h-[500px] rounded-full"
          style={{
            background: "radial-gradient(circle, rgba(56,139,253,0.03) 0%, transparent 70%)",
          }}
        />
      </div>

      <div className="w-full max-w-sm animate-fade-in">
        {/* Shield icon */}
        <div className="text-center mb-5">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-full border border-[var(--border-default)] bg-[var(--surface-2)] glow-gold">
            <span className="text-2xl">{"\u2694\uFE0F"}</span>
          </div>
        </div>

        <div className="card-elevated p-7">
          <h1 className="font-title text-2xl font-bold text-center text-[var(--color-gold)] mb-0.5">
            Claim Your Land
          </h1>
          <p className="text-center text-[var(--color-parchment-faint)] text-xs mb-6">
            Forge a new kingdom
          </p>

          <div className="medieval-divider mb-5" />

          {error && (
            <div className="flex items-start gap-2 p-2.5 mb-4 rounded-lg text-xs bg-[var(--color-danger)]/15 border border-[var(--color-danger)]/40 text-[var(--color-danger-light)]">
              <span className="shrink-0 mt-px">{"\u26A0\uFE0F"}</span>
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-3.5">
            <div>
              <label className="block text-[0.65rem] font-bold uppercase tracking-[0.1em] mb-1.5 text-[var(--color-parchment-faint)]">
                Display Name
              </label>
              <input
                type="text"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                required
                minLength={2}
                maxLength={30}
                placeholder="Lord Aldric"
                className="input-field"
              />
            </div>
            <div>
              <label className="block text-[0.65rem] font-bold uppercase tracking-[0.1em] mb-1.5 text-[var(--color-parchment-faint)]">
                Username
              </label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
                minLength={3}
                maxLength={20}
                pattern="^[a-zA-Z0-9_]+$"
                placeholder="lord_aldric"
                className="input-field"
              />
            </div>
            <div>
              <label className="block text-[0.65rem] font-bold uppercase tracking-[0.1em] mb-1.5 text-[var(--color-parchment-faint)]">
                Email
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                placeholder="lord@kingdom.com"
                className="input-field"
              />
            </div>
            <div>
              <label className="block text-[0.65rem] font-bold uppercase tracking-[0.1em] mb-1.5 text-[var(--color-parchment-faint)]">
                Password
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={8}
                placeholder="Minimum 8 characters"
                className="input-field"
              />
            </div>

            <button type="submit" disabled={loading} className="btn-primary w-full py-2.5 text-sm mt-1">
              {loading ? (
                <>
                  <span className="spinner w-3.5 h-3.5" />
                  Founding...
                </>
              ) : (
                "Found Your Kingdom"
              )}
            </button>
          </form>

          <div className="medieval-divider mt-5 mb-4" />

          <p className="text-center text-xs text-[var(--color-parchment-faint)]">
            Already have a kingdom?{" "}
            <Link to="/login" className="text-[var(--color-gold)] hover:text-[var(--color-gold-light)] transition-colors font-semibold">
              Return to your realm
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
