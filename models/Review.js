const mongoose = require("mongoose");

const { Schema } = mongoose;
mongoose.Promise = global.Promise;
const mongodbErrorHandler = require("mongoose-mongodb-errors");

const reviewSchema = new Schema({
  created: {
    type: Date,
    default: Date.now
  },
  author: {
    type: mongoose.Schema.ObjectId,
    ref: "User"
  },
  store: {
    type: mongoose.Schema.ObjectId,
    ref: "Store",
    required: "You must supply a store!"
  },
  text: {
    type: String,
    required: "Your review must have text!"
  },
  rating: {
    type: Number,
    min: 1,
    max: 5
  }
});

function autopopulate(next) {
  this.populate("author");
  next();
}

reviewSchema.pre("find", autopopulate);
reviewSchema.pre("findOne", autopopulate);

reviewSchema.plugin(mongodbErrorHandler);

module.exports = mongoose.model("Review", reviewSchema);
