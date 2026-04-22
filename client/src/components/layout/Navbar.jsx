import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { invitationApi } from "../../api/axios.js";
import Button from "../common/Button.jsx";
import { useAuth } from "../../hooks/useAuth.js";
import { useLiveRefresh } from "../../hooks/useLiveRefresh.js";
import { buildUserChannel, LIVE_CHANNELS } from "../../realtime/liveChannels.js";

const formatPathPart = (part) =>
  part
    .replace(/-/g, " ")
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/\b\w/g, (char) => char.toUpperCase());

function Navbar() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout } = useAuth();
  const [pendingInvites, setPendingInvites] = useState(0);

  const crumbs = useMemo(() => {
    const segments = location.pathname.split("/").filter((segment) => segment && segment !== "app");
    if (segments.length === 0) {
      return ["Dashboard"];
    }
    return ["Dashboard", ...segments.map(formatPathPart)];
  }, [location.pathname]);

  const displayDate = useMemo(
    () =>
      new Intl.DateTimeFormat("en-US", {
        weekday: "long",
        month: "short",
        day: "numeric",
        year: "numeric",
      }).format(new Date()),
    [],
  );

  const initials =
    user?.name
      ?.split(" ")
      .map((part) => part.charAt(0))
      .slice(0, 2)
      .join("")
      .toUpperCase() ?? "U";

  const loadInvites = useCallback(async () => {
    if (!user?.id) {
      setPendingInvites(0);
      return;
    }

    const data = await invitationApi.getMyInvitations(user.id);
    setPendingInvites(data.filter((invite) => invite.status === "PENDING").length);
  }, [user]);

  useEffect(() => {
    let isMounted = true;

    const syncPendingInvites = async () => {
      try {
        await loadInvites();
      } catch {
        if (isMounted) {
          setPendingInvites(0);
        }
      }
    };

    syncPendingInvites();

    return () => {
      isMounted = false;
    };
  }, [loadInvites, location.pathname]);

  useLiveRefresh(loadInvites, {
    enabled: Boolean(user?.id),
    channels: [LIVE_CHANNELS.invitations, buildUserChannel(user?.id)],
  });

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  return (
    <header className="topbar">
      <div>
        <p className="crumb-line">{crumbs.join(" / ")}</p>
        <h2 className="topbar-date">{displayDate}</h2>
      </div>

      <div className="topbar-actions">
        <Button as={Link} to="/app/invitations" variant="ghost" size="sm">
          Invites {pendingInvites > 0 ? `(${pendingInvites})` : ""}
        </Button>
        <div className="user-pill">
          <span className="avatar-badge">{initials}</span>
          <div>
            <strong>{user?.name ?? "Beacon User"}</strong>
            <p>
              {user?.role ?? "MANAGER"} | ID: {user?.uniqueCode ?? "N/A"}
            </p>
          </div>
        </div>
        <Button variant="ghost" size="sm" onClick={handleLogout}>
          Logout
        </Button>
      </div>
    </header>
  );
}

export default Navbar;
