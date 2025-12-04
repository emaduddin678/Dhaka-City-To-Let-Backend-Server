const express = require("express");
const {
  createBookingRequest,
  getMyBookings,
  cancelBooking,
  getBookingRequests,
  acceptBooking,
  rejectBooking,
  confirmPayment,
  getBookingById,
  checkPropertyAvailability,
} = require("../controllers/bookingController");
const { isLoggedIn, isOwner, isTenant } = require("../middlewares/auth");

const bookingRouter = express.Router();

// All routes require authentication
bookingRouter.use(isLoggedIn);

// ==================== SPECIFIC ROUTES FIRST ====================
// ⚠️ PUT SPECIFIC ROUTES BEFORE DYNAMIC PARAMS TO AVOID CONFLICTS

// GET /api/bookings/my-bookings - Get my bookings (tenant view)
bookingRouter.get("/my-bookings", getMyBookings);

// GET /api/bookings/requests - Get all booking requests for owner's properties
bookingRouter.get("/requests", isOwner, getBookingRequests);

// ==================== PROPERTY-SPECIFIC ROUTES ====================
// GET /api/bookings/properties/:propertyId/availability - Check availability
bookingRouter.get(
  "/properties/:propertyId/availability",
  checkPropertyAvailability
);

// POST /api/bookings/properties/:propertyId - Create booking request
bookingRouter.post("/properties/:propertyId", createBookingRequest);

// ==================== BOOKING-SPECIFIC ROUTES ====================
// PUT /api/bookings/:bookingId/accept - Accept booking
bookingRouter.put("/:bookingId/accept", isOwner, acceptBooking);

// PUT /api/bookings/:bookingId/reject - Reject booking
bookingRouter.put("/:bookingId/reject", isOwner, rejectBooking);

// POST /api/bookings/:bookingId/confirm-payment - Confirm payment
bookingRouter.post("/:bookingId/confirm-payment", confirmPayment);

// DELETE /api/bookings/:bookingId/cancel - Cancel booking
bookingRouter.delete("/:bookingId/cancel", cancelBooking);

// GET /api/bookings/:bookingId - Get booking by ID (MUST BE LAST)
bookingRouter.get("/:bookingId", getBookingById);

module.exports = bookingRouter;
