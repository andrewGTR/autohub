"use client";

import PageNavbar from "../../components/PageNavbar";
import Link from "next/link";
import { useState } from "react";
import { useAuth } from "../../context/AuthContext";
import { useRouter } from "next/navigation";
import { loginUser } from "../../lib/api";

export default function Login() {
  const { setAuth } = useAuth();
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleLogin = async () => {
    setLoading(true);
    setError("");
    try {
      // Calls api.loginUser() → currently mock, replace with real endpoint in api.ts
      const user = await loginUser({ email, password });
      setAuth(user);
      // Admins go to admin dashboard; Dealers go to their profile; regular users go to their profile
      const dest = user.role === "admin" ? "/admin" : user.role === "dealer" ? "/dealer-profile" : "/user-profile";
      router.push(dest);

    } catch (e: any) {
      setError(e.message || "Login failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <PageNavbar />
      <div className="auth-wrapper" style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div className="auth-card">
          <button className="google-btn" type="button" onClick={() => window.location.href = '/api/auth/google'} disabled={loading}>
            <svg width="20" height="20" viewBox="0 0 48 48">
              <path fill="#EA4335" d="M24 9.5c3.14 0 5.95 1.08 8.17 2.86l6.1-6.1C34.46 3.1 29.5 1 24 1 14.82 1 7.07 6.48 3.52 14.23l7.12 5.53C12.3 13.36 17.68 9.5 24 9.5z" />
              <path fill="#4285F4" d="M46.52 24.5c0-1.64-.15-3.22-.42-4.75H24v9h12.7c-.55 2.96-2.2 5.47-4.68 7.15l7.18 5.58C43.44 37.3 46.52 31.36 46.52 24.5z" />
              <path fill="#FBBC05" d="M10.64 28.24A14.6 14.6 0 0 1 9.5 24c0-1.48.25-2.91.64-4.24l-7.12-5.53A23.94 23.94 0 0 0 0 24c0 3.87.93 7.52 2.56 10.77l7.12-5.53z" transform="translate(.96 -.77)" />
              <path fill="#34A853" d="M24 47c5.5 0 10.12-1.82 13.5-4.95l-7.18-5.58C28.6 38.1 26.42 39 24 39c-6.32 0-11.68-3.86-13.36-9.26l-7.12 5.53C7.07 43.52 14.82 47 24 47z" transform="translate(0 -1)" />
            </svg>
            Continue with Google
          </button>

          <div className="divider"><span>or</span></div>

          {error && (
            <div style={{ color: "#e33", fontSize: "0.85rem", textAlign: "center", padding: "6px 0" }}>
              {error}
            </div>
          )}

          <form className="auth-form" onSubmit={(e) => { e.preventDefault(); handleLogin(); }}>
            <input
              type="email"
              placeholder="Enter your Email"
              className="auth-input"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
            <input
              type="password"
              placeholder="Enter your Password"
              className="auth-input"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />

            <button type="submit" className="auth-submit-btn" disabled={loading}>
              {loading ? "Logging in..." : "Log in"}
            </button>
          </form>

          <p className="auth-footer">Don&apos;t Have Account? <Link href="/signup">Sign up</Link></p>
          <p className="auth-footer">Are you a dealer? <Link href="/dealer-signup">Sign up as a dealer</Link></p>
        </div>
      </div>
    </>
  );
}
