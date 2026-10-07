import { useEffect, useMemo, useState } from "react";

import "./App.css";



const API = "http://127.0.0.1:8000";



function App() {

  // ==========================================

  // AUTH

  // ==========================================



  const [name, setName] = useState("");
const [email, setEmail] = useState("");
const [password, setPassword] = useState("");
const [message, setMessage] = useState("");
const [isRegister, setIsRegister] = useState(false);



  const [user, setUser] = useState(

    JSON.parse(localStorage.getItem("user")) || null

  );



  // ==========================================

  // ASK AI

  // ==========================================



  const [question, setQuestion] = useState("");

  const [answer, setAnswer] = useState("");

  const [sources, setSources] = useState([]);

  const [loading, setLoading] = useState(false);



  // ==========================================

  // CHAT HISTORY

  // ==========================================



  const [chatHistory, setChatHistory] = useState([]);

  const [historyLoading, setHistoryLoading] = useState(false);



  // ==========================================

  // ADMIN DOCUMENTS

  // ==========================================



  const [selectedFile, setSelectedFile] = useState(null);

  const [documents, setDocuments] = useState([]);

  const [uploading, setUploading] = useState(false);

  const [documentsLoading, setDocumentsLoading] = useState(false);



  // ==========================================

  // HELPERS

  // ==========================================



  const token = localStorage.getItem("token");



  const scrollTo = (id) => {

    document.getElementById(id)?.scrollIntoView({

      behavior: "smooth",

      block: "start",

    });

  };



  const showMessage = (text) => {

    setMessage(text);

    window.setTimeout(() => setMessage(""), 4000);

  };



  // ==========================================

  // LOGIN

  // ==========================================



  const handleLogin = async () => {

    if (!email.trim() || !password.trim()) {

      showMessage("Please enter email and password");

      return;

    }



    try {

      setMessage("");



      const response = await fetch(`${API}/login`, {

        method: "POST",

        headers: {

          "Content-Type": "application/json",

        },

        body: JSON.stringify({

          email,

          password,

        }),

      });



      const data = await response.json();



      if (!response.ok) {

        showMessage(data.detail || "Login failed");

        return;

      }



      localStorage.setItem("token", data.access_token);

      localStorage.setItem("user", JSON.stringify(data));



      setUser(data);

      setEmail("");

      setPassword("");

    } catch (error) {

      console.error(error);

      showMessage("Cannot connect to backend");

    }

  };



  // ==========================================
  // REGISTER
  // ==========================================

  const handleRegister = async () => {
    if (!name.trim() || !email.trim() || !password.trim()) {
      showMessage("Please enter name, email and password");
      return;
    }

    try {
      setMessage("");

      const response = await fetch(`${API}/register`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name,
          email,
          password,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        showMessage(data.detail || "Registration failed");
        return;
      }

      setName("");
      setEmail("");
      setPassword("");
      setIsRegister(false);
      showMessage("Registration successful. Please sign in.");
    } catch (error) {
      console.error(error);
      showMessage("Cannot connect to backend");
    }
  };

  // ==========================================
  // ASK AI
  // ==========================================



  const handleAsk = async () => {

    if (!question.trim()) {

      showMessage("Please enter a question");

      return;

    }



    try {

      setLoading(true);

      setMessage("");

      setAnswer("");

      setSources([]);



      const response = await fetch(`${API}/ask`, {

        method: "POST",

        headers: {

          "Content-Type": "application/json",

          Authorization: `Bearer ${token}`,

        },

        body: JSON.stringify({

          question,

        }),

      });



      const data = await response.json();



      if (!response.ok) {

        showMessage(data.detail || "Something went wrong");

        return;

      }



      setAnswer(data.answer || "");

      setSources(data.sources || []);

      await loadChatHistory();

    } catch (error) {

      console.error(error);

      showMessage("Cannot connect to backend");

    } finally {

      setLoading(false);

    }

  };



  // ==========================================

  // LOAD CHAT HISTORY

  // ==========================================



  const loadChatHistory = async () => {

    if (!token) return;



    try {

      setHistoryLoading(true);



      const response = await fetch(`${API}/chat-history`, {

        method: "GET",

        headers: {

          Authorization: `Bearer ${token}`,

        },

      });



      const data = await response.json();



      if (!response.ok) {

        console.error(data.detail || "Failed to load history");

        return;

      }



      setChatHistory(data.chat_history || []);

    } catch (error) {

      console.error(error);

    } finally {

      setHistoryLoading(false);

    }

  };



  // ==========================================

  // LOAD DOCUMENTS - ADMIN

  // ==========================================



  const loadDocuments = async () => {

    if (!token) return;



    try {

      setDocumentsLoading(true);



      const response = await fetch(`${API}/documents`, {

        method: "GET",

        headers: {

          Authorization: `Bearer ${token}`,

        },

      });



      const data = await response.json();



      if (!response.ok) {

        showMessage(data.detail || "Failed to load documents");

        return;

      }



      setDocuments(data.documents || []);

    } catch (error) {

      console.error(error);

      showMessage("Cannot connect to backend");

    } finally {

      setDocumentsLoading(false);

    }

  };



  // ==========================================

  // AUTO LOAD DATA

  // ==========================================



  useEffect(() => {

    if (!user || !token) return;



    loadChatHistory();



    if (user.role === "admin") {

      loadDocuments();

    }

  }, [user]);



  // ==========================================

  // UPLOAD DOCUMENT

  // ==========================================



  const handleUpload = async () => {

    if (!selectedFile) {

      showMessage("Please select a PDF file");

      return;

    }



    if (!selectedFile.name.toLowerCase().endsWith(".pdf")) {

      showMessage("Only PDF files are allowed");

      return;

    }



    try {

      setUploading(true);

      setMessage("");



      const formData = new FormData();

      formData.append("file", selectedFile);



      const response = await fetch(`${API}/documents/upload`, {

        method: "POST",

        headers: {

          Authorization: `Bearer ${token}`,

        },

        body: formData,

      });



      const data = await response.json();



      if (!response.ok) {

        showMessage(data.detail || "Upload failed");

        return;

      }



      setSelectedFile(null);

      showMessage("Document uploaded and indexed successfully");

      await loadDocuments();

    } catch (error) {

      console.error(error);

      showMessage("Cannot connect to backend");

    } finally {

      setUploading(false);

    }

  };



  // ==========================================

  // DELETE DOCUMENT

  // ==========================================



  const handleDelete = async (documentId) => {

    const confirmDelete = window.confirm(

      "Are you sure you want to delete this document?"

    );



    if (!confirmDelete) return;



    try {

      setMessage("");



      const response = await fetch(`${API}/documents/${documentId}`, {

        method: "DELETE",

        headers: {

          Authorization: `Bearer ${token}`,

        },

      });



      const data = await response.json();



      if (!response.ok) {

        showMessage(data.detail || "Delete failed");

        return;

      }



      showMessage("Document deleted successfully");

      await loadDocuments();

    } catch (error) {

      console.error(error);

      showMessage("Cannot connect to backend");

    }

  };



  // ==========================================

  // LOGOUT

  // ==========================================



  const handleLogout = () => {

    localStorage.removeItem("token");

    localStorage.removeItem("user");



    setUser(null);

    setEmail("");

    setPassword("");

    setQuestion("");

    setAnswer("");

    setSources([]);

    setChatHistory([]);

    setDocuments([]);

    setSelectedFile(null);

    setMessage("");

  };



  // ==========================================

  // DERIVED DATA

  // ==========================================



  const initials = user?.name

    ? user.name

        .split(" ")

        .map((part) => part[0])

        .join("")

        .slice(0, 2)

        .toUpperCase()

    : "?";



  const totalQuestions = chatHistory.length;



  const uniqueDocumentsInHistory = useMemo(() => {

    const set = new Set();



    chatHistory.forEach((chat) => {

      if (chat.answer) set.add(chat.id);

    });



    return set.size;

  }, [chatHistory]);



  // ==========================================

  // LOGIN SCREEN

  // ==========================================



  if (!user) {
    return (
      <div className="login-page">
        <div className="login-background-shape shape-one" />
        <div className="login-background-shape shape-two" />

        <div className="login-card">
          <div className="brand brand-center">
            <div className="brand-logo">✦</div>
            <div>
              <strong>AI Document</strong>
              <span>Assistant</span>
            </div>
          </div>

          <div className="login-heading">
            <p className="eyebrow">
              {isRegister ? "CREATE ACCOUNT" : "WELCOME BACK"}
            </p>
            <h1>
              {isRegister ? "Create your account" : "Sign in to your workspace"}
            </h1>
            <p>
              {isRegister
                ? "Register to access the AI Document Assistant."
                : "Ask questions, explore documents, and get AI-powered answers with sources."}
            </p>
          </div>

          {isRegister && (
            <div className="form-group">
              <label>Name</label>
              <input
                type="text"
                placeholder="Enter your name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleRegister()}
              />
            </div>
          )}

          <div className="form-group">
            <label>Email</label>
            <input
              type="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              onKeyDown={(e) =>
                e.key === "Enter" &&
                (isRegister ? handleRegister() : handleLogin())
              }
            />
          </div>

          <div className="form-group">
            <label>Password</label>
            <input
              type="password"
              placeholder="Enter your password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onKeyDown={(e) =>
                e.key === "Enter" &&
                (isRegister ? handleRegister() : handleLogin())
              }
            />
          </div>

          <button
            className="primary-btn login-btn"
            onClick={isRegister ? handleRegister : handleLogin}
          >
            {isRegister ? "Create Account" : "Sign In"}
            <span>→</span>
          </button>

          {message && <div className="toast toast-error">{message}</div>}

          <div className="auth-switch">
            {isRegister ? (
              <>
                <span>Already have an account?</span>
                <button
                  type="button"
                  onClick={() => {
                    setIsRegister(false);
                    setName("");
                    setEmail("");
                    setPassword("");
                    setMessage("");
                  }}
                >
                  Sign In
                </button>
              </>
            ) : (
              <>
                <span>Don't have an account?</span>
                <button
                  type="button"
                  onClick={() => {
                    setIsRegister(true);
                    setName("");
                    setEmail("");
                    setPassword("");
                    setMessage("");
                  }}
                >
                  Register
                </button>
              </>
            )}
          </div>

          <div className="login-footer">
            <span>Secure workspace</span>
            <span>•</span>
            <span>FastAPI + React + RAG</span>
          </div>
        </div>
      </div>
    );
  }

  // ==========================================
  // USER DASHBOARD
  // ==========================================



  // ==========================================



  if (user.role === "user") {

    return (

      <div className="app-shell">

        <aside className="sidebar">

          <div className="sidebar-top">

            <div className="brand">

              <div className="brand-logo">✦</div>

              <div>

                <strong>AI Document</strong>

                <span>Assistant</span>

              </div>

            </div>



            <nav className="sidebar-nav">

              <button

                className="nav-item active"

                onClick={() => scrollTo("user-ask")}

              >

                <span>⌂</span> Dashboard

              </button>



              <button

                className="nav-item"

                onClick={() => scrollTo("user-ask")}

              >

                <span>✦</span> Ask AI

              </button>



              <button

                className="nav-item"

                onClick={() => scrollTo("user-history")}

              >

                <span>◷</span> Chat History

              </button>

            </nav>

          </div>



          <div className="sidebar-bottom">

            <div className="sidebar-profile">

              <div className="avatar">{initials}</div>

              <div>

                <strong>{user.name}</strong>

                <span>User</span>

              </div>

            </div>



            <button className="logout-link" onClick={handleLogout}>

              <span>↪</span> Logout

            </button>



            <div className="sidebar-tagline">

              <span>✦</span>

              <p>Knowledge anytime, anywhere</p>

            </div>

          </div>

        </aside>



        <main className="main-content">

          <header className="topbar">

            <div />

            <div className="topbar-user">

              <span className="notification">♧</span>

              <div className="avatar avatar-small">{initials}</div>

              <div>

                <strong>{user.name}</strong>

                <span>User</span>

              </div>

            </div>

          </header>



          <section className="page-header">

            <div>

              <p className="eyebrow">AI DOCUMENT ASSISTANT</p>

              <h1>Welcome back, {user.name}! 👋</h1>

              <p>

                Ask questions and get intelligent answers from all available

                documents.

              </p>

            </div>



            <div className="date-box">

              <strong>{new Date().toLocaleDateString("en-IN", {

                weekday: "long",

                day: "2-digit",

                month: "short",

                year: "numeric",

              })}</strong>

              <span>Turn your documents into knowledge</span>

            </div>

          </section>



          <section className="stats-grid stats-grid-user">

            <div className="stat-card">

              <div className="stat-icon blue">✦</div>

              <div>

                <strong>RAG</strong>

                <span>Knowledge Engine</span>

              </div>

            </div>



            <div className="stat-card">

              <div className="stat-icon purple">?</div>

              <div>

                <strong>{totalQuestions}</strong>

                <span>Questions Asked</span>

              </div>

            </div>



            <div className="stat-card">

              <div className="stat-icon green">✓</div>

              <div>

                <strong>All</strong>

                <span>Documents Available</span>

              </div>

            </div>

          </section>



          <section className="dashboard-grid user-grid">

            <div className="panel ai-panel" id="user-ask">

              <div className="panel-header">

                <div>

                  <h2><span className="heading-icon">✦</span> Ask AI</h2>

                  <p>Ask anything about your documents.</p>

                </div>

              </div>



              <textarea

                className="question-box"

                rows="7"

                maxLength="1000"

                placeholder="Ask a question about your documents..."

                value={question}

                onChange={(e) => setQuestion(e.target.value)}

              />



              <div className="question-actions">

                <button

                  className="primary-btn ask-btn"

                  onClick={handleAsk}

                  disabled={loading}

                >

                  {loading ? "Thinking..." : "✦  Ask AI"}

                </button>



                <button

                  className="secondary-btn"

                  onClick={() => {

                    setQuestion("");

                    setAnswer("");

                    setSources([]);

                  }}

                >

                  Clear

                </button>

              </div>



              {message && <div className="inline-message">{message}</div>}

            </div>



            <div className="right-column">

              <AnswerPanel answer={answer} sources={sources} />

            </div>

          </section>



          <section className="panel history-panel" id="user-history">

            <HistoryPanel

              history={chatHistory}

              loading={historyLoading}

              onRefresh={loadChatHistory}

            />

          </section>



          <Footer />

        </main>

      </div>

    );

  }



  // ==========================================

  // ADMIN DASHBOARD

  // ==========================================



  return (

    <div className="app-shell">

      <aside className="sidebar">

        <div className="sidebar-top">

          <div className="brand">

            <div className="brand-logo">✦</div>

            <div>

              <strong>AI Document</strong>

              <span>Assistant</span>

            </div>

          </div>



          <nav className="sidebar-nav">

            <button

              className="nav-item active"

              onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}

            >

              <span>⌂</span> Dashboard

            </button>



            <button

              className="nav-item"

              onClick={() => scrollTo("admin-documents")}

            >

              <span>▤</span> Documents

            </button>



            <button

              className="nav-item"

              onClick={() => scrollTo("admin-ask")}

            >

              <span>✦</span> Ask AI

            </button>



            <button

              className="nav-item"

              onClick={() => scrollTo("admin-history")}

            >

              <span>◷</span> Chat History

            </button>

          </nav>

        </div>



        <div className="sidebar-bottom">

          <div className="sidebar-profile">

            <div className="avatar">{initials}</div>

            <div>

              <strong>{user.name}</strong>

              <span>Admin</span>

            </div>

          </div>



          <button className="logout-link" onClick={handleLogout}>

            <span>↪</span> Logout

          </button>



          <div className="sidebar-tagline">

            <span>✦</span>

            <p>Knowledge anytime, anywhere</p>

          </div>

        </div>

      </aside>



      <main className="main-content">

        <header className="topbar">

          <div />

          <div className="topbar-user">

            <span className="notification">♧</span>

            <div className="avatar avatar-small">{initials}</div>

            <div>

              <strong>{user.name}</strong>

              <span>Admin</span>

            </div>

            <span className="chevron">⌄</span>

          </div>

        </header>



        <section className="page-header">

          <div>

            <p className="eyebrow">ADMIN WORKSPACE</p>

            <h1>Welcome back, {user.name}! 👋</h1>

            <p>Manage your documents and get intelligent answers from your content.</p>

          </div>



          <div className="date-box">

            <strong>{new Date().toLocaleDateString("en-IN", {

              weekday: "long",

              day: "2-digit",

              month: "short",

              year: "numeric",

            })}</strong>

            <span>Turn your documents into knowledge</span>

          </div>

        </section>



        <section className="stats-grid">

          <div className="stat-card">

            <div className="stat-icon blue">▤</div>

            <div>

              <strong>{documents.length}</strong>

              <span>Total Documents</span>

            </div>

          </div>



          <div className="stat-card">

            <div className="stat-icon orange">✦</div>

            <div>

              <strong>{totalQuestions}</strong>

              <span>Questions Asked</span>

            </div>

          </div>



          <div className="stat-card">

            <div className="stat-icon purple">●</div>

            <div>

              <strong>Admin</strong>

              <span>Current Role</span>

            </div>

          </div>



          <div className="stat-card">

            <div className="stat-icon green">✓</div>

            <div>

              <strong>Active</strong>

              <span>RAG System</span>

            </div>

          </div>

        </section>



        <section className="dashboard-grid admin-grid">

          <div className="left-column">

            <div className="panel upload-panel">

              <div className="panel-header">

                <div>

                  <h2><span className="heading-icon">☁</span> Upload Document</h2>

                  <p>Add a PDF to your knowledge base.</p>

                </div>

              </div>



              <label className="upload-zone">

                <input

                  type="file"

                  accept=".pdf"

                  onChange={(e) => setSelectedFile(e.target.files[0] || null)}

                />



                <div className="upload-icon">↑</div>



                <strong>

                  {selectedFile

                    ? selectedFile.name

                    : "Drag & drop your PDF here"}

                </strong>



                <span>

                  {selectedFile

                    ? "Ready to upload"

                    : "or click to browse"}

                </span>



                <div className="choose-btn">

                  Choose PDF File

                </div>



                <small>Only PDF files are allowed</small>

              </label>



              <button

                className="primary-btn full-btn"

                onClick={handleUpload}

                disabled={uploading}

              >

                {uploading ? "Uploading & Indexing..." : "Upload PDF"}

              </button>

            </div>



            <div className="panel" id="admin-documents">

              <div className="panel-header panel-header-row">

                <div>

                  <h2><span className="heading-icon">▤</span> Documents</h2>

                  <p>Your indexed knowledge sources.</p>

                </div>



                <button

                  className="small-btn"

                  onClick={loadDocuments}

                  disabled={documentsLoading}

                >

                  ↻ {documentsLoading ? "Loading" : "Refresh"}

                </button>

              </div>



              {documents.length === 0 ? (

                <div className="empty-state">

                  <div>▤</div>

                  <strong>

                    {documentsLoading

                      ? "Loading documents..."

                      : "No documents yet"}

                  </strong>

                  <span>Upload a PDF to start building your knowledge base.</span>

                </div>

              ) : (

                <div className="document-list">

                  {documents.map((document) => (

                    <div className="document-card" key={document.id}>

                      <div className="pdf-icon">PDF</div>



                      <div className="document-info">

                        <strong>{document.filename}</strong>

                        <span>

                          Uploaded by: {document.uploaded_by} •{" "}

                          {document.created_at

                            ? new Date(document.created_at).toLocaleString()

                            : "Recently"}

                        </span>

                      </div>



                      <div className="document-actions">

                        <span className="document-id">

                          ID {document.id}

                        </span>



                        <button

                          className="delete-btn"

                          onClick={() => handleDelete(document.id)}

                        >

                          Delete

                        </button>

                      </div>

                    </div>

                  ))}

                </div>

              )}

            </div>

          </div>



          <div className="center-column" id="admin-ask">

            <div className="panel ai-panel">

              <div className="panel-header">

                <div>

                  <h2><span className="heading-icon">✦</span> Ask AI</h2>

                  <p>Ask anything about your documents. Get answers with sources.</p>

                </div>

              </div>



              <div className="textarea-wrap">

                <textarea

                  className="question-box"

                  rows="7"

                  maxLength="1000"

                  placeholder="Ask a question about your documents..."

                  value={question}

                  onChange={(e) => setQuestion(e.target.value)}

                />

                <span>{question.length}/1000</span>

              </div>



              <div className="question-actions">

                <button

                  className="primary-btn ask-btn"

                  onClick={handleAsk}

                  disabled={loading}

                >

                  {loading ? "Thinking..." : "✦  Ask AI"}

                </button>



                <button

                  className="secondary-btn"

                  onClick={() => {

                    setQuestion("");

                    setAnswer("");

                    setSources([]);

                  }}

                >

                  Clear

                </button>

              </div>



              {message && <div className="inline-message">{message}</div>}

            </div>



            <AnswerPanel answer={answer} sources={sources} />

          </div>



          <div className="right-column" id="admin-history">

            <div className="panel history-panel full-height">

              <HistoryPanel

                history={chatHistory}

                loading={historyLoading}

                onRefresh={loadChatHistory}

                compact

              />

            </div>

          </div>

        </section>



        <Footer />

      </main>

    </div>

  );

}



