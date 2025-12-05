const express = require("express");
const {
  handleGetUsers,
  handleGetUserById,
  handleDeleteUserById,
  handleProcessRegister,
  handleActivateUserAccount,
  handleUpdateUserById,
  handleManageUserStatusById,
  handleUpdatePassword,
  handleForgetPassword,
  handleResetPassword,
} = require("../controllers/userController");
// const { uploadUserImage } = require("../middlewares/uploadFile");
const {
  validateUserRagistration,
  validateUserPasswordUpdate,
  validateUserForgetPassword,
  validateUserResetPassword,
} = require("../validators/auth");
const runValidation = require("../validators");
const { isLoggedIn, isLoggedOut, isAdmin } = require("../middlewares/auth");
const { uploadUserImage } = require("../middlewares/uploadFile");
const { uploadImageMulter } = require("../middlewares/uploadImageMulter");
const userRouter = express.Router();

userRouter.post(
  "/process-register",
  isLoggedOut,
  uploadImageMulter.fields([
    { name: "profileImage", maxCount: 1 },
    { name: "nidFront", maxCount: 1 },
    { name: "nidBack", maxCount: 1 },
  ]),
  // validateUserRagistration,
  // runValidation,
  handleProcessRegister
);
userRouter.get("/activate/:token", isLoggedOut, handleActivateUserAccount);
userRouter.get(
  "/",
  isLoggedIn,
  // isAdmin,
  handleGetUsers
);
userRouter.get("/:id([0-9a-fA-F]{24})", isLoggedIn, handleGetUserById);
userRouter.delete("/:id([0-9a-fA-F]{24})", isLoggedIn, handleDeleteUserById);
userRouter.put(
  "/reset-password",
  validateUserResetPassword,
  // runValidation,
  handleResetPassword
);

userRouter.put(
  "/:id([0-9a-fA-F]{24})",
  isLoggedIn,
  uploadImageMulter.fields([
    { name: "profileImage", maxCount: 1 },
    { name: "nidFront", maxCount: 1 },
    { name: "nidBack", maxCount: 1 },
  ]),
  handleUpdateUserById
);

// userRouter.put(
//   "/ban-user/:id([0-9a-fA-F]{24})",
//   isLoggedIn,
//   isAdmin,
//   handleBanUserById
// );
// userRouter.put(
//   "/unban-user/:id([0-9a-fA-F]{24})",
//   isLoggedIn,
//   isAdmin,
//   handleUnbanUserById
// );

userRouter.put(
  "/manage-user/:id([0-9a-fA-F]{24})",
  isLoggedIn,
  isAdmin,
  handleManageUserStatusById
);

userRouter.post(
  "/forget-password",
  validateUserForgetPassword,
  // runValidation,
  handleForgetPassword
);

userRouter.put(
  "/update-password/:id([0-9a-fA-F]{24})",
  validateUserPasswordUpdate,
  // runValidation,
  isLoggedIn,
  handleUpdatePassword
);

module.exports = userRouter;

// POST route to seed properties
userRouter.post(
  "/seed-properties",
  uploadImageMulter.none(), // no file upload from client, we’ll read from /reference
  async (req, res, next) => {
    try {
      const referenceDir = path.join(__dirname, "../reference");

      const properties = await PropertyModel.find({});

      const updatedLogs = [];

      for (let i = 0; i < properties.length; i++) {
        const property = properties[i];
        const index = i + 1; // property index

        const imageUrls = [];

        for (const cat of categories) {
          const fileName = cat.pattern.replace("%d", index);
          const filePath = path.join(referenceDir, fileName);

          let buffer;
          if (fs.existsSync(filePath)) {
            buffer = fs.readFileSync(filePath);
          } else {
            // fallback
            const fallbackPath = path.join(referenceDir, cat.fallback);
            if (fs.existsSync(fallbackPath)) {
              buffer = fs.readFileSync(fallbackPath);
              console.log(
                `⚠️ Missing ${fileName}, used fallback ${cat.fallback}`
              );
            } else {
              console.log(
                `❌ Missing both ${fileName} and fallback ${cat.fallback}`
              );
              continue; // skip if nothing found
            }
          }

          // Upload to Cloudinary
          const result = await uploadBufferToCloudinary(buffer, "properties");
          imageUrls.push(result.secure_url);
        }

        // Update property document
        property.images = imageUrls;
        await property.save();

        updatedLogs.push({
          propertyId: property._id,
          imagesCount: imageUrls.length,
        });

        console.log(
          `✅ Updated property ${property._id} with ${imageUrls.length} images`
        );
      }

      // Optional: delete reference folder
      if (req.body.deleteReference === "true") {
        fs.rmSync(referenceDir, { recursive: true, force: true });
        console.log("🗑️ Deleted /reference folder");
      }

      return res.json({
        message: "Properties seeded successfully",
        updated: updatedLogs,
      });
    } catch (err) {
      next(err);
    }
  }
);
