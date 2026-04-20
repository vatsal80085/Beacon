import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../hooks/useAuth.js";
import "../styles/landing.css";

const HERO_FRAMES = [
  {
    sync: "24ms",
    health: "94%",
    throughput: "126",
    resolution: "3.2h",
    bars: [34, 58, 47, 75, 62, 88, 70],
    board: [
      { title: "Sprint alignment", detail: "6 updates auto-synced" },
      { title: "Release blockers", detail: "2 escalations routed" },
      { title: "Capacity shift", detail: "Ops lane rebalanced" },
    ],
    pulse: "Socket stream stable across 18 active squads",
  },
  {
    sync: "19ms",
    health: "97%",
    throughput: "139",
    resolution: "2.7h",
    bars: [42, 66, 52, 81, 70, 92, 78],
    board: [
      { title: "Driver dispatch", detail: "Location signals merged" },
      { title: "Clinical intake", detail: "Priority queue updated" },
      { title: "Team load", detail: "5 tasks reassigned" },
    ],
    pulse: "Decision signals pushed live without a refresh",
  },
  {
    sync: "28ms",
    health: "91%",
    throughput: "118",
    resolution: "3.8h",
    bars: [30, 54, 49, 70, 65, 84, 74],
    board: [
      { title: "Bug triage", detail: "Risk spike contained" },
      { title: "Route coverage", detail: "Geo alerts normalized" },
      { title: "Standup summary", detail: "Action items published" },
    ],
    pulse: "Forecast confidence climbed 18% in the last cycle",
  },
];

const FEATURES = [
  {
    icon: "tasks",
    title: "Smart Task Management",
    description: "Organize work with priority signals, sprint readiness scoring, and cleaner backlog flow.",
  },
  {
    icon: "realtime",
    title: "Real-time Updates",
    description: "Socket-powered changes keep boards, alerts, and metrics in sync the moment work moves.",
  },
  {
    icon: "roles",
    title: "Role-based Dashboards",
    description: "Give admins, operators, drivers, and healthcare teams the views that match their decisions.",
  },
  {
    icon: "analytics",
    title: "Analytics & Insights",
    description: "Track throughput, risk, utilization, and delivery health without jumping between tools.",
  },
  {
    icon: "location",
    title: "Location-aware Coordination",
    description: "Blend route context and on-the-ground signals into operational planning when location matters.",
  },
  {
    icon: "automation",
    title: "Optimization Loops",
    description: "Create a repeatable cycle of planning, execution, monitoring, and refinement in one system.",
  },
];

const DEMO_PANELS = [
  {
    id: "command",
    label: "Command Center",
    eyebrow: "Portfolio View",
    title: "Read the room in seconds",
    description: "Workload balance, blocker signals, and delivery pace show up in one clean operational surface.",
    stats: [
      { label: "Sprint health", value: "94%" },
      { label: "Open blockers", value: "06" },
      { label: "Flow efficiency", value: "+18%" },
    ],
    wave: [24, 48, 42, 67, 58, 73],
    columns: [
      { title: "Queued", count: "12", items: ["API review", "Dispatch sync"] },
      { title: "Active", count: "24", items: ["Route balancing", "Clinical intake"] },
      { title: "Optimized", count: "09", items: ["Sprint reshuffle", "Capacity shift"] },
    ],
    notes: ["Leadership sees the same signal as delivery teams.", "Metrics update live while teams execute."],
  },
  {
    id: "roles",
    label: "Role Views",
    eyebrow: "Contextual Workspaces",
    title: "Each team gets signal, not noise",
    description: "Surface the right controls and status for admins, field teams, and operational stakeholders.",
    stats: [
      { label: "Admin alerts", value: "04" },
      { label: "Driver ETA delta", value: "-12%" },
      { label: "Hospital queue", value: "07" },
    ],
    wave: [20, 37, 30, 53, 46, 60],
    columns: [
      { title: "Admin", count: "08", items: ["Permissions", "Portfolio health"] },
      { title: "Field", count: "14", items: ["Routes", "Status updates"] },
      { title: "Clinical", count: "11", items: ["Case priority", "Escalations"] },
    ],
    notes: ["Views stay focused for faster decisions.", "Role-aware actions reduce friction across teams."],
  },
  {
    id: "insights",
    label: "Optimization",
    eyebrow: "Decision Engine",
    title: "Turn activity into better next moves",
    description: "Beacon highlights what to address next by combining trend changes, workload, and urgency.",
    stats: [
      { label: "Predicted success", value: "89%" },
      { label: "Capacity buffer", value: "11h" },
      { label: "Cycle time", value: "-22%" },
    ],
    wave: [18, 33, 29, 57, 54, 79],
    columns: [
      { title: "Signals", count: "17", items: ["Risk score", "Scope drift"] },
      { title: "Actions", count: "06", items: ["Reassign work", "Adjust sprint"] },
      { title: "Outcomes", count: "03", items: ["Faster resolution", "Higher focus"] },
    ],
    notes: ["Optimization suggestions stay grounded in live work.", "Teams can move from insight to action immediately."],
  },
];

