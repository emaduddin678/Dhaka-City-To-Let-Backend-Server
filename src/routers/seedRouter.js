const express = require("express");
const fs = require("fs");

const path = require("path");

const { seedUser, seedProducts } = require("../controllers/seedController");
const {
  uploadUserImage,
  uploadProductImage,
} = require("../middlewares/uploadFile");
const { uploadBufferToCloudinary } = require("../helper/cloudinaryHelper");
const { uploadImageMulter } = require("../middlewares/uploadImageMulter");
const PropertyModel = require("../models/proppertyModel");
const seedRouter = express.Router();

seedRouter.get("/users", uploadUserImage.single("image"), seedUser);
seedRouter.get("/products", uploadProductImage.single("image"), seedProducts);

// Standard image categories
const categories = [
  { key: "bedroom", pattern: "bedRoom-%d.jpg", fallback: "bedRoom-1.jpg" },
  {
    key: "dining",
    pattern: "diningSpace-%d.jpg",
    fallback: "diningSpace-1.jpg",
  },
  { key: "drawing", pattern: "drawing-%d.jpg", fallback: "drawing-1.jpg" },
  { key: "house", pattern: "house-%d.jpg", fallback: "house-1.jpg" },
  { key: "kitchen", pattern: "kitchen-%d.jpg", fallback: "kitchen-1.jpg" },
  { key: "stairs", pattern: "stairs-%d.jpg", fallback: "stairs-1.jpg" },
  { key: "bathroom", pattern: "bathroom-%d.jpg", fallback: "bathroom-1.jpg" },
];

// Image naming patterns
const IMAGE_TYPES = [
  { name: "bathroom", pattern: "bathroom-" },
  { name: "bedroom", pattern: "bedRoom-" },
  { name: "dining", pattern: "diningSpace-" },
  { name: "drawing", pattern: "drawing-" },
  { name: "house", pattern: "house-" },
  { name: "kitchen", pattern: "kitchen-" },
  { name: "stairs", pattern: "stairs-" },
];

/**
 * Read image file from reference directory
 */
const readImageFile = async (imagePath) => {
  try {
    const buffer = await fs.readFile(imagePath);
    return buffer;
  } catch (error) {
    return null;
  }
};

/**
 * Get image buffer for a specific property index
 */
const getImageBuffer = async (imageType, propertyIndex, referenceDir) => {
  // Try to get image with property index
  // const imagePath = imageType.pattern.replace("-", `${propertyIndex}`);
  let imagePath = path.join(
    referenceDir,
    `${imageType.pattern}${propertyIndex}.jpg`
  );
  console.log("Trying to read image at path:", imagePath);

  let buffer;
  if (fs.existsSync(imagePath)) {
    buffer = fs.readFileSync(imagePath);
  } else {
    // fallback
    const fallbackPath = path.join(referenceDir, cat.fallback);
    if (fs.existsSync(fallbackPath)) {
      buffer = fs.readFileSync(fallbackPath);
      console.log(`⚠️ Missing ${imagePath}, used fallback ${cat.fallback}`);
    } else {
      console.log(`❌ Missing both ${imagePath} and fallback ${cat.fallback}`);
      // continue; // skip if nothing found
    }
  }

  // let buffer = await readImageFile(imagePath);

  // // If not found, fallback to index 1
  // if (!buffer) {
  //   console.log("test");
  //   imagePath = path.join(referenceDir, `${imageType.pattern}1.jpg`);
  //   buffer = await readImageFile(imagePath);
  // }

  return buffer;
};

/**
 * Upload all images for a single property to Cloudinary
 */
const uploadPropertyImages = async (propertyIndex, referenceDir) => {
  const imageUrls = [];
  console.log("Reference Dir inside uploadPropertyImages:", referenceDir);
  for (const imageType of IMAGE_TYPES) {
    try {
      const buffer = await getImageBuffer(
        imageType,
        propertyIndex,
        referenceDir
      );

      if (buffer) {
        // Upload to Cloudinary
        const result = await uploadBufferToCloudinary(buffer, "properties");
        imageUrls.push({
          url: result.secure_url,
          type: imageType.name,
        });
        console.log(
          `✅ Uploaded ${imageType.name} for property ${propertyIndex}`
        );
      } else {
        console.warn(
          `⚠️ No image found for ${imageType.name} (property ${propertyIndex})`
        );
      }
    } catch (error) {
      console.log(error);
      console.error(
        `❌ Failed to upload ${imageType.name} for property ${propertyIndex}:`,
        error.message
      );
    }
  }

  return imageUrls;
};

