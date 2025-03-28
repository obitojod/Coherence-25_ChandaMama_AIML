const express = require("express");
const mongoose = require("mongoose");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const nodemailer = require("nodemailer");
const path = require("path");
const multer = require("multer");
const aws = require("aws-sdk");
const fs = require("fs");
const axios = require("axios");
const pdfParse = require("pdf-parse");

// Important - load env variables first
require("dotenv").config({ path: path.resolve(__dirname, "../.env") });

// Gemini AI Integration
const GEMINI_API_KEY =
  process.env.GEMINI_API_KEY || "AIzaSyDEz-z1SYaOVqyNZiF-A1HFdJH8Lng7mBs";

// Function to extract text from the PDF buffer
async function extractTextFromPDF(pdfBuffer) {
  try {
    const data = await pdfParse(pdfBuffer);
    return data.text;
  } catch (error) {
    console.error("Error extracting text from PDF:", error);
    return null;
  }
}

// Function to extract structured data from resume text using Gemini AI
async function getStructuredDataFromGemini(text) {
  console.log("Extracting structured data from resume with Gemini...");
  const url =
    "https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-pro-latest:generateContent?key=" +
    GEMINI_API_KEY;

  const prompt = `
    Extract structured information from the following resume and return it in JSON format:
    - Full Name
    - Contact Information (Phone, Email, LinkedIn, Address)
    - Skills (as an array)
    - Education (Degree, University, Year)
    - Work Experience (as an array of objects with Company, Role, Duration including years/months)
    - Projects (Title, Description, Technologies Used)
    - Certifications
    
    Resume Text:
    """${text}"""
    
    Return only valid JSON output, without any additional text or explanations.
  `;

  try {
    const response = await axios.post(url, {
      contents: [{ parts: [{ text: prompt }] }],
    });

    let reply = response.data.candidates[0].content.parts[0].text;
    reply = reply
      .replace(/```json/g, "")
      .replace(/```/g, "")
      .trim();

    return JSON.parse(reply);
  } catch (error) {
    console.error(
      "Error fetching data from Gemini API:",
      error.response ? error.response.data : error.message
    );
    return null;
  }
}

// Function to calculate total experience from work history
function calculateTotalExperience(workExperience) {
  let totalYears = 0;
  if (Array.isArray(workExperience)) {
    workExperience.forEach((exp) => {
      const duration = exp.Duration || "";
      const years = duration.match(/(\d+)\s*years?/i);
      const months = duration.match(/(\d+)\s*months?/i);

      if (years) totalYears += parseInt(years[1]);
      if (months) totalYears += parseInt(months[1]) / 12;
    });
  }
  return Math.round(totalYears * 10) / 10; // Round to 1 decimal place
}

// Function to score resume using Gemini AI
async function scoreResumeWithGemini(resumeData, jobRequirements) {
  console.log("Scoring resume with Gemini AI...");
  const url =
    "https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-pro-latest:generateContent?key=" +
    GEMINI_API_KEY;

  const prompt = `
    You are an AI HR assistant. Score this candidate's resume based on the job requirements.
    Score each factor strictly out of 100 points. The final score will be the average.

    Job Requirements:
    ${JSON.stringify(jobRequirements, null, 2)}

    Candidate's Resume Data:
    ${JSON.stringify(resumeData, null, 2)}

    Score these factors strictly, considering exact matches and relevance:

    1. Skills Match (0-100):
    - Give points based on exact matches with required skills
    - Consider relevance and proficiency level
    - Deduct points for missing critical skills
    
    2. Experience Score (0-100):
    - Compare years of experience with requirement
    - Evaluate relevance of past roles
    - Consider industry-specific experience
    
    3. Education Match (0-100):
    - Score based on degree relevance
    - Consider university tier
    - Additional certifications
    
    4. Notice Period Score (0-100):
    - 100 points if notice period matches requirement
    - Deduct points proportionally for longer notice periods
    - Consider immediate joiners if preferred
    
    5. Overall Profile Score (0-100):
    - Project relevance
    - Industry alignment
    - Additional achievements
    
    Return only valid JSON in this format:
    {
        "breakdown": {
            "skills_score": number (0-100),
            "experience_score": number (0-100),
            "education_score": number (0-100),
            "notice_period_score": number (0-100),
            "overall_profile_score": number (0-100)
        },
        "final_score": number (average of all scores),
        "detailed_reasoning": {
            "skills_analysis": string,
            "experience_analysis": string,
            "education_analysis": string,
            "notice_period_analysis": string,
            "overall_analysis": string
        }
    }
  `;

  try {
    const response = await axios.post(url, {
      contents: [{ parts: [{ text: prompt }] }],
    });

    let reply = response.data.candidates[0].content.parts[0].text;
    reply = reply
      .replace(/```json/g, "")
      .replace(/```/g, "")
      .trim();
    const result = JSON.parse(reply);

    // Ensure final score is average of all scores
    const scores = Object.values(result.breakdown);
    result.final_score = Math.round(
      scores.reduce((a, b) => a + b, 0) / scores.length
    );

    return result;
  } catch (error) {
    console.error("Error in AI scoring:", error);
    return null;
  }
}

