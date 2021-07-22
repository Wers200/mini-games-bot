// Make .env work
require('dotenv').config();

// Catch Errors/Rejections, so the bot doesn't crash
process.on('uncaughtException', (e) => {
	console.log('Error: ' + e.stack);
});

process.on('unhandledRejection', (r) => {
	console.log('Rejection: ' + r.stack);
});

//#region Add useful functions to already existing JS classes
Object.defineProperty(Array.prototype, 'findIndexes', {
  /**
   * Returns indexes of elements in the array that match the predicate, and -1 if none.
   * @param {function(*):Boolean} predicate The condition to check against every element.
   */
  value: function(predicate){
    let indexes = [];
    for(let i = 0; i < this.length; i++) {
        if(predicate(this[i])) indexes.push(i);
    }
    if(indexes.length === 0) return -1;
    return indexes;
  }, writable: false
});
//#endregion

//#region Imports
const Discord = require('discord.js');
const client = new Discord.Client();
const database = require('./Database.js');
const XO = require('./XO.js');
//#endregion  

//#region Enums
const HelpType = {
  XO: {
    HowToStartTheGame: 0,
    HowToPlayTheGame: 1,
    BotDifficultyExplanation: 2,
    GameStatistics: 3 
  }
}
//#endregion

//#region Functions
/**
 * Sends reply to your Discord slash command interaction.
 * @param {*} interaction Discord slash command interaction.
 * @param {String} answer Reply to an `interaction` (string).
 * @param {Discord.MessageEmbed[]} embeds Reply to an `interaction` (embed).
 * @param {Number} flags Reply flags (64 to make reply ephemeral)
 */
function SendInteractionAnswer(interaction, answer, embeds = [], flags = 0) {
  client.api.interactions(interaction.id, interaction.token).callback.post({
    data: {
        type: 4,
        data: {
            content: answer,
            embeds: embeds,
            flags: flags
        }
    }
  });
}

/**
 * Gets needed statistic from `database`. Use with `await`.
 * @param {String} statisticName The name of statistic you want to get.
 * @returns {*} The statistic value.
 */
async function GetStatistic(statisticName) {
  return (await database.query(`SELECT ${statisticName} FROM statistics;`)).rows[0][statisticName];
}

/**
 * @param {Date} millis Time you need to convert to the string.
 * @param {Number} digitsAfterDecimalPoint Number of digits after the decimal point of the converted milliseconds number (must be in the range 0 - 20).
 * @returns {String} Converted time (seconds/minutes/days/weeks/months/years)
 */
function ConvertToNearestTimeMeasurementString(millis, digitsAfterDecimalPoint = 0) {
  if(millis > 1000 * 60 * 60 * 24 * 7 * 365) return `${(millis / 1000 / 60 / 60 / 24 / 7 / 365).toFixed(digitsAfterDecimalPoint)} year(s)`
  else if(millis > 1000 * 60 * 60 * 24 * 7 * 30) return `${(millis / 1000 / 60 / 60 / 24 / 7 / 30).toFixed(digitsAfterDecimalPoint)} month(s)`
  else if(millis > 1000 * 60 * 60 * 24 * 7) return `${(millis / 1000 / 60 / 60 / 24 / 7).toFixed(digitsAfterDecimalPoint)} week(s)`
  else if(millis > 1000 * 60 * 60 * 24) return `${(millis / 1000 / 60 / 60 / 24).toFixed(digitsAfterDecimalPoint)} day(s)`
  else if(millis > 1000 * 60 * 60) return `${(millis / 1000 / 60 / 60).toFixed(digitsAfterDecimalPoint)} hour(s)`
  else if(millis > 1000 * 60) return `${(millis / 1000 / 60).toFixed(digitsAfterDecimalPoint)} minute(s)`
  else if(millis > 1000) return `${(millis / 1000).toFixed(digitsAfterDecimalPoint)} second(s)`
}
//#endregion

