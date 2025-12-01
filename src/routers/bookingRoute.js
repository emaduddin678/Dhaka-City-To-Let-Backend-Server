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

// ==================== TENANT ROUTES ====================
// POST /api/bookings/properties/:propertyId - Create booking request
bookingRouter.post("/properties/:propertyId", createBookingRequest);

// GET /api/bookings/my-bookings - Get my bookings (tenant view)
bookingRouter.get("/my-bookings", getMyBookings);

// DELETE /api/bookings/:bookingId/cancel - Cancel booking
bookingRouter.delete("/:bookingId/cancel", cancelBooking);

// ==================== OWNER ROUTES ====================
// GET /api/bookings/requests - Get all booking requests for owner's properties
bookingRouter.get("/requests", isOwner, getBookingRequests);

// PUT /api/bookings/:bookingId/accept - Accept booking
bookingRouter.put("/:bookingId/accept", isOwner, acceptBooking);

// PUT /api/bookings/:bookingId/reject - Reject booking
bookingRouter.put("/:bookingId/reject", isOwner, rejectBooking);

// ==================== PAYMENT ROUTES ====================
// POST /api/bookings/:bookingId/confirm-payment - Confirm payment
bookingRouter.post("/:bookingId/confirm-payment", confirmPayment);

// ==================== UTILITY ROUTES ====================
// GET /api/bookings/properties/:propertyId/availability - Check availability
bookingRouter.get(
  "/properties/:propertyId/availability",
  checkPropertyAvailability
);

// GET /api/bookings/:bookingId - Get booking by ID
bookingRouter.get("/:bookingId", getBookingById);

module.exports = bookingRouter;
