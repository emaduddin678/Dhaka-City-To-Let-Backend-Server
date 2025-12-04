const createError = require("http-errors");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");

const { successResponse } = require("./responseController");
const { createJSONWebToken } = require("../helper/jsonwebtoken");
const { jwtAccessKey, jwtRefreshKey } = require("../secret");
const {
  setAccessTokenCookie,
  setRefreshTokenCookie,
  clearAuthCookies,
} = require("../helper/cookie");
const UserModel = require("../models/userModel");

const handleLogin = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    const user = await UserModel.findOne({ email });

    if (!user) {
      throw createError(
        404,
        "User does not exist with this email. Please register first"
      );
    }

    const isPasswordMatch = await bcrypt.compare(password, user.password);
    if (!isPasswordMatch) {
      throw createError(401, "Authentication Failed!");
    }

    if (user.isBanned) {
      throw createError(403, "You are Banned. Please contact authority");
    }

    // Create tokens
    const accessToken = createJSONWebToken(
      {
        id: user._id,
        email: user.email,
        isTenant: user?.isTenant,
        isOwner: user?.isOwner,
        isAdmin: user?.isAdmin,
      },
      jwtAccessKey,
      "55m"
    );

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

    // Set cookies
    setAccessTokenCookie(res, accessToken);
    setRefreshTokenCookie(res, refreshToken);

    // User without password
    const userWithoutPassword = user.toObject();
    delete userWithoutPassword.password;

    return successResponse(res, {
      statusCode: 200,
      message: "User logged in successfully",
      payload: { userWithoutPassword },
    });
  } catch (error) {
    next(error);
  }
};

const handleLogout = async (req, res, next) => {
  try {
    clearAuthCookies(res);

    return successResponse(res, {
      statusCode: 200,
      message: "User logged out successfully",
      payload: {},
    });
  } catch (error) {
    next(error);
  }
};

const checkAuth = async (req, res, next) => {
  try {
    const me = await UserModel.findById(req.user.id).select("-password");

    if (!me) {
      throw createError(404, "User not found. Please login again.");
    }

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
    const oldRefreshToken = req.cookies.refreshToken;

    if (!oldRefreshToken) {
      throw createError(401, "Refresh token not found. Please login again.");
    }

    // Verify the old refresh token
    const decodedToken = jwt.verify(oldRefreshToken, jwtRefreshKey);

    if (!decodedToken) {
      throw createError(401, "Invalid refresh token. Please login again");
    }

    // Extract user data from decoded token
    const { id, email, isTenant, isOwner, isAdmin } = decodedToken;

    if (
      !id ||
      !email ||
      isTenant === undefined ||
      isOwner === undefined ||
      isAdmin === undefined
    ) {
      throw createError(401, "Invalid token payload. Please login again.");
    }

    // ✅ Verify user still exists and is not banned
    const user = await UserModel.findById(id);
    if (!user) {
      throw createError(404, "User not found. Please login again.");
    }
    if (user.isBanned) {
      throw createError(403, "Your account has been banned.");
    }

    // Create new tokens with current user state
    const accessToken = createJSONWebToken(
      {
        id: user._id,
        email: user.email,
        isTenant: user.isTenant,
        isOwner: user.isOwner,
        isAdmin: user.isAdmin,
      },
      jwtAccessKey,
      "55m"
    );

    const newRefreshToken = createJSONWebToken(
      {
        id: user._id,
        email: user.email,
        isTenant: user.isTenant,
        isOwner: user.isOwner,
        isAdmin: user.isAdmin,
      },
      jwtRefreshKey,
      "30d"
    );

    setAccessTokenCookie(res, accessToken);
    setRefreshTokenCookie(res, newRefreshToken);

    return successResponse(res, {
      statusCode: 200,
      message: "Token refreshed successfully",
      payload: {},
    });
  } catch (error) {
    // Clear cookies on refresh failure
    if (
      error.name === "TokenExpiredError" ||
      error.name === "JsonWebTokenError"
    ) {
      clearAuthCookies(res);
    }
    next(error);
  }
};

const handleProtectedRoute = async (req, res, next) => {
  try {
    const accessToken = req.cookies.accessToken;

    if (!accessToken) {
      throw createError(401, "Access token not found. Please login again.");
    }

    const decodedToken = jwt.verify(accessToken, jwtAccessKey);

    if (!decodedToken) {
      throw createError(401, "Invalid access token. Please login again");
    }

    return successResponse(res, {
      statusCode: 200,
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
