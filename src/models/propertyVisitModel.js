const { Schema, model } = require("mongoose");

const PropertyVisitSchema = new Schema(
  {
    propertyId: {
      type: Schema.Types.ObjectId,
      ref: "Properties",
      required: true,
    },
    tenantId: {
      type: Schema.Types.ObjectId,
      ref: "Users",
      required: true,
    },
    ownerId: {
      type: Schema.Types.ObjectId,
      ref: "Users",
      required: true,
    },
    visitDate: { type: Date, required: true },
    visitTime: { type: String, required: true },
    status: {
      type: String,
      enum: ["pending", "confirmed", "cancelled", "completed"],
      default: "pending",
    },
    notes: String,
  },
  { timestamps: true }
);

const PropertyVisitModel = model("PropertyVisits", PropertyVisitSchema);
module.exports = PropertyVisitModel;
