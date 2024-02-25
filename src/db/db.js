import mongoose from "mongoose";
import { app } from "../app.js";

const connectDB = async () => {
  try {
    const connectionInstance = await mongoose.connect(
      `${process.env.MONGODB_URI}/${process.env.DB_NAME}`
    );

    app.on("error", (error) => {
      console.log(`error: ${error}`);
    });
    console.log(
      `MongoDB connected!! DB HOST: ${connectionInstance.connection.host}`
    );
  } catch (error) {
    console.log(`Mongodb connection failed: ${error}`);
    throw error;
  }
};

export default connectDB;
