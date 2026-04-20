import { useState } from "react";
import { Link, Navigate, useLocation, useNavigate } from "react-router-dom";
import Button from "../components/common/Button.jsx";
import { useAuth } from "../hooks/useAuth.js";

function Login() {
  const navigate = useNavigate();
  const location = useLocation();
  const { login, isAuthenticated } = useAuth();

  const [email, setEmail] = useState("manager@beacon.dev");
  const [password, setPassword] = useState("beacon-demo");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const from = location.state?.from?.pathname ?? "/app";

  if (isAuthenticated) {
    return <Navigate to="/app" replace />;
  }

  const handleSubmit = async (event) => {
    event.preventDefault();
    setSubmitting(true);
    setError("");

    try {
      await login({ email, password });
      navigate(from, { replace: true });
    } catch {
      setError("Login failed. Please verify your credentials and try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="auth-screen">
      <section className="auth-panel depth-card">
        <header>
          <p className="eyebrow">Beacon Agile Engine</p>
          <h1>Sign in to your workspace</h1>
          <p className="auth-subtext">
            Track sprint health, surface risks, and optimize workload decisions in one place.
          </p>
        </header>

        <form className="auth-form" onSubmit={handleSubmit}>
          <label htmlFor="email">Email</label>
          <input
            id="email"
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="manager@beacon.dev"
            required
          />

          <label htmlFor="password">Password</label>
          <input
            id="password"
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            placeholder="********"
            required
          />

          {error ? <p className="form-error">{error}</p> : null}

          <Button type="submit" variant="primary" size="lg" loading={submitting}>
            Access Beacon
          </Button>
        </form>

        <footer className="auth-footnote">
          <p>Demo mode enabled if API auth is unavailable.</p>
          <p className="auth-inline">
            <span>New here?</span>
            <Link to="/signup">Create account</Link>
          </p>
        </footer>
      </section>
    </div>
  );
}

export default Login;
