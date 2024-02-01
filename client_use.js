const PoeClient = require("./poe-client");
const {
  delay,
  get_header_token,
  create_poe_config_file_ifnotexist,
  get_config,
  // getPoeClient,
  cach_config,
  config,
  empty_token_placeholder,
} = require("./utils");
const {
  wrap_textchunk_in_openai_jsonformat,
  sendMessageHandlerWord,
  get_prompt_from_dict_meessages_list,
} = require("./messages_utils");

//?=================================================================
let botNames = [];
const poeClientCache = {};
//?=================================================================
//?=================================================================
//?=================================================================

async function getPoeClient(token, useCache = false) {
  let client;
  if (useCache && poeClientCache[token]) {
    client = poeClientCache[token];
  } else {
    if (poeClientCache[token]) {
      await poeClientCache[token]?.closeDriver();
    }
    let successfulltInitialized = false;
    for (let triesLeft = 5; triesLeft > 0; triesLeft--) {
      client = new PoeClient(token, config.cached_bot);
      successfulltInitialized = await client.initializeDriver();
      if (!successfulltInitialized) {
        await client.closeDriver();
        continue;
      }
      break;
    }
    if (!successfulltInitialized) {
      console.log(
        "ERROR: failed to connect after 5 tries! Please double-check that your cookie is correct, or try another cookie!"
      );
      throw new Error(
        "Poe failed to initialize. Please check the terminal for additional info!"
      );
    }
  }

  poeClientCache[token] = client;
  return client;
}
//?=====================================
// try {
//   init_withchashed_token();
// } catch (e) {
//   console.log("error in init_withchashed_token ", e);
// }

async function init_withchashed_token() {
  if (config.token === empty_token_placeholder) {
    console.log("please make sure to write the token in peo_config.conf");
    return;
  } else {
    const client = await getPoeClient(config.token, false);
    botNames = await client.getBotNames();
  }
}
//?==========================================
/**
 * @param {import("express").Express} app
 * @param {any} jsonParser
 */
// app.get("/testing", (req, res) => {
//   res.send("test response");
// });
function testing_handler(req, res) {
  res.send("test response");
}

