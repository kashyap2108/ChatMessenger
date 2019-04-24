import _ from "lodash";
import { OrderedMap } from "immutable";

export default class Realtime {
  constructor(store) {
    this.store = store;
    this.ws = null;
    this.isConnected = false;
    this.connect();
    this.reconnect();
  }

  disconnect() {
    this.ws.close();
  }
  reconnect() {
    const store = this.store;
    window.setInterval(() => {
      const user = store.getCurrentUser();
      if (user && !this.isConnected) {
        this.connect();
      }
    });
  }
  send(msg = {}) {
    const isConnected = this.isConnected;
    if (isConnected) {
      const msgString = JSON.stringify(msg);
      this.ws.send(msgString);
    }
  }
  authentication() {
    const store = this.store;
    const token = store.token;
    const message = {
      action: "auth",
      payload: token
    };
    console.log("Client auth:", token);
    this.send(message);
  }

  decodeMessage(msg) {
    let message = {};
    try {
      message = JSON.parse(msg);
    } catch (err) {
      console.log(err);
    }
    // console.log(Object.keys(message.payload));
    return message;
  }
  readMessage(msg) {
    const store = this.store;

    const message = this.decodeMessage(msg);
    const action = _.get(message, "action", "");
    const payload = _.get(message, "payload");
    console.log("Action is", action);
    switch (action) {
      case "user_offline":
        this.updateUserStatus(payload, false);
        break;
      case "user_online":
        const isOnline = true;
        this.updateUserStatus(payload, isOnline);

        break;
      case "message_added":
        let notify = true;

        this.onAddMessage(payload, notify);
        break;

      case "channel_added":
        // to do check payload object and insert new channel to store.
        this.onAddChannel(payload);
        break;
      default:
        break;
    }
  }
  connect() {
    console.log("Begin connecting to server via socket!!");

    const ws = new WebSocket("ws://localhost:5000");
    this.ws = ws;

    this.ws.onopen = () => {
      this.isConnected = true;
      console.log("hello");
      this.authentication();

      this.ws.onmessage = event => {
        console.log("Message from server", event.data);
        this.readMessage(_.get(event, "data", {}));
      };
    };

    this.ws.onclose = () => {
      console.log("You are disconnected !!");
      this.isConnected = false;
    };
    this.ws.onerror = () => {
      this.isConnected = false;
    };
  }
  onAddChannel(payload) {
    const store = this.store;
    const channelId = `${payload._id}`;
    const userid = `${payload.userId}`;

    const users = _.get(payload, "members", []);

    let channel = {
      _id: channelId,
      title: _.get(payload, "title", ""),
      isNew: false,
      lastMessage: _.get(payload, "lastMessage"),
      members: new OrderedMap(),
      messages: new OrderedMap(),
      userId: userid,
      created: new Date()
    };
    // console.log("users from server", users);

    _.each(users, user => {
      const memberId = `${user._id}`;

      store.addUserToCache(user);
      channel.members = channel.members.set(memberId, true);
    });

    const channelMessages = store.messages.filter(
      m => _.toString(m.channelId) === channelId
    );

    channelMessages.forEach(msg => {
      const msgId = _.toString(_.get(msg, "_id"));
      channel.messages = channel.messages.set(msgId, true);
    });

    store.addChannel(channelId, channel);
  }

  updateUserStatus(userId, isOnline = false) {
    const store = this.store;

    store.users = store.users.update(userId, user => {
      if (user) {
        user.online = isOnline;
      }

      return user;
    });
    console.log("status update!!");
    store.update();
  }
  onAddMessage(payload, notify = true) {
    const store = this.store;
    const currentUser = store.getCurrentUser();
    const currentUserId = _.toString(_.get(currentUser, "_id"));
    const user = _.get(payload, "user");

    // add user to cache

    store.addUserToCache(user);
    const messageObject = {
      _id: payload._id,
      body: _.get(payload, "body", ""),
      user: _.get(payload, "user"),
      channelId: _.get(payload, "channelId"),
      created: _.get(payload, "created", new Date()),
      me: currentUserId === _.toString(user._id)
    };

    store.setMessage(messageObject, notify);
  }
}
