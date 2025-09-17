const createError = require("http-errors");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");

const User = require("../models/userModel");
const { successResponse } = require("./responseController");
const { createJSONWebToken } = require("../helper/jsonwebtoken");
const { jwtAccessKey, jwtRefreshKey } = require("../secret");
const {
  setAccessTokenCookie,
  setRefreshTokenCookie,
} = require("../helper/cookie");

const handleLogin = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email });

    if (!user) {
      throw createError(
        404,
        "User does not exist with this email. Please register first"
      );
    }
    // console.log(user);

    const isPasswordMatch = await bcrypt.compare(password, user.password);
    if (!isPasswordMatch) {
      throw createError(401, "Authentication Failed!");
    }
    // isBanned
    if (user.isBanned) {
      throw createError(403, "You are Banned. Please contact authority");
    }
    // console.log(user)

    // token, cookie
    const accessToken = createJSONWebToken({ user }, jwtAccessKey, "5m");
    setAccessTokenCookie(res, accessToken);

    // refresh token, cookie
    const refreshToken = createJSONWebToken({ user }, jwtRefreshKey, "7d");
    setRefreshTokenCookie(res, refreshToken);

    // user without password
    const userWithoutPassword = user.toObject();
    delete userWithoutPassword.password;

    // success response
    return successResponse(res, {
      statusCode: 202,
      message: "users logged in  successfully",
      payload: { userWithoutPassword },
    });
  } catch (error) {
    next(error);
  }
};
const handleLogout = async (req, res, next) => {
  try {
    res.clearCookie("accessToken");
    res.clearCookie("refreshToken");

    // success response
    return successResponse(res, {
      statusCode: 202,
      message: "users logged out  successfully",
      payload: {},
    });
  } catch (error) {
    next(error);
  }
};
const checkAuth = async (req, res, next) => {
  try {
    const me = await User.findById(req.user.user._id).select("-password");
    if (!me) {
      // User ID was valid in token, but no longer exists in DB
      throw createError(404, "User not found. Please login again.");
    }
    return successResponse(res, {
      statusCode: 200,
      message: "Current user fetched successfully",
      payload: { me },
    });
  } catch (error) {
    next(error);
  }
};
const handleRefreshToken = async (req, res, next) => {
  try {
    const oldRefreshToken = req.cookies.refreshToken;

    // verify the old refresh token
    const decodedToken = jwt.verify(oldRefreshToken, jwtRefreshKey);

    if (!decodedToken) {
      throw createError(401, "Invalid refresh token. Please login again");
    }

    // console.log(decodedToken)
    const newUsers = {};
    newUsers.user = decodedToken.user;
    // const newUser = decodedToken.user;

    // token, cookie
    const accessToken = createJSONWebToken(newUsers, jwtAccessKey, "5m");

    setAccessTokenCookie(res, accessToken);

    // success response
    return successResponse(res, {
      statusCode: 202,
      message: "new access token is generated successfully",
      payload: {},
    });
  } catch (error) {
    next(error);
  }
};

const handleProtectedRoute = async (req, res, next) => {
  try {
    const accessToken = req.cookies.accessToken;

    // verify the old refresh token
    const decodedToken = jwt.verify(accessToken, jwtAccessKey);

    if (!decodedToken) {
      throw createError(
        401,
        "Invalid access token in protected Route. Please login again"
      );
    }

    // success response
    return successResponse(res, {
      statusCode: 202,
      message: "Protected resources accessed successfully",
      payload: {},
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  handleLogin,
  handleLogout,
  handleRefreshToken,
  handleProtectedRoute,
};
