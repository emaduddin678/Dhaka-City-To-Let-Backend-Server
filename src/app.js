const express = require("express");
const cookieParser = require("cookie-parser");
const morgan = require("morgan");
const createError = require("http-errors");
const rateLimit = require("express-rate-limit");
const userRouter = require("./routers/userRouter");
const authRouter = require("./routers/authRouter");
const propertyRouter = require("./routers/propertyRouter");
const multer = require("multer");
const cors = require("cors");
const { isProduction } = require("./secret");
const bookingRouter = require("./routers/bookingRoute");
const adminRouter = require("./routers/adminRouter");
const PropertyModel = require("./models/proppertyModel");
const UserModel = require("./models/userModel");

const app = express();

// ✅ Fixed: Separate production and development whitelists
const whitelist = isProduction
  ? ["https://to-let-sys.netlify.app"]
  : ["http://localhost:5173", "http://192.168.0.126:5173"];

const corsOptions = {
  origin: function (origin, callback) {
    // Allow requests with no origin (mobile apps, Postman, etc.)
    if (!origin) return callback(null, true);

    if (whitelist.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      console.log(`CORS blocked origin: ${origin}`);
      callback(new Error("Not allowed by CORS"));
    }
  },
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization", "Cookie"],
  exposedHeaders: ["set-cookie"],
};

app.use(cors(corsOptions));

// ✅ Handle preflight requests
app.options("*", cors(corsOptions));

// Rate Limiting
const rateLimiter = rateLimit({
  windowMs: 1 * 60 * 1000,
  max: 50, // ✅ Increased from 5 to prevent blocking legitimate users
  message: "Too many requests from this IP, please try again later",
});

// Security headers
app.use((req, res, next) => {
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("X-Frame-Options", "DENY");
  res.setHeader("X-XSS-Protection", "1; mode=block");
  next();
});

app.use(cookieParser());

// Logging
if (isProduction) {
  app.use(morgan("combined"));
} else {
  app.use(morgan("dev"));
}

// Body parsing with size limits
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));

// Routes
app.use("/api/users", userRouter);
app.use("/api/auth", authRouter);
app.use("/api/properties", propertyRouter);
app.use("/api/bookings", bookingRouter);
app.use("/api/admin", adminRouter);

app.get("/", (req, res) => {
  res.send("Welcome to server");
});

app.get("/test", rateLimiter, (req, res) => {
  res.status(200).send({
    message: "api testing is working",
  });
});

// ✅ Health check endpoint for debugging
app.get("/api/health", (req, res) => {
  res.json({
    status: "ok",
    environment: isProduction ? "production" : "development",
    cookies: req.cookies,
    timestamp: new Date().toISOString(),
  });
});

// Error handling
app.use((req, res, next) => {
  next(createError(404, "route not found"));
});

// app.use((err, req, res, next) => {
//   if (err instanceof multer.MulterError) {
//     if (err.code === "LIMIT_UNEXPECTED_FILE") {
//       return res.status(400).json({
//         success: false,
//         message: `Invalid file type for ${err.field}. Only jpg, jpeg, png, webp, gif are allowed.`,
//       });
//     }
//     return res.status(400).json({ success: false, message: err.message });
//   }

//   // ✅ Better error logging in production
//   if (isProduction) {
//     console.error("Error:", {
//       message: err.message,
//       status: err.status,
//       stack: err.stack,
//     });
//   }
//   if (err) {
//     return res.status(err.status || 500).json({
//       success: false,
//       message: err.message || "Something went wrong",
//     });
//   }
//   console.error("Hhhhflaksjdfl;aksjfdl;aksdjf;laksdjflask",err);
//   next();
// });

app.use((err, req, res, next) => {
  // ✅ Multer errors
  if (err instanceof multer.MulterError) {
    if (err.code === "LIMIT_UNEXPECTED_FILE") {
      return res.status(400).json({
        success: false,
        message: `Invalid file type for ${err.field}. Only jpg, jpeg, png, webp, gif are allowed.`,
      });
    }
    return res.status(400).json({ success: false, message: err.message });
  }

  // ✅ JWT errors
  if (err.name === "TokenExpiredError") {
    return res.status(401).json({
      success: false,
      message: "Your session has expired. Please log in again.",
      expiredAt: err.expiredAt,
    });
  }

  if (err.name === "JsonWebTokenError") {
    return res.status(401).json({
      success: false,
      message: "Invalid token. Please log in again.",
    });
  }

  if (err.name === "NotBeforeError") {
    return res.status(401).json({
      success: false,
      message: "Token is not active yet.",
    });
  }

  // ✅ Better error logging in production
  if (isProduction) {
    console.error("Error:", {
      message: err.message,
      status: err.status,
      stack: err.stack,
    });
  }

  // ✅ Generic fallback
  return res.status(err.status || 500).json({
    success: false,
    message: err.message || "Something went wrong",
  });
});

module.exports = app;
