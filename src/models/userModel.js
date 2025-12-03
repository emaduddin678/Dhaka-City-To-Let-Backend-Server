const { Schema, model } = require("mongoose");
const bcrypt = require("bcryptjs");
const addressSchema = new Schema(
  {
    division: { type: String, required: true, trim: true },
    district: { type: String, required: true, trim: true },
    upazila: { type: String, required: true, trim: true },
    houseNumber: { type: String, required: true, trim: true },
    roadNumber: { type: String, required: true, trim: true },
    areaName: { type: String, required: true, trim: true },
    block: { type: String, trim: true },
    sector: { type: String, trim: true },
    landmark: { type: String, trim: true },
    googleMapsLink: { type: String, trim: true },
    postcode: { type: String, trim: true },
    cityCorp: { type: String, trim: true },
    dhakaCitySubArea: { type: String, trim: true },
  },
  { _id: false }
);

const userSchema = new Schema(
  {
    firstName: {
      type: String,
      required: [true, "First name is required"],
      trim: true,
      minlength: [2, "First name must be at least 2 characters"],
      maxlength: [50, "First name must be at most 50 characters"],
    },
    lastName: {
      type: String,
      required: [true, "Last name is required"],
      trim: true,
      minlength: [2, "Last name must be at least 2 characters"],
      maxlength: [50, "Last name must be at most 50 characters"],
    },
    email: {
      type: String,
      required: [true, "Email is required"],
      unique: true,
      lowercase: true,
      trim: true,
      validate: {
        validator: (v) => /^[\w.+-]+@[\w.-]+\.[a-zA-Z]{2,}$/.test(v),
        message: "Please provide a valid email address",
      },
    },
    password: {
      type: String,
      required: [true, "Password is required"],
      minlength: [8, "Password must be at least 8 characters"],
    },
    phoneNumber: {
      type: String,
      required: [true, "Phone number is required"],
      trim: true,
      validate: {
        validator: (v) => /^01[3-9]\d{8}$/.test(v), // ✅ BD mobile numbers (11 digits, starts 013–019)
        message: "Enter a valid Bangladeshi mobile number (e.g., 017XXXXXXXX)",
      },
    },

    emergencyContact: {
      type: String,
      trim: true,
      validate: {
        validator: function (v) {
          if (!v) return true; // optional field
          return /^01[3-9]\d{8}$/.test(v);
        },
        message: "Enter a valid Bangladeshi emergency contact number",
      },
    },

    nidNumber: {
      type: String,
      trim: true,
      validate: {
        validator: (v) => /^[0-9]{10,17}$/.test(v), // ✅ 10–17 digits
        message: "Enter a valid NID number (10–17 digits)",
      },
    },

    profileImage: {
      type: String,
      required: [true, "Profile image is required"],
      validate: {
        validator: function (v) {
          if (!v) return true; // optional
          return /^https?:\/\/.+\.(jpg|jpeg|png|webp|gif)$/i.test(v);
        },
        message: "Profile image must be a valid image URL",
      },
    },

    nidFront: {
      type: String,
      required: [true, "NID front image is required"],
      validate: {
        validator: function (v) {
          if (!v) return true;
          return /^https?:\/\/.+\.(jpg|jpeg|png|webp|gif)$/i.test(v);
        },
        message: "NID front must be a valid image URL",
      },
    },

    nidBack: {
      type: String,
      required: [true, "NID back image is required"],
      validate: {
        validator: function (v) {
          if (!v) return true;
          return /^https?:\/\/.+\.(jpg|jpeg|png|webp|gif)$/i.test(v);
        },
        message: "NID back must be a valid image URL",
      },
    },

    isTenant: {
      type: Boolean,
      default: false,
    },

    isOwner: {
      type: Boolean,
      default: false,
    },

    presentAddress: {
      type: addressSchema,
      required: [true, "Present address is required"],
    },

    permanentAddress: {
      type: addressSchema,
      required: [true, "Permanent address is required"],
    },

    occupation: {
      type: String,
      enum: [
        "student",
        "service-private",
        "government-job",
        "business",
        "doctor",
        "engineer",
        "teacher",
        "driver",
        "housewife",
        "freelancer",
        "retired",
        "unemployed",
        "other",
      ],
      trim: true,
      required: [true, "Occupation is required"],
    },

    organizationName: {
      type: String,
      trim: true,
      minlength: [2, "Organization name must be at least 2 characters"],
      maxlength: [100, "Organization name must be at most 100 characters"],
    },

    position: {
      type: String,
      required: [true, "Position is required"],
      trim: true,
      minlength: [2, "Position must be at least 2 characters"],
      maxlength: [100, "Position must be at most 100 characters"],
    },

    agreeTerms: {
      type: Boolean,
      required: [true, "You must agree to the terms"],
      validate: {
        validator: (v) => v === true,
        message: "You must agree to the terms",
      },
    },

    isAdmin: {
      type: Boolean,
      default: false,
    },
    isBanned: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true }
);
const UserModel = model("Users", userSchema);
module.exports = UserModel;
