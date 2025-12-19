import React, { useState, useRef, useEffect } from "react";
import { FiMic, FiX } from "react-icons/fi";
import "./VoiceCommandButton.css";

const VoiceCommandButton = ({ onCommand, showToast }) => {
  const [isListening, setIsListening] = useState(false);
  const [showCommands, setShowCommands] = useState(false);
  const [transcript, setTranscript] = useState("");
  const recognitionRef = useRef(null);

  // Define processCommand before it's used
  const processCommand = React.useCallback((command) => {
    const lowerCommand = command.toLowerCase();

    // "Create new note" or "create note"
    if (lowerCommand.includes("create") && (lowerCommand.includes("new note") || lowerCommand.includes("note"))) {
      onCommand("create");
      return;
    }

    // "Open note called [name]" or "open note [name]"
    const openMatch = lowerCommand.match(/open note (?:called )?(.+)/);
    if (openMatch) {
      const noteName = openMatch[1].trim();
      onCommand("open", noteName);
      return;
    }

    // "Delete last note" or "delete most recent note"
    if ((lowerCommand.includes("delete") && lowerCommand.includes("last note")) ||
      (lowerCommand.includes("delete") && lowerCommand.includes("most recent note"))) {
      onCommand("deleteLast");
      return;
    }

    // If no command matched
    if (showToast) {
      showToast(`Command not recognized: "${command}".`, "error");
    } else {
      console.warn(`Command not recognized: "${command}"`);
    }
  }, [onCommand, showToast]);

  useEffect(() => {
    // Check if browser supports speech recognition
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

    if (!SpeechRecognition) {
      console.warn("Speech recognition not supported in this browser");
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.interimResults = true;
    recognition.lang = "en-US";

    recognition.onstart = () => {
      setIsListening(true);
      setTranscript("");
    };

    recognition.onresult = (event) => {
      let finalTranscript = "";

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcript = event.results[i][0].transcript;
        if (event.results[i].isFinal) {
          finalTranscript += transcript + " ";
        }
      }

      if (finalTranscript) {
        setTranscript(finalTranscript.trim());
      }
    };

    recognition.onerror = (event) => {
      console.error("Speech recognition error:", event.error);
      setIsListening(false);
      if (event.error === "no-speech") {
        if (showToast) showToast("No speech detected. Please try again.", "error");
      }
    };

    recognition.onend = () => {
      setIsListening(false);
    };

    recognitionRef.current = recognition;

    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.abort();
      }
    };
  }, []);

  // Process command when transcript changes
  useEffect(() => {
    if (transcript.trim() && !isListening) {
      processCommand(transcript.trim());
      setTranscript("");
    }
  }, [isListening, transcript, processCommand]);

  const startListening = () => {
    if (recognitionRef.current && !isListening) {
      try {
        recognitionRef.current.start();
        setShowCommands(false);
      } catch (error) {
        console.error("Error starting recognition:", error);
        if (showToast) showToast("Error starting voice recognition.", "error");
      }
    }
  };

  const stopListening = () => {
    if (recognitionRef.current && isListening) {
      recognitionRef.current.stop();
    }
  };

  const toggleCommands = () => {
    setShowCommands(!showCommands);
    if (isListening) {
      stopListening();
    }
  };

  return (
    <>
      <div className="voice-command-button-container">
        <button
          className={`voice-command-btn ${isListening ? "listening" : ""}`}
          onClick={isListening ? stopListening : startListening}
          title="Voice Commands"
        >
          <FiMic />
        </button>
        <button
          className="voice-command-help-btn"
          onClick={toggleCommands}
          title="Show Commands"
        >
          ?
        </button>
      </div>

      {showCommands && (
        <div className="voice-commands-popup">
          <div className="voice-commands-header">
            <h3>Available Voice Commands</h3>
            <button onClick={toggleCommands} className="close-btn">
              <FiX />
            </button>
          </div>
          <div className="voice-commands-list">
            <div className="command-item">
              <strong>"Create new note"</strong>
              <span>Opens the create note modal</span>
            </div>
            <div className="command-item">
              <strong>"Open note called [name]"</strong>
              <span>Opens the note with the specified name</span>
            </div>
            <div className="command-item">
              <strong>"Delete last note"</strong>
              <span>Deletes the most recently created note</span>
            </div>
          </div>
          <div className="voice-commands-footer">
            <button onClick={startListening} className="start-listening-btn">
              <FiMic /> Start Listening
            </button>
          </div>
        </div>
      )}

      {isListening && (
        <div className="listening-indicator">
          <div className="listening-pulse"></div>
          <p>Listening... {transcript && <span>"{transcript}"</span>}</p>
        </div>
      )}
    </>
  );
};

export default VoiceCommandButton;

