import {
  Message,
  Collection,
  EmbedBuilder,
  ButtonBuilder,
  ButtonStyle,
  ActionRowBuilder,
  ChannelType,
  TextChannel,
  DMChannel,
} from "discord.js";
import { Event } from "../interfaces";
import { getConfessionCount, pushConfession } from "../Database";
import Client from "../Client";

export const event: Event = {
  name: "messageCreate",
  run: async (client: Client, message: Message) => {
    // Ignore stage channels and bot messages
    if (message.channel.type === ChannelType.GuildStageVoice) return;
    if (message.author.bot) return;

    const guild = client.guilds.cache.get(process.env.GUILD_ID || "");
    if (!guild) return;

    const isInGuild = await guild.members
      .fetch(message.author.id)
      .catch(() => null);

    // If user is not in guild
    if (!isInGuild || isInGuild instanceof Collection) {
      if (
        message.channel.type === ChannelType.GuildText ||
        message.channel.type === ChannelType.DM
      ) {
        await message.channel.send("You are not in the server!");
      }
      return;
    }

    // Handle DMs for confessions
    if (message.channel.type === ChannelType.DM) {
      const dmChannel = message.channel as DMChannel;
      const confession = message.content.trim();
      if (!confession) return;

      let cfsCount = (await getConfessionCount()) || 0;
      cfsCount++;

      const embed = new EmbedBuilder()
        .setTitle(`Meowfession #${cfsCount}`)
        .setDescription(confession)
        .setColor("Aqua")
        .setTimestamp()
        .setFooter({
          text: "Press the buttons below to accept/reject meowfessions!",
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

      const actionRow = new ActionRowBuilder<ButtonBuilder>().addComponents(
        button1,
        button2
      );

      const reviewChannel = guild.channels.cache.get(
        process.env.REVIEW_CONFESSION_CHANNEL || ""
      );

      if (reviewChannel && reviewChannel.type === ChannelType.GuildText) {
        const textChannel = reviewChannel as TextChannel;

        const msg = await textChannel.send({
          embeds: [embed],
          components: [actionRow],
        });

        await pushConfession({
          id: cfsCount,
          author: message.author.id,
          content: confession,
          reviewMessageID: msg.id,
          createdAt: new Date(),
          reviewedAt: null,
          reviewedBy: null,
          status: "pending",
          messageID: null,
          threadID: null,
        });

        await dmChannel.send({
          content: `Meowfession #${cfsCount} is pending approval!`,
        });
      }
    }

    // Command handling
    const prefix = "-";
    if (!message.content.startsWith(prefix)) return;

    const args = message.content.slice(prefix.length).trim().split(/ +/g);
    const cmd = args.shift()?.toLowerCase();
    if (!cmd || cmd.length === 0) return;

    const command =
      client.commands.get(cmd) ||
      client.commands.get(client.aliases.get(cmd) || "");

    if (command) command.run(client, message, args);
  },
};
