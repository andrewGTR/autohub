"use client";

import PageNavbar from "../../components/PageNavbar";
import Link from "next/link";
import { useState } from "react";
import { useAuth } from "../../context/AuthContext";
import { useRouter } from "next/navigation";
import { signupUser } from "../../lib/api";

export default function Signup() {
  const { setAuth } = useAuth();
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSignup = async () => {
    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }
    setLoading(true);
    setError("");
    try {
      const user = await signupUser({ name, email, password, confirmPassword });
      setAuth(user);
      router.push("/user-profile"); // regular users go to their profile

    } catch (e: any) {
      setError(e.message || "Signup failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <PageNavbar />
      <div className="auth-wrapper" style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div className="auth-card">
          <h2>Create Account</h2>

          {error && (
            <div style={{ color: "#e33", fontSize: "0.85rem", textAlign: "center", padding: "6px 0" }}>
              {error}
            </div>
          )}

          <input type="text" placeholder="Full Name" className="auth-input" value={name} onChange={(e) => setName(e.target.value)} />
          <input type="email" placeholder="Email Address" className="auth-input" value={email} onChange={(e) => setEmail(e.target.value)} />
          <input type="password" placeholder="Password" className="auth-input" value={password} onChange={(e) => setPassword(e.target.value)} />
          <input type="password" placeholder="Confirm Password" className="auth-input" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} />

          <button className="auth-submit-btn" onClick={handleSignup} disabled={loading}>
            {loading ? "Creating account..." : "Sign up"}
          </button>

          <p className="auth-footer">Already have an account? <Link href="/login">Log in</Link></p>
        </div>
      </div>
    </>
  );
}
