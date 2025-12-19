import React, { useState, useEffect, useMemo, useRef } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { FiMic, FiHome, FiFileText, FiUser, FiLogOut, FiPlus, FiMapPin, FiEdit2, FiTrash2, FiCopy, FiMoon, FiSun, FiTag, FiUpload } from "react-icons/fi";
import { useTheme } from "../context/ThemeContext";
import { highlightText } from "../utils/highlightText";
import VoiceCommandButton from "../components/VoiceCommandButton";
import LanguageSelector from "../components/LanguageSelector";
import API_CONFIG from "../config/api";
import { fetchNotes as apiFetchNotes, fetchCategories as apiFetchCategories, createCategory as apiCreateCategory, searchNotes as apiSearchNotes } from "../api/api.js";
import "./Dashboard.css";

export default function HomePage() {
  const navigate = useNavigate();
  const location = useLocation();
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
  const [editingCategoryId, setEditingCategoryId] = useState(null);
  const [editingCategoryName, setEditingCategoryName] = useState("");
  const [hoveredCategoryId, setHoveredCategoryId] = useState(null);
  const [showColorPicker, setShowColorPicker] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const [toasts, setToasts] = useState([]);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [itemToDelete, setItemToDelete] = useState({ type: null, id: null, name: null });
  const [uploadProgress, setUploadProgress] = useState("");
  const [uploadPercentage, setUploadPercentage] = useState(0);
  const [uploadMetadata, setUploadMetadata] = useState(null);
  const [draggedNote, setDraggedNote] = useState(null);
  const [dragOverSection, setDragOverSection] = useState(null);
  const [dragOverCategoryId, setDragOverCategoryId] = useState(null);
  const [showFeedbackModal, setShowFeedbackModal] = useState(false);
  const [wantToProvideFeedback, setWantToProvideFeedback] = useState(false);
  const [feedbackData, setFeedbackData] = useState({
    totalWords: 0,
    errorCount: 0,
    errorWords: "",
    feedbackType: "positive"
  });
  const [savedNoteId, setSavedNoteId] = useState(null);
  const [audioStream, setAudioStream] = useState(null);
  const [audioLevels, setAudioLevels] = useState([]);
  const [analyserNode, setAnalyserNode] = useState(null);
  const animationFrameRef = useRef(null);
  const audioContextRef = useRef(null);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const abortControllerRef = useRef(null);
  const timeoutRef = useRef(null);

  const [selectedLanguage, setSelectedLanguage] = useState(() => {
    // Load language preference from localStorage, default to en-US
    return localStorage.getItem('transcriptionLanguage') || 'en-US';
  });
  const fileInputRef = useRef(null);

  // Get user from session
  useEffect(() => {
    // Only run this effect if we're on the dashboard route (not admin or other routes)
    if (location.pathname !== '/') {
      return;
    }

    const fetchUser = async () => {
      try {
        const response = await fetch(`${API_CONFIG.BACKEND_URL}/api/me`, {
          credentials: "include",
        });

        if (!response.ok) {
          navigate("/login", { replace: true });
          return;
        }

        const userData = await response.json();
        const userRole = userData.role || 'user';
        
        // Redirect admin users to admin dashboard
        if (userRole === 'admin') {
          navigate("/admin", { replace: true });
          return;
        }
        
        // Regular users continue to dashboard
        setUser({
          userId: userData.userId,
          username: userData.username,
          email: userData.email
        });
        fetchNotes(userData.userId);
        fetchCategories(userData.userId);
        setLoading(false);
      } catch (error) {
        console.error("Error fetching user:", error);
        navigate("/login", { replace: true });
      }
    };

    fetchUser();
  }, [navigate, location.pathname]);
  //  Keyboard Shortcuts
  useEffect(() => {
    const handleKeyDown = (e) => {
      // N -> 3shan new note
      if (e.key === "n" && !e.ctrlKey && !e.metaKey && !showModal) {
        e.preventDefault();
        openNewNoteModal();
      }

      // CTRL+K -> 3shan search
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        const searchInput = document.querySelector(".search-input");
        if (searchInput) searchInput.focus();
      }

      // CTRL+S -> 3shan save (only when modal is open)
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "s" && showModal) {
        e.preventDefault();
        handleSave();
      }
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [showModal]);

  // Save language preference to localStorage when it changes
  useEffect(() => {
    localStorage.setItem('transcriptionLanguage', selectedLanguage);
  }, [selectedLanguage]);

  // Close color picker when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (showColorPicker && !event.target.closest('.color-picker-container') && !event.target.closest('.color-picker-popup')) {
        setShowColorPicker(null);
      }
    };

    if (showColorPicker) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => {
        document.removeEventListener('mousedown', handleClickOutside);
      };
    }
  }, [showColorPicker]);

  // Audio visualization animation - More dynamic and sensitive
  useEffect(() => {
    if (isRecording && analyserNode) {
      const dataArray = new Uint8Array(analyserNode.frequencyBinCount);
      const bars = 30; // Increased number of bars for more detail
      
      const updateVisualization = () => {
        if (!isRecording || !analyserNode) {
          return;
        }
        
        analyserNode.getByteFrequencyData(dataArray);
        
        // Calculate levels for each bar with enhanced sensitivity
        const barData = [];
        const samplesPerBar = Math.floor(dataArray.length / bars);
        
        // Focus on voice frequencies (roughly 85Hz to 3400Hz)
        // Map to appropriate frequency bins
        const startFreq = Math.floor(dataArray.length * 0.05); // Start from ~5% of spectrum
        const endFreq = Math.floor(dataArray.length * 0.7); // End at ~70% of spectrum
        const voiceRange = endFreq - startFreq;
        const voiceBars = Math.floor(bars * 0.8); // Use 80% of bars for voice range
        
        for (let i = 0; i < bars; i++) {
          let sum = 0;
          let count = 0;
          
          if (i < voiceBars) {
            // Map to voice frequency range with more sensitivity
            const freqIndex = startFreq + Math.floor((i / voiceBars) * voiceRange);
            const range = Math.max(1, Math.floor(samplesPerBar * 0.5)); // Smaller range for more detail
            
            for (let j = 0; j < range && (freqIndex + j) < dataArray.length; j++) {
              sum += dataArray[freqIndex + j];
              count++;
            }
          } else {
            // Use regular sampling for remaining bars
            const startIdx = i * samplesPerBar;
            for (let j = 0; j < samplesPerBar && (startIdx + j) < dataArray.length; j++) {
              sum += dataArray[startIdx + j];
              count++;
            }
          }
          
          const average = count > 0 ? sum / count : 0;
          // Enhanced sensitivity: amplify lower volumes and use exponential scaling
          const amplified = Math.pow(average / 255, 0.6) * 255; // Exponential scaling for better sensitivity
          // Normalize to 0-100 with minimum height for visibility
          const normalized = Math.max(8, Math.min(100, (amplified / 255) * 120)); // Boost max to 120% then clamp
          barData.push(normalized);
        }
        
        setAudioLevels(barData);
        animationFrameRef.current = requestAnimationFrame(updateVisualization);
      };
      
      updateVisualization();
      
      return () => {
        if (animationFrameRef.current) {
          cancelAnimationFrame(animationFrameRef.current);
        }
      };
    } else {
      // Clear visualization when not recording
      setAudioLevels([]);
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    }
  }, [isRecording, analyserNode]);

  // Cleanup audio stream when component unmounts or modal closes
  useEffect(() => {
    return () => {
      if (audioStream) {
        audioStream.getTracks().forEach(track => track.stop());
        setAudioStream(null);
      }
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [audioStream]);

  // Cleanup when modal closes
  useEffect(() => {
    if (!showModal && audioStream) {
      audioStream.getTracks().forEach(track => track.stop());
      setAudioStream(null);
      if (analyserNode) {
        setAnalyserNode(null);
      }
      if (mediaRecorder && mediaRecorder.state !== 'inactive') {
        try {
          mediaRecorder.stop();
        } catch (e) {
          console.error("Error stopping recorder:", e);
        }
      }
      setIsRecording(false);
      setIsTranscribing(false);
      setMediaRecorder(null);
      setAudioLevels([]);
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      // Close audio context
      if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
        audioContextRef.current.close().catch(err => console.error("Error closing audio context:", err));
      }
      audioContextRef.current = null;
      // Clean up abort controller
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
        abortControllerRef.current = null;
      }
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
    }
  }, [showModal, audioStream, mediaRecorder, analyserNode]);

  const handleLanguageChange = (languageCode) => {
    setSelectedLanguage(languageCode);
  };

  // Toast notification system
  const showToast = (message, type = "success") => {
    const id = Date.now();
    const toast = { id, message, type };
    setToasts((prev) => [...prev, toast]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 3000);
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

    try {
      const response = await fetch(`${API_CONFIG.BACKEND_URL}/api/categories`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({
          userId: user.userId,
          name: newCategoryName.trim(),
          color: "#007bff"
        }),
      });

      if (response.ok) {
        const category = await response.json();
        setCategories([...categories, category]);
        setNewCategoryName("");
        setShowCategoryInput(false);
        showToast("Category created successfully!", "success");
      } else {
        showToast("Failed to create category", "error");
      }
    } catch (error) {
      console.error("Error creating category:", error);
      showToast("Error creating category", "error");
    }
  };

  // Update category name
  const handleUpdateCategoryName = async (categoryId, newName) => {
    if (!newName.trim()) {
      setEditingCategoryId(null);
      return;
    }

    try {
      const response = await fetch(`${API_CONFIG.BACKEND_URL}/api/categories/${categoryId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({ name: newName.trim() }),
      });

      if (response.ok) {
        const updatedCategory = await response.json();
        setCategories(categories.map(cat => cat.id === categoryId ? updatedCategory : cat));
        setEditingCategoryId(null);
        showToast("Category name updated successfully!", "success");
      } else {
        showToast("Failed to update category name", "error");
      }
    } catch (error) {
      console.error("Error updating category:", error);
      showToast("Error updating category name", "error");
    }
  };

  // Color palette options
  const colorPalette = [
    "#007bff", "#28a745", "#ffc107", "#dc3545", "#6f42c1",
    "#20c997", "#fd7e14", "#e83e8c", "#6c757d", "#17a2b8"
  ];

  // Update category color
  const handleUpdateCategoryColor = async (categoryId, color) => {
    try {
      const response = await fetch(`${API_CONFIG.BACKEND_URL}/api/categories/${categoryId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({ color }),
      });

      if (response.ok) {
        const updatedCategory = await response.json();
        setCategories(categories.map(cat => cat.id === categoryId ? updatedCategory : cat));
        setShowColorPicker(null);
        showToast("Category color updated successfully!", "success");
      } else {
        showToast("Failed to update category color", "error");
      }
    } catch (error) {
      console.error("Error updating category color:", error);
      showToast("Error updating category color", "error");
    }
  };

  // Delete category
  const handleDeleteCategory = (categoryId) => {
    const category = categories.find(cat => cat.id === categoryId);
    setItemToDelete({ type: "category", id: categoryId, name: category?.name || "this category" });
    setShowDeleteModal(true);
  };

  // Confirm delete
  const confirmDelete = async () => {
    if (itemToDelete.type === "category") {
      try {
        const response = await fetch(`${API_CONFIG.BACKEND_URL}/api/categories/${itemToDelete.id}`, {
          method: "DELETE",
          credentials: "include",
        });

        if (response.ok) {
          setCategories(categories.filter(cat => cat.id !== itemToDelete.id));
          if (selectedCategoryId === itemToDelete.id) {
            setSelectedCategoryId(null);
          }
          showToast("Category deleted successfully!", "success");
        } else {
          showToast("Failed to delete category", "error");
        }
      } catch (error) {
        console.error("Error deleting category:", error);
        showToast("Error deleting category", "error");
      }
    } else if (itemToDelete.type === "note") {
      try {
        const response = await fetch(`${API_CONFIG.BACKEND_URL}/api/notes/${itemToDelete.id}`, {
          method: "DELETE",
          credentials: "include",
        });

        if (response.ok) {
          setNotes(notes.filter(n => n.id !== itemToDelete.id));
          if (selectedNote?.id === itemToDelete.id) {
            setSelectedNote(null);
          }
          showToast("Note deleted successfully!", "success");
        } else {
          showToast("Failed to delete note", "error");
        }
      } catch (error) {
        console.error("Error deleting note:", error);
        showToast("Error deleting note", "error");
      }
    }
    setShowDeleteModal(false);
    setItemToDelete({ type: null, id: null, name: null });
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

  // Filter notes by pinned status and category
  const { pinnedNotes, uncategorizedNotes, categorizedNotes } = useMemo(() => {
    const pinned = notes.filter(note => note.pinned);
    const categorized = notes.filter(note => !note.pinned && note.category_id); // notes with category, unpinned
    const uncategorized = notes.filter(note => !note.pinned && !note.category_id); // notes without category, unpinned
    return { pinnedNotes: pinned, categorizedNotes: categorized, uncategorizedNotes: uncategorized };
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
        credentials: "include", // Include cookies for session
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
          showToast("Note updated successfully!", "success");
        } else {
          setNotes([note, ...notes]);
          showToast("New note created successfully!", "success");
        }
        
        // Calculate word count for feedback
        const wordCount = noteBody.trim().split(/\s+/).filter(word => word.length > 0).length;
        setFeedbackData(prev => ({
          ...prev,
          totalWords: wordCount
        }));
        
        // Close modal and reset form
        setShowModal(false);
        setEditingNote(null);
        setNoteTitle("");
        setNoteBody("");
        setNoteColor("#ffffff");
        setSelectedCategoryId(null);
        
        // Show feedback modal if user checked the checkbox
        if (wantToProvideFeedback) {
          setSavedNoteId(note.id);
          setShowFeedbackModal(true);
        }
        
        // Reset feedback checkbox
        setWantToProvideFeedback(false);
      } else {
        const data = await response.json();
        showToast("Failed to save note: " + (data.message || "Unknown error"), "error");
      }
    } catch (error) {
      console.error("Error saving note:", error);
      showToast("Error saving note. Please try again.", "error");
    }
  };

  const handleEdit = (note) => {
    setEditingNote(note);
    setNoteTitle(note.title);
    setNoteBody(note.content || "");
    setNoteColor(note.color || "#ffffff");
    setSelectedCategoryId(note.category_id || null);
    setWantToProvideFeedback(false);
    setShowModal(true);
  };

  const handleDelete = (noteId) => {
    const note = notes.find(n => n.id === noteId);
    setItemToDelete({ type: "note", id: noteId, name: note?.title || "this note" });
    setShowDeleteModal(true);
  };

  const handlePin = async (note) => {
    try {
      const response = await fetch(`${API_CONFIG.BACKEND_URL}/api/notes/${note.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include", // Include cookies for session
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
        showToast(updatedNote.pinned ? "Note pinned!" : "Note unpinned!", "success");
      } else {
        showToast("Failed to update note", "error");
      }
    } catch (error) {
      console.error("Error pinning note:", error);
      showToast("Error updating note", "error");
    }
  };

  // Move note to different section (pinned, category, or uncategorized)
  const handleMoveNote = async (noteId, targetPinned, targetCategoryId) => {
    try {
      const note = notes.find(n => n.id === noteId);
      if (!note) return;

      // Don't update if nothing changed
      if (note.pinned === targetPinned && note.category_id === targetCategoryId) {
        return;
      }

      const response = await fetch(`${API_CONFIG.BACKEND_URL}/api/notes/${noteId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({
          pinned: targetPinned,
          categoryId: targetCategoryId,
        }),
      });

      if (response.ok) {
        const updatedNote = await response.json();
        setNotes(notes.map(n => n.id === updatedNote.id ? updatedNote : n));
        if (selectedNote?.id === updatedNote.id) {
          setSelectedNote(updatedNote);
        }
      } else {
        console.error("Failed to move note");
      }
    } catch (error) {
      console.error("Error moving note:", error);
    }
  };

  // Drag and drop handlers
  const handleDragStart = (e, note) => {
    setDraggedNote(note);
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("text/html", note.id);
    // Add visual feedback
    e.currentTarget.style.opacity = "0.5";
  };

  const handleDragEnd = (e) => {
    e.currentTarget.style.opacity = "1";
    setDraggedNote(null);
    setDragOverSection(null);
    setDragOverCategoryId(null);
  };

  const handleDragOver = (e, sectionType, categoryId = null) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    setDragOverSection(sectionType);
    setDragOverCategoryId(categoryId);
  };

  const handleDragLeave = (e) => {
    // Only clear if we're actually leaving the drop zone
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX;
    const y = e.clientY;
    if (x < rect.left || x > rect.right || y < rect.top || y > rect.bottom) {
      setDragOverSection(null);
      setDragOverCategoryId(null);
    }
  };

  const handleDrop = (e, targetPinned, targetCategoryId) => {
    e.preventDefault();
    e.stopPropagation();

    if (!draggedNote) return;

    // Determine target state
    const finalPinned = targetPinned !== null ? targetPinned : false;
    const finalCategoryId = targetCategoryId !== null ? targetCategoryId : null;

    // Move the note
    handleMoveNote(draggedNote.id, finalPinned, finalCategoryId);

    // Reset drag state
    setDraggedNote(null);
    setDragOverSection(null);
    setDragOverCategoryId(null);
  };

  const handleDuplicate = async (note) => {
    try {
      const response = await fetch(`${API_CONFIG.BACKEND_URL}/api/notes/${note.id}/duplicate`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include", // Include cookies for session
        body: JSON.stringify({
          userId: user.userId,
        }),
      });

      if (response.ok) {
        const newNote = await response.json();
        setNotes([newNote, ...notes]);
        showToast("Note duplicated successfully!", "success");
      } else {
        showToast("Failed to duplicate note", "error");
      }
    } catch (error) {
      console.error("Error duplicating note:", error);
      showToast("Error duplicating note", "error");
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

  const handleLogoutClick = async () => {
    try {
      const response = await fetch(`${API_CONFIG.BACKEND_URL}/logout`, {
        method: "POST",
        credentials: "include", // Include cookies for session
      });

      if (response.ok) {
        setUser(null);
        navigate("/login");
      } else {
        alert("Error logging out. Please try again.");
      }
    } catch (error) {
      console.error("Logout error:", error);
      // Even if there's an error, clear local state and redirect
      setUser(null);
      navigate("/login");
    }
  };

  const openNewNoteModal = () => {
    setEditingNote(null);
    setNoteTitle("");
    setNoteBody("");
    setNoteColor("#ffffff");
    setSelectedCategoryId(null);
    setWantToProvideFeedback(false);
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
      // Stop recording
      if (mediaRecorder && mediaRecorder.state !== 'inactive') {
        try {
          mediaRecorder.stop();
        } catch (e) {
          console.error("Error stopping recorder:", e);
        }
      }
      setIsRecording(false);
      setIsTranscribing(true);
    } else {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        alert("Your browser does not support audio recording.");
        return;
      }

      try {
        // Stop any existing stream first
        if (audioStream) {
          audioStream.getTracks().forEach(track => track.stop());
        }

        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        setAudioStream(stream);
        
        // Create audio context and analyser for visualization
        const audioContext = new (window.AudioContext || window.webkitAudioContext)();
        audioContextRef.current = audioContext;
        const analyser = audioContext.createAnalyser();
        const microphone = audioContext.createMediaStreamSource(stream);
        // Increased FFT size for better frequency resolution and more bars
        analyser.fftSize = 512;
        // Reduced smoothing for more dynamic response
        analyser.smoothingTimeConstant = 0.3;
        // Add gain node for sensitivity boost
        const gainNode = audioContext.createGain();
        gainNode.gain.value = 2.0; // Boost sensitivity
        microphone.connect(gainNode);
        gainNode.connect(analyser);
        setAnalyserNode(analyser);
        
        const recorder = new MediaRecorder(stream);
        let chunks = [];

        recorder.ondataavailable = (e) => {
          if (e.data.size > 0) chunks.push(e.data);
        };

        recorder.onstop = async () => {
          // Stop all tracks in the stream
          stream.getTracks().forEach(track => track.stop());
          setAudioStream(null);
          setAnalyserNode(null);
          setAudioLevels([]);
          if (animationFrameRef.current) {
            cancelAnimationFrame(animationFrameRef.current);
          }
          // Close audio context
          if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
            try {
              await audioContextRef.current.close();
            } catch (e) {
              console.error("Error closing audio context:", e);
            }
          }
          audioContextRef.current = null;

          const blob = new Blob(chunks, { type: "audio/webm" });
          chunks = [];

          try {
            const arrayBuffer = await blob.arrayBuffer();
            // Use a new AudioContext for decoding (separate from visualization)
            const decodeContext = new (window.AudioContext || window.webkitAudioContext)();
            const audioBuffer = await decodeContext.decodeAudioData(arrayBuffer);
            decodeContext.close(); // Clean up after decoding

            const wavBlob = encodeWAV(audioBuffer);
            const formData = new FormData();
            formData.append("audio", wavBlob, "recording.wav");

            // Ensure language is set, default to en-US if not
            const languageToSend = selectedLanguage || 'en-US';
            formData.append("language", languageToSend);

            console.log("Sending transcription request with language:", languageToSend);
            console.log("Audio blob size:", wavBlob.size, "bytes");
            console.log("Service URL:", API_CONFIG.MICROPHONE_SERVICE_URL);

            // Clean up any existing abort controller and timeout
            if (abortControllerRef.current) {
              abortControllerRef.current.abort();
            }
            if (timeoutRef.current) {
              clearTimeout(timeoutRef.current);
            }

            // Create new abort controller for this request
            const controller = new AbortController();
            abortControllerRef.current = controller;
            const timeoutId = setTimeout(() => {
              if (!controller.signal.aborted) {
                controller.abort();
              }
            }, 60000); // Increased to 60 seconds for longer recordings
            timeoutRef.current = timeoutId;

            try {
              const response = await fetch(`${API_CONFIG.MICROPHONE_SERVICE_URL}/transcribe`, {
                method: "POST",
                body: formData,
                signal: controller.signal,
                // Don't set Content-Type header, let browser set it with boundary for FormData
              });

              // Clear timeout on successful response
              if (timeoutRef.current) {
                clearTimeout(timeoutRef.current);
                timeoutRef.current = null;
              }

              // Check if response is ok before trying to parse JSON
              if (!response.ok) {
                let errorMessage = `Server error: ${response.status}`;
                try {
                  const errorData = await response.json();
                  errorMessage = errorData.error || errorData.message || errorMessage;
                } catch (e) {
                  // If response is not JSON, try to get text
                  try {
                    const errorText = await response.text();
                    if (errorText) errorMessage = errorText;
                  } catch (e2) {
                    // Ignore if we can't read response
                  }
                }
                console.error("Transcription error:", errorMessage);
                console.error("Response status:", response.status);
                showToast(`Transcription error: ${errorMessage}`, "error");
                setIsTranscribing(false);
                return;
              }

              let data;
              try {
                data = await response.json();
              } catch (e) {
                console.error("Failed to parse JSON response:", e);
                showToast("Invalid response from server", "error");
                setIsTranscribing(false);
                return;
              }

              if (data.text) {
                // Concatenate with existing text if there's any
                const existingText = noteBody.trim();
                const newText = data.text.trim();
                if (existingText && newText) {
                  // Add space between existing and new text
                  setNoteBody(existingText + " " + newText);
                  showToast("Transcription appended!", "success");
                } else if (newText) {
                  // Only new text
                  setNoteBody(newText);
                  showToast("Transcription completed!", "success");
                } else {
                  showToast("No speech detected", "error");
                }
              } else if (data.error) {
                showToast("Transcription error: " + data.error, "error");
              } else {
                showToast("Unexpected response from server", "error");
              }
              setIsTranscribing(false);
            } catch (err) {
              console.error("Error sending audio to server:", err);
              
              // Don't show error if it was aborted (user might have started new recording)
              if (err.name === 'AbortError' && controller.signal.aborted) {
                console.log("Request was aborted (likely due to new recording)");
                setIsTranscribing(false);
                return;
              }
              
              let errorMessage = "Network error";
              if (err.name === 'AbortError') {
                errorMessage = "Request timeout - the server took too long to respond";
              } else if (err.message.includes('Failed to fetch')) {
                errorMessage = `Cannot connect to transcription service at ${API_CONFIG.MICROPHONE_SERVICE_URL}. Please check if the service is running.`;
              } else {
                errorMessage = err.message || "Network error";
              }
              
              showToast(`Error: ${errorMessage}`, "error");
              console.error("Full error details:", err);
              setIsTranscribing(false);
            } finally {
              // Clean up abort controller reference
              if (abortControllerRef.current === controller) {
                abortControllerRef.current = null;
              }
            }
          } catch (err) {
            console.error("Error processing audio:", err);
            showToast("Error processing audio: " + err.message, "error");
            setIsTranscribing(false);
          }
        };

        recorder.onerror = (e) => {
          console.error("MediaRecorder error:", e);
          showToast("Recording error occurred", "error");
          stream.getTracks().forEach(track => track.stop());
          setAudioStream(null);
          setAnalyserNode(null);
          setAudioLevels([]);
          setIsRecording(false);
          setIsTranscribing(false);
          setMediaRecorder(null);
          if (animationFrameRef.current) {
            cancelAnimationFrame(animationFrameRef.current);
          }
          // Close audio context
          if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
            audioContextRef.current.close().catch(err => console.error("Error closing audio context:", err));
          }
          audioContextRef.current = null;
          // Clean up abort controller
          if (abortControllerRef.current) {
            abortControllerRef.current.abort();
            abortControllerRef.current = null;
          }
          if (timeoutRef.current) {
            clearTimeout(timeoutRef.current);
            timeoutRef.current = null;
          }
        };

        recorder.start();
        setMediaRecorder(recorder);
        setIsRecording(true);
      } catch (err) {
        console.error("Error accessing microphone:", err);
        if (err.name === 'NotAllowedError') {
          alert("Microphone access denied. Please allow microphone access and try again.");
        } else if (err.name === 'NotFoundError') {
          alert("No microphone found. Please connect a microphone and try again.");
        } else {
          alert("Error accessing microphone: " + err.message);
        }
        setAudioStream(null);
        setAnalyserNode(null);
        setAudioLevels([]);
        setIsRecording(false);
        setIsTranscribing(false);
        setMediaRecorder(null);
        if (animationFrameRef.current) {
          cancelAnimationFrame(animationFrameRef.current);
        }
        // Close audio context
        if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
          audioContextRef.current.close().catch(err => console.error("Error closing audio context:", err));
        }
        audioContextRef.current = null;
        // Clean up abort controller
        if (abortControllerRef.current) {
          abortControllerRef.current.abort();
          abortControllerRef.current = null;
        }
        if (timeoutRef.current) {
          clearTimeout(timeoutRef.current);
          timeoutRef.current = null;
        }
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
        xhr.withCredentials = true; // Include cookies for session
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
        showToast("Audio uploaded and note created successfully!", "success");

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
      showToast("Error uploading file: " + error.message, "error");
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

            <div className="profile-icon" onClick={handleLogoutClick} style={{ cursor: "pointer" }}>
              <FiLogOut />
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
            <div
              key={category.id}
              className="category-filter-item"
              onMouseEnter={() => setHoveredCategoryId(category.id)}
              onMouseLeave={() => setHoveredCategoryId(null)}
              style={{ position: "relative", display: "inline-block" }}
            >
              <button
                className={`category-btn ${selectedCategoryId === category.id ? "active" : ""}`}
                onClick={() => handleCategoryFilter(category.id)}
                style={{
                  borderLeft: `4px solid ${category.color || "#007bff"}`,
                  paddingLeft: "12px"
                }}
              >
                <FiTag /> {category.name}
              </button>
              {hoveredCategoryId === category.id && (
                <button
                  className="category-delete-btn"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    handleDeleteCategory(category.id);
                  }}
                  onMouseDown={(e) => e.stopPropagation()}
                  title="Delete category"
                >
                  ×
                </button>
              )}
            </div>
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
            draggable
            onDragStart={(e) => handleDragStart(e, selectedNote)}
            onDragEnd={handleDragEnd}
            style={{
              width: "100%",
              maxWidth: "800px",
              backgroundColor: selectedNote.color || "#ffffff",
              cursor: "grab"
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
            <div 
              className="notes-section"
              onDragOver={(e) => handleDragOver(e, "pinned")}
              onDragLeave={handleDragLeave}
              onDrop={(e) => handleDrop(e, true, null)}
              style={{
                border: dragOverSection === "pinned" ? "2px dashed #007bff" : "2px solid transparent",
                borderRadius: "8px",
                padding: dragOverSection === "pinned" ? "10px" : "0",
                transition: "all 0.2s ease",
                backgroundColor: dragOverSection === "pinned" ? "rgba(0, 123, 255, 0.05)" : "transparent",
                minHeight: pinnedNotes.length === 0 ? "100px" : "auto"
              }}
            >
              <h2 className="section-title">📌 Pinned Notes</h2>
              {pinnedNotes.length === 0 && dragOverSection === "pinned" && (
                <div style={{ 
                  textAlign: "center", 
                  padding: "20px", 
                  color: "#007bff",
                  fontStyle: "italic"
                }}>
                  Drop note here to pin
                </div>
              )}
              {pinnedNotes.length > 0 && (
                <div className="notes-grid">
                  {pinnedNotes.map((note) => (
                    <div
                      key={note.id}
                      className="note-card"
                      draggable
                      onDragStart={(e) => handleDragStart(e, note)}
                      onDragEnd={handleDragEnd}
                      style={{ 
                        backgroundColor: note.color || "#ffffff",
                        cursor: "grab",
                        opacity: draggedNote?.id === note.id ? 0.5 : 1
                      }}
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
              )}
            </div>

            {pinnedNotes.length > 0 && (categorizedNotes.length > 0 || uncategorizedNotes.length > 0) && <div className="section-divider"></div>}

            {(categorizedNotes.length > 0 || categories.some(cat => dragOverSection === "category" && dragOverCategoryId === cat.id)) && (
              <div>
                <h2 className="section-title">Category Notes</h2>
                <div className="categories-container">
                  {categories.map((category) => {
                    // Get notes for this category
                    const categoryNotes = categorizedNotes.filter(note => note.category_id === category.id);
                    const isDragOver = dragOverSection === "category" && dragOverCategoryId === category.id;
                    const isEditing = editingCategoryId === category.id;
                    
                    return (
                      <div 
                        key={category.id} 
                        className="category-notes-section"
                        onDragOver={(e) => handleDragOver(e, "category", category.id)}
                        onDragLeave={handleDragLeave}
                        onDrop={(e) => handleDrop(e, false, category.id)}
                        style={{
                          border: isDragOver ? "2px dashed #007bff" : "2px solid transparent",
                          borderRadius: "8px",
                          padding: isDragOver ? "10px" : "0",
                          transition: "all 0.2s ease",
                          backgroundColor: isDragOver ? "rgba(0, 123, 255, 0.05)" : "transparent",
                          minHeight: categoryNotes.length === 0 ? "100px" : "auto",
                          marginBottom: "30px",
                          width: "100%"
                        }}
                      >
                        <div className="category-header" style={{ 
                          display: "flex", 
                          alignItems: "center", 
                          gap: "10px",
                          marginBottom: "15px",
                          padding: "10px",
                          backgroundColor: "var(--bg-secondary)",
                          borderRadius: "8px",
                          borderLeft: `4px solid ${category.color || "#007bff"}`
                        }}>
                          {isEditing ? (
                            <input
                              type="text"
                              value={editingCategoryName}
                              onChange={(e) => setEditingCategoryName(e.target.value)}
                              onBlur={() => {
                                handleUpdateCategoryName(category.id, editingCategoryName);
                              }}
                              onKeyPress={(e) => {
                                if (e.key === "Enter") {
                                  handleUpdateCategoryName(category.id, editingCategoryName);
                                } else if (e.key === "Escape") {
                                  setEditingCategoryId(null);
                                }
                              }}
                              autoFocus
                              style={{
                                flex: 1,
                                padding: "5px 10px",
                                fontSize: "18px",
                                fontWeight: "600",
                                border: "2px solid #007bff",
                                borderRadius: "4px",
                                outline: "none"
                              }}
                            />
                          ) : (
                            <h3 
                              className="category-title"
                              onDoubleClick={() => {
                                setEditingCategoryId(category.id);
                                setEditingCategoryName(category.name);
                              }}
                              style={{ 
                                flex: 1,
                                cursor: "pointer",
                                margin: 0,
                                color: category.color || "#007bff"
                              }}
                            >
                              {category.name}
                            </h3>
                          )}
                          <div style={{ position: "relative" }} className="color-picker-container">
                            <button
                              type="button"
                              onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                setShowColorPicker(showColorPicker === category.id ? null : category.id);
                              }}
                              onMouseDown={(e) => e.stopPropagation()}
                              style={{
                                width: "30px",
                                height: "30px",
                                borderRadius: "50%",
                                border: `2px solid ${category.color || "#007bff"}`,
                                backgroundColor: category.color || "#007bff",
                                cursor: "pointer",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                outline: "none"
                              }}
                              title="Change category color"
                            >
                              <FiTag style={{ color: "white", fontSize: "14px" }} />
                            </button>
                            {showColorPicker === category.id && (
                              <div 
                                className="color-picker-popup"
                                onClick={(e) => e.stopPropagation()}
                                onMouseDown={(e) => e.stopPropagation()}
                                style={{
                                  position: "absolute",
                                  top: "40px",
                                  right: "0",
                                  backgroundColor: "var(--bg-secondary)",
                                  padding: "10px",
                                  borderRadius: "8px",
                                  boxShadow: "0 4px 12px var(--shadow)",
                                  zIndex: 10001,
                                  display: "flex",
                                  gap: "8px",
                                  flexWrap: "wrap",
                                  width: "150px",
                                  border: "1px solid var(--border-color)"
                                }}
                              >
                                {colorPalette.map((color) => (
                                  <button
                                    key={color}
                                    type="button"
                                    onClick={(e) => {
                                      e.preventDefault();
                                      e.stopPropagation();
                                      handleUpdateCategoryColor(category.id, color);
                                    }}
                                    onMouseDown={(e) => e.stopPropagation()}
                                    style={{
                                      width: "30px",
                                      height: "30px",
                                      borderRadius: "50%",
                                      backgroundColor: color,
                                      border: "2px solid var(--border-color)",
                                      cursor: "pointer",
                                      transition: "transform 0.2s",
                                      outline: "none"
                                    }}
                                    onMouseEnter={(e) => e.currentTarget.style.transform = "scale(1.2)"}
                                    onMouseLeave={(e) => e.currentTarget.style.transform = "scale(1)"}
                                  />
                                ))}
                              </div>
                            )}
                          </div>
                        </div>
                        {categoryNotes.length === 0 && isDragOver && (
                          <div style={{ 
                            textAlign: "center", 
                            padding: "20px", 
                            color: "#007bff",
                            fontStyle: "italic"
                          }}>
                            Drop note here
                          </div>
                        )}
                        {categoryNotes.length > 0 && (
                          <div className="notes-grid">
                            {categoryNotes.map((note) => (
                            <div
                              key={note.id}
                              className="note-card"
                              draggable
                              onDragStart={(e) => handleDragStart(e, note)}
                              onDragEnd={handleDragEnd}
                              style={{ 
                                backgroundColor: note.color || "#ffffff",
                                cursor: "grab",
                                opacity: draggedNote?.id === note.id ? 0.5 : 1
                              }}
                              onClick={() => handleNoteClick(note)}
                              onMouseEnter={() => setHoveredNoteId(note.id)}
                              onMouseLeave={() => setHoveredNoteId(null)}
                            >
                              {hoveredNoteId === note.id && (
                                <div className="quick-actions">
                                  <button
                                    onClick={(e) => { e.stopPropagation(); handlePin(note); }}
                                    className="quick-action-btn"
                                    title={note.pinned ? "Unpin" : "Pin"}
                                  >
                                    <FiMapPin style={{ color: note.pinned ? "#ffd700" : "inherit" }} />
                                  </button>
                                  <button
                                    onClick={(e) => { e.stopPropagation(); handleEdit(note); }}
                                    className="quick-action-btn"
                                    title="Edit"
                                  >
                                    <FiEdit2 />
                                  </button>
                                  <button
                                    onClick={(e) => { e.stopPropagation(); handleDuplicate(note); }}
                                    className="quick-action-btn"
                                    title="Duplicate"
                                  >
                                    <FiCopy />
                                  </button>
                                  <button
                                    onClick={(e) => { e.stopPropagation(); handleDelete(note.id); }}
                                    className="quick-action-btn"
                                    title="Delete"
                                  >
                                    <FiTrash2 />
                                  </button>
                                </div>
                              )}
                              <h2>{highlightText(note.title, searchTerm)}</h2>
                              <p>
                                {note.content
                                  ? (note.content.length > 100
                                    ? highlightText(note.content.substring(0, 100) + "...", searchTerm)
                                    : highlightText(note.content, searchTerm))
                                  : "No content"}
                              </p>
                            </div>
                          ))}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {((categorizedNotes.length > 0 || categories.some(cat => dragOverSection === "category" && dragOverCategoryId === cat.id)) && uncategorizedNotes.length > 0) && <div className="section-divider"></div>}

            <div 
              className="notes-section"
              onDragOver={(e) => handleDragOver(e, "uncategorized")}
              onDragLeave={handleDragLeave}
              onDrop={(e) => handleDrop(e, false, null)}
              style={{
                border: dragOverSection === "uncategorized" ? "2px dashed #007bff" : "2px solid transparent",
                borderRadius: "8px",
                padding: dragOverSection === "uncategorized" ? "10px" : "0",
                transition: "all 0.2s ease",
                backgroundColor: dragOverSection === "uncategorized" ? "rgba(0, 123, 255, 0.05)" : "transparent",
                minHeight: uncategorizedNotes.length === 0 ? "100px" : "auto"
              }}
            >
              {uncategorizedNotes.length > 0 && <h2 className="section-title">All Notes</h2>}
              {uncategorizedNotes.length === 0 && dragOverSection === "uncategorized" && (
                <div style={{ 
                  textAlign: "center", 
                  padding: "20px", 
                  color: "#007bff",
                  fontStyle: "italic"
                }}>
                  Drop note here to remove from category
                </div>
              )}
              <div className="notes-grid">
                {uncategorizedNotes.map(note => (
                  <div
                    key={note.id}
                    className="note-card"
                    draggable
                    onDragStart={(e) => handleDragStart(e, note)}
                    onDragEnd={handleDragEnd}
                    style={{ 
                      backgroundColor: note.color || "#ffffff",
                      cursor: "grab",
                      opacity: draggedNote?.id === note.id ? 0.5 : 1
                    }}
                    onClick={() => handleNoteClick(note)}
                    onMouseEnter={() => setHoveredNoteId(note.id)}
                    onMouseLeave={() => setHoveredNoteId(null)}
                  >
                    {/* Quick actions */}
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

            <div className="feedback-checkbox-container">
              <label className="feedback-checkbox-label">
                <input
                  type="checkbox"
                  checked={wantToProvideFeedback}
                  onChange={(e) => setWantToProvideFeedback(e.target.checked)}
                  className="feedback-checkbox"
                />
                <span>I would like to provide feedback to improve VoiceScript</span>
              </label>
            </div>

            {/* Voice Wave Visualization */}
            {(isRecording || isTranscribing) && (
              <div className="voice-wave-container">
                {isRecording ? (
                  <>
                    <div className="voice-wave-bars">
                      {audioLevels.length > 0 ? (
                        audioLevels.map((level, index) => {
                          // More dynamic color gradient based on level
                          let backgroundColor;
                          if (level > 70) {
                            backgroundColor = '#ff0000'; // Red for very loud
                          } else if (level > 50) {
                            backgroundColor = '#ff4444'; // Bright red
                          } else if (level > 35) {
                            backgroundColor = '#ff8800'; // Orange
                          } else if (level > 20) {
                            backgroundColor = '#ffaa00'; // Yellow-orange
                          } else {
                            backgroundColor = '#007bff'; // Blue
                          }
                          
                          return (
                            <div
                              key={index}
                              className="voice-wave-bar"
                              style={{
                                height: `${Math.max(8, level)}%`,
                                backgroundColor: backgroundColor,
                                boxShadow: level > 30 ? `0 0 ${Math.min(8, level / 10)}px ${backgroundColor}` : 'none',
                                transform: level > 50 ? 'scaleY(1.05)' : 'scaleY(1)'
                              }}
                            />
                          );
                        })
                      ) : (
                        // Show placeholder bars while initializing
                        Array.from({ length: 30 }).map((_, index) => (
                          <div
                            key={index}
                            className="voice-wave-bar"
                            style={{
                              height: '8%',
                              backgroundColor: '#007bff',
                              opacity: 0.3
                            }}
                          />
                        ))
                      )}
                    </div>
                    <p className="voice-wave-label">
                      {audioLevels.length > 0 ? '🎤 Recording... Speak now' : '🎤 Initializing microphone...'}
                    </p>
                  </>
                ) : (
                  <div className="transcribing-indicator">
                    <div className="transcribing-spinner"></div>
                    <p className="voice-wave-label">🔄 Transcribing your speech...</p>
                  </div>
                )}
              </div>
            )}

            <div className="modal-buttons">
              <button className="modal-btn cancel" onClick={() => { setShowModal(false); setEditingNote(null); }}>Cancel</button>
              <div style={{ display: "flex", gap: "10px", alignItems: "center", flexDirection: "column" }}>
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
              </div>
              <button className="modal-btn save" onClick={handleSave}>Save</button>
            </div>
          </div>
        </div>
      )}

      {/* Voice Command Button */}
      <VoiceCommandButton onCommand={handleVoiceCommand} />

      {/* Toast Notifications */}
      <div className="toast-container">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={`toast toast-${toast.type}`}
            style={{
              animation: "slideInRight 0.3s ease"
            }}
          >
            {toast.type === "success" ? "✓" : "✕"} {toast.message}
          </div>
        ))}
      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteModal && (
        <div 
          className="modal-overlay" 
          onClick={() => {
            setShowDeleteModal(false);
            setItemToDelete({ type: null, id: null, name: null });
          }}
          style={{ zIndex: 10000 }}
        >
          <div 
            className="delete-modal-container" 
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="delete-modal-title">Confirm Delete</h2>
            <p className="delete-modal-message">
              Are you sure you want to delete <strong>"{itemToDelete.name}"</strong>?
              {itemToDelete.type === "category" && " Notes in this category will become uncategorized."}
            </p>
            <div className="delete-modal-buttons">
              <button
                className="delete-modal-btn cancel"
                onClick={() => {
                  setShowDeleteModal(false);
                  setItemToDelete({ type: null, id: null, name: null });
                }}
              >
                Cancel
              </button>
              <button
                className="delete-modal-btn confirm"
                onClick={(e) => {
                  e.stopPropagation();
                  confirmDelete();
                }}
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Feedback Modal */}
      {showFeedbackModal && (
        <div 
          className="modal-overlay" 
          onClick={() => {
            setShowFeedbackModal(false);
            setSavedNoteId(null);
            setFeedbackData({
              totalWords: 0,
              errorCount: 0,
              errorWords: "",
              feedbackType: "positive"
            });
          }}
          style={{ zIndex: 10001 }}
        >
          <div 
            className="feedback-modal-container" 
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="feedback-modal-title">Provide Feedback</h2>
            <p className="feedback-modal-description">
              Help us improve VoiceScript by providing feedback on the transcription quality.
            </p>
            
            <div className="feedback-form">
              <div className="feedback-field">
                <label>Total Words:</label>
                <input
                  type="number"
                  min="0"
                  value={feedbackData.totalWords}
                  onChange={(e) => setFeedbackData(prev => ({ ...prev, totalWords: parseInt(e.target.value) || 0 }))}
                  className="feedback-input"
                />
              </div>

              <div className="feedback-field">
                <label>Number of Errors:</label>
                <input
                  type="number"
                  min="0"
                  value={feedbackData.errorCount}
                  onChange={(e) => {
                    const errorCount = parseInt(e.target.value) || 0;
                    setFeedbackData(prev => ({ 
                      ...prev, 
                      errorCount,
                      feedbackType: errorCount === 0 ? "positive" : "negative"
                    }));
                  }}
                  className="feedback-input"
                />
              </div>

              {feedbackData.errorCount > 0 && (
                <div className="feedback-field">
                  <label>Error Words (comma-separated):</label>
                  <input
                    type="text"
                    value={feedbackData.errorWords}
                    onChange={(e) => setFeedbackData(prev => ({ ...prev, errorWords: e.target.value }))}
                    placeholder="e.g., word1, word2, word3"
                    className="feedback-input"
                  />
                </div>
              )}

              <div className="feedback-field">
                <label>Feedback Type:</label>
                <select
                  value={feedbackData.feedbackType}
                  onChange={(e) => setFeedbackData(prev => ({ ...prev, feedbackType: e.target.value }))}
                  className="feedback-select"
                >
                  <option value="positive">Positive (No errors)</option>
                  <option value="negative">Negative (Has errors)</option>
                </select>
              </div>
            </div>

            <div className="feedback-modal-buttons">
              <button
                className="feedback-modal-btn cancel"
                onClick={() => {
                  setShowFeedbackModal(false);
                  setSavedNoteId(null);
                  setFeedbackData({
                    totalWords: 0,
                    errorCount: 0,
                    errorWords: "",
                    feedbackType: "positive"
                  });
                }}
              >
                Skip
              </button>
              <button
                className="feedback-modal-btn submit"
                onClick={async (e) => {
                  e.stopPropagation();
                  if (!savedNoteId) {
                    showToast("Note ID not found", "error");
                    return;
                  }

                  try {
                    const response = await fetch(`${API_CONFIG.BACKEND_URL}/api/feedback/notes/${savedNoteId}`, {
                      method: "POST",
                      headers: {
                        "Content-Type": "application/json",
                      },
                      credentials: "include",
                      body: JSON.stringify({
                        totalWords: feedbackData.totalWords,
                        errorCount: feedbackData.errorCount,
                        errorWords: feedbackData.errorWords || null,
                        feedbackType: feedbackData.feedbackType
                      }),
                    });

                    if (response.ok) {
                      showToast("Feedback submitted successfully! Thank you.", "success");
                      setShowFeedbackModal(false);
                      setSavedNoteId(null);
                      setFeedbackData({
                        totalWords: 0,
                        errorCount: 0,
                        errorWords: "",
                        feedbackType: "positive"
                      });
                    } else {
                      const data = await response.json();
                      showToast("Failed to submit feedback: " + (data.message || "Unknown error"), "error");
                    }
                  } catch (error) {
                    console.error("Error submitting feedback:", error);
                    showToast("Error submitting feedback. Please try again.", "error");
                  }
                }}
              >
                Submit Feedback
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
