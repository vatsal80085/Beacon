import { useCallback, useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../hooks/useAuth.js";
import { analyticsApi, PRIORITY_META } from "../api/axios.js";
import { useLiveRefresh } from "../hooks/useLiveRefresh.js";
import { LIVE_CHANNELS } from "../realtime/liveChannels.js";
import { formatPercent } from "../utils/formatters.js";
import "../styles/landing.css";

const FEATURES = [
  {
    icon: "board",
    title: "Agile Task Management",
    description: "Organize your backlog, manage sprints, and track stories with rich priority, risk, and business value signals.",
  },
  {
    icon: "pulse",
    title: "Real-time Dashboards",
    description: "Watch your sprint health, velocity, and capacity utilization update in real-time as work moves across the board.",
  },
  {
    icon: "ai",
    title: "AI Optimization Engine",
    description: "Let our heuristic models prioritize your backlog and recommend tasks that maximize success probability and feasibility.",
  },
];

const STACK = [
  { name: "React", detail: "Fluid user interfaces with instant state updates" },
  { name: "Node.js", detail: "High-performance backend for seamless orchestration" },
  { name: "Express", detail: "Robust API layer handling complex analytics" },
  { name: "MongoDB", detail: "Flexible schema for rapidly evolving agile data" },
];

function LandingGlyph({ type }) {
  switch (type) {
    case "board":
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
          <line x1="9" y1="3" x2="9" y2="21" />
          <line x1="15" y1="3" x2="15" y2="21" />
          <line x1="3" y1="9" x2="9" y2="9" />
          <line x1="9" y1="14" x2="15" y2="14" />
          <line x1="15" y1="11" x2="21" y2="11" />
        </svg>
      );
    case "pulse":
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
        </svg>
      );
    case "ai":
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
        </svg>
      );
    default:
      return null;
  }
}

