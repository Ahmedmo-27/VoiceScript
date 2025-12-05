const express = require("express");
const router = express.Router();
const NoteController = require("../controllers/NoteController");
const upload = require("../config/multer");

// Specific routes must come before parameterized routes to avoid conflicts
router.get("/search/:userId", NoteController.searchNotes);
router.post("/", NoteController.createNote);
router.post("/upload", upload.single("audio"), NoteController.uploadAndTranscribe);
router.put("/:noteId", NoteController.updateNote);
router.delete("/:noteId", NoteController.deleteNote);
router.post("/:noteId/duplicate", NoteController.duplicateNote);
router.get("/:userId", NoteController.getNotes);

module.exports = router;

