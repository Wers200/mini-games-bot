// Make .env work
require('dotenv').config();

// Catch Errors/Rejections, so the bot doesn't crash
process.on('uncaughtException', (e) => {
	console.log('Error: ' + e.stack);
});

process.on('unhandledRejection', (r) => {
	console.log('Rejection: ' + r.stack);
});

// Add useful functions to native JS classes/interfaces

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


//#region Variables

const Discord = require('discord.js');
const client = new Discord.Client();
const database = require('./database.js');
const XO = require('./XO.js');

//#endregion  

//#region Readability improvers

const HelpType_HowToStartTheGame = 0;
const HelpType_HowToPlayTheGame = 1;
const HelpType_BotDifficultyExplanation = 2;
const HelpType_WhoMadeTheBotAndHow = 3;
const HelpType_BotStatistics = 4;

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

//#endregion

//#region Events 

// React on slash command use
client.ws.on('INTERACTION_CREATE', async (interaction) => {
  // Variables
  const command = interaction.data.name.toLowerCase();
  const args = interaction.data.options;
  /**@type {Discord.TextChannel} channel */
  let channel = await client.channels.fetch(interaction.channel_id); // Getting current text channel
  switch(command) {
    case 'tic-tac-toe':
      if(args[0].name == 'with-a-bot') {
        // Check if the bot has required permissions
        if(!channel.permissionsFor(client.user).has([Discord.Permissions.FLAGS.MANAGE_MESSAGES, Discord.Permissions.FLAGS.SEND_MESSAGES, 
          Discord.Permissions.FLAGS.VIEW_CHANNEL, Discord.Permissions.FLAGS.VIEW_CHANNEL, Discord.Permissions.FLAGS.USE_EXTERNAL_EMOJIS, 
          Discord.Permissions.FLAGS.READ_MESSAGE_HISTORY,  Discord.Permissions.FLAGS.ADD_REACTIONS])){ SendInteractionAnswer(interaction, "The bot is missing required permissions!", undefined, 64); return; }
        // Check if the user is playing already
        if(XO.InGame.includes(interaction.member.user.id)) SendInteractionAnswer(interaction, 'You can\'t start game if you are already in one!');
        else { // If everything is ok, start the game!
          SendInteractionAnswer(interaction, 'Starting the game...');
          // Function argument variables
          let difficulty = args[0].options[0].value;
          let playerSign = args[0].options[1].value;
          // If side size is not entered, just make basic 3x3 game
          const tableSide = args[0].options[2] != undefined ? args[0].options[2].value : 3;
          // Start the game!
          XO.HumanVSBot(interaction.member, difficulty, channel, tableSide, playerSign)
        }
      }
      else if(args[0].name == 'with-a-human') {
        // Check if the bot has required permissions
        if(!channel.permissionsFor(client.user).has([Discord.Permissions.FLAGS.MANAGE_MESSAGES, Discord.Permissions.FLAGS.SEND_MESSAGES, 
          Discord.Permissions.FLAGS.VIEW_CHANNEL, Discord.Permissions.FLAGS.VIEW_CHANNEL, Discord.Permissions.FLAGS.USE_EXTERNAL_EMOJIS, 
          Discord.Permissions.FLAGS.READ_MESSAGE_HISTORY,  Discord.Permissions.FLAGS.ADD_REACTIONS])){ SendInteractionAnswer(interaction, "The bot is missing required permissions!", undefined, 64); return; }
        let member = await channel.guild.members.fetch(args[0].options[0].value); // Getting Player 2 object
        // Doing VARIOUS checks
        if(XO.InGame.includes(interaction.member.user.id)) SendInteractionAnswer(interaction, 'You can\'t start game if you are already in one!');
        else if(member.user.bot) SendInteractionAnswer(interaction, 'You can\'t play with a bot!');
        else if(args[0].options[0].value == interaction.member.user.id) SendInteractionAnswer(interaction, 'You can\'t play with yourself!');
        else if(XO.InGame.includes(member.user.id)) SendInteractionAnswer(interaction, 'You can\'t play with a person in-game!');
        else if(!member.permissionsIn(channel).has([Discord.Permissions.FLAGS.VIEW_CHANNEL, Discord.Permissions.FLAGS.READ_MESSAGE_HISTORY])) 
          SendInteractionAnswer(interaction, 'This user can\'t play in this channel!');
        else { // If all checks were passed, then send request to Player 2
          member.user.send('Do you want to play Tic-Tac-Toe with <@!' + interaction.member.user.id + '>?\nReact to this message with :white_check_mark: if yes, and with :x: if no.')
          .then(message => {
            SendInteractionAnswer(interaction, 'Waiting for the request answer...');
            // React on request message, so user can choose
            message.react('✅');
            message.react('❌');
            // Making filters&collectors for reactions
            const filterYes = (reaction, user) => reaction.emoji.name === '✅' && user.id === member.user.id;
            const filterNo = (reaction, user) => reaction.emoji.name === '❌' && user.id === member.user.id;
            const collectorYes = message.createReactionCollector(filterYes);
            const collectorNo = message.createReactionCollector(filterNo);
            // Waiting for reaction...
            collectorYes.on('collect', reaction => {
              // If user reacted with checkmark, delete request stuff and start the game
              message.delete();
              clearTimeout(timeout);
              // Function argument variables
              const playerX = args[0].options[1].value == XO.CurrentTurn_X ? interaction.member : member;
              const playerO = args[0].options[1].value == XO.CurrentTurn_X ? member : interaction.member;
              // If side size is not entered, just make basic 3x3 game
              const tableSide = args[0].options[2] != undefined ? args[0].options[2].value : 3;
              // Start the game!
              XO.HumanVSHuman(playerX, playerO, member, channel, tableSide);
            });
            collectorNo.on('collect', reaction => {
              // If user reacted with crossmark, just delete request stuff
              message.delete();
              clearTimeout(timeout);
              channel.send(member.user.username + '#' + member.user.discriminator + ' rejected your play request.');
            });
            // And if user was thinking for over a minute (time-out)
            let timeout = setTimeout(function() {
              if(!message.deleted) message.delete();
              channel.send('Time out! Deleted your play request.');
              clearTimeout(timeout);
            }, 60000);            
          })
          .catch(error => { if(error.code == 50007) { SendInteractionAnswer(interaction, 'Can\'t send request to the user!'); } }); // If bot can't DM Player 2
        }
      }
      break;
    case 'bot-help':
      let ticTacToeImageLink = 'https://i.ibb.co/zn2Wy6P/jm.webp';
      switch(args[0].value) {
        case HelpType_HowToStartTheGame:
          SendInteractionAnswer(interaction, undefined, [new Discord.MessageEmbed() // Sending response
            .setColor('#fff50f')
            .setAuthor('Tic-Tac-Toe: How to start the game', ticTacToeImageLink)
            .addFields({ name: 'You want to play with a human', value: 
              `1\\*. Type \`/tic-tac-toe with-a-human\` (or just select this command from the slash commands list).
              2\\*\\*. In the \`opponent\` field put your friend with which you want to play.
              3. In the \`starting-player\` select who will make the first move/play as X.
              4 (Optional). In the \`table-size\` field put the size (from 3 to 7) of a game table side.
              5. Run the command and wait until \`Waiting for the request answer...\` message appears.
              6\\*\\*\\*. After that your friend should get a message from the bot. Then friend should accept the request.
              7. After accepting the friend will get the link to the game message and now the game is started!
              
              \\*You can't play if you are playing Tic-Tac-Toe already.
              \\*\\*You can't play with certain users (more info sent after command run)
              \\*\\*\\*The friend can also reject the request, or just not notice it (after 1 minute request disappears).` }, 
              { name: 'You want to play with a bot', value: 
              `1. Type \`/tic-tac-toe with-a-bot\` (or just select this command from the slash commands list).
              2. In the \`difficulty\` field put the bot's difficulty (from Easy to Hard).
              3. In the \`starting-player\` select who will make the first move/play as X.
              4 (Optional). In the \`table-size\` field put the size (from 3 to 7) of a game table side.
              5. Run the command and wait until \`Starting the game...\` message appears.
              6. After that the game is started!` }, )
            .setTimestamp()
            .setFooter(channel.guild.name, channel.guild.iconURL())], 64);
          break;
        case HelpType_HowToPlayTheGame:
          SendInteractionAnswer(interaction, undefined, [new Discord.MessageEmbed() // Sending response
            .setColor('#fff50f')
            .setAuthor('Tic-Tac-Toe: How to play the game', ticTacToeImageLink)
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
              
              \\*It will display only if you play with a human.` })
            .setTimestamp()
            .setFooter(channel.guild.name, channel.guild.iconURL())], 64);
          break;
        case HelpType_BotDifficultyExplanation:
          SendInteractionAnswer(interaction, undefined, [new Discord.MessageEmbed() // Sending response
            .setColor('#fff50f')
            .setAuthor('Tic-Tac-Toe: Bot Difficulty Explanation', ticTacToeImageLink)
            .addFields({ name: 'Bot difficulty - Easy', value: 'In this difficulty bot always just picks a random move.' }, 
              { name: 'Bot difficulty - Normal', value: `In this difficulty bot checks if it can win in one move, and wins if yes.
              Else the bot checks if the opponent can win in one move, and blocks the win if yes.
              And if none of above has been triggered, bot just picks a random move.` }, 
              { name: 'Bot difficulty - Hard', value: `In this difficulty bot checks if it can win in one move, and wins if yes.
              Else the bot checks if the opponent can win in one move, and blocks the win if yes.
              Otherwise the bot looks for the moves, that will make help it build a win line, and builds the fastest-to-build line.
              And if none of above has been triggered, bot just picks a random move.` })
            .setTimestamp()
            .setFooter(channel.guild.name, channel.guild.iconURL())], 64);
          break;
        case HelpType_WhoMadeTheBotAndHow:
          SendInteractionAnswer(interaction, undefined, [new Discord.MessageEmbed() // Sending response
            .setColor('#fff50f')
            .setAuthor('Tic-Tac-Toe: Developers', ticTacToeImageLink)
            .setDescription('This  bot is made by **DV Game** using discord.js v12.5.3.\nThanks to **homvp** for several algorithm ideas and some code.')
            .setTimestamp()
            .setFooter(channel.guild.name, channel.guild.iconURL())], 64);
          break;
        case HelpType_BotStatistics:
          SendInteractionAnswer(interaction, undefined, [new Discord.MessageEmbed() // Sending response
            .setColor('#fff50f')
            .setAuthor('Tic-Tac-Toe: Statistics', ticTacToeImageLink)
            .addFields({ name: 'Bot Statistics', value:`Server count: ${client.guilds.cache.size}\nMember count: ${client.users.cache.filter(user => !user.bot).size}`, inline: true }, 
              { name: 'Game Statistics', value: `Games played: ${await GetStatistic('xo_gamesplayed')}\nUsers playing: ${XO.InGame.length}`, inline: true }, 
              { name: 'Technical Statistics', value: `\`\`\`c++\nPing: ${client.ws.ping} ms\nUptime: ${(client.uptime/1000/60/60).toFixed(2)} h\nShard ID: ${channel.guild.shardID}\`\`\``})
            .setTimestamp()
            .setFooter(channel.guild.name, channel.guild.iconURL())], 64);
          break;
      }
      break;
    case 'invite-link':
      SendInteractionAnswer(interaction, `The invite link: https://discord.com/api/oauth2/authorize?client_id=841733014513385473&permissions=339008&scope=bot%20applications.commands`, [], 64);
      break;
  }
});

