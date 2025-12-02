const { isProduction } = require("../secret");

function getRedirectUrl(path = "") {
  const base = isProduction
    ? "https://to-let-sys.netlify.app"
    : "http://localhost:5173";
  return `${base}${path}`;
}

module.exports = getRedirectUrl;
