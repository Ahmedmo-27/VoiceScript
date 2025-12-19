import API_CONFIG from "../config/api";

/**
 * API Service - Centralized API calls for the application
 */

/**
 * Fetch notes from backend
 * @param {number} userId - User ID
 * @param {number|null} categoryId - Optional category ID to filter notes
 * @returns {Promise<Array>} Array of notes
 */
export const fetchNotes = async (userId, categoryId = null) => {
  try {
    const url = categoryId
      ? `${API_CONFIG.BACKEND_URL}/api/notes/${userId}?categoryId=${categoryId}`
      : `${API_CONFIG.BACKEND_URL}/api/notes/${userId}`;
    const response = await fetch(url, {
      credentials: "include", // Include cookies for session
    });
    if (response.ok) {
      const data = await response.json();
      return data;
    } else {
      console.error("Failed to fetch notes");
      return [];
    }
  } catch (error) {
    console.error("Error fetching notes:", error);
    return [];
  }
};

/**
 * Fetch categories from backend
 * @param {number} userId - User ID
 * @returns {Promise<Array>} Array of categories
 */
export const fetchCategories = async (userId) => {
  try {
    const response = await fetch(`${API_CONFIG.BACKEND_URL}/api/categories/${userId}`, {
      credentials: "include", // Include cookies for session
    });
    if (response.ok) {
      const data = await response.json();
      return data;
    } else {
      console.error("Failed to fetch categories:", response.status, response.statusText);
      // If categories table doesn't exist or other error, just return empty array
      return [];
    }
  } catch (error) {
    console.error("Error fetching categories:", error);
    // Return empty array on error so app doesn't break
    return [];
  }
};

/**
 * Create a new category
 * @param {number} userId - User ID
 * @param {string} categoryName - Category name
 * @returns {Promise<Object|null>} Created category or null on error
 */
export const createCategory = async (userId, categoryName) => {
  if (!categoryName.trim()) {
    return null;
  }

  try {
    const response = await fetch(`${API_CONFIG.BACKEND_URL}/api/categories`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      credentials: "include", // Include cookies for session
      body: JSON.stringify({
        userId: userId,
        name: categoryName.trim(),
      }),
    });

    if (response.ok) {
      const category = await response.json();
      return category;
    } else {
      console.error("Failed to create category");
      return null;
    }
  } catch (error) {
    console.error("Error creating category:", error);
    return null;
  }
};

/**
 * Search notes
 * @param {number} userId - User ID
 * @param {string} query - Search query
 * @returns {Promise<Array>} Array of matching notes
 */
export const searchNotes = async (userId, query) => {
  if (!query.trim()) {
    return null; // Return null to indicate should fetch all notes
  }

  try {
    const response = await fetch(`${API_CONFIG.BACKEND_URL}/api/notes/search/${userId}?q=${encodeURIComponent(query)}`, {
      credentials: "include", // Include cookies for session
    });
    if (response.ok) {
      const data = await response.json();
      return data;
    } else {
      console.error("Failed to search notes");
      return [];
    }
  } catch (error) {
    console.error("Error searching notes:", error);
    return [];
  }
};

