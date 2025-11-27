const express = require("express");
const cookieParser = require("cookie-parser");
const morgan = require("morgan");
const createError = require("http-errors");
const rateLimit = require("express-rate-limit");
const userRouter = require("./routers/userRouter");
const seedRouter = require("./routers/seedRouter");
const authRouter = require("./routers/authRouter");
const categoryRouter = require("./routers/categoryRouter");
const productRouter = require("./routers/ProductRouter");
const propertyRouter = require("./routers/propertyRouter");
const multer = require("multer");
const cors = require("cors");
const { isProduction } = require("./secret");

const app = express();

// CORS Configuration
const whitelist = isProduction
  ? ["https://to-let-sys.netlify.app", "http://localhost:4173"]
  : ["http://localhost:5173"];

const corsOptions = {
  origin: function (origin, callback) {
    if (!origin) return callback(null, true);
    if (whitelist.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      callback(new Error("Not allowed by CORS"));
    }
  },
  credentials: true,
};

app.use(cors(corsOptions));

// Rate Limiting
const rateLimiter = rateLimit({
  windowMs: 1 * 60 * 1000,
  max: 5,
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
app.use("/api/seed", seedRouter);
app.use("/api/users", userRouter);
app.use("/api/auth", authRouter);
app.use("/api/properties", propertyRouter);
app.use("/api/categories", categoryRouter);
app.use("/api/products", productRouter);

app.get("/", (req, res) => {
  res.send("Welcome to server");
});

app.get("/test", rateLimiter, (req, res) => {
  res.status(200).send({
    message: "api testing is working",
  });
});

// Error handling
app.use((req, res, next) => {
  next(createError(404, "route not found"));
});

app.use((err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    if (err.code === "LIMIT_UNEXPECTED_FILE") {
      return res.status(400).json({
        success: false,
        message: `Invalid file type for ${err.field}. Only jpg, jpeg, png, webp, gif are allowed.`,
      });
    }
    return res.status(400).json({ success: false, message: err.message });
  }
  if (err) {
    return res.status(err.status || 500).json({
      success: false,
      message: err.message || "Something went wrong",
    });
  }
  next();
});

module.exports = app;
