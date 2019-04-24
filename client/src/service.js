import axios from "axios";

const apiURL = "http://localhost:5000";

export default class Service {
  get() {}

  post(
    endpoint = "",
    data = {},
    options = { headers: { "Content-Type": "application/json" } }
  ) {
    const url = `${endpoint}`;
    console.log("hwllo", url);
    return axios.post(url, data, options);
  }
}
