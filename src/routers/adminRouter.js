// adminRouter.js
const express = require("express");
const {
  getDashboardStats,
  getAllUsers,
  updateUserStatus,
  deleteUser,
  getAllPropertiesAdmin,
  approveProperty,
  deletePropertyAdmin,
  getAllBookingsAdmin,
  updateBookingStatusAdmin,
  getAnalytics,
  getRecentActivities,
} = require("../controllers/adminController");
const { isLoggedIn, isAdmin } = require("../middlewares/auth");
const adminRouter = express.Router();

// All admin routes require authentication and admin role
adminRouter.use(isLoggedIn, isAdmin);

// Dashboard
adminRouter.get("/stats", getDashboardStats);
adminRouter.get("/activities", getRecentActivities);
adminRouter.get("/analytics", getAnalytics);

// User Management
adminRouter.get("/users", getAllUsers);
adminRouter.put("/users/:id/status", updateUserStatus);
adminRouter.delete("/users/:id", deleteUser);

// Property Management
adminRouter.get("/properties", getAllPropertiesAdmin);
adminRouter.put("/properties/:id/approve", approveProperty);
adminRouter.delete("/properties/:id", deletePropertyAdmin);

// Booking Management
adminRouter.get("/bookings", getAllBookingsAdmin);
adminRouter.put("/bookings/:id/status", updateBookingStatusAdmin);

module.exports = adminRouter;

// ============================================
// adminController.js
// ============================================
