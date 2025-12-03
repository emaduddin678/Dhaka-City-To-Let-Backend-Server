const createError = require("http-errors");
const { uploadBufferToCloudinary } = require("../helper/cloudinaryHelper");
const PropertyModel = require("../models/proppertyModel");
// const UserModel = require("../models/User");

// @desc    Create new property
// @route   POST /api/properties
// @access  Private (Owner only)
const createPropertyold = async (req, res) => {
  try {
    const {
      title,
      description,
      propertyType,
      category,
      propertyFor,
      furnishedStatus,
      availabilityDate,
      amenities,
      propertySize,
      price,
      isNegotiable,
      address,
      bedrooms,
      bathrooms,
      floorNumber,
      flatNumber,
      drawingRoom,
      diningRoom,
      balconies,
    } = req.body;

    // Check if user is owner
    if (!req.user.isOwner) {
      return res.status(403).json({
        success: false,
        message: "Only owners can create properties",
      });
    }

    let existingProperty;

    if (address.postcode) {
      existingProperty = await PropertyModel.findOne({
        owner: req.user.id,
        "address.addressLine": address.addressLine?.trim(),
        "address.division": address.division,
        "address.district": address.district,
        "address.upazila": address.upazila,
        "address.postcode": address.postcode,
        floorNumber: floorNumber,
        flatNumber: flatNumber?.trim(),
      });
    } else {
      existingProperty = await PropertyModel.findOne({
        owner: req.user.id,
        "address.addressLine": address.addressLine?.trim(),
        "address.division": address.division,
        "address.district": address.district,
        "address.upazila": address.upazila,
        "address.cityCorp": address.cityCorp,
        "address.dhakaCitySubArea": address.dhakaCitySubArea?.trim(),
        floorNumber: floorNumber,
        flatNumber: flatNumber?.trim(),
      });
    }
    // Check for duplicate property with same address, floor, and flat

    if (existingProperty) {
      return res.status(409).json({
        success: false,
        message: `This property already exists at this address with Floor: ${floorNumber} and Flat: ${flatNumber}.`,
        payload: {
          existingPropertyId: existingProperty.propertyId,
          conflictDetails: {
            address: existingProperty.address,
            floorNumber: existingProperty.floorNumber,
            flatNumber: existingProperty.flatNumber,
          },
        },
      });
    }

    // Create property
    const property = await PropertyModel.create({
      title,
      description,
      propertyType,
      category,
      propertyFor,
      furnishedStatus,
      availabilityDate,
      amenities,
      propertySize,
      price,
      isNegotiable,
      address,
      bedrooms,
      bathrooms,
      floorNumber,
      flatNumber,
      drawingRoom,
      diningRoom,
      balconies,
      owner: req.user.id,
    });

    res.status(201).json({
      success: true,
      message: "Property created successfully",
      payload: { property, propertyId: property.propertyId },
    });
  } catch (error) {
    console.error("Create property error:", error);

    // Handle validation errors
    if (error.name === "ValidationError") {
      const messages = Object.values(error.errors).map((err) => err.message);
      return res.status(400).json({
        success: false,
        message: messages.join(", "),
      });
    }

    // Handle duplicate key error
    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        message: "Property ID already exists. Please try again.",
      });
    }

    res.status(500).json({
      success: false,
      message: "Failed to create property",
      error: error.message,
    });
  }
};