const WORKFLOW_STEPS = [
  {
    step: "01",
    title: "Create",
    description: "Capture projects, goals, and live work in a shared operational canvas.",
  },
  {
    step: "02",
    title: "Assign",
    description: "Route tasks to the right people, squads, or field roles with full context attached.",
  },
  {
    step: "03",
    title: "Track",
    description: "Watch updates, blockers, and movement in real time with a clean signal-to-noise ratio.",
  },
  {
    step: "04",
    title: "Optimize",
    description: "Use Beacon’s metrics and recommendations to improve pace, utilization, and clarity.",
  },
];

const STACK = [
  { icon: "mongodb", name: "MongoDB", detail: "Flexible data models for fast-moving workflow data." },
  { icon: "express", name: "Express", detail: "Lean APIs for team coordination, auth, and analytics." },
  { icon: "react", name: "React", detail: "Responsive interfaces with live state and fluid interactions." },
  { icon: "node", name: "Node.js", detail: "Real-time backend execution for updates, signals, and orchestration." },
];

const USE_CASES = [
  {
    title: "Startups",
    quote: "Beacon gave us a calmer sprint rhythm and clearer ownership without adding more process.",
    author: "Product Lead, Seed-stage SaaS",
    metric: "31% faster sprint planning",
  },
  {
    title: "Logistics",
    quote: "Dispatch, delivery, and issue handling now share one live source of truth instead of three spreadsheets.",
    author: "Operations Manager, Regional fleet",
    metric: "18% fewer coordination delays",
  },
  {
    title: "Healthcare Coordination",
    quote: "Role-specific dashboards keep clinical and operational teams aligned when timing matters most.",
    author: "Program Director, Care network",
    metric: "22% faster handoff resolution",
  },
];

const buildWavePoints = (values) =>
  values.map((value, index) => `${index * 52},${96 - value}`).join(" ");

