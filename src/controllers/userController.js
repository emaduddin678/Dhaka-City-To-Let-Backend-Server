const createError = require("http-errors");
const path = require("path");
const fs = require("fs");

const jwt = require("jsonwebtoken");
const { createJSONWebToken } = require("../helper/jsonwebtoken");
const {
  jwtActivationKey,
  serverURL,
  jwtResetPasswordKey,
  clientURL,
  jwtAccessKey,
  jwtRefreshKey,
} = require("../secret");
const UserModel = require("../models/userModel");
const { successResponse } = require("./responseController");
const { findWithId } = require("../services/findItem");
const deleteImage = require("../helper/deleteImage");
const emailWithNodeMailer = require("../helper/email");
const bcrypt = require("bcryptjs");
const checkUserExists = require("../helper/checkUserExists");
const sendEmail = require("../helper/sendEmail");
const cloudinary = require("../config/cloudinary");
const {
  handleUserAction,
  findeUsers,
  findUserById,
  deleteUserById,
  updateUserById,
  updateUserPasswordById,
  forgetPasswordByEmail,
  resetPassword,
} = require("../services/userService");
const {
  uploadBufferToCloudinary,
  getPublicIdFromUrl,
  deleteFromCloudinary,
} = require("../helper/cloudinaryHelper");
const {
  setAccessTokenCookie,
  setRefreshTokenCookie,
} = require("../helper/cookie");
const getRedirectUrl = require("../helper/getRedirectUrl");
// const mongoose = require("mongoose");
// const fs = require("fs").promises;

const handleGetUsers = async (req, res, next) => {
  try {
    const search = req.query.search || "";
    const page = Number(req.query.page) || 1;
    const limit = Number(req.query.limit) || 5;

    const { users, pagination } = await findeUsers(search, limit, page);

    return successResponse(res, {
      statusCode: 202,
      message: "users were returned successfully",
      payload: {
        users: users,
        pagination: pagination,
      },
    });
  } catch (error) {
    next(error);
  }
};

const handleGetUserById = async (req, res, next) => {
  try {
    const id = req.params.id;
    // console.log(req.body.userId);
    // const filter = {
    //   _id: id,
    // };
    // const user = await UserModel.find(filter);

    // finding in services for user
    const options = { password: 0 };
    // const user = await findWithId(User, id, options);
    const user = await findUserById(id, options);
    return successResponse(res, {
      statusCode: 202,
      message: "user was returned successfully",
      payload: {
        user,
      },
    });
  } catch (error) {
    next(error);
  }
};

const handleDeleteUserById = async (req, res, next) => {
  try {
    const id = req.params.id;
    const options = { password: 0 };

    await deleteUserById(id, options);

    return successResponse(res, {
      statusCode: 202,
      message: "user was deleted successfully",
    });
  } catch (err) {
    next(err);
  }
};

