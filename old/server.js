const express = require("express");
const mongoose = require("mongoose");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const nodemailer = require("nodemailer");

const app = express();
app.use(express.json());
const cors = require("cors");

app.use(
  cors({
    origin: "*", // Allow all origins (for testing)
    methods: ["GET", "POST"],
    allowedHeaders: ["Content-Type", "x-auth-token"],
  })
);

// Setup mail transporter (Use your email credentials)
const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: "mukeshprajapat3093@gmail.com", // Replace with your email
    pass: "enha vsyb wind mshw", // Use App Password if using Gmail
  },
});
// MongoDB Connection
mongoose
  .connect(
    "mongodb+srv://root:root@ipr.hanid.mongodb.net/?retryWrites=true&w=majority&appName=ipr"
  )
  .then(() => console.log("Connected to MongoDB"))
  .catch((err) => console.error("MongoDB connection error:", err));

// User Schema
const userSchema = new mongoose.Schema({
  name: String,
  email: {
    type: String,
    unique: true,
  },
  password: String,
  age: Number,
  gender: String,
  profilePhoto: String, // URL to the profile photo in S3
  levels: [
    {
      chapter: String,
      levelNumber: Number,
      score: Number,
      timeTaken: Number,
      completedAt: {
        type: Date,
        default: Date.now,
      },
    },
  ],
});

const User = mongoose.model("User", userSchema);

// JWT Secret
const JWT_SECRET = "your-secret-key"; // Change this to a secure random string in production
// Store OTPs temporarily (in production, use a database or Redis)
const otpStore = {};

app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.originalUrl}`);
  next();
});

// Generate OTP endpoint
app.post("/api/generate-otp", async (req, res) => {
  try {
    const { email } = req.body;

    // Check if user already exists and is verified
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: "Email already exists" });
    }

    // Generate a 6-digit OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();

    // Store OTP with expiration (15 minutes)
    otpStore[email] = {
      code: otp,
      expiresAt: new Date(Date.now() + 15 * 60 * 1000), // 15 minutes
    };

    // Send OTP via email
    const mailOptions = {
      from: "mukeshprajapat3093@gmail.com",
      to: email,
      subject: "Your Email Verification OTP",
      html: `
        <h2>Email Verification</h2>
        <p>Your OTP for email verification is: <strong>${otp}</strong></p>
        <p>This code will expire in 15 minutes.</p>
      `,
    };

    await transporter.sendMail(mailOptions);
    res.json({ message: "OTP sent to email", success: true });
  } catch (error) {
    console.error("OTP Generation Error:", error);
    res.status(500).json({ message: "Server error" });
  }
});

app.post("/api/verify-otp", async (req, res) => {
  try {
    const { email, otp, userData: rawUserData } = req.body;

    // Ensure userData is properly parsed
    const userData =
      typeof rawUserData === "string" ? JSON.parse(rawUserData) : rawUserData;

    // Validate userData
    if (!userData || !userData.password) {
      return res.status(400).json({ message: "Invalid user data received" });
    }

    // Check OTP validity
    if (!otpStore[email] || otpStore[email].code !== otp) {
      return res.status(400).json({ message: "Invalid OTP" });
    }

    if (new Date() > new Date(otpStore[email].expiresAt)) {
      delete otpStore[email];
      return res.status(400).json({ message: "OTP has expired" });
    }

    // Extract user details
    const { name, password, age, gender } = userData;

    // Hash the password before saving
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Create a new user
    const newUser = new User({
      name,
      email,
      password: hashedPassword,
      age,
      gender,
      levels: [],
    });

    await newUser.save();
    delete otpStore[email]; // Clean up used OTP

    res.status(201).json({
      message: "Email verified and user registered successfully",
      success: true,
    });
  } catch (error) {
    console.error("OTP Verification Error:", error);
    res.status(500).json({ message: "Server error" });
  }
});

// Modify the register endpoint
app.post("/api/register", async (req, res) => {
  try {
    const { name, email, password, age, gender } = req.body;

    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: "User already exists" });
    }

    // Generate OTP for email verification instead of creating the user immediately
    const otp = Math.floor(100000 + Math.random() * 900000).toString();

    // Store OTP with expiration (15 minutes)
    otpStore[email] = {
      code: otp,
      expiresAt: new Date(Date.now() + 15 * 60 * 1000), // 15 minutes
      userData: { name, email, password, age, gender }, // Store user data temporarily
    };

    // Send OTP via email
    const mailOptions = {
      from: "mukeshprajapat3093@gmail.com",
      to: email,
      subject: "Your Email Verification OTP",
      html: `
        <h2>Email Verification</h2>
        <p>Your OTP for email verification is: <strong>${otp}</strong></p>
        <p>This code will expire in 15 minutes.</p>
      `,
    };

    await transporter.sendMail(mailOptions);
    res.json({ message: "OTP sent to email", success: true });
  } catch (error) {
    console.error("Registration error:", error);
    res.status(500).json({ message: "Server error" });
  }
});

// Login endpoint
app.post("/api/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    // Check if user exists
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(400).json({ message: "Invalid credentials" });
    }

    // Validate password
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ message: "Invalid credentials" });
    }

    // Generate JWT
    const token = jwt.sign({ id: user._id, email: user.email }, JWT_SECRET, {
      expiresIn: "1d",
    });

    res.json({
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        age: user.age,
        gender: user.gender,
      },
    });
  } catch (error) {
    console.error("Login error:", error);
    res.status(500).json({ message: "Server error" });
  }
});

// Auth middleware
const auth = (req, res, next) => {
  try {
    const token = req.header("x-auth-token");
    if (!token) {
      return res
        .status(401)
        .json({ message: "No token, authorization denied" });
    }

    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch (error) {
    res.status(401).json({ message: "Token is not valid" });
  }
};

// Protected route example
app.get("/api/user", auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select("-password");
    res.json(user);
  } catch (error) {
    console.error("User fetch error:", error);
    res.status(500).json({ message: "Server error" });
  }
});
// Get leaderboard - Fetch all users and sort by total score
app.get("/api/leaderboard", async (req, res) => {
  try {
    const users = await User.find().select("name email levels");

    // ✅ Calculate total score for each user
    const leaderboard = users.map((user) => ({
      name: user.name,
      email: user.email,
      totalScore: (user.levels || []).reduce(
        (sum, level) => sum + (level.score || 0),
        0
      ),
    }));

    // ✅ Sort by highest total score
    leaderboard.sort((a, b) => b.totalScore - a.totalScore);

    res.json(leaderboard);
  } catch (error) {
    console.error("Leaderboard fetch error:", error);
    res.status(500).json({ message: "Server error" });
  }
});

// Password Reset Route
app.post("/api/reset-password", async (req, res) => {
  const { email } = req.body;
  try {
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(400).json({ message: "User not found" });
    }

    // Generate a password reset token (valid for 15 minutes)
    const resetToken = jwt.sign({ email }, JWT_SECRET, { expiresIn: "15m" });

    // Ensure the path is compatible with Expo Router format
    // Note: Using the correct port where your Expo Web app is running
    const resetLink = `http://localhost:8081/reset-password?token=${resetToken}`;

    console.log("Generated reset link:", resetLink); // Debug log

    const mailOptions = {
      from: "mukeshprajapat3093@gmail.com",
      to: email,
      subject: "Reset Your Password",
      html: `
        <p>Click the link below to reset your password:</p>
        <p><a href="${resetLink}">Reset Password</a></p>
        <p>This link is valid for 15 minutes.</p>
        <p>If the link doesn't work, copy and paste this URL into your browser:</p>
        <p>${resetLink}</p>
      `,
    };

    await transporter.sendMail(mailOptions);
    res.json({ message: "Password reset link sent to email" });
  } catch (error) {
    console.error("Reset Password Error:", error);
    res.status(500).json({ message: "Server error" });
  }
});
// Verify Reset Token & Update Password
app.post("/api/update-password", async (req, res) => {
  const { token, newPassword } = req.body;
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    const user = await User.findOne({ email: decoded.email });

    if (!user) {
      return res.status(400).json({ message: "Invalid token" });
    }

    // Hash the new password
    const salt = await bcrypt.genSalt(10);
    user.password = await bcrypt.hash(newPassword, salt);
    await user.save();

    res.json({ message: "Password updated successfully" });
  } catch (error) {
    console.error("Update Password Error:", error);
    res.status(500).json({ message: "Invalid or expired token" });
  }
});

