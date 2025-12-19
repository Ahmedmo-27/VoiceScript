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

VoiceScript is a full-stack web application that enables users to create notes through voice transcription. It supports both real-time voice recording and audio file uploads, automatically converting speech to text using Google Speech Recognition technology. The application features a modern, responsive UI with note organization, categorization, and comprehensive admin analytics.

## ✨ Features

### Core Features
- 🎤 **Real-time Voice Transcription** - Record and transcribe speech to text instantly
- 📤 **Audio File Upload** - Upload audio files (WAV, MP3, MP4, M4A, FLAC, OGG, WebM, AAC, WMA) for transcription
- 📝 **Note Management** - Create, edit, delete, duplicate, and organize notes
- 🏷️ **Categories** - Organize notes with custom categories
- 🔍 **Search Functionality** - Quickly find notes using full-text search with highlighting
- 📌 **Pin Notes** - Pin important notes for quick access
- 🎨 **Color-coded Notes** - Customize note appearance with colors

### User Experience
- 🌓 **Dark/Light Theme** - Toggle between light and dark modes
- 🌐 **Multi-language Support** - Transcribe audio in 30+ languages
- 🖱️ **Drag & Drop** - Drag notes between categories and to pin/unpin
- 📱 **Responsive Design** - Works on desktop and mobile devices

### Admin Features
- 👨‍💼 **Admin Dashboard** - Administrative interface with analytics
- 📊 **Visual Charts** - Line charts, bar charts, and pie charts for data visualization
- 👥 **User Management** - View all users with statistics
- 📈 **KPI Metrics** - Track total users, voice sessions, accuracy rates
- 🔔 **Dynamic Notifications** - Real-time alerts based on system activity
- 📋 **Feedback System** - Track transcription accuracy with user feedback

## 🛠️ Tech Stack

### Frontend
- **React 19.2** - Modern UI library
- **Vite 7.2** - Fast build tool and dev server
- **React Router DOM 7.9** - Client-side routing
- **Recharts 3.6** - Charts and data visualization
- **React Icons 5.5** - Icon library
- **CSS3** - Styling with CSS variables for theming

### Backend
- **Node.js** - Runtime environment
- **Express.js 5.2** - Web framework
- **MySQL2** - Database driver
- **Express Session** - Session management
- **Multer** - File upload handling
- **Bcrypt.js** - Password hashing
- **Axios** - HTTP client
- **CORS** - Cross-origin resource sharing

### Voice Transcription Services
- **Python 3.8+** - Backend service language (compatible with Python 3.13)
- **Flask 3.0** - Micro web framework
- **SpeechRecognition 3.10** - Speech-to-text conversion
- **Google Speech Recognition API** - Primary transcription engine
- **Pydub 0.25** - Audio processing and conversion
- **FFmpeg** - Audio format conversion

## 📁 Project Structure

```
Web-voice-app/
├── src/                          # Frontend React application
│   ├── admin/                    # Admin dashboard
│   │   ├── AdminDashboard.jsx
│   │   └── AdminDashboard.css
│   ├── api/                      # API helper functions
│   │   └── api.js
│   ├── authentication/           # Login and registration
│   │   ├── Login.jsx
│   │   ├── Login.css
│   │   ├── Register.jsx
│   │   └── Register.css
│   ├── components/               # Reusable components
│   │   ├── LanguageSelector.jsx
│   │   ├── LanguageSelector.css
│   │   ├── VoiceCommandButton.jsx
│   │   └── VoiceCommandButton.css
│   ├── config/                   # Configuration files
│   │   └── api.js
│   ├── context/                  # React context providers
│   │   └── ThemeContext.jsx
│   ├── home/                     # Main dashboard
│   │   ├── Dashboard.jsx
│   │   └── Dashboard.css
│   ├── profile/                  # User profile page
│   │   ├── Profile.jsx
│   │   └── Profile.css
│   ├── utils/                    # Utility functions
│   │   └── highlightText.js
│   ├── App.jsx                   # Main app component
│   ├── main.jsx                  # Entry point
│   └── index.css                 # Global styles
├── backend/                      # Node.js backend server
│   ├── config/                   # Database and app config
│   │   ├── database.js
│   │   ├── multer.js
│   │   └── session.js
│   ├── controllers/              # Route controllers
│   │   ├── AdminController.js
│   │   ├── AuthController.js
│   │   ├── CategoryController.js
│   │   ├── FeedbackController.js
│   │   ├── NoteController.js
│   │   └── UserController.js
│   ├── middleware/               # Express middleware
│   │   └── authMiddleware.js
│   ├── models/                   # Data models
│   │   ├── CategoryModel.js
│   │   ├── FeedbackModel.js
│   │   ├── NoteModel.js
│   │   └── UserModel.js
│   ├── routes/                   # API routes
│   │   ├── adminRoutes.js
│   │   ├── authRoutes.js
│   │   ├── categoryRoutes.js
│   │   ├── feedbackRoutes.js
│   │   ├── noteRoutes.js
│   │   └── userRoutes.js
│   ├── uploads/                  # Uploaded audio files
│   └── server.js                 # Express server entry
├── flask voice/                  # Python transcription services
│   ├── flask_upload_transcribe.py  # File upload transcription (port 5000)
│   ├── flask_transcribe.py         # Live microphone transcription (port 5003)
│   ├── run.py                      # Alternative runner
│   ├── audio_converter.py          # Audio format conversion
│   └── requirements.txt            # Python dependencies
├── public/                       # Static assets
│   └── VoiceScript Logo1.png
├── start.bat                     # Windows startup script
├── package.json                  # Frontend dependencies
└── vite.config.js               # Vite configuration
```

