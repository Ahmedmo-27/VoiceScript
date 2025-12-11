import React, { useState, useEffect } from "react";
import { FiGlobe } from "react-icons/fi";
import API_CONFIG from "../config/api";
import "./LanguageSelector.css";

export default function LanguageSelector({ selectedLanguage, onLanguageChange }) {
  const [languages, setLanguages] = useState({});
  const [loading, setLoading] = useState(true);
  const [showDropdown, setShowDropdown] = useState(false);

  useEffect(() => {
    fetchLanguages();
  }, []);

  const fetchLanguages = async () => {
    try {
      // Try to fetch from file upload service first (port 5000)
      const uploadServiceUrl = API_CONFIG.FILE_UPLOAD_SERVICE_URL || API_CONFIG.BACKEND_URL.replace(':5001', ':5000').replace('5001', '5000');
      const response = await fetch(`${uploadServiceUrl}/api/languages`);
      if (response.ok) {
        const data = await response.json();
        setLanguages(data.languages || {});
      } else {
        // Fallback to microphone service (port 5003)
        const micResponse = await fetch(`${API_CONFIG.MICROPHONE_SERVICE_URL}/languages`);
        if (micResponse.ok) {
          const micData = await micResponse.json();
          setLanguages(micData.languages || {});
        } else {
          throw new Error('Failed to fetch from both services');
        }
      }
    } catch (error) {
      console.error("Error fetching languages:", error);
      // Set default languages if fetch fails
      setLanguages({
        'en-US': 'English (United States)',
        'en-GB': 'English (United Kingdom)',
        'es-ES': 'Spanish (Spain)',
        'es-MX': 'Spanish (Mexico)',
        'fr-FR': 'French (France)',
        'de-DE': 'German (Germany)',
        'it-IT': 'Italian (Italy)',
        'pt-BR': 'Portuguese (Brazil)',
        'pt-PT': 'Portuguese (Portugal)',
        'ru-RU': 'Russian (Russia)',
        'ja-JP': 'Japanese (Japan)',
        'ko-KR': 'Korean (Korea)',
        'zh-CN': 'Chinese (Simplified, China)',
        'zh-TW': 'Chinese (Traditional, Taiwan)',
        'ar-SA': 'Arabic (Saudi Arabia)',
        'ar-EG': 'Arabic (Egypt)',
        'hi-IN': 'Hindi (India)',
        'nl-NL': 'Dutch (Netherlands)',
        'pl-PL': 'Polish (Poland)',
        'tr-TR': 'Turkish (Turkey)',
        'sv-SE': 'Swedish (Sweden)',
        'da-DK': 'Danish (Denmark)',
        'no-NO': 'Norwegian (Norway)',
        'fi-FI': 'Finnish (Finland)',
        'cs-CZ': 'Czech (Czech Republic)',
        'hu-HU': 'Hungarian (Hungary)',
        'ro-RO': 'Romanian (Romania)',
        'th-TH': 'Thai (Thailand)',
        'vi-VN': 'Vietnamese (Vietnam)',
        'id-ID': 'Indonesian (Indonesia)',
        'ms-MY': 'Malay (Malaysia)',
        'he-IL': 'Hebrew (Israel)',
        'uk-UA': 'Ukrainian (Ukraine)',
        'el-GR': 'Greek (Greece)',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleLanguageSelect = (langCode) => {
    onLanguageChange(langCode);
    setShowDropdown(false);
  };

  const selectedLanguageName = languages[selectedLanguage] || selectedLanguage || 'English (United States)';

  if (loading) {
    return (
      <div className="language-selector">
        <button className="language-btn" disabled>
          <FiGlobe /> Loading...
        </button>
      </div>
    );
  }

  return (
    <div className="language-selector">
      <button
        className="language-btn"
        onClick={() => setShowDropdown(!showDropdown)}
        title={`Current language: ${selectedLanguageName}`}
      >
        <FiGlobe />
        <span className="language-label">{selectedLanguageName.split('(')[0].trim()}</span>
      </button>
      {showDropdown && (
        <>
          <div
            className="language-dropdown-overlay"
            onClick={() => setShowDropdown(false)}
          />
          <div className="language-dropdown">
            <div className="language-dropdown-header">
              <FiGlobe />
              <span>Select Language</span>
            </div>
            <div className="language-list">
              {Object.entries(languages).map(([code, name]) => (
                <button
                  key={code}
                  className={`language-option ${selectedLanguage === code ? 'active' : ''}`}
                  onClick={() => handleLanguageSelect(code)}
                >
                  <span className="language-code">{code}</span>
                  <span className="language-name">{name}</span>
                  {selectedLanguage === code && (
                    <span className="language-check">✓</span>
                  )}
                </button>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

