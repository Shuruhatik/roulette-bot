import Eris from "eris";
import { Database as JsonDatabase } from "st.db";
import { sendDM, shuruhatik } from "./functions.js";
import runCommands from "./commands.js";
import { createSpinner } from 'nanospinner'

export default async function (debug = false, config, is_replit = (process.env.REPL_ID && process.env.REPL_SLUG && process.env.REPL_OWNER)) {
  console.clear();
  const settings = is_replit ? new JsonDatabase("./config.yml") : config;
  const bot = new Eris(await config.get("token"), { rest: { requestTimeout: 60000 }, restMode: true, intents: 130815 });
  const spinner = createSpinner('Run a project made by Shuruhatik', { interval: 50 }).start({ "color": "blue" })

  bot.connect().catch(spinner ? (e) => spinner.error({ text: `The bot did not work and the error is: ${e.message}` }) : console.error);
  let ready_first;
  bot.on("ready", async () => {
    if (spinner) spinner.success({ text: `Logged in as \x1B[1m${bot.user.username}\u001b[0m (\x1B[4m${bot.user.id}\u001b[0m)` });
    bot.editStatus(`online`, [{ name: await settings.get("status_bot") || "Bot By Shuruhatik", type: await settings.get("status_type") || 0 }]);
    if (!ready_first) {
      console.log(`\n\u001b[32;1m` + shuruhatik + `\u001b[0m\u001b[0m\n\n\u001b[1mﻲﺒﻨﻟﺍ ﻰﻠﻋ ةﻼﺻﻭ رﺎﻔﻐﺘﺳﻻﺍ ﺮﺜﻛﻭ ،ﻪﻠﻟﺍ ﺮﻛﺫ َﺲﻨﺗ ﻻ\u001b[0m`);
      console.log(`\n\u001b[32;1m◤\u001b[0m\u001b[0m\u001b[1m https://api.shuruhatik.com/add/${bot.user.id} \u001b[32;1m◢\u001b[0m`);
      ready_first = true;
    }
    let command_names = await settings.has("command_names") ? await settings.get("command_names") : ["roulette", "روليت"]
    bot.requestHandler.request("PUT", `/applications/${bot.application.id}/commands`, true, command_names.map((name) => ({
      name: name.toLowerCase(), type: 1, description: "بدا فعالية لعبة عجلة الحظ", dm_permission: false
    })))
  });
  process.on('uncaughtException', (err, origin) => console.log(err));
  bot.on("error", console.log);
  bot.on("debug", debug ? (message) => console.log("\n\u001b[32m[DEBUG] " + message + "\u001b[0m") : () => { });
  bot.on("messageCreate", async (message) => {
    if (message.author.bot || !message.guildID) return;
    let originalMessage;
    message.createMessage = async (content) => {
      if (content && content.flags) {
        return await sendDM(message.member, content).then(() => {
          message.addReaction("❌");
        }).catch((e) => {
          console.error(e)
          message.addReaction("❌");
        });
      } else {
        if (typeof content == "string") content = { content };
        return await message.channel.createMessage({ ...content, allowedMentions: { repliedUser: false }, messageReferenceID: message.id }).then((m) => originalMessage = m).catch(console.error)
      }
    }
    message.getOriginalMessage = () => originalMessage;
    let args = message.content.toLowerCase().replace(/\s{2,}/g, ' ').trim().split(" ");
    let prefix = await settings.has("prefix") ? await settings.get("prefix") : "-"
    if (args[0].startsWith(prefix.toLowerCase())) {
      if (message.author) message.user = message.author;
      message.data = {};
      message.type = 2;
      message.data.name = args[0].toLowerCase().replaceAll(prefix.toLowerCase(), "");
      await runCommands(bot, message, "message", settings);
    }
  });
  bot.on("interactionCreate", async (interaction) => {
    if (!interaction.guildID) return;
    if (interaction.type == 2) {
      await runCommands(bot, interaction, "slash", settings);
    }
  });
}