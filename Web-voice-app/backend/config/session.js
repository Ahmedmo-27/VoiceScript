const session = require('express-session');

const sessionConfig = {
    secret: 'your-session-secret-key-change-in-production', // Change this in production
    resave: false,
    saveUninitialized: false,
    cookie: {
        secure: false, // Set to true if using HTTPS
        httpOnly: true,
        maxAge: 24 * 60 * 60 * 1000, // 24 hours
        sameSite: 'lax' // Changed from 'strict' for better compatibility
    },
    name: 'myapp.sid' // Custom session cookie name
};

module.exports = sessionConfig;