function LandingPage() {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();
  const [email, setEmail] = useState("");
  const [preview, setPreview] = useState(null);
  const loadPreview = useCallback(async () => {
    if (!isAuthenticated) {
      setPreview(null);
      return;
    }

    try {
      const data = await analyticsApi.getDashboardOverview();
      setPreview(data);
    } catch {
      setPreview(null);
    }
  }, [isAuthenticated]);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("is-visible");
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.1 }
    );

    document.querySelectorAll("[data-reveal]").forEach((el) => {
      observer.observe(el);
    });

    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    let isMounted = true;

    const initialize = async () => {
      await loadPreview();
      if (!isMounted) {
        return;
      }
    };

    initialize();

    return () => {
      isMounted = false;
    };
  }, [loadPreview]);

  useLiveRefresh(loadPreview, {
    enabled: isAuthenticated,
    channels: [LIVE_CHANNELS.dashboard],
  });

  const handleSignupSubmit = (e) => {
    e.preventDefault();
    if (isAuthenticated) {
      navigate("/app");
      return;
    }
    navigate(email ? `/signup?email=${encodeURIComponent(email)}` : "/signup");
  };

  return (
    <div className="landing-page">
      <div className="landing-bg-elements">
        <div className="glow-orb orb-1"></div>
        <div className="glow-orb orb-2"></div>
        <div className="glow-orb orb-3"></div>
        <div className="landing-grid-overlay"></div>
      </div>

      <header className="landing-header">
        <div className="header-container">
          <div className="brand">
            <div className="brand-logo">
              <span className="brand-dot"></span>
            </div>
            <span className="brand-name">Beacon</span>
          </div>
          <nav className="main-nav">
            <a href="#features">Features</a>
            <a href="#optimization">Optimization</a>
            <a href="#stack">Tech Stack</a>
          </nav>
          <div className="header-actions">
            <Link to="/login" className="btn-ghost">Log in</Link>
            <Link to={isAuthenticated ? "/app" : "/signup"} className="btn-primary">
              {isAuthenticated ? "Go to Dashboard" : "Get Started"}
            </Link>
          </div>
        </div>
      </header>

      <main>
        <section className="hero-section">
          <div className="hero-content" data-reveal>
            <div className="hero-badge">
              <span className="badge-pulse"></span>
              Introducing the Heuristic Optimization Engine
            </div>
            <h1 className="hero-title">
              Agile management, <br />
              <span className="text-gradient">Optimisation Engine</span>
            </h1>
            <p className="hero-subtitle">
              Beacon eliminates sprint planning guesswork. Track projects, manage tasks, and let our optimization engine recommend the perfect sprint scope to maximize your team's success probability.
            </p>
            <div className="hero-cta-group">
              <Link to={isAuthenticated ? "/app" : "/signup"} className="btn-primary btn-lg">
                Start Optimizing Now
              </Link>
              <a href="#features" className="btn-secondary btn-lg">
                Explore Features
              </a>
            </div>
          </div>

          <div className="hero-visual" data-reveal>
            <div className="glass-dashboard">
              <div className="dashboard-header">
                <div className="window-controls">
                  <span></span><span></span><span></span>
                </div>
                <div className="dashboard-title">Beacon Command Center</div>
              </div>
              <div className="dashboard-body">
                <div className="dash-row">
                  <div className="dash-card stat-card">
                    <div className="stat-label">Portfolio Health</div>
                    <div className="stat-value text-gradient">
                      {preview ? `${Math.round(preview.portfolioHealth ?? 0)} / 100` : "Sign in"}
                    </div>
                  </div>
                  <div className="dash-card stat-card">
                    <div className="stat-label">Active Sprints</div>
                    <div className="stat-value">{preview ? preview.activeSprints ?? 0 : "to see"}</div>
                  </div>
                  <div className="dash-card stat-card">
                    <div className="stat-label">Average Velocity</div>
                    <div className="stat-value">
                      {preview ? `${Number(preview.averageVelocity ?? 0).toFixed(1)} pts/day` : "live data"}
                    </div>
                  </div>
                </div>
                <div className="dash-row main-dash-row">
                  <div className="dash-card chart-card">
                    <div className="card-header">Sprint Completion</div>
                    <div className="mock-chart">
                      <div className="bar b1"></div>
                      <div className="bar b2"></div>
                      <div className="bar b3"></div>
                      <div className="bar b4"></div>
                      <div className="bar b5"></div>
                    </div>
                  </div>
                  <div className="dash-card ai-card">
                    <div className="card-header">
                      <LandingGlyph type="ai" /> AI Recommendation
                    </div>
                    <div className="ai-content">
                      {preview?.optimization ? (
                        <>
                          <div className="ai-insight">
                            Success Probability:{" "}
                            <strong className="text-gradient">
                              {Math.round(preview.optimization.predictedSuccessProbability ?? 0)}%
                            </strong>
                          </div>
                          {(preview.optimization.recommendedTasks ?? []).slice(0, 2).map((task) => (
                            <div key={task.id} className="ai-task">
                              <span className="task-id">{task.id?.slice(0, 7) ?? "TASK"}</span> {task.title}
                              <span className="task-tag">{PRIORITY_META[task.priority]?.label ?? task.priority ?? "Priority"}</span>
                            </div>
                          ))}
                          <div className="ai-insight" style={{ marginTop: "0.75rem" }}>
                            Utilization: <strong>{formatPercent(preview.optimization.capacityUtilization ?? 0)}</strong>
                          </div>
                        </>
                      ) : (
                        <div className="ai-insight">
                          Sign in to see recommendations based on your backlog, risks, and capacity.
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
            
          </div>
        </section>

        <section id="features" className="features-section">
          <div className="section-header" data-reveal>
            <h2>Everything you need. Nothing you don't.</h2>
            <p>Designed for engineering teams who want less friction and more shipping.</p>
          </div>
          <div className="features-grid">
            {FEATURES.map((feature, i) => (
              <div key={i} className="feature-card glass-panel" data-reveal style={{ transitionDelay: `${i * 100}ms` }}>
                <div className="feature-icon-wrapper">
                  <LandingGlyph type={feature.icon} />
                </div>
                <h3>{feature.title}</h3>
                <p>{feature.description}</p>
              </div>
            ))}
          </div>
        </section>

        <section id="optimization" className="optimization-section glass-panel-strong" data-reveal>
          <div className="opt-content">
            <h2>The ultimate <span className="text-gradient">Optimization Engine</span></h2>
            <p>
              Stop guessing how much work fits in a sprint. Beacon analyzes business value, risk factors, urgency, and team capacity to automatically recommend the highest-leverage tasks for your next sprint.
            </p>
            <ul className="opt-list">
              <li><LandingGlyph type="pulse" /> Calculates predicted success probability</li>
              <li><LandingGlyph type="board" /> Flags capacity bottlenecks instantly</li>
              <li><LandingGlyph type="ai" /> Balances high-risk, high-value deliverables</li>
            </ul>
          </div>
          <div className="opt-visual">
            <div className="opt-ring inner-ring"></div>
            <div className="opt-ring middle-ring"></div>
            <div className="opt-ring outer-ring"></div>
            <div className="opt-center-icon"><LandingGlyph type="ai" /></div>
          </div>
        </section>

        <section id="stack" className="stack-section">
          <div className="section-header" data-reveal>
            <h2>Built on a modern stack</h2>
            <p>Robust, scalable, and blazingly fast.</p>
          </div>
          <div className="stack-grid">
            {STACK.map((tech, i) => (
              <div key={i} className="stack-item" data-reveal style={{ transitionDelay: `${i * 50}ms` }}>
                <h3>{tech.name}</h3>
                <p>{tech.detail}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="cta-section" data-reveal>
          <div className="cta-box glass-panel-strong">
            <h2>Ready to transform your workflow?</h2>
            <p>Join teams who have already switched to data-driven agile management.</p>
            <form onSubmit={handleSignupSubmit} className="cta-form">
              <input 
                type="email" 
                placeholder="Enter your email" 
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
              <button type="submit" className="btn-primary">Get Started</button>
            </form>
          </div>
        </section>
      </main>

      <footer className="landing-footer">
        <div className="footer-content">
          <div className="brand">
            <div className="brand-logo">
              <span className="brand-dot"></span>
            </div>
            <span className="brand-name">Beacon</span>
          </div>
          <div className="footer-links">
            <a href="#features">Features</a>
            <a href="#optimization">Optimization</a>
            <Link to="/login">Login</Link>
            <Link to="/signup">Sign up</Link>
          </div>
        </div>
        <div className="footer-bottom">
          &copy; {new Date().getFullYear()} Beacon. All rights reserved.
        </div>
      </footer>
    </div>
  );
}

export default LandingPage;
