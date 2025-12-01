// const createHttpError = require("http-errors");
const data = require("../data");
const UserModel = require("../models/userModel");

const seedUser = async (req, res, next) => {
  try {
    // deleting all existing user
    // console.log(User)
    await UserModel.deleteMany({});
    // console.log(User)

    // inserting all new user
    const users = await UserModel.insertMany(data.users);
    // console.log(users)

    // successful response
    return res.status(202).json(users);
  } catch (error) {
    next(error);
    // next(createHttpError(403, "route not found->client error handled"));
  }
};
 
module.exports = { seedUser,  };