const createProperty = async (req, res, next) => {
  try {
    const {
      title,
      description,
      propertyType,
      category,
      propertyFor,
      furnishedStatus,
      availabilityDate,
      amenities,
      propertySize,
      price,
      isNegotiable,
      address,
      bedrooms,
      bathrooms,
      floorNumber,
      flatNumber,
      drawingRoom,
      diningRoom,
      balconies,
    } = req.body;
    // console.log(req.files)
    // ✅ Upload property images to Cloudinary
    const imageUrls = [];

    if (req.files && req.files && req.files.length > 0) {
      // Validate image count (optional - adjust limit as needed)
      if (req.files.length > 10) {
        throw createError(400, "Maximum 10 images allowed per property");
      }

      // Upload each image
      for (const file of req.files) {
        // Validate file size (4MB limit per image)
        if (file.size > 4 * 1024 * 1024) {
          throw createError(400, "Each image must be less than 4MB");
        }

        // Upload to Cloudinary
        const result = await uploadBufferToCloudinary(
          file.buffer,
          "properties"
        );
        imageUrls.push(result.secure_url);
      }
    }

    // ✅ Ensure at least one image is uploaded
    if (imageUrls.length === 0) {
      throw createError(400, "At least one property image is required");
    }

    console.log("Uploaded Property Images:", imageUrls);

    // ✅ Parse JSON strings if needed
    const parsedAmenities =
      typeof amenities === "string" ? JSON.parse(amenities) : amenities;

    const parsedAddress =
      typeof address === "string" ? JSON.parse(address) : address;

    // ✅ Convert boolean strings to actual booleans
    const parsedIsNegotiable = isNegotiable === "true" || isNegotiable === true;

    // ✅ Create property in database
    const property = await PropertyModel.create({
      title,
      description,
      propertyType,
      category,
      propertyFor,
      furnishedStatus,
      availabilityDate,
      amenities: parsedAmenities,
      propertySize,
      price,
      isNegotiable: parsedIsNegotiable,
      address: parsedAddress,
      bedrooms: bedrooms ? parseInt(bedrooms) : undefined,
      bathrooms: bathrooms ? parseInt(bathrooms) : undefined,
      floorNumber: floorNumber ? parseInt(floorNumber) : undefined,
      flatNumber,
      drawingRoom: drawingRoom ? Boolean(drawingRoom) : undefined,
      diningRoom: diningRoom ? Boolean(diningRoom) : undefined,
      balconies: balconies ? parseInt(balconies) : undefined,
      images: imageUrls,
      owner: req.user.id, // Assuming user is attached via auth middleware
    });

    // ✅ Send success response
    res.status(201).json({
      success: true,
      message: "Property created successfully",
      payload: {
        property,
        propertyId: property.propertyId || property._id,
      },
    });
  } catch (error) {
    console.error("Create property error:", error);
    next(error); // Pass to error handling middleware
  }
};
const createMultipleProperties = async (req, res) => {
  try {
    const properties = req.body;

    // Validate input
    if (!Array.isArray(properties) || properties.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Please provide an array of property objects",
      });
    }

    // Check if user is owner
    if (!req.user.isOwner) {
      return res.status(403).json({
        success: false,
        message: "Only owners can create properties",
      });
    }

    const createdProperties = [];
    const skippedProperties = [];

    for (const propertyData of properties) {
      const {
        title,
        description,
        propertyType,
        category,
        propertyFor,
        furnishedStatus,
        availabilityDate,
        amenities,
        propertySize,
        price,
        isNegotiable,
        address,
        bedrooms,
        bathrooms,
        floorNumber,
        flatNumber,
        balconies,
      } = propertyData;

      let existingProperty;

      if (address.postcode) {
        existingProperty = await PropertyModel.findOne({
          owner: req.user.id,
          "address.addressLine": address.addressLine?.trim(),
          "address.division": address.division,
          "address.district": address.district,
          "address.upazila": address.upazila,
          "address.postcode": address.postcode,
          floorNumber: floorNumber,
          flatNumber: flatNumber?.trim(),
        });
      } else {
        existingProperty = await PropertyModel.findOne({
          owner: req.user.id,
          "address.addressLine": address.addressLine?.trim(),
          "address.division": address.division,
          "address.district": address.district,
          "address.upazila": address.upazila,
          "address.cityCorp": address.cityCorp,
          "address.dhakaCitySubArea": address.dhakaCitySubArea?.trim(),
          floorNumber: floorNumber,
          flatNumber: flatNumber?.trim(),
        });
      }

      // Skip duplicate property
      if (existingProperty) {
        skippedProperties.push({
          title,
          message: `Duplicate found at ${address.addressLine}, Floor: ${floorNumber}, Flat: ${flatNumber}`,
        });
        continue;
      }

      // Create new property
      const newProperty = await PropertyModel.create({
        title,
        description,
        propertyType,
        category,
        propertyFor,
        furnishedStatus,
        availabilityDate,
        amenities,
        propertySize,
        price,
        isNegotiable,
        address,
        bedrooms,
        bathrooms,
        floorNumber,
        flatNumber,
        balconies,
        owner: req.user.id,
      });

      createdProperties.push(newProperty);
    }

    res.status(201).json({
      success: true,
      message: "Bulk property creation completed",
      payload: {
        createdCount: createdProperties.length,
        skippedCount: skippedProperties.length,
        createdProperties,
        skippedProperties,
      },
    });
  } catch (error) {
    console.error("Bulk create property error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to create multiple properties",
      error: error.message,
    });
  }
};

