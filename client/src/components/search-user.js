import React, { Component } from "react";
import avatar from "../images/avatar.jpeg";
class SearchUser extends Component {
  constructor(props) {
    super(props);
  }

  handleOnClick(user) {
    if (this.props.onSelect) {
      this.props.onSelect(user);
    }
  }
  render() {
    const { store } = this.props;

    const users = store.getSearchUsers();
    return (
      <div className="search-user">
        <div className="user-list">
          {users.map((user, index) => {
            return (
              <div
                onClick={() => this.handleOnClick(user)}
                key={index}
                className="user"
              >
                <img src={user.avatar ? user.avatar : avatar} alt="..." />
                <h2>{user.name}</h2>
              </div>
            );
          })}
        </div>
      </div>
    );
  }
}

export default SearchUser;
