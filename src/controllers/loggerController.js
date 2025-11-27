const { createLogger, format, transports } = require("winston");
// const { isProduction } = require("../secret");
// const path = require("path");

// // Use /tmp directory in production (Vercel), local directory in development
// const logDir = isProduction ? "/tmp" : "src/logs";

// const logger = createLogger({
//   level: "info",
//   format: format.combine(
//     format.json(),
//     format.timestamp({ format: "YYYY-MM-DD HH:mm:ss" })
//   ),
//   transports: [
//     new transports.File({
//       filename: path.join(logDir, "info.log"),
//       level: "info",
//       // maxsize: 2880,
//       // maxFiles: 5,
//     }),
//     new transports.File({
//       filename: path.join(logDir, "error.log"),
//       level: "error",
//       // maxsize: 2880,
//       // maxFiles: 5,
//     }),
//     new transports.Console({
//       format: format.combine(format.colorize(), format.simple()),
//     }),
//   ],
// });

// module.exports = logger;

const logger = createLogger({
  level: "info",
  format: format.combine(
    format.timestamp({ format: "YYYY-MM-DD HH:mm:ss" }),
    format.json()
  ),
  transports: [
    new transports.Console({
      format: format.combine(
        format.colorize(),
        format.printf(({ timestamp, level, message, ...meta }) => {
          return `${timestamp} [${level}]: ${message} ${
            Object.keys(meta).length ? JSON.stringify(meta) : ""
          }`;
        })
      ),
    }),
  ],
});

module.exports = logger;
