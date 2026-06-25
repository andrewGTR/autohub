"use client";

import PageNavbar from "../../components/PageNavbar";
import Link from "next/link";
import { useState } from "react";
import { useAuth } from "../../context/AuthContext";
import { useRouter } from "next/navigation";
import { dealerSignup } from "../../lib/api";

export default function DealerSignup() {
  const { setAuth } = useAuth();
  const router = useRouter();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [location, setLocation] = useState("");
  const [phone, setPhone] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [taxNumber, setTaxNumber] = useState("");
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
      const user = await dealerSignup({
        name,
        email,
        password,
        confirmPassword,
        location,
        phone,
        whatsapp,
        taxNumber,
      });
      setAuth(user);
      router.push("/dealer-profile");
    } catch (e: any) {
      setError(e.message || "Registration failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <PageNavbar />
      <div className="auth-wrapper" style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div className="auth-card">
          <h2>Dealer Portal</h2>
          <p style={{ textAlign: "center", color: "#888", fontSize: "0.85rem", marginBottom: "8px" }}>
            Register your dealership to start listing cars
          </p>

          {error && (
            <div style={{ color: "#e33", fontSize: "0.85rem", textAlign: "center", padding: "6px 0" }}>
              {error}
            </div>
          )}

          <form className="auth-form" onSubmit={(e) => { e.preventDefault(); handleSignup(); }}>
            <input type="text"     placeholder="Full Name"          className="auth-input" value={name}            onChange={(e) => setName(e.target.value)} />
            <input type="email"    placeholder="Email Address"       className="auth-input" value={email}           onChange={(e) => setEmail(e.target.value)} />
            <input type="password" placeholder="Password"            className="auth-input" value={password}        onChange={(e) => setPassword(e.target.value)} />
            <input type="password" placeholder="Confirm Password"    className="auth-input" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} />
            <input type="text"     placeholder="Location (City, Country)"   className="auth-input" value={location}       onChange={(e) => setLocation(e.target.value)} />
            <input type="tel"      placeholder="Phone Number"        className="auth-input" value={phone}           onChange={(e) => setPhone(e.target.value)} />
            <input type="tel"      placeholder="WhatsApp Number"     className="auth-input" value={whatsapp}        onChange={(e) => setWhatsapp(e.target.value)} />
            <input type="text"     placeholder="Tax Number"          className="auth-input" value={taxNumber}       onChange={(e) => setTaxNumber(e.target.value)} />

            <button type="submit" className="auth-submit-btn" disabled={loading}>
              {loading ? "Applying..." : "Apply as Dealer"}
            </button>
          </form>

          <p className="auth-footer">Already have a dealer account? <Link href="/login">Log in</Link></p>
        </div>
      </div>
    </>
  );
}