// @desc    Get all properties (with filters)
// @route   GET /api/properties
// @access  Public
const getAllProperties = async (req, res) => {
  try {
    const {
      propertyType,
      category,
      propertyFor,
      division,
      district,
      upazila,
      cityCorp,
      dhakaCitySubArea,
      postcode,
      minPrice,
      maxPrice,
      minSize,
      maxSize,
      bedrooms,
      bathrooms,
      balconies, // ADD THIS
      floorNumber, // ADD THIS
      drawingRoom, // ADD THIS
      diningRoom, // ADD THIS
      amenities,
      availabilityDate,
      isActive,
      page = 1,
      limit = 10,
      sort = "-createdAt",
    } = req.query;

    // Build filter object
    const filter = { isActive: isActive !== "false" }; // Default to active properties

    if (propertyType) filter.propertyType = propertyType;
    if (category) filter.category = category;
    if (propertyFor) filter.propertyFor = propertyFor;
    if (division) filter["address.division"] = division;
    if (district) filter["address.district"] = district;
    if (upazila) filter["address.upazila"] = upazila;
    if (cityCorp) filter["address.cityCorp"] = cityCorp;
    if (dhakaCitySubArea) filter["address.dhakaCitySubArea"] = dhakaCitySubArea;
    if (postcode) filter["address.postcode"] = postcode;
    if (bedrooms) filter.bedrooms = { $gte: Number(bedrooms) };
    if (bathrooms) filter.bathrooms = { $gte: Number(bathrooms) };

    if (amenities) {
      const amenitiesArray = amenities.split(",");
      // Query the 'value' field inside the amenities array
      filter["amenities.value"] = { $all: amenitiesArray };
    }
    if (availabilityDate) {
      filter.availabilityDate = { $lte: new Date(availabilityDate) };
    }

    // In your backend controller, update these filters:

    // 1. Fix balconies filter (missing in your backend)
    if (balconies) filter.balconies = { $gte: Number(balconies) };

    // 2. Fix floorNumber filter (missing in your backend)
    if (floorNumber) filter.floorNumber = Number(floorNumber);

    // 3. Add drawingRoom filter (missing)
    if (drawingRoom === "true" || drawingRoom === true)
      filter.drawingRoom = true;

    // 4. Add diningRoom filter (missing)
    if (diningRoom === "true" || diningRoom === true) filter.diningRoom = true;
    // Price range
    if (minPrice || maxPrice) {
      filter.price = {};
      if (minPrice) filter.price.$gte = Number(minPrice);
      if (maxPrice) filter.price.$lte = Number(maxPrice);
    }

    // Size range
    if (minSize || maxSize) {
      filter.propertySize = {};
      if (minSize) filter.propertySize.$gte = Number(minSize);
      if (maxSize) filter.propertySize.$lte = Number(maxSize);
    }

    // Pagination
    const skip = (Number(page) - 1) * Number(limit);

    // Execute query
    const properties = await PropertyModel.find(filter)
      .populate("owner", "firstName lastName email phoneNumber profileImage")
      .sort(sort)
      .skip(skip)
      .limit(Number(limit))
      .lean();

    // Get total count
    const total = await PropertyModel.countDocuments(filter);

    res.status(200).json({
      success: true,
      payload: {
        properties,
        pagination: {
          total,
          propertyNumber: properties.length,
          page: Number(page),
          pages: Math.ceil(total / Number(limit)),
          limit: Number(limit),
        },
      },
    });
  } catch (error) {
    console.error("Get all properties error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch properties",
      error: error.message,
    });
  }
};

