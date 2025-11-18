const { Schema, model } = require("mongoose");

const PropertyLikeSchema = new Schema(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "Users",
      required: true,
    },
    propertyId: {
      type: Schema.Types.ObjectId,
      ref: "Properties",
      required: true,
    },
    likedAt: {
      type: Date,
    },
  },
  { timestamps: true }
);

const PropertyLikeModel = model("PropertyLikes", PropertyLikeSchema);
module.exports = PropertyLikeModel;
