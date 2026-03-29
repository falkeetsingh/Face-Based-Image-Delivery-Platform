const User = require("../models/User");
const FaceMatch = require("../models/FaceMatch");
const Society = require("../models/Society");
const JoinRequest = require("../models/JoinRequest");
const faceServer = require("../config/axios");
const { uploadSingleBuffer } = require("../services/cloudinaryService");
const jwt = require("jsonwebtoken");

// Generate JWT Token
const generateToken = (userId) => {
    return jwt.sign({ userId }, process.env.JWT_SECRET, {
        expiresIn: "7d"
    });
};

const generateSocietyCode = async () => {
    const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

    for (let attempt = 0; attempt < 6; attempt += 1) {
        let code = "";
        for (let i = 0; i < 6; i += 1) {
            code += alphabet[Math.floor(Math.random() * alphabet.length)];
        }

        const exists = await Society.findOne({ code });
        if (!exists) {
            return code;
        }
    }

    throw new Error("Failed to generate unique society code");
};

// Register User with Face Recognition
exports.register = async (req, res) => {
    try {
        const { name, email, password, imageUrl, societyAction, societyName, societyCode } = req.body;
        const imageFile = req.file || null;

        // Validate input
        if (!name || !email || !password || (!imageUrl && !imageFile)) {
            return res.status(400).json({
                message: "name, email, password, and a face image are required"
            });
        }

        if (!societyAction || !["create", "join"].includes(societyAction)) {
            return res.status(400).json({ message: "societyAction must be create or join" });
        }

        if (societyAction === "create" && !societyName) {
            return res.status(400).json({ message: "societyName is required" });
        }

        if (societyAction === "join" && !societyCode) {
            return res.status(400).json({ message: "societyCode is required" });
        }

        // Check if user already exists
        let user = await User.findOne({ email });
        if (user) {
            return res.status(400).json({ message: "User already exists" });
        }

        // Create user in main server first
        user = new User({
            name,
            email,
            password
        });

        // Save user to get the ID
        await user.save();

        // Upload image if provided as file
        let faceImageUrl = imageUrl;
        if (!faceImageUrl && imageFile) {
            faceImageUrl = await uploadSingleBuffer(imageFile, `users/${user._id}`);
        }

        // Register face in face server
        try {
            const faceResponse = await faceServer.post("/api/users/register-face", {
                userId: user._id.toString(),
                imageUrl: faceImageUrl,
                name
            });

            // Store the faceProfileId (userId from face server in main server)
            user.faceProfileId = user._id.toString();

            let society = null;
            if (societyAction === "create") {
                const code = await generateSocietyCode();
                society = await Society.create({
                    name: societyName,
                    code,
                    admin: user._id,
                    members: [user._id]
                });

                user.societyId = society._id;
                user.role = "admin";
                user.status = "active";
            } else {
                society = await Society.findOne({ code: societyCode });
                if (!society) {
                    await User.deleteOne({ _id: user._id });
                    return res.status(404).json({ message: "Society not found" });
                }

                await JoinRequest.create({
                    societyId: society._id,
                    userId: user._id
                });

                user.societyId = society._id;
                user.role = "member";
                user.status = "pending";
            }

            await user.save();

            // Generate JWT token
            const token = generateToken(user._id);

            // Set JWT in httpOnly secure cookie
            res.cookie("token", token, {
                httpOnly: true,
                secure: process.env.NODE_ENV === "production",
                sameSite: "none",
                maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
            });

            return res.status(201).json({
                message: "User registered successfully",
                user: {
                    id: user._id,
                    name: user.name,
                    email: user.email,
                    faceProfileId: user.faceProfileId,
                    role: user.role,
                    status: user.status,
                    societyId: user.societyId
                },
                society: society
                    ? {
                        id: society._id,
                        name: society.name,
                        code: society.code
                    }
                    : null
            });
        } catch (faceErr) {
            // If face registration fails, delete the user from main server
            await User.deleteOne({ _id: user._id });
            console.error("Face server registration failed:", faceErr.message);
            return res.status(500).json({
                message: "Face registration failed. User registration cancelled.",
                error: faceErr.message
            });
        }
    } catch (err) {
        console.error("Registration error:", err);
        res.status(500).json({
            message: "Registration failed",
            error: err.message
        });
    }
};

// Login User
exports.login = async (req, res) => {
    try {
        const { email, password } = req.body;

        // Validate input
        if (!email || !password) {
            return res.status(400).json({
                message: "email and password are required"
            });
        }

        // Find user by email
        const user = await User.findOne({ email });
        if (!user) {
            return res.status(401).json({ message: "Invalid credentials" });
        }

        // Compare password
        const isMatch = await user.comparePassword(password);
        if (!isMatch) {
            return res.status(401).json({ message: "Invalid credentials" });
        }

        // Generate JWT token
        const token = generateToken(user._id);

        // Set JWT in httpOnly secure cookie
        res.cookie("token", token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === "production",
            sameSite: "strict",
            maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
        });

        const society = user.societyId
            ? await Society.findById(user.societyId).select("name code")
            : null;

        res.json({
            message: "Login successful",
            user: {
                id: user._id,
                name: user.name,
                email: user.email,
                faceProfileId: user.faceProfileId,
                role: user.role,
                status: user.status,
                societyId: user.societyId
            },
            society: society
                ? {
                    id: society._id,
                    name: society.name,
                    code: society.code
                }
                : null
        });
    } catch (err) {
        console.error("Login error:", err);
        res.status(500).json({
            message: "Login failed",
            error: err.message
        });
    }
};

// Get current user profile
exports.getProfile = async (req, res) => {
    try {
        const user = await User.findById(req.userId).select("-password");
        if (!user) {
            return res.status(404).json({ message: "User not found" });
        }

        const society = user.societyId
            ? await Society.findById(user.societyId).select("name code")
            : null;

        res.json({
            message: "Profile retrieved",
            user,
            society: society
                ? {
                    id: society._id,
                    name: society.name,
                    code: society.code
                }
                : null
        });
    } catch (err) {
        console.error("Get profile error:", err);
        res.status(500).json({
            message: "Failed to retrieve profile",
            error: err.message
        });
    }
};

// Logout User
exports.logout = async (req, res) => {
    try {
        // Clear the token cookie
        res.clearCookie("token", {
            httpOnly: true,
            secure: process.env.NODE_ENV === "production",
            sameSite: "strict"
        });

        res.json({
            message: "Logout successful"
        });
    } catch (err) {
        console.error("Logout error:", err);
        res.status(500).json({
            message: "Logout failed",
            error: err.message
        });
    }
};

// Get matched images for logged-in user
exports.getMyMatches = async (req, res) => {
    try {
        const matches = await FaceMatch.find({ userId: req.userId })
            .sort({ createdAt: -1 })
            .populate("eventId", "name");

        const payload = matches.map(match => ({
            imageUrl: match.imageUrl,
            distance: match.distance,
            createdAt: match.createdAt,
            eventId: match.eventId?._id || match.eventId,
            eventName: match.eventId?.name || null
        }));

        res.json({ matches: payload });
    } catch (err) {
        console.error("Get matches error:", err);
        res.status(500).json({ message: "Failed to load matches", error: err.message });
    }
};