function LandingGlyph({ type }) {
  switch (type) {
    case "tasks":
      return (
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M7 6.5h10M7 12h10M7 17.5h6" />
          <path d="M4.5 6.5h.01M4.5 12h.01M4.5 17.5h.01" />
        </svg>
      );
    case "realtime":
      return (
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M4 12a8 8 0 0 1 16 0" />
          <path d="M7 12a5 5 0 0 1 10 0" />
          <path d="M10 12a2 2 0 0 1 4 0" />
          <circle cx="12" cy="16.5" r="1.5" />
        </svg>
      );
    case "roles":
      return (
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <circle cx="8" cy="9" r="2.5" />
          <circle cx="16" cy="8" r="2" />
          <path d="M4.5 18c.6-2.4 2.6-4 5.1-4s4.5 1.6 5.1 4" />
          <path d="M14.5 18c.4-1.8 1.9-3 3.8-3 1 0 1.9.3 2.7.9" />
        </svg>
      );
    case "analytics":
      return (
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M4.5 18.5h15" />
          <path d="M7 15V10" />
          <path d="M12 15V6.5" />
          <path d="M17 15v-4" />
        </svg>
      );
    case "location":
      return (
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M12 20s5-4.9 5-9a5 5 0 1 0-10 0c0 4.1 5 9 5 9Z" />
          <circle cx="12" cy="11" r="1.8" />
        </svg>
      );
    case "automation":
      return (
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M9 4.5h6" />
          <path d="M12 4.5v4" />
          <path d="M6.5 9.5 4 12l2.5 2.5" />
          <path d="M17.5 9.5 20 12l-2.5 2.5" />
          <rect x="8" y="8.5" width="8" height="7" rx="2" />
        </svg>
      );
    case "mongodb":
      return (
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M12 4c2 2.2 3.5 5.2 3.5 8.3 0 3.5-1.5 6-3.5 7.7-2-1.7-3.5-4.2-3.5-7.7C8.5 9.2 10 6.2 12 4Z" />
          <path d="M12 6.2v12.6" />
        </svg>
      );
    case "express":
      return (
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="m7 7-4 5 4 5" />
          <path d="m17 7 4 5-4 5" />
          <path d="M14.5 5 9.5 19" />
        </svg>
      );
    case "react":
      return (
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <ellipse cx="12" cy="12" rx="8.5" ry="3.8" />
          <ellipse cx="12" cy="12" rx="8.5" ry="3.8" transform="rotate(60 12 12)" />
          <ellipse cx="12" cy="12" rx="8.5" ry="3.8" transform="rotate(120 12 12)" />
          <circle cx="12" cy="12" r="1.6" />
        </svg>
      );
    case "node":
      return (
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="m12 3.5 7 4v9l-7 4-7-4v-9l7-4Z" />
          <path d="M12 7v10" />
          <path d="m8.5 9 3.5 2 3.5-2" />
        </svg>
      );
    default:
      return null;
  }
}

