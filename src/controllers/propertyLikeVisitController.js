const PropertyLikeModel = require("../models/propertyLikeModel");
const PropertyVisitModel = require("../models/propertyVisitModel");
const PropertyModel = require("../models/proppertyModel");

const getLikedPropertyCounts = async (req, res) => {
  try {
    const likeCounts = await PropertyLikeModel.aggregate([
      {
        $group: {
          _id: "$propertyId", // group by propertyId
          numberOfCount: { $sum: 1 }, // count likes
        },
      },
      {
        $project: {
          propertyId: "$_id",
          numberOfCount: 1,
          _id: 0,
        },
      },
    ]);

    res.status(200).json({
      success: true,
      message: "Like counts per property fetched successfully",
      data: likeCounts,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const getPropertyLikes = async (req, res) => {
  try {
    const { propertyId } = req.params;

    const likes = await PropertyLikeModel.find({ propertyId })
      .populate("userId", "firstName lastName email phoneNumber profileImage")
      .sort("-likedAt");
    // console.log(likes);
    res.json({ success: true, data: likes });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// LIKE CONTROLLER
const likeProperty = async (req, res) => {
  try {
    const { propertyId } = req.params;
    console.log(req.user);
    const userId = req.user.id; // from auth middleware

    // Check if already liked
    const existingLike = await PropertyLikeModel.findOne({
      propertyId,
      userId,
    });

    if (existingLike) {
      return res.status(400).json({ message: "Already liked" });
    }

    // Create like
    const like = await PropertyLikeModel.create({
      propertyId,
      userId,
      likedAt: new Date(),
    });
    console.log(like);
    // Update property likes count
    await PropertyModel.findByIdAndUpdate(propertyId, {
      $inc: { likesCount: 1 },
    });

    res.status(201).json({
      success: true,
      message: "Property liked successfully",
      data: like,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const unlikeProperty = async (req, res) => {
  try {
    const { propertyId } = req.params;
    const userId = req.user.id;

    const like = await PropertyLikeModel.findOneAndDelete({
      propertyId,
      userId,
    });

    if (!like) {
      return res.status(404).json({ message: "Like not found" });
    }

    res.json({ success: true, message: "Property unliked" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// VISIT CONTROLLER
const createVisitRequest = async (req, res) => {
  try {
    const { propertyId } = req.params;
    const { visitDate, visitTime, notes } = req.body;
    const tenant = req.user;

    // Validate tenant account
    if (!tenant.isTenant) {
      return res
        .status(403)
        .json({ message: "Only tenants can request visits" });
    }

    // Get property with owner details
    const property = await PropertyModel.findById(propertyId).populate("owner");
    if (!property) {
      return res.status(404).json({ message: "Property not found" });
    }

    // Check if slot is available (max 3 visits per slot)
    const existingVisits = await PropertyVisitModel.countDocuments({
      propertyId,
      visitDate: new Date(visitDate),
      visitTime,
      status: { $in: ["pending", "confirmed"] },
    });

    if (existingVisits >= 3) {
      return res.status(400).json({
        message: "This time slot is fully booked. Please choose another.",
      });
    }

    // Create visit request
    const visit = await PropertyVisitModel.create({
      propertyId,
      tenantId: tenant._id,
      ownerId: property.owner._id,
      visitDate: new Date(visitDate),
      visitTime,
      status: "pending",
      tenantDetails: {
        firstName: tenant.firstName,
        lastName: tenant.lastName,
        email: tenant.email,
        phoneNumber: tenant.phoneNumber,
        profileImage: tenant.profileImage,
      },
      notes,
    });

    // Update property visits count
    await PropertyModel.findByIdAndUpdate(propertyId, {
      $inc: { visitsCount: 1 },
    });

    res.status(201).json({
      success: true,
      message: "Visit request created",
      data: visit,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const getAvailableSlots = async (req, res) => {
  try {
    const { propertyId } = req.params;
    const { date } = req.query; // format: YYYY-MM-DD

    const visits = await PropertyVisitModel.find({
      propertyId,
      visitDate: new Date(date),
      status: { $in: ["pending", "confirmed"] },
    }).select("visitTime");

    // Time slots (9 AM to 6 PM)
    const allSlots = [
      "09:00 AM",
      "10:00 AM",
      "11:00 AM",
      "12:00 PM",
      "01:00 PM",
      "02:00 PM",
      "03:00 PM",
      "04:00 PM",
      "05:00 PM",
      "06:00 PM",
    ];

    const bookedSlots = visits.reduce((acc, visit) => {
      acc[visit.visitTime] = (acc[visit.visitTime] || 0) + 1;
      return acc;
    }, {});

    const availableSlots = allSlots.map((slot) => ({
      time: slot,
      available: (bookedSlots[slot] || 0) < 3,
      slotsLeft: 3 - (bookedSlots[slot] || 0),
    }));

    res.json({ success: true, data: availableSlots });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const updateVisitStatus = async (req, res) => {
  try {
    const { visitId } = req.params;
    const { status } = req.body; // 'confirmed', 'cancelled', 'completed'
    const userId = req.user.id;

    const visit = await PropertyVisitModel.findById(visitId);
    if (!visit) {
      return res.status(404).json({ message: "Visit not found" });
    }

    // Only owner can confirm/complete
    if (visit.ownerId.toString() !== userId.toString()) {
      return res.status(403).json({ message: "Unauthorized" });
    }

    visit.status = status;
    await visit.save();

    res.json({ success: true, message: "Visit status updated", data: visit });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const getUserLikedProperties = async (req, res) => {
  try {
    const userId = req.params.userId;
    console.log(userId);

    const likes = await PropertyLikeModel.find({
      userId,
    })
      .populate({
        path: "propertyId",
        populate: {
          path: "owner",
          select: "firstName lastName email phoneNumber",
        },
      })
      .sort("-likedAt");

    res.json({ success: true, data: likes });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const getUserVisits = async (req, res) => {
  try {
    const userId = req.user.id;

    const visits = await PropertyVisitModel.find({ tenantId: userId })
      .populate("propertyId")
      .sort("-createdAt");

    res.json({ success: true, data: visits });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const getPropertyVisits = async (req, res) => {
  try {
    const { propertyId } = req.params;
    const visits = await PropertyVisitModel.find({ propertyId })
      .populate("tenantId", "firstName lastName email phoneNumber profileImage")
      .sort("-createdAt");

    res.json({ success: true, data: visits });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const cancelVisit = async (req, res) => {
  try {
    const { visitId } = req.params;
    const userId = req.user.id;

    const visit = await PropertyVisitModel.findById(visitId);
    if (!visit) {
      return res.status(404).json({ message: "Visit not found" });
    }

    // Only tenant who created it OR owner can cancel
    if (
      visit.tenantId.toString() !== userId.toString() &&
      visit.ownerId.toString() !== userId.toString()
    ) {
      return res.status(403).json({ message: "Unauthorized" });
    }

    visit.status = "cancelled";
    await visit.save();

    await PropertyModel.findByIdAndUpdate(visit.propertyId, {
      $inc: { visitsCount: -1 },
    });

    res.json({ success: true, message: "Visit cancelled", data: visit });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// ✅ Export all at once
module.exports = {
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
};
