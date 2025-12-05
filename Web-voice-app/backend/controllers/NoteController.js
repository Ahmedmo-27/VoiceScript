const NoteModel = require("../models/NoteModel");
const FormData = require("form-data");
const fs = require("fs");
const path = require("path");
const axios = require("axios");

// Python transcription service URL
const PYTHON_SERVICE_URL = process.env.PYTHON_SERVICE_URL || "http://localhost:5000";

class NoteController {
  static async getNotes(req, res) {
    const { userId } = req.params;
    const { categoryId } = req.query;

    try {
      const notes = await NoteModel.findByUserId(userId, categoryId || null);
      return res.status(200).json(notes);
    } catch (error) {
      console.error("Get notes error:", error);
      return res.status(500).json({ message: "Database error" });
    }
  }

  static async createNote(req, res) {
    const { userId, title, content, color, categoryId } = req.body;

    if (!userId || !title) {
      return res.status(400).json({ message: "User ID and title are required" });
    }

    try {
      const noteId = await NoteModel.create(userId, title, content, color || "#ffffff", categoryId || null);
      const note = await NoteModel.findById(noteId);
      return res.status(201).json(note);
    } catch (error) {
      console.error("Create note error:", error);
      return res.status(500).json({ message: "Database error" });
    }
  }

  static async updateNote(req, res) {
    const { noteId } = req.params;
    const { title, content, color, pinned, categoryId } = req.body;

    const updates = {};
    if (title !== undefined) updates.title = title;
    if (content !== undefined) updates.content = content;
    if (color !== undefined) updates.color = color;
    if (pinned !== undefined) updates.pinned = pinned;
    if (categoryId !== undefined) updates.category_id = categoryId;

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({ message: "No fields to update" });
    }