// @desc    Get single property by ID
// @route   GET /api/properties/:id
// @access  Public
const getPropertyById = async (req, res) => {
  try {
    const { id } = req.params;

    const property = await PropertyModel.findById(id).populate(
      "owner",
      "firstName lastName email phoneNumber profileImage presentAddress"
    );

    if (!property) {
      return res.status(404).json({
        success: false,
        message: "Property not found",
      });
    }

    // Increment view count
    property.views += 1;
    await property.save();

    res.status(200).json({
      success: true,
      payload: { property },
    });
  } catch (error) {
    console.error("Get property by ID error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch property",
      error: error.message,
    });
  }
};

const getPropertyByPropertyId = async (req, res) => {
  try {
    const { propertyId } = req.params;
    const { page = 1, limit = 10 } = req.query;
    const query = { propertyId: { $regex: propertyId, $options: "i" } };

    const total = await PropertyModel.countDocuments(query);

    const properties = await PropertyModel.find(query)
      .populate(
        "owner",
        "firstName lastName email phoneNumber profileImage presentAddress"
      )
      .skip((page - 1) * limit)
      .limit(Number(limit));

    if (!properties || properties.length === 0) {
      return res.status(404).json({
        success: false,
        message: "No property found with the given Property ID.",
        payload: {
          properties,
          pagination: {
            total,
            propertyNumber: properties.length,
            page: Number(page),
            pages: Math.ceil(total / Number(limit)),
            limit: Number(limit),
          },
        },
      });
    }

    res.status(200).json({
      success: true,
      payload: {
        properties,
        pagination: {
          total,
          propertyNumber: properties.length,
          page: Number(page),
          pages: Math.ceil(total / Number(limit)),
          limit: Number(limit),
        },
      },
    });
  } catch (error) {
    console.error("Get property by propertyId error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch property",
      error: error.message,
    });
  }
};

// @desc    Update property
// @route   PUT /api/properties/:id
// @access  Private (Owner only)
const updateProperty = async (req, res) => {
  try {
    const { id } = req.params;

    // Find property
    const property = await PropertyModel.findById(id);

    if (!property) {
      return res.status(404).json({
        success: false,
        message: "Property not found",
      });
    }

    // Check ownership
    if (property.owner.toString() !== req.user.id.toString()) {
      return res.status(403).json({
        success: false,
        message: "You can only update your own properties",
      });
    }

    // Update property
    const updatedProperty = await PropertyModel.findByIdAndUpdate(
      id,
      { $set: req.body },
      { new: true, runValidators: true }
    ).populate("owner", "firstName lastName email phoneNumber profileImage");

    res.status(200).json({
      success: true,
      message: "Property updated successfully",
      payload: { property: updatedProperty },
    });
  } catch (error) {
    console.error("Update property error:", error);

    if (error.name === "ValidationError") {
      const messages = Object.values(error.errors).map((err) => err.message);
      return res.status(400).json({
        success: false,
        message: messages.join(", "),
      });
    }

    res.status(500).json({
      success: false,
      message: "Failed to update property",
      error: error.message,
    });
  }
};

