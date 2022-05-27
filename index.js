// Make .env work
require('dotenv').config();

// Catch Errors/Rejections, so the bot doesn't crash
process.on('uncaughtException', (e) => {
    console.log('Error: ' + e.stack);
});

process.on('unhandledRejection', (r) => {
    console.log('Rejection: ' + r.stack);
});

let InvitedPlayers = [];

// Add useful functions to native JS classes/interfaces

Object.defineProperty(Array.prototype, 'findIndexes', {
    /**
     * Returns indexes of elements in the array that match the predicate, and -1 if none.
     * @param {function(*):Boolean} predicate The condition to check against every element.
     */
    value: function(predicate) {
        let indexes = [];
        for (let i = 0; i < this.length; i++) {
            if (predicate(this[i])) indexes.push(i);
        }
        if (indexes.length === 0) return -1;
        return indexes;
    },
    writable: false
});


//#region Variables

const Discord = require('discord.js');
const client = new Discord.Client({ intents: [Discord.Intents.FLAGS.GUILDS, Discord.Intents.FLAGS.GUILD_MESSAGES, Discord.Intents.FLAGS.GUILD_MESSAGE_REACTIONS] });
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
 * @param {Boolean} ephemeral
 */
function SendInteractionAnswer(interaction, answer, embeds = [], ephemeral = false) {
    interaction.reply({
        content: answer,
        embeds: embeds,
        ephemeral: ephemeral
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
client.on('interactionCreate', async(interaction) => {
    if (!interaction.isCommand()) return;

    let channel = await client.channels.fetch(interaction.channelId); // Getting current text channel

    switch (interaction.commandName) {
        case 'tic-tac-toe':
            if (interaction.options.getSubcommand() === 'with-a-bot') {
                // Check if the bot has required permissions
                if (!channel.permissionsFor(client.user).has([Discord.Permissions.FLAGS.MANAGE_MESSAGES, Discord.Permissions.FLAGS.SEND_MESSAGES,
                        Discord.Permissions.FLAGS.VIEW_CHANNEL, Discord.Permissions.FLAGS.VIEW_CHANNEL, Discord.Permissions.FLAGS.USE_EXTERNAL_EMOJIS,
                        Discord.Permissions.FLAGS.READ_MESSAGE_HISTORY, Discord.Permissions.FLAGS.ADD_REACTIONS
                    ])) { SendInteractionAnswer(interaction, "The bot is missing required permissions!", undefined, true); return; }
                // Check if the user is playing already
                if (XO.InGame.includes(interaction.user.id)) SendInteractionAnswer(interaction, 'You can\'t start game if you are already in one!', [], true);
                else { // If everything is ok, start the game!
                    // Function argument variables
                    let difficulty = interaction.options.getInteger('difficulty');
                    let playerSign = interaction.options.getInteger('starting-player');
                    // If side size is not entered, just make basic 3x3 game
                    const tableSide = interaction.options.getInteger('table-size') || 3;
                    // Start the game!
                    XO.HumanVSBot(interaction.member, difficulty, channel, tableSide, playerSign, interaction, client)
                }
            } else if (interaction.options.getSubcommand() === 'with-a-human') {
                // Check if the bot has required permissions
                if (!channel.permissionsFor(client.user).has([Discord.Permissions.FLAGS.MANAGE_MESSAGES, Discord.Permissions.FLAGS.SEND_MESSAGES,
                        Discord.Permissions.FLAGS.VIEW_CHANNEL, Discord.Permissions.FLAGS.VIEW_CHANNEL, Discord.Permissions.FLAGS.USE_EXTERNAL_EMOJIS,
                        Discord.Permissions.FLAGS.READ_MESSAGE_HISTORY, Discord.Permissions.FLAGS.ADD_REACTIONS
                    ])) { SendInteractionAnswer(interaction, "The bot is missing required permissions!", undefined, true); return; }
                const member = interaction.options.getMember('opponent');

                // Doing VARIOUS checks
                if (XO.InGame.includes(interaction.member.user.id)) SendInteractionAnswer(interaction, 'You can\'t start game if you are already in one!', [], true);
                else if (InvitedPlayers.includes(member.user.id)) SendInteractionAnswer(interaction, 'Person was already invited to an other game!', [], true);
                else if (member.user.bot) SendInteractionAnswer(interaction, 'You can\'t play with a bot!', [], true);
                else if (member.user.id === interaction.member.user.id) SendInteractionAnswer(interaction, 'You can\'t play with yourself!', [], true);
                else if (XO.InGame.includes(member.user.id)) SendInteractionAnswer(interaction, 'You can\'t play with a person in-game!', [], true);
                else if (!member.permissionsIn(channel).has([Discord.Permissions.FLAGS.VIEW_CHANNEL, Discord.Permissions.FLAGS.READ_MESSAGE_HISTORY]))
                    SendInteractionAnswer(interaction, 'This user can\'t play in this channel!', [], true);
                else { // If all checks were passed, then send request to Player 2
                    InvitedPlayers.push(member.user.id);
                    member.user.send('Do you want to play Tic-Tac-Toe with <@!' + interaction.member.user.id + '>?\nRun /accept if yes, and /reject if no.')
                        .then(message => {
                            SendInteractionAnswer(interaction, 'Waiting for response...', [], true);

                            /**
                             * @param {Discord.CommandInteraction<Discord.CacheType>} cmd 
                             */
                            const listener = async(cmd) => {
                                if (!cmd.isCommand()) return;

                                switch (cmd.commandName) {
                                    case 'accept':
                                        client.removeListener('interactionCreate', listener);
                                        try {
                                            message.delete();
                                        } catch {}
                                        clearTimeout(timeout);
                                        // Function argument variables
                                        const startPlayer = interaction.options.getInteger('starting-player');
                                        const playerX = startPlayer === XO.CurrentTurn_X ? interaction.member : member;
                                        const playerO = startPlayer === XO.CurrentTurn_X ? member : interaction.member;
                                        // If side size is not entered, just make basic 3x3 game
                                        const tableSide = interaction.options.getInteger('table-size') || 3;
                                        // Start the game!
                                        const msgUrl = await XO.HumanVSHuman(playerX, playerO, member, channel, tableSide, interaction, client);

                                        await cmd.reply({
                                            content: 'Invite accepted',
                                            components: [
                                                new Discord.MessageActionRow()
                                                .addComponents(new Discord.MessageButton()
                                                    .setLabel('Open Game')
                                                    .setStyle('LINK')
                                                    .setURL(msgUrl)
                                                )
                                            ],
                                            ephemeral: true
                                        });

                                        InvitedPlayers = InvitedPlayers.filter(id => id !== member.user.id);
                                        break;
                                    case 'reject':
                                        await cmd.reply({
                                            content: 'Invite rejected',
                                            components: [],
                                            ephemeral: true
                                        });
                                        client.removeListener('interactionCreate', listener);

                                        // If user reacted with crossmark, just delete request stuff
                                        try {
                                            message.delete();
                                        } catch {}
                                        clearTimeout(timeout);
                                        await interaction.editReply({
                                            content: "<@" + member.user.id + '> rejected your play request.',
                                            ephemeral: true
                                        });

                                        InvitedPlayers = InvitedPlayers.filter(id => id !== member.user.id);
                                        break;
                                }
                            };

                            client.on('interactionCreate', listener);

                            // And if user was thinking for over a minute (time-out)
                            let timeout = setTimeout(function() {
                                client.removeListener('interactionCreate', listener);
                                InvitedPlayers = InvitedPlayers.filter(id => id !== member.user.id);
                                try {
                                    message.delete();
                                } catch {}
                                interaction.editReply({
                                    content: 'Time out! Deleted your play request.',
                                    ephemeral: true
                                });
                                clearTimeout(timeout);
                            }, 60000);
                        })
                        .catch(error => { if (error.code == 50007) { SendInteractionAnswer(interaction, 'Can\'t send request to the user!', [], true); } }); // If bot can't DM Player 2
                }
            }
            break;
        case 'bot-help':
            let ticTacToeImageLink = 'https://i.ibb.co/zn2Wy6P/jm.webp';
            switch (interaction.options.getInteger('help-type')) {
                case HelpType_HowToStartTheGame:
                    SendInteractionAnswer(interaction, undefined, [new Discord.MessageEmbed() // Sending response
                        .setColor('#fff50f')
                        .setAuthor({ name: 'Tic-Tac-Toe: How to start the game', iconURL: ticTacToeImageLink })
                        .addFields({
                            name: 'You want to play with a human',
                            value: `1\\*. Type \`/tic-tac-toe with-a-human\` (or just select this command from the slash commands list).
              2\\*\\*. In the \`opponent\` field put your friend with which you want to play.
              3. In the \`starting-player\` select who will make the first move/play as X.
              4 (Optional). In the \`table-size\` field put the size (from 3 to 7) of a game table side.
              5. Run the command and wait until \`Waiting for the request answer...\` message appears.
              6\\*\\*\\*. After that your friend should get a message from the bot. Then friend should accept the request.
              7. After accepting the friend will get the link to the game message and now the game is started!
              
              \\*You can't play if you are playing Tic-Tac-Toe already.
              \\*\\*You can't play with certain users (more info sent after command run)
              \\*\\*\\*The friend can also reject the request, or just not notice it (after 1 minute request disappears).`
                        }, {
                            name: 'You want to play with a bot',
                            value: `1. Type \`/tic-tac-toe with-a-bot\` (or just select this command from the slash commands list).
              2. In the \`difficulty\` field put the bot's difficulty (from Easy to Hard).
              3. In the \`starting-player\` select who will make the first move/play as X.
              4 (Optional). In the \`table-size\` field put the size (from 3 to 7) of a game table side.
              5. Run the command and wait until \`Starting the game...\` message appears.
              6. After that the game is started!`
                        }, )
                        .setTimestamp()
                        .setFooter({ text: channel.guild.name, iconURL: channel.guild.iconURL() })
                    ], true);
                    break;
                case HelpType_HowToPlayTheGame:
                    SendInteractionAnswer(interaction, undefined, [new Discord.MessageEmbed() // Sending response
                        .setColor('#fff50f')
                        .setAuthor({ name: 'Tic-Tac-Toe: How to play the game', iconURL: ticTacToeImageLink })
                        .setDescription(`After the game starts several reactions (:arrow_left:\\*, :arrow_right:\\*, :arrow_up:\\*, :arrow_down:\\*, :white_check_mark:*, :octagonal_sign:) will appear under the game message.
            You will use them as the game controls. To use one, just click on the reaction.
            
            \\*You can use this reaction only when it is your turn (if you play with a human).`)
                        .addFields({ name: 'Selecting cell', value: `You will need to select a cell where you will place your sign before doing a move.
            On the game board, you will see selected cell (with a green border instead of black one).
            To move the selection, you will need to use :arrow_left:, :arrow_right:, :arrow_up: and :arrow_down: reactions.` }, { name: 'Doing a move', value: 'After selecting a cell, you just need to press :white_check_mark: reaction to make a move.' }, { name: 'Stopping the game', value: 'To stop the game you just need to press :octagonal_sign: reaction.' }, { name: 'Getting game info', value: `From the game message you can get game info (Game State, Players, Game Table).
              On the first line after the title the players will be displayed (Player X VS Player O).
              Then, on the second line you will see the game state (Current Turn\\*/Game Result)
              Lastly, you will see the game table, with which you can understand what to do.
              
              \\*It will display only if you play with a human.` })
                        .setTimestamp()
                        .setFooter({ text: channel.guild.name, iconURL: channel.guild.iconURL() })
                    ], true);
                    break;
                case HelpType_BotDifficultyExplanation:
                    SendInteractionAnswer(interaction, undefined, [new Discord.MessageEmbed() // Sending response
                        .setColor('#fff50f')
                        .setAuthor({ name: 'Tic-Tac-Toe: Bot Difficulty Explanation', iconURL: ticTacToeImageLink })
                        .addFields({ name: 'Bot difficulty - Easy', value: 'In this difficulty bot always just picks a random move.' }, { name: 'Bot difficulty - Normal', value: `In this difficulty bot checks if it can win in one move, and wins if yes.
              Else the bot checks if the opponent can win in one move, and blocks the win if yes.
              And if none of above has been triggered, bot just picks a random move.` }, { name: 'Bot difficulty - Hard', value: `In this difficulty bot checks if it can win in one move, and wins if yes.
              Else the bot checks if the opponent can win in one move, and blocks the win if yes.
              Otherwise the bot looks for the moves, that will make help it build a win line, and builds the fastest-to-build line.
              And if none of above has been triggered, bot just picks a random move.` })
                        .setTimestamp()
                        .setFooter({ text: channel.guild.name, iconURL: channel.guild.iconURL() })
                    ], true);
                    break;
                case HelpType_WhoMadeTheBotAndHow:
                    SendInteractionAnswer(interaction, undefined, [new Discord.MessageEmbed() // Sending response
                        .setColor('#fff50f')
                        .setAuthor({ name: 'Tic-Tac-Toe: Developers', iconURL: ticTacToeImageLink })
                        .setDescription('This  bot is made by **DV Game** using discord.js v12.5.3.\nThanks to **homvp** for several algorithm ideas and some code.')
                        .setTimestamp()
                        .setFooter({ text: channel.guild.name, iconURL: channel.guild.iconURL() })
                    ], true);
                    break;
                case HelpType_BotStatistics:
                    SendInteractionAnswer(interaction, undefined, [new Discord.MessageEmbed() // Sending response
                        .setColor('#fff50f')
                        .setAuthor({ name: 'Tic-Tac-Toe: Statistics', iconURL: ticTacToeImageLink })
                        .addFields({ name: 'Bot Statistics', value: `Server count: ${client.guilds.cache.size}\nMember count: ${client.users.cache.filter(user => !user.bot).size}`, inline: true }, { name: 'Game Statistics', value: `Games played: ${await GetStatistic('xo_gamesplayed')}\nUsers playing: ${XO.InGame.length}`, inline: true }, { name: 'Technical Statistics', value: `\`\`\`c++\nPing: ${client.ws.ping} ms\nUptime: ${(client.uptime/1000/60/60).toFixed(2)} h\nShard ID: ${channel.guild.shardID}\`\`\`` })
                        .setTimestamp()
                        .setFooter({ text: channel.guild.name, iconURL: channel.guild.iconURL() })
                    ], true);
                    break;
            }
            break;
        case 'invite-link':
            SendInteractionAnswer(interaction, `The invite link: https://discord.com/api/oauth2/authorize?client_id=841733014513385473&permissions=339008&scope=bot%20applications.commands`, [], true);
            break;
        case 'accept':
            if (!InvitedPlayers.includes(interaction.user.id)) {
                interaction.reply({
                    content: "You don't have any invites.",
                    ephemeral: true
                })
            }
            break;
        case 'reject':
            if (!InvitedPlayers.includes(interaction.user.id)) {
                interaction.reply({
                    content: "You don't have any invites.",
                    ephemeral: true
                })
            }
            break;
    }
});

client.on('ready', async function() {
    // Set client special presence
    client.user.setStatus('online');
    // Add slash commands to joined servers
    const glds = await client.guilds.fetch();
    for (let i = 0; i < glds.length; i++) {
        // Add tic-tac-toe slash command
        client.api.applications(client.user.id).guilds(glds[i]).commands.post({
            data: {
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
            }
        });
        // Add bot-help slash command
        client.api.applications(client.user.id).guilds(client.guilds.cache.keyArray()[i]).commands.post({
            data: {
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
            }
        });
        // Add invite-link slash command
        client.api.applications(client.user.id).guilds(client.guilds.cache.keyArray()[i]).commands.post({
            data: {
                name: 'invite-link',
                description: 'Gives you link to invite the bot to your server',
            }
        });
    }

    await client.application.commands.create({
        name: 'accept',
        description: 'Accepts the game you are invited to.'
    });

    await client.application.commands.create({
        name: 'reject',
        description: 'Rejects the game you are invited to.'
    });
});

// Add slash commands on the new server
client.on('guildCreate', guild => {
    // Add tic-tac-toe slash command
    client.api.applications(client.user.id).guilds(guild.id).commands.post({
        data: {
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
                    name: 'table-size',
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
        }
    });
    // Add bot-help slash command
    client.api.applications(client.user.id).guilds(guild.id).commands.post({
        data: {
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
        }
    });
    // Add invite-link slash command
    client.api.applications(client.user.id).guilds(guild.id).commands.post({
        data: {
            name: 'invite-link',
            description: 'Gives you link to invite the bot to your server',
        }
    });
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