const handleProcessRegister = async (req, res, next) => {
  try {
    const {
      firstName,
      lastName,
      email,
      phoneNumber,
      emergencyContact,
      password,
      confirmPassword,
      permanentAddressOption,
      nidNumber,
      occupation,
      organizationName,
      position,
    } = req.body;
    if (password !== confirmPassword) {
      throw createError(400, "Passwords do not match");
    }
    // ✅ Check if user already exists
    const userExists = await checkUserExists(email);
    console.log("User Exists:", userExists);
    if (userExists) {
      throw createError(
        409,
        "User with this email already exists. Please login"
      );
    }

    // ✅ Upload images to Cloudinary
    const uploadedImages = {};
    for (const fieldName of ["profileImage", "nidFront", "nidBack"]) {
      if (req.files?.[fieldName]?.[0]) {
        const file = req.files[fieldName][0];
        if (file.size > 4 * 1024 * 1024) {
          throw createError(400, `${fieldName} is too large. Max size is 4MB`);
        }
        const result = await uploadBufferToCloudinary(file.buffer, "users");
        uploadedImages[fieldName] = result.secure_url;
      }
    }
    console.log("Uploaded Images:", uploadedImages);
    // ✅ Ensure all required files are present
    const requiredFiles = ["profileImage", "nidFront", "nidBack"];
    for (const field of requiredFiles) {
      if (!uploadedImages[field]) {
        throw createError(400, `${field} image is required`);
      }
    }
    // ✅ Convert boolean strings to actual booleans
    const isTenant = req.body.isTenant === "true" || req.body.isTenant === true;
    const isOwner = req.body.isOwner === "true" || req.body.isOwner === true;
    const agreeTerms =
      req.body.agreeTerms === "true" || req.body.agreeTerms === true;

    // ✅ Parse nested JSON strings if sent as strings
    const presentAddress =
      typeof req.body.presentAddress === "string"
        ? JSON.parse(req.body.presentAddress)
        : req.body.presentAddress;

    const permanentAddress =
      typeof req.body.permanentAddress === "string"
        ? JSON.parse(req.body.permanentAddress)
        : req.body.permanentAddress;

    // ✅ FIXED: Hash password before storing in JWT
    const hashedPassword = bcrypt.hashSync(password, bcrypt.genSaltSync(10));

    // ✅ Create JWT payload
    const tokenPayload = {
      firstName,
      lastName,
      email,
      password: hashedPassword,
      phoneNumber,
      emergencyContact,
      nidNumber,
      ...uploadedImages,
      isTenant,
      isOwner,
      permanentAddressOption,
      presentAddress,
      permanentAddress,
      occupation,
      organizationName,
      position,
      agreeTerms,
    };
    console.log("Token Payload:", tokenPayload);

    const token = createJSONWebToken(tokenPayload, jwtActivationKey, "10m");
    console.log("Activation Token:", token);

    const template = path.join(
      __dirname,
      "../../emailTemplates/accountActivation.html"
    );
    let emailHtmlTemplate = fs.readFileSync(template, "utf-8");

    const emailHtmlTemplateData = emailHtmlTemplate
      .replace("{{firstName}}", firstName)
      .replace("{{lastName}}", lastName)
      .replace("{{activationLink}}", `${serverURL}/api/users/activate/${token}`)
      .replace("{{year}}", new Date().getFullYear());

    const emailData = {
      email,
      subject: "Account Activation Email",
      html: emailHtmlTemplateData,
    };

    await sendEmail(emailData);

    // ✅ Send success response
    return successResponse(res, {
      statusCode: 200,
      message: `Activation email sent to ${email}. Please check your inbox.`,
      payload: token,
    });
  } catch (error) {
    next(error);
  }
};
const handleActivateUserAccount = async (req, res, next) => {
  try {
    const redirectUrl = getRedirectUrl("/auth/login");
    console.log("Activation endpoint hit");
    const token = req.params.token;
    if (!token) throw createError(404, "Token not found!");
    const failedTemplate = path.join(
      __dirname,
      "../../emailTemplates/activationFailed.html"
    );
    let failedHtmlTemplate = fs.readFileSync(failedTemplate, "utf-8");
    let failedHtmlTemplateData;
    // clear extraMessage by default
    failedHtmlTemplateData = failedHtmlTemplate.replace("{{extraMessage}}", "");

    let decoded;
    try {
      decoded = jwt.verify(token, jwtActivationKey);
    } catch (error) {
      if (error.name === "TokenExpiredError") {
        failedHtmlTemplateData = failedHtmlTemplate
          .replace("{{FailedMsg}}", "Activation link expired")
          .replace("{{extraMessage}}", "Account Activation Failed")
          .replace("{{redirectUrl}}", `${redirectUrl}`);
        return res.send(failedHtmlTemplateData);
      }
      if (error.name === "JsonWebTokenError") {
        failedHtmlTemplateData = failedHtmlTemplate
          .replace("{{FailedMsg}}", "Invalid activation link")
          .replace("{{extraMessage}}", "Account Activation Failed")
          .replace("{{redirectUrl}}", `${redirectUrl}`);
        return res.send(failedHtmlTemplateData);
      }
      throw error;
    }
    // console.log("Decoded Token:", decoded);
    const userExists = await UserModel.exists({ email: decoded.email });
    console.log(userExists);
    if (userExists) {
      console.log("User already activated");
      failedHtmlTemplateData = failedHtmlTemplate
        .replace(
          "{{FailedMsg}}",
          "User Account With This Email is  Already Activated."
        )
        .replace("{{extraMessage}}", "Please Login Instead.")
        .replace("{{redirectUrl}}", `${redirectUrl}`);
      return res.send(failedHtmlTemplateData);
    }
    console.log("User not activated");

    // const user = await UserModel.create(decoded);

    // Create new user
    const newUser = await UserModel.create(decoded);

    console.log("Created User:");
    if (newUser) {
      // ✅ Generate tokens
      const accessToken = createJSONWebToken(
        { id: newUser._id, email: newUser.email },
        jwtAccessKey,
        "30m"
      );
      const refreshToken = createJSONWebToken(
        { id: newUser._id, email: newUser.email },
        jwtRefreshKey,
        "30d"
      );

      // ✅ Set cookies
      setAccessTokenCookie(res, accessToken);
      setRefreshTokenCookie(res, refreshToken);
    }

    const template = path.join(
      __dirname,
      "../../emailTemplates/accountRegistered.html"
    );
    let emailHtmlTemplate = fs.readFileSync(template, "utf-8");

    const emailHtmlTemplateData = emailHtmlTemplate.replace(
      "{{redirectUrl}}",
      clientURL
    );

    // ✅ Return HTML that closes the window
    return res.send(emailHtmlTemplateData);
  } catch (error) {
    next(error);
  }
};

