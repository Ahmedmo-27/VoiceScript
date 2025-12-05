const NoteModel = require("../models/NoteModel");

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
}

module.exports = NoteController;