// AWS S3 Configuration
const s3 = new aws.S3({
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  region: process.env.AWS_REGION,
  // Add these settings to help debug S3 issues
  maxRetries: 3,
  httpOptions: { timeout: 30000 },
});

// Debug AWS configuration
console.log("S3 Config:", {
  bucket: process.env.AWS_BUCKET_NAME,
  region: process.env.AWS_REGION,
  keyId: process.env.AWS_ACCESS_KEY_ID
    ? "***" + process.env.AWS_ACCESS_KEY_ID.slice(-4)
    : "missing",
  secretKey: process.env.AWS_SECRET_ACCESS_KEY
    ? "***" + process.env.AWS_SECRET_ACCESS_KEY.slice(-4)
    : "missing",
});

// Test S3 bucket access instead of listing all buckets (which requires different permissions)
s3.headBucket({ Bucket: process.env.AWS_BUCKET_NAME }, (err, data) => {
  if (err) {
    console.error(
      `Error accessing S3 bucket "${process.env.AWS_BUCKET_NAME}":`,
      err
    );
    console.log(
      "Make sure your IAM user has s3:HeadBucket permission on this specific bucket"
    );
  } else {
    console.log(
      `Successfully connected to S3 bucket: ${process.env.AWS_BUCKET_NAME}`
    );

    // Test by putting a small test object
    s3.putObject(
      {
        Bucket: process.env.AWS_BUCKET_NAME,
        Key: "test-connection.txt",
        Body: "This is a test file to verify S3 connection and permissions.",
        ContentType: "text/plain",
      },
      (putErr, putData) => {
        if (putErr) {
          console.error("Error uploading test file to S3:", putErr);
          console.log("Make sure your IAM user has s3:PutObject permission");
        } else {
          console.log(
            "Successfully uploaded test file to S3, write permissions confirmed"
          );
          console.log("S3 URL capabilities confirmed");
        }
      }
    );
  }
});

const app = express();
// Increase JSON payload size limit for file uploads
app.use(express.json({ limit: "10mb" }));
// Also increase URL-encoded payload size limit
app.use(express.urlencoded({ extended: true, limit: "10mb" }));

const cors = require("cors");

app.use(
  cors({
    origin: "*", // Allow all origins (for testing)
    methods: ["GET", "POST", "DELETE"], // Added DELETE method
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
    "mongodb+srv://root:root@ipr.hanid.mongodb.net/chanda?retryWrites=true&w=majority&appName=chanda"
  )
  .then(() => console.log("Connected to MongoDB: chanda collection"))
  .catch((err) => console.error("MongoDB connection error:", err));

// User Schema
const userSchema = new mongoose.Schema({
  name: String,
  email: {
    type: String,
    unique: true,
  },
  password: String,
  company: String,
  position: String,
  department: String,
});

// Form Schema
const formSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  title: {
    type: String,
    required: true,
  },
  description: String,
  fields: {
    type: [Object],
    required: true,
  },
  hrRequirements: {
    job_id: String,
    role: String,
    experience_required: {
      minimum: Number,
      maximum: Number,
      preferred_industry: String,
    },
    notice_period: {
      required: String,
      preferred: String,
    },
    location: {
      city: String,
      state: String,
      country: String,
      remote_option: String,
    },
    required_skills: [String],
    preferred_skills: [String],
    qualifications: [String],
    job_description: String,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
  publicLink: String,
});

// Candidate Submission Schema
const submissionSchema = new mongoose.Schema({
  formId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Form",
    required: true,
  },
  responses: [
    {
      fieldId: String,
      value: String,
    },
  ],
  resumeUrl: String,
  aiEvaluation: {
    breakdown: {
      skills_score: Number,
      experience_score: Number,
      education_score: Number,
      notice_period_score: Number,
      overall_profile_score: Number,
    },
    final_score: Number,
    detailed_reasoning: {
      skills_analysis: String,
      experience_analysis: String,
      education_analysis: String,
      notice_period_analysis: String,
      overall_analysis: String,
    },
  },
  submittedAt: {
    type: Date,
    default: Date.now,
  },
});

