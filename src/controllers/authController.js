const createError = require("http-errors");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");

const { successResponse } = require("./responseController");
const { createJSONWebToken } = require("../helper/jsonwebtoken");
const { jwtAccessKey, jwtRefreshKey } = require("../secret");
const {
  setAccessTokenCookie,
  setRefreshTokenCookie,
} = require("../helper/cookie");
const UserModel = require("../models/userModel");

const handleLogin = async (req, res, next) => {
  try {
    const { email, password } = req.body;
    console.log(email, password);

    const user = await UserModel.findOne({ email });

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
    const accessToken = createJSONWebToken(
      {
        id: user._id,
        email: user.email,
        isTenant: user?.isTenant,
        isOwner: user?.isOwner,
        isAdmin: user?.isAdmin,
      },
      jwtAccessKey,
      "25m"
    );
    setAccessTokenCookie(res, accessToken);

    // refresh token, cookie
    const refreshToken = createJSONWebToken(
      {
        id: user._id,
        email: user.email,
        isTenant: user?.isTenant,
        isOwner: user?.isOwner,
        isAdmin: user?.isAdmin,
      },
      jwtRefreshKey,
      "30d"
    );
    setRefreshTokenCookie(res, refreshToken);

    // user without password
    const userWithoutPassword = user.toObject();
    delete userWithoutPassword.password;
    console.log("TEste");
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
      statusCode: 200,
      message: "users logged out  successfully",
      payload: {},
    });
  } catch (error) {
    next(error);
  }
};
const checkAuth = async (req, res, next) => {
  try {
    console.log("Check auth called");
    // console.log("User ID from token:", req.user);
    const me = await UserModel.findById(req.user.id).select("-password");
    if (!me) {
      // User ID was valid in token, but no longer exists in DB
      throw createError(404, "User not found. Please login again.");
    }
    // Check if user is banned since login
    if (me.isBanned) {
      throw createError(403, "Your account has been banned.");
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
    // return;
    console.log("Refresh token called");
    const oldRefreshToken = req.cookies.refreshToken;
    if (!oldRefreshToken) {
      throw createError(401, "Refresh token not found. Please login again.");
    }

    console.log("oldRefreshToken");
    // if (!oldRefreshToken) throw createError(401, "No refresh token");
    // verify the old refresh token
    const decodedToken = jwt.verify(oldRefreshToken, jwtRefreshKey);
    // console.log(decodedToken, decodedToken);
    if (!decodedToken) {
      throw createError(401, "Invalid refresh token. Please login again");
    }

    // ✅ FIXED: Extract id and email directly from decoded token
    const { id, email, isTenant, isOwner, isAdmin } = decodedToken;
    if (!id || !email || !isTenant || !isOwner || !isAdmin) {
      throw createError(401, "Invalid token payload. Please login again.");
    }
    // ✅ FIXED: Create new tokens with correct payload structure
    const accessToken = createJSONWebToken(
      { id, email, isTenant, isOwner, isAdmin },
      jwtAccessKey,
      "25m"
    );
    const newRefreshToken = createJSONWebToken(
      { id, email, isTenant, isOwner, isAdmin },
      jwtRefreshKey,
      "30d"
    );
    setAccessTokenCookie(res, accessToken);
    setRefreshTokenCookie(res, newRefreshToken);

    // success response
    return successResponse(res, {
      statusCode: 200,
      message: "Token refreshed successfully",
      payload: {},
    });
  } catch (error) {
    // Clear cookies on refresh failure
    res.clearCookie("accessToken");
    res.clearCookie("refreshToken");
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
  checkAuth,
  handleRefreshToken,
  handleProtectedRoute,
};
