import React from "react";

// Utility function to highlight search terms in text
export const highlightText = (text, searchTerm) => {
  if (!searchTerm || !text) return text;
  
  // Escape special regex characters
  const escapedTerm = searchTerm.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const regex = new RegExp(`(${escapedTerm})`, "gi");
  const parts = text.split(regex);
  
  return parts.map((part, index) => {
    if (part.toLowerCase() === searchTerm.toLowerCase()) {
      return React.createElement('mark', { key: index, className: "highlight" }, part);
    }
    return part;
  });
};