## 🚀 Installation

### Prerequisites

- **Node.js** (v16 or higher)
- **Python** (v3.8 - 3.13)
- **MySQL** (v8.0 or higher)
- **FFmpeg** (required for audio conversion)

### Step 1: Clone the Repository

```bash
git clone https://github.com/ahmedmo-27/VoiceScript.git
cd VoiceScript/Web-voice-app
```

### Step 2: Frontend Setup

```bash
npm install
```

### Step 3: Backend Setup

```bash
cd backend
npm install
```

Create the MySQL database and tables (see database schema in documentation).

### Step 4: Python Transcription Service Setup

```bash
cd "flask voice"
pip install -r requirements.txt
```

**Install FFmpeg:**
- **Windows**: Download from [ffmpeg.org](https://ffmpeg.org/download.html) and add to PATH
- **macOS**: `brew install ffmpeg`
- **Linux**: `sudo apt-get install ffmpeg`

### Step 5: Configure API Endpoints (Optional)

The default configuration in `src/config/api.js`:

```javascript
const API_CONFIG = {
  BACKEND_URL: "http://localhost:5001",
  MICROPHONE_SERVICE_URL: "http://127.0.0.1:5003",
  FILE_UPLOAD_SERVICE_URL: "http://localhost:5000",
};
```

## 💻 Usage

### Quick Start (Windows)

Run all services at once:
```bash
start.bat
```

### Manual Start

#### Terminal 1: Node.js Backend Server
```bash
cd backend
node server.js
```
Backend runs on `http://localhost:5001`

#### Terminal 2: Flask File Upload Transcription Service
```bash
cd "flask voice"
python flask_upload_transcribe.py
```
File upload service runs on `http://localhost:5000`

#### Terminal 3: Flask Microphone Transcription Service
```bash
cd "flask voice"
python flask_transcribe.py
```
Microphone service runs on `http://localhost:5003`

#### Terminal 4: React Frontend
```bash
npm run dev
```
Frontend runs on `http://localhost:5173`

### Using the Application

1. **Register/Login** - Create an account or log in
2. **Create Notes** - Click the "New Note" card to create a note
3. **Record Voice** - Use the microphone button to record and transcribe
4. **Upload Audio** - Upload audio files for transcription
5. **Organize** - Create categories, add colors, and pin important notes
6. **Search** - Use the search bar to find notes
7. **Feedback** - Provide feedback on transcription accuracy

## 🔧 API Endpoints

### Authentication
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/register` | User registration |
| POST | `/login` | User login |
| POST | `/logout` | User logout |
| GET | `/api/me` | Get current user |
| GET | `/api/is-admin` | Check if user is admin |

### Notes
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/notes/:userId` | Get all notes for user |
| GET | `/api/notes/search/:userId?q=query` | Search notes |
| POST | `/api/notes` | Create a new note |
| PUT | `/api/notes/:noteId` | Update a note |
| DELETE | `/api/notes/:noteId` | Delete a note |
| POST | `/api/notes/:noteId/duplicate` | Duplicate a note |
| POST | `/api/notes/upload` | Upload audio and create note |

### Categories
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/categories/:userId` | Get all categories |
| POST | `/api/categories` | Create a category |
| PUT | `/api/categories/:categoryId` | Update a category |
| DELETE | `/api/categories/:categoryId` | Delete a category |

### Feedback
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/feedback/notes/:noteId` | Submit feedback for note |
| GET | `/api/feedback/notes/:noteId` | Get feedback for note |
| GET | `/api/feedback/user` | Get user's feedbacks |
| GET | `/api/feedback/admin/all` | Get all feedbacks (admin) |
| GET | `/api/feedback/admin/statistics` | Get feedback statistics |

### Admin
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/admin/dashboard` | Get dashboard analytics |
| GET | `/api/admin/users/statistics` | Get user statistics |
| GET | `/api/admin/check` | Check admin status |

### Transcription Services
| Method | Endpoint | Port | Description |
|--------|----------|------|-------------|
| POST | `/api/transcribe` | 5000 | Transcribe uploaded file |
| GET | `/api/languages` | 5000 | Get supported languages |
| POST | `/transcribe` | 5003 | Live microphone transcription |
| GET | `/languages` | 5003 | Get supported languages |

## 🌐 Supported Languages

VoiceScript supports 30+ languages including:
- English (US, UK)
- Spanish (Spain, Mexico)
- French, German, Italian
- Portuguese (Brazil, Portugal)
- Russian, Japanese, Korean
- Chinese (Simplified, Traditional)
- Arabic (Saudi Arabia, Egypt)
- Hindi, Dutch, Polish, Turkish
- And many more...

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📝 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🙏 Acknowledgments

- Google Speech Recognition API
- React Community
- Flask Documentation
- Recharts for data visualization
- All contributors and testers

---

<div align="center">

**Made with ❤️ using React, Node.js, and Python**

[⬆ Back to Top](#voicescript-)

</div>
