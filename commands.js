import { InteractionCollector } from 'eris-collects';
import { getRandomDarkHexCode, getRandomNumber } from "roulette-image";
import { startRoundRoulette, disabledMultipleButtons, getMultipleButtons } from "./functions.js"
const roulette_games = new Map();

export default async function (bot, interaction, type = "slash", settings) {
  let command_names = await settings.has("command_names") ? await settings.get("command_names") : ["roulette", "روليت"]
  if (interaction.type == 2 && command_names.map(e => e.toLowerCase()).includes(interaction.data.name.toLowerCase())) {
    if (!interaction.member.permissions.has("manageEvents")) return await interaction.createMessage({
      "flags": 64,
      "content": ":x: | فقط Manga Events يمكنهم قيام بهذا الامر ",
    })
    if (roulette_games.has(interaction.guildID)) return await interaction.createMessage({
      "flags": 64,
      "content": ":x: | يوجد جولة تعمل الان بالفعل"
    })
    const waiting_time = await settings.has("waiting_time") ? await settings.get("waiting_time") : 60
    const id = Date.now();
    await interaction.createMessage({
      components: getMultipleButtons(Array(25).fill().map((x, i) => ({
        type: 2,
        style: 2,
        label: `${i + 1}`,
        custom_id: `join_${i}_roulette_${interaction.guildID}_${id}`
      }))),
      embeds: [{
        title: "روليت",
        color: 0xe4f000,
        description: `__**اللاعبين:**__\nلا يوجد لاعبين مشاركين باللعبة`,
        fields: [{
          name: "__طريقة اللاعب:__",
          value: `**1-** انضم في اللعبة
            **2-** ستبدأ الجولة الأولى وسيتم تدوير العجلة واختيار لاعب عشوائي
            **3-** إذا كنت اللاعب المختار ، فستختار لاعبًا من اختيارك ليتم طرده من اللعبة
            **4-** يُطرد اللاعب وتبدأ جولة جديدة ، عندما يُطرد جميع اللاعبين ويتبقى لاعبان فقط ، ستدور العجلة ويكون اللاعب المختار هو الفائز باللعبة`
        }, {
          name: `__ستبدأ اللعبة خلال__:`,
          value: `**<t:${Math.floor((Date.now() + (waiting_time * 1000)) / 1000)}:R>**`
        }]
      }]
    });
    let mm_2 = await interaction.channel.createMessage({
      components: getMultipleButtons([
        ...Array(15).fill().map((x, i) => ({
          type: 2,
          style: 2,
          label: `${i + 26}`,
          custom_id: `join_${i + 25}_roulette_${interaction.guildID}_${id}`
        })),
        {
          type: 2,
          style: 3,
          label: "دخول عشوائي",
          custom_id: `join_random_roulette_${interaction.guildID}_${id}`
        }, {
          type: 2,
          style: 4,
          label: "اخرج من اللعبة",
          custom_id: `leave_roulette_${interaction.guildID}_${id}`
        }
      ])
    })
    roulette_games.set(interaction.guildID, { id, players: [] })
    const m = await interaction.getOriginalMessage();
    const collecter_buttons = new InteractionCollector(bot, { channel: interaction.channel, time: waiting_time * 1000, filter: i => i.type != 2 && i.data && i.data.custom_id && i.data.custom_id.endsWith(`roulette_${i.guildID}_${id}`) })
    collecter_buttons.on('collect', async i => {
      let data = i.data.custom_id.split("_")

      if (!i.data.custom_id.endsWith(`roulette_${interaction.guildID}_${id}`)) return;
      if (data[0] == "leave") {
        await i.deferUpdate();
        let roulette_data = roulette_games.get(i.guildID)
        if (!roulette_data.players[0]) return await i.createMessage({ flags: 64, content: `:x: | انت غير مشارك بالفعل` });
        let player = roulette_data.players.find(player => player.id == i.member.id)
        if (roulette_data.players[0] && !player) return await i.createMessage({ flags: 64, content: `:x: | انت غير مشارك بالفعل` });

        roulette_data.players = roulette_data.players.filter(x => x.id != i.member.id);
        roulette_games.set(i.guildID, roulette_data)
        await i.createMessage({ flags: 64, content: `✅ | تم إزالتك من اللعبة` });
        data[0] = "join_" + player.number
        await disabledMultipleButtons(i.message, `${data.join("_")}`, `${i.member.username}`, true);
        m.embeds[0].description = `__**اللاعبين:**__\n${roulette_data.players[0] ? `${roulette_data.players.sort((a, b) => a.number - b.number, 0).map(player => `\`${`${player.number + 1}`.length == 1 ? "0" : ""}${player.number + 1}\`: <@!${player.id}>`).join("\n")}` : "لا يوجد لاعبين مشاركين باللعبة"}`
        await disabledMultipleButtons(m, `${data.join("_")}`, `${i.member.username}`, true);
        await disabledMultipleButtons(mm_2, `${data.join("_")}`, `${i.member.username}`, true);
        await m.edit({ embeds: m.embeds, components: m.components }).catch(() => { });
        await mm_2.edit({ components: mm_2.components }).catch(() => { });
      } else if (data[0] == "join") {
        let roulette_data = roulette_games.get(i.guildID)
        if (roulette_data.players.length >= 40) return await i.createMessage({ flags: 64, content: "عدد المشاركين مكتمل" })
        if (roulette_data.players[0] && roulette_data.players.some(player => player.id == i.member.id)) {
          await i.deferUpdate();
          let player = roulette_data.players.find(player => player.id == i.member.id)
          roulette_data.players = roulette_data.players.filter(x => x.id != i.member.id);
          data[0] = "join_" + player.number
          await disabledMultipleButtons(i.message, `${[data[0], ...data.slice(2)].join("_")}`, `${i.member.username}`, true);
          m.embeds[0].description = `__**اللاعبين:**__\n${roulette_data.players[0] ? `${roulette_data.players.sort((a, b) => a.number - b.number, 0).map(player => `\`${`${player.number + 1}`.length == 1 ? "0" : ""}${player.number + 1}\`: <@!${player.id}>`).join("\n")}` : "لا يوجد لاعبين مشاركين باللعبة"}`
          await disabledMultipleButtons(m, `${[data[0], ...data.slice(2)].join("_")}`, `${i.member.username}`, true);
          await disabledMultipleButtons(mm_2, `${[data[0], ...data.slice(2)].join("_")}`, `${i.member.username}`, true);
          await m.edit({ embeds: m.embeds, components: m.components }).catch(() => { });
          await mm_2.edit({ components: mm_2.components }).catch(() => { });
          let number = +data[1];
          roulette_data.players.push({
            username: i.member.username,
            id: i.member.id,
            avatarURL: i.member.staticAvatarURL.replace("size=128", "size=512") || i.member.defaultAvatarURL,
            number,
            color: getRandomDarkHexCode()
          })
          roulette_games.set(i.guildID, roulette_data)
          m.embeds[0].description = `__**اللاعبين:**__\n${roulette_data.players[0] ? `${roulette_data.players.sort((a, b) => a.number - b.number, 0).map(player => `\`${`${player.number + 1}`.length == 1 ? "0" : ""}${player.number + 1}\`: <@!${player.id}>`).join("\n")}` : "لا يوجد لاعبين مشاركين باللعبة"}`
          await i.message.edit({ components: i.message.components }).catch(() => { });
          await disabledMultipleButtons(m, i.data.custom_id, `${number + 1}. ${i.member.username}`);
          await disabledMultipleButtons(mm_2, i.data.custom_id, `${number + 1}. ${i.member.username}`);

          await m.edit({ embeds: m.embeds, components: m.components }).catch(() => { });
          await mm_2.edit({ components: mm_2.components }).catch(() => { });
        } else {
          await i.deferUpdate();
          if (data[1] == "random") {
            let number = await getRandomNumber(40, roulette_data.players.map(e => e.number));
            roulette_data.players.push({
              username: i.member.username,
              id: i.member.id,
              avatarURL: i.member.staticAvatarURL.replace("size=128", "size=512") || i.member.defaultAvatarURL,
              number,
              color: getRandomDarkHexCode()
            })
            roulette_games.set(i.guildID, roulette_data)
            data[1] = number;
            m.embeds[0].description = `__**اللاعبين:**__\n${roulette_data.players[0] ? `${roulette_data.players.sort((a, b) => a.number - b.number, 0).map(player => `\`${`${player.number + 1}`.length == 1 ? "0" : ""}${player.number + 1}\`: <@!${player.id}>`).join("\n")}` : "لا يوجد لاعبين مشاركين باللعبة"}`
            await i.message.edit({ components: i.message.components }).catch(() => { });
            await disabledMultipleButtons(m, `${data.join("_")}`, `${number + 1}. ${i.member.username}`);
            await disabledMultipleButtons(mm_2, `${data.join("_")}`, `${number + 1}. ${i.member.username}`);

            await m.edit({ embeds: m.embeds, components: m.components }).catch(() => { });
            await mm_2.edit({ components: mm_2.components }).catch(() => { });
          } else {
            let number = +data[1];
            roulette_data.players.push({
              username: i.member.username,
              id: i.member.id,
              avatarURL: i.member.staticAvatarURL.replace("size=128", "size=512") || i.member.defaultAvatarURL,
              number,
              color: getRandomDarkHexCode()
            })
            roulette_games.set(i.guildID, roulette_data)
            m.embeds[0].description = `__**اللاعبين:**__\n${roulette_data.players[0] ? `${roulette_data.players.sort((a, b) => a.number - b.number, 0).map(player => `\`${`${player.number + 1}`.length == 1 ? "0" : ""}${player.number + 1}\`: <@!${player.id}>`).join("\n")}` : "لا يوجد لاعبين مشاركين باللعبة"}`
            await i.message.edit({ components: i.message.components }).catch(() => { });
            await disabledMultipleButtons(m, i.data.custom_id, `${number + 1}. ${i.member.username}`);
            await disabledMultipleButtons(mm_2, i.data.custom_id, `${number + 1}. ${i.member.username}`);

            await m.edit({ embeds: m.embeds, components: m.components }).catch(() => { });
            await mm_2.edit({ components: mm_2.components }).catch(() => { });
          }
        }
      }
    });
    collecter_buttons.on("end", async (interactions, r) => {
      interaction.channel.getMessage(m.id).then(async mm => {
        if (mm.components[0] && mm.components[0].components[0]) {
          await disabledMultipleButtons(mm)
          mm.embeds[0].color = 0x0ff000
          mm.embeds[0].fields = [mm.embeds[0].fields[0]]
          await mm.edit({ embeds: mm.embeds, components: mm.components }).catch(() => { });
          await disabledMultipleButtons(mm_2)
          await mm_2.edit({ components: mm_2.components }).catch(() => { });
        }
      }).catch(() => { });
      if (roulette_games.has(interaction.guildID) && !roulette_games.get(interaction.guildID).players[1]) {
        interaction.channel.createMessage("🚫 | تم إلغاء اللعبة لعدم وجود 2 لاعبين على الأقل");
        roulette_games.delete(interaction.guildID)
      } else if (roulette_games.has(interaction.guildID)) {
        await interaction.channel.createMessage("✅ | تم توزيع الأرقام على كل لاعب. ستبدأ الجولة الأولى في بضع ثواني...");
        await startRoundRoulette(bot, interaction, roulette_games, id)
      }
    })
  }
}