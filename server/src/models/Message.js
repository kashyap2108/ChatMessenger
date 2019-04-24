const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const MessageSchema = new Schema({
  channelId: {
    type: Schema.Types.ObjectId,
    ref: "channels"
  },
  body: {
    type: Object,
    required: true
  },
  user: {
    type: Schema.Types.ObjectId,
    ref: "users"
  },
  created: {
    type: Date,
    default: Date.now()
  }
});

module.exports = Message = mongoose.model("messages", MessageSchema);
