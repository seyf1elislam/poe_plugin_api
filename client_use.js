const fs = require("fs");
const PoeClient = require("./poe-client");

//!Cashing LoadToken============================================
// poe_config_file_path="./plugins/poe_plugin/poe_config.json";
poe_config_file_path = __dirname + "/poe_config.json";
empty_token_placeholder ="Write your token here"
if (!fs.existsSync(poe_config_file_path)) {
    fs.writeFileSync(
        poe_config_file_path,
        JSON.stringify(
            { token: empty_token_placeholder, cashed_bot: "gptforst" },
            null,
            4
        )
    );
}

// console.log("dir name ", __dirname);
// console.log("conf path  ", poe_config_file_path);

const config = JSON.parse(fs.readFileSync(poe_config_file_path));
const { token, cashed_bot } = config;
// console.log("--------token is ", token);
// console.log("--------conf is ", config);

if (token ==empty_token_placeholder){
    console.log("please make sure to write the token in peo_config.conf")
}
//!===============================================================
async function delay(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * @param {import("express").Express} app
 * @param {any} jsonParser
 */

function registerEndpoints(app, jsonParser) {
    const POE_DEFAULT_BOT = cashed_bot || "gptforst";

    const poeClientCache = {};

    let botNames = [];

    app.get("/testing", (req, res) => {
        res.send("test response");
    });
    //!================================================================
    //!================================================================
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
                client = new PoeClient(token, POE_DEFAULT_BOT);
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

    // app.post("/purge_poe", jsonParser, async (request, response) => {
    async function purge_poe() {
        // const bot = request.body.bot ?? POE_DEFAULT_BOT;
        // const count = request.body.count ?? -1;
        // console.log(`!!!!!!!!!!!! NEED TO PURGE ${count} MESSAGES!`);
        console.log("purge poe called !");
        try {
            const client = await getPoeClient(token, true);
            await client.clearContext();

            // // Temporary fix for stuck after bot change
            // if (count > 0) {
            //     let checkNumberOfMessages =
            //         await client.checkNumberOfMessages();
            //     if (checkNumberOfMessages > 2) {
            //         await client.deleteMessages(count);
            //     } else {
            //         await client.clearContext();
            //     }
            // } else {
            //     await client.clearContext();
            // }
            // // client.disconnect_ws();

            // return response.send({ ok: true });
        } catch (err) {
            console.error(err);
            // return response.sendStatus(500);
        }
    }

    //!================================================================
    app.get("/v1/models", jsonParser, async (request, response) => {
        console.log(" models Called ------------------");

        if (!token) {
            return response.sendStatus(401);
        }

        try {
            const client = await getPoeClient(token, false);
            botNames = await client.getBotNames();
            //client.disconnect_ws();
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

    app.post("/v1/chat/completions", jsonParser, async (request, response) => {
        console.log(" compeletion Called ------------------");
        //? if (!request.body.prompt) { return response.sendStatus(400);}
        if (!token) {
            return response.sendStatus(401);
        }

        const dict_messages_list = request.body.messages;
        string_messages_list = dict_messages_list.map(function (msg) {
            role = msg.role;
            role_name = msg.name || "";
            content = msg.content;
            if (role_name.length === 0) return `### ${role}:  \n ${content}`;
            else return `### ${role}:  \n ${role_name} : ${content}`;
        });
        prompt = string_messages_list.join("\n\n");
        // return response.sendStatus(401);

        let isGenerationStopped = false;
        const abortController = new AbortController();

        request.socket.removeAllListeners("close");
        request.socket.on("close", function () {
            isGenerationStopped = true;

            if (client) {
                abortController.abort();
            }
        });

        // const bot = request.body.model ?? POE_DEFAULT_BOT;
        const bot = request.body.model;
        if (!botNames.includes(bot)) {
            bot = POE_DEFAULT_BOT;
        }
        const streaming = request.body.stream ?? false;
        let client;
        try {
            client = await getPoeClient(token, true);
        } catch (error) {
            console.error(error);
            return response.sendStatus(500);
        }
        if (bot !== client.botName) {
            await client.changeBot(bot);
        }
        await delay(80);

        if (streaming) {
            await delay(300);
            try {
                // if (
                //   botNames[parseInt(bot)] !== client.botName &&
                //   botNames[parseInt(bot)] !== undefined
                // ) {
                //   await client.changeBot(botNames[parseInt(bot)]);
                // }

                await client.sendMessage(prompt);
                // necessary due to double jb issues
                await delay(80);
                let reply = "";
                while (!isGenerationStopped) {
                    if (response.headersSent === false) {
                        response.writeHead(200, {
                            "Content-Type": "text/plain;charset=utf-8",
                            "Transfer-Encoding": "chunked",
                            "Cache-Control": "no-transform",
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

                    // Just a failsafe due to bot's cut-off name being registered as actual text.
                    if (newReply === "..." || newReply.length < 20) {
                        await delay(100);
                        continue;
                    }

                    let newText = newReply.substring(reply.length);

                    reply = newReply;
                    response.write(newText);
                    isGenerationStopped = !(await client.isGenerating(true));
                }
                console.log(reply);
            } catch (err) {
                console.error(err);
            } finally {
                //client.disconnect_ws();
                response.end();
            }
        } else {
            try {
                let reply;

                /*for await (const mes of client.send_message(bot, prompt, false, 60, abortController.signal)) {
                reply = mes.text;
                messageId = mes.messageId;
            }*/
                await client.sendMessage(prompt);
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
                    let milliSecondsElapsed = Math.floor(
                        Date.now() - startTime
                    );
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

                // console.log(reply);

                await delay(200);

                // Temporary fix due to issues during parsing json on client side
                // return response.send(reply);

                // Wrap it back to OAI format
                reply = {
                    choices: [
                        { message: { content: reply.replace(/_/g, "*") } },
                    ],
                };
                purge_poe();
                return response.send(reply);
            } catch {
                //client.disconnect_ws();
                return response.sendStatus(500);
            }
        }
    });
}

module.exports = {
    registerEndpoints,
};
