import React, { Component } from "react";
import avatar from "../images/avatar.jpeg";
import classNames from "classnames";
import { OrderedMap } from "immutable";
import SearchUser from "./search-user";
import UserBar from "./user-bar";
import ObjectID from "bson-objectid";
import moment from "moment";
import _ from "lodash";

class Messenger extends Component {
  constructor(props) {
    super(props);
    this.state = {
      height: window.innerHeight,
      newMessage: "Hello there...",
      searchUser: "",
      showSearchUser: false
    };

    this._onResize = this._onResize.bind(this);

    this.handleSend = this.handleSend.bind(this);
    this.scrollMessagesToBottom = this.scrollMessagesToBottom.bind(this);
    this._onCreateChannel = this._onCreateChannel.bind(this);
  }

  renderChannelTitle(channel = null) {
    if (!channel) {
      return null;
    }
    const { store } = this.props;

    const members = store.getMembersFromChannel(channel);
    // console.log("channel members", members);
    const names = [];

    members.forEach(user => {
      const name = _.get(user, "name");
      names.push(name);
    });

    let title = _.join(names, ",");

    if (!title && _.get(channel, "isNew")) {
      title = "New message";
    }

    return <h2>{title}</h2>;
  }
  _onCreateChannel() {
    const { store } = this.props;

    const currentUser = store.getCurrentUser();
    const currentUserId = currentUser._id;

    const channelId = new ObjectID().toString();
    const channel = {
      _id: channelId,
      title: `${channelId}`,
      lastMessage: "",
      members: new OrderedMap(),
      messages: new OrderedMap(),
      isNew: true,
      userId: currentUserId,
      created: new Date()
    };
    channel.members = channel.members.set(currentUserId, true);
    // store.users = store.users.set(currentUserId, currentUser);
    console.log(channel);
    store.onCreateNewChannel(channel);
  }
  _onResize() {
    this.setState({
      height: window.innerHeight
    });
  }
  componentDidMount() {
    window.addEventListener("resize", this._onResize);
  }

  handleSend() {
    const { newMessage } = this.state;
    const { store } = this.props;

    // create new message

    if (newMessage.trim().length) {
      const messageId = new ObjectID().toString();
      const channelId = store.getActiveChannel()._id;
      const currentUser = store.getCurrentUser();
      const message = {
        _id: messageId,
        channelId: channelId,
        body: newMessage,
        user: currentUser,
        me: true
      };

      store.addMessage(messageId, message);
      this.setState({ newMessage: "" });
    }
  }

  componentWillUnmount() {
    window.removeEventListener("resize", this._onResize);
  }
  componentDidUpdate() {
    this.scrollMessagesToBottom();
  }
  scrollMessagesToBottom() {
    if (this.messagesRef) {
      this.messagesRef.scrollTop = this.messagesRef.scrollHeight;
    }
  }
  render() {
    const { store } = this.props;
    const { height } = this.state;
    const style = {
      height: height
    };

    const activeChannel = store.getActiveChannel();

    const messages = store.getMessagesFromChannel(activeChannel);
    const channels = store.getChannels();
    const members = store.getMembersFromChannel(activeChannel);

    return (
      <div style={style} className="app-messenger">
        <div className="header">
          <div className="left">
            <button className="left-action">
              <i className="icon-settings-streamline-1" />
            </button>
            <button className="right-action" onClick={this._onCreateChannel}>
              <i className="icon-edit-modify-streamline" />
            </button>
            <h2>Messenger</h2>
          </div>
          <div className="content">
            {_.get(activeChannel, "isNew") ? (
              <div className="toolbar">
                <label>To:</label>
                {members.map((user, key) => {
                  return (
                    <span
                      onClick={() => {
                        store.removeMemberFromChannel(activeChannel, user);
                      }}
                      key={key}
                    >
                      {_.get(user, "name")}
                    </span>
                  );
                })}
                <input
                  placeholder="Type name of person..."
                  onChange={event => {
                    const searchUserText = _.get(event, "target.value");

                    //console.log("searching for user with name: ", searchUserText)

                    this.setState(
                      {
                        searchUser: searchUserText,
                        showSearchUser: true
                      },
                      () => {
                        store.startSearchUsers(searchUserText);
                      }
                    );
                  }}
                  type="text"
                  value={this.state.searchUser}
                />

                {this.state.showSearchUser ? (
                  <SearchUser
                    onSelect={user => {
                      this.setState(
                        {
                          showSearchUser: false,
                          searchUser: ""
                        },
                        () => {
                          const userId = _.get(user, "_id");
                          const channelId = _.get(activeChannel, "_id");

                          store.addUserToChannel(channelId, userId);
                        }
                      );
                    }}
                    store={store}
                  />
                ) : null}
              </div>
            ) : (
              this.renderChannelTitle(activeChannel)
            )}
          </div>
          <div className="right">
            <UserBar store={store} />
          </div>
        </div>
        <div className="main">
          <div className="sidebar-left">
            <div className="chanels">
              {channels.map((channel, key) => {
                return (
                  <div
                    onClick={key => {
                      store.setActiveChannelId(channel._id);
                    }}
                    key={key}
                    className={classNames(
                      "chanel",
                      { notify: _.get(channel, "notify") === true },
                      {
                        active: activeChannel._id === channel._id
                      }
                    )}
                  >
                    <div className="user-image">
                      <img src={avatar} />
                    </div>
                    <div className="chanel-info">
                      <h2>{this.renderChannelTitle(channel)}</h2>
                      <p>{channel.lastMessage}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
          <div className="content">
            <div ref={ref => (this.messagesRef = ref)} className="messages">
              {messages.map((message, index) => {
                const { user } = message;
                return (
                  <div
                    key={index}
                    className={classNames("message", { me: message.me })}
                  >
                    <div className="message-user-image">
                      <img src={avatar} alt="" />
                    </div>

                    <div className="message-body">
                      <div className="message-author">
                        {message.me ? "You" : message.user.name} says
                      </div>
                      <div className="message-text">
                        <p>{message.body} !!</p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
            <div className="messenger-input">
              <div className="text-input">
                <textarea
                  onKeyUp={e => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      this.handleSend();
                    }
                  }}
                  onChange={e => {
                    this.setState({ newMessage: e.target.value });
                  }}
                  value={this.state.newMessage}
                  placeholder="Write your message"
                />
              </div>
              <div className="actions">
                <button onClick={this.handleSend} className="send">
                  Send
                </button>
              </div>
            </div>
          </div>
          <div className="sidebar-right">
            {members.size > 0 ? (
              <div>
                {" "}
                <h2 className="title">Members</h2>
                <div className="members">
                  {members.map((member, key) => {
                    const isOnline = _.get(member, "online", false);
                    console.log(isOnline, member);
                    return (
                      <div key={key} className="member">
                        <div className="user-image">
                          <img src={avatar} alt="" />
                        </div>
                        <div className="member-info">
                          <h2>
                            {member.name} -
                            <span
                              className={classNames("user-status", {
                                online: isOnline
                              })}
                            >
                              {isOnline ? "Online" : "Offline"}
                            </span>
                          </h2>
                          <p>Joined:{moment(member.created).fromNow()}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>{" "}
              </div>
            ) : null}
          </div>
        </div>
      </div>
    );
  }
}

export default Messenger;
