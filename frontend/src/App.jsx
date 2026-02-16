import { useEffect, useMemo, useState } from "react";
import {
  createEvent,
  getMyMatches,
  getProfile,
  loginUser,
  logoutUser,
  registerUser,
  runRecognition,
  uploadEventImages
} from "./api.js";

const emptyStatus = { type: "", message: "" };

const StatusBanner = ({ status }) => {
  if (!status.message) return null;
  return (
    <div className={`banner ${status.type}`}>
      <span>{status.message}</span>
    </div>
  );
};

const SectionHeader = ({ title, subtitle }) => (
  <div className="section-header">
    <h2>{title}</h2>
    <p>{subtitle}</p>
  </div>
);

const App = () => {
  const [profile, setProfile] = useState(null);
  const [status, setStatus] = useState(emptyStatus);
  const [loading, setLoading] = useState(false);
  const [eventId, setEventId] = useState("");
  const [createdEvent, setCreatedEvent] = useState(null);
  const [matches, setMatches] = useState([]);
  const [recognitionSummary, setRecognitionSummary] = useState(null);

  const isAuthed = useMemo(() => Boolean(profile?.user), [profile]);

  const setInfo = (message) => setStatus({ type: "info", message });
  const setError = (message) => setStatus({ type: "error", message });
  const clearStatus = () => setStatus(emptyStatus);

  useEffect(() => {
    const loadProfile = async () => {
      try {
        const data = await getProfile();
        setProfile(data);
      } catch (err) {
        setProfile(null);
      }
    };
    loadProfile();
  }, []);

  const handleRegister = async (event) => {
    event.preventDefault();
    clearStatus();
    setLoading(true);

    const form = new FormData(event.target);

    try {
      const data = await registerUser(form);
      setProfile({ user: data.user });
      setInfo("Registered and face enrolled successfully.");
      event.target.reset();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = async (event) => {
    event.preventDefault();
    clearStatus();
    setLoading(true);

    const form = new FormData(event.target);
    const payload = Object.fromEntries(form.entries());

    try {
      const data = await loginUser(payload);
      setProfile({ user: data.user });
      setInfo("Logged in successfully.");
      event.target.reset();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    clearStatus();
    setLoading(true);
    try {
      await logoutUser();
      setProfile(null);
      setMatches([]);
      setRecognitionSummary(null);
      setInfo("Logged out.");
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateEvent = async (event) => {
    event.preventDefault();
    clearStatus();
    setLoading(true);

    const form = new FormData(event.target);
    const payload = Object.fromEntries(form.entries());

    try {
      const data = await createEvent(payload);
      setCreatedEvent(data.event);
      setEventId(data.event._id);
      setInfo("Event created.");
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleUpload = async (event) => {
    event.preventDefault();
    clearStatus();

    if (!eventId) {
      setError("Please enter an event ID first.");
      return;
    }

    const files = Array.from(event.target.elements.images.files || []);
    if (!files.length) {
      setError("Select at least one image to upload.");
      return;
    }

    setLoading(true);
    try {
      const data = await uploadEventImages(eventId, files);
      setInfo(`Uploaded ${data.count} images.`);
      event.target.reset();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleRecognition = async () => {
    clearStatus();
    if (!eventId) {
      setError("Please enter an event ID first.");
      return;
    }

    setLoading(true);
    try {
      const data = await runRecognition(eventId);
      setRecognitionSummary(data);
      setInfo("Face recognition completed.");
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleLoadMatches = async () => {
    clearStatus();
    setLoading(true);
    try {
      const data = await getMyMatches();
      setMatches(data.matches || []);
      if (!data.matches?.length) {
        setInfo("No matches found yet.");
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="page">
      <header className="hero">
        <div>
          <span className="pill">Face Delivery Platform</span>
          <h1>Deliver the right images to the right faces.</h1>
          <p>
            Register a user with their face, upload event images, run face
            recognition, and instantly deliver matched photos back to them.
          </p>
        </div>
        <div className="hero-card">
          <h3>Session</h3>
          {isAuthed ? (
            <>
              <p className="muted">Signed in as</p>
              <p className="identity">{profile.user.name}</p>
              <button onClick={handleLogout} disabled={loading}>
                Logout
              </button>
            </>
          ) : (
            <p className="muted">Not logged in</p>
          )}
        </div>
      </header>

      <StatusBanner status={status} />

      <div className="grid">
        <section className="card">
          <SectionHeader
            title="Register with Face"
            subtitle="Store embeddings for a new user."
          />
          <form onSubmit={handleRegister} className="form">
            <label>
              Name
              <input name="name" type="text" placeholder="User name" required />
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
            <button type="submit" disabled={loading}>
              Register
            </button>
          </form>
        </section>

        <section className="card">
          <SectionHeader
            title="Login"
            subtitle="Access your matched images."
          />
          <form onSubmit={handleLogin} className="form">
            <label>
              Email
              <input name="email" type="email" required />
            </label>
            <label>
              Password
              <input name="password" type="password" required />
            </label>
            <button type="submit" disabled={loading}>
              Login
            </button>
          </form>
        </section>

        <section className="card span-2">
          <SectionHeader
            title="Create Event"
            subtitle="Generate an event to upload images into."
          />
          <form onSubmit={handleCreateEvent} className="form split">
            <label>
              Event Name
              <input name="name" type="text" placeholder="Convocation 2026" required />
            </label>
            <label>
              Society Id
              <input name="societyId" type="text" placeholder="Mongo ObjectId" required />
            </label>
            <button type="submit" disabled={loading}>
              Create Event
            </button>
          </form>
          {createdEvent && (
            <div className="note">
              Event created: <strong>{createdEvent.name}</strong> — ID: {createdEvent._id}
            </div>
          )}
        </section>

        <section className="card">
          <SectionHeader
            title="Upload Images"
            subtitle="Upload event photos for recognition."
          />
          <form onSubmit={handleUpload} className="form">
            <label>
              Event Id
              <input
                value={eventId}
                onChange={(event) => setEventId(event.target.value)}
                placeholder="Event ObjectId"
                required
              />
            </label>
            <label>
              Select Images
              <input name="images" type="file" accept="image/*" multiple required />
            </label>
            <button type="submit" disabled={loading}>
              Upload
            </button>
          </form>
        </section>

        <section className="card">
          <SectionHeader
            title="Run Recognition"
            subtitle="Match uploaded images against embeddings."
          />
          <div className="form">
            <label>
              Event Id
              <input
                value={eventId}
                onChange={(event) => setEventId(event.target.value)}
                placeholder="Event ObjectId"
                required
              />
            </label>
            <button onClick={handleRecognition} disabled={loading}>
              Start Recognition
            </button>
            {recognitionSummary && (
              <div className="note">
                {recognitionSummary.message || "Recognition complete."}
                <div className="summary">
                  <span>Matches: {recognitionSummary.matches || 0}</span>
                </div>
              </div>
            )}
          </div>
        </section>

        <section className="card span-2">
          <SectionHeader
            title="My Matched Images"
            subtitle="Images where your face was recognized."
          />
          <button onClick={handleLoadMatches} disabled={loading}>
            Load My Images
          </button>
          <div className="gallery">
            {matches.map((match) => (
              <figure key={`${match.imageUrl}-${match.createdAt}`}>
                <img src={match.imageUrl} alt="Matched" />
                <figcaption>
                  <div>{match.eventName || "Event"}</div>
                  <div className="muted">Distance: {match.distance}</div>
                </figcaption>
              </figure>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
};

export default App;
