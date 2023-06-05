import { Database } from 'st.db';
import { Database as ReplitDB } from "quick.replit";
import inquirer from "inquirer";
import startBot from "./bot.js";
import { Interval } from 'quickinterval';
import { createRouletteGifImage, shuffleArray, getRandomDarkHexCode, createRouletteImage, getRandomNumber } from "roulette-image";
import { InteractionCollector } from 'eris-collects';
const is_replit = process.env.REPL_ID && process.env.REPL_SLUG && process.env.REPL_OWNER;
const shuruhatik = `█▀ █░█ █░█ █▀█ █░█ █░█ ▄▀█ ▀█▀ █ █▄▀\n▄█ █▀█ █▄█ █▀▄ █▄█ █▀█ █▀█ ░█░ █ █░█`
const config = is_replit ? new ReplitDB() : new Database("./config.yml");
const settings = is_replit ? new Database("./config.yml") : config;

function disabledMultipleButtons(mm, specific_custom_id, username, is_leave = false) {
  mm.components.forEach(async (a, i) => {
    a.components.forEach(async (b, e) => {
      if (specific_custom_id && mm.components[i].components[e].custom_id.includes(specific_custom_id)) {
        mm.components[i].components[e].disabled = is_leave ? false : true
        if (username) mm.components[i].components[e].label = is_leave ? `${+mm.components[i].components[e].custom_id.split("_")[1] + 1}` : username;
      } else if (!specific_custom_id) {
        mm.components[i].components[e].disabled = true
      }
      if (e + 1 == a.components.length && mm.components.length == i + 1) {
        return mm.components
      }
    })
  })
}

function getMultipleButtons(all_buttons) {
  let components = [];
  for (let i = 0; i < all_buttons.length; i += 5) {
    let component = { components: [], type: 1 }
    for (let btn of all_buttons.slice(i, i + 5)) {
      component.components.push(btn);
    }
    components.push(component);
  }
  return components;
}

async function startRoundRoulette(bot, interaction, roulette_games, id, round = 1) {
  if (!roulette_games.has(interaction.guildID)) return await interaction.channel.createMessage(":x: | تم إيقاف الجولة بواسطة المسؤولين");
  let roulette_data = roulette_games.get(interaction.guildID)
  let players = shuffleArray(roulette_data.players.sort((a, b) => a.number - b.number, 0));
  let winner = players[players.length - 1];
  let bufferRouletteImage = await createRouletteGifImage(players)
  await interaction.channel.createMessage(`**${winner.number + 1}** - <@${winner.id}>${players.length <= 2 ? `\n:crown: **هذه الجولة الأخيرة ! اللاعب المختار هو اللاعب الفائز في اللعبة.**` : ""}`, {
    file: bufferRouletteImage,
    name: 'roulette.gif'
  });
  if (players.length <= 2) {
    await interaction.channel.createMessage(`:crown: - فاز <@!${winner.id}> في اللعبة`);
    roulette_games.delete(interaction.guildID);
  } else {
    const game_msg = await interaction.channel.createMessage({
      content: `<@${winner.id}> لديك **30 ثانية** لإختيار لاعب لطرده`, components: getMultipleButtons([
        ...players.slice(0, -1).slice(0, 24).map((player) => ({
          type: 2,
          style: 2,
          label: `${player.number + 1}. ${player.username}`,
          custom_id: `kick_${player.number}_groulette_${interaction.guildID}_${id}`
        })),
        {
          type: 2,
          style: 4,
          label: "انسحاب",
          custom_id: `withdraw_groulette_${interaction.guildID}_${id}`
        }
      ])
    });
    const collecter_buttons = new InteractionCollector(bot, { channel: interaction.channel, time: 30000, filter: i => i.data && i.data.custom_id && i.data.custom_id.endsWith(`groulette_${interaction.guildID}_${id}`) && i.type != 2 })
    collecter_buttons.on('collect', async i => {
      if (winner.id !== i.member.id) return await i.createMessage({ flags: 64, content: `:x: | فقط الشخص الذي لديه الدور يمكنه الاختيار` })
      await i.deferUpdate();
      if (!roulette_games.has(interaction.guildID)) return collecter_buttons.stop("stop");
      collecter_buttons.stop(i.data.custom_id);
    })
    collecter_buttons.on("end", async (interactions, r) => {
      if (!roulette_games.has(interaction.guildID)) {
        await interaction.channel.createMessage(":x: | تم إيقاف الجولة بواسطة المسؤولين");
        interaction.channel.getMessage(game_msg.id).then(async mm => {
          if (mm.components[0] && !mm.components[0].components[0].disabled) {
            await disabledMultipleButtons(mm)
            await mm.edit({ components: mm.components }).catch(() => { });
          }
        }).catch(console.error);
      } else {
        let data = r.split("_")
        if (r.startsWith("kick")) {
          let number = +data[1];
          let player = roulette_data.players.find(player => player.number == number);
          interaction.channel.getMessage(game_msg.id).then(async mm => {
            if (mm.components[0] && !mm.components[0].components[0].disabled) {
              await disabledMultipleButtons(mm)
              await mm.edit({ components: mm.components }).catch(() => { });
              interaction.channel.createMessage(`💣 | تم طرد <@${player.id}> من اللعبة ، سيتم بدء الجولة القادمة في بضع ثواني...`);
              roulette_data.players = roulette_data.players.filter(x => x.number != number);
              roulette_games.set(interaction.guildID, roulette_data);
              await startRoundRoulette(bot, interaction, roulette_games, id, round + 1);
            }
          })
        } else if (r.startsWith("withdraw")) {
          interaction.channel.getMessage(game_msg.id).then(async mm => {
            if (mm.components[0] && !mm.components[0].components[0].disabled) {
              await disabledMultipleButtons(mm)
              await mm.edit({ components: mm.components }).catch(() => { });
              interaction.channel.createMessage(`💣 | لقد انسحب <@${winner.id}> من اللعبة ، سيتم بدء الجولة القادمة في بضع ثواني...`);
              roulette_data.players = roulette_data.players.filter(x => x.id != winner.id);
              roulette_games.set(interaction.guildID, roulette_data);
              await startRoundRoulette(bot, interaction, roulette_games, id, round + 1);
            }
          })
        } else if (r == "time") {
          interaction.channel.getMessage(game_msg.id).then(async mm => {
            if (mm.components[0] && !mm.components[0].components[0].disabled) {
              await disabledMultipleButtons(mm)
              await mm.edit({ components: mm.components }).catch(() => { });
              interaction.channel.createMessage(`💣 | تم طرد <@${winner.id}> من اللعبة لعدم تفاعله ، سيتم بدء الجولة القادمة في بضع ثواني...`);
              roulette_data.players = roulette_data.players.filter(x => x.id != winner.id);
              roulette_games.set(interaction.guildID, roulette_data);
              await startRoundRoulette(bot, interaction, roulette_games, id, round + 1);
            }
          }).catch(console.error);
        }
      }
    })
  }
};

