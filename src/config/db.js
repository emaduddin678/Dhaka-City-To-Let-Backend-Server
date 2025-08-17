const mongoose = require("mongoose");
const { mongodbURL } = require("../secret");
const logger = require("../controllers/loggerController.js");

const connectDatabase = async (options = {}) => {
  try {
    console.log("Connecting to database...");

    const connection = mongoose.connection;

    connection.on("connected", () => {
      logger.log("info", "Server is Connected with database");
    });

    connection.on("error", (error) => {
      logger.log("error", "Something is wrong in mongodb, as", error);
    });

    await mongoose.connect(mongodbURL, options);
  } catch (error) {
    logger.log("error", "Could not connect to DB", error.toString());
  }
};

module.exports = connectDatabase;