function registerEndpoints(app, jsonParser) {
  app.get("/testing", testing_handler);
  // app.get("/v1/models", jsonParser, handleModelsRequest);
  // app.post("/v1/chat/completions", jsonParser, handleCompletionsRequest);

  //!================================================================
  //!================================================================
  //!================================================================
  //!================================================================

  app.get("/v1/models", jsonParser, async (request, response) => {
    console.log(" models Called ------------------");
    const header_token = get_header_token(request);

    if (
      (!config.token || config.token === empty_token_placeholder) &&
      header_token.length == 0
    ) {
      return response.sendStatus(401);
    } else if (config.token === empty_token_placeholder) {
      config.token = header_token;
      cach_config(config);
    }

    try {
      let client;
      try {
        client = await getPoeClient(config.token, true);
      } catch (e) {
        client = await getPoeClient(config.token, false);
      }

      botNames = await client.getBotNames();
      const data = [];
      botNames.map(function (element) {
        data.push({
          id: element,
          object: "model",
          created: 1669599635,
          owned_by: "POEPlugine-internal",
          permission: [
            {
              id: "modelperm-jepinXYt59ncUQrjQEIUEDyC",
              object: "model_permission",
              created: 1688551385,
              allow_create_engine: false,
              allow_sampling: true,
              allow_logprobs: true,
              allow_search_indices: false,
              allow_view: true,
              allow_fine_tuning: false,
              organization: "*",
              group: null,
              is_blocking: false,
            },
          ],
          root: element,
          parent: null,
        });
        return null;
      });
      console.log("Poe is Connected! ---------------");
      response.json({ object: "list", data });
    } catch (err) {
      console.error(err);

      return response.sendStatus(401);
    }
  });
  //?================================================================
  //?================================================================
  //?================================================================
  //?================================================================
  //?================================================================
  //?================================================================
  app.post("/v1/chat/completions", jsonParser, async (request, response) => {
    console.log(" compeletion Called ------------------");

    // if (!request.body.messages) {
    //   return response.sendStatus(400);
    // }

    if (!config.token || config.token == empty_token_placeholder) {
      return response.sendStatus(401);
    }

    const dict_messages_list = request.body.messages || [];
    const prompt = get_prompt_from_dict_meessages_list(dict_messages_list);

    let isGenerationStopped = false;
    const abortController = new AbortController();

    request.socket.removeAllListeners("close");
    request.socket.on("close", function () {
      isGenerationStopped = true;
      console.log("socket closed ------------------");
      // request.socket.end("");
      // response.end("response----");
      if (client) {
        abortController.abort();
      }
    });
    //?===========================================
    //?===========================================
    let bot = request.body.model;
    const streaming = request.body.stream ?? false;
    let client;
    //uncomment it later
    // if (!botNames.includes(bot)) {
    //   bot = config.cached_bot;
    // }
    try {
      try {
        client = await getPoeClient(config.token, true);
      } catch (e) {
        client = await getPoeClient(config.token, false);
      }
    } catch (error) {
      console.error(error);
      return response.sendStatus(500);
    }
    //?===========================================
    //?===========================================
    if (bot !== client.botName) {
      await client.changeBot(bot);
    }
    await delay(100);
    //?===========================================
    //?===========================================
    //? sentm message
    // await client.sendMessage(prompt);
    // await sendMessageHandler(client, prompt);

    try {
      await sendMessageHandlerWord(
        client,
        prompt,
        config.max_word_length_per_message
      ); //? send message word by word
    } catch (error) {
      poeClientCache = {};
      return response.sendStatus(500);
    }
    //?===========================================
    //?===========================================
    await delay(100);
    if (streaming) {
      try {
        let reply = "";
        while (!isGenerationStopped) {
          if (response.headersSent === false) {
            response.writeHead(200, {
              // "Content-Type": "text/plain;charset=utf-8",
              // "Content-Type": "application/json;charset=utf-8",
              "Content-Type": "text/event-stream; charset=utf-8",
              "Transfer-Encoding": "chunked",
              // "Cache-Control": "no-transform",
              Connection: "keep-alive",
              "Cache-Control": "no-cache",
              //"X-Message-Id": String(mes.messageId),
            });
          }
          await delay(50);

          if (isGenerationStopped) {
            console.error(
              "Streaming stopped by user. Aborting the message and resetting to jailbroken state..."
            );
            await client.abortMessage();
            await client.deleteMessages(2);
            break;
          }

          let newReply = await client.getLatestMessageStreaming();

          if (newReply === "..." || newReply.length < 10) {
            await delay(100);
            continue;
          }

          let newText = newReply.substring(reply.length);

          reply = newReply;

          let json = wrap_textchunk_in_openai_jsonformat(bot, newText);
          // response.write(json + "\n\n", "utf-8");
          response.write(`data: ${json}\n\n`, "utf-8");
          // reply = {   choices: [{ message: { content: reply.replace(/_/g, "*") } }] };
          console.log("sent chunk ------------------>");

          isGenerationStopped = !(await client.isGenerating(true));
        }
        //!===========================================
        //!===========================================
      } catch (err) {
        console.error(err);
      } finally {
        response.end();
      }
    } else {
      //?====================================================================
      //? non streaming mode =================================================
      try {
        let reply;
        await delay(100);

        let waitingForMessage = true;

        console.log("Waiting for message...");

        let startTime = Date.now();
        while (waitingForMessage) {
          await delay(400);
          let stillGenerating = await client.isGenerating();
          console.log(`Still generating is: ${stillGenerating}`);
          console.log(`Waiting for message is: ${waitingForMessage}`);
          if (!stillGenerating) {
            waitingForMessage = false;
          }
          let milliSecondsElapsed = Math.floor(Date.now() - startTime);
          if (milliSecondsElapsed > 120000) {
            // Currently only informative, should get properly handled in the future

            console.error(
              "!!!!!!!!!!!!!!!!!!!ERROR: message timeout. Message is taking longer than 2 minutes to get generated!!!!!!!!!!!!!!!!!!!"
            );
            return response.send(
              "Message timeout after more than 2 minutes. Please try regenerating the message."
            );
          }
        }

        reply = await client.getLatestMessage();
        await delay(200);
        // Wrap it back to OAI format
        reply = {
          choices: [{ message: { content: reply.replace(/_/g, "*") } }],
        };
        // await client.clearContext();

        response.send(reply);
      } catch {
        return response.sendStatus(500);
      }
      // let checkNumberOfMessages = await client.checkNumberOfMessages();
      // console.log("checkNumberOfMessages-----", checkNumberOfMessages);
      // await client.clearContext();
    }
  });
}

//?===========================================
//?===========================================
//?===========================================

module.exports = {
  registerEndpoints,
};