function LandingPage() {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();
  const [heroIndex, setHeroIndex] = useState(0);
  const [activePanelId, setActivePanelId] = useState(DEMO_PANELS[0].id);
  const [email, setEmail] = useState("");

  useEffect(() => {
    const mediaQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    if (mediaQuery.matches) {
      return undefined;
    }

    const heroTimer = window.setInterval(() => {
      setHeroIndex((current) => (current + 1) % HERO_FRAMES.length);
    }, 2600);

    const panelTimer = window.setInterval(() => {
      setActivePanelId((current) => {
        const currentIndex = DEMO_PANELS.findIndex((panel) => panel.id === current);
        const nextIndex = currentIndex === -1 ? 0 : (currentIndex + 1) % DEMO_PANELS.length;
        return DEMO_PANELS[nextIndex].id;
      });
    }, 4200);

    return () => {
      window.clearInterval(heroTimer);
      window.clearInterval(panelTimer);
    };
  }, []);

  useEffect(() => {
    const revealTargets = document.querySelectorAll("[data-reveal]");
    const mediaQuery = window.matchMedia("(prefers-reduced-motion: reduce)");

    if (mediaQuery.matches) {
      revealTargets.forEach((node) => node.classList.add("is-visible"));
      return undefined;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) {
            return;
          }

          entry.target.classList.add("is-visible");
          observer.unobserve(entry.target);
        });
      },
      {
        threshold: 0.18,
        rootMargin: "0px 0px -8% 0px",
      },
    );

    revealTargets.forEach((node, index) => {
      node.style.setProperty("--reveal-delay", `${Math.min(index * 55, 280)}ms`);
      observer.observe(node);
    });

    return () => observer.disconnect();
  }, []);

  const heroFrame = HERO_FRAMES[heroIndex];
  const activePanel = useMemo(
    () => DEMO_PANELS.find((panel) => panel.id === activePanelId) ?? DEMO_PANELS[0],
    [activePanelId],
  );

  const handleSignupSubmit = (event) => {
    event.preventDefault();

    if (isAuthenticated) {
      navigate("/app");
      return;
    }

    const nextPath = email ? `/signup?email=${encodeURIComponent(email)}` : "/signup";
    navigate(nextPath);
  };

  return (
    <div className="landing-page">
      <div className="landing-grid" aria-hidden="true" />
      <div className="landing-noise" aria-hidden="true" />
      <div className="landing-glow landing-glow-left" aria-hidden="true" />
      <div className="landing-glow landing-glow-right" aria-hidden="true" />

      <header className="landing-header">
        <div className="landing-header-inner">
          <a className="landing-brand" href="#top" aria-label="Beacon home">
            <img src="/beacon-icon.svg" alt="" />
            <div>
              <strong>Beacon</strong>
              <span>Agile optimization platform</span>
            </div>
          </a>

          <nav className="landing-nav" aria-label="Landing page">
            <a href="#features">Features</a>
            <a href="#preview">Preview</a>
            <a href="#workflow">How It Works</a>
            <a href="#stack">Stack</a>
            <a href="#use-cases">Use Cases</a>
          </nav>

          <div className="landing-header-actions">
            <Link className="landing-link-button" to="/login">
              Sign In
            </Link>
            <Link className="landing-primary-button landing-primary-button-sm" to={isAuthenticated ? "/app" : "/signup"}>
              Get Started
            </Link>
          </div>
        </div>
      </header>

      <main className="landing-main" id="top">
        <section className="landing-hero landing-shell">
          <div className="landing-hero-copy" data-reveal>
            <p className="landing-kicker">Real-time workflow intelligence for modern teams</p>
            <h1>Optimize Your Workflow. Illuminate Your Decisions.</h1>
            <p className="landing-subtitle">
              Beacon helps teams plan, track, and optimize work with live updates, role-aware dashboards, and
              operational insight that stays readable under pressure.
            </p>

            <div className="landing-hero-actions">
              <Link className="landing-primary-button" to={isAuthenticated ? "/app" : "/signup"}>
                Get Started
              </Link>
              <Link className="landing-secondary-button" to={isAuthenticated ? "/app" : "/login"}>
                Live Demo
              </Link>
            </div>

            <div className="landing-proof-strip">
              <div>
                <strong>Socket-ready</strong>
                <span>Live team updates without refreshes</span>
              </div>
              <div>
                <strong>Role-aware</strong>
                <span>Context for admins, field ops, and care teams</span>
              </div>
              <div>
                <strong>Decision-first</strong>
                <span>Metrics designed for action, not vanity</span>
              </div>
            </div>
          </div>

          <div className="landing-hero-visual" data-reveal>
            <div className="landing-floating-chip landing-floating-chip-top">
              <span className="landing-chip-label">Beacon Signal</span>
              <strong>{heroFrame.pulse}</strong>
            </div>
            <div className="landing-floating-chip landing-floating-chip-bottom">
              <span className="landing-chip-label">Live Metrics</span>
              <strong>{heroFrame.sync} sync latency</strong>
            </div>

            <article className="landing-dashboard">
              <div className="landing-dashboard-head">
                <div>
                  <p>Beacon Workspace</p>
                  <h2>Adaptive operations board</h2>
                </div>
                <span className="landing-live-pill">Live</span>
              </div>

              <div className="landing-hero-stats">
                <div className="landing-stat-card">
                  <span>Workflow health</span>
                  <strong>{heroFrame.health}</strong>
                </div>
                <div className="landing-stat-card">
                  <span>Throughput</span>
                  <strong>{heroFrame.throughput}</strong>
                </div>
                <div className="landing-stat-card">
                  <span>Sync latency</span>
                  <strong>{heroFrame.sync}</strong>
                </div>
                <div className="landing-stat-card">
                  <span>Issue resolution</span>
                  <strong>{heroFrame.resolution}</strong>
                </div>
              </div>

              <div className="landing-dashboard-grid">
                <section className="landing-surface-panel">
                  <div className="landing-panel-head">
                    <span>Sprint momentum</span>
                    <span className="landing-panel-badge">+18%</span>
                  </div>
                  <div className="landing-bars" aria-hidden="true">
                    {heroFrame.bars.map((value, index) => (
                      <span key={`${value}-${index}`} className="landing-bar-wrap">
                        <span className="landing-bar" style={{ height: `${value}%` }} />
                      </span>
                    ))}
                  </div>
                </section>

                <section className="landing-surface-panel landing-surface-panel-board">
                  <div className="landing-panel-head">
                    <span>Priority board</span>
                    <span className="landing-panel-badge landing-panel-badge-quiet">Auto-sorted</span>
                  </div>
                  <div className="landing-board-list">
                    {heroFrame.board.map((item) => (
                      <div key={item.title} className="landing-board-item">
                        <strong>{item.title}</strong>
                        <span>{item.detail}</span>
                      </div>
                    ))}
                  </div>
                </section>
              </div>
            </article>
          </div>
        </section>

        <section className="landing-section landing-shell" id="features">
          <div className="landing-section-head" data-reveal>
            <p className="landing-kicker">Features</p>
            <h2>Built for teams that need speed without losing clarity</h2>
            <p>
              Beacon blends execution, visibility, and optimization so teams can move faster without creating more
              tooling sprawl.
            </p>
          </div>

          <div className="landing-feature-grid">
            {FEATURES.map((feature) => (
              <article key={feature.title} className="landing-feature-card" data-reveal>
                <div className="landing-icon-shell">
                  <LandingGlyph type={feature.icon} />
                </div>
                <h3>{feature.title}</h3>
                <p>{feature.description}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="landing-section landing-shell" id="preview">
          <div className="landing-demo-shell" data-reveal>
            <div className="landing-demo-copy">
              <p className="landing-kicker">Product Preview</p>
              <h2>One interface for tasks, signals, charts, and operational decisions</h2>
              <p>
                From delivery teams to healthcare coordination, Beacon keeps the right information moving with the work.
              </p>

              <div className="landing-demo-tabs" role="tablist" aria-label="Product preview views">
                {DEMO_PANELS.map((panel) => (
                  <button
                    key={panel.id}
                    type="button"
                    className={`landing-demo-tab ${panel.id === activePanel.id ? "active" : ""}`}
                    onClick={() => setActivePanelId(panel.id)}
                  >
                    {panel.label}
                  </button>
                ))}
              </div>

              <div className="landing-demo-notes">
                {activePanel.notes.map((note) => (
                  <p key={note}>{note}</p>
                ))}
              </div>
            </div>

            <article className="landing-demo-panel">
              <div className="landing-demo-panel-head">
                <div>
                  <p>{activePanel.eyebrow}</p>
                  <h3>{activePanel.title}</h3>
                </div>
                <span className="landing-live-pill">Adaptive</span>
              </div>
              <p className="landing-demo-description">{activePanel.description}</p>

              <div className="landing-demo-stats">
                {activePanel.stats.map((stat) => (
                  <div key={stat.label} className="landing-demo-stat">
                    <span>{stat.label}</span>
                    <strong>{stat.value}</strong>
                  </div>
                ))}
              </div>

              <div className="landing-demo-chart" aria-hidden="true">
                <svg viewBox="0 0 260 110" preserveAspectRatio="none">
                  <defs>
                    <linearGradient id="beaconLineGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                      <stop offset="0%" stopColor="#67e8f9" />
                      <stop offset="50%" stopColor="#8b5cf6" />
                      <stop offset="100%" stopColor="#60a5fa" />
                    </linearGradient>
                  </defs>
                  <polyline points={buildWavePoints(activePanel.wave)} />
                </svg>
              </div>

              <div className="landing-demo-columns">
                {activePanel.columns.map((column) => (
                  <div key={column.title} className="landing-demo-column">
                    <div className="landing-demo-column-head">
                      <span>{column.title}</span>
                      <strong>{column.count}</strong>
                    </div>
                    {column.items.map((item) => (
                      <div key={item} className="landing-demo-card">
                        {item}
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            </article>
          </div>
        </section>

        <section className="landing-section landing-shell" id="workflow">
          <div className="landing-section-head" data-reveal>
            <p className="landing-kicker">How It Works</p>
            <h2>Create, assign, track, and optimize in one steady loop</h2>
            <p>Every step is designed to shorten feedback cycles and keep decisions grounded in live work.</p>
          </div>

          <div className="landing-workflow-grid">
            {WORKFLOW_STEPS.map((item) => (
              <article key={item.step} className="landing-workflow-card" data-reveal>
                <span className="landing-step-badge">{item.step}</span>
                <h3>{item.title}</h3>
                <p>{item.description}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="landing-section landing-shell" id="stack">
          <div className="landing-section-head" data-reveal>
            <p className="landing-kicker">Tech Stack</p>
            <h2>Modern foundations with the MERN stack</h2>
            <p>Beacon is positioned as a high-speed web platform built on a familiar, scalable JavaScript stack.</p>
          </div>

          <div className="landing-stack-grid">
            {STACK.map((tech) => (
              <article key={tech.name} className="landing-stack-card" data-reveal>
                <div className="landing-icon-shell landing-icon-shell-tech">
                  <LandingGlyph type={tech.icon} />
                </div>
                <div>
                  <h3>{tech.name}</h3>
                  <p>{tech.detail}</p>
                </div>
              </article>
            ))}
          </div>
        </section>

        <section className="landing-section landing-shell" id="use-cases">
          <div className="landing-section-head" data-reveal>
            <p className="landing-kicker">Use Cases</p>
            <h2>Useful across product, operations, logistics, and healthcare workflows</h2>
            <p>Beacon fits teams that need structured execution and better coordination without a bloated interface.</p>
          </div>

          <div className="landing-testimonial-grid">
            {USE_CASES.map((item) => (
              <article key={item.title} className="landing-testimonial-card" data-reveal>
                <span className="landing-metric-pill">{item.metric}</span>
                <h3>{item.title}</h3>
                <p>{item.quote}</p>
                <strong>{item.author}</strong>
              </article>
            ))}
          </div>
        </section>

        <section className="landing-section landing-shell" id="cta">
          <div className="landing-cta-card" data-reveal>
            <div>
              <p className="landing-kicker">Start Here</p>
              <h2>Start optimizing today with Beacon</h2>
              <p>
                Launch a workspace for smarter planning, cleaner execution, and sharper operational decision-making.
              </p>
            </div>

            <form className="landing-cta-form" onSubmit={handleSignupSubmit}>
              <input
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="you@team.com"
                aria-label="Email address"
              />
              <button type="submit" className="landing-primary-button">
                {isAuthenticated ? "Open Beacon" : "Create Workspace"}
              </button>
            </form>
          </div>
        </section>
      </main>

      <footer className="landing-footer landing-shell">
        <div className="landing-footer-brand">
          <img src="/beacon-icon.svg" alt="" />
          <div>
            <strong>Beacon</strong>
            <span>Agile optimization and workflow management</span>
          </div>
        </div>

        <div className="landing-footer-links">
          <a href="#features">Features</a>
          <a href="#preview">Preview</a>
          <Link to="/login">Demo</Link>
          <Link to="/signup">Signup</Link>
          <a href="https://github.com/Sparsh0508/Beacon" target="_blank" rel="noreferrer">
            GitHub
          </a>
          <a href="mailto:hello@beacon.dev">Contact</a>
        </div>
      </footer>
    </div>
  );
}

export default LandingPage;
