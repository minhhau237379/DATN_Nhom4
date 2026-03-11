// src/middlewares/authMiddleware.js
const User = require('../models/User');
const config = require('../config/config');

// Password validation middleware
const validatePassword = (req, res, next) => {
    const { password } = req.body;
    
    if (!password) {
        return res.status(400).json({
            success: false,
            message: 'Password is required'
        });
    }
    
    // Password rules từ config
    const passwordRules = config.passwordRules || {
        minLength: 8,
        maxLength: 16,
        requireUppercase: true,
        requireSpecialChar: true,
        specialChars: "!@#$%^&*()_+-=[]{};':\"\\|,.<>/?",
    };
    
    // Check length
    if (password.length < passwordRules.minLength || 
        password.length > passwordRules.maxLength) {
        return res.status(400).json({
            success: false,
            message: `Password must be between ${passwordRules.minLength} and ${passwordRules.maxLength} characters`
        });
    }
    
    // Check uppercase
    if (passwordRules.requireUppercase && !/[A-Z]/.test(password)) {
        return res.status(400).json({
            success: false,
            message: 'Password must contain at least one uppercase letter'
        });
    }
    
    // Check special character
    if (passwordRules.requireSpecialChar) {
        // Nếu có regex trong config, dùng nó
        if (passwordRules.regex && passwordRules.regex.specialChar) {
            if (!passwordRules.regex.specialChar.test(password)) {
                return res.status(400).json({
                    success: false,
                    message: 'Password must contain at least one special character (!@#$%^&* etc.)'
                });
            }
        } else {
            // Fallback: tạo regex từ specialChars
            const specialCharRegex = new RegExp(`[${passwordRules.specialChars.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}]`);
            if (!specialCharRegex.test(password)) {
                return res.status(400).json({
                    success: false,
                    message: 'Password must contain at least one special character (!@#$%^&* etc.)'
                });
            }
        }
    }
    
    next();
};

// Check if user exists (duplicate validation) - Hỗ trợ demo mode
const checkDuplicateUser = async (req, res, next) => {
    const { username, email, phoneNumber } = req.body;
    
    try {
        // Kiểm tra demo mode từ config
        const isDemoMode = config.app && config.app.demoMode === true;
        
        if (isDemoMode) {
            // Check for existing username in demo data
            const existingUsername = config.demo && config.demo.users 
                ? config.demo.users.find(user => user.username === username)
                : null;
            
            if (existingUsername) {
                return res.status(400).json({
                    success: false,
                    message: 'Username already exists (DEMO)'
                });
            }
            
            // Check for existing email in demo data
            const existingEmail = config.demo && config.demo.users 
                ? config.demo.users.find(user => user.email === email.toLowerCase())
                : null;
            
            if (existingEmail) {
                return res.status(400).json({
                    success: false,
                    message: 'Email already registered (DEMO)'
                });
            }
            
            // Check for existing phone number in demo data
            const existingPhone = config.demo && config.demo.users 
                ? config.demo.users.find(user => user.phoneNumber === phoneNumber)
                : null;
            
            if (existingPhone) {
                return res.status(400).json({
                    success: false,
                    message: 'Phone number already registered (DEMO)'
                });
            }
            
            next();
            return;
        }
        
        // Original database check (if not in demo mode)
        // Check for existing username
        const existingUsername = await User.findOne({ username });
        if (existingUsername) {
            return res.status(400).json({
                success: false,
                message: 'Username already exists'
            });
        }
        
        // Check for existing email
        const existingEmail = await User.findOne({ email: email.toLowerCase() });
        if (existingEmail) {
            return res.status(400).json({
                success: false,
                message: 'Email already registered'
            });
        }
        
        // Check for existing phone number
        const existingPhone = await User.findOne({ phoneNumber });
        if (existingPhone) {
            return res.status(400).json({
                success: false,
                message: 'Phone number already registered'
            });
        }
        
        next();
    } catch (error) {
        console.error('Duplicate check error:', error);
        
        // Nếu lỗi kết nối database và đang ở development/demo mode, bỏ qua lỗi
        const isDevelopment = config.app && config.app.environment === 'development';
        const isDemoMode = config.app && config.app.demoMode === true;
        
        if (isDevelopment || isDemoMode) {
            console.log('⚠️ Database error, but continuing in development/demo mode');
            next();
            return;
        }
        
        res.status(500).json({
            success: false,
            message: 'Server error during validation'
        });
    }
};

// Validate required fields
const validateRegistration = (req, res, next) => {
    const { username, email, password, phoneNumber } = req.body;
    
    const errors = [];
    
    // Basic required field validation
    if (!username || username.trim() === '') errors.push('Username is required');
    if (!email || email.trim() === '') errors.push('Email is required');
    if (!password || password.trim() === '') errors.push('Password is required');
    if (!phoneNumber || phoneNumber.trim() === '') errors.push('Phone number is required');
    
    // Validate username format (nếu có username)
    if (username && username.trim() !== '') {
        if (!/^[a-zA-Z0-9_]+$/.test(username)) {
            errors.push('Username can only contain letters, numbers and underscores');
        }
        if (username.length < 3) {
            errors.push('Username must be at least 3 characters');
        }
        if (username.length > 30) {
            errors.push('Username cannot exceed 30 characters');
        }
    }
    
    // Validate email format (nếu có email)
    if (email && email.trim() !== '') {
        if (!/^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/.test(email)) {
            errors.push('Please enter a valid email');
        }
    }
    
    // Validate phone number format (nếu có phoneNumber)
    if (phoneNumber && phoneNumber.trim() !== '') {
        if (!/^[0-9]{10,11}$/.test(phoneNumber)) {
            errors.push('Phone number must be 10-11 digits');
        }
    }
    
    // Validate password length cơ bản (chi tiết sẽ check trong validatePassword)
    if (password && password.trim() !== '') {
        if (password.length < 8) {
            errors.push('Password must be at least 8 characters');
        }
        if (password.length > 16) {
            errors.push('Password cannot exceed 16 characters');
        }
    }
    
    if (errors.length > 0) {
        return res.status(400).json({
            success: false,
            message: errors.join(', ')
        });
    }
    
    next();
};

// Simple validation for login
const validateLogin = (req, res, next) => {
    const { username, password } = req.body;
    
    const errors = [];
    
    if (!username || username.trim() === '') errors.push('Username/Email is required');
    if (!password || password.trim() === '') errors.push('Password is required');
    
    if (errors.length > 0) {
        return res.status(400).json({
            success: false,
            message: errors.join(', ')
        });
    }
    
    next();
};

// Middleware để kiểm tra demo mode
const checkDemoMode = (req, res, next) => {
    const isDemoMode = config.app && config.app.demoMode === true;
    
    if (isDemoMode && req.method === 'POST' && req.path.includes('/register')) {
        console.log('📱 Demo mode active - Using demo data storage');
    }
    
    next();
};

module.exports = {
    validatePassword,
    checkDuplicateUser,
    validateRegistration,
    validateLogin,
    checkDemoMode
};