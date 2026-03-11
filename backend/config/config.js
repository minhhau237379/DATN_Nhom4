// src/config/config.js
require('dotenv').config();

module.exports = {
    // Application settings
    app: {
        name: "Authentication App",
        version: "1.0.0",
        port: process.env.PORT || 3000,
        environment: process.env.NODE_ENV || 'development',
        demoMode: process.env.DEMO_MODE === 'true' || false,
        url: process.env.APP_URL || `http://localhost:${process.env.PORT || 3000}`,
    },
    
    // Database configuration
    database: {
        uri: process.env.MONGODB_URI || 'mongodb://localhost:27017/auth_app',
        options: {
            useNewUrlParser: true,
            useUnifiedTopology: true,
        }
    },
    
    // Password validation rules
    passwordRules: {
        minLength: 8,
        maxLength: 16,
        requireUppercase: true,
        requireSpecialChar: true,
        specialChars: "!@#$%^&*()_+-=[]{};':\"\\|,.<>/?",
        // Regular expressions for validation
        regex: {
            uppercase: /[A-Z]/,
            specialChar: /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/,
            length: /^.{8,16}$/
        }
    },
    
    // JWT configuration
    jwt: {
        secret: process.env.JWT_SECRET || 'default_jwt_secret_for_development_change_in_production',
        expiresIn: process.env.JWT_EXPIRES_IN || '24h',
        algorithm: 'HS256'
    },
    
    // Session configuration
    session: {
        secret: process.env.SESSION_SECRET || 'default_session_secret_for_development',
        resave: false,
        saveUninitialized: false,
        cookie: {
            maxAge: 24 * 60 * 60 * 1000 // 24 hours
        }
    },
    
    // CORS configuration
    cors: {
        origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
        credentials: true,
        methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
        allowedHeaders: ['Content-Type', 'Authorization']
    },
    
    // Validation messages
    messages: {
        validation: {
            username: {
                required: 'Username is required',
                minLength: 'Username must be at least 3 characters',
                maxLength: 'Username cannot exceed 30 characters',
                pattern: 'Username can only contain letters, numbers and underscores'
            },
            email: {
                required: 'Email is required',
                invalid: 'Please enter a valid email address'
            },
            password: {
                required: 'Password is required',
                minLength: 'Password must be at least 8 characters',
                maxLength: 'Password cannot exceed 16 characters',
                uppercase: 'Password must contain at least one uppercase letter',
                specialChar: 'Password must contain at least one special character',
                requirements: 'Password must be 8-16 characters with at least one uppercase letter and one special character'
            },
            phoneNumber: {
                required: 'Phone number is required',
                pattern: 'Phone number must be 10-11 digits'
            }
        },
        errors: {
            duplicate: {
                username: 'Username already exists',
                email: 'Email already registered',
                phoneNumber: 'Phone number already registered'
            },
            auth: {
                invalidCredentials: 'Invalid credentials',
                unauthorized: 'Unauthorized access',
                tokenExpired: 'Token has expired',
                tokenInvalid: 'Invalid token'
            },
            server: {
                internal: 'Internal server error',
                database: 'Database connection error'
            }
        },
        success: {
            register: 'User registered successfully',
            login: 'Login successful',
            logout: 'Logged out successfully'
        }
    },
    
    // Demo mode configuration (for development/testing)
    demo: {
        enabled: process.env.DEMO_MODE === 'true' || false,
        users: [
            {
                id: 'demo_user_1',
                username: 'demo',
                email: 'demo@example.com',
                password: 'Demo@123', // For demo purposes only
                phoneNumber: '0987654321',
                createdAt: new Date('2024-01-01'),
                updatedAt: new Date('2024-01-01')
            },
            {
                id: 'demo_user_2',
                username: 'test',
                email: 'test@example.com',
                password: 'Test@123', // For demo purposes only
                phoneNumber: '0123456789',
                createdAt: new Date('2024-01-01'),
                updatedAt: new Date('2024-01-01')
            },
            {
                id: 'demo_user_3',
                username: 'admin',
                email: 'admin@example.com',
                password: 'Admin@123', // For demo purposes only
                phoneNumber: '0909090909',
                createdAt: new Date('2024-01-01'),
                updatedAt: new Date('2024-01-01')
            }
        ],
        // Demo API responses
        responses: {
            register: 'Registration successful (DEMO MODE)',
            login: 'Login successful (DEMO MODE)'
        }
    },
    
    // API rate limiting
    rateLimit: {
        windowMs: 15 * 60 * 1000, // 15 minutes
        max: 100 // limit each IP to 100 requests per windowMs
    },
    
    // Security settings
    security: {
        bcryptSaltRounds: 10,
        passwordResetTokenExpiry: 3600000, // 1 hour in milliseconds
        maxLoginAttempts: 5,
        lockoutTime: 15 * 60 * 1000 // 15 minutes
    },
    
    // Logging configuration
    logging: {
        level: process.env.LOG_LEVEL || 'info',
        file: process.env.LOG_FILE || 'app.log',
        console: true
    },
    
    // Email configuration (for future features)
    email: {
        host: process.env.EMAIL_HOST || 'smtp.gmail.com',
        port: process.env.EMAIL_PORT || 587,
        secure: process.env.EMAIL_SECURE === 'true',
        auth: {
            user: process.env.EMAIL_USER,
            pass: process.env.EMAIL_PASS
        },
        from: process.env.EMAIL_FROM || 'noreply@auth-app.com'
    },
    
    // File upload configuration
    upload: {
        maxFileSize: 5 * 1024 * 1024, // 5MB
        allowedTypes: ['image/jpeg', 'image/png', 'image/gif'],
        uploadPath: 'uploads/'
    },
    
    // Get current configuration for debugging
    getConfig: function() {
        return {
            app: {
                name: this.app.name,
                version: this.app.version,
                environment: this.app.environment,
                demoMode: this.app.demoMode
            },
            database: {
                connected: false, // Will be set by database connection
                uri: this.database.uri.replace(/:[^:]*@/, ':****@') // Hide password in logs
            },
            server: {
                port: this.app.port,
                url: this.app.url
            }
        };
    }
};