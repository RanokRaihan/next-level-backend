import { User } from "../models/user.model.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { uploadOnCloudinary } from "../utils/cloudinary.js";

const registerUser = asyncHandler(async (req, res) => {
  //  get user data from frontend
  const { fullName, email, username, password } = req.body;
  console.log({ fullName, email, username, password });

  // validation: primary- notEmpty
  if (
    [fullName, email, username, password].some(
      (field) => field || field?.trim() === ""
    )
  ) {
    throw new ApiError(400, "all fields are required");
  }

  // check if user already exist: username and email
  const existedUser = await User.findOne({
    $or: [{ username }, { email }],
  });

  if (existedUser) {
    throw new ApiError(409, "User already exists!!");
  }

  // check if images exist: avatar
  const avatarLocalPath = req.files?.avatar[0]?.path;
  const coverImageLocalPath = req.files?.coverImage[0]?.path;

  if (!avatarLocalPath) {
    throw new ApiError(409, "avatar is required");
  }

  // upload image to cloudinary successfuly: check avatar
  const avatarResponse = await uploadOnCloudinary(avatarLocalPath);
  const coverImageResponse = await uploadOnCloudinary(coverImageLocalPath);

  if (!avatarResponse) {
    throw new ApiError(500, "Image upload failed");
  }
  // create user object and create in db entry

  const userResponse = await User.create({
    fullName,
    avatar: avatarResponse.url,
    coverImage: coverImageResponse?.url || "",
    email,
    username: username.toLowerCase(),
    password,
  });

  // check if user created successfull
  // remove password and refresh token field from response
  const createdUser = await User.findById(userResponse._id).select(
    "-password -refreshToken"
  );

  if (!createdUser) {
    throw new ApiError(500, "User registration failed!!");
  }

  //return res
  return res
    .status(201)
    .json(new ApiResponse(200, createdUser, "User registered successfully"));
});

export { registerUser };
