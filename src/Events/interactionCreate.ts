import type { Interaction } from "discord.js";
import {
  EmbedBuilder,
  TextChannel,
  ThreadAutoArchiveDuration,
  BaseMessageOptions,
} from "discord.js";
import { Event } from "../interfaces";
import { getConfession, updateConfession } from "../Database";

export const event: Event = {
  name: "interactionCreate",
  run: async (client, interaction: Interaction) => {
    // Slash command handling
    if (interaction.isCommand()) {
      const cmd = client.slash.get(interaction.commandName);
      if (!cmd) return;
      cmd.run(client, interaction);
      return;
    }

    // Button interactions
    if (interaction.isButton()) {
      if (!interaction.channel?.isTextBased()) return; // ✅ ensure safe send/edit
      const message = await interaction.channel.messages.fetch(
        interaction.message.id
      ).catch(() => null);
      if (!message) return;

      const confession = await getConfession(interaction.message.id);
      if (!confession) return;

      switch (interaction.customId) {
        case "accept": {
          // ✅ ensure confession channel is valid and text-based
          const targetChannel = interaction.guild?.channels.cache.get(
            process.env.CONFESSION_CHANNEL || ""
          );
          if (!targetChannel || !targetChannel.isTextBased()) {
            console.warn("Confession channel not found or invalid");
            return;
          }

          const oldEmbed = interaction.message.embeds[0];
          const confessionEmbed = new EmbedBuilder()
            .setTitle(oldEmbed?.title ?? `Meowfession #${confession.id}`)
            .setDescription(oldEmbed?.description ?? "No content found.")
            .setFooter({ text: "Reply to the meowfession below" })
            .setColor("Aqua");

          // ✅ safely send the confession
          const cfs = await targetChannel.send({ embeds: [confessionEmbed] }
