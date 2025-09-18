const { isProduction } = require("../secret");

const setAccessTokenCookie = (res, accessToken) => {
  res.cookie("accessToken", accessToken, {
    httpOnly: true,
    secure: isProduction,
    maxAge: 5 * 60 * 1000,
    sameSite: "none",
  });
};

const setRefreshTokenCookie = (res, refreshToken) => {
  res.cookie("refreshToken", refreshToken, {
    httpOnly: true,
    secure: isProduction,
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    sameSite: "none",
  });
};

module.exports = {
  setAccessTokenCookie,
  setRefreshTokenCookie,
};