    try {
      await NoteModel.update(noteId, updates);
      const note = await NoteModel.findById(noteId);
      if (!note) {
        return res.status(404).json({ message: "Note not found" });
      }
      return res.status(200).json(note);
    } catch (error) {
      console.error("Update note error:", error);
      return res.status(500).json({ message: "Database error" });
    }
  }

  static async deleteNote(req, res) {
    const { noteId } = req.params;

    try {
      const result = await NoteModel.delete(noteId);
      if (result.affectedRows === 0) {
        return res.status(404).json({ message: "Note not found" });
      }
      return res.status(200).json({ message: "Note deleted successfully" });
    } catch (error) {
      console.error("Delete note error:", error);
      return res.status(500).json({ message: "Database error" });
    }
  }

  static async searchNotes(req, res) {
    const { userId } = req.params;
    const { q } = req.query;

    if (!q || !q.trim()) {
      // If no search term, return all notes
      return NoteController.getNotes(req, res);
    }

    try {
      const notes = await NoteModel.search(userId, q);
      return res.status(200).json(notes);
    } catch (error) {
      console.error("Search notes error:", error);
      return res.status(500).json({ message: "Database error" });
    }
  }

  static async duplicateNote(req, res) {
    const { noteId } = req.params;
    const { userId } = req.body;

    if (!userId) {
      return res.status(400).json({ message: "User ID is required" });
    }

    try {
      const newNoteId = await NoteModel.duplicate(noteId, userId);
      const note = await NoteModel.findById(newNoteId);
      return res.status(201).json(note);
    } catch (error) {
      console.error("Duplicate note error:", error);
      if (error.message === "Note not found or unauthorized") {
        return res.status(404).json({ message: error.message });
      }
      return res.status(500).json({ message: "Database error" });
    }
  }

  static async uploadAndTranscribe(req, res) {
    // Get userId from form data (sent as form field, not JSON)
    const userId = req.body.userId;
    const audioFile = req.file;

    if (!userId) {
      return res.status(400).json({ message: "User ID is required" });
    }

    if (!audioFile) {
      return res.status(400).json({ message: "No audio file provided" });
    }

    try {
      // Extract filename without extension for note title
      const originalName = audioFile.originalname;
      const title = path.parse(originalName).name || "Untitled Recording"; // Fallback if no filename

      // First, analyze the file to get metadata
      const analysisFormData = new FormData();
      analysisFormData.append("audio", fs.createReadStream(audioFile.path), {
        filename: audioFile.originalname,
        contentType: audioFile.mimetype,
      });

      let fileMetadata = null;
      try {
        const analysisResponse = await axios.post(
          `${PYTHON_SERVICE_URL}/api/analyze-file`,
          analysisFormData,
          {
            headers: analysisFormData.getHeaders(),
            maxContentLength: Infinity,
            maxBodyLength: Infinity,
            timeout: 30000, // 30 second timeout for analysis
          }
        );
        fileMetadata = analysisResponse.data;
      } catch (analysisError) {
        // If analysis fails, continue without metadata (fallback to frontend estimation)
        console.warn("File analysis failed, using fallback:", analysisError.message);
      }

      // Forward file to Python transcription service
      const formData = new FormData();
      formData.append("audio", fs.createReadStream(audioFile.path), {
        filename: audioFile.originalname,
        contentType: audioFile.mimetype,
      });

      let transcriptionData;
      try {
        // Call Python transcription service
        const transcriptionStartTime = Date.now();
        const transcriptionResponse = await axios.post(
          `${PYTHON_SERVICE_URL}/api/transcribe-file`,
          formData,
          {
            headers: formData.getHeaders(),
            maxContentLength: Infinity,
            maxBodyLength: Infinity,
            timeout: 300000, // 5 minute timeout for large files
          }
        );

        transcriptionData = transcriptionResponse.data;
        const transcriptionDuration = Date.now() - transcriptionStartTime;
        console.log(`[NoteController] Python transcription took ${transcriptionDuration}ms (text length: ${transcriptionData.text?.length || 0} chars)`);
        
        // Include metadata in response for frontend
        if (fileMetadata) {
          transcriptionData.metadata = fileMetadata;
        }
        
      } catch (axiosError) {
        // Handle axios-specific errors (network, timeout, etc.)
        console.error("Python service error:", axiosError.message);
        console.error("Error code:", axiosError.code);
        console.error("Error response:", axiosError.response?.data);
        console.error("Service URL:", `${PYTHON_SERVICE_URL}/api/transcribe-file`);
        
        // Clean up uploaded file
        if (fs.existsSync(audioFile.path)) {
          fs.unlink(audioFile.path, (err) => {
            if (err) console.error("Error deleting temp file:", err);
          });
        }

        if (axiosError.code === "ECONNREFUSED") {
          return res.status(503).json({
            message: "Transcription service unavailable",
            error: `Could not connect to transcription service at ${PYTHON_SERVICE_URL}. Please ensure the Python service is running.`,
            details: "Start the Python service by running: cd 'Web-voice-app/flask voice' && python flask_upload_transcribe.py",
          });
        }

        if (axiosError.code === "ETIMEDOUT") {
          return res.status(504).json({
            message: "Transcription service timeout",
            error: "The transcription service took too long to respond. The file might be too large.",
          });
        }

        // Handle HTTP error responses from Python service
        if (axiosError.response) {
          const status = axiosError.response.status;
          const errorData = axiosError.response.data;
          return res.status(status).json({
            message: "Transcription service error",
            error: errorData?.error || errorData?.message || axiosError.message,
            details: errorData,
          });
        }

        return res.status(500).json({
          message: "Error calling transcription service",
          error: axiosError.message || "Unknown error",
          code: axiosError.code,
        });
      }

      // Clean up uploaded file after successful transcription call
      if (fs.existsSync(audioFile.path)) {
        fs.unlink(audioFile.path, (err) => {
          if (err) console.error("Error deleting temp file:", err);
        });
      }

      // Check if transcription was successful
      if (!transcriptionData.success || !transcriptionData.text) {
        // Return 400 for transcription failures (not server errors)
        return res.status(400).json({
          message: transcriptionData.message || "Transcription failed",
          error: transcriptionData.error || "No speech detected in audio file",
          details: "The audio file may contain only music, noise, or unclear speech. Please upload a file with clear speech.",
        });
      }

      // Create note with transcription (optimized to avoid extra query)
      const createStartTime = Date.now();
      const note = await NoteModel.createAndReturn(
        userId,
        title,
        transcriptionData.text,
        "#ffffff",
        null
      );
      const createDuration = Date.now() - createStartTime;
      
      if (createDuration > 200) {
        console.log(`[NoteController] Note creation took ${createDuration}ms (transcription length: ${transcriptionData.text.length} chars)`);
      }

      if (!note) {
        return res.status(500).json({
          message: "Note creation failed",
          error: "Database error",
        });
      }

      return res.status(201).json({
        message: "Note created successfully",
        note: note,
        metadata: transcriptionData.metadata || null, // Include metadata from Python service
      });
    } catch (error) {
      console.error("Upload and transcribe error:", error);

      // Clean up file on error
      if (audioFile && fs.existsSync(audioFile.path)) {
        fs.unlink(audioFile.path, (err) => {
          if (err) console.error("Error deleting temp file:", err);
        });
      }

      return res.status(500).json({
        message: "Error processing audio file",
        error: error.message || "Unknown error",
      });
    }
  }
}

module.exports = NoteController;
