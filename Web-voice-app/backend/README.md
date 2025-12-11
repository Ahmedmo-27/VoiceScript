# Backend API Server

Node.js/Express backend for VoiceScript application.

## Setup

1. Install dependencies:
```bash
npm install
```

2. Configure database in `config/database.js`:
   - Update MySQL connection settings if needed
   - Default: localhost, root, no password, database: `voicescript_db`

3. Start the server:
```bash
node server.js
```

Server runs on `http://localhost:5001`

## API Endpoints

### Authentication
- `POST /register` - Register new user
- `POST /login` - Login user

### Notes
- `GET /api/notes/:userId` - Get all notes for user
- `GET /api/notes/search/:userId?q=query` - Search notes
- `POST /api/notes` - Create new note
- `POST /api/notes/upload` - Upload audio file and create note with transcription
- `PUT /api/notes/:noteId` - Update note
- `DELETE /api/notes/:noteId` - Delete note
- `POST /api/notes/:noteId/duplicate` - Duplicate note

### User
- `GET /api/user/:userId` - Get user info
- `PUT /api/user/:userId` - Update user info

### Categories
- `GET /api/categories/:userId` - Get user categories
- `POST /api/categories` - Create category
- `PUT /api/categories/:categoryId` - Update category
- `DELETE /api/categories/:categoryId` - Delete category

## Dependencies

- express - Web framework
- mysql2 - MySQL database driver
- bcryptjs - Password hashing
- cors - Cross-origin resource sharing
- multer - File upload handling
- form-data - Form data handling
- axios - HTTP client for calling Python service

## File Upload

The upload endpoint (`POST /api/notes/upload`) requires:
- Python transcription service running on port 5000
- See `SETUP_INSTRUCTIONS.md` for details

## Directory Structure

```
backend/
├── config/          # Configuration files (database, multer)
├── controllers/     # Request handlers
├── models/          # Database models
├── routes/          # Route definitions
├── migrations/      # Database migrations
├── uploads/         # Temporary uploaded files (gitignored)
└── server.js        # Main server file
```

## Notes

- Uploaded files are temporarily stored in `uploads/` directory
- Files are automatically cleaned up after processing
- Maximum file size: 16MB
- Supported audio formats: WAV, MP3, MP4, M4A, FLAC, OGG, WebM

