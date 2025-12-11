import React, { useState, useEffect, useMemo, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { FiMic, FiHome, FiFileText, FiUser, FiPlus, FiMapPin, FiEdit2, FiTrash2, FiCopy, FiMoon, FiSun, FiTag, FiUpload } from "react-icons/fi";
import { useTheme } from "../context/ThemeContext";
import { highlightText } from "../utils/highlightText";
import VoiceCommandButton from "../components/VoiceCommandButton";
import LanguageSelector from "../components/LanguageSelector";
import API_CONFIG from "../config/api";
import { fetchNotes as apiFetchNotes, fetchCategories as apiFetchCategories, createCategory as apiCreateCategory, searchNotes as apiSearchNotes } from "../api/api.js";
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
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState("");
  const [uploadPercentage, setUploadPercentage] = useState(0);
  const [uploadMetadata, setUploadMetadata] = useState(null);
  const [selectedLanguage, setSelectedLanguage] = useState(() => {
    // Load language preference from localStorage, default to en-US
    return localStorage.getItem('transcriptionLanguage') || 'en-US';
  });
  const fileInputRef = useRef(null);

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

  // Save language preference to localStorage when it changes
  useEffect(() => {
    localStorage.setItem('transcriptionLanguage', selectedLanguage);
  }, [selectedLanguage]);

  const handleLanguageChange = (languageCode) => {
    setSelectedLanguage(languageCode);
  };

  // Fetch notes from backend
  const fetchNotes = async (userId, categoryId = null) => {
    const data = await apiFetchNotes(userId, categoryId);
    setNotes(data);
    setLoading(false);
  };

  // Fetch categories from backend
  const fetchCategories = async (userId) => {
    const data = await apiFetchCategories(userId);
    setCategories(data);
  };

  // Create new category
  const handleCreateCategory = async () => {
    if (!newCategoryName.trim() || !user) return;

    const category = await apiCreateCategory(user.userId, newCategoryName.trim());
    if (category) {
      setCategories([...categories, category]);
      setNewCategoryName("");
      setShowCategoryInput(false);
    }
  };

  // Search notes
  const searchNotes = async (userId, query) => {
    const result = await apiSearchNotes(userId, query);
    if (result === null) {
      // Query was empty, fetch all notes
      fetchNotes(userId);
    } else {
      setNotes(result);
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
        ? `${API_CONFIG.BACKEND_URL}/api/notes/${editingNote.id}`
        : `${API_CONFIG.BACKEND_URL}/api/notes`;
      
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
      const response = await fetch(`${API_CONFIG.BACKEND_URL}/api/notes/${noteId}`, {
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
      const response = await fetch(`${API_CONFIG.BACKEND_URL}/api/notes/${note.id}`, {
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
      const response = await fetch(`${API_CONFIG.BACKEND_URL}/api/notes/${note.id}/duplicate`, {
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
          
          // Ensure language is set, default to en-US if not
          const languageToSend = selectedLanguage || 'en-US';
          formData.append("language", languageToSend);
          
          console.log("Sending transcription request with language:", languageToSend);
          console.log("Audio blob size:", wavBlob.size, "bytes");

          try {
            const response = await fetch(`${API_CONFIG.MICROPHONE_SERVICE_URL}/transcribe`, {
              method: "POST",
              body: formData,
            });
            
            const data = await response.json();
            
            if (!response.ok) {
              console.error("Transcription error:", data);
              console.error("Response status:", response.status);
              console.error("Error details:", JSON.stringify(data, null, 2));
              alert(`Transcription error: ${data.error || data.message || "Unknown error"}`);
              return;
            }
            
            if (data.text) {
              setNoteBody(data.text);
            } else if (data.error) {
              alert("Transcription error: " + data.error);
            } else {
              alert("Unexpected response from server");
            }
          } catch (err) {
            console.error("Error sending audio to server:", err);
            alert(`Error sending audio to server: ${err.message || "Network error"}`);
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

  // Handle file upload
  const handleFileUpload = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    if (!user) {
      alert("User not found. Please login again.");
      navigate("/login");
      return;
    }

    // Validate file type
    const allowedTypes = [
      "audio/wav",
      "audio/mpeg",
      "audio/mp3",
      "audio/mp4",
      "audio/webm",
      "audio/ogg",
      "audio/flac",
      "audio/m4a",
    ];

    if (!allowedTypes.includes(file.type)) {
      alert("Please upload a valid audio file (WAV, MP3, MP4, WebM, OGG, FLAC, M4A)");
      return;
    }

    // Validate file size (16MB limit)
    if (file.size > 16 * 1024 * 1024) {
      alert("File size must be less than 16MB");
      return;
    }

    setIsUploading(true);
    setUploadProgress("Preparing upload...");
    setUploadPercentage(0);
    setUploadMetadata(null);

    // Processing progress indicator
    let processingInterval = null;
    let processingStartTime = null;
    let processingProgress = 20; // Track progress from 20% to 90%

    try {
      const formData = new FormData();
      formData.append("audio", file);
      formData.append("userId", user.userId);
      formData.append("language", selectedLanguage);

      // Use XMLHttpRequest to track actual upload progress
      const xhr = new XMLHttpRequest();
      
      const uploadPromise = new Promise((resolve, reject) => {
        xhr.upload.addEventListener('progress', (e) => {
          if (e.lengthComputable) {
            // Real upload progress: 0-20% (actual file upload to backend)
            const uploadPercent = Math.round((e.loaded / e.total) * 20);
            setUploadPercentage(uploadPercent);
            setUploadProgress(`Uploading file... ${Math.round((e.loaded / e.total) * 100)}%`);
            
            // When upload completes, start processing indicator
            if (e.loaded === e.total) {
              setUploadPercentage(20);
              setUploadProgress("Upload complete. Processing audio file...");
              processingStartTime = Date.now();
              processingProgress = 20; // Reset to 20%
              
              // Start processing progress animation (20% to 90%)
              // This gives visual feedback while waiting for Flask to complete
              const maxProcessingProgress = 90;
              const processingDuration = 60000; // 60 seconds max
              
              processingInterval = setInterval(() => {
                if (processingStartTime) {
                  const elapsed = Date.now() - processingStartTime;
                  // Gradually increase from 20% to 90% over time
                  // Cap at 90% to leave room for completion
                  const targetProgress = Math.min(
                    maxProcessingProgress,
                    20 + (elapsed / processingDuration) * 70
                  );
                  
                  processingProgress = Math.max(processingProgress, targetProgress);
                  setUploadPercentage(Math.round(processingProgress));
                  
                  // Update message based on elapsed time
                  const secondsElapsed = Math.floor(elapsed / 1000);
                  if (secondsElapsed < 5) {
                    setUploadProgress("Upload complete. Validating audio file...");
                  } else if (secondsElapsed < 15) {
                    setUploadProgress("Processing audio file... (this may take a moment)");
                  } else {
                    setUploadProgress(`Transcribing audio... (${secondsElapsed}s elapsed)`);
                  }
                }
              }, 500); // Update every 500ms
            }
          }
        });

        xhr.addEventListener('load', () => {
          // Stop processing animation
          if (processingInterval) {
            clearInterval(processingInterval);
            processingInterval = null;
          }
          
          if (xhr.status >= 200 && xhr.status < 300) {
            try {
              const data = JSON.parse(xhr.responseText);
              // Set metadata immediately when response arrives
              if (data.metadata) {
                setUploadMetadata(data.metadata);
              }
              // Show completion
              setUploadPercentage(100);
              setUploadProgress("Note created successfully!");
              resolve(data);
            } catch (e) {
              reject(new Error("Invalid response from server"));
            }
          } else {
            try {
              const errorData = JSON.parse(xhr.responseText);
              const errorMsg = errorData.message || errorData.error || errorData.details || "Failed to process audio file";
              reject(new Error(errorMsg));
            } catch (e) {
              reject(new Error(`Server error: ${xhr.status}`));
            }
          }
        });

        xhr.addEventListener('error', () => {
          if (processingInterval) {
            clearInterval(processingInterval);
            processingInterval = null;
          }
          reject(new Error("Network error occurred"));
        });

        xhr.addEventListener('abort', () => {
          if (processingInterval) {
            clearInterval(processingInterval);
            processingInterval = null;
          }
          reject(new Error("Upload cancelled"));
        });

        xhr.open('POST', `${API_CONFIG.BACKEND_URL}/api/notes/upload`);
        xhr.send(formData);
      });

      const data = await uploadPromise;

      // Store metadata for display in the progress bar
      if (data.metadata) {
        setUploadMetadata(data.metadata);
      }

      if (data.note) {
        // Add the new note to the list
        setNotes([data.note, ...notes]);
        
        // Wait a bit longer to show metadata, then close
        setTimeout(() => {
          setIsUploading(false);
          setUploadProgress("");
          setUploadPercentage(0);
          setUploadMetadata(null);
          if (fileInputRef.current) {
            fileInputRef.current.value = "";
          }
          // Optionally open the newly created note
          handleNoteClick(data.note);
        }, 2000); // Increased to 2 seconds so metadata is visible
      } else {
        // Handle case where response is OK but no note was created
        const errorMsg = data.message || data.error || "Transcription failed. No note was created.";
        throw new Error(errorMsg);
      }
    } catch (error) {
      console.error("Upload error:", error);
      // Clean up processing interval if it exists
      if (processingInterval) {
        clearInterval(processingInterval);
        processingInterval = null;
      }
      alert("Error uploading file: " + error.message);
      setIsUploading(false);
      setUploadProgress("");
      setUploadPercentage(0);
      setUploadMetadata(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  const triggerFileUpload = () => {
    fileInputRef.current?.click();
  };

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

        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
          <h1 className="page-title">What's on Your Mind?</h1>
          <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
            <LanguageSelector
              selectedLanguage={selectedLanguage}
              onLanguageChange={handleLanguageChange}
            />
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileUpload}
              accept="audio/*"
              style={{ display: "none" }}
            />
            <button
              onClick={triggerFileUpload}
              className="upload-btn"
              disabled={isUploading}
              title="Upload audio file to transcribe"
              style={{
                display: "flex",
                alignItems: "center",
                gap: "8px",
                padding: "10px 20px",
                backgroundColor: isUploading ? "#ccc" : "#007bff",
                color: "white",
                border: "none",
                borderRadius: "5px",
                cursor: isUploading ? "not-allowed" : "pointer",
                fontSize: "14px",
                fontWeight: "500",
              }}
            >
              <FiUpload />
              {isUploading ? "Processing..." : "Upload Audio"}
            </button>
          </div>
        </div>

        {isUploading && (
          <div style={{
            marginBottom: "20px",
            padding: "15px",
            backgroundColor: "var(--bg-secondary)",
            borderRadius: "8px",
            border: "1px solid var(--border-color)",
            boxShadow: "0 2px 4px var(--shadow)"
          }}>
            <div style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: "10px"
            }}>
              <span style={{ 
                fontSize: "14px", 
                color: "var(--text-primary)",
                fontWeight: "500"
              }}>
                {uploadProgress}
              </span>
              <span style={{ 
                fontSize: "14px", 
                color: "var(--text-secondary)",
                fontWeight: "600"
              }}>
                {uploadPercentage}%
              </span>
            </div>
            <div style={{
              width: "100%",
              height: "8px",
              backgroundColor: "var(--bg-tertiary)",
              borderRadius: "4px",
              overflow: "hidden",
              marginBottom: uploadMetadata ? "10px" : "0"
            }}>
              <div style={{
                width: `${uploadPercentage}%`,
                height: "100%",
                backgroundColor: "#007bff",
                borderRadius: "4px",
                transition: "width 0.3s ease",
                background: uploadPercentage === 100 
                  ? "linear-gradient(90deg, #28a745, #20c997)"
                  : "linear-gradient(90deg, #007bff, #0056b3)"
              }} />
            </div>
            {uploadMetadata && (
              <div style={{
                fontSize: "12px",
                color: "var(--text-secondary)",
                display: "flex",
                flexWrap: "wrap",
                gap: "12px",
                marginTop: "10px",
                paddingTop: "10px",
                borderTop: "1px solid var(--border-color)"
              }}>
                {uploadMetadata.fileSizeMB !== undefined && uploadMetadata.fileSizeMB !== null && (
                  <span>📁 File: {uploadMetadata.fileSizeMB} MB</span>
                )}
                {uploadMetadata.needsConversion && uploadMetadata.estimatedConversionTime !== undefined && uploadMetadata.estimatedConversionTime !== null && (
                  <span>🔄 Conversion: ~{uploadMetadata.estimatedConversionTime}s</span>
                )}
                {uploadMetadata.estimatedTranscriptionTime !== undefined && uploadMetadata.estimatedTranscriptionTime !== null && (
                  <span>🎤 Transcription: ~{uploadMetadata.estimatedTranscriptionTime}s</span>
                )}
                {uploadMetadata.estimatedTotalTime !== undefined && uploadMetadata.estimatedTotalTime !== null && (
                  <span style={{ 
                    fontWeight: "600", 
                    color: "var(--text-primary)",
                    fontSize: "13px"
                  }}>
                    ⏱️ Total: ~{uploadMetadata.estimatedTotalTime}s
                  </span>
                )}
              </div>
            )}
          </div>
        )}

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
              <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
                <LanguageSelector
                  selectedLanguage={selectedLanguage}
                  onLanguageChange={handleLanguageChange}
                />
                <button
                  className={`mic-btn ${isRecording ? "recording" : ""}`}
                  onClick={handleMicClick}
                  title={`Record audio (${selectedLanguage})`}
                >
                  <FiMic />
                </button>
              </div>
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
