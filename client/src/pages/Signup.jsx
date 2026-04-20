import { useState } from "react";
import { Link, Navigate, useNavigate, useSearchParams } from "react-router-dom";
import Button from "../components/common/Button.jsx";
import { useAuth } from "../hooks/useAuth.js";

function Signup() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { register, isAuthenticated } = useAuth();

  const [name, setName] = useState("");
  const [email, setEmail] = useState(() => searchParams.get("email") ?? "");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState("DEVELOPER");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  if (isAuthenticated) {
    return <Navigate to="/app" replace />;
  }

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError("");
    setSubmitting(true);

    try {
      await register({ name, email, password, role });
      navigate("/app", { replace: true });
    } catch {
      setError("Unable to create account right now. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="auth-screen">
      <section className="auth-panel depth-card">
        <header>
          <p className="eyebrow">Beacon Onboarding</p>
          <h1>Create your workspace account</h1>
          <p className="auth-subtext">Set up your profile to start planning smarter sprints with AI insight.</p>
        </header>

        <form className="auth-form" onSubmit={handleSubmit}>
          <label htmlFor="name">Full Name</label>
          <input
            id="name"
            type="text"
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="Your name"
            required
          />

          <label htmlFor="signup-email">Email</label>
          <input
            id="signup-email"
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="you@team.com"
            required
          />

          <label htmlFor="signup-password">Password</label>
          <input
            id="signup-password"
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            placeholder="Create a secure password"
            minLength={6}
            required
          />

          <label htmlFor="role">Role</label>
          <select id="role" value={role} onChange={(event) => setRole(event.target.value)} className="filter-select">
            <option value="MANAGER">Manager</option>
            <option value="DEVELOPER">Developer</option>
            <option value="QA">QA</option>
          </select>
          <p className="text-muted">A unique user ID (example: BCN-0008) will be auto-generated for invitations.</p>

          {error ? <p className="form-error">{error}</p> : null}

          <Button type="submit" variant="primary" size="lg" loading={submitting}>
            Create Account
          </Button>
        </form>

        <footer className="auth-footnote auth-inline">
          <p>Already have an account?</p>
          <Link to="/login">Sign in</Link>
        </footer>
      </section>
    </div>
  );
}

export default Signup;
