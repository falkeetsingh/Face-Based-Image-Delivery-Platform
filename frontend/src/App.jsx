import { useEffect, useMemo, useState } from "react";
import {
  approveJoinRequest,
  createEvent,
  getEventDetails,
  getMyMatches,
  getProfile,
  getSociety,
  listEvents,
  listJoinRequests,
  loginUser,
  logoutUser,
  registerUser,
  rejectJoinRequest,
  runRecognition,
  uploadEventImages
} from "./api.js";

const emptyStatus = { type: "", message: "" };

const StatusBanner = ({ status }) => {
  if (!status.message) return null;
  return (
    <div className={`banner ${status.type}`} role="status">
      <span>{status.message}</span>
    </div>
  );
};

const SectionHeader = ({ title, subtitle, action }) => (
  <div className="section-header">
    <div>
      <h2>{title}</h2>
      <p>{subtitle}</p>
    </div>
    {action ? <div className="section-action">{action}</div> : null}
  </div>
);

const App = () => {
  const [profile, setProfile] = useState(null);
  const [society, setSociety] = useState(null);
  const [status, setStatus] = useState(emptyStatus);
  const [busy, setBusy] = useState("");
  const [authMode, setAuthMode] = useState("login");
  const [societyAction, setSocietyAction] = useState("create");
  const [joinRequests, setJoinRequests] = useState([]);
  const [events, setEvents] = useState([]);
  const [selectedEventId, setSelectedEventId] = useState("");
  const [eventDetails, setEventDetails] = useState(null);
  const [matches, setMatches] = useState([]);

  const isAuthed = Boolean(profile?.id);
  const isAdmin = profile?.role === "admin";
  const isActive = profile?.status === "active";

  const setInfo = (message) => setStatus({ type: "info", message });
  const setError = (message) => setStatus({ type: "error", message });
  const clearStatus = () => setStatus(emptyStatus);

  const normalizeUser = (user) => {
    if (!user) return null;
    return { ...user, id: user.id || user._id };
  };

  const loadProfile = async () => {
    try {
      const data = await getProfile();
      setProfile(normalizeUser(data.user));
      setSociety(data.society || null);
      return data.user;
    } catch (err) {
      setProfile(null);
      setSociety(null);
      return null;
    }
  };

  const loadSociety = async () => {
    try {
      const data = await getSociety();
      setSociety(data.society || null);
    } catch (err) {
      setSociety(null);
    }
  };

  const refreshEvents = async () => {
    const data = await listEvents();
    setEvents(data.events || []);
    return data.events || [];
  };

  const refreshRequests = async () => {
    const data = await listJoinRequests();
    setJoinRequests(data.requests || []);
  };

  const refreshMatches = async () => {
    const data = await getMyMatches();
    setMatches(data.matches || []);
  };

  useEffect(() => {
    loadProfile();
  }, []);

  useEffect(() => {
    if (!isAuthed) return;
    loadSociety();

    if (isActive) {
      refreshEvents();
      refreshMatches();
    }

    if (isAdmin && isActive) {
      refreshRequests();
    }
  }, [isAuthed, isActive, isAdmin]);

  const handleRegister = async (event) => {
    event.preventDefault();
    clearStatus();
    setBusy("register");

    const formData = new FormData(event.target);
    formData.set("societyAction", societyAction);

    try {
      const data = await registerUser(formData);
      setProfile(normalizeUser(data.user));
      setSociety(data.society || null);

      if (data.user?.status === "pending") {
        setInfo("Join request sent. Waiting for admin approval.");
      } else {
        setInfo("Registration complete. Society created successfully.");
      }

      event.target.reset();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy("");
    }
  };

  const handleLogin = async (event) => {
    event.preventDefault();
    clearStatus();
    setBusy("login");

    const form = new FormData(event.target);
    const payload = Object.fromEntries(form.entries());

    try {
      const data = await loginUser(payload);
      setProfile(normalizeUser(data.user));
      setSociety(data.society || null);
      setInfo("Logged in successfully.");
      event.target.reset();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy("");
    }
  };

  const handleLogout = async () => {
    clearStatus();
    setBusy("logout");
    try {
      await logoutUser();
      setProfile(null);
      setSociety(null);
      setJoinRequests([]);
      setEvents([]);
      setSelectedEventId("");
      setEventDetails(null);
      setMatches([]);
      setInfo("Logged out.");
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy("");
    }
  };

  const handleCreateEvent = async (event) => {
    event.preventDefault();
    clearStatus();
    setBusy("createEvent");

    const form = new FormData(event.target);
    const payload = Object.fromEntries(form.entries());

    try {
      const data = await createEvent(payload);
      setInfo("Event created.");
      await refreshEvents();
      setSelectedEventId(data.event?._id || "");
      event.target.reset();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy("");
    }
  };

  const handleSelectEvent = async (eventId) => {
    setSelectedEventId(eventId);
    setBusy("eventDetails");
    try {
      const data = await getEventDetails(eventId);
      setEventDetails(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy("");
    }
  };

  const handleUploadImages = async (event) => {
    event.preventDefault();
    clearStatus();

    if (!selectedEventId) {
      setError("Select an event first.");
      return;
    }

    const files = Array.from(event.target.elements.images.files || []);
    if (!files.length) {
      setError("Select at least one image.");
      return;
    }

    setBusy("upload");
    try {
      const data = await uploadEventImages(selectedEventId, files);
      setInfo(`Uploaded ${data.count} images.`);
      await handleSelectEvent(selectedEventId);
      event.target.reset();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy("");
    }
  };

  const handleRecognition = async () => {
    clearStatus();

    if (!selectedEventId) {
      setError("Select an event first.");
      return;
    }

    setBusy("recognize");
    try {
      await runRecognition(selectedEventId);
      setInfo("Face recognition completed.");
      await handleSelectEvent(selectedEventId);
      await refreshMatches();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy("");
    }
  };

  const handleRequestAction = async (requestId, action) => {
    clearStatus();
    setBusy(`request-${requestId}`);
    try {
      if (action === "approve") {
        await approveJoinRequest(requestId);
        setInfo("User approved.");
      } else {
        await rejectJoinRequest(requestId);
        setInfo("User rejected.");
      }
      await refreshRequests();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy("");
    }
  };

  const groupedMatches = useMemo(() => {
    return matches.reduce((acc, match) => {
      const key = match.eventName || "Event";
      if (!acc[key]) acc[key] = [];
      acc[key].push(match);
      return acc;
    }, {});
  }, [matches]);

  return (
    <div className="page">
      <header className="hero">
        <div className="hero-copy">
          <span className="pill">Face-Based Image Delivery</span>
          <h1>Find every photo that belongs to you.</h1>
          <p>
            Secure event galleries powered by face recognition. Create or join a
            society, upload event images, and let the platform deliver matched
            photos to every member.
          </p>
          {!isAuthed && (
            <div className="hero-actions">
              <button
                className={authMode === "login" ? "primary" : "ghost"}
                onClick={() => setAuthMode("login")}
              >
                Login
              </button>
              <button
                className={authMode === "signup" ? "primary" : "ghost"}
                onClick={() => setAuthMode("signup")}
              >
                Sign Up
              </button>
            </div>
          )}
        </div>
        <div className="hero-card">
          <h3>Session</h3>
          {isAuthed ? (
            <>
              <p className="muted">Signed in as</p>
              <p className="identity">{profile.name}</p>
              <div className="chip-group">
                <span className="chip">{profile.role || "member"}</span>
                <span className={`chip ${profile.status}`}>{profile.status}</span>
              </div>
              <button onClick={handleLogout} disabled={busy === "logout"}>
                Logout
              </button>
            </>
          ) : (
            <p className="muted">Start by creating or joining a society.</p>
          )}
        </div>
      </header>

      <StatusBanner status={status} />

      {!isAuthed && (
        <section className="card wide">
          <SectionHeader
            title={authMode === "signup" ? "Create your account" : "Welcome back"}
            subtitle={
              authMode === "signup"
                ? "Enroll your face and choose a society to continue."
                : "Log in to access your dashboard."
            }
          />

          {authMode === "signup" ? (
            <form onSubmit={handleRegister} className="form split">
              <label>
                Name
                <input name="name" type="text" placeholder="Full name" required />
              </label>
              <label>
                Email
                <input name="email" type="email" placeholder="name@email.com" required />
              </label>
              <label>
                Password
                <input name="password" type="password" required />
              </label>
              <label>
                Face Image
                <input name="image" type="file" accept="image/*" required />
              </label>

              <div className="radio-group">
                <span className="label">Choose society</span>
                <label className="radio-item">
                  <input
                    type="radio"
                    name="societyAction"
                    value="create"
                    checked={societyAction === "create"}
                    onChange={() => setSocietyAction("create")}
                  />
                  Create a new society
                </label>
                <label className="radio-item">
                  <input
                    type="radio"
                    name="societyAction"
                    value="join"
                    checked={societyAction === "join"}
                    onChange={() => setSocietyAction("join")}
                  />
                  Join existing society
                </label>
              </div>

              {societyAction === "create" ? (
                <label>
                  Society Name
                  <input name="societyName" type="text" placeholder="Aurora Housing" required />
                </label>
              ) : (
                <label>
                  Society Code
                  <input name="societyCode" type="text" placeholder="6-character code" required />
                </label>
              )}

              <button type="submit" disabled={busy === "register"}>
                Create Account
              </button>
            </form>
          ) : (
            <form onSubmit={handleLogin} className="form">
              <label>
                Email
                <input name="email" type="email" required />
              </label>
              <label>
                Password
                <input name="password" type="password" required />
              </label>
              <button type="submit" disabled={busy === "login"}>
                Login
              </button>
            </form>
          )}
        </section>
      )}

      {isAuthed && (
        <section className="dashboard">
          <div className="dashboard-header">
            <div>
              <h2>Society Dashboard</h2>
              <p className="muted">
                {society
                  ? `${society.name} · Code ${society.code}`
                  : "No society assigned"}
              </p>
            </div>
            {profile.status === "pending" && (
              <span className="status-pill">Awaiting admin approval</span>
            )}
          </div>

          {!isActive && (
            <div className="card">
              <SectionHeader
                title="Pending Approval"
                subtitle="Your request has been sent to the society admin. You'll be notified once approved."
              />
            </div>
          )}

          {isActive && (
            <div className="grid">
              {isAdmin && (
                <section className="card">
                  <SectionHeader
                    title="Join Requests"
                    subtitle="Approve or reject new members."
                  />
                  {joinRequests.length === 0 ? (
                    <p className="muted">No pending requests.</p>
                  ) : (
                    <div className="request-list">
                      {joinRequests.map((request) => (
                        <div key={request.id} className="request-item">
                          <div>
                            <strong>{request.user?.name || "Unknown"}</strong>
                            <p className="muted">{request.user?.email}</p>
                          </div>
                          <div className="request-actions">
                            <button
                              className="ghost"
                              onClick={() => handleRequestAction(request.id, "reject")}
                              disabled={busy === `request-${request.id}`}
                            >
                              Reject
                            </button>
                            <button
                              onClick={() => handleRequestAction(request.id, "approve")}
                              disabled={busy === `request-${request.id}`}
                            >
                              Approve
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </section>
              )}

              {isAdmin && (
                <section className="card">
                  <SectionHeader
                    title="Create Event"
                    subtitle="Launch a new event gallery for your society."
                  />
                  <form onSubmit={handleCreateEvent} className="form">
                    <label>
                      Event Name
                      <input name="name" type="text" placeholder="Convocation 2026" required />
                    </label>
                    <label>
                      Event Date
                      <input name="date" type="date" />
                    </label>
                    <label>
                      Description
                      <textarea name="description" rows="3" placeholder="Event details" />
                    </label>
                    <button type="submit" disabled={busy === "createEvent"}>
                      Create Event
                    </button>
                  </form>
                </section>
              )}

              <section className="card span-2">
                <SectionHeader
                  title="Society Events"
                  subtitle="Browse events and view matched results."
                  action={
                    <button
                      className="ghost"
                      onClick={() => refreshEvents()}
                      disabled={busy === "eventDetails"}
                    >
                      Refresh
                    </button>
                  }
                />
                {events.length === 0 ? (
                  <p className="muted">No events created yet.</p>
                ) : (
                  <div className="event-list">
                    {events.map((event) => (
                      <button
                        key={event._id}
                        className={`event-item ${selectedEventId === event._id ? "active" : ""}`}
                        onClick={() => handleSelectEvent(event._id)}
                        disabled={busy === "eventDetails"}
                      >
                        <span>{event.name}</span>
                        <span className="muted">
                          {event.date ? new Date(event.date).toLocaleDateString() : "No date"}
                        </span>
                      </button>
                    ))}
                  </div>
                )}
              </section>

              {selectedEventId && (
                <section className="card span-2">
                  <SectionHeader
                    title="Event Workspace"
                    subtitle="Upload images, run recognition, and review results."
                  />
                  {isAdmin && (
                    <div className="event-actions">
                      <form onSubmit={handleUploadImages} className="form">
                        <label>
                          Upload Event Images
                          <input name="images" type="file" accept="image/*" multiple required />
                        </label>
                        <button type="submit" disabled={busy === "upload"}>
                          Upload Images
                        </button>
                      </form>
                      <button
                        className="primary"
                        onClick={handleRecognition}
                        disabled={busy === "recognize"}
                      >
                        Start Face Recognition
                      </button>
                    </div>
                  )}

                  {eventDetails && (
                    <div className="event-details">
                      <div className="event-summary">
                        <div>
                          <h3>{eventDetails.event?.name}</h3>
                          <p className="muted">{eventDetails.event?.description || "No description"}</p>
                        </div>
                        <div className="summary-grid">
                          <div>
                            <span className="label">Images</span>
                            <strong>{eventDetails.images?.length || 0}</strong>
                          </div>
                          <div>
                            <span className="label">Matches</span>
                            <strong>{eventDetails.matches?.length || 0}</strong>
                          </div>
                        </div>
                      </div>

                      {isAdmin && (
                        <div className="gallery">
                          {eventDetails.images?.map((img) => (
                            <figure key={img._id}>
                              <img src={img.imageUrl} alt="Event" />
                              <figcaption>
                                <div className="muted">Uploaded</div>
                              </figcaption>
                            </figure>
                          ))}
                        </div>
                      )}

                      <div className="match-list">
                        {(eventDetails.matches || []).map((match) => (
                          <div key={match.id} className="match-item">
                            <img src={match.imageUrl} alt="Match" />
                            <div>
                              <div>{match.user?.name || "You"}</div>
                              <div className="muted">Distance: {match.distance}</div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </section>
              )}

              {!isAdmin && (
                <section className="card span-2">
                  <SectionHeader
                    title="My Photos"
                    subtitle="Only the images where your face was matched."
                    action={
                      <button className="ghost" onClick={refreshMatches}>
                        Refresh
                      </button>
                    }
                  />
                  {Object.keys(groupedMatches).length === 0 ? (
                    <p className="muted">No matches found yet.</p>
                  ) : (
                    <div className="match-groups">
                      {Object.entries(groupedMatches).map(([eventName, items]) => (
                        <div key={eventName} className="match-group">
                          <h4>{eventName}</h4>
                          <div className="gallery">
                            {items.map((match) => (
                              <figure key={`${match.imageUrl}-${match.createdAt}`}>
                                <img src={match.imageUrl} alt="Matched" />
                                <figcaption>
                                  <div className="muted">Distance: {match.distance}</div>
                                </figcaption>
                              </figure>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </section>
              )}
            </div>
          )}
        </section>
      )}
    </div>
  );
};

export default App;
