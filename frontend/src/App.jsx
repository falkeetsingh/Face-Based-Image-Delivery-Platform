import { useEffect, useMemo, useState } from "react";
import {
  approveJoinRequest,
  createEvent,
  deleteEvent,
  deleteEventImages,
  getEventDetails,
  getRecognitionJobStatus,
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
import FloatingHeader from './components/mosaic/FloatingHeader';
import FooterSection from './components/mosaic/FooterSection';
import Masonry from './components/mosaic/Masonry';
import BlackBG from './assets/BlackBG.jpg';
import heic2any from "heic2any";
import './login.css';
import './album.css';
import './admin.css';

const emptyStatus = { type: "", message: "" };

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const convertImageToJpeg = async (file) => {
  return new Promise(async (resolve) => {
    // If not strictly an image, we still want to process if it's HEIC (some browsers lack 'image/heic' mime-type)
    const isHeic = file.type === 'image/heic' || file.type === 'image/heif' || 
                   (file.name && (file.name.toLowerCase().endsWith('.heic') || file.name.toLowerCase().endsWith('.heif')));

    if (!file || (!file.type.startsWith('image/') && !isHeic)) {
      resolve(file);
      return;
    }
    if (file.type === 'image/jpeg' || file.type === 'image/png') {
      resolve(file);
      return;
    }

    let fileToProcess = file;

    // Convert HEIC before feeding it to canvas
    if (isHeic) {
      try {
        const convertedBlob = await heic2any({ blob: file, toType: "image/jpeg", quality: 0.9 });
        const blob = Array.isArray(convertedBlob) ? convertedBlob[0] : convertedBlob;
        fileToProcess = new File([blob], file.name.replace(/\.[^/.]+$/, "") + ".jpg", {
          type: 'image/jpeg',
          lastModified: Date.now()
        });
      } catch (err) {
        console.error("HEIC Conversion error:", err);
        resolve(file); // fail-safe fallback
        return;
      }
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const MAX_DIMENSION = 1920;
        const scale = Math.min(1, MAX_DIMENSION / Math.max(img.width, img.height));
        const targetWidth = Math.max(1, Math.round(img.width * scale));
        const targetHeight = Math.max(1, Math.round(img.height * scale));

        const canvas = document.createElement('canvas');
        canvas.width = targetWidth;
        canvas.height = targetHeight;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(fileToProcess);
          return;
        }
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, 0, 0, targetWidth, targetHeight);
        canvas.toBlob((blob) => {
          if (!blob) {
            resolve(fileToProcess);
            return;
          }
          const newFile = new File([blob], fileToProcess.name.replace(/\.[^/.]+$/, "") + ".jpg", {
            type: 'image/jpeg',
            lastModified: Date.now()
          });
          resolve(newFile);
        }, 'image/jpeg', 0.9);
      };
      img.onerror = () => resolve(fileToProcess);
      img.src = e.target.result;
    };
    reader.onerror = () => resolve(fileToProcess);
    reader.readAsDataURL(fileToProcess);
  });
};

const convertImagesWithConcurrency = async (files, maxConcurrent = 3) => {
  const safeConcurrency = Math.max(1, maxConcurrent);
  const convertedFiles = new Array(files.length);
  let nextIndex = 0;

  const worker = async () => {
    while (true) {
      const currentIndex = nextIndex;
      nextIndex += 1;

      if (currentIndex >= files.length) {
        return;
      }

      convertedFiles[currentIndex] = await convertImageToJpeg(files[currentIndex]);
    }
  };

  const workers = Array.from(
    { length: Math.min(safeConcurrency, files.length) },
    () => worker()
  );

  await Promise.all(workers);
  return convertedFiles;
};