const User = mongoose.model("User", userSchema);
const Form = mongoose.model("Form", formSchema);
const Submission = mongoose.model("Submission", submissionSchema);

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
      subject: "HR Recruitment Portal Verification OTP",
      html: `
        <h2>HR Recruitment Portal Email Verification</h2>
        <p>Your OTP for email verification is: <strong>${otp}</strong></p>
        <p>This code will expire in 15 minutes.</p>
        <p>Welcome to the HR Recruitment Portal!</p>
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

    // Hash the password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(userData.password, salt);

    // Create new user with hashed password
    const newUser = new User({
      name: userData.name,
      email: userData.email,
      password: hashedPassword,
      company: userData.company || "",
      position: userData.position || "",
      department: userData.department || "",
    });

    await newUser.save();

    // Clear OTP
    delete otpStore[email];

    res.status(201).json({
      message: "Email verified and user registered successfully",
      success: true,
    });
  } catch (error) {
    console.error("Registration Error:", error);
    res.status(500).json({ message: "Server error" });
  }
});

// Modify the register endpoint
app.post("/api/register", async (req, res) => {
  try {
    const { name, email, password, company, position, department } = req.body;

    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: "Email already exists" });
    }

    // Generate OTP for email verification
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
      subject: "HR Recruitment Portal Verification OTP",
      html: `
        <h2>HR Recruitment Portal Email Verification</h2>
        <p>Your OTP for email verification is: <strong>${otp}</strong></p>
        <p>This code will expire in 15 minutes.</p>
        <p>Welcome to the HR Recruitment Portal!</p>
      `,
    };

    await transporter.sendMail(mailOptions);
    res.json({
      message: "OTP sent to email for verification",
      success: true,
      email: email,
      userData: JSON.stringify({
        name,
        email,
        password,
        company,
        position,
        department,
      }),
    });
  } catch (error) {
    console.error("Registration Error:", error);
    res.status(500).json({ message: "Server error" });
  }
});

app.post("/api/login", async (req, res) => {
  try {
    const { email, password } = req.body;
    console.log(`Login attempt for: ${email}`);

    // Find user by email
    const user = await User.findOne({ email });
    if (!user) {
      console.log(`User not found: ${email}`);
      return res.status(400).json({ message: "Invalid credentials" });
    }

    // Check password
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      console.log(`Invalid password for: ${email}`);
      return res.status(400).json({ message: "Invalid credentials" });
    }

    // Generate JWT token
    const token = jwt.sign({ id: user._id }, JWT_SECRET, { expiresIn: "1d" });
    console.log(`Login successful for: ${email}, token generated`);

    // Return user info and token
    res.json({
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
      },
    });
  } catch (error) {
    console.error("Login Error:", error);
    res.status(500).json({ message: "Server error" });
  }
});

// Middleware for authentication
const auth = (req, res, next) => {
  // Get token from header
  const token = req.header("x-auth-token");
  console.log(
    "Auth middleware - token received:",
    token ? "Token present" : "No token"
  );

  // Check if no token
  if (!token) {
    return res.status(401).json({ message: "No token, authorization denied" });
  }

  try {
    // Verify token
    const decoded = jwt.verify(token, JWT_SECRET);
    console.log("Token verification successful. User ID:", decoded.id);
    req.user = decoded;
    next();
  } catch (error) {
    console.error("Token verification failed:", error.message);
    res.status(401).json({ message: "Token is not valid" });
  }
};

// Create a form endpoint
app.post("/api/forms", auth, async (req, res) => {
  try {
    // Log the entire request body for debugging
    console.log("Request body received for form creation");

    const { title, description, fields, hrRequirements } = req.body;

    // Validate required data
    if (!title) {
      console.error("Missing title in form data");
      return res.status(400).json({ message: "Form title is required" });
    }

    // Check fields data
    if (!fields || !Array.isArray(fields)) {
      console.error("Invalid fields data:", typeof fields);
      return res.status(400).json({ message: "Form fields must be an array" });
    }

    console.log(
      `Creating form with title: ${title} and ${fields.length} fields`
    );

    const userId = req.user.id;

    // Generate a unique public link
    const uniqueId = Math.random().toString(36).substring(2, 8);
    const publicLink = `/form/${uniqueId}`;

    // Ensure fields is properly processed as an array of objects
    const processedFields = fields.map((field) => ({
      id: field.id,
      type: field.type,
      label: field.label,
      required: field.required || false,
      options: field.options || [],
    }));

    // Create the form with HR requirements if provided
    const newForm = new Form({
      userId,
      title,
      description: description || "",
      fields: processedFields,
      publicLink,
      hrRequirements: hrRequirements || null,
    });

    const savedForm = await newForm.save();
    console.log("Form created successfully with ID:", savedForm._id);

    res.status(201).json({
      success: true,
      form: savedForm,
    });
  } catch (error) {
    console.error("Form Creation Error:", error.message);
    console.error("Stack:", error.stack);
    res.status(500).json({
      message: "Server error during form creation: " + error.message,
      error: error.name,
    });
  }
});

// Get all forms by user
app.get("/api/forms", auth, async (req, res) => {
  try {
    const forms = await Form.find({ userId: req.user.id });
    res.json({ forms });
  } catch (error) {
    console.error("Get Forms Error:", error);
    res.status(500).json({ message: "Server error" });
  }
});

// Get a form by public link
app.get("/api/forms/public/:uniqueId", async (req, res) => {
  try {
    const publicLink = `/form/${req.params.uniqueId}`;
    const form = await Form.findOne({ publicLink });

    if (!form) {
      return res.status(404).json({ message: "Form not found" });
    }

    res.json({ form });
  } catch (error) {
    console.error("Get Public Form Error:", error);
    res.status(500).json({ message: "Server error" });
  }
});

// Set up multer storage for temporary file uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    // Create a tmp directory if it doesn't exist
    const tempDir = path.join(__dirname, "tmp");
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
    }
    console.log(`File will be temporarily stored in: ${tempDir}`);
    cb(null, tempDir);
  },
  filename: function (req, file, cb) {
    const filename = Date.now() + "-" + file.originalname;
    console.log(`Generated temp filename: ${filename}`);
    cb(null, filename);
  },
});

// Configure multer with more logging
const upload = multer({
  storage: storage,
  fileFilter: (req, file, cb) => {
    console.log(`Received file: ${file.originalname}, type: ${file.mimetype}`);
    console.log("File info:", file);
    // Accept all file types
    cb(null, true);
  },
  // Add limits to better handle file uploads
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
});

// Debug middleware to inspect incoming requests with files
const logRequestMiddleware = (req, res, next) => {
  console.log("================ FILE UPLOAD REQUEST ================");
  console.log(`Received ${req.method} request to ${req.originalUrl}`);
  console.log("Headers:", req.headers);
  console.log("Content-Type:", req.headers["content-type"]);

  if (
    req.headers["content-type"] &&
    req.headers["content-type"].includes("multipart/form-data")
  ) {
    console.log("Multipart form detected");
    // Log more details about the request
    console.log("Body keys:", Object.keys(req.body));
    console.log("Request method:", req.method);
    // For testing, dump raw request chunks - just for debugging
    let rawData = "";
    req.on("data", (chunk) => {
      // Only collect a limited amount to avoid memory issues
      if (rawData.length < 1000) {
        rawData += chunk;
      }
    });
    req.on("end", () => {
      console.log("Raw request data sample:", rawData.substring(0, 200));
    });
  } else {
    console.log("Warning: Not a multipart form request");
  }

  next();
};

// Submit form response with file upload
app.post(
  "/api/submit/:formId",
  logRequestMiddleware,
  upload.single("resume"),
  async (req, res) => {
    try {
      const formId = req.params.formId;
      console.log(`Form submission received for form ID: ${formId}`);

      // First, fetch the form to get HR requirements
      const form = await Form.findById(formId);
      if (!form) {
        return res.status(404).json({ message: "Form not found" });
      }

      // Log file information if a file was uploaded
      if (req.file) {
        console.log("FILE RECEIVED ✓");
        console.log(`Filename: ${req.file.originalname}`);
        console.log(`Temp path: ${req.file.path}`);
        console.log(`Size: ${req.file.size} bytes`);
        console.log(`Mimetype: ${req.file.mimetype}`);
      } else {
        console.log("No file received in the request");
      }

      // Check if responses were provided
      if (!req.body.responses) {
        console.error("Missing 'responses' field in request body");
        return res.status(400).json({ message: "Missing form responses" });
      }

      // Parse responses
      let responses;
      try {
        responses = JSON.parse(req.body.responses);
        console.log(`Parsed ${responses.length} responses`);
      } catch (parseError) {
        console.error("Failed to parse responses:", parseError.message);
        return res.status(400).json({ message: "Invalid response format" });
      }

      // Initialize resumeUrl variable
      let resumeUrl = null;
      let aiEvaluation = null;

      // If a file was uploaded, upload it to S3
      if (req.file) {
        try {
          // Double check the file exists at the path
          if (!fs.existsSync(req.file.path)) {
            console.error(`File doesn't exist at path: ${req.file.path}`);
            return res.status(500).json({ message: "File processing error" });
          }

          const fileContent = fs.readFileSync(req.file.path);
          console.log(`Read ${fileContent.length} bytes from temp file`);

          // Process resume with Gemini AI if HR requirements are present
          if (form.hrRequirements) {
            try {
              console.log("Starting Gemini AI resume processing...");
              // Extract text from the PDF
              const resumeText = await extractTextFromPDF(fileContent);

              if (resumeText) {
                // Get structured data from the resume
                const structuredData = await getStructuredDataFromGemini(
                  resumeText
                );

                if (structuredData) {
                  // Calculate total experience if work experience is available
                  if (structuredData["Work Experience"]) {
                    structuredData["Total Experience Years"] =
                      calculateTotalExperience(
                        structuredData["Work Experience"]
                      );
                  }

                  // Format job requirements to match expected structure
                  const jobRequirements = {
                    role: form.hrRequirements.role,
                    experience_required:
                      form.hrRequirements.experience_required,
                    notice_period: form.hrRequirements.notice_period,
                    required_skills: form.hrRequirements.required_skills,
                    preferred_skills: form.hrRequirements.preferred_skills,
                    qualifications: form.hrRequirements.qualifications,
                    job_description: form.hrRequirements.job_description,
                  };

                  // Score the resume
                  aiEvaluation = await scoreResumeWithGemini(
                    structuredData,
                    jobRequirements
                  );
                  console.log(
                    "AI evaluation completed with score:",
                    aiEvaluation ? aiEvaluation.final_score : "N/A"
                  );
                } else {
                  console.log("Failed to extract structured data from resume");
                }
              } else {
                console.log("Failed to extract text from PDF");
              }
            } catch (aiError) {
              console.error("Error processing resume with AI:", aiError);
              // Continue without AI evaluation if error occurs
            }
          } else {
            console.log(
              "No HR requirements found for this form - skipping AI evaluation"
            );
          }

          // Generate a unique S3 key
          const s3Key = `resumes/${Date.now()}-${req.file.originalname.replace(
            /[^a-zA-Z0-9.-]/g,
            "_"
          )}`;

          // Set up S3 upload parameters - remove ACL if it causes permissions issues
          const params = {
            Bucket: process.env.AWS_BUCKET_NAME,
            Key: s3Key,
            Body: fileContent,
            ContentType: req.file.mimetype,
          };

          console.log(
            `Uploading to S3: ${s3Key} (${process.env.AWS_BUCKET_NAME})`
          );

          // Try upload with Promise-based approach
          const s3Response = await s3.upload(params).promise();
          resumeUrl = s3Response.Location;
          console.log(`S3 upload successful! File URL: ${resumeUrl}`);

          // If Location is undefined, construct the URL manually
          if (!resumeUrl) {
            resumeUrl = `https://${process.env.AWS_BUCKET_NAME}.s3.${process.env.AWS_REGION}.amazonaws.com/${s3Key}`;
            console.log(`Generated URL manually: ${resumeUrl}`);
          }

          // Clean up the temporary file
          try {
            fs.unlinkSync(req.file.path);
            console.log(`Removed temporary file: ${req.file.path}`);
          } catch (unlinkError) {
            console.error(`Failed to delete temp file: ${unlinkError.message}`);
          }
        } catch (uploadErr) {
          console.error("S3 Upload Error:", uploadErr.message);

          // Try fallback approach with putObject
          try {
            console.log("Trying fallback putObject method...");
            await s3.putObject(params).promise();
            resumeUrl = `https://${process.env.AWS_BUCKET_NAME}.s3.${process.env.AWS_REGION}.amazonaws.com/${s3Key}`;
            console.log(
              `Fallback upload successful! Generated URL: ${resumeUrl}`
            );
          } catch (fallbackErr) {
            console.error("Fallback S3 Upload Failed:", fallbackErr.message);
            throw uploadErr; // Re-throw the original error
          }
        }
      } else {
        console.log("No resume file was uploaded with the form submission");

        // Check if resume might be in the request body instead
        if (req.body && req.body.resume) {
          console.log("Found resume in request body");
          try {
            // For testing, log what type of data we received
            console.log("Resume type in body:", typeof req.body.resume);

            // Create temp file path
            const tempDir = path.join(__dirname, "tmp");
            if (!fs.existsSync(tempDir)) {
              fs.mkdirSync(tempDir, { recursive: true });
            }
            const tempFilePath = path.join(tempDir, `temp-${Date.now()}.pdf`);

            // Handle different types of resume data
            let fileBuffer;
            if (typeof req.body.resume === "string") {
              // If it's base64 encoded
              if (req.body.resume.startsWith("data:")) {
                // Parse data URL
                const matches = req.body.resume.match(
                  /^data:([A-Za-z-+\/]+);base64,(.+)$/
                );
                if (matches && matches.length === 3) {
                  const contentType = matches[1];
                  const data = matches[2];
                  fileBuffer = Buffer.from(data, "base64");
                  console.log(
                    `Parsed base64 data, size: ${fileBuffer.length} bytes`
                  );
                }
              } else {
                // Just plain base64 without data URL prefix
                fileBuffer = Buffer.from(req.body.resume, "base64");
              }
            } else if (Buffer.isBuffer(req.body.resume)) {
              fileBuffer = req.body.resume;
            } else if (typeof req.body.resume === "object") {
              console.log("Resume is an object, can't process directly");
              return;
            }

            if (fileBuffer) {
              fs.writeFileSync(tempFilePath, fileBuffer);
              console.log(`Saved temporary file: ${tempFilePath}`);

              // Now upload to S3
              const s3Key = `resumes/${Date.now()}-resume.pdf`;

              const params = {
                Bucket: process.env.AWS_BUCKET_NAME,
                Key: s3Key,
                Body: fileBuffer,
                ContentType: "application/pdf",
              };

              const s3Response = await s3.upload(params).promise();
              resumeUrl =
                s3Response.Location ||
                `https://${process.env.AWS_BUCKET_NAME}.s3.${process.env.AWS_REGION}.amazonaws.com/${s3Key}`;
              console.log(`Uploaded from request body to S3: ${resumeUrl}`);

              // Clean up
              fs.unlinkSync(tempFilePath);
            }
          } catch (bodyError) {
            console.error("Error processing resume from body:", bodyError);
          }
        } else {
          console.log("No resume found in request body either");
        }

        console.log("Request headers:", req.headers);
        console.log("Form data content-type:", req.headers["content-type"]);
        if (
          req.headers["content-type"] &&
          req.headers["content-type"].includes("multipart/form-data")
        ) {
          console.error(
            "Request is multipart but no file was captured by multer"
          );
        }
      }

      // Create and save the submission with AI evaluation results
      const submission = new Submission({
        formId,
        responses,
        resumeUrl,
        aiEvaluation,
      });

      const savedSubmission = await submission.save();
      console.log(`Form submission saved with ID: ${savedSubmission._id}`);

      res.status(201).json({
        success: true,
        message: "Form submitted successfully",
        submissionId: savedSubmission._id,
        resumeUrl: resumeUrl || null,
        aiScore: aiEvaluation ? aiEvaluation.final_score : null,
      });
    } catch (error) {
      console.error("Form Submission Error:", error.message);
      console.error(error.stack);
      res.status(500).json({
        message: "Server error during form submission",
        error: error.message,
      });
    }
  }
);

