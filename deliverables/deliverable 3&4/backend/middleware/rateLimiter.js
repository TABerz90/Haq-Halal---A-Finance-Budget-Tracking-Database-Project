// middleware/rateLimiter.js
// Applies different rate limits to auth endpoints vs general API endpoints

const rateLimit = require('express-rate-limit');

// Strict limit for auth routes — prevents brute force attacks
const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 20,                   // max 20 attempts per window
    standardHeaders: true,
    legacyHeaders: false,
    message: {
        error: 'Too many login attempts. Please try again after 15 minutes.'
    },
    skipSuccessfulRequests: true, // only count failed requests
});

// General API limiter — prevents abuse of data endpoints
const apiLimiter = rateLimit({
    windowMs: 60 * 1000, // 1 minute
    max: 100,             // 100 requests per minute per IP
    standardHeaders: true,
    legacyHeaders: false,
    message: {
        error: 'Too many requests. Please slow down.'
    },
});

module.exports = { authLimiter, apiLimiter };
