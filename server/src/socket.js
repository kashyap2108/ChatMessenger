const { OrderedMap } = require("immutable");
const { ObjectID } = require("mongodb");
const passport = require("passport");
const { _ } = require("lodash");
const jwt_decode = require("jwt-decode");
const Channel = require("./models/Channel");
const Message = require("./models/Message");
const User = require("./models/User");
const mongoose = require("mongoose");
class Connection {
  constructor(app) {
    this.app = app;
    this.connections = OrderedMap();
    this.modelDidLoad();
  }
  decodeMessage(msg) {
    try {
      const decodedMessage = JSON.parse(msg);
      return decodedMessage;
    } catch (err) {
      console.log("An error decode the socket message", msg);
    }

    return msg;
  }

  sendAll(obj) {
    // send to all connections;
    this.connections.forEach((con, key) => {
      const ws = con.ws;
      this.send(ws, obj);
    });
  }
  send(ws, obj) {
    const message = JSON.stringify(obj);
    ws.send(message);
  }
  doTheJob(socketId, msg) {
    const action = _.get(msg, "action");
    const payload = _.get(msg, "payload");
    const userConnection = this.connections.get(socketId);

    // console.log("socket id is", socketId);
    console.log("action is", action);
    switch (action) {
      case "create_message":
        if (userConnection.isAuthenticated) {
          let messageObject = payload;
          messageObject.userId = _.get(userConnection, "userId");
          console.log(
            "Got message from client about creating new message",
            payload
          );

          new Message(messageObject)
            .save()
            .then(message => {
              message = message.toObject();
              // console.log("Message added successfully", message);

              const userId = _.toString(messageObject.userId);
              Channel.findOneAndUpdate(
                { _id: message.channelId },
                { lastMessage: message.body, updated: new Date() }
              )
                .then(res => {
                  User.findById(userId).then(user => {
                    user = user.toObject();
                    _.unset(user, "password");
                    _.unset(user, "email");
                    message.user = user;

                    const channelId = _.toString(_.get(message, "channelId"));

                    Channel.findById(channelId).then(channel => {
                      const memberIds = _.get(channel, "members", []);

                      _.each(memberIds, memberId => {
                        memberId = _.toString(memberId);
                        const memberConnections = this.connections.filter(
                          c => _.toString(c.userId) === memberId
                        );

                        memberConnections.forEach(connection => {
                          const ws = connection.ws;
                          console.log(message);
                          this.send(ws, {
                            action: "message_added",
                            payload: message
                          });
                        });
                      });
                    });
                    // console.log("Successful created new message");
                  });
                })
                .catch(err => {
                  console.log(err);
                });
            })
            .catch(err => {
              //send back to the socket client who sent this message with error
              console.log("cannot add message", err);
              const ws = userConnection.ws;
              this.send(ws, {
                action: "create_message_error",
                payload: err
              });
            });
        }

        break;
      case "create_channel":
        const channel = payload;
        // console.log("Got new channel to be created from client", channel);
        this.createChannel(channel);
        break;

      case "auth":
        let token = payload;
        let connection = this.connections.get(socketId);
        // console.log(connection);

        if (connection) {
          // console.log(token);
          if (token != null) {
            token = token.split(" ");
            var tokenDecoded = jwt_decode(token[1]);
            const currentTime = Date.now() / 1000;
            // console.log(connection);
            if (tokenDecoded.exp < currentTime) {
              console.log("token expired!!");
              console.log("token error!!");
              const obj = {
                action: "auth_error",
                payload: "An error authentication your account:"
              };
              this.send(connection.ws, obj);
            } else {
              const userId = tokenDecoded.id;
              connection.isAuthenticated = true;
              connection.userId = `${userId}`;
              this.connections = this.connections.set(socketId, connection);
              const obj = {
                action: "auth_success",
                payload: "You are verified"
              };
              this.send(connection.ws, obj);

              // send to all socket clients connection

              this.sendAll({
                action: "user_online",
                payload: _.toString(userId)
              });
              console.log("Status update of user", userId);
              User.findOneAndUpdate({ _id: userId }, { online: true })
                .then(user => {
                  console.log("successfully updated", user);
                })
                .catch(err => {
                  console.log(err);
                });
            }
          } else {
            console.log("outside error!!");
            const obj = {
              action: "auth_error",
              payload: "An error authentication your account:"
            };
            this.send(connection.ws, obj);
          }
        }
        break;

      default:
        console.log("Default executed");
        break;
    }
  }

