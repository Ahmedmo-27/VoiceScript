import React, { useState } from "react";
import { FiGlobe } from "react-icons/fi";
import "./LanguageSelector.css";

// Hardcoded languages - no need to fetch from API since these are standard and don't change
const SUPPORTED_LANGUAGES = {
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
};

export default function LanguageSelector({ selectedLanguage, onLanguageChange }) {
  const [showDropdown, setShowDropdown] = useState(false);

  const handleLanguageSelect = (langCode) => {
    onLanguageChange(langCode);
    setShowDropdown(false);
  };

  const selectedLanguageName = SUPPORTED_LANGUAGES[selectedLanguage] || selectedLanguage || 'English (United States)';

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
              {Object.entries(SUPPORTED_LANGUAGES).map(([code, name]) => (
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