client.on('ready', function() {
  // Set client special presence
  client.user.setStatus('dnd');
  // Add slash commands to joined servers
  for(let i = 0; i < client.guilds.cache.size; i++) {
    // Add tic-tac-toe slash command
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
              value: XO.BotDifficulty_Easy
            }, {
              name: 'Normal',
              value: XO.BotDifficulty_Normal
            }, {
              name: 'Hard',
              value: XO.BotDifficulty_Hard
            }]
          }, {
            name: 'starting-player',
            description: 'Player who goes first',
            type: 4,
            required: true,
            choices: [{
              name: 'Player 1 (You)',
              value: XO.CurrentTurn_X
            }, {
              name: 'Player 2 (Bot)',
              value: XO.CurrentTurn_O
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
              value: XO.CurrentTurn_X
            }, {
              name: 'Player 2 (Your Opponent)',
              value: XO.CurrentTurn_O
            }]
          }, {
            name: 'table-size',
            description: 'Size of a table (Minimum: 3, Maximum: 7)',
            type: 4,
            required: false
          }]
        }]  
    }});
    // Add bot-help slash command
    client.api.applications(client.user.id).guilds(client.guilds.cache.keyArray()[i]).commands.post({data: {
      name: 'bot-help',
      description: 'Gives you help about the bot and how to use it',
      type: 4,
      options: [{
        name: 'help-type',
        description: 'Type of the help you want to get',
        type: 4,
        required: true,
        choices: [{
          name: 'How to start the game',
          value: HelpType_HowToStartTheGame
        }, {
          name: 'How to play the game',
          value: HelpType_HowToPlayTheGame
        }, {
          name: 'What bot difficulty means',
          value: HelpType_BotDifficultyExplanation
        }, {
          name: 'Who made the bot and how',
          value: HelpType_WhoMadeTheBotAndHow
        }, {
          name: 'The bot\'s statistics',
          value: HelpType_BotStatistics
        }]
      }]
    }});
    // Add invite-link slash command
    client.api.applications(client.user.id).guilds(client.guilds.cache.keyArray()[i]).commands.post({data: {
      name: 'invite-link',
      description: 'Gives you link to invite the bot to your server',
    }});
  }
});

