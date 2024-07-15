import mongoose from "mongoose";

const connectDb = () => {
  mongoose
    .connect(process.env.MONGO_URL, { dbName: "chatify" })
    .then(() => {
      console.log("Database Connect Successfully");
    })
    .catch(() => {
      console.log("Database Failed");
    });
};

export { connectDb };