const pollRecognitionUntilFinished = async (jobId, options = {}) => {
  const intervalMs = options.intervalMs || 3000;
  const maxAttempts = options.maxAttempts || 120;

  for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
    const job = await getRecognitionJobStatus(jobId);

    if (job.status === "completed") {
      return job;
    }

    if (job.status === "failed") {
      throw new Error(job.error || "Recognition job failed.");
    }

    await sleep(intervalMs);
  }

  throw new Error("Recognition is still running. Please check again in a moment.");
};

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

  // States for Image Deleting Workflow
  const [isDeletingImages, setIsDeletingImages] = useState(false);
  const [selectedImageIds, setSelectedImageIds] = useState([]);

  // Custom states for dashboard
  const [selectedAlbum, setSelectedAlbum] = useState(null);
  const [fullScreenImage, setFullScreenImage] = useState(null);

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

    // Convert photo if present
    const imageFile = formData.get("image");
    if (imageFile && imageFile instanceof File && imageFile.name) {
      const converted = await convertImageToJpeg(imageFile);
      formData.set("image", converted);
    }

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

    // Check and convert optional cover file
    const coverFile = form.get("cover");
    if (coverFile && coverFile instanceof File && coverFile.name) {
      const converted = await convertImageToJpeg(coverFile);
      form.set("cover", converted);
    }

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
    setIsDeletingImages(false);
    setSelectedImageIds([]);
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

  const handleDeleteEvent = async (eventId) => {
    if (!window.confirm("Are you sure you want to permanently delete this event and all its associated photos? This action cannot be undone.")) {
      return;
    }
    clearStatus();
    setBusy("deleteEvent");
    try {
      await deleteEvent(eventId);
      setInfo("Event deleted successfully.");
      if (selectedEventId === eventId) {
        setSelectedEventId("");
        setEventDetails(null);
      }
      refreshEvents();
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

    let files = Array.from(event.target.elements.images.files || []);
    if (!files.length) {
      setError("Select at least one image.");
      return;
    }

    setBusy("upload");
    try {
      files = await convertImagesWithConcurrency(files, 3);

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
      const queued = await runRecognition(selectedEventId);

      if (!queued?.jobId) {
        setInfo("Recognition request accepted.");
        return;
      }

      setInfo("Recognition queued. Processing images now...");
      const finalJob = await pollRecognitionUntilFinished(queued.jobId);

      const insertedMatches = finalJob?.resultSummary?.insertedMatches || 0;
      setInfo(`Recognition completed. ${insertedMatches} new matches saved.`);

      await handleSelectEvent(selectedEventId);
      await refreshMatches();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy("");
    }
  };

  const submitDeleteImages = async () => {
    if (selectedImageIds.length === 0) return;
    if (!window.confirm("Permanently delete the selected images and all corresponding face matches?")) return;

    clearStatus();
    setBusy("deleteImages");
    try {
      await deleteEventImages(selectedEventId, selectedImageIds);
      setInfo(`${selectedImageIds.length} images deleted successfully.`);
      setIsDeletingImages(false);
      setSelectedImageIds([]);
      await handleSelectEvent(selectedEventId);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy("");
    }
  };

  const handleImageSelect = (id) => {
    setSelectedImageIds((prev) =>
      prev.includes(id) ? prev.filter(imgId => imgId !== id) : [...prev, id]
    );
  };

  const handleToggleDeleteImages = () => {
    setIsDeletingImages((prev) => !prev);
    setSelectedImageIds([]); // Clear selection when toggling mode
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

  if (!isAuthed) {
    return (
      <div className="login-page-wrapper" style={{ backgroundImage: `url(${BlackBG})` }}>
        <FloatingHeader />

        <div className="login-content">
          <div className={`login-glass-card ${authMode === "signup" ? "signup-mode" : ""}`}>
            <h2>Welcome !</h2>
            <p className="login-subtitle">
              {authMode === "signup" ? "Let's create your MOSAIC account" : "Login to access your dashboard"}
            </p>

            <StatusBanner status={status} />

            {authMode === "signup" ? (
              <form onSubmit={handleRegister} className="login-form">
                <div className="signup-grid">
                  <div className="signup-column">
                    <div className="input-group">
                      <label>Name</label>
                      <input name="name" type="text" placeholder="Full name" required />
                    </div>
                    <div className="input-group">
                      <label>Password</label>
                      <input name="password" type="password" required />
                    </div>
                    <div className="choose-society-box">
                      <span className="title">Choose society</span>
                      <div className="choose-society-radio-group">
                        <label className="choose-society-radio-item">
                          <input
                            type="radio"
                            name="societyAction"
                            value="create"
                            checked={societyAction === "create"}
                            onChange={() => setSocietyAction("create")}
                          />
                          Create a new society
                        </label>
                        <label className="choose-society-radio-item">
                          <input
                            type="radio"
                            name="societyAction"
                            value="join"
                            checked={societyAction === "join"}
                            onChange={() => setSocietyAction("join")}
                          />
                          Join an existing society
                        </label>
                      </div>
                    </div>
                  </div>

                  <div className="signup-column">
                    <div className="input-group">
                      <label>Email</label>
                      <input name="email" type="email" placeholder="name@email.com" required />
                    </div>
                    <div className="input-group">
                      <label>Face Image</label>
                      <div className="custom-file-wrapper">
                        <span className="custom-file-btn">Choose File</span>
                        <span className="custom-file-text">No file chosen</span>
                        <input name="image" type="file" accept="image/*" required />
                      </div>
                    </div>

                    {societyAction === "create" ? (
                      <div className="input-group">
                        <label>Society Name</label>
                        <input name="societyName" type="text" placeholder="Aurora Housing" required />
                      </div>
                    ) : (
                      <div className="input-group">
                        <label>Society Code</label>
                        <input name="societyCode" type="text" placeholder="6-character code" required />
                      </div>
                    )}
                  </div>
                </div>

                <div className="signup-action-area">
                  <button type="submit" className="login-btn-primary" disabled={busy === "register"}>
                    Create Account
                  </button>
                  <p className="signup-link-text" style={{ marginTop: '16px' }}>
                    Already have an account ? <span onClick={() => setAuthMode("login")}>Login here</span>
                  </p>
                </div>
              </form>
            ) : (
              <form onSubmit={handleLogin} className="login-form">
                <div className="input-group">
                  <label>Email</label>
                  <input name="email" type="email" required />
                </div>
                <div className="input-group">
                  <label>Password</label>
                  <input name="password" type="password" required />
                </div>

                <button type="submit" className="login-btn-primary" disabled={busy === "login"}>
                  Login
                </button>

                <div className="or-divider">
                  <span>or continue with</span>
                </div>

                <button type="button" className="google-btn" onClick={() => alert("Google login not connected yet.")}>
                  <svg className="google-icon" viewBox="0 0 48 48">
                    <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.7 17.74 9.5 24 9.5z" />
                    <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" />
                    <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z" />
                    <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" />
                    <path fill="none" d="M0 0h48v48H0z" />
                  </svg>
                  Continue with Google
                </button>

                <p className="signup-link-text">
                  Don't have an account ? <span onClick={() => setAuthMode("signup")}>Sign up here</span>
                </p>
              </form>
            )}
          </div>
        </div>

        <FooterSection />
      </div>
    );
  }

  if (!isAdmin && isActive) {
    if (selectedAlbum) {
      return (
        <div className="login-page-wrapper" style={{ backgroundImage: `url(${BlackBG})` }}>
          <FloatingHeader isAuthed={true} handleLogout={handleLogout} />

          <div className="login-content" style={{ padding: '120px 20px 60px 20px' }}>
            <div className="dashboard-glass-card">
              <button className="album-back-btn" onClick={() => setSelectedAlbum(null)}>
                ← Back to Dashboard
              </button>

              <div className="album-view-header">
                <div className="album-title-row">
                  <h2>{selectedAlbum.name || "Event Name"}</h2>
                  <span className="album-title-divider">|</span>
                  <span className="album-society-info">
                    By {society?.name || "{Society Name}"} : {society?.code || "{Society Code}"}
                  </span>
                </div>
                <div className="album-action-row">
                  <div className="album-date-badge">
                    Organized on : {selectedAlbum.date || "N/A"}
                  </div>
                  <button className="album-download-btn">
                    Download Album
                  </button>
                </div>
              </div>

              <div className="album-masonry-container">
                <Masonry
                  data={selectedAlbum.matches || []}
                  maxColumns={5}
                  margin={16}
                  onClick={(item) => setFullScreenImage(item.imageUrl)}
                />
              </div>
            </div>
          </div>

          <FooterSection />

          {fullScreenImage && (
            <div className="fullscreen-overlay" onClick={() => setFullScreenImage(null)}>
              <img src={fullScreenImage} className="fullscreen-img" alt="Fullscreen view" onClick={(e) => e.stopPropagation()} />
            </div>
          )}
        </div>
      );
    }

    return (
      <div className="login-page-wrapper" style={{ backgroundImage: `url(${BlackBG})` }}>
        <FloatingHeader isAuthed={true} handleLogout={handleLogout} />

        <div className="login-content" style={{ padding: '120px 20px 60px 20px' }}>
          <div className="dashboard-glass-card">

            <div className="welcome-section">
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
                <h2>Welcome {profile?.name}</h2>
                <span className="role-tag">Member</span>
              </div>
              <p>Let's find your face in thousand's of photos and get ready to post !</p>
            </div>

            <div className="dashboard-section-header">
              <h3>Browse Events</h3>
              <button onClick={refreshEvents}>See all events</button>
            </div>

            <div className="dashboard-scroll-row">
              {events.map((event) => (
                <div key={event._id} className="dashboard-card">
                  <div className="dashboard-card-image"></div>
                  <div className="dashboard-card-info">
                    <h4>{event.name}</h4>
                    <p>Date : {event.date ? new Date(event.date).toLocaleDateString() : "N/A"}</p>
                    <p>Hosted by : {society?.name} | {society?.code}</p>
                  </div>
                  <button className="dashboard-card-btn" onClick={() => {
                    handleSelectEvent(event._id);
                    // Open album view using event info (matches will be loaded via refreshMatches or handleSelectEvent if needed)
                    // For the frontend demo, we'll pass the matches we already have in groupedMatches if it matches
                    const eventMatches = groupedMatches[event.name] || [];
                    setSelectedAlbum({
                      name: event.name,
                      date: event.date ? new Date(event.date).toLocaleDateString() : "N/A",
                      matches: eventMatches
                    });
                  }}>
                    Make my album
                  </button>
                </div>
              ))}
              {events.length === 0 && <p className="muted">No events yet.</p>}
            </div>

            <div className="dashboard-section-header" style={{ marginTop: '24px' }}>
              <h3>My Albums</h3>
            </div>

            <div className="dashboard-scroll-row">
              {Object.entries(groupedMatches).map(([eventName, items]) => (
                <div key={eventName} className="dashboard-card">
                  <div className="dashboard-card-image">
                    {items[0] && <img src={items[0].imageUrl} alt="Cover" />}
                  </div>
                  <div className="dashboard-card-info">
                    <h4>{eventName}</h4>
                    <p>Date : N/A</p>
                    <p>Hosted by : {society?.name}</p>
                  </div>
                  <button className="dashboard-card-btn" onClick={() => {
                    setSelectedAlbum({
                      name: eventName,
                      date: "N/A",
                      matches: items
                    });
                  }}>
                    View Photos
                  </button>
                </div>
              ))}
              {Object.keys(groupedMatches).length === 0 && <p className="muted">No albums yet.</p>}
            </div>

          </div>
        </div>

        <FooterSection />
      </div>
    );
  }

  if (!isAdmin && !isActive) {
    return (
      <div className="login-page-wrapper" style={{ backgroundImage: `url(${BlackBG})` }}>
        <FloatingHeader isAuthed={true} handleLogout={handleLogout} />
        <div className="login-content" style={{ padding: '120px 20px 60px 20px' }}>
          <div className="dashboard-glass-card">
            <div className="welcome-section">
              <h2>Pending Approval</h2>
              <p>Your request has been sent to the society admin. You'll be notified once approved.</p>
            </div>
          </div>
        </div>
        <FooterSection />
      </div>
    );
  }

  // Admin View
  return (
    <div className="login-page-wrapper" style={{ backgroundImage: `url(${BlackBG})` }}>
      <FloatingHeader isAuthed={true} handleLogout={handleLogout} />

      <div className="login-content" style={{ padding: '120px 20px 60px 20px' }}>
        <div className="dashboard-glass-card admin-dashboard">

          <div className="welcome-section">
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
              <h2>Welcome {profile?.name || "Admin"}</h2>
              <span className="role-tag admin">Admin</span>
            </div>
            <p>Admin Dashboard | {society?.name || "Society Name"} | {society?.code || "Society Code"}</p>
          </div>

          <div className="admin-top-grid">
            <div className="admin-box">
              <h3>Join Requests</h3>
              <p className="muted">Approve or reject new members.</p>

              {joinRequests.length === 0 ? (
                <p className="muted" style={{ marginTop: 'auto', marginBottom: 'auto' }}>No pending requests.</p>
              ) : (
                <div className="request-list">
                  {joinRequests.map((request) => (
                    <div key={request.id} className="request-item">
                      <div>
                        <strong>{request.user?.name || "Unknown"}</strong>
                        <p>{request.user?.email}</p>
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
            </div>

            <div className="admin-box">
              <h3>Create Event</h3>
              <p className="muted">Launch a new event gallery for your society.</p>
              <form onSubmit={handleCreateEvent} className="form">
                <div className="input-group">
                  <label>Event Name</label>
                  <input name="name" type="text" required />
                </div>

                <div className="split-inputs">
                  <div className="input-group">
                    <label>Event Date</label>
                    <input name="date" type="date" />
                  </div>
                  <div className="input-group">
                    <label>Event Cover</label>
                    <div className="custom-file-wrapper" style={{ height: '39px', padding: '0 6px', borderColor: 'rgba(255, 255, 255, 0.3)' }}>
                      <input name="cover" type="file" accept="image/*" />
                      <div className="custom-file-btn" style={{ padding: '4px 8px', fontSize: '0.75rem', marginRight: '8px' }}>Choose File</div>
                      <div className="custom-file-text" style={{ fontSize: '0.75rem' }}>No file chosen</div>
                    </div>
                  </div>
                </div>

                <div className="input-group">
                  <label>Description</label>
                  <input name="description" type="text" />
                </div>

                <button type="submit" className="btn-pink" disabled={busy === "createEvent"}>
                  Create Event
                </button>
              </form>
            </div>
          </div>

          <hr style={{ border: 'none', borderTop: '1px solid rgba(255, 255, 255, 0.2)', marginBottom: '32px' }} />

          <div className="dashboard-section-header">
            <h3>Society Events</h3>
          </div>

          <div className="dashboard-scroll-row">
            {events.map((event) => (
              <div key={event._id} className="dashboard-card">
                <div className="dashboard-card-image"></div>
                <div className="dashboard-card-info">
                  <h4>{event.name}</h4>
                  <p>Date : {event.date ? new Date(event.date).toLocaleDateString() : "N/A"}</p>
                  <p>Hosted by : {society?.name} | {society?.code}</p>
                </div>
                <hr style={{ border: 'none', borderTop: '1px solid rgba(255, 255, 255, 0.15)', margin: 'auto -16px 0 -16px' }} />
                <div className="dashboard-card-actions">
                  <button className="dashboard-card-btn-outline" onClick={() => handleSelectEvent(event._id)}>
                    Edit Event
                  </button>
                  <button className="dashboard-card-btn-outline secondary" onClick={() => handleDeleteEvent(event._id)} disabled={busy === "deleteEvent"}>
                    Delete Event
                  </button>
                </div>
              </div>
            ))}
            {events.length === 0 && <p className="muted">No events yet.</p>}
          </div>

          {selectedEventId && (
            <div style={{ marginTop: '24px' }}>
              <div className="admin-box" style={{ padding: '32px', marginTop: '24px' }}>
                <div className="event-workspace-header-grid">
                  <div>
                    <h3 style={{ fontSize: '1.6rem', marginBottom: '8px' }}>Event Workspace : {eventDetails?.event?.name || "Event Name"}</h3>
                    <p className="muted" style={{ margin: 0, fontSize: '0.9rem' }}>Upload images, run recognition and review results</p>
                  </div>
                  <div>
                    <label style={{ fontSize: '0.85rem', color: 'rgba(255, 255, 255, 0.9)', marginBottom: '8px', display: 'block' }}>Upload / Edit Event Cover</label>
                    <div className="custom-file-wrapper" style={{ height: '39px', padding: '0 6px', borderColor: 'rgba(255, 255, 255, 0.5)', width: '250px' }}>
                      <input type="file" accept="image/*" />
                      <div className="custom-file-btn" style={{ padding: '4px 8px', fontSize: '0.8rem', marginRight: '8px', background: 'white', color: 'black' }}>Choose File</div>
                      <div className="custom-file-text" style={{ fontSize: '0.8rem' }}>No image selected</div>
                    </div>
                  </div>
                </div>

                <div className="input-group" style={{ marginBottom: '8px' }}>
                  <label style={{ fontSize: '1.1rem', color: 'white', fontWeight: 500, marginBottom: '0' }}>Upload Event Images</label>
                </div>

                <div className="event-workspace-actions-row">
                  <form onSubmit={handleUploadImages} style={{ display: 'flex', gap: '16px', alignItems: 'center', margin: 0 }}>
                    <div className="custom-file-wrapper" style={{ height: '42px', padding: '0 6px', borderColor: 'rgba(255, 255, 255, 0.5)', width: '300px' }}>
                      <input name="images" type="file" accept="image/*" multiple required />
                      <div className="custom-file-btn" style={{ padding: '6px 12px', fontSize: '0.85rem' }}>Choose File</div>
                      <div className="custom-file-text" style={{ fontSize: '0.85rem' }}>Select multiple images</div>
                    </div>
                    <button type="submit" className="btn-pink" style={{ margin: 0, background: 'white', color: 'black', padding: '10px 24px', height: '42px', borderRadius: '8px' }} disabled={busy === "upload"}>
                      Upload Images
                    </button>
                  </form>
                  <button
                    className="btn-pink"
                    style={{ margin: 0, background: 'white', color: 'black', padding: '10px 24px', height: '42px', borderRadius: '8px' }}
                    onClick={handleRecognition}
                    disabled={busy === "recognize"}
                  >
                    Start Face Recognition
                  </button>

                  <button
                    className={isDeletingImages ? "dashboard-card-btn-outline" : "btn-pink"}
                    style={{
                      margin: 0,
                      padding: '10px 24px',
                      height: '42px',
                      borderRadius: '8px',
                      color: 'white',
                      background: isDeletingImages ? 'transparent' : '#FF5A5F',
                      border: isDeletingImages ? '1px solid rgba(255,255,255,0.4)' : 'none'
                    }}
                    onClick={() => {
                      setIsDeletingImages(!isDeletingImages);
                      setSelectedImageIds([]);
                    }}
                    disabled={busy}
                  >
                    {isDeletingImages ? "Cancel Deletion" : "Delete Images"}
                  </button>

                  {isDeletingImages && selectedImageIds.length > 0 && (
                    <button
                      className="btn-pink"
                      style={{ margin: 0, background: '#B5004F', color: 'white', padding: '10px 24px', height: '42px', borderRadius: '8px' }}
                      onClick={submitDeleteImages}
                      disabled={busy === "deleteImages"}
                    >
                      Confirm Delete ({selectedImageIds.length})
                    </button>
                  )}
                </div>

                {eventDetails && (
                  <div style={{ background: 'rgba(255, 255, 255, 0.03)', borderRadius: '16px', padding: '24px', marginTop: '24px' }}>
                    <div className="summary-grid" style={{ display: 'flex', gap: '48px', marginBottom: '24px' }}>
                      <div>
                        <span className="label" style={{ color: 'rgba(255,255,255,0.6)', display: 'block', margin: '0 0 6px 0', fontSize: '0.75rem', fontWeight: 600 }}>Images</span>
                        <strong style={{ fontSize: '1.4rem' }}>{eventDetails.images?.length || 0}</strong>
                      </div>
                      <div>
                        <span className="label" style={{ color: 'rgba(255,255,255,0.6)', display: 'block', margin: '0 0 6px 0', fontSize: '0.75rem', fontWeight: 600 }}>Total Matches</span>
                        <strong style={{ fontSize: '1.4rem' }}>{eventDetails.matches?.length || 0}</strong>
                      </div>
                    </div>

                    <div className="event-workspace-images-grid">
                      {eventDetails.images?.map((img) => (
                        <div key={img._id} className="event-workspace-dashboard-card" onClick={isDeletingImages ? () => handleImageSelect(img._id) : undefined} style={{ cursor: isDeletingImages ? 'pointer' : 'default', border: isDeletingImages && selectedImageIds.includes(img._id) ? '1px solid #B5004F' : '1px solid rgba(255, 255, 255, 0.1)' }}>
                          {isDeletingImages && (
                            <input
                              type="checkbox"
                              className="image-delete-checkbox"
                              checked={selectedImageIds.includes(img._id)}
                              onChange={() => handleImageSelect(img._id)}
                            />
                          )}
                          <img src={img.imageUrl} alt="Event" style={{ width: '100%', height: '110px', objectFit: 'cover', borderRadius: '8px', marginBottom: '10px', opacity: isDeletingImages && selectedImageIds.includes(img._id) ? 0.6 : 1 }} />
                          <p className="muted" style={{ margin: '0 4px', fontSize: '0.75rem', color: 'rgba(255,255,255,0.4)' }}>Uploaded</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

        </div>
      </div>

      <FooterSection />
    </div>
  );
};

export default App;
