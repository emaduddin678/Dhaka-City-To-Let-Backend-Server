const createHttpError = require("http-errors");
const BookingModel = require("../models/BookingModel");
const PropertyModel = require("../models/proppertyModel");
const UserModel = require("../models/userModel");

// ==================== TENANT ACTIONS ====================

// 1. CREATE BOOKING REQUEST (Tenant books a property)
const createBookingRequest = async (req, res, next) => {
  try {
    const tenantId = req.user.id;
    const { propertyId } = req.params;
    const {
      moveInDate,
      rentalPeriod,
      tenantMessage,
      advanceRent = 0,
    } = req.body;

    // Validate property exists and is available
    const property = await PropertyModel.findById(propertyId).populate(
      "owner",
      "firstName lastName email phoneNumber"
    );

    if (!property) {
      throw createHttpError(404, "Property not found");
    }

    if (!property.isActive) {
      throw createHttpError(400, "Property is not available for booking");
    }

    // Check if tenant already has a pending/active booking for this property
    const existingBooking = await BookingModel.findOne({
      tenantId,
      propertyId,
      status: {
        $in: [
          "pending",
          "owner-review",
          "accepted",
          "payment-pending",
          "confirmed",
          "active",
        ],
      },
    });

    if (existingBooking) {
      throw createHttpError(
        400,
        "You already have an active booking request for this property"
      );
    }

    // Calculate financial details
    const monthlyRent = property.price;
    const securityDeposit = monthlyRent * 2; // 2 months security deposit
    const totalAmount = monthlyRent + securityDeposit + advanceRent;

    // Calculate move-out date
    const moveOutDate = new Date(moveInDate);
    moveOutDate.setMonth(moveOutDate.getMonth() + rentalPeriod);

    // Create booking
    const booking = await BookingModel.create({
      propertyId,
      tenantId,
      ownerId: property.owner._id,
      moveInDate,
      moveOutDate,
      rentalPeriod,
      monthlyRent,
      securityDeposit,
      advanceRent,
      totalAmount,
      tenantMessage,
      status: "owner-review", // Goes directly to owner for review
    });

    // Populate data for response
    await booking.populate([
      { path: "propertyId", select: "title propertyId address images" },
      {
        path: "tenantId",
        select: "firstName lastName email phoneNumber profileImage",
      },
      { path: "ownerId", select: "firstName lastName email phoneNumber" },
    ]);

    // TODO: Send notification to owner (email/SMS)

    res.status(201).json({
      success: true,
      message:
        "Booking request sent successfully! The owner will review it shortly.",
      booking,
    });
  } catch (error) {
    next(error);
  }
};

// 2. GET MY BOOKINGS (Tenant's all bookings)
const getMyBookings = async (req, res, next) => {
  try {
    const tenantId = req.user.id;
    const { status } = req.query;

    const query = { tenantId };
    if (status) query.status = status;

    const bookings = await BookingModel.find(query)
      .populate("propertyId", "title propertyId address images price")
      .populate("ownerId", "firstName lastName phoneNumber email profileImage")
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      count: bookings.length,
      bookings,
    });
  } catch (error) {
    next(error);
  }
};

// 3. CANCEL BOOKING (Tenant cancels)
const cancelBooking = async (req, res, next) => {
  try {
    const { bookingId } = req.params;
    const tenantId = req.user.id;
    const { cancellationReason } = req.body;

    const booking = await BookingModel.findById(bookingId);

    if (!booking) {
      throw createHttpError(404, "Booking not found");
    }

    if (booking.tenantId.toString() !== tenantId.toString()) {
      throw createHttpError(403, "You can only cancel your own bookings");
    }

    // Can only cancel if not yet confirmed
    if (
      !["pending", "owner-review", "accepted", "payment-pending"].includes(
        booking.status
      )
    ) {
      throw createHttpError(400, "Cannot cancel booking at this stage");
    }

    booking.status = "cancelled";
    booking.cancelledAt = new Date();
    booking.cancelledBy = tenantId;
    booking.cancellationReason = cancellationReason;
    await booking.save();

    res.json({
      success: true,
      message: "Booking cancelled successfully",
      booking,
    });
  } catch (error) {
    next(error);
  }
};

// ==================== OWNER ACTIONS ====================

// 4. GET BOOKING REQUESTS (Owner sees all requests for their properties)
const getBookingRequests = async (req, res, next) => {
  try {
    const ownerId = req.user.id;
    const { status } = req.query;

    const query = { ownerId };
    if (status) query.status = status;

    const bookings = await BookingModel.find(query)
      .populate("propertyId", "title propertyId address images price")
      .populate(
        "tenantId",
        "firstName lastName phoneNumber email profileImage nidNumber occupation"
      )
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      count: bookings.length,
      bookings,
    });
  } catch (error) {
    next(error);
  }
};

