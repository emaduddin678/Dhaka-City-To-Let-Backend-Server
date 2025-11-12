// models/Property.js
const { Schema, model } = require("mongoose");

// Reusable address schema (same as User model)
const addressSchema = new Schema(
  {
    division: { type: String, required: true, trim: true },
    district: { type: String, required: true, trim: true },
    upazila: { type: String, trim: true },
    postcode: { type: String, trim: true },
    cityCorp: { type: String, trim: true },
    dhakaCitySubArea: { type: String, trim: true },
    addressLine: { type: String, required: true, trim: true },
  },
  { _id: false }
);

// Amenity schema
const amenitySchema = new Schema(
  {
    value: { type: String, required: true },
    label: { type: String, required: true },
  },
  { _id: false }
);

const propertySchema = new Schema(
  {
    // Property ID - Unique identifier
    propertyId: {
      type: String,
      unique: true,
      uppercase: true,
      trim: true,
      match: [/^[A-Z]{4}\d{4}$/, "Property ID must be in format AAAA0001"],
    },
    // Basic Information
    title: {
      type: String,
      required: [true, "Property title is required"],
      trim: true,
      minlength: [5, "Title must be at least 5 characters"],
      maxlength: [200, "Title must be at most 200 characters"],
    },

    description: {
      type: String,
      required: [true, "Property description is required"],
      trim: true,
      minlength: [20, "Description must be at least 20 characters"],
      maxlength: [2000, "Description must be at most 2000 characters"],
    },

    // Property Type & Category
    propertyType: {
      type: Number,
      required: [true, "Property type is required"],
    },

    category: {
      type: Number,
      required: [true, "Category is required"],
    },

    propertyFor: {
      type: Number,
      required: [true, "Property for (rent/sale) is required"],
    },

    // Furnished & Availability
    furnishedStatus: {
      type: Number,
      required: [true, "Furnished status is required"],
    },

    availabilityDate: {
      type: Date,
      required: [true, "Availability date is required"],
      validate: {
        validator: function (v) {
          return v >= new Date();
        },
        message: "Availability date must be in the future or today",
      },
    },

    // Amenities
    amenities: {
      type: [amenitySchema],
      default: [],
      validate: {
        validator: function (v) {
          return Array.isArray(v);
        },
        message: "Amenities must be an array",
      },
    },

    // Size & Price
    propertySize: {
      type: Number,
      required: [true, "Property size is required"],
      min: [100, "Property size must be at least 100 sqft"],
      max: [100000, "Property size cannot exceed 100,000 sqft"],
    },

    price: {
      type: Number,
      required: [true, "Price is required"],
      min: [500, "Price must be at least 500 BDT"],
      max: [10000000000, "Price seems too high"],
    },

    isNegotiable: {
      type: Boolean,
      default: false,
    },

    // Address
    address: {
      type: addressSchema,
      required: [true, "Property address is required"],
    },

    // Property Details
    bedrooms: {
      type: Number,
      required: [true, "Number of bedrooms is required"],
      min: [0, "Bedrooms cannot be negative"],
      max: [50, "Bedrooms cannot exceed 50"],
      default: 0,
    },

    bathrooms: {
      type: Number,
      required: [true, "Number of bathrooms is required"],
      min: [0, "Bathrooms cannot be negative"],
      max: [50, "Bathrooms cannot exceed 50"],
      default: 0,
    },

    floorNumber: {
      type: Number,
      required: [true, "Floor number is required"],
      min: [0, "Floor number cannot be negative"],
      max: [100, "Floor number cannot exceed 100"],
      default: 0,
    },
    flatNumber: {
      type: String,
      required: [true, "Flat number is required"],
      trim: true,
      default: "A",
    },
    drawingRoom: {
      type: Boolean,
      default: false,
    },
    diningRoom: {
      type: Boolean,
      default: false,
    },

    balconies: {
      type: Number,
      required: [true, "Number of balconies is required"],
      min: [0, "Balconies cannot be negative"],
      max: [20, "Balconies cannot exceed 20"],
      default: 0,
    },

    // Owner Information
    owner: {
      type: Schema.Types.ObjectId,
      ref: "Users",
      required: [true, "Property owner is required"],
    },

    // Images (you'll add this later)
    images: {
      type: [String],
      default: [],
      validate: {
        validator: function (v) {
          return v.length <= 6;
        },
        message: "Cannot upload more than 6 images",
      },
    },

    // Status & Visibility
    isActive: {
      type: Boolean,
      default: true,
    },

    isApproved: {
      type: Boolean,
      default: false, // Admin approval required
    },

    isFeatured: {
      type: Boolean,
      default: false, // For premium listings
    },

    // Statistics
    views: {
      type: Number,
      default: 0,
    },

    contactCount: {
      type: Number,
      default: 0,
    },

    // SEO & Metadata
    slug: {
      type: String,
      unique: true,
      sparse: true, // Allows null values
    },
  },
  {
    timestamps: true, // Adds createdAt and updatedAt
  }
);

// Virtual for full address
propertySchema.virtual("fullAddress").get(function () {
  const addr = this.address;
  return `${addr.addressLine}, ${addr.dhakaCitySubArea || ""}, ${
    addr.upazila || ""
  }, ${addr.district}, ${addr.division}`.trim();
});

// Static method to generate next property ID
propertySchema.statics.generateNextPropertyId = async function () {
  try {
    // Get the last property sorted by propertyId in descending order
    const lastProperty = await this.findOne({})
      .sort({ propertyId: -1 })
      .select("propertyId")
      .lean();

    if (!lastProperty) {
      // First property
      return "AAAA0001";
    }

    const lastId = lastProperty.propertyId;
    const letters = lastId.substring(0, 4);
    const numbers = parseInt(lastId.substring(4), 10);

    // If number part is less than 9999, just increment
    if (numbers < 9999) {
      const newNumber = (numbers + 1).toString().padStart(4, "0");
      return `${letters}${newNumber}`;
    }

    // Need to increment letter part
    let letterArray = letters.split("");
    let carry = true;

    // Start from the rightmost letter and increment
    for (let i = 3; i >= 0 && carry; i--) {
      if (letterArray[i] === "Z") {
        letterArray[i] = "A";
        // Continue carrying to the next position
      } else {
        letterArray[i] = String.fromCharCode(letterArray[i].charCodeAt(0) + 1);
        carry = false;
      }
    }

    // If we still have carry, we've exhausted all combinations
    if (carry) {
      throw new Error("Property ID limit reached (ZZZZ9999)");
    }

    return `${letterArray.join("")}0001`;
  } catch (error) {
    console.error("Error generating property ID:", error);
    throw error;
  }
};

// Pre-save hook to auto-generate propertyId
propertySchema.pre("save", async function (next) {
  if (this.isNew && !this.propertyId) {
    try {
      this.propertyId = await this.constructor.generateNextPropertyId();
    } catch (error) {
      return next(error);
    }
  }
  next();
});
const PropertyModel = model("Properties", propertySchema);
module.exports = PropertyModel;
