import React, { Component } from "react";
import avatar from "../images/avatar.jpeg";
import _ from "lodash";
import UserForm from "../user-form";
import UserMenu from "./user-menu";

class UserBar extends Component {
  constructor(props) {
    super(props);

    this.state = {
      showUserForm: false,
      showUserMenu: false
    };
  }

  render() {
    const { store } = this.props;
    const me = store.getCurrentUser();
    const profilePicture = _.get(me, "avatar");
    // console.log(this.state);
    return (
      <div className="user-bar">
        {!me ? (
          <button
            onClick={() => {
              this.setState({
                showUserForm: true
              });
            }}
            type="button"
            className="login-btn"
          >
            Sign In
          </button>
        ) : null}
        <div className="profile-name">{_.get(me, "name")}</div>
        <div
          className="profile-image"
          onClick={() => {
            this.setState({ showUserMenu: true });
          }}
        >
          <img src={profilePicture ? profilePicture : avatar} />
        </div>
        {!me && this.state.showUserForm ? (
          <UserForm
            store={store}
            onClose={() => {
              this.setState({ showUserForm: false });
            }}
          />
        ) : null}

        {this.state.showUserMenu ? (
          <UserMenu
            store={store}
            onClose={() => {
              this.setState({
                showUserMenu: false
              });
            }}
          />
        ) : null}
      </div>
    );
  }
}

export default UserBar;