//#region Events
// React on a discord interaction (slash command/button click)
client.ws.on('INTERACTION_CREATE', async (interaction) => {
  const command = interaction.data.name.toLowerCase();
  const args = interaction.data.options;
  const channel = await client.channels.fetch(interaction.channel_id);
  switch(command) {
    case 'tic-tac-toe':  
      switch(args[0].name) {
        case 'with-a-bot':
          // Check if the bot has required permissions
          if(!channel.permissionsFor(client.user).has([Discord.Permissions.FLAGS.MANAGE_MESSAGES, Discord.Permissions.FLAGS.SEND_MESSAGES, 
            Discord.Permissions.FLAGS.VIEW_CHANNEL, Discord.Permissions.FLAGS.VIEW_CHANNEL, Discord.Permissions.FLAGS.USE_EXTERNAL_EMOJIS, 
            Discord.Permissions.FLAGS.READ_MESSAGE_HISTORY,  Discord.Permissions.FLAGS.ADD_REACTIONS])){ SendInteractionAnswer(interaction, "The bot is missing required permissions!", undefined, 64); break; }
          if(XO.InGame.includes(interaction.member.user.id)) SendInteractionAnswer(interaction, 'You can\'t start game if you are already in one!');
          else {
            SendInteractionAnswer(interaction, 'Starting the game...');
            const difficulty = args[0].options[0].value;
            const playerSign = args[0].options[1].value;
            const tableSide = args[0].options[2] != undefined ? args[0].options[2].value : 3;
            XO.HumanVSBot(interaction.member, difficulty, channel, tableSide, playerSign)
          }
          break;
        case 'with-a-human':
          // Check if the bot has required permissions
          if(!channel.permissionsFor(client.user).has([Discord.Permissions.FLAGS.MANAGE_MESSAGES, Discord.Permissions.FLAGS.SEND_MESSAGES, 
            Discord.Permissions.FLAGS.VIEW_CHANNEL, Discord.Permissions.FLAGS.VIEW_CHANNEL, Discord.Permissions.FLAGS.USE_EXTERNAL_EMOJIS, 
            Discord.Permissions.FLAGS.READ_MESSAGE_HISTORY,  Discord.Permissions.FLAGS.ADD_REACTIONS])){ SendInteractionAnswer(interaction, "The bot is missing required permissions!", undefined, 64); break; }
          // Get Player 2 object
          const member = await channel.guild.members.fetch(args[0].options[0].value);
          // Check if the user is able to play
          if(XO.InGame.includes(interaction.member.user.id)) SendInteractionAnswer(interaction, 'You can\'t start game if you are already in one!');
          else if(member.user.bot) SendInteractionAnswer(interaction, 'You can\'t play with a bot!');
          else if(args[0].options[0].value == interaction.member.user.id) SendInteractionAnswer(interaction, 'You can\'t play with yourself!');
          else if(XO.InGame.includes(member.user.id)) SendInteractionAnswer(interaction, 'You can\'t play with a person in-game!');
          else if(!member.permissionsIn(channel).has([Discord.Permissions.FLAGS.VIEW_CHANNEL, Discord.Permissions.FLAGS.READ_MESSAGE_HISTORY])) 
            SendInteractionAnswer(interaction, 'This user can\'t play in this channel!');
          else {
            member.user.send('Do you want to play Tic-Tac-Toe with <@!' + interaction.member.user.id + '>?\nReact to this message with :white_check_mark: if yes, and with :x: if no.')
              .then(message => {
                SendInteractionAnswer(interaction, 'Waiting for the request answer...');
                message.react('✅');
                message.react('❌');
                const filterYes = (reaction, user) => reaction.emoji.name === '✅' && user.id === member.user.id;
                const filterNo = (reaction, user) => reaction.emoji.name === '❌' && user.id === member.user.id;
                const collectorYes = message.createReactionCollector(filterYes);
                const collectorNo = message.createReactionCollector(filterNo);
                collectorYes.on('collect', reaction => {
                  message.delete();
                  clearTimeout(timeout);
                  const playerX = args[0].options[1].value == XO.CurrentTurn.X ? interaction.member : member;
                  const playerO = args[0].options[1].value == XO.CurrentTurn.X ? member : interaction.member;
                  const tableSide = args[0].options[2] != undefined ? args[0].options[2].value : 3;
                  XO.HumanVSHuman(playerX, playerO, member, channel, tableSide);
                });
                collectorNo.on('collect', reaction => {
                  message.delete();
                  clearTimeout(timeout);
                  channel.send(member.user.username + '#' + member.user.discriminator + ' rejected your play request.');
                });
                // If user was thinking for over a minute (time-out)
                let timeout = setTimeout(function() {
                  if(!message.deleted) message.delete();
                  channel.send('Time out! Deleted your play request.');
                  clearTimeout(timeout);
                }, 60000);            
              })
              .catch(error => { if(error.code == 50007) { SendInteractionAnswer(interaction, 'Can\'t send request to the user!'); } });
          }
          break;
        case 'game-help':
          let helpEmbed = new Discord.MessageEmbed()
            .setColor('#fff50f')
            .setTimestamp()
            .setFooter(channel.guild.name, channel.guild.iconURL());
          switch(args[0].options[0].value) {
            case HelpType.XO.HowToStartTheGame:
              helpEmbed
                .setAuthor('Tic-Tac-Toe: How to start the game', 'https://i.imgur.com/6WmOBJF.jpeg')
                .addFields({ name: 'You want to play with a human', value: 
                  `1\\*. Type \`/tic-tac-toe with-a-human\` (or just select this command from the slash commands list).
                  2\\*\\*. In the \`opponent\` field put your friend with which you want to play.
                  3. In the \`starting-player\` select who will make play as X (0 - you, 1 - opponent).
                  4 (Optional). In the \`table-size\` field put the size (from 3 to 7) of a game table side.
                  5. Run the command and wait until \`Waiting for the request answer...\` message appears.
                  6\\*\\*\\*. After that your friend should get a message from the bot. Then friend should accept the request.
                  7. After accepting the friend will get the link to the game message and now the game is started!
                  
                  \\*You can't play if you are playing already.
                  \\*\\*You can't play with certain users.
                  \\*\\*\\*After 1 minute request disappears.` }, 
                  { name: 'You want to play with a bot', value: 
                  `1. Type \`/tic-tac-toe with-a-bot\` (or just select this command from the slash commands list).
                  2. In the \`difficulty\` field put the bot's difficulty (from Easy to Hard).
                  3. In the \`starting-player\` select who will make the first move/play as X.
                  4 (Optional). In the \`table-size\` field put the size (from 3 to 7) of a game table side.
                  5. Run the command and wait until \`Starting the game...\` message appears.
                  6. After that the game is started!` }, );
              SendInteractionAnswer(interaction, undefined, [helpEmbed], 64);
              break;
            case HelpType.XO.HowToPlayTheGame:
              helpEmbed
                .setAuthor('Tic-Tac-Toe: How to play the game', 'https://i.imgur.com/6WmOBJF.jpeg')
                .setDescription(`After the game starts several reactions (:arrow_left:\\*, :arrow_right:\\*, :arrow_up:\\*, :arrow_down:\\*, :white_check_mark:*, :octagonal_sign:) will appear under the game message.
                You will use them as the game controls. To use one, just click on the reaction.
                
                \\*You can use this reaction only when it is your turn (if you play with a human).`)
                .addFields({ name: 'Selecting cell', value: `You will need to select a cell where you will place your sign before doing a move.
                On the game board, you will see selected cell (with a green border instead of black one).
                To move the selection, you will need to use :arrow_left:, :arrow_right:, :arrow_up: and :arrow_down: reactions.` }, 
                  { name: 'Doing a move', value: 'After selecting a cell, you just need to press :white_check_mark: reaction to make a move.' }, 
                  { name: 'Stopping the game', value: 'To stop the game you just need to press :octagonal_sign: reaction.' },
                  { name: 'Getting game info', value: `From the game message you can get game info (Game State, Players, Game Table).
                  On the first line after the title the players will be displayed (Player X VS Player O).
                  Then, on the second line you will see the game state (Current Turn\\*/Game Result)
                  Lastly, you will see the game table, with which you can understand what to do.
                  
                  \\*It will display only if you play with a human.` });
              SendInteractionAnswer(interaction, undefined, [helpEmbed], 64);
              break;
            case HelpType.XO.BotDifficultyExplanation:
              helpEmbed
                .setAuthor('Tic-Tac-Toe: Bot Difficulty Explanation', 'https://i.imgur.com/6WmOBJF.jpeg')
                .addFields({ name: 'Bot difficulty - Easy', value: 'In this difficulty bot always just picks a random move.' }, 
                  { name: 'Bot difficulty - Normal', value: `In this difficulty bot checks if it can win in one move, and wins if yes.
                  Else the bot checks if the opponent can win in one move, and blocks the win if yes.
                  And if none of above has been triggered, bot just picks a random move.` }, 
                  { name: 'Bot difficulty - Hard', value: `In this difficulty bot checks if it can win in one move, and wins if yes.
                  Else the bot checks if the opponent can win in one move, and blocks the win if yes.
                  Otherwise the bot looks for the moves, that will make help it build a win line, and builds the fastest-to-build line.
                  And if none of above has been triggered, bot just picks a random move.` });
              SendInteractionAnswer(interaction, undefined, [helpEmbed], 64);
              break;
            case HelpType.XO.GameStatistics:
              helpEmbed
                .setAuthor('Tic-Tac-Toe: Statistics', 'https://i.imgur.com/6WmOBJF.jpeg')
                .addFields({ name: 'Game Statistics', value: `Total games played: ${await GetStatistic('xo_gamesplayed')}
                Users playing now: ${XO.InGame.length}
                Last game end: ${ConvertToNearestTimeMeasurementString(new Date().getTime() - (await GetStatistic('xo_lastgame')))} ago`, inline: true });
              SendInteractionAnswer(interaction, undefined, [helpEmbed], 64);
              break;
          }
          break;
      }
      break;
    case 'bot-statistics':
      const totalMemberCount = client.guilds.cache.reduce((accumulator, guild) => accumulator.memberCount + guild.memberCount);
      SendInteractionAnswer(interaction, undefined, [new Discord.MessageEmbed() // Sending response
        .setColor('#9c53c1')
        .setAuthor('Global Statistics', client.user.displayAvatarURL())
        .addFields({ name: 'Bot Statistics', value:`Server count: ${client.guilds.cache.size}\nMember count: ${totalMemberCount}`, inline: true }, 
          { name: 'Technical Statistics', value: `\`\`\`c++\nPing: ${client.ws.ping} ms\nUptime: ${(client.uptime/1000/60/60).toFixed(2)} h\`\`\``})
        .setTimestamp()
        .setFooter(channel.guild.name, channel.guild.iconURL())], 64);
      break;
    case 'invite-link':
      SendInteractionAnswer(interaction, `The invite link (developer version): https://discord.com/login?redirect_to=%2Foauth2%2Fauthorize%3Fclient_id%3D848174855982809118%26permissions%3D339008%26scope%3Dbot%2520applications.commands`, [], 64);
      break;
  }
});

