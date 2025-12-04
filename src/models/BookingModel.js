const { Schema, model } = require("mongoose");

const bookingSchema = new Schema(
  {
    // Booking ID (unique identifier)
    bookingId: {
      type: String,
      unique: true,
      uppercase: true,
      trim: true,
      match: [/^BK\d{8}$/, "Booking ID must be in format BK00000001"],
    },

    // Property and users
    propertyId: {
      type: Schema.Types.ObjectId,
      ref: "Properties",
      required: [true, "Property ID is required"],
    },

    tenantId: {
      type: Schema.Types.ObjectId,
      ref: "Users",
      required: [true, "Tenant ID is required"],
    },

    ownerId: {
      type: Schema.Types.ObjectId,
      ref: "Users",
      required: [true, "Owner ID is required"],
    },

    // Booking dates
    moveInDate: {
      type: Date,
      required: [true, "Move-in date is required"],
      validate: {
        validator: function (v) {
          return v >= new Date();
        },
        message: "Move-in date must be in the future",
      },
    },

    // Rental period (in months)
    rentalPeriod: {
      type: Number,
      required: [true, "Rental period is required"],
      min: [1, "Minimum rental period is 1 month"],
    },

    // Financial details
    monthlyRent: {
      type: Number,
      required: [true, "Monthly rent is required"],
      min: [500, "Monthly rent must be at least 500 BDT"],
    },

    securityDeposit: {
      type: Number,
      required: [true, "Security deposit is required"],
      min: [0, "Security deposit cannot be negative"],
    },

    advanceRent: {
      type: Number,
      default: 0,
      min: [0, "Advance rent cannot be negative"],
    },

    totalAmount: {
      type: Number,
      required: [true, "Total amount is required"],
    },

   

    // Booking status
    status: {
      type: String,
      enum: [
        "pending", // Tenant created booking request
        "owner-review", // Owner is reviewing
        "accepted", // Owner accepted
        "rejected", // Owner rejected
        "confirmed", // Booking confirmed (no payment tracking)
        "active", // Tenant has moved in
        "completed", // Rental period ended
        "cancelled", // Cancelled by either party
      ],
      default: "pending",
    },

    // Special terms and conditions
    specialTerms: {
      type: String,
      maxlength: [1000, "Special terms cannot exceed 1000 characters"],
      trim: true,
    },

    // Tenant preferences/message to owner
    tenantMessage: {
      type: String,
      maxlength: [500, "Message cannot exceed 500 characters"],
      trim: true,
    },

    // Owner's response
    ownerResponse: {
      type: String,
      maxlength: [500, "Response cannot exceed 500 characters"],
      trim: true,
    },

    // Rejection reason
    rejectionReason: {
      type: String,
      maxlength: [500, "Rejection reason cannot exceed 500 characters"],
      trim: true,
    },

    // Agreement document URL (if uploaded)
    agreementDocument: {
      type: String,
      validate: {
        validator: function (v) {
          if (!v) return true;
          return /^https?:\/\/.+\.(pdf|doc|docx)$/i.test(v);
        },
        message: "Agreement must be a valid document URL",
      },
    },

    // Important dates tracking
    requestedAt: {
      type: Date,
      default: Date.now,
    },

    acceptedAt: {
      type: Date,
    },

    rejectedAt: {
      type: Date,
    },

    confirmedAt: {
      type: Date,
    },

    cancelledAt: {
      type: Date,
    },

    cancelledBy: {
      type: Schema.Types.ObjectId,
      ref: "Users",
    },

    cancellationReason: {
      type: String,
      maxlength: [500, "Cancellation reason cannot exceed 500 characters"],
    },
  },
  { timestamps: true }
);

// Generate booking ID
bookingSchema.statics.generateBookingId = async function () {
  const lastBooking = await this.findOne({})
    .sort({ bookingId: -1 })
    .select("bookingId")
    .lean();

  if (!lastBooking) {
    return "BK00000001";
  }

  const lastNumber = parseInt(lastBooking.bookingId.substring(2), 10);
  const newNumber = (lastNumber + 1).toString().padStart(8, "0");
  return `BK${newNumber}`;
};

// Pre-save hook to generate bookingId
bookingSchema.pre("save", async function (next) {
  if (this.isNew && !this.bookingId) {
    try {
      this.bookingId = await this.constructor.generateBookingId();
    } catch (error) {
      return next(error);
    }
  }
  next();
});

// Index for faster queries
bookingSchema.index({ tenantId: 1, status: 1 });
bookingSchema.index({ ownerId: 1, status: 1 });
bookingSchema.index({ propertyId: 1, status: 1 });
bookingSchema.index({ bookingId: 1 });

const BookingModel = model("Bookings", bookingSchema);
module.exports = BookingModel;
