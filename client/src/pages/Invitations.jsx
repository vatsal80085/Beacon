import { useCallback, useEffect, useMemo, useState } from "react";
import { invitationApi } from "../api/axios.js";
import Button from "../components/common/Button.jsx";
import Card from "../components/common/Card.jsx";
import { useAuth } from "../hooks/useAuth.js";
import { formatDate } from "../utils/formatters.js";

function Invitations() {
  const { user } = useAuth();
  const [invitations, setInvitations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [processingId, setProcessingId] = useState("");

  const loadInvitations = useCallback(async () => {
    if (!user?.id) {
      return;
    }
    const data = await invitationApi.getMyInvitations(user.id);
    setInvitations(data);
  }, [user?.id]);

  useEffect(() => {
    let isMounted = true;

    const initialize = async () => {
      try {
        await loadInvitations();
      } catch {
        if (isMounted) {
          setError("Could not load invitations.");
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    initialize();

    return () => {
      isMounted = false;
    };
  }, [loadInvitations]);

  const pendingInvites = useMemo(
    () => invitations.filter((invite) => invite.status === "PENDING"),
    [invitations],
  );

  const historyInvites = useMemo(
    () => invitations.filter((invite) => invite.status !== "PENDING"),
    [invitations],
  );

  const handleResponse = async (invitationId, action) => {
    if (!user?.id) {
      return;
    }
    setProcessingId(invitationId);
    setError("");
    try {
      await invitationApi.respondToInvitation(invitationId, user.id, action);
      await loadInvitations();
    } catch {
      setError("Could not update invitation status.");
    } finally {
      setProcessingId("");
    }
  };

  if (loading) {
    return (
      <div className="page">
        <Card title="Loading Invitations" interactive={false}>
          <p className="text-muted">Fetching your project invitations...</p>
        </Card>
      </div>
    );
  }

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <p className="eyebrow">Membership Inbox</p>
          <h1 className="page-title">Invitations</h1>
          <p className="page-subtitle">
            Your unique user ID is <strong>{user?.uniqueCode ?? "N/A"}</strong>. Share this with project leaders.
          </p>
        </div>
      </div>

      {error ? <p className="form-error">{error}</p> : null}

      <Card title="Pending Invitations" subtitle={`${pendingInvites.length} awaiting your response`} interactive={false}>
        {pendingInvites.length === 0 ? (
          <p className="text-muted">No pending invitations.</p>
        ) : (
          <div className="invite-list">
            {pendingInvites.map((invite) => (
              <article key={invite.id} className="invite-row">
                <div>
                  <h4>{invite.project?.name ?? "Project"}</h4>
                  <p>
                    Invited by {invite.inviter?.name ?? "Unknown"} as {invite.role}
                  </p>
                  <span>Received {formatDate(invite.createdAt)}</span>
                </div>
                <div className="invite-actions">
                  <Button
                    type="button"
                    size="sm"
                    variant="primary"
                    loading={processingId === invite.id}
                    onClick={() => handleResponse(invite.id, "accept")}
                  >
                    Accept
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="danger"
                    loading={processingId === invite.id}
                    onClick={() => handleResponse(invite.id, "decline")}
                  >
                    Decline
                  </Button>
                </div>
              </article>
            ))}
          </div>
        )}
      </Card>

      <Card title="Invitation History" subtitle={`${historyInvites.length} responded invitations`} interactive={false}>
        {historyInvites.length === 0 ? (
          <p className="text-muted">No invitation history yet.</p>
        ) : (
          <div className="invite-list">
            {historyInvites.map((invite) => (
              <article key={invite.id} className="invite-row">
                <div>
                  <h4>{invite.project?.name ?? "Project"}</h4>
                  <p>
                    Role {invite.role} | Invited by {invite.inviter?.name ?? "Unknown"}
                  </p>
                  <span>
                    {invite.status} on {formatDate(invite.respondedAt ?? invite.createdAt)}
                  </span>
                </div>
                <span className={`badge ${invite.status === "ACCEPTED" ? "status-completed" : "status-blocked"}`}>
                  {invite.status}
                </span>
              </article>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}

export default Invitations;
