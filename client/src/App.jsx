import { useEffect } from "react";
import AppRoutes from "./routes/AppRoutes.jsx";

function App() {
  useEffect(() => {
    let rafId = 0;

    const updateCursorGlow = (event) => {
      if (rafId) {
        cancelAnimationFrame(rafId);
      }
      const { clientX, clientY } = event;
      rafId = requestAnimationFrame(() => {
        document.documentElement.style.setProperty("--cursor-x", `${clientX}px`);
        document.documentElement.style.setProperty("--cursor-y", `${clientY}px`);
      });
    };

    window.addEventListener("mousemove", updateCursorGlow, { passive: true });

    return () => {
      if (rafId) {
        cancelAnimationFrame(rafId);
      }
      window.removeEventListener("mousemove", updateCursorGlow);
    };
  }, []);

  return <AppRoutes />;
}

export default App;