async function runAction(auto_run) {
  console.clear()
  if (await settings.has("reset") && await config.has("token")) {
    if (auto_run) return await startBot(await settings.get("debug") || false, config);
    const { action } = await inquirer.prompt({
      name: "action",
      type: 'list',
      message: `What is the action you want to do?`,
      choices: [
        { name: "Run the bot", value: 0 }, { name: "Run the bot with debug mode", value: 1 }, { name: "Re-setup to put a new token and information", value: 2 }
      ]
    })

    if (action == 0) {
      await settings.set("debug", action);
      return await startBot(false, config);
    } else if (action == 1) {
      await settings.set("debug", action);
      return await startBot(true, config);
    };
  } else {
    console.log(`\nDeveloped By \u001b[32;1mShuruhatik#2443\u001b[0m `)
    await config.delete(`token`);
    const { waiting_time, token_bot, status_type, status_bot } = await inquirer.prompt([
      {
        name: "token_bot",
        mask: "#",
        type: 'password',
        prefix: "\u001b[32;1m1-\u001b[0m",
        message: `Put your Bot token :`,
        mask: "*"
      }, {
        name: "status_bot",
        type: 'input',
        prefix: "\u001b[32;1m2-\u001b[0m",
        message: `Type in the status of the bot you want :`
      }, {
        name: "status_type",
        type: 'rawlist',
        prefix: "\u001b[32;1m3-\u001b[0m",
        message: `Choose the type of bot status :`,
        choices: [
          { name: "Playing", value: 0 }, { name: "Listening", value: 2 }, { name: "Watching", value: 3 }, { name: "Competing", value: 5 }
        ]
      }, {
        name: "waiting_time",
        type: 'number',
        prefix: "\u001b[32;1m4-\u001b[0m",
        default: 40,
        message: `Wait time until the round starts (in seconds) :`
      }
    ]);
    await config.set(`token`, clearTextPrompt(token_bot));
    await settings.set("status_bot", clearTextPrompt(status_bot, true));
    await settings.set("status_type", status_type);
    await settings.set("waiting_time", waiting_time);
    await settings.set("prefix", "-");
    await settings.set("roulette_command_names", ["roulette", "روليت"]);
    await settings.set("stop_command_names", ["stop", "توقف"]);
    await settings.set("reset", "احذف هذا السطر إذا كنت تريد تحط توكن جديد");
    return await runAction();
  };
};

function sendDM(member, content, file) {
  return new Promise((resolve, reject) => {
    (member.user || member).getDMChannel().then(channel => {
      channel.createMessage(content, file).then(resolve).catch(reject);
    }).catch(reject);
  });
};

function clearTextPrompt(str, status_bot = false) {
  return !status_bot ? str.trim().replaceAll("\\", "").replaceAll(" ", "").replaceAll("~", "") : str.trim().replaceAll("\\", "").replaceAll("~", "")
}

async function startProject() {
  let timeEnd = await settings.has("reset") && await config.has("token") ? 1000 : 5000
  new Interval(async (int) => {
    process.stdout.write('\x1Bc');
    process.stdout.write(`\r\u001b[38;5;${getRandomNumber(230)}m${shuruhatik}\u001b[0m\n\n\u001b[1mﻲﺒﻨﻟﺍ ﻰﻠﻋ ةﻼﺻﻭ رﺎﻔﻐﺘﺳﻻﺍ ﺮﺜﻛﻭ ،ﻪﻠﻟﺍ ﺮﻛﺫ َﺲﻨﺗ ﻻ\u001b[0m`);
    if (int.elapsedTime >= timeEnd) {
      int.pause();
      await runAction(true);
    }
  }, 100).start();
}

export { startProject, shuruhatik, sendDM, startRoundRoulette, disabledMultipleButtons, createRouletteImage, getMultipleButtons }