const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { protect } = require('../middleware/auth');

// Helper function to generate JWT token
const generateToken = (id) => {
    return jwt.sign({ id }, process.env.JWT_SECRET, {
        expiresIn: process.env.JWT_EXPIRE,
    });
};

// @route   POST /api/auth/register
// @desc    Register a new user
// @access  Public
router.post('/register', async (req, res) => {
    try {
        const { fullName, username, email, password } = req.body; // Add username

        // Validation
        if (!fullName || !username || !email || !password) { // Check username
            return res.status(400).json({
                success: false,
                message: 'Please provide all required fields',
            });
        }

        if (password.length < 8) {
            return res.status(400).json({
                success: false,
                message: 'Password must be at least 8 characters',
            });
        }

        // Check if user already exists
        const userExists = await User.findOne({ $or: [{ email }, { username }] }); // Check both
        if (userExists) {
            return res.status(400).json({
                success: false,
                message: userExists.email === email ? 'User already exists with this email' : 'Username already taken',
            });
        }

        // Create user
        const user = await User.create({
            fullName,
            username,
            email,
            password,
        });

        // Generate token
        const token = generateToken(user._id);

        res.status(201).json({
            success: true,
            token,
            user: {
                id: user._id,
                fullName: user.fullName,
                username: user.username, // Add username to response
                email: user.email,
            },
            message: 'User created successfully',
        });
    } catch (error) {
        console.error('Register error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error during registration',
        });
    }
});

// @route   POST /api/auth/login
// @desc    Login user
// @access  Public
router.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body;

        // Validation
        if (!email || !password) {
            return res.status(400).json({
                success: false,
                message: 'Please provide email/username and password',
            });
        }

        // Check if user exists (by email OR username)
        const user = await User.findOne({
            $or: [{ email: email.toLowerCase() }, { username: email.toLowerCase() }]
        }).select('+password');

        if (!user) {
            return res.status(401).json({
                success: false,
                message: 'Invalid credentials',
            });
        }

        // Check password
        const isPasswordMatch = await user.comparePassword(password);

        if (!isPasswordMatch) {
            return res.status(401).json({
                success: false,
                message: 'Invalid credentials',
            });
        }

        // Generate token
        const token = generateToken(user._id);

        res.status(200).json({
            success: true,
            token,
            user: {
                id: user._id,
                fullName: user.fullName,
                username: user.username,
                email: user.email,
            },
            message: 'Login successful',
        });
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error during login',
        });
    }
});

// @route   GET /api/auth/me
// @desc    Get current logged in user
// @access  Private
router.get('/me', protect, async (req, res) => {
    try {
        res.status(200).json({
            success: true,
            user: req.user,
        });
    } catch (error) {
        console.error('Get me error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error',
        });
    }
});

// @route   POST /api/auth/verify-token
// @desc    Verify if token is valid
// @access  Private
router.get('/verify-token', protect, async (req, res) => {
    res.status(200).json({
        success: true,
        message: 'Token is valid',
        user: req.user,
    });
});

module.exports = router;