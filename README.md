# VoiceScript 🎤

<div align="center">

![GitHub](https://img.shields.io/badge/GitHub-100000?style=for-the-badge&logo=github&logoColor=white)
![React](https://img.shields.io/badge/React-20232A?style=for-the-badge&logo=react&logoColor=61DAFB)
![Node.js](https://img.shields.io/badge/Node.js-43853D?style=for-the-badge&logo=node.js&logoColor=white)
![Python](https://img.shields.io/badge/Python-3776AB?style=for-the-badge&logo=python&logoColor=white)
![Flask](https://img.shields.io/badge/Flask-000000?style=for-the-badge&logo=flask&logoColor=white)
![MySQL](https://img.shields.io/badge/MySQL-4479A1?style=for-the-badge&logo=mysql&logoColor=white)

**A modern voice transcription and note-taking application that converts speech to text in real-time**

[Features](#-features) • [Installation](#-installation) • [Usage](#-usage) • [Project Structure](#-project-structure)

</div>

---

## 📋 About

VoiceScript is a full-stack web application that enables users to create notes through voice transcription. It supports both real-time voice recording and audio file uploads, automatically converting speech to text using advanced speech recognition technology. The application features a modern, responsive UI with note organization, categorization, and user management capabilities.

## ✨ Features

- 🎤 **Real-time Voice Transcription** - Record and transcribe speech to text instantly
- 📤 **Audio File Upload** - Upload audio files (WAV, MP3, MP4, M4A, FLAC, OGG, WebM) for transcription
- 📝 **Note Management** - Create, edit, delete, and organize notes with rich text support
- 🏷️ **Categories & Tags** - Organize notes with custom categories and color coding
- 🔍 **Search Functionality** - Quickly find notes using full-text search
- 👤 **User Authentication** - Secure login and registration system
- 👨‍💼 **Admin Dashboard** - Administrative interface for user management
- 🌐 **Multi-language Support** - Transcribe audio in multiple languages
- 🌓 **Dark/Light Theme** - Toggle between light and dark modes
- 📌 **Pin Notes** - Pin important notes for quick access
- 🎨 **Color-coded Notes** - Customize note appearance with colors

## 🛠️ Tech Stack

### Frontend
- **React 19** - Modern UI library
- **Vite** - Fast build tool and dev server
- **React Router** - Client-side routing
- **React Icons** - Icon library
- **CSS3** - Styling and responsive design

### Backend
- **Node.js** - Runtime environment
- **Express.js** - Web framework
- **MySQL** - Relational database
- **Multer** - File upload handling
- **Bcrypt** - Password hashing
- **CORS** - Cross-origin resource sharing

### Voice Transcription Service
- **Python 3** - Backend service language
- **Flask** - Micro web framework
- **SpeechRecognition** - Speech-to-text conversion
- **Google Speech Recognition API** - Primary transcription engine
- **Pydub** - Audio processing and conversion
- **FFmpeg** - Audio format conversion (optional)

## 📁 Project Structure

```
VoiceScript/
├── Web-voice-app/              # Frontend React application
│   ├── src/
│   │   ├── admin/              # Admin dashboard components
│   │   ├── authentication/     # Login and registration
│   │   ├── components/         # Reusable components
│   │   ├── context/            # React context providers
│   │   ├── home/               # Main dashboard and notes
│   │   └── profile/            # User profile page
│   ├── backend/                # Node.js backend server
│   │   ├── config/             # Database and multer config
│   │   ├── controllers/        # Route controllers
│   │   ├── models/             # Data models
│   │   ├── routes/             # API routes
│   │   └── uploads/            # Uploaded files storage
│   └── flask voice/            # Python transcription service
│       ├── flask_upload_transcribe.py
│       └── requirements.txt
├── python-voice-service/       # Alternative voice service
├── README.md                   # This file
└── Documentation/              # Additional project docs
```

## 🚀 Installation

### Prerequisites

- **Node.js** (v16 or higher)
- **Python** (v3.8 or higher)
- **MySQL** (v8.0 or higher)
- **FFmpeg** (optional, for audio conversion)

### Step 1: Clone the Repository

```bash
git clone https://github.com/yourusername/VoiceScript.git
cd VoiceScript
```

### Step 2: Frontend Setup

```bash
cd Web-voice-app
npm install
```

### Step 3: Backend Setup

```bash
cd backend
npm install
```

Create a `.env` file in the `backend` directory:

```env
DB_HOST=localhost
DB_USER=your_username
DB_PASSWORD=your_password
DB_NAME=voicescript
PORT=3001
```

Run database migrations:

```bash
# MySQL setup
mysql -u your_username -p < migrations/add_category_to_notes.sql
mysql -u your_username -p < migrations/add_pinned_and_color_to_notes.sql
```

### Step 4: Python Transcription Service Setup

```bash
cd "flask voice"
pip install -r requirements.txt
```

**Note:** For audio conversion, install FFmpeg:
- **Windows**: Download from [ffmpeg.org](https://ffmpeg.org/download.html)
- **macOS**: `brew install ffmpeg`
- **Linux**: `sudo apt-get install ffmpeg`

### Step 5: Configure API Endpoints

Update `Web-voice-app/src/config/api.js` with your backend URL:

```javascript
const API_BASE_URL = 'http://localhost:3001';
```

## 💻 Usage

### Start the Development Servers

#### Terminal 1: Backend Server
```bash
cd Web-voice-app/backend
node server.js
```
Backend runs on `http://localhost:3001`

#### Terminal 2: Python Transcription Service
```bash
cd Web-voice-app/"flask voice"
python flask_upload_transcribe.py
```
Transcription service runs on `http://localhost:5000`

#### Terminal 3: Frontend Development Server
```bash
cd Web-voice-app
npm run dev
```
Frontend runs on `http://localhost:5173` (Vite default)

### Using the Application

1. **Register/Login** - Create an account or log in to existing account
2. **Record Voice** - Click the microphone button to start recording
3. **Upload Audio** - Upload audio files using the upload button
4. **Create Notes** - Notes are automatically created from transcriptions
5. **Organize** - Add categories, colors, and pin important notes
6. **Search** - Use the search bar to find notes quickly

## 🔧 API Endpoints

### Authentication
- `POST /api/auth/register` - User registration
- `POST /api/auth/login` - User login

### Notes
- `GET /api/notes` - Get all notes for user
- `POST /api/notes` - Create a new note
- `PUT /api/notes/:id` - Update a note
- `DELETE /api/notes/:id` - Delete a note
- `POST /api/notes/upload` - Upload audio file for transcription
- `GET /api/notes/search` - Search notes

### Categories
- `GET /api/categories` - Get all categories
- `POST /api/categories` - Create a category

### Transcription Service
- `POST /api/transcribe-file` - Transcribe uploaded audio file
- `POST /api/transcribe-live` - Real-time transcription

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📝 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 👥 Authors

- **Your Name** - *Initial work* - [YourGitHub](https://github.com/yourusername)

## 🙏 Acknowledgments

- Google Speech Recognition API
- React Community
- Flask Documentation
- All contributors and testers

---

<div align="center">

**Made with ❤️ using React, Node.js, and Python**

![GitHub forks](https://img.shields.io/github/forks/yourusername/VoiceScript?style=social)
![GitHub stars](https://img.shields.io/github/stars/yourusername/VoiceScript?style=social)
![GitHub watchers](https://img.shields.io/github/watchers/yourusername/VoiceScript?style=social)

[⬆ Back to Top](#voicescript-)

</div>
