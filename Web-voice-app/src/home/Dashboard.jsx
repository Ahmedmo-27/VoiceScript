import React, { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { FiMic, FiHome, FiFileText, FiUser, FiPlus, FiMapPin, FiEdit2, FiTrash2, FiCopy, FiMoon, FiSun, FiTag } from "react-icons/fi";
import { useTheme } from "../context/ThemeContext";
import { highlightText } from "../utils/highlightText";
import VoiceCommandButton from "../components/VoiceCommandButton";
import "./Dashboard.css";

export default function HomePage() {
  const navigate = useNavigate();
  const { theme, toggleTheme } = useTheme();
  const [showModal, setShowModal] = useState(false);
  const [editingNote, setEditingNote] = useState(null);
  const [noteTitle, setNoteTitle] = useState("");
  const [noteBody, setNoteBody] = useState("");
  const [noteColor, setNoteColor] = useState("#ffffff");
  const [isRecording, setIsRecording] = useState(false);
  const [mediaRecorder, setMediaRecorder] = useState(null);
  const [notes, setNotes] = useState([]);
  const [selectedNote, setSelectedNote] = useState(null);
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [hoveredNoteId, setHoveredNoteId] = useState(null);
  const [categories, setCategories] = useState([]);
  const [selectedCategoryId, setSelectedCategoryId] = useState(null);
  const [newCategoryName, setNewCategoryName] = useState("");
  const [showCategoryInput, setShowCategoryInput] = useState(false);

  // Get user from localStorage
  useEffect(() => {
    const userData = localStorage.getItem("user");
    if (userData) {
      const parsedUser = JSON.parse(userData);
      setUser(parsedUser);
      fetchNotes(parsedUser.userId);
      fetchCategories(parsedUser.userId);
    } else {
      navigate("/login");
    }
  }, [navigate]);

  // Fetch notes from backend
  const fetchNotes = async (userId, categoryId = null) => {
    try {
      const url = categoryId 
        ? `http://localhost:5001/api/notes/${userId}?categoryId=${categoryId}`
        : `http://localhost:5001/api/notes/${userId}`;
      const response = await fetch(url);
      if (response.ok) {
        const data = await response.json();
        setNotes(data);
      } else {
        console.error("Failed to fetch notes");
      }
    } catch (error) {
      console.error("Error fetching notes:", error);
    } finally {
      setLoading(false);
    }
  };

  // Fetch categories from backend
  const fetchCategories = async (userId) => {
    try {
      const response = await fetch(`http://localhost:5001/api/categories/${userId}`);
      if (response.ok) {
        const data = await response.json();
        setCategories(data);
      } else {
        console.error("Failed to fetch categories:", response.status, response.statusText);
        // If categories table doesn't exist or other error, just set empty array
        setCategories([]);
      }
    } catch (error) {
      console.error("Error fetching categories:", error);
      // Set empty array on error so app doesn't break
      setCategories([]);
    }
  };

  // Create new category
  const handleCreateCategory = async () => {
    if (!newCategoryName.trim() || !user) return;

    try {
      const response = await fetch("http://localhost:5001/api/categories", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          userId: user.userId,
          name: newCategoryName.trim(),
        }),
      });

      if (response.ok) {
        const category = await response.json();
        setCategories([...categories, category]);
        setNewCategoryName("");
        setShowCategoryInput(false);
      }
    } catch (error) {
      console.error("Error creating category:", error);
    }
  };

  // Search notes
  const searchNotes = async (userId, query) => {
    if (!query.trim()) {
      fetchNotes(userId);
      return;
    }

    try {
      const response = await fetch(`http://localhost:5001/api/notes/search/${userId}?q=${encodeURIComponent(query)}`);
      if (response.ok) {
        const data = await response.json();
        setNotes(data);
      }
    } catch (error) {
      console.error("Error searching notes:", error);
    }
  };

  // Handle search input
  const handleSearchChange = (e) => {
    const value = e.target.value;
    setSearchTerm(value);
    if (user) {
      if (value.trim()) {
        searchNotes(user.userId, value);
      } else {
        fetchNotes(user.userId, selectedCategoryId);
      }
    }
  };

  // Handle category filter
  const handleCategoryFilter = (categoryId) => {
    setSelectedCategoryId(categoryId);
    if (user) {
      fetchNotes(user.userId, categoryId);
    }
  };

  // Filter notes by pinned status
  const { pinnedNotes, regularNotes } = useMemo(() => {
    const pinned = notes.filter(note => note.pinned);
    const regular = notes.filter(note => !note.pinned);
    return { pinnedNotes: pinned, regularNotes: regular };
  }, [notes]);

  const handleSave = async () => {
    if (!noteTitle.trim()) {
      alert("Please enter a note title");
      return;
    }

    if (!user) {
      alert("User not found. Please login again.");
      navigate("/login");
      return;
    }

    try {
      const url = editingNote 
        ? `http://localhost:5001/api/notes/${editingNote.id}`
        : "http://localhost:5001/api/notes";
      
      const method = editingNote ? "PUT" : "POST";

      const response = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          userId: user.userId,
          title: noteTitle,
          content: noteBody,
          color: noteColor,
          categoryId: selectedCategoryId || null,
        }),
      });

      if (response.ok) {
        const note = await response.json();
        if (editingNote) {
          setNotes(notes.map(n => n.id === note.id ? note : n));
        } else {
          setNotes([note, ...notes]);
        }
        setShowModal(false);
        setEditingNote(null);
        setNoteTitle("");
        setNoteBody("");
        setNoteColor("#ffffff");
      } else {
        const data = await response.json();
        alert("Failed to save note: " + (data.message || "Unknown error"));
      }
    } catch (error) {
      console.error("Error saving note:", error);
      alert("Error saving note. Please try again.");
    }
  };

  const handleEdit = (note) => {
    setEditingNote(note);
    setNoteTitle(note.title);
    setNoteBody(note.content || "");
    setNoteColor(note.color || "#ffffff");
    setSelectedCategoryId(note.category_id || null);
    setShowModal(true);
  };

  const handleDelete = async (noteId) => {
    if (!window.confirm("Are you sure you want to delete this note?")) {
      return;
    }

    try {
      const response = await fetch(`http://localhost:5001/api/notes/${noteId}`, {
        method: "DELETE",
      });

      if (response.ok) {
        setNotes(notes.filter(n => n.id !== noteId));
        if (selectedNote?.id === noteId) {
          setSelectedNote(null);
        }
      } else {
        alert("Failed to delete note");
      }
    } catch (error) {
      console.error("Error deleting note:", error);
      alert("Error deleting note");
    }
  };

  const handlePin = async (note) => {
    try {
      const response = await fetch(`http://localhost:5001/api/notes/${note.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          pinned: !note.pinned,
          categoryId: note.category_id,
        }),
      });

      if (response.ok) {
        const updatedNote = await response.json();
        setNotes(notes.map(n => n.id === updatedNote.id ? updatedNote : n));
        if (selectedNote?.id === updatedNote.id) {
          setSelectedNote(updatedNote);
        }
      }
    } catch (error) {
      console.error("Error pinning note:", error);
    }
  };

  const handleDuplicate = async (note) => {
    try {
      const response = await fetch(`http://localhost:5001/api/notes/${note.id}/duplicate`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          userId: user.userId,
        }),
      });

      if (response.ok) {
        const newNote = await response.json();
        setNotes([newNote, ...notes]);
      }
    } catch (error) {
      console.error("Error duplicating note:", error);
    }
  };

  const handleNoteClick = (note) => {
    setSelectedNote(note);
  };

  const handleProfileClick = () => {
    if (user) {
      navigate("/profile");
    }
  };

  const openNewNoteModal = () => {
    setEditingNote(null);
    setNoteTitle("");
    setNoteBody("");
    setNoteColor("#ffffff");
    setShowModal(true);
  };

  // Voice command handlers
  const handleVoiceCommand = (command, param = null) => {
    switch (command) {
      case "create":
        openNewNoteModal();
        break;
      case "open":
        if (param) {
          const note = notes.find(n => 
            n.title.toLowerCase().includes(param.toLowerCase())
          );
          if (note) {
            handleNoteClick(note);
          } else {
            alert(`Note "${param}" not found`);
          }
        }
        break;
      case "deleteLast":
        if (notes.length > 0) {
          const lastNote = notes[0]; // Most recent is first
          handleDelete(lastNote.id);
        } else {
          alert("No notes to delete");
        }
        break;
      default:
        break;
    }
  };

  const handleMicClick = async () => {
    if (isRecording) {
      mediaRecorder.stop();
      setIsRecording(false);
    } else {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        alert("Your browser does not support audio recording.");
        return;
      }

      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        const recorder = new MediaRecorder(stream);
        let chunks = [];

        recorder.ondataavailable = (e) => {
          if (e.data.size > 0) chunks.push(e.data);
        };

        recorder.onstop = async () => {
          const blob = new Blob(chunks, { type: "audio/webm" });
          chunks = [];

          const arrayBuffer = await blob.arrayBuffer();
          const audioContext = new (window.AudioContext || window.webkitAudioContext)();
          const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);

          const wavBlob = encodeWAV(audioBuffer);
          const formData = new FormData();
          formData.append("audio", wavBlob, "recording.wav");

          try {
            const response = await fetch("http://127.0.0.1:5000/transcribe", {
              method: "POST",
              body: formData,
            });
            const data = await response.json();
            if (data.text) {
              setNoteBody(data.text);
            } else if (data.error) {
              alert("Transcription error: " + data.error);
            }
          } catch (err) {
            console.error(err);
            alert("Error sending audio to server");
          }
        };

        recorder.start();
        setMediaRecorder(recorder);
        setIsRecording(true);
      } catch (err) {
        console.error(err);
        alert("Error accessing microphone");
      }
    }
  };

  function encodeWAV(audioBuffer) {
    const numChannels = audioBuffer.numberOfChannels;
    const sampleRate = audioBuffer.sampleRate;
    const samples = audioBuffer.getChannelData(0);
    const buffer = new ArrayBuffer(44 + samples.length * 2);
    const view = new DataView(buffer);

    writeString(view, 0, "RIFF");
    view.setUint32(4, 36 + samples.length * 2, true);
    writeString(view, 8, "WAVE");

    writeString(view, 12, "fmt ");
    view.setUint32(16, 16, true);
    view.setUint16(20, 1, true);
    view.setUint16(22, numChannels, true);
    view.setUint32(24, sampleRate, true);
    view.setUint32(28, sampleRate * numChannels * 2, true);
    view.setUint16(32, numChannels * 2, true);
    view.setUint16(34, 16, true);

    writeString(view, 36, "data");
    view.setUint32(40, samples.length * 2, true);

    let offset = 44;
    for (let i = 0; i < samples.length; i++, offset += 2) {
      let s = Math.max(-1, Math.min(1, samples[i]));
      view.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7fff, true);
    }

    return new Blob([view], { type: "audio/wav" });
  }

  function writeString(view, offset, string) {
    for (let i = 0; i < string.length; i++) {
      view.setUint8(offset + i, string.charCodeAt(i));
    }
  }

  if (loading) {
    return (
      <div className="app-container">
        <div style={{ display: "flex", justifyContent: "center", alignItems: "center", height: "100vh" }}>
          <p>Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="app-container" data-theme={theme}>
      <aside className="sidebar">
        <h2 className="logo">LOGO</h2>
        <nav className="sidebar-links">
          <a 
            className={!selectedNote ? "active" : ""} 
            onClick={() => setSelectedNote(null)}
            style={{ cursor: "pointer" }}
          >
            <FiHome /> Home
          </a>
          {notes.map((note) => (
            <a
              key={note.id}
              className={selectedNote?.id === note.id ? "active" : ""}
              onClick={() => handleNoteClick(note)}
              style={{ cursor: "pointer" }}
            >
              <FiFileText /> {note.title}
            </a>
          ))}
        </nav>
        <button className="new-note-btn" onClick={openNewNoteModal}>
          <FiPlus /> New Note
        </button>
      </aside>

      <main className="main-content">
        <div className="top-bar">
          <input 
            type="text" 
            placeholder="Search For Notes" 
            className="search-input"
            value={searchTerm}
            onChange={handleSearchChange}
          />
          <div className="top-bar-actions">
            <button className="theme-toggle" onClick={toggleTheme} title="Toggle theme">
              {theme === "dark" ? <FiSun /> : <FiMoon />}
            </button>
            <div className="profile-icon" onClick={handleProfileClick} style={{ cursor: "pointer" }}>
              <FiUser />
            </div>
          </div>
        </div>

        {/* Category Filter */}
        <div className="category-filter">
          <button
            className={`category-btn ${selectedCategoryId === null ? "active" : ""}`}
            onClick={() => handleCategoryFilter(null)}
          >
            All Notes
          </button>
          {categories.map((category) => (
            <button
              key={category.id}
              className={`category-btn ${selectedCategoryId === category.id ? "active" : ""}`}
              onClick={() => handleCategoryFilter(category.id)}
            >
              <FiTag /> {category.name}
            </button>
          ))}
          {showCategoryInput ? (
            <div className="category-input-container">
              <input
                type="text"
                placeholder="Category name"
                value={newCategoryName}
                onChange={(e) => setNewCategoryName(e.target.value)}
                onKeyPress={(e) => {
                  if (e.key === "Enter") {
                    handleCreateCategory();
                  }
                }}
                className="category-input"
                autoFocus
              />
              <button onClick={handleCreateCategory} className="category-add-btn">Add</button>
              <button onClick={() => { setShowCategoryInput(false); setNewCategoryName(""); }} className="category-cancel-btn">Cancel</button>
            </div>
          ) : (
            <button
              className="category-btn add-category-btn"
              onClick={() => setShowCategoryInput(true)}
              title="Add Category"
            >
              <FiPlus /> Add Category
            </button>
          )}
        </div>

        <h1 className="page-title">What's on Your Mind?</h1>

        {selectedNote ? (
          <div 
            className="note-card note-detail" 
            style={{ 
              width: "100%", 
              maxWidth: "800px",
              backgroundColor: selectedNote.color || "#ffffff"
            }}
          >
            <div className="note-header">
              <div>
                <h2>{highlightText(selectedNote.title, searchTerm)}</h2>
                {selectedNote.category_name && (
                  <span className="note-category-badge">
                    <FiTag /> {selectedNote.category_name}
                  </span>
                )}
              </div>
              <div className="note-actions">
                <button onClick={() => handlePin(selectedNote)} className="action-btn" title={selectedNote.pinned ? "Unpin" : "Pin"}>
                  <FiMapPin style={{ color: selectedNote.pinned ? "#ffd700" : "inherit" }} />
                </button>
                <button onClick={() => handleEdit(selectedNote)} className="action-btn" title="Edit">
                  <FiEdit2 />
                </button>
                <button onClick={() => handleDelete(selectedNote.id)} className="action-btn" title="Delete">
                  <FiTrash2 />
                </button>
              </div>
            </div>
            <div className="note-content">
              {highlightText(selectedNote.content || "No content", searchTerm)}
            </div>
            <p className="note-meta">
              Last updated: {new Date(selectedNote.updated_at).toLocaleString()}
            </p>
          </div>
        ) : (
          <div className="notes-container">
            {pinnedNotes.length > 0 && (
              <div className="notes-section">
                <h2 className="section-title">📌 Pinned Notes</h2>
                <div className="notes-grid">
                  {pinnedNotes.map((note) => (
                    <div
                      key={note.id}
                      className="note-card"
                      style={{ backgroundColor: note.color || "#ffffff" }}
                      onClick={() => handleNoteClick(note)}
                      onMouseEnter={() => setHoveredNoteId(note.id)}
                      onMouseLeave={() => setHoveredNoteId(null)}
                    >
                      {hoveredNoteId === note.id && (
                        <div className="quick-actions">
                          <button onClick={(e) => { e.stopPropagation(); handlePin(note); }} className="quick-action-btn" title={note.pinned ? "Unpin" : "Pin"}>
                            <FiMapPin style={{ color: note.pinned ? "#ffd700" : "inherit" }} />
                          </button>
                          <button onClick={(e) => { e.stopPropagation(); handleEdit(note); }} className="quick-action-btn" title="Edit">
                            <FiEdit2 />
                          </button>
                          <button onClick={(e) => { e.stopPropagation(); handleDuplicate(note); }} className="quick-action-btn" title="Duplicate">
                            <FiCopy />
                          </button>
                          <button onClick={(e) => { e.stopPropagation(); handleDelete(note.id); }} className="quick-action-btn" title="Delete">
                            <FiTrash2 />
                          </button>
                        </div>
                      )}
                      <h2>{highlightText(note.title, searchTerm)}</h2>
                      <p>{note.content ? (note.content.length > 100 ? highlightText(note.content.substring(0, 100) + "...", searchTerm) : highlightText(note.content, searchTerm)) : "No content"}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {(pinnedNotes.length > 0 && regularNotes.length > 0) && <div className="section-divider"></div>}

            <div className="notes-section">
              {pinnedNotes.length > 0 && <h2 className="section-title">All Notes</h2>}
              <div className="notes-grid">
                {regularNotes.length === 0 && pinnedNotes.length === 0 ? (
                  <p style={{ color: "#999" }}>No notes yet. Create your first note!</p>
                ) : regularNotes.length === 0 ? null : (
                  regularNotes.map((note) => (
                    <div
                      key={note.id}
                      className="note-card"
                      style={{ backgroundColor: note.color || "#ffffff" }}
                      onClick={() => handleNoteClick(note)}
                      onMouseEnter={() => setHoveredNoteId(note.id)}
                      onMouseLeave={() => setHoveredNoteId(null)}
                    >
                      {hoveredNoteId === note.id && (
                        <div className="quick-actions">
                          <button onClick={(e) => { e.stopPropagation(); handlePin(note); }} className="quick-action-btn" title={note.pinned ? "Unpin" : "Pin"}>
                            <FiMapPin style={{ color: note.pinned ? "#ffd700" : "inherit" }} />
                          </button>
                          <button onClick={(e) => { e.stopPropagation(); handleEdit(note); }} className="quick-action-btn" title="Edit">
                            <FiEdit2 />
                          </button>
                          <button onClick={(e) => { e.stopPropagation(); handleDuplicate(note); }} className="quick-action-btn" title="Duplicate">
                            <FiCopy />
                          </button>
                          <button onClick={(e) => { e.stopPropagation(); handleDelete(note.id); }} className="quick-action-btn" title="Delete">
                            <FiTrash2 />
                          </button>
                        </div>
                      )}
                      <h2>{highlightText(note.title, searchTerm)}</h2>
                      <p>{note.content ? (note.content.length > 100 ? highlightText(note.content.substring(0, 100) + "...", searchTerm) : highlightText(note.content, searchTerm)) : "No content"}</p>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        )}
      </main>

      {showModal && (
        <div className="modal-overlay" onClick={() => { setShowModal(false); setEditingNote(null); }}>
          <div className="modal-container" onClick={(e) => e.stopPropagation()}>
            <h2 className="modal-title">{editingNote ? "Edit Note" : "Create a New Note"}</h2>

            <input
              className="modal-input"
              type="text"
              placeholder="Note Title"
              value={noteTitle}
              onChange={(e) => setNoteTitle(e.target.value)}
            />

            <textarea
              className="modal-textarea"
              placeholder="Write your note..."
              value={noteBody}
              onChange={(e) => setNoteBody(e.target.value)}
            ></textarea>

            <div className="modal-options">
              <div className="color-picker-container">
                <label>Note Color:</label>
                <input
                  type="color"
                  value={noteColor}
                  onChange={(e) => setNoteColor(e.target.value)}
                  className="color-picker"
                />
              </div>

              <div className="category-selector-container">
                <label>Category:</label>
                <select
                  value={selectedCategoryId || ""}
                  onChange={(e) => setSelectedCategoryId(e.target.value ? parseInt(e.target.value) : null)}
                  className="category-selector"
                >
                  <option value="">No Category</option>
                  {categories.map((category) => (
                    <option key={category.id} value={category.id}>
                      {category.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="modal-buttons">
              <button className="modal-btn cancel" onClick={() => { setShowModal(false); setEditingNote(null); }}>Cancel</button>
              <button
                className={`mic-btn ${isRecording ? "recording" : ""}`}
                onClick={handleMicClick}
              >
                <FiMic />
              </button>
              <button className="modal-btn save" onClick={handleSave}>Save</button>
            </div>
          </div>
        </div>
      )}

      {/* Voice Command Button */}
      <VoiceCommandButton onCommand={handleVoiceCommand} />
    </div>
  );
}
