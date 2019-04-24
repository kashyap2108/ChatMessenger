const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const ChannelSchema = new Schema({
  title: {
    type: String,
    required: true
  },
  lastMessage: {
    type: String,
    required: true
  },
  members: [
    {
      type: Schema.Types.ObjectId,
      ref: "users"
    }
  ],
  userId: {
    type: Schema.Types.ObjectId,
    ref: "users"
  },
  updated: {
    type: Date,
    default: Date.now()
  },
  created: {
    type: Date,
    default: Date.now()
  }
});

module.exports = Channel = mongoose.model("channels", ChannelSchema);
