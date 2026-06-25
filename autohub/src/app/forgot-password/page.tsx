"use client";

import PageNavbar from "../../components/PageNavbar";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { forgotPassword, resetPassword } from "../../lib/api";

export default function ForgotPassword() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    setSuccess("");
    try {
      await forgotPassword(email);
      setSuccess("OTP sent to your email.");
      setStep(2);
    } catch (err: any) {
      setError(err.message || "Failed to send OTP. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    setSuccess("");
    try {
      await resetPassword(email, otp, newPassword);
      setSuccess("Password reset successfully. Redirecting to login...");
      setTimeout(() => {
        router.push("/login");
      }, 2000);
    } catch (err: any) {
      setError(err.message || "Failed to reset password. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <PageNavbar />
      <div className="auth-wrapper" style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div className="auth-card">
          <h2 style={{ textAlign: "center", marginBottom: "1rem" }}>Forgot Password</h2>
          
          {error && (
            <div style={{ color: "#e33", fontSize: "0.85rem", textAlign: "center", padding: "6px 0" }}>
              {error}
            </div>
          )}
          {success && (
            <div style={{ color: "green", fontSize: "0.85rem", textAlign: "center", padding: "6px 0" }}>
              {success}
            </div>
          )}

          {step === 1 ? (
            <form className="auth-form" onSubmit={handleSendOtp}>
              <p style={{ fontSize: "0.9rem", color: "#666", marginBottom: "1rem", textAlign: "center" }}>
                Enter your email address and we will send you a 6-digit OTP to reset your password.
              </p>
              <input
                type="email"
                placeholder="Enter your Email"
                className="auth-input"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
              <button type="submit" className="auth-submit-btn" disabled={loading}>
                {loading ? "Sending OTP..." : "Send OTP"}
              </button>
            </form>
          ) : (
            <form className="auth-form" onSubmit={handleResetPassword}>
              <p style={{ fontSize: "0.9rem", color: "#666", marginBottom: "1rem", textAlign: "center" }}>
                Enter the 6-digit OTP sent to {email} and your new password.
              </p>
              <input
                type="text"
                placeholder="6-digit OTP"
                className="auth-input"
                value={otp}
                onChange={(e) => setOtp(e.target.value)}
                maxLength={6}
                required
              />
              <input
                type="password"
                placeholder="New Password"
                className="auth-input"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                required
              />
              <button type="submit" className="auth-submit-btn" disabled={loading}>
                {loading ? "Resetting..." : "Reset Password"}
              </button>
              
              <button 
                type="button" 
                onClick={() => setStep(1)} 
                style={{ background: "none", border: "none", color: "#666", cursor: "pointer", marginTop: "10px", fontSize: "0.85rem" }}
              >
                Resend OTP / Change Email
              </button>
            </form>
          )}

          <p className="auth-footer" style={{ marginTop: "1rem" }}>
            Remembered your password? <Link href="/login">Log in</Link>
          </p>
        </div>
      </div>
    </>
  );
}