  createChannel(channel) {
    let members = [];
    let channelMembers = _.get(channel, "members", []);
    _.each(channelMembers, (key, value) => {
      // console.log("Key", key, value);
      members.push(value);
    });
    console.log(channel);
    const newChannel = {
      _id: _.get(channel, "_id", ""),
      title: _.get(channel, "title", ""),
      lastMessage: _.get(channel, "lastMessage", ""),
      userId: _.get(channel, "userId"),
      members: members
    };
    newChannel.userId = mongoose.Types.ObjectId(newChannel.userId);
    console.log(newChannel);

    Channel.findById({ _id: newChannel._id })
      .then(channel => {
        if (!channel) {
          console.log("It's a new channel");
          new Channel(newChannel).save().then(channelObject => {
            console.log("Successful created new channel", channelObject);
            channelObject = channelObject.toObject();

            let memberConnections = [];
            const memberIds = _.get(channelObject, "members", []);

            const query = {
              _id: { $in: memberIds }
            };

            const queryOptions = {
              _id: 1,
              name: 1,
              created: 1
            };
            User.find(query, queryOptions).then(users => {
              channelObject.members = users;

              _.each(memberIds, id => {
                const userId = id.toString();
                const memberConnection = this.connections.filter(
                  con => `${con.userId}` === userId
                );

                if (memberConnection.size) {
                  memberConnection.forEach(con => {
                    const ws = con.ws;
                    const obj = {
                      action: "channel_added",
                      payload: channelObject
                    };

                    this.send(ws, obj);
                  });
                }
              });
            });
          });
        } else {
          console.log("It's a old channel");
          const channelObject = channel.toObject();

          let memberConnections = [];
          const memberIds = _.get(channelObject, "members", []);

          const query = {
            _id: { $in: memberIds }
          };

          const queryOptions = {
            _id: 1,
            name: 1,
            online: 1,
            created: 1
          };
          User.find(query, queryOptions).then(users => {
            // console.log("hello users", users);
            channelObject.members = users;

            _.each(memberIds, id => {
              const userId = id.toString();
              const memberConnection = this.connections.filter(
                con => `${con.userId}` === userId
              );

              // console.log("MemberConnection size is", memberConnection.size);
              if (memberConnection.size) {
                memberConnection.forEach(con => {
                  const ws = con.ws;
                  const obj = {
                    action: "channel_added",
                    payload: channelObject
                  };

                  this.send(ws, obj);
                });
              }
            });
          });
        }
      })
      .catch(err => console.log(err));
    console.log("channel added");
  }

  modelDidLoad() {
    this.app.wss.on("connection", ws => {
      console.log("Someone connected to server via socket!!");
      const socketID = new ObjectID().toString();
      console.log("New client connected!", socketID);

      const clientConnection = {
        _id: `${socketID}`,
        ws: ws,
        userId: null,
        isAuthenticated: false
      };
      // save the connections

      this.connections = this.connections.set(socketID, clientConnection);

      ws.on("message", msg => {
        const message = this.decodeMessage(msg);

        this.doTheJob(socketID, message);
      });

      ws.on("close", () => {
        console.log("user disconnected!!", socketID);
        const closeConnection = this.connections.get(socketID);
        const userId = _.toString(_.get(closeConnection, "userId", null));
        console.log(this.connections.size);
        this.connections = this.connections.remove(socketID);

        if (userId) {
          console.log("fucks!!", userId);
          const userConnections = this.connections.filter(con => {
            return _.get(con, "userId") === userId;
          });
          userConnections.map(ws => {
            console.log(ws.userId);
          });
          console.log(this.connections.size, userConnections.size);

          if (userConnections.size === 0) {
            this.sendAll({
              action: "user_offline",
              payload: userId
            });
          }
          User.findOneAndUpdate({ _id: userId }, { online: false })
            .then(user => {
              console.log("successfully offline", user);
            })
            .catch(err => {
              console.log(err);
            });
        }
      });
    });
  }
}

module.exports = Connection;