const handleActivateUserAccounta = async (req, res, next) => {
  try {
    const token = req.body.token;
    console.log(token);
    if (!token) throw createError(404, "token not found!");
    return;
    try {
      const decoded = jwt.verify(token, jwtActivationKey);
      if (!decoded) throw createError(404, "user was not able to verified");

      const userExists = await UserModel.exists({ email: decoded.email });
      if (userExists) {
        throw createError(
          409,
          "User with this email already exist. Please login"
        );
      }

      const image = decoded.image;
      if (image) {
        const response = await cloudinary.uploader.upload(image, {
          folder: "EcommerceImageServer/users",
        });
        decoded.image = response.secure_url;
      }

      const user = await UserModel.create(decoded);

      return successResponse(res, {
        statusCode: 201,
        message: `User was registration successfully`,
        payload: user,
      });
    } catch (error) {
      if (error.name === "TokenExpiredError") {
        throw createError(401, "Token has expired");
      } else if (error.name === "JsonWebTokenError") {
        throw createError(401, "Invalid Token");
      } else {
        throw error;
      }
    }
  } catch (error) {
    next(error);
  }
};

const handleUpdateUserById = async (req, res, next) => {
  try {
    console.log("Update user endpoint hit", req.body);
    const userId = req.params.id;
    // ✅ Check if user exists
    const existingUser = await UserModel.findById(userId);
    if (!existingUser) {
      throw createError(404, "User not found");
    }
    if (req.user.id !== userId && !req.user.isAdmin) {
      throw createError(403, "You can only update your own profile");
    }

    const {
      firstName,
      lastName,
      phoneNumber,
      emergencyContact,
      nidNumber,
      isTenant,
      isOwner,
      permanentAddressOption,
      occupation,
      organizationName,
      position,
    } = req.body;

    // ✅ Prepare update object
    const updateData = {};

    // Basic fields
    if (firstName) updateData.firstName = firstName;
    if (lastName) updateData.lastName = lastName;
    if (phoneNumber) updateData.phoneNumber = phoneNumber;
    if (emergencyContact) updateData.emergencyContact = emergencyContact;
    if (nidNumber) updateData.nidNumber = nidNumber;
    if (occupation) updateData.occupation = occupation;
    if (organizationName) updateData.organizationName = organizationName;
    if (position) updateData.position = position;
    if (permanentAddressOption)
      updateData.permanentAddressOption = permanentAddressOption;

    if (typeof isTenant !== "undefined") {
      updateData.isTenant = isTenant === "true" || isTenant === true;
    }
    if (typeof isOwner !== "undefined") {
      updateData.isOwner = isOwner === "true" || isOwner === true;
    }

    // ✅ Handle address updates
    const presentAddress =
      typeof req.body.presentAddress === "string"
        ? JSON.parse(req.body.presentAddress)
        : req.body.presentAddress;

    if (presentAddress) {
      updateData.presentAddress = presentAddress;
    }
    const permanentAddress =
      typeof req.body.permanentAddress === "string"
        ? JSON.parse(req.body.permanentAddress)
        : req.body.permanentAddress;

    if (permanentAddress) {
      updateData.permanentAddress = permanentAddress;
    }

    // ✅ Handle image uploads to Cloudinary
    const imageFields = ["profileImage", "nidFront", "nidBack"];

    for (const fieldName of imageFields) {
      if (req.files?.[fieldName]?.[0]) {
        const file = req.files[fieldName][0];

        // Validate file size
        if (file.size > 4 * 1024 * 1024) {
          throw createError(400, `${fieldName} is too large. Max size is 4MB`);
        }

        // ✅ Delete old image from Cloudinary (optional but recommended)
        if (existingUser[fieldName]) {
          try {
            const publicId = getPublicIdFromUrl(existingUser[fieldName]);
            if (publicId) {
              await deleteFromCloudinary(publicId);
              console.log(`✅ Deleted old ${fieldName} from Cloudinary`);
            }
          } catch (err) {
            console.error(`⚠️ Failed to delete old ${fieldName}:`, err.message);
          }
        }

        // Upload new image
        const result = await uploadBufferToCloudinary(file.buffer, "users");
        updateData[fieldName] = result.secure_url;
      }
    }

    // ✅ Update user in database
    const updatedUser = await UserModel.findByIdAndUpdate(
      userId,
      { $set: updateData },
      {
        new: true, // Return updated document
        runValidators: true, // Run schema validators
      }
    ).select("-password"); // Exclude password from response

    if (!updatedUser) {
      throw createError(404, "User not found");
    }

    return successResponse(res, {
      statusCode: 200,
      message: "User updated successfully",
      payload: {
        updatedUser,
      },
    });
  } catch (err) {
    next(err);
  }
};

