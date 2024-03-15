import { User } from "../models/user.model.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { uploadOnCloudinary } from "../utils/cloudinary.js";

const genAccessRefreshToken = async (userId) => {
  try {
    const user = await User.findById(userId);
    const accessToken = await user.generateAccessToken();
    const refreshToken = await user.generateRefreshToken();
    user.refreshToken = refreshToken;
    await user.save({ validateBeforeSave: false });
    return { accessToken, refreshToken };
  } catch (error) {
    throw new ApiError(500, "token generation failed!!");
  }
};

const registerUser = asyncHandler(async (req, res) => {
  //  get user data from frontend
  const { fullName, email, username, password } = req.body;
  console.log({ fullName, email, username, password });

  // validation: primary- notEmpty
  if (
    [fullName, email, username, password].some((field) => field?.trim() === "")
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

// login controller
const loginUser = asyncHandler(async (req, res) => {
  // get login data from req.body
  const { username, password } = req.body;
  console.log({ username, password });

  //check username email
  if (!username || username.trim() === "") {
    throw new ApiError(400, "username or email is required");
  }
  //find that user in database
  const user = await User.findOne({
    $or: [{ username: username }, { email: username }],
  });
  if (!user) {
    throw new ApiError(400, "user not found");
  }
  // check password
  const isPassCorrect = await user.isPasswordCorrect(password);
  if (!isPassCorrect) {
    throw new ApiError(400, "username or password is incorrect");
  }
  const { accessToken, refreshToken } = await genAccessRefreshToken(user._id);
  const loggedInUser = await User.findById(user._id).select(
    "-password -refreshToken"
  );
  const options = {
    httpOnly: true,
    secure: true,
  };
  res
    .status(200)
    .cookie("accessToken", accessToken, options)
    .cookie("refreshToken", refreshToken, options)
    .json(
      new ApiResponse(
        200,
        {
          user: loggedInUser,
        },
        "user logged in successfuly"
      )
    );
});

// logout user
const logoutUser = asyncHandler(async (req, res) => {
  const { _id } = req.user;
  await User.findByIdAndUpdate(
    _id,
    {
      $set: {
        refreshToken: undefined,
      },
    },
    {
      new: true,
    }
  );

  const options = {
    httpOnly: true,
    secure: true,
  };

  res
    .status(200)
    .clearCookie("accessToken", options)
    .clearCookie("refreshToken", options)
    .json(new ApiResponse(200, {}, "user logged out successfuly"));
});

export { loginUser, logoutUser, registerUser };