// Add slash commands on boot to already existing servers
client.on('ready', function() {
  client.user.setStatus('idle');
  client.user.setActivity('Tic-Tac-Toe 2: Electric Boogaloo', { type: 'PLAYING' });
  // Add slash commands to joined (by bot) servers
  for(let i = 0; i < client.guilds.cache.size; i++) {
    client.api.applications(client.user.id).guilds(client.guilds.cache.keyArray()[i]).commands.post({data: {
      name: 'tic-tac-toe',
      description: 'Starts a new Tic-Tac-Toe game',
      options: [{
        name: 'with-a-bot',
        description: 'Starts a new Tic-Tac-Toe game with a bot',
        type: 1,
        options: [{
          name: 'difficulty',
          description: 'Game difficulty',
          type: 4,
          required: true,
          choices: [{
            name: 'Easy',
            value: XO.BotDifficulty.Easy
          }, {
            name: 'Normal',
            value: XO.BotDifficulty.Normal
          }, {
            name: 'Hard',
            value: XO.BotDifficulty.Hard
          }]
        }, {
          name: 'starting-player',
          description: 'Player who goes first',
          type: 4,
          required: true,
          choices: [{
            name: 'Player 1 (You)',
            value: XO.CurrentTurn.X
          }, {
            name: 'Player 2 (Bot)',
            value: XO.CurrentTurn.O
          }]
        }, {
          name: 'table-side',
          description: 'Size of a table side (Minimum: 3, Maximum: 7)',
          type: 4,
          required: false
        }]
      }, {
        name: 'with-a-human',
        description: 'Starts a new Tic-Tac-Toe game with another human',
        type: 1,
        options: [{
          name: 'opponent',
          description: 'Your opponent',
          type: 6,
          required: true,
        }, {
          name: 'starting-player',
          description: 'Player who goes first',
          type: 4,
          required: true,
          choices: [{
            name: 'Player 1 (You)',
            value: XO.CurrentTurn.X
          }, {
            name: 'Player 2 (Your Opponent)',
            value: XO.CurrentTurn.O
          }]
        }, {
          name: 'table-size',
          description: 'Size of a table (Minimum: 3, Maximum: 7)',
          type: 4,
          required: false
        }]
      }, {
        name: 'game-help',
        description: 'Gives you help about Tic-Tac-Toe',
        type: 1,
        options: [{
          name: 'help-type',
          description: 'Type of the help you want to get',
          type: 4,
          required: true,
          choices: [{
            name: 'How to start the game',
            value: HelpType.XO.HowToStartTheGame
          }, {
            name: 'How to play the game',
            value: HelpType.XO.HowToPlayTheGame
          }, {
            name: 'What bot difficulty means',
            value: HelpType.XO.BotDifficultyExplanation
          }, {
            name: 'The game statistics',
            value: HelpType.XO.GameStatistics
          }]
        }]
      }]  
    }});
    client.api.applications(client.user.id).guilds(client.guilds.cache.keyArray()[i]).commands.post({data: {
      name: 'bot-statistics',
      description: 'Gives you the bot\'s statistics'
    }});
    client.api.applications(client.user.id).guilds(client.guilds.cache.keyArray()[i]).commands.post({data: {
      name: 'invite-link',
      description: 'Gives you link to invite the bot to your server',
    }});
  }
});

