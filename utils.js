const fs = require("fs");

//!===================================================
//!===================================================
// console.log("dir name ", __dirname);

poe_config_file_path = __dirname + "/poe_config.json";
empty_token_placeholder = "Write your token here";
DEFAULT_BOT = "GPT-3.5-Turbo";
let config = get_config();
//?===========================================
//?===========================================

async function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function get_header_token(request) {
  auth = request.headers.authorization;
  //
  header_token = (auth || "").replace("Bearer ", "");
  return header_token;
}

function create_poe_config_file_ifnotexist(
  poe_config_file_path,
  empty_token_placeholder
) {
  if (!fs.existsSync(poe_config_file_path)) {
    fs.writeFileSync(
      poe_config_file_path,
      JSON.stringify({
        token: empty_token_placeholder,
        cashed_bot: "GPT-3.5-Turbo",
        max_word_length_per_message: 1500,
      })
    );
  }
}

function get_config() {
  create_poe_config_file_ifnotexist(
    poe_config_file_path,
    empty_token_placeholder
  );
  const config = JSON.parse(fs.readFileSync(poe_config_file_path));
  config.max_word_length_per_message =
    config.max_word_length_per_message || 1500;
  config.cashed_bot = config.cashed_bot || DEFAULT_BOT;

  return config;
}
function cach_config(config) {
  fs.writeFileSync(poe_config_file_path, JSON.stringify(config));
}

//?==========================================
//?==========================================
//?==========================================

module.exports = {
  //?vars==========================================
  poe_config_file_path,
  empty_token_placeholder,
  DEFAULT_BOT,
  // poeClientCache,
  // getPoeClient,
  ///?funcitons ================================
  delay,
  get_header_token,
  create_poe_config_file_ifnotexist,
  get_config,
  cach_config,
  config,
};
