import React, { useState } from "react";
import { FiMic, FiHome, FiFileText, FiUser, FiChevronDown, FiPlus } from "react-icons/fi";

import "./dashboard.css";

export default function HomePage() {
  const [showModal, setShowModal] = useState(false);
  const [noteTitle, setNoteTitle] = useState("");
  const [noteBody, setNoteBody] = useState("");
  const [isRecording, setIsRecording] = useState(false);
  const [mediaRecorder, setMediaRecorder] = useState(null);

  const handleSave = () => {
    console.log("New Note:", { noteTitle, noteBody });
    setShowModal(false);
    setNoteTitle("");
    setNoteBody("");
  };

  const handleMicClick = async () => {
    if (isRecording) {
      // Stop recording
      mediaRecorder.stop();
      setIsRecording(false);
    } else {
      // Start recording
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

          // Convert webm to WAV
          const arrayBuffer = await blob.arrayBuffer();
          const audioContext = new (window.AudioContext || window.webkitAudioContext)();
          const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);

          const wavBlob = encodeWAV(audioBuffer);

          // Send to Flask
          const formData = new FormData();
          formData.append("audio", wavBlob, "recording.wav");

          try {
            const response = await fetch("http://127.0.0.1:5001/transcribe", {
              method: "POST",
              body: formData,
            });
            const data = await response.json();
            if (data.text) {
              setNoteBody(data.text); // Put transcription in textarea
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

  // WAV encoding helper
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
    view.setUint32(16, 16, true); // PCM
    view.setUint16(20, 1, true);  // Audio format
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

  return (
    <div className="app-container">

      {/* Sidebar */}
      <aside className="sidebar">
        <h2 className="logo">LOGO</h2>
        <nav className="sidebar-links">
          <a className="active"><FiHome /> Home</a>
          <a><FiFileText /> Note1</a>
          <a><FiFileText /> Note2</a>
          <a><FiFileText /> Note3</a>
          <div className="collection">
            <a><FiFileText /> Collection1 <FiChevronDown className="chevron" /></a>
          </div>
        </nav>
        <button className="new-note-btn" onClick={() => setShowModal(true)}>
          <FiPlus /> New Note
        </button>
      </aside>

      {/* Main Content */}
      <main className="main-content">
        <div className="top-bar">
          <input type="text" placeholder="Search For Notes" className="search-input" />
          <div className="profile-icon"><FiUser /></div>
        </div>
        <h1 className="page-title">What's on Your Mind?</h1>

        <div className="notes-grid">
          <div className="note-card"><h2>Note 1</h2><p>Sample text...</p></div>
          <div className="note-card"><h2>Note 2</h2><p>Sample text...</p></div>
          <div className="note-card"><h2>Note 3</h2><p>Sample text...</p></div>
        </div>
      </main>

      {/* Modal */}
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal-container" onClick={(e) => e.stopPropagation()}>
            <h2 className="modal-title">Create a New Note</h2>

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

            <div className="modal-buttons">
              <button className="modal-btn cancel" onClick={() => setShowModal(false)}>Cancel</button>

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

    </div>
  );
}
