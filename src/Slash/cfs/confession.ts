import type { Slash } from "../../interfaces";
import {
  Collection,
  EmbedBuilder,
  ButtonBuilder,
  ButtonStyle,
  ActionRowBuilder,
  ApplicationCommandType,
  ApplicationCommandOptionType,
  ChannelType,
} from "discord.js";
import { getConfessionCount, pushConfession } from "../../Database";

export const slash: Slash = {
  name: "Meowfession",
  description: "Create meowfession",
  type: ApplicationCommandType.ChatInput,
  options: [
    {
      type: ApplicationCommandOptionType.String,
      name: "confession",
      description: "Confession content",
      required: true,
    },
  ],
  run: async (client, interaction) => {
    if (!interaction.isChatInputCommand()) return;
    const guild = client.guilds.cache.get(process.env.GUILD_ID || "");
    const isInGuild = await guild?.members.fetch(interaction.user.id);
    if (!isInGuild || isInGuild instanceof Collection)
      return interaction.reply("You are not in the server!");

    const confession = interaction.options.getString("confession") || "N/A";

    let cfsCount = (await getConfessionCount()) || 0;
    cfsCount++;

    const embed = new EmbedBuilder()
      .setTitle(`Meowfession #${cfsCount}`)
      .setDescription(confession)
      .setColor("Aqua")
      .setTimestamp()
      .setFooter({
        text: "Press the buttons below to Accept/Reject the meowfession!",
      });

    const button1 = new ButtonBuilder()
      .setCustomId("accept")
      .setEmoji("😻")
      .setLabel("Accept cfs")
      .setStyle(ButtonStyle.Success);

    const button2 = new ButtonBuilder()
      .setCustomId("reject")
      .setEmoji("😿")
      .setLabel("Reject cfs")
      .setStyle(ButtonStyle.Secondary);

    const actionRow = new ActionRowBuilder<ButtonBuilder>().addComponents([
      button1,
      button2,
    ]);

    const reviewChannel = guild?.channels.cache.get(
      process.env.REVIEW_CONFESSION_CHANNEL || ""
    );
    if (reviewChannel?.type === ChannelType.GuildText) {
      const msg = await reviewChannel.send({
        embeds: [embed],
        components: [actionRow],
      });
      await pushConfession({
        id: cfsCount,
        author: interaction.user.id,
        content: confession,
        reviewMessageID: msg.id,
        createdAt: new Date(),
        reviewedAt: null,
        reviewedBy: null,
        status: "pending",
        messageID: null,
        threadID: null,
      });

      interaction.reply({
        content: `Meowfession #${cfsCount} is pending approval!`,
        ephemeral: true,
      });
    }
  },
};
