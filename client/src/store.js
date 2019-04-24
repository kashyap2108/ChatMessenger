import { OrderedMap } from "immutable";
import Service from "./service";
import _ from "lodash";
import axios from "axios";
import jwt_decode from "jwt-decode";
import Realtime from "./realtime";

export default class Store {
  constructor(appComponent) {
    this.app = appComponent;
    this.messages = new OrderedMap();
    this.channels = new OrderedMap();
    this.activeChannelId = null;
    this.service = new Service();
    this.user = this.getUserFromLocalStorage();
    this.users = new OrderedMap();
    this.token = this.getTokenFromLocalStorage();
    this.search = {
      users: new OrderedMap()
    };
    this.realtime = new Realtime(this);
    this.fetchUserChannels();
  }

  fetchUserChannels() {
    const userToken = this.token;
    if (userToken) {
      axios
        .get("me/channels")
        .then(response => {
          const channels = response.data;
          // console.log("fucks!!", response.data);
          _.each(channels, c => {
            this.realtime.onAddChannel(c);
          });
          const firstChannelId = _.get(channels, "[0]._id", null);
          this.fetchChannelMessages(firstChannelId);
        })
        .catch(err => {
          console.log("An error fetching user channels", err);
        });
    }
    this.update();
  }

  addUserToCache(user) {
    const id = _.toString(user._id);

    this.users = this.users.set(id, user);

    this.update();
  }
  setAuthToken(token = null) {
    if (token) {
      axios.defaults.headers.common["Authorization"] = token;
    } else {
      delete axios.defaults.headers.common["Authorization"];
    }
  }

  getSearchUsers() {
    return this.search.users.valueSeq();
  }
  getTokenFromLocalStorage() {
    let token = null;
    const data = localStorage.getItem("token");
    if (data) {
      try {
        token = JSON.parse(data);
      } catch (err) {
        console.log(err);
      }
    }
    this.setAuthToken(token);
    return token;
  }

  getUserTokenId() {
    // console.log("hello", this.token);
    return this.token;
  }
  setUserToken(accessToken) {
    if (!accessToken) {
      this.localStorage.remove("token");
      this.token = null;
      return;
    }
    this.token = accessToken;
    this.setAuthToken(accessToken);
    localStorage.setItem("token", JSON.stringify(this.token));
  }
  getUserFromLocalStorage() {
    let user = null;
    try {
      const data = localStorage.getItem("me");
      if (data) {
        user = JSON.parse(data);
      }
    } catch (err) {
      console.log(err);
    }

    if (user) {
      const token = this.getTokenFromLocalStorage();
      const decoded = jwt_decode(token);
      const currentTime = Date.now() / 1000;

      if (decoded.exp < currentTime) {
        this.signOut();
      }
    }

    return user;
  }
  setCurrentUser(user) {
    this.user = user;
    if (user) {
      localStorage.setItem("me", JSON.stringify(user));
      const userId = user._id;
      this.users = this.users.set(userId, user);
    }
    this.update();
  }
  setMessage(message, notify = false) {
    const id = _.toString(_.get(message, "_id"));

    this.messages = this.messages.set(id, message);

    const channelId = _.toString(message.channelId);
    let channel = this.channels.get(channelId);

    if (channel) {
      channel.messages = channel.messages.set(`${id}`, true);
      channel.notify = notify;
      channel.lastMessage = _.get(message, "body", "");
      this.channels = this.channels.set(`${channelId}`, channel);
    } else {
      axios.post(`channels/${channelId}`).then(response => {
        const channel = _.get(response, "data");

        this.realtime.onAddChannel(channel);
      });
    }

    this.update();
  }
  fetchChannelMessages(channelId) {
    if (channelId) {
      axios
        .get(`api/channels/${channelId}/messages`)
        .then(response => {
          const messages = response.data;
          // console.log(messages);
          _.each(messages, message => {
            this.realtime.onAddMessage(message);
          });
        })
        .catch(err => {
          console.log(`An error fetching channel 's messages`, err);
        });
    }
  }
  signOut() {
    const userId = this.user ? this.user._id : null;
    this.user = null;
    localStorage.removeItem("me");
    localStorage.removeItem("token");
    if (userId) {
      this.users = this.users.remove(userId);
    }
    this.channels = new OrderedMap();

    this.update();
  }
  login(email = null, password = null) {
    const user = {
      email: email,
      password: password
    };
    // console.log("Trying to login");
    return new Promise((resolve, reject) => {
      axios
        .post("login", user)
        .then(response => {
          const accessToken = response.data.token;
          const { user } = response.data;
          this.setCurrentUser(user);
          this.setUserToken(accessToken);
          this.realtime.authentication();
          this.fetchUserChannels();
          resolve(user);
          // console.log(response.data);
        })
        .catch(err => {
          console.log("Err ", err.response.data);
          const message = err.response.data;
          return reject(message);
        });
    });
  }
  removeMemberFromChannel(channel = null, user = null) {
    if (!channel || !user) {
      return;
    }
    const userId = user._id;
    const channelId = channel._id;
    channel.members = channel.members.remove(userId);
    this.channels = this.channels.set(channelId, channel);
    this.update();
  }
  startSearchUsers(q = "") {
    const data = { search: q };
    this.search.users = this.search.users.clear();

    axios
      .post("search", data)
      .then(response => {
        const users = response.data;
        // console.log(response.data);
        _.each(users, user => {
          const userId = `${user._id}`;
          // console.log(userId);
          this.users = this.users.set(userId, user);
          this.search.users = this.search.users.set(userId, user);
        });

        this.update();
        // console.log("searched users", this.search.users);
      })
      .catch(err => {
        console.log("Searching err", err.response.data);
      });
  }

