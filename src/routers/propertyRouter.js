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
const { isLoggedOut, isLoggedIn, isOwner } = require("../middlewares/auth.js");
// const auth = require("../middlewares/auth.js");
// import { validateProperty } from "../middlewares/validation.js";
// console.log(auth);
const propertyRouter = express.Router();

// Public routes
propertyRouter.get("/", getAllProperties); // Get all properties with filters
propertyRouter.get("/:id", getPropertyById); // Get single property by ID
propertyRouter.get("/by-property-id/:propertyId", getPropertyByPropertyId);

// Protected routes (require authentication)
propertyRouter.use(isLoggedIn); // All routes below require login

propertyRouter.get("/owner/my-properties", isOwner, getMyProperties); // Get owner's properties
propertyRouter.get("/owner/:ownerId", getPropertiesByOwner); // GET /api/properties/owner/:ownerId
// Owner only routes
propertyRouter.post("/", isOwner, createProperty); // Create property
propertyRouter.post("/bulk", isOwner, createMultipleProperties); // Create property
propertyRouter.put("/:id", isOwner, updateProperty); // Update property
propertyRouter.delete("/:id", isOwner, deleteProperty); // Delete property
propertyRouter.patch("/:id/toggle-status", isOwner, togglePropertyStatus); // Activate/Deactivate

module.exports = propertyRouter;
