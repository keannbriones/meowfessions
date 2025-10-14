import { Client, Collection, Partials } from "discord.js";
import "dotenv/config";
import type { Command, Event, Slash } from "../interfaces";
import path from "path";
import { readdirSync } from "fs";

class Bot extends Client {
  public commands: Collection<string, Command> = new Collection();
  public events: Collection<string, Event> = new Collection();
  public slash: Collection<string, Slash> = new Collection();
  public aliases: Collection<string, string> = new Collection();

  public constructor() {
    super({
      intents: 32767,
      partials: [Partials.Channel],
      allowedMentions: { repliedUser: true },
    });
  }

  public async init() {
    const token = process.env.TOKEN;

    // ✅ Validate token
    if (!token) {
      console.error(
        "❌ Discord bot token not found. Please check your Render environment variables."
      );
      process.exit(1);
    }

    // ✅ Masked token for debug
    const maskedToken = `${token.slice(0, 5)}...${token.slice(-3)}`;
    console.log(`🔒 Token detected: ${maskedToken}`);

    // ✅ Try logging in safely
    try {
      await this.login(token);
    } catch (error: any) {
      if (error.code === "TokenInvalid") {
        console.error(
          "🚫 Invalid Discord token. Double-check your TOKEN value in Render."
        );
      } else {
        console.error("⚠️ Failed to log in to Discord:", error);
      }
      process.exit(1);
    }

    // ✅ Event Handler
    const eventPath = path.join(__dirname, "..", "Events");
    readdirSync(eventPath).forEach(async (file) => {
      const { event } = await import(`${eventPath}/${file}`);
      this.events.set(event.name, event);
      this.on(event.name, event.run.bind(null, this));
    });

    // ✅ Command Handler
    const commandPath = path.join(__dirname, "..", "Commands");
    readdirSync(commandPath).forEach((dir) => {
      const commands = readdirSync(`${commandPath}/${dir}`).filter(
        (file) => file.endsWith(".js") || file.endsWith(".ts")
      );
      commands.forEach(async (file) => {
        const { command } = await import(`${commandPath}/${dir}/${file}`);
        this.commands.set(command.name, command);

        if (command?.aliases && command.aliases.length !== 0) {
          command.aliases.forEach((alias: string) => {
            this.aliases.set(alias, command.name);
          });
        }
      });
    });

    // ✅ Slash Handler
    const slashCommands: Slash[] = [];
    const slashPath = path.join(__dirname, "..", "Slash");
    readdirSync(slashPath).forEach((dir) => {
      const slash = readdirSync(`${slashPath}/${dir}`).filter(
        (file) => file.endsWith(".js") || file.endsWith(".ts")
      );

      slash.forEach(async (file) => {
        const { slash } = await import(`${slashPath}/${dir}/${file}`);
        this.slash.set(slash.name, slash);
        slashCommands.push(slash);
      });
    });

    this.once("ready", async () => {
      await this.application?.commands.set(slashCommands);
      console.log(`✅ Bot is ready! Logged in as ${this.user?.tag}`);
    });

    // ✅ Graceful Shutdown Handling
    this.setupGracefulShutdown();
  }

  private setupGracefulShutdown() {
    const shutdown = async (signal: string) => {
      console.log(`\n🧹 Received ${signal}. Cleaning up before exit...`);
      if (this.user) console.log(`👋 Logging out ${this.user.tag}...`);
      await this.destroy();
      console.log("🛑 Bot connection closed cleanly.");
      process.exit(0);
    };

    process.on("SIGINT", () => shutdown("SIGINT")); // Manual stop
    process.on("SIGTERM", () => shutdown("SIGTERM")); // Render restart or deploy
  }
}

export default Bot;