  addUserToChannel(channelId, userId) {
    const channel = this.channels.get(channelId);

    if (channel) {
      channel.members = channel.members.set(userId, true);
      this.channels = this.channels.set(channelId, channel);

      this.update();
    }
  }
  onCreateNewChannel(channel = {}) {
    const channelId = channel._id;

    this.addChannel(channelId, channel);
    this.setActiveChannelId(channelId);
  }
  setActiveChannelId(id) {
    // console.log("set active", id);
    this.activeChannelId = id;
    this.fetchChannelMessages(id);
    this.update();
  }
  getActiveChannel() {
    const channel = this.activeChannelId
      ? this.channels.get(this.activeChannelId)
      : this.channels.first();

    return channel;
  }
  addMessage(id, message = {}) {
    this.messages = this.messages.set(`${id}`, message);

    const user = this.getCurrentUser();
    message.user = user;

    const channelId = message.channelId;
    if (channelId) {
      let channel = this.channels.get(channelId);
      // console.log(channel);
      channel.lastMessage = _.get(message, "body", "");

      const obj = {
        action: "create_channel",
        payload: channel
      };
      this.realtime.send(obj);

      channel.messages = channel.messages.set(`${id}`, true);

      channel.isNew = false;
      this.channels = this.channels.set(`${channelId}`, channel);
      this.realtime.send({
        action: "create_message",
        payload: message
      });
      // console.log("fucks!!");
    }

    this.update();
  }
  getMessages() {
    return this.messages.valueSeq();
  }

  getMessagesFromChannel(channel) {
    let messages = new OrderedMap();

    if (channel) {
      channel.messages.forEach((value, key) => {
        const message = this.messages.get(key);
        messages = messages.set(key, message);
      });
    }
    return messages.valueSeq();
  }

  getCurrentUser() {
    return this.user;
  }
  getMembersFromChannel(channel) {
    let members = new OrderedMap();
    if (channel) {
      channel.members.forEach((value, key) => {
        const userId = `${key}`;
        const user = this.users.get(userId);

        const loggedUser = this.getCurrentUser();
        if (_.get(loggedUser, "_id") !== _.get(user, "_id")) {
          members = members.set(key, user);
        }
      });
    }

    return members.valueSeq();
  }
  addChannel(index, channel = {}) {
    this.channels = this.channels.set(`${index}`, channel);

    this.update();
  }

  getChannels() {
    this.channels = this.channels.sort((a, b) => {
      return b.updated - a.updated;
    });

    return this.channels.valueSeq();
  }

  update() {
    this.app.forceUpdate();
  }
}
