const { isProduction, clientURL } = require("../secret");

const getCookieOptions = (maxAge) => {
  const baseOptions = {
    httpOnly: true,
    secure: isProduction,
    sameSite: isProduction ? "none" : "lax",
    maxAge,
    path: "/",
  };

  // ✅ Add domain only in production and only if needed
  // Remove this if your frontend and backend share the same domain
  if (isProduction) {
    // Extract domain from clientURL if needed
    // Example: if backend is api.domain.com and frontend is domain.com
    // baseOptions.domain = '.domain.com';
  }

  return baseOptions;
};

const setAccessTokenCookie = (res, accessToken) => {
  res.cookie(
    "accessToken",
    accessToken,
    getCookieOptions(55 * 60 * 1000) // ✅ 25 minutes (matches JWT expiry)
  );
};

const setRefreshTokenCookie = (res, refreshToken) => {
  res.cookie(
    "refreshToken",
    refreshToken,
    getCookieOptions(30 * 24 * 60 * 60 * 1000) // 30 days
  );
};

const clearAuthCookies = (res) => {
  const clearOptions = {
    httpOnly: true,
    secure: isProduction,
    sameSite: isProduction ? "none" : "lax",
    path: "/",
  };

  res.clearCookie("accessToken", clearOptions);
  res.clearCookie("refreshToken", clearOptions);
};

module.exports = {
  setAccessTokenCookie,
  setRefreshTokenCookie,
  clearAuthCookies,
};
