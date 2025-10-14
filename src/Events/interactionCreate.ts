import type { Interaction } from "discord.js";
import {
  EmbedBuilder,
  TextChannel,
  ThreadAutoArchiveDuration,
} from "discord.js";
import { Event } from "../interfaces";
import { getConfession, updateConfession } from "../Database";

export const event: Event = {
  name: "interactionCreate",
  run: async (client, interaction: Interaction) => {
    if (interaction.isCommand()) {
      const cmd = client.slash.get(interaction.commandName);
      if (!cmd) return;
      cmd.run(client, interaction);
    }

    if (interaction.isButton()) {
      const message = await interaction.channel?.messages.fetch(
        interaction.message.id
      );
      const confession = await getConfession(interaction.message.id);
      if (!confession) return;
      switch (interaction.customId) {
        case "accept": {
          const cfsChannel = interaction.guild?.channels.cache.get(
            process.env.CONFESSION_CHANNEL || ""
          ) as TextChannel;
          const oldEmbed = interaction.message.embeds[0];
          const confessionEmbed = new EmbedBuilder()
            .setTitle(oldEmbed.title)
            .setDescription(oldEmbed.description)
            .setFooter({ text: "Reply to the meowfession below" });
          const cfs = await cfsChannel?.send({ embeds: [confessionEmbed] });
          const cfsThread = await cfs.startThread({
            name: `Rep cfs ${confession.id}`,
            autoArchiveDuration: ThreadAutoArchiveDuration.OneWeek,
          });
          cfsThread.send("You can reply to meowfessions here!");

          await updateConfession({
            ...confession,
            reviewedBy: interaction.user.id,
            reviewedAt: new Date(),
            status: "approved",
            messageID: cfs.id,
            threadID: cfsThread.id,
          });

          if (message?.editable)
            message.edit({
              components: [],
              content: `Approved by: ${interaction.user}`,
              allowedMentions: { repliedUser: false },
            });
          const author = await interaction.guild?.members.fetch(
            confession.author
          );
          await author
            ?.send(`Meowfession #${confession.id} has been approved!`)
            .catch(() => null);
          break;
        }

        case "reject": {
          if (message?.editable)
            message.edit({
              components: [],
              content: `Rejected by: ${interaction.user}`,
              allowedMentions: { repliedUser: false },
            });
          await updateConfession({
            ...confession,
            reviewedBy: interaction.user.id,
            reviewedAt: new Date(),
            status: "rejected",
          });
        }
      }
    }
  },
};