// 5. ACCEPT BOOKING (Owner accepts)
const acceptBooking = async (req, res, next) => {
  try {
    const { bookingId } = req.params;
    const ownerId = req.user.id;
    const { ownerResponse, specialTerms } = req.body;

    const booking = await BookingModel.findById(bookingId);

    if (!booking) {
      throw createHttpError(404, "Booking not found");
    }

    if (booking.ownerId.toString() !== ownerId.toString()) {
      throw createHttpError(
        403,
        "You can only manage your own property bookings"
      );
    }

    if (booking.status !== "owner-review") {
      throw createHttpError(400, "Cannot accept booking at this stage");
    }

    // ✅ SIMPLIFIED: Direct acceptance without payment logic
    booking.status = "accepted";
    booking.acceptedAt = new Date();
    booking.ownerResponse = ownerResponse;
    booking.specialTerms = specialTerms;
    await booking.save();

    // TODO: Notify tenant about acceptance

    res.json({
      success: true,
      message: "Booking accepted successfully!",
      booking,
    });
  } catch (error) {
    next(error);
  }
};

// 6. REJECT BOOKING (Owner rejects)
const rejectBooking = async (req, res, next) => {
  try {
    const { bookingId } = req.params;
    const ownerId = req.user.id;
    const { rejectionReason } = req.body;

    if (!rejectionReason) {
      throw createHttpError(400, "Rejection reason is required");
    }

    const booking = await BookingModel.findById(bookingId);

    if (!booking) {
      throw createHttpError(404, "Booking not found");
    }

    if (booking.ownerId.toString() !== ownerId.toString()) {
      throw createHttpError(
        403,
        "You can only manage your own property bookings"
      );
    }

    if (booking.status !== "owner-review") {
      throw createHttpError(400, "Cannot reject booking at this stage");
    }

    booking.status = "rejected";
    booking.rejectedAt = new Date();
    booking.rejectionReason = rejectionReason;
    await booking.save();

    res.json({
      success: true,
      message: "Booking rejected",
      booking,
    });
  } catch (error) {
    next(error);
  }
};

// ==================== CONFIRMATION ====================

// 7. CONFIRM BOOKING (Mark as confirmed/active)
const confirmPayment = async (req, res, next) => {
  try {
    const { bookingId } = req.params;
    const userId = req.user.id;

    const booking = await BookingModel.findById(bookingId);

    if (!booking) {
      throw createHttpError(404, "Booking not found");
    }

    // ✅ Allow both tenant and owner to confirm
    const isAuthorized =
      booking.tenantId.toString() === userId.toString() ||
      booking.ownerId.toString() === userId.toString();

    if (!isAuthorized) {
      throw createHttpError(
        403,
        "You are not authorized to confirm this booking"
      );
    }

    if (booking.status !== "accepted") {
      throw createHttpError(
        400,
        "Booking must be accepted before confirmation"
      );
    }

    // ✅ SIMPLIFIED: Direct confirmation without payment tracking
    booking.status = "confirmed";
    booking.confirmedAt = new Date();
    await booking.save();

    // ✅ Update property status (mark as rented)
    await PropertyModel.findByIdAndUpdate(booking.propertyId, {
      isActive: false,
    });

    res.json({
      success: true,
      message: "Booking confirmed successfully!",
      booking,
    });
  } catch (error) {
    next(error);
  }
};

// ==================== ADDITIONAL UTILITIES ====================

// 8. GET BOOKING BY ID
const getBookingById = async (req, res, next) => {
  try {
    const { bookingId } = req.params;
    const userId = req.user.id;

    const booking = await BookingModel.findById(bookingId)
      .populate("propertyId")
      .populate("tenantId", "-password")
      .populate("ownerId", "-password");

    if (!booking) {
      throw createHttpError(404, "Booking not found");
    }

    // Check if user is involved in this booking
    if (
      booking.tenantId._id.toString() !== userId.toString() &&
      booking.ownerId._id.toString() !== userId.toString()
    ) {
      throw createHttpError(403, "Access denied");
    }

    res.json({
      success: true,
      booking,
    });
  } catch (error) {
    next(error);
  }
};

// 9. CHECK PROPERTY AVAILABILITY
const checkPropertyAvailability = async (req, res, next) => {
  try {
    const { propertyId } = req.params;

    const property = await PropertyModel.findById(propertyId);

    if (!property) {
      throw createHttpError(404, "Property not found");
    }

    // Check active bookings
    const activeBooking = await BookingModel.findOne({
      propertyId,
      status: { $in: ["confirmed", "active"] },
    });

    res.json({
      success: true,
      isAvailable: !activeBooking && property.isActive,
      property: {
        id: property._id,
        title: property.title,
        price: property.price,
        isActive: property.isActive,
      },
      activeBooking: activeBooking
        ? {
            moveInDate: activeBooking.moveInDate,
            moveOutDate: activeBooking.moveOutDate,
          }
        : null,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  // Tenant actions
  createBookingRequest,
  getMyBookings,
  cancelBooking,

  // Owner actions
  getBookingRequests,
  acceptBooking,
  rejectBooking,

  // Confirmation
  confirmPayment,

  // Utilities
  getBookingById,
  checkPropertyAvailability,
};