// Get form submissions
app.get("/api/submissions/:formId", auth, async (req, res) => {
  try {
    const formId = req.params.formId;
    const { sortBy } = req.query; // Optional query parameter for sorting

    // Verify the form belongs to the user
    const form = await Form.findOne({ _id: formId, userId: req.user.id });
    if (!form) {
      return res
        .status(403)
        .json({ message: "Not authorized to access this form" });
    }

    // Fetch submissions
    let submissions = await Submission.find({ formId });

    // Sort submissions based on the sortBy parameter
    if (sortBy) {
      switch (sortBy) {
        case "final_score":
          submissions.sort((a, b) => {
            const scoreA = a.aiEvaluation?.final_score || 0;
            const scoreB = b.aiEvaluation?.final_score || 0;
            return scoreB - scoreA; // Descending order
          });
          break;
        case "skills_score":
          submissions.sort((a, b) => {
            const scoreA = a.aiEvaluation?.breakdown?.skills_score || 0;
            const scoreB = b.aiEvaluation?.breakdown?.skills_score || 0;
            return scoreB - scoreA;
          });
          break;
        case "experience_score":
          submissions.sort((a, b) => {
            const scoreA = a.aiEvaluation?.breakdown?.experience_score || 0;
            const scoreB = b.aiEvaluation?.breakdown?.experience_score || 0;
            return scoreB - scoreA;
          });
          break;
        case "education_score":
          submissions.sort((a, b) => {
            const scoreA = a.aiEvaluation?.breakdown?.education_score || 0;
            const scoreB = b.aiEvaluation?.breakdown?.education_score || 0;
            return scoreB - scoreA;
          });
          break;
        case "notice_period_score":
          submissions.sort((a, b) => {
            const scoreA = a.aiEvaluation?.breakdown?.notice_period_score || 0;
            const scoreB = b.aiEvaluation?.breakdown?.notice_period_score || 0;
            return scoreB - scoreA;
          });
          break;
        case "overall_profile_score":
          submissions.sort((a, b) => {
            const scoreA =
              a.aiEvaluation?.breakdown?.overall_profile_score || 0;
            const scoreB =
              b.aiEvaluation?.breakdown?.overall_profile_score || 0;
            return scoreB - scoreA;
          });
          break;
        case "date":
          submissions.sort(
            (a, b) => new Date(b.submittedAt) - new Date(a.submittedAt)
          );
          break;
        default:
          // Default sort by final score if available, otherwise by date
          submissions.sort((a, b) => {
            if (a.aiEvaluation?.final_score && b.aiEvaluation?.final_score) {
              return b.aiEvaluation.final_score - a.aiEvaluation.final_score;
            } else {
              return new Date(b.submittedAt) - new Date(a.submittedAt);
            }
          });
      }
    } else {
      // Default sort by AI score if available
      submissions.sort((a, b) => {
        if (a.aiEvaluation?.final_score && b.aiEvaluation?.final_score) {
          return b.aiEvaluation.final_score - a.aiEvaluation.final_score;
        } else {
          return new Date(b.submittedAt) - new Date(a.submittedAt);
        }
      });
    }

    // Format the response to include the HR requirements
    const response = {
      form: {
        title: form.title,
        description: form.description,
        hrRequirements: form.hrRequirements || {},
      },
      submissions: submissions.map((submission) => ({
        _id: submission._id,
        formId: submission.formId,
        responses: submission.responses,
        resumeUrl: submission.resumeUrl,
        aiEvaluation: submission.aiEvaluation || null,
        submittedAt: submission.submittedAt,
      })),
    };

    res.json(response);
  } catch (error) {
    console.error("Get Submissions Error:", error);
    res.status(500).json({ message: "Server error" });
  }
});

// Start the server
const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
