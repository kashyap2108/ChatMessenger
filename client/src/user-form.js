import React, { Component } from "react";
import _ from "lodash";
import classNames from "classnames";
import { timingSafeEqual } from "crypto";
import { runInThisContext } from "vm";

class UserForm extends Component {
  constructor(props) {
    super(props);
    this.state = {
      message: null,
      user: {
        email: "",
        password: ""
      }
    };
    this.onSubmit = this.onSubmit.bind(this);
    this.onTextFieldChange = this.onTextFieldChange.bind(this);

    this.onClickOutside = this.onClickOutside.bind(this);
  }

  onClickOutside(event) {
    if (this.ref && !this.ref.contains(event.target)) {
      if (this.props.onClose) {
        this.props.onClose();
      }
    }
  }
  componentDidMount() {
    window.addEventListener("mousedown", this.onClickOutside);
  }
  componentWillUnmount() {
    window.removeEventListener("mousedown", this.onClickOutside);
  }
  onSubmit(e) {
    const { user } = this.state;
    const { store } = this.props;
    e.preventDefault();

    this.setState(
      {
        message: null
      },
      () => {
        store
          .login(user.email, user.password)
          .then(user => {
            if (this.props.onClose) {
              this.props.onClose();
            }
          })
          .catch(err => {
            console.log("err", err);
            this.setState({
              message: {
                body: err,
                type: "error"
              }
            });
          });
      }
    );
  }

  onTextFieldChange(e) {
    let { user } = this.state;
    const field = e.target.name;
    user[field] = e.target.value;

    this.setState({ user: user });
  }
  render() {
    const { user, message } = this.state;
    return (
      <div className="user-form" ref={ref => (this.ref = ref)}>
        <form onSubmit={this.onSubmit} method="post">
          {message ? (
            <p className={classNames("app-message", message.type)}>
              {message.body}
            </p>
          ) : null}
          <div className="form-item">
            <label>email</label>
            <input
              value={user.email}
              onChange={this.onTextFieldChange}
              type="email"
              placeholder="Email Address"
              name="email"
            />
          </div>

          <div className="form-item">
            <label>password</label>
            <input
              value={user.password}
              onChange={this.onTextFieldChange}
              type="password"
              placeholder="Password"
              name="password"
            />
          </div>

          <div className="form-actions">
            <button type="button">Create an account</button>
            <button className="primary" type="submit">
              Sign in
            </button>
          </div>
        </form>
      </div>
    );
  }
}

export default UserForm;
