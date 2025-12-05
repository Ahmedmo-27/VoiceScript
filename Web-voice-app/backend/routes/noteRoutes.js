const express = require("express");
const router = express.Router();
const NoteController = require("../controllers/NoteController");

// Search route must come before :userId to avoid conflicts
router.get("/search/:userId", NoteController.searchNotes);
router.get("/:userId", NoteController.getNotes);
router.post("/", NoteController.createNote);
router.put("/:noteId", NoteController.updateNote);
router.delete("/:noteId", NoteController.deleteNote);
router.post("/:noteId/duplicate", NoteController.duplicateNote);

module.exports = router;

