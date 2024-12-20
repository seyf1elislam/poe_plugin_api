const { delay } = require("./utils");

//?===========================================
//?===========================================
function wrap_textchunk_in_openai_jsonformat(bot, content) {
  return JSON.stringify({
    id: `chatcmpl-${Date.now()}`,
    object: "chat.completions.chunk", // object: "chat.completions",
    created: Math.floor(Date.now() / 1000),
    model: bot,
    choices: [
      {
        index: 0,
        finish_reason: null,
        message: { role: "assistant", content: content },
        delta: { role: "assistant", content: content },
      },
    ],
  });
}
//?===========================================
//?===========================================
//?===========================================
//for long messages , takes a list of messages and send them one by one

async function send_messages_list(client, prompt_list) {
  await delay(50);
  for (let i = 0; i < prompt_list.length - 1; i++) {
    //?send messsage
    console.log("sending msg part-----");
    await client.sendMessage(prompt_list[i]);
    await delay(1000);
    await client.abortMessage();
    await delay(100);
    await client.deleteMessages(1);
    console.log("aborted-----");
  }
  //?send last message
  await client.sendMessage(prompt_list[prompt_list.length - 1]);
  await delay(50);
  console.log("sending last msg part-----");
}
//?===========================================
//?===========================================
//?===========================================
//? handler for sending messages

async function sendMessageHandler(client, prompt) {
  console.log("prompt.length ", prompt.length);
  if (prompt.length > 9000) {
    //if the prompt longer than 9700 then break down the prompt into list of strings, each one with length 700
    let prompt_list = [];
    for (let i = 0; i < prompt.length; i += 7000) {
      prompt_list.push(prompt.substring(i, i + 7000));
    }
    console.log("prompt_list.length ", prompt_list.length);

    await send_messages_list(client, prompt_list);
  } else {
    await client.sendMessage(prompt);
  }
}
//?===========================================
//?===========================================
async function sendMessageHandlerWord(client, prompt, max_word_length = 1500) {
  var words = prompt.split(" ");
  console.log("prompt.length ", prompt.length);
  console.log("word.length ", words.length);
  //?if the prompt longer then max_word_length then break down the prompt into list of strings , each one with length 700
  if (words.length >= max_word_length) {
    let prompt_list = [];

    for (let i = 0; i < words.length; i += max_word_length) {
      prompt_list.push(
        words
          .slice(
            Math.max(0, i - 2),
            Math.min(i + max_word_length, words.length)
          )
          .join(" ")
      );
    }
    console.log("prompt_list.length ", prompt_list.length);

    await send_messages_list(client, prompt_list);
  } else {
    await client.sendMessage(prompt);
  }
}
function get_prompt_from_dict_meessages_list(dict_messages_list) {
  const string_messages_list = dict_messages_list.map((msg) => {
    const role = msg.role || "assistant";
    const role_name = msg.role_name || "";

    if (role_name.length === 0) {
      return `### ${role}:  \n ${msg.content}`;
    } else {
      return `### ${role}:  \n ${role_name} : ${msg.content}`;
    }
  });

  const prompt = string_messages_list.join("\n\n");
  return prompt;
}


module.exports = {
  wrap_textchunk_in_openai_jsonformat,
  sendMessageHandler,
  sendMessageHandlerWord,
  get_prompt_from_dict_meessages_list,
};