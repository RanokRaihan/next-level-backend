// file already uploaded to the server
// now upload to the cloudinary and remove from the local server
import { v2 as cloudinary } from "cloudinary";
import fs from "fs";

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const uploadOnCloudinary = async (loaclPath) => {
  try {
    if (!loaclPath) return null;
    // upload to cloudinary
    const response = await cloudinary.uploader.upload(loaclPath, {
      resource_type: "auto",
    });
    // file uploaded successfully
    console.log("file uploaded successfully!!", response.url);
    return response;
  } catch (error) {
    fs.unlinkSync(loaclPath);
    //remove from local file
    return null;
  }
};

export { uploadOnCloudinary };
