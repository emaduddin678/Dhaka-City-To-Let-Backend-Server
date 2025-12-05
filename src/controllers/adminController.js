const BookingModel = require("../models/BookingModel");
const PropertyModel = require("../models/proppertyModel");
const UserModel = require("../models/userModel");
const createError = require("http-errors");
const { successResponse } = require("./responseController");

// @desc    Get dashboard statistics
// @route   GET /api/admin/stats
// @access  Private/Admin
const getDashboardStats = async (req, res, next) => {
  try {
    // Get user counts
    const totalUsers = await UserModel.countDocuments();
    const totalTenants = await UserModel.countDocuments({ isTenant: true });
    const totalOwners = await UserModel.countDocuments({ isOwner: true });
    const bannedUsers = await UserModel.countDocuments({ isBanned: true });

    // Get property counts
    const totalProperties = await PropertyModel.countDocuments();
    const activeProperties = await PropertyModel.countDocuments({
      isActive: true,
    });
    const inactiveProperties = await PropertyModel.countDocuments({
      isActive: false,
    });
    const pendingApproval = await PropertyModel.countDocuments({
      isApproved: false,
    });

    // Get booking counts
    const totalBookings = await BookingModel.countDocuments();
    const pendingBookings = await BookingModel.countDocuments({
      status: { $in: ["pending", "owner-review"] },
    });
    const confirmedBookings = await BookingModel.countDocuments({
      status: "confirmed",
    });
    const activeBookings = await BookingModel.countDocuments({
      status: "active",
    });
    const cancelledBookings = await BookingModel.countDocuments({
      status: "cancelled",
    });

    // Calculate revenue (example - adjust based on your booking model)
    const confirmedBookingsData = await BookingModel.find({
      status: { $in: ["confirmed", "active", "completed"] },
    }).select("totalAmount createdAt");

    const totalRevenue = confirmedBookingsData.reduce(
      (sum, booking) => sum + booking.totalAmount,
      0
    );

    // Monthly revenue (current month)
    const currentMonth = new Date();
    currentMonth.setDate(1);
    currentMonth.setHours(0, 0, 0, 0);

    const monthlyRevenue = confirmedBookingsData
      .filter((booking) => booking.createdAt >= currentMonth)
      .reduce((sum, booking) => sum + booking.totalAmount, 0);

    const stats = {
      totalUsers,
      totalTenants,
      totalOwners,
      bannedUsers,
      totalProperties,
      activeProperties,
      inactiveProperties,
      pendingApproval,
      totalBookings,
      pendingBookings,
      confirmedBookings,
      activeBookings,
      cancelledBookings,
      totalRevenue,
      monthlyRevenue,
    };

    return successResponse(res, {
      statusCode: 200,
      message: "Dashboard stats retrieved successfully",
      payload: { stats },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get all users with filters and pagination
// @route   GET /api/admin/users
// @access  Private/Admin
const getAllUsers = async (req, res, next) => {
  try {
    const {
      search = "",
      page = 1,
      limit = 10,
      isTenant,
      isOwner,
      isBanned,
    } = req.query;

    const filter = {};

    // Search by name or email
    if (search) {
      filter.$or = [
        { firstName: { $regex: search, $options: "i" } },
        { lastName: { $regex: search, $options: "i" } },
        { email: { $regex: search, $options: "i" } },
      ];
    }

    // Filter by role
    if (isTenant !== undefined) filter.isTenant = isTenant === "true";
    if (isOwner !== undefined) filter.isOwner = isOwner === "true";
    if (isBanned !== undefined) {
      if (isBanned === "active") {
        filter.isBanned = "false";
      }
    }
    if (isBanned !== undefined) {
      if (isBanned === "banned") {
        filter.isBanned = "true";
      }
    }

    const skip = (Number(page) - 1) * Number(limit);
    console.log(filter, isBanned);
    const users = await UserModel.find(filter)
      .select("-password")
      .sort("-createdAt")
      .skip(skip)
      .limit(Number(limit))
      .lean();

    const total = await UserModel.countDocuments(filter);

    return successResponse(res, {
      statusCode: 200,
      message: "Users retrieved successfully",
      payload: {
        users,
        pagination: {
          total,
          page: Number(page),
          pages: Math.ceil(total / Number(limit)),
          limit: Number(limit),
        },
      },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update user status (ban/unban/promote)
// @route   PUT /api/admin/users/:id/status
// @access  Private/Admin

const updateUserStatus = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { action } = req.body; // 'ban', 'unban', 'make-tenant', 'make-owner', 'remove-tenant', 'remove-owner', 'make-admin'

    const user = await UserModel.findById(id);

    if (!user) {
      throw createError(404, "User not found");
    }

    // Prevent admin from banning themselves
    if (action === "ban" && user._id.toString() === req.user.id.toString()) {
      throw createError(400, "You cannot ban yourself");
    }

    // Prevent admin from demoting themselves
    if (
      action === "remove-admin" &&
      user._id.toString() === req.user.id.toString()
    ) {
      throw createError(400, "You cannot remove your own admin privileges");
    }

    switch (action) {
      case "ban":
        user.isBanned = true;
        break;
      case "unban":
        user.isBanned = false;
        break;
      case "make-tenant":
        user.isTenant = true;
        break;
      case "remove-tenant":
        user.isTenant = false;
        break;
      case "make-owner":
        user.isOwner = true;
        break;
      case "remove-owner":
        user.isOwner = false;
        break;
      case "make-admin":
        user.isAdmin = true;
        break;
      case "remove-admin":
        user.isAdmin = false;
        break;
      default:
        throw createError(400, "Invalid action");
    }

    await user.save();

    return successResponse(res, {
      statusCode: 200,
      message: `User ${action} successfully`,
      payload: { user },
    });
  } catch (error) {
    next(error);
  }
};
// @desc    Delete user
// @route   DELETE /api/admin/users/:id
// @access  Private/Admin
const deleteUser = async (req, res, next) => {
  try {
    const { id } = req.params;

    const user = await UserModel.findById(id);

    if (!user) {
      throw createError(404, "User not found");
    }

    // Prevent admin from deleting themselves
    if (user._id.toString() === req.user.id.toString()) {
      throw createError(400, "You cannot delete yourself");
    }

    // Check if user has properties
    const hasProperties = await PropertyModel.exists({ owner: id });
    if (hasProperties) {
      throw createError(
        400,
        "Cannot delete user with properties. Delete properties first."
      );
    }

    await UserModel.findByIdAndDelete(id);

    return successResponse(res, {
      statusCode: 200,
      message: "User deleted successfully",
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get all properties (admin view)
// @route   GET /api/admin/properties
// @access  Private/Admin
const getAllPropertiesAdmin = async (req, res, next) => {
  try {
    const {
      search = "",
      page = 1,
      limit = 10,
      isActive,
      isApproved,
    } = req.query;

    const filter = {};

    // Search by title or propertyId
    if (search) {
      filter.$or = [
        { title: { $regex: search, $options: "i" } },
        { propertyId: { $regex: search, $options: "i" } },
      ];
    }
    console.log(req.query);
    if (isActive !== undefined) filter.isActive = isActive === "true";
    if (isApproved !== undefined) filter.isApproved = isApproved === "true";

    const skip = (Number(page) - 1) * Number(limit);

    console.log(filter, skip);

    const properties = await PropertyModel.find(filter)
      .populate("owner", "firstName lastName email phoneNumber")
      .sort("-createdAt")
      .skip(skip)
      .limit(Number(limit))
      .lean();

    const total = await PropertyModel.countDocuments(filter);
    // console.log(properties);

    return successResponse(res, {
      statusCode: 200,
      message: "Properties retrieved successfully",
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
    next(error);
  }
};

// @desc    Approve property
// @route   PUT /api/admin/properties/:id/approve
// @access  Private/Admin
const approveProperty = async (req, res, next) => {
  try {
    const { id } = req.params;

    const property = await PropertyModel.findByIdAndUpdate(
      id,
      { isApproved: true },
      { new: true }
    ).populate("owner", "firstName lastName email");

    if (!property) {
      throw createError(404, "Property not found");
    }

    return successResponse(res, {
      statusCode: 200,
      message: "Property approved successfully",
      payload: { property },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete property (admin)
// @route   DELETE /api/admin/properties/:id
// @access  Private/Admin
const deletePropertyAdmin = async (req, res, next) => {
  try {
    const { id } = req.params;

    const property = await PropertyModel.findById(id);

    if (!property) {
      throw createError(404, "Property not found");
    }

    // Check if property has active bookings
    const hasActiveBookings = await BookingModel.exists({
      propertyId: id,
      status: { $in: ["confirmed", "active"] },
    });

    if (hasActiveBookings) {
      throw createError(400, "Cannot delete property with active bookings");
    }

    await PropertyModel.findByIdAndDelete(id);

    return successResponse(res, {
      statusCode: 200,
      message: "Property deleted successfully",
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get all bookings (admin view)
// @route   GET /api/admin/bookings
// @access  Private/Admin
const getAllBookingsAdmin = async (req, res, next) => {
  try {
    const { search = "", page = 1, limit = 10, status } = req.query;

    const filter = {};

    if (search) {
      filter.bookingId = { $regex: search, $options: "i" };
    }

    if (status) filter.status = status;

    const skip = (Number(page) - 1) * Number(limit);

    const bookings = await BookingModel.find(filter)
      .populate("tenantId", "firstName lastName email phoneNumber")
      .populate("propertyId", "title propertyId address")
      .sort("-createdAt")
      .skip(skip)
      .limit(Number(limit))
      .lean();

    const total = await BookingModel.countDocuments(filter);

    return successResponse(res, {
      statusCode: 200,
      message: "Bookings retrieved successfully",
      payload: {
        bookings,
        pagination: {
          total,
          page: Number(page),
          pages: Math.ceil(total / Number(limit)),
          limit: Number(limit),
        },
      },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update booking status (admin override)
// @route   PUT /api/admin/bookings/:id/status
// @access  Private/Admin
const updateBookingStatusAdmin = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    const booking = await BookingModel.findByIdAndUpdate(
      id,
      { status },
      { new: true }
    )
      .populate("tenantId", "firstName lastName email")
      .populate("propertyId", "title propertyId");

    if (!booking) {
      throw createError(404, "Booking not found");
    }

    return successResponse(res, {
      statusCode: 200,
      message: "Booking status updated successfully",
      payload: { booking },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get analytics data
// @route   GET /api/admin/analytics
// @access  Private/Admin
const getAnalytics = async (req, res, next) => {
  try {
    // Get monthly user growth for last 12 months
    const userGrowth = await UserModel.aggregate([
      {
        $group: {
          _id: {
            year: { $year: "$createdAt" },
            month: { $month: "$createdAt" },
          },
          count: { $sum: 1 },
        },
      },
      { $sort: { "_id.year": 1, "_id.month": 1 } },
      { $limit: 12 },
    ]);

    // Get monthly property growth
    const propertyGrowth = await PropertyModel.aggregate([
      {
        $group: {
          _id: {
            year: { $year: "$createdAt" },
            month: { $month: "$createdAt" },
          },
          count: { $sum: 1 },
        },
      },
      { $sort: { "_id.year": 1, "_id.month": 1 } },
      { $limit: 12 },
    ]);

    // Get booking trends
    const bookingTrends = await BookingModel.aggregate([
      {
        $group: {
          _id: "$status",
          count: { $sum: 1 },
          totalAmount: { $sum: "$totalAmount" },
        },
      },
    ]);

    const analytics = {
      userGrowth,
      propertyGrowth,
      bookingTrends,
    };

    return successResponse(res, {
      statusCode: 200,
      message: "Analytics retrieved successfully",
      payload: { analytics },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get recent activities
// @route   GET /api/admin/activities
// @access  Private/Admin
const getRecentActivities = async (req, res, next) => {
  try {
    // Get recent users (last 10)
    const recentUsers = await UserModel.find()
      .sort("-createdAt")
      .limit(10)
      .select("firstName lastName email createdAt")
      .lean();

    // Get recent properties (last 10)
    const recentProperties = await PropertyModel.find()
      .sort("-createdAt")
      .limit(10)
      .populate("owner", "firstName lastName")
      .select("title propertyId createdAt owner")
      .lean();

    // Get recent bookings (last 10)
    const recentBookings = await BookingModel.find()
      .sort("-createdAt")
      .limit(10)
      .populate("tenantId", "firstName lastName")
      .select("bookingId status createdAt tenantId")
      .lean();

    // Combine and format activities
    const activities = [];

    recentUsers.forEach((user) => {
      activities.push({
        type: "user",
        action: "New user registered",
        user: `${user.firstName} ${user.lastName}`,
        email: user.email,
        time: user.createdAt,
      });
    });

    recentProperties.forEach((property) => {
      activities.push({
        type: "property",
        action: "New property listed",
        user: `${property.owner.firstName} ${property.owner.lastName}`,
        propertyId: property.propertyId,
        time: property.createdAt,
      });
    });

    recentBookings.forEach((booking) => {
      activities.push({
        type: "booking",
        action: `Booking ${booking.status}`,
        user: `${booking.tenantId.firstName} ${booking.tenantId.lastName}`,
        bookingId: booking.bookingId,
        time: booking.createdAt,
      });
    });

    // Sort by time
    activities.sort((a, b) => new Date(b.time) - new Date(a.time));

    return successResponse(res, {
      statusCode: 200,
      message: "Recent activities retrieved successfully",
      payload: { activities: activities.slice(0, 20) },
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getDashboardStats,
  getAllUsers,
  updateUserStatus,
  deleteUser,
  getAllPropertiesAdmin,
  approveProperty,
  deletePropertyAdmin,
  getAllBookingsAdmin,
  updateBookingStatusAdmin,
  getAnalytics,
  getRecentActivities,
};