// const handleBanUserById = async (req, res, next) => {
//   try {
//     const userId = req.params.id;
//     await findWithId(User, userId);
//     const updates = { isBanned: true };
//     const updateOptions = { new: true, runValidators: true, context: "query" };

//     const updatedUser = await UserModel.findByIdAndUpdate(
//       userId,
//       updates,
//       updateOptions
//     ).select("-password");

//     if (!updatedUser) {
//       throw createError(404, "User was not banned.");
//     }
//     return successResponse(res, {
//       statusCode: 202,
//       message: "user was banned successfully",
//       // payload: {
//       //   updatedUser,
//       // },
//     });
//   } catch (err) {
//     next(err);
//   }
// };

// const handleUnbanUserById = async (req, res, next) => {
//   try {
//     const userId = req.params.id;
//     await findWithId(User, userId);
//     const updates = { isBanned: false };
//     const updateOptions = { new: true, runValidators: true, context: "query" };

//     const updatedUser = await UserModel.findByIdAndUpdate(
//       userId,
//       updates,
//       updateOptions
//     ).select("-password");

//     if (!updatedUser) {
//       throw createError(404, "User was not unbanned.");
//     }
//     return successResponse(res, {
//       statusCode: 202,
//       message: "user was unbanned successfully",
//       payload: {
//         updatedUser,
//       },
//     });
//   } catch (err) {
//     next(err);
//   }
// };

const handleManageUserStatusById = async (req, res, next) => {
  try {
    const userId = req.params.id;
    const action = req.body.action;
    // console.log(action);
    const actionInfo = await handleUserAction(action, userId);
    return successResponse(res, {
      statusCode: 202,
      message: actionInfo.successMessage,
      payload: actionInfo.updatedUser,
    });
  } catch (err) {
    next(err);
  }
};

const handleUpdatePassword = async (req, res, next) => {
  try {
    const { email, oldPassword, newPassword, confirmedPassword } = req.body;

    const userId = req.params.id;

    const updatedUser = await updateUserPasswordById(
      userId,
      email,
      oldPassword,
      newPassword,
      confirmedPassword
    );

    return successResponse(res, {
      statusCode: 202,
      message: "user was updated successfully",
      payload: { updatedUser },
    });
  } catch (err) {
    next(err);
  }
};

const handleForgetPassword = async (req, res, next) => {
  try {
    const { email } = req.body;

    const token = await forgetPasswordByEmail(email);

    return successResponse(res, {
      statusCode: 200,
      message: `Please go to your ${email} to reset the password 
      `,
      payload: token,
    });
  } catch (err) {
    next(err);
  }
};

const handleResetPassword = async (req, res, next) => {
  try {
    const { token, password } = req.body;
    await resetPassword(token, password);

    return successResponse(res, {
      statusCode: 202,
      message: "Password reset successfully",
    });
  } catch (err) {
    next(err);
  }
};

module.exports = {
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
};
