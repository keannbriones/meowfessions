import { Message, Collection, EmbedBuilder, ButtonBuilder, ButtonStyle,  ActionRowBuilder, ChannelType } from 'discord.js';
import { Event } from '../interfaces';
import { getConfessionCount, pushConfession } from '../Database';
import Client from '../Client';

export const event: Event = {
    name: 'messageCreate',
    run: async (client: Client, message: Message) => {
        if (message.channel.type === ChannelType.GuildStageVoice) return;
        if (message.author.bot) return;
        const guild = client.guilds.cache.get(process.env.GUILD_ID || '');
        const isInGuild = await guild?.members.fetch(message.author.id);

        if (!isInGuild || (isInGuild instanceof Collection)) return message.channel.send("You are not in the server!");
        
        if (message.channel.type === ChannelType.DM) {
            const confession = message.content;
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
            
            const actionRow = new ActionRowBuilder<ButtonBuilder>().addComponents([button1, button2]);

            const reviewChannel = guild?.channels.cache.get(process.env.REVIEW_CONFESSION_CHANNEL || '');
            if (reviewChannel?.type === ChannelType.GuildText) {
                const msg = await reviewChannel.send({ embeds: [embed], components: [actionRow]});
                await pushConfession({
                    id: cfsCount,
                    author: message.author.id,
                    content: confession,
                    reviewMessageID: msg.id,
                    createdAt: new Date(),
                    reviewedAt: null,
                    reviewedBy:null,
                    status: 'pending',
                    messageID: null,
                    threadID: null,
                });

                message.channel.send({ content: `Meowfession #${cfsCount} is pending approval!`});  
            }
        }
        const prefix = '-';
        if (!message.content.startsWith(prefix)) return;
        const args = message.content.slice(prefix.length).trim().split(/ +/g);
        const cmd = args.shift()?.toLowerCase();
        if (!cmd || cmd.length === 0) return;
        const command = client.commands.get(cmd) || client.commands.get(client.aliases.get(cmd) || '');
        if (command) command.run(client, message, args);
    }
}