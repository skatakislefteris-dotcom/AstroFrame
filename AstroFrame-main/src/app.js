import 'dotenv/config';
// Πρόσθεσε αυτές τις γραμμές για να δούμε τι ακριβώς διαβάζει:
console.log('--- DEBUGGING TOKEN ---');
console.log('Value of process.env.DISCORD_TOKEN:', process.env.DISCORD_TOKEN);
console.log('Length of token:', process.env.DISCORD_TOKEN?.length); // Φόρτωση του .env στην 1η γραμμή
import { Client, Collection, GatewayIntentBits } from 'discord.js';
import { REST } from '@discordjs/rest';
import express from 'express';
import cron from 'node-cron';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

import config from './config/application.js';
import { initializeDatabase } from './utils/database.js';
import { getServerCounters, saveServerCounters, updateCounter } from './services/serverstatsService.js';
import { logger, startupLog, shutdownLog } from './utils/logger.js';
import { checkBirthdays } from './services/birthdayService.js';
import { checkGiveaways } from './services/giveawayService.js';
import { loadCommands, registerCommands as registerSlashCommands } from './handlers/commandLoader.js';

class TitanBot extends Client {
  constructor() {
    super({
      intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.GuildMessageReactions,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildVoiceStates,
        GatewayIntentBits.GuildBans,
      ],
    });

    this.config = config;
    this.commands = new Collection();
    this.buttons = new Collection();
    this.selectMenus = new Collection();
    this.modals = new Collection();
    this.db = null;
    this.rest = new REST({ version: '10' }).setToken(config.bot.token);
  }

  async start() {
    try {
      startupLog('Starting TitanBot...');
      const dbInstance = await initializeDatabase();
      this.db = dbInstance.db;
      
      this.startWebServer();
      await loadCommands(this);
      await this.loadHandlers();
      
      await this.login(this.config.bot.token);
      await this.registerCommands();
      
      this.setupCronJobs();
      startupLog('ONLINE ✅ | Bot ready.');
    } catch (error) {
      logger.error('Failed to start bot:', error);
      process.exit(1);
    }
  }

  startWebServer() {
    const app = express();
    app.get('/', (req, res) => res.status(200).send('TitanBot Online'));
    const port = this.config.api?.port || 3000;
    app.listen(port, () => startupLog(`Web Server running on port ${port}`));
  }

  setupCronJobs() {
    cron.schedule('0 6 * * *', () => checkBirthdays(this));
    cron.schedule('* * * * *', () => checkGiveaways(this));
  }

  async loadHandlers() {
    const handlers = ['events', 'interactions'];
    for (const h of handlers) {
      const module = await import(`./handlers/${h}.js`);
      if (module.default) await module.default(this);
    }
  }

  async registerCommands() {
    try {
      await registerSlashCommands(this, this.config.bot.guildId);
    } catch (error) {
      logger.error('Error registering commands:', error);
    }
  }
}

const bot = new TitanBot();
bot.start();

process.on('unhandledRejection', (reason) => logger.error('Unhandled Rejection:', reason));
process.on('uncaughtException', (err) => logger.error('Uncaught Exception:', err));

export default TitanBot;