// ==========================================

// ANSWER + SOURCES

// ==========================================



function AnswerPanel({ answer, sources }) {

  return (

    <div className="answer-stack">

      <div className={`answer-card ${answer ? "has-answer" : ""}`}>

        <div className="answer-header">

          <span className="answer-icon">✦</span>

          <strong>Answer</strong>

          {answer && <span className="ai-badge">AI Generated</span>}

        </div>



        <div className="answer-body">

          {answer || "Your answer will appear here after you ask a question."}

        </div>

      </div>



      <div className="sources-card">

        <div className="sources-header">

          <span>▤</span>

          <strong>Sources</strong>

        </div>



        <div className="sources-body">

          {sources.length === 0 ? (

            <p className="muted-text">

              Sources will be shown here after an AI response.

            </p>

          ) : (

            sources.map((source, index) => (

              <div className="source-item" key={`${source.source}-${source.page}-${index}`}>

                <div className="source-file-icon">▤</div>

                <div>

                  <strong>Page {source.page}</strong>

                  <span>{source.source}</span>

                </div>

                <span className="source-arrow">↗</span>

              </div>

            ))

          )}

        </div>

      </div>

    </div>

  );

}



// ==========================================

// CHAT HISTORY

// ==========================================



function HistoryPanel({ history, loading, onRefresh, compact = false }) {

  return (

    <div>

      <div className="panel-header panel-header-row">

        <div>

          <h2><span className="heading-icon">◷</span> Chat History</h2>

          {!compact && <p>Your previous questions and AI answers.</p>}

        </div>



        <button className="small-btn" onClick={onRefresh} disabled={loading}>

          ↻ {loading ? "Loading" : "Refresh"}

        </button>

      </div>



      {history.length === 0 ? (

        <div className="empty-history">

          <div>◷</div>

          <span>Your chat history will appear here.</span>

        </div>

      ) : (

        <div className={`history-list ${compact ? "history-compact" : ""}`}>

          {history.map((chat, index) => (

            <div className={`history-item ${index === 0 ? "latest" : ""}`} key={chat.id}>

              <div className="history-icon">◌</div>



              <div className="history-content">

                <strong>{chat.question}</strong>

                <p>{chat.answer}</p>

                <small>

                  {chat.created_at

                    ? new Date(chat.created_at).toLocaleString()

                    : ""}

                </small>

              </div>

            </div>

          ))}

        </div>

      )}

    </div>

  );

}



// ==========================================

// FOOTER

// ==========================================



function Footer() {

  return (

    <footer className="footer">

      <div>

        <strong>AI Document Assistant</strong>

        <span>Turn your documents into knowledge</span>

      </div>



      <div className="footer-tech">

        Powered by <strong>FastAPI</strong>

        <span>|</span>

        <strong>React</strong>

        <span>|</span>

        <strong>RAG</strong>

        <span>|</span>

        Built with <strong>♥</strong>

      </div>

    </footer>

  );

}



export default App;
