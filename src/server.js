const app = require("./app.js");
const connectDatabase = require("./config/db.js");
const logger = require("./controllers/loggerController.js");
const { serverPort } = require("./secret.js");

connectDatabase().then(() => {
  app.listen(serverPort, async () => {
    logger.log(
      "info",
      `server is running on port ${process.env.SERVER_PORT} in ${process.env.NODE_ENV} mode at http://localhost:${serverPort}`
    );
  });
});
