const UserModel = require("../models/userModel");

const checkUserExists = async (email) => {
  return await UserModel.exists({ email: email });
};

module.exports = checkUserExists;
