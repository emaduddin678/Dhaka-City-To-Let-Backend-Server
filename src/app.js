const express = require("express");
const cookieParser = require("cookie-parser");
const morgan = require("morgan");
const bodyParser = require("body-parser");
const createError = require("http-errors");
const xssClean = require("xss-clean");
const rateLimit = require("express-rate-limit");
const userRouter = require("./routers/userRouter");
const seedRouter = require("./routers/seedRouter");
const { errorResponse } = require("./controllers/responseController");
const authRouter = require("./routers/authRouter");
const categoryRouter = require("./routers/categoryRouter");
const productRouter = require("./routers/ProductRouter");
const multer = require("multer");
var cors = require("cors");
const { isProduction } = require("./secret");
const propertyRouter = require("./routers/propertyRouter");

const app = express();

var whitelist = isProduction
  ? ["https://to-let-sys.netlify.app"]
  : ["http://localhost:5173"];

var corsOptions = {
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
console.log(isProduction, process.env.NODE_ENV);
const rateLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 5,
  message: "Too many requests from this IP, please try again later",
});

app.use(cookieParser());
app.use(xssClean());
// app.use(morgan("dev"));
if (isProduction) {
  app.use(morgan("combined")); // Apache-style logs
} else {
  app.use(morgan("dev")); // colorful dev logs
}

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

app.use("/api/users", userRouter);

app.use("/api/seed", seedRouter);
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

// client error handling
app.use((req, res, next) => {
  next(createError(404, "route not found->client error handled"));
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