// React on //eval
client.on('message', message => {
  if(message.content.startsWith('//eval ') && message.author.id == '670559252456407070') {
    let code = message.content.substring(7);
    try {
      message.channel.send(new Discord.MessageEmbed()
        .setColor('#32ff19')
        .addField('Return', '```js\n' + eval(code) + '\n```'));
    }
    catch(exc) {
      message.channel.send(new Discord.MessageEmbed()
        .setColor('#ff3219')
        .addField('Error', '```js\n' + exc + '\n```'));
    }
  }
});

// Add slash commands on the new server
client.on('guildCreate', guild => {
  client.api.applications(client.user.id).guilds(guild.id).commands.post({data: {
    name: 'tic-tac-toe',
    description: 'Starts a new Tic-Tac-Toe game',
    options: [{
      // Add with-a-bot subcommand
      name: 'with-a-bot',
      description: 'Starts a new Tic-Tac-Toe game with a bot',
      type: 1,
      options: [{
        name: 'difficulty',
        description: 'Game difficulty',
        type: 4,
        required: true,
        choices: [{
          name: 'Easy',
          value: XO.BotDifficulty.Easy
        }, {
          name: 'Normal',
          value: XO.BotDifficulty.Normal
        }, {
          name: 'Hard',
          value: XO.BotDifficulty.Hard
        }]
      }, {
        name: 'starting-player',
        description: 'Player who goes first',
        type: 4,
        required: true,
        choices: [{
          name: 'Player 1 (You)',
          value: XO.CurrentTurn.X
        }, {
          name: 'Player 2 (Bot)',
          value: XO.CurrentTurn.O
        }]
      }, {
        name: 'table-side',
        description: 'Size of a table side (Minimum: 3, Maximum: 7)',
        type: 4,
        required: false
      }]
    }, {
      // Add with-a-human subcommand
      name: 'with-a-human',
      description: 'Starts a new Tic-Tac-Toe game with another human',
      type: 1,
      options: [{
        name: 'opponent',
        description: 'Your opponent',
        type: 6,
        required: true,
      }, {
        name: 'starting-player',
        description: 'Player who goes first',
        type: 4,
        required: true,
        choices: [{
          name: 'Player 1 (You)',
          value: XO.CurrentTurn.X
        }, {
          name: 'Player 2 (Your Opponent)',
          value: XO.CurrentTurn.O
        }]
      }, {
        name: 'table-size',
        description: 'Size of a table (Minimum: 3, Maximum: 7)',
        type: 4,
        required: false
      }]
    }, {
      // Add game-help subcommand
      name: 'game-help',
      description: 'Gives you help about Tic-Tac-Toe',
      type: 1,
      options: [{
        name: 'help-type',
        description: 'Type of the help you want to get',
        type: 4,
        required: true,
        choices: [{
          name: 'How to start the game',
          value: HelpType.XO.HowToStartTheGame
        }, {
          name: 'How to play the game',
          value: HelpType.XO.HowToPlayTheGame
        }, {
          name: 'What bot difficulty means',
          value: HelpType.XO.BotDifficultyExplanation
        }, {
          name: 'The game statistics',
          value: HelpType.XO.GameStatistics
        }]
      }]
    }]  
  }});
  client.api.applications(client.user.id).guilds(guild.id).commands.post({data: {
    name: 'bot-statistics',
    description: 'Gives you the bot\'s statistics'
  }});
  client.api.applications(client.user.id).guilds(guild.id).commands.post({data: {
    name: 'invite-link',
    description: 'Gives you link to invite the bot to your server',
  }});
});

// Remove slash commands on the deleted server
client.on('guildDelete', guild => {
  client.api.applications(client.user.id).guilds(guild.id).commands.get().then(commands => {
    commands.forEach(command => {
      client.api.applications(client.user.id).guilds(guild.id).commands(command.id).delete();
    });
  });
});
//#endregion

client.login(process.env.TOKEN2);