// @desc    Delete property
// @route   DELETE /api/properties/:id
// @access  Private (Owner only)
const deleteProperty = async (req, res) => {
  try {
    const { id } = req.params;

    // Find property
    const property = await PropertyModel.findById(id);

    if (!property) {
      return res.status(404).json({
        success: false,
        message: "Property not found",
      });
    }

    // Check ownership
    if (property.owner.toString() !== req.user.id.toString()) {
      return res.status(403).json({
        success: false,
        message: "You can only delete your own properties",
      });
    }

    await PropertyModel.findByIdAndDelete(id);

    res.status(200).json({
      success: true,
      message: "Property deleted successfully",
    });
  } catch (error) {
    console.error("Delete property error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to delete property",
      error: error.message,
    });
  }
};

// @desc    Get logged-in owner's properties
// @route   GET /api/properties/my/properties
// @access  Private (Owner only)
const getMyProperties = async (req, res) => {
  try {
    console.log("Fetching properties for owner:", req.user.id);
    // return;
    const { page = 1, limit = 10, isActive } = req.query;

    const filter = { owner: req.user.id };
    if (isActive !== undefined) {
      filter.isActive = isActive === "true";
    }

    const skip = (Number(page) - 1) * Number(limit);

    const properties = await PropertyModel.find(filter)
      .sort("-createdAt")
      .skip(skip)
      .limit(Number(limit))
      .lean();

    const total = await PropertyModel.countDocuments(filter);

    res.status(200).json({
      success: true,
      payload: {
        properties,
        pagination: {
          total,
          page: Number(page),
          pages: Math.ceil(total / Number(limit)),
          limit: Number(limit),
        },
      },
    });
  } catch (error) {
    console.error("Get my properties error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch your properties",
      error: error.message,
    });
  }
};

// @desc    Toggle property status (active/inactive)
// @route   PATCH /api/properties/:id/status
// @access  Private (Owner only)
const togglePropertyStatus = async (req, res) => {
  try {
    const { id } = req.params;

    const property = await PropertyModel.findById(id);

    if (!property) {
      return res.status(404).json({
        success: false,
        message: "Property not found",
      });
    }

    // Check ownership
    if (property.owner.toString() !== req.user.id.toString()) {
      return res.status(403).json({
        success: false,
        message: "You can only update your own properties",
      });
    }

    property.isActive = !property.isActive;
    await property.save();

    res.status(200).json({
      success: true,
      message: `Property ${
        property.isActive ? "activated" : "deactivated"
      } successfully`,
      payload: { property },
    });
  } catch (error) {
    console.error("Toggle property status error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to toggle property status",
      error: error.message,
    });
  }
};

// @desc    Get properties by owner ID
// @route   GET /api/properties/owner/:ownerId
// @access  Public
const getPropertiesByOwner = async (req, res) => {
  try {
    const { ownerId } = req.params;
    const { page = 1, limit = 10 } = req.query;

    const skip = (Number(page) - 1) * Number(limit);

    const properties = await PropertyModel.find({
      owner: ownerId,
      isActive: true,
    })
      .sort("-createdAt")
      .skip(skip)
      .limit(Number(limit))
      .lean();

    const total = await PropertyModel.countDocuments({
      owner: ownerId,
      isActive: true,
    });

    res.status(200).json({
      success: true,
      payload: {
        properties,
        pagination: {
          total,
          page: Number(page),
          pages: Math.ceil(total / Number(limit)),
          limit: Number(limit),
        },
      },
    });
  } catch (error) {
    console.error("Get properties by owner error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch properties",
      error: error.message,
    });
  }
};

module.exports = {
  createProperty,
  createMultipleProperties,
  getAllProperties,
  getPropertyById,
  getPropertyByPropertyId,
  updateProperty,
  deleteProperty,
  getMyProperties,
  togglePropertyStatus,
  getPropertiesByOwner,
};