/**
 * Seed route - Updates all properties with demo images
 * POST /api/seed/properties/images
 */
seedRouter.post(
  "/properties/images",
  uploadImageMulter.none(), // Required for multer middleware, but no files expected from request
  async (req, res, next) => {
    try {
      const referenceDir = path.join(__dirname, "../../references"); // Adjust path as needed
      // Check if reference directory exists
      try {
        await fs.promises.access(referenceDir);
      } catch (error) {
        return res.status(404).json({
          success: false,
          message: "Reference directory not found",
        });
      }

      // Fetch all properties from database
      const properties = await PropertyModel.find({});

      if (properties.length === 0) {
        return res.status(404).json({
          success: false,
          message: "No properties found in database",
        });
      }

      console.log(
        `🚀 Starting image upload for ${properties.length} properties...`
      );
      const updateResults = {
        success: [],
        failed: [],
        total: properties.length,
      };

      // Process each property
      for (let i = 0; i < properties.length; i++) {
        const property = properties[i];
        const propertyIndex = i + 1; // 1-based index for image matching

        try {
          console.log(
            `\n📦 Processing property ${propertyIndex}/${properties.length} (ID: ${property._id})`
          );

          // Upload images to Cloudinary
          // const imageUrls = await uploadPropertyImages(
          //   propertyIndex,
          //   referenceDir
          // );
          const imageUrls = [];

          for (const cat of categories) {
            const fileName = cat.pattern.replace("%d", propertyIndex);
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
          console.log("Reference Directory:", __dirname, referenceDir);
          // res.send({ message: "ok", properties, imageUrls });
          // return;

          if (imageUrls.length === 0) {
            updateResults.failed.push({
              propertyId: property._id,
              reason: "No images uploaded",
            });
            continue;
          }

          // Update property document
          const updatedProperty = await PropertyModel.findByIdAndUpdate(
            property._id,
            { images: imageUrls },
            { new: true }
          );

          updateResults.success.push({
            propertyId: updatedProperty._id,
            imagesCount: imageUrls.length,
          });

          console.log(
            `✅ Updated property ${property._id} with ${imageUrls.length} images`
          );
        } catch (error) {
          console.error(
            `❌ Failed to update property ${property._id}:`,
            error.message
          );
          updateResults.failed.push({
            propertyId: property._id,
            reason: error.message,
          });
        }
      }

      // Send response
      return res.status(200).json({
        success: true,
        message: "Property images seeding completed",
        results: {
          total: updateResults.total,
          successful: updateResults.success.length,
          failed: updateResults.failed.length,
          successfulProperties: updateResults.success,
          failedProperties: updateResults.failed,
        },
      });
    } catch (error) {
      console.error("❌ Seed process error:", error);
      next(error);
    }
  }
);

seedRouter.post("/properties/images-update", async (req, res, next) => {
  try {
    const properties = await PropertyModel.find({
      title: "Green Road Bachelor Studio",
    });
    console.log("Total properties found:", properties.length);
    // return res.status(200).json({ message: "ok" });
    console.log("Total properties found:", req.body);
    const images = req.body;
    for (let i = 0; i < properties.length; i++) {
      properties[i].images = images;
      await properties[i].save();
      console.log(`✅ Updated property ${properties[i]._id} images`);
    }
    return;

    // for (let i = 0; i < properties.length; i++) {
    //   if (i === 0) continue;
    //   const propertyImage = properties[i].images;
    //   console.log(propertyImage);
    //   const first = propertyImage.shift();
    //   console.log("Hello", first);
    //   console.log("property image after shift", propertyImage);
    //   propertyImage.push(first);
    //   console.log("property image after push", propertyImage);
    //   properties[i].images = propertyImage;
    //   await properties[i].save();
    //   console.log(`✅ Updated property ${properties[i]._id} images`);
    // }
  } catch (error) {
    next(error);
  }
});

module.exports = seedRouter;
