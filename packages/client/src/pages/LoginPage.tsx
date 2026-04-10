import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuthStore } from "../stores/authStore.js";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const login = useAuthStore((s) => s.login);
  const error = useAuthStore((s) => s.error);
  const navigate = useNavigate();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      await login(email, password);
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
          className="absolute top-1/4 left-1/4 w-[500px] h-[500px] rounded-full"
          style={{
            background: "radial-gradient(circle, rgba(56,139,253,0.03) 0%, transparent 70%)",
          }}
        />
        <div
          className="absolute bottom-1/4 right-1/4 w-80 h-80 rounded-full"
          style={{
            background: "radial-gradient(circle, rgba(212,160,32,0.02) 0%, transparent 70%)",
          }}
        />
      </div>

      <div className="w-full max-w-sm animate-fade-in">
        {/* Crown icon */}
        <div className="text-center mb-5">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-full border border-[var(--border-default)] bg-[var(--surface-2)] glow-gold">
            <span className="text-2xl">{"\u{1F3F0}"}</span>
          </div>
        </div>

        <div className="card-elevated p-7">
          <h1 className="font-title text-2xl font-bold text-center text-[var(--color-gold)] mb-0.5">
            Medieval Wargame
          </h1>
          <p className="text-center text-[var(--color-parchment-faint)] text-xs mb-6">
            Enter your realm
          </p>

          <div className="medieval-divider mb-5" />

          {error && (
            <div className="flex items-start gap-2 p-2.5 mb-4 rounded-lg text-xs bg-[var(--color-danger)]/15 border border-[var(--color-danger)]/40 text-[var(--color-danger-light)]">
              <span className="shrink-0 mt-px">{"\u26A0\uFE0F"}</span>
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
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
                placeholder="Your secret phrase"
                className="input-field"
              />
            </div>

            <button type="submit" disabled={loading} className="btn-primary w-full py-2.5 text-sm mt-1">
              {loading ? (
                <>
                  <span className="spinner w-3.5 h-3.5" />
                  Entering...
                </>
              ) : (
                "Enter the Realm"
              )}
            </button>
          </form>

          <div className="medieval-divider mt-5 mb-4" />

          <p className="text-center text-xs text-[var(--color-parchment-faint)]">
            No kingdom yet?{" "}
            <Link to="/register" className="text-[var(--color-gold)] hover:text-[var(--color-gold-light)] transition-colors font-semibold">
              Claim your land
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
