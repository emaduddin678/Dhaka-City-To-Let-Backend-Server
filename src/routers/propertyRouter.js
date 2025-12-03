const express = require("express");

const {
  getAllProperties,
  getPropertyById,
  getPropertiesByOwner,
  createProperty,
  getMyProperties,
  updateProperty,
  deleteProperty,
  togglePropertyStatus,
  createMultipleProperties,
  getPropertyByPropertyId,
} = require("../controllers/propertyController");
const {
  likeProperty,
  unlikeProperty,
  createVisitRequest,
  getAvailableSlots,
  updateVisitStatus,
  getUserLikedProperties,
  getPropertyLikes,
  getUserVisits,
  getPropertyVisits,
  cancelVisit,
  getLikedPropertyCounts,
  updateVisitRequest,
} = require("../controllers/propertyLikeVisitController.js");

const { isLoggedOut, isLoggedIn, isOwner } = require("../middlewares/auth.js");
const PropertyLikeModel = require("../models/propertyLikeModel.js");
const { uploadImageMulter } = require("../middlewares/uploadImageMulter.js");
// const auth = require("../middlewares/auth.js");
// import { validateProperty } from "../middlewares/validation.js";
// console.log(auth);
const propertyRouter = express.Router();

// Public routes (No authentication required)
propertyRouter.get("/", getAllProperties); // Get all properties with filters

// IMPORTANT: Specific routes MUST come BEFORE dynamic parameter routes
propertyRouter.get("/by-property-id/:propertyId", getPropertyByPropertyId);

// Protected routes (require authentication)
propertyRouter.use(isLoggedIn); // All routes below require login

propertyRouter.get("/owner/my-properties", isOwner, getMyProperties); // Get owner's properties
propertyRouter.post(
  "/",
  isOwner,
  uploadImageMulter.array("images", 7),
  createProperty
); // Create property
propertyRouter.post("/bulk", isOwner, createMultipleProperties); // Create property
// Owner only routes
propertyRouter.get("/owner/:ownerId", getPropertiesByOwner); // GET /api/properties/owner/:ownerId
propertyRouter.get("/:id", getPropertyById); // Get property by ID
propertyRouter.put("/:id", isOwner, updateProperty); // Update property
propertyRouter.delete("/:id", isOwner, deleteProperty); // Delete property
propertyRouter.patch("/:id/toggle-status", isOwner, togglePropertyStatus); // Activate/Deactivate

// ---------------- Like routes ----------------
propertyRouter.post("/:propertyId/like", likeProperty); // Like property
propertyRouter.delete("/:propertyId/unlike", unlikeProperty); // Unlike property
propertyRouter.get("/liked-properties/count", getLikedPropertyCounts); // Get all likes for property
// propertyRouter.get("/:propertyId/likes", getPropertyLikes); // Get all likes for property
propertyRouter.get("/user/:userId/liked-properties", getUserLikedProperties); // Get user's liked properties

// ---------------- Visit routes ----------------
propertyRouter.post("/:propertyId/visits", createVisitRequest); // Create visit request
propertyRouter.put("/:propertyId/visits/update", updateVisitRequest); // Update visit request
propertyRouter.get("/:propertyId/visits", getPropertyVisits); // Get property visits
propertyRouter.get("/:propertyId/visits/available-slots", getAvailableSlots); // Check availability
propertyRouter.get("/user/:userId/visits", getUserVisits); // Get user's visit requests
propertyRouter.patch("/visits/:visitId/status", isOwner, updateVisitStatus); // Owner updates visit status
propertyRouter.delete("/visits/:visitId", cancelVisit); // Cancel visit

module.exports = propertyRouter;