client.on('message', message => {
  if(message.author.bot) return;

  if(message.content.startsWith('/eval ') && message.author.id == '670559252456407070') {
    let code = message.content.substring(6); // Remove '/eval ' (6 characters) from the message content and get code
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
  // Add tic-tac-toe slash command
  client.api.applications(client.user.id).guilds(guild.id).commands.post({data: {
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
          value: XO.BotDifficulty_Easy
        }, {
          name: 'Normal',
          value: XO.BotDifficulty_Normal
        }, {
          name: 'Hard',
          value: XO.BotDifficulty_Hard
        }]
      }, {
        name: 'starting-player',
        description: 'Player who goes first',
        type: 4,
        required: true,
        choices: [{
          name: 'Player 1 (You)',
          value: XO.CurrentTurn_X
        }, {
          name: 'Player 2 (Bot)',
          value: XO.CurrentTurn_O
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
          value: XO.CurrentTurn_X
        }, {
          name: 'Player 2 (Your Opponent)',
          value: XO.CurrentTurn_O
        }]
      }, {
        name: 'table-size',
        description: 'Size of a table (Minimum: 3, Maximum: 7)',
        type: 4,
        required: false
      }]
    }]  
  }});
  // Add bot-help slash command
  client.api.applications(client.user.id).guilds(guild.id).commands.post({data: {
    name: 'bot-help',
    description: 'Gives you help about the bot and how to use it',
    type: 4,
    options: [{
      name: 'help-type',
      description: 'Type of the help you want to get',
      type: 4,
      required: true,
      choices: [{
        name: 'How to start the game',
        value: HelpType_HowToStartTheGame
      }, {
        name: 'How to play the game',
        value: HelpType_HowToPlayTheGame
      }, {
        name: 'What bot difficulty means',
        value: HelpType_BotDifficultyExplanation
      }, {
        name: 'Who made the bot and how',
        value: HelpType_WhoMadeTheBotAndHow
      }, {
        name: 'The bot\'s statistics',
        value: HelpType_BotStatistics
      }]
    }]
  }});
  // Add invite-link slash command
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

client.login(process.env.TOKEN);

//#endregion