// Get user completed levels with scores
app.get("/api/user-levels", auth, async (req, res) => {
  try {
    const { email, chapter } = req.query;

    // Check if email is provided
    if (!email) {
      return res.status(400).json({ message: "Email is required" });
    }
    if (!chapter) {
      return res.status(400).json({ message: "Chapter is required" });
    }

    // Find the user
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // Get completed levels with scores for the requested chapter
    const completedLevelsData = user.levels
      .filter((level) => level.chapter === chapter)
      .map((level) => ({
        levelNumber: level.levelNumber,
        score: level.score || 0,
        completedAt: level.completedAt,
      }));

    // Extract just the level numbers for backward compatibility
    const completedLevels = completedLevelsData.map(
      (level) => level.levelNumber
    );

    res.json({
      completedLevels,
      completedLevelsData,
      message: `User levels for chapter '${chapter}' retrieved successfully`,
    });
  } catch (error) {
    console.error("Error retrieving user levels:", error);
    res.status(500).json({ message: "Server error" });
  }
});

app.post("/api/save-level", async (req, res) => {
  try {
    const { email, chapter, levelNumber, score, timeTaken, completed } =
      req.body;

    // Find the user
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // Check if this level already exists for the user
    const existingLevelIndex = user.levels.findIndex(
      (level) => level.chapter === chapter && level.levelNumber === levelNumber
    );

    if (existingLevelIndex !== -1) {
      // Update existing level if new score is higher
      if (user.levels[existingLevelIndex].score < score) {
        user.levels[existingLevelIndex].score = score;
        user.levels[existingLevelIndex].timeTaken = timeTaken;
        user.levels[existingLevelIndex].completedAt = Date.now();
      }
    } else {
      // Add new level
      user.levels.push({
        chapter,
        levelNumber,
        score,
        timeTaken,
        completedAt: Date.now(),
      });
    }

    await user.save();

    res.status(200).json({
      message: "Level data saved successfully",
      completed: completed || false,
      success: true,
    });
  } catch (error) {
    console.error("Error saving level data:", error);
    res.status(500).json({ message: "Server error" });
  }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, "0.0.0.0", () =>
  console.log(`Server running on port ${PORT}`)
);
