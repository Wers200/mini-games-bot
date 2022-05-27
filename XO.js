const Discord = require('discord.js')
const { Point, Size, ArrayLogic } = require('./Optimized2DArrayHelper.js')
const Mathf = require('./mathf.js');
const database = require('./database.js');

class XO {
    //#region Readability improvers

    static BotDifficulty_Easy = Object.freeze(0);
    static BotDifficulty_Normal = Object.freeze(1);
    static BotDifficulty_Hard = Object.freeze(2);

    static CellState_None = Object.freeze(0);
    static CellState_X = Object.freeze(1);
    static CellState_O = Object.freeze(2);

    static CurrentTurn_X = Object.freeze(-1);
    static CurrentTurn_O = Object.freeze(1);

    static GameState_XWon = Object.freeze(0);
    static GameState_OWon = Object.freeze(1);
    static GameState_Draw = Object.freeze(2);
    static GameState_Playing = Object.freeze(3);

    static CellState_CharDictionary = Object.freeze({
        '<:XO_CellNone:843900699989114930>': XO.CellState_None,
        '<:XO_CellX:843900699976269835>': XO.CellState_X,
        '<:XO_CellO:843900699937996891>': XO.CellState_O
    });
    static CellState_OverlayCharDictionary = Object.freeze({
        '<:XO_CellNone:843900699989114930>': '<:XO_CellNone_S:843905503872155669>',
        '<:XO_CellX:843900699976269835>': '<:XO_CellX_S:843905503868223558>',
        '<:XO_CellO:843900699937996891>': '<:XO_CellO_S:843905503923142716>'
    });

    //#endregion

    //#region Variables

    static InGame = [];

    //#endregion

    //#region Functions

    /**
     * Starts new Human VS Bot XO Game.
     * @param {Discord.GuildMember} player The human player.
     * @param {Number} difficulty The bot's difficulty (Format - BotDifficulty)
     * @param {Discord.TextChannel} channel Text Channel, where the game will be.
     * @param {Number} gameTableSide Size of a game table side.
     * @param {Number} playerSign Sign, that the player uses (Format - CurrentTurn).\
     * @param {Discord.CommandInteraction<Discord.CacheType>} interaction
     * @param {Discord.Client<Boolean>} client
     */
    static async HumanVSBot(player, difficulty, channel, gameTableSide, playerSign, interaction, client) {
        // Variables
        gameTableSide = Mathf.clamp(gameTableSide, 3, 7); // Clamp side size to minimum and maximum values
        let gameTable = ArrayLogic.CreateArray(Size.GetSizeFromSide(gameTableSide), XO.CellState_None);
        let cursor = new Point(Math.floor((gameTableSide - 1) / 2), Math.floor((gameTableSide - 1) / 2));
        let lastBotMove = playerSign == XO.CurrentTurn_O ? XO.MakeABotMove(difficulty, gameTable, playerSign, gameTableSide, cursor, Point.OneInverted) : Point.OneInverted;
        // Pushing player into in-game players list
        if (!XO.InGame.includes(player.user.id)) XO.InGame.push(player.user.id);
        // Send game message
        await interaction.reply({
            embeds: [new Discord.MessageEmbed()
                .setColor('#0099ff')
                .setTitle(`Tic-Tac-Toe${gameTableSide == 3 ? '!' : '?'}`)
                .setDescription(`**<@!${player.user.id}> VS Bot (${difficulty == XO.BotDifficulty_Easy ? 'Easy' : difficulty == XO.BotDifficulty_Normal ? 'Normal' : 'Hard'})**\n\n` +
                    `${ArrayLogic.Stringify(gameTable, [cursor.Get1DIndexFrom2D(gameTableSide)], gameTableSide, XO.CellState_CharDictionary, XO.CellState_OverlayCharDictionary, true)}`)
                .setTimestamp()
                .setFooter({ text: channel.guild.name, iconURL: channel.guild.iconURL() })
            ],
            components: [new Discord.MessageActionRow()
                .addComponents(
                    new Discord.MessageButton()
                    .setCustomId('move_left')
                    .setEmoji('⬅')
                    .setStyle('SECONDARY'),
                ).addComponents(
                    new Discord.MessageButton()
                    .setCustomId('move_right')
                    .setEmoji('➡')
                    .setStyle('SECONDARY'),
                ).addComponents(
                    new Discord.MessageButton()
                    .setCustomId('move_up')
                    .setEmoji('⬆')
                    .setStyle('SECONDARY'),
                )
                .addComponents(
                    new Discord.MessageButton()
                    .setCustomId('move_down')
                    .setEmoji('⬇')
                    .setStyle('SECONDARY'),
                ),
                new Discord.MessageActionRow()
                .addComponents(
                    new Discord.MessageButton()
                    .setCustomId('place')
                    .setLabel('Place')
                    .setStyle('SUCCESS'),
                ).addComponents(
                    new Discord.MessageButton()
                    .setCustomId('stop_game')
                    .setLabel('Stop')
                    .setStyle('DANGER'),
                )
            ]
        });

        /**
         * @param {Discord.ButtonInteraction} buttonInteraction 
         */
        const listener = async buttonInteraction => {
            if (!buttonInteraction.isButton()) return;

            const correctUser = buttonInteraction.user.id === player.user.id;

            switch (buttonInteraction.customId) {
                case 'move_left':
                    if (cursor.X > 0 && correctUser) {
                        cursor.X -= 1; // Moving cursor & updating message then
                        await XO.UpdateEmbed_HumanVSBot(buttonInteraction, player, playerSign, difficulty, gameTable, cursor, gameTableSide);
                    } else {
                        buttonInteraction.deferUpdate();
                    }
                    break;
                case 'move_right':
                    if (cursor.X < gameTableSide - 1 && correctUser) {
                        cursor.X += 1; // Moving cursor & updating message then
                        await XO.UpdateEmbed_HumanVSBot(buttonInteraction, player, playerSign, difficulty, gameTable, cursor, gameTableSide);
                    } else {
                        buttonInteraction.deferUpdate();
                    }
                    break;
                case 'move_up':
                    if (cursor.Y > 0 && correctUser) {
                        cursor.Y -= 1; // Moving cursor & updating message then
                        await XO.UpdateEmbed_HumanVSBot(buttonInteraction, player, playerSign, difficulty, gameTable, cursor, gameTableSide);
                    } else {
                        buttonInteraction.deferUpdate();
                    }
                    break;
                case 'move_down':
                    if (cursor.Y < gameTableSide - 1 && correctUser) {
                        cursor.Y += 1; // Moving cursor & updating message then
                        await XO.UpdateEmbed_HumanVSBot(buttonInteraction, player, playerSign, difficulty, gameTable, cursor, gameTableSide);
                    } else {
                        buttonInteraction.deferUpdate();
                    }
                    break;
                case 'place':
                    if (gameTable[cursor.Get1DIndexFrom2D(gameTableSide)] == XO.CellState_None && correctUser) {
                        gameTable[cursor.Get1DIndexFrom2D(gameTableSide)] = playerSign == XO.CurrentTurn_X ? XO.CellState_X : XO.CellState_O;
                        let state = XO.CheckGameState(gameTable, cursor, gameTableSide); // Get game state
                        if (state != XO.GameState_Playing) { // If human made a move that changes game state
                            // Updating message including game state
                            await XO.UpdateEmbed_HumanVSBot(buttonInteraction, player, playerSign, difficulty, gameTable, cursor, gameTableSide, state);
                            XO.InGame.splice(XO.InGame.indexOf(player.user.id));
                            client.removeListener('interactionCreate', listener);
                        } else {
                            lastBotMove = XO.MakeABotMove(difficulty, gameTable, playerSign, gameTableSide, cursor, lastBotMove);
                            state = XO.CheckGameState(gameTable, lastBotMove, gameTableSide);
                            if (state != XO.GameState_Playing) { // If bot made a move that changes game state
                                XO.InGame.splice(XO.InGame.indexOf(player.user.id));
                                client.removeListener('interactionCreate', listener);
                            }
                            await XO.UpdateEmbed_HumanVSBot(buttonInteraction, player, playerSign, difficulty, gameTable, cursor, gameTableSide, state);
                        }
                    } else {
                        buttonInteraction.deferUpdate();
                    }
                    break;
                case 'stop_game':
                    if (correctUser) {
                        await buttonInteraction.update({ content: `<@!${buttonInteraction.user.id}> has stopped the game.`, embeds: [], components: [] });
                        XO.InGame.splice(XO.InGame.indexOf(player.user.id));
                        client.removeListener('interactionCreate', listener);
                    } else {
                        buttonInteraction.deferUpdate();
                    }
                    break;
            }
        };
        client.on('interactionCreate', listener);
    }

    /**
     * Calculates... XO stuff and makes the bot do a move.
     * @param {Number} difficulty The bot's difficulty (Format - BotDifficulty).
     * @param {Number[]} gameTable Game table (Values format - CellState).
     * @param {Number} playerSign What sign human player plays as (Format - CurrentTurn).
     * @param {Number} gameTableSide Size of a game table side.
     * @param {Point} lastPlayerMove Last move done in the game by human player.
     * @param {Point} lastBotMove Last move done in the game by bot.
     * @returns {Point} The bot's move position.
     */
    static MakeABotMove(difficulty, gameTable, playerSign, gameTableSide, lastPlayerMove, lastBotMove) {
        // Variables (shorthands in this case)
        let botCellState = playerSign == XO.CurrentTurn_X ? XO.CellState_O : XO.CellState_X;
        let gameTableSize = Size.GetSizeFromSide(gameTableSide);

        switch (difficulty) {
            case XO.BotDifficulty_Easy: // If easy mode, just pick a random move
                let possibleMoves = XO.GetPossibleMoves(gameTable);
                let randomNumber = Mathf.randomInt(0, possibleMoves.length);
                gameTable[possibleMoves[randomNumber]] = botCellState;
                return Point.Get2DIndexFrom1D(possibleMoves[randomNumber], gameTableSize);
            case XO.BotDifficulty_Normal:
                // Get one-move win moves for the bot and human player
                let botWinMoves = XO.GetPotentionalWinMoves(gameTable, -playerSign, gameTableSide, lastBotMove, 1);
                let playerWinMoves = XO.GetPotentionalWinMoves(gameTable, playerSign, gameTableSide, lastPlayerMove, 1);
                if (botWinMoves.length > 0) { // If the bot can win in one move, do that move
                    let randomNumber = Mathf.randomInt(0, botWinMoves.length); // Get random bot win combination index
                    gameTable[botWinMoves[randomNumber][0].Get1DIndexFrom2D(gameTableSide)] = botCellState;
                    return botWinMoves[randomNumber][0]; // Do a move and return position
                } else if (playerWinMoves.length > 0) { // If player can win in one move, block the player         
                    let randomNumber = Mathf.randomInt(0, playerWinMoves.length); // Get random player win combination index
                    gameTable[playerWinMoves[randomNumber][0].Get1DIndexFrom2D(gameTableSide)] = botCellState;
                    return playerWinMoves[randomNumber][0]; // Do a move and return position
                } else { // Else just do a random move
                    let possibleMoves = XO.GetPossibleMoves(gameTable); // Get possible move positions
                    let randomNumber = Mathf.randomInt(0, possibleMoves.length); // Get random move position (1D)
                    gameTable[possibleMoves[randomNumber]] = botCellState; // Do a move and return position
                    return Point.Get2DIndexFrom1D(possibleMoves[randomNumber], gameTableSize);
                }
            case XO.BotDifficulty_Hard:
                if (lastBotMove == Point.OneInverted) { // Do the first move, if not done yet
                    let tableCenter = new Point(Math.floor((gameTableSide - 1) / 2), Math.floor((gameTableSide - 1) / 2));
                    // Occupy the center if table size is even and if it is not occupied yet
                    if (gameTableSide % 2 != 0 && gameTable[tableCenter.Get1DIndexFrom2D(gameTableSide)] == XO.CellState_None) {
                        gameTable[tableCenter.Get1DIndexFrom2D(gameTableSide)] = botCellState;
                        return tableCenter;
                    } else { // Else place move in the corners
                        let corner = new Point(Mathf.randomBool() ? 0 : gameTableSide - 1, Mathf.randomBool() ? 0 : gameTableSide - 1);
                        gameTable[corner.Get1DIndexFrom2D(gameTableSide)] = botCellState;
                        return corner;
                    }
                } else {
                    // Get prefferable moves for bot (that may lead to win), one-move wins for bot and one-move wins for player
                    let botWinMoves = XO.GetPotentionalWinMoves(gameTable, -playerSign, gameTableSide, lastBotMove, 1);
                    let botGoodMoves = XO.GetPotentionalWinMoves(gameTable, -playerSign, gameTableSide, lastBotMove, gameTableSide - 1);
                    let playerWinMoves = XO.GetPotentionalWinMoves(gameTable, playerSign, gameTableSide, lastPlayerMove, 1);
                    if (botWinMoves.length > 0) { // If the bot can win in one move, do that move
                        let randomNumber = Mathf.randomInt(0, botWinMoves.length); // Get random bot win combination index
                        gameTable[botWinMoves[randomNumber][0].Get1DIndexFrom2D(gameTableSide)] = botCellState;
                        return botWinMoves[randomNumber][0]; // Do a move and return position
                    } else if (playerWinMoves.length > 0) { // If player can win in one move, block the player
                        let randomNumber = Mathf.randomInt(0, playerWinMoves.length); // Get random player win combination index
                        gameTable[playerWinMoves[randomNumber][0].Get1DIndexFrom2D(gameTableSide)] = botCellState;
                        return playerWinMoves[randomNumber][0]; // Do a move and return position
                    } else if (botGoodMoves.length > 0) { // If the bot have moves, that may lead to win, do the best move
                        let currentBestMove = Point.OneInverted;
                        let currentLowestCombinationLength = gameTableSide - 1;
                        for (let i = 0; i < botGoodMoves.length; i++) {
                            // Check if the path is not longer than any of previous paths
                            if (botGoodMoves[i].length > currentLowestCombinationLength) continue;
                            else if (botGoodMoves[i].length < currentLowestCombinationLength)
                                currentLowestCombinationLength = botGoodMoves[i].length;
                            for (let j = 0; j < botGoodMoves[i].length; j++) // Get the new best move (every time), because why not
                                currentBestMove = botGoodMoves[i][Mathf.randomInt(0, botGoodMoves[i].length)];
                        }
                        gameTable[currentBestMove.Get1DIndexFrom2D(gameTableSide)] = botCellState;
                        return currentBestMove; // Do a move and return position
                    } else { // Else just do a random move
                        let possibleMoves = XO.GetPossibleMoves(gameTable); // Get possible move positions
                        let randomNumber = Mathf.randomInt(0, possibleMoves.length); // Get random move position (1D)
                        gameTable[possibleMoves[randomNumber]] = botCellState; // Do a move and return position
                        return Point.Get2DIndexFrom1D(possibleMoves[randomNumber], gameTableSize);
                    }
                }
        }
    }

    /**
     * Returns you free empty cells in the `gameTable` (shorthand).
     * @param {Number[]} gameTable Game table (Values format - CellState).
     * @returns {Number[]} Empty cells in the `gameTable`.
     */
    static GetPossibleMoves(gameTable) {
        return gameTable.findIndexes(num => num == XO.CellState_None);
    }

    /**
     * Checks if player can win in `movesToWin` moves, and returns win combinations if yes.
     * @param {Number[]} gameTable Game table (Values format - CellState).
     * @param {Number} playerSign What sign player plays as (Format - CurrentTurn).
     * @param {Number} gameTableSide Size of a game table side.
     * @param {Point} lastPlayerMove Last player's move.
     * @param {Number} movesToWin In how many moves player should be able to win.
     * @returns {[Point[]]} Move combinations to win the game as the player.
     */
    static GetPotentionalWinMoves(gameTable, playerSign, gameTableSide, lastMove, movesToWin) {
        // Variables
        let playerCellState = playerSign == XO.CurrentTurn_X ? XO.CellState_X : XO.CellState_O;
        let gameTableSize = Size.GetSizeFromSide(gameTableSide);
        let winCombinations = [];
        if (!lastMove.IsOutOfBounds(gameTableSize)) { // If the placement of last move is incorrect, don't do the useless work and just return empty array then
            for (let i = 0; i < 4; i++) { // Shoot info rays in a half of directions
                let direction = i == 0 ? Point.DirectionLeft : i == 1 ? Point.DirectionUpLeft : i == 2 ? Point.DirectionUp : Point.DirectionUpRight;
                let info = ArrayLogic.ShootInfoRay(lastMove, gameTableSide, direction, gameTable, gameTableSize, [playerCellState, XO.CellState_None], true, ArrayLogic.InfoRayReturn_Both);
                // Add point into movesToWin array if point is empty and meeting certain conditions
                if (info[1][XO.CellState_None] <= movesToWin && info[0].length == gameTableSide)
                    winCombinations.push(info[0].filter(point => gameTable[point.Get1DIndexFrom2D(gameTableSide)] == XO.CellState_None));
            }
        }
        return winCombinations;
    }

    /**
     * Changes XO Human VS Bot game embed message.
     * @param {Discord.ButtonInteraction} interaction Game interaction.
     * @param {Discord.GuildMember} player The human player.
     * @param {Number} playerSign What sign player plays as (Format - CurrentTurn).
     * @param {Number} difficulty The bot's difficulty (Format - BotDifficulty).
     * @param {Number[]} gameTable Game table (Values format - CellState).
     * @param {Point} cursor Current cell selection cursor position.
     * @param {Number} gameTableSide Size of a game table side.
     * @param {Number} gameState Current game state (Format - GameState).
     */
    static async UpdateEmbed_HumanVSBot(interaction, player, playerSign, difficulty, gameTable, cursor, gameTableSide, gameState = XO.GameState_Playing) {
        let status = ``;
        // Set status if needed
        if (gameState != XO.GameState_Playing) {
            switch (gameState) {
                case playerSign == XO.CurrentTurn_X ? XO.GameState_XWon:
                    XO.GameState_OWon:
                        status = `\nGame Ended! <@!${player.user.id}> won!\n`
                    break;
                case playerSign == XO.CurrentTurn_X ? XO.GameState_OWon:
                    XO.GameState_XWon:
                        status = `\nGame Ended! Bot (${difficulty == XO.BotDifficulty_Easy ? 'Easy' : difficulty == XO.BotDifficulty_Normal ? 'Normal' : 'Hard'}) won!\n`
                    break;
                case XO.GameState_Draw:
                    status = '\nGame Ended! Draw :/\n';
                    break;
            }
        }

        interaction.update({
            embeds: [new Discord.MessageEmbed()
                .setColor('#0099ff')
                .setTitle(`Tic-Tac-Toe${gameTableSide == 3 ? '!' : '?'}`)
                .setDescription(`**<@!${player.user.id}> VS Bot (${difficulty == XO.BotDifficulty_Easy ? 'Easy' : difficulty == XO.BotDifficulty_Normal ? 'Normal' : 'Hard'})**\n${status}\n` +
                    `${ArrayLogic.Stringify(gameTable, [cursor.Get1DIndexFrom2D(gameTableSide)], gameTableSide, XO.CellState_CharDictionary, XO.CellState_OverlayCharDictionary, true)}`)
                .setTimestamp()
                .setFooter({ text: interaction.guild.name, iconURL: interaction.guild.iconURL() })
            ],
            components: gameState != XO.GameState_Playing ? [] : undefined
        });
    }

    /**
     * Starts new Human VS Human XO Game.
     * @param {Discord.GuildMember} playerX Player who plays as X.
     * @param {Discord.GuildMember} playerO Player who plays as O.
     * @param {Discord.TextChannel} channel Text Channel, where the game will be.
     * @param {Discord.GuildMember} requestedPlayer Player who got the game request.
     * @param {Number} gameTableSide Size of a game table side.
     * @param {Discord.CommandInteraction<Discord.CacheType>} interaction
     * @param {Discord.Client<Boolean>} client
     */
    static async HumanVSHuman(playerX, playerO, requestedPlayer, channel, gameTableSide, interaction, client) {
        // Variables
        let currentTurn = XO.CurrentTurn_X;
        gameTableSide = Mathf.clamp(gameTableSide, 3, 7); // Clamp side size to minimum and maximum values
        let gameTable = ArrayLogic.CreateArray(Size.GetSizeFromSide(gameTableSide), XO.CellState_None);
        let cursor = new Point(Math.floor((gameTableSide - 1) / 2), Math.floor((gameTableSide - 1) / 2));
        // Pushing players into in-game players list
        if (!XO.InGame.includes(playerX.user.id)) XO.InGame.push(playerX.user.id);
        if (!XO.InGame.includes(playerO.user.id)) XO.InGame.push(playerO.user.id);

        const msg = await interaction.followUp({
            embeds: [new Discord.MessageEmbed()
                .setColor('#0099ff')
                .setTitle(`Tic-Tac-Toe${gameTableSide == 3 ? '!' : '?'}`)
                .setDescription(`**<@!${playerX.user.id}> VS <@!${playerO.user.id}>**\n\n<@!${playerX.user.id}>'s turn!\n\n` +
                    `${ArrayLogic.Stringify(gameTable, [cursor.Get1DIndexFrom2D(gameTableSide)], gameTableSide, XO.CellState_CharDictionary, XO.CellState_OverlayCharDictionary, true)}`)
                .setTimestamp()
                .setFooter({ text: channel.guild.name, iconURL: channel.guild.iconURL() })
            ],
            components: [new Discord.MessageActionRow()
                .addComponents(
                    new Discord.MessageButton()
                    .setCustomId('move_left')
                    .setEmoji('⬅')
                    .setStyle('SECONDARY'),
                ).addComponents(
                    new Discord.MessageButton()
                    .setCustomId('move_right')
                    .setEmoji('➡')
                    .setStyle('SECONDARY'),
                ).addComponents(
                    new Discord.MessageButton()
                    .setCustomId('move_up')
                    .setEmoji('⬆')
                    .setStyle('SECONDARY'),
                )
                .addComponents(
                    new Discord.MessageButton()
                    .setCustomId('move_down')
                    .setEmoji('⬇')
                    .setStyle('SECONDARY'),
                ),
                new Discord.MessageActionRow()
                .addComponents(
                    new Discord.MessageButton()
                    .setCustomId('place')
                    .setLabel('Place')
                    .setStyle('SUCCESS'),
                ).addComponents(
                    new Discord.MessageButton()
                    .setCustomId('stop_game')
                    .setLabel('Stop')
                    .setStyle('DANGER'),
                )
            ],
            ephemeral: false
        });

        /**
         * @param {Discord.ButtonInteraction} buttonInteraction 
         */
        const listener = async buttonInteraction => {
            if (!buttonInteraction.isButton()) return;

            const isCorrectUserReacting = (currentTurn == XO.CurrentTurn_X && buttonInteraction.user.id === playerX.user.id) || (currentTurn == XO.CurrentTurn_O && buttonInteraction.user.id === playerO.user.id);

            switch (buttonInteraction.customId) {
                case 'move_left':
                    if (cursor.X > 0 && isCorrectUserReacting) {
                        cursor.X -= 1; // Moving cursor & updating message then
                        await XO.UpdateEmbed_HumanVSHuman(buttonInteraction, playerX, playerO, gameTable, cursor, currentTurn, gameTableSide);
                    } else {
                        buttonInteraction.deferUpdate();
                    }
                    break;
                case 'move_right':
                    if (cursor.X < gameTableSide - 1 && isCorrectUserReacting) {
                        cursor.X += 1; // Moving cursor & updating message then
                        await XO.UpdateEmbed_HumanVSHuman(buttonInteraction, playerX, playerO, gameTable, cursor, currentTurn, gameTableSide);
                    } else {
                        buttonInteraction.deferUpdate();
                    }
                    break;
                case 'move_up':
                    if (cursor.Y > 0 && isCorrectUserReacting) {
                        cursor.Y -= 1; // Moving cursor & updating message then
                        await XO.UpdateEmbed_HumanVSHuman(buttonInteraction, playerX, playerO, gameTable, cursor, currentTurn, gameTableSide);
                    } else {
                        buttonInteraction.deferUpdate();
                    }
                    break;
                case 'move_down':
                    if (cursor.Y < gameTableSide - 1 && isCorrectUserReacting) {
                        cursor.Y += 1; // Moving cursor & updating message then
                        await XO.UpdateEmbed_HumanVSHuman(buttonInteraction, playerX, playerO, gameTable, cursor, currentTurn, gameTableSide);
                    } else {
                        buttonInteraction.deferUpdate();
                    }
                    break;
                case 'place':
                    if (isCorrectUserReacting && gameTable[cursor.Get1DIndexFrom2D(gameTableSide)] == XO.CellState_None) {
                        gameTable[cursor.Get1DIndexFrom2D(gameTableSide)] = currentTurn == XO.CurrentTurn_X ? XO.CellState_X : XO.CellState_O;
                        if (XO.CheckGameState(gameTable, cursor, gameTableSide) == XO.GameState_Playing) currentTurn *= -1; // :)
                        else {
                            // Updating message including game state
                            await XO.UpdateEmbed_HumanVSHuman(buttonInteraction, playerX, playerO, gameTable, Point.OneInverted, currentTurn, gameTableSide,
                                XO.CheckGameState(gameTable, cursor, gameTableSide));
                            XO.InGame.splice(XO.InGame.indexOf(playerX.user.id));
                            XO.InGame.splice(XO.InGame.indexOf(playerO.user.id));
                            client.removeListener('interactionCreate', listener);
                            break;
                        }
                        await XO.UpdateEmbed_HumanVSHuman(buttonInteraction, playerX, playerO, gameTable, cursor, currentTurn, gameTableSide);
                    } else {
                        buttonInteraction.deferUpdate();
                    }
                    break;
                case 'stop_game':
                    await buttonInteraction.update({ content: `<@!${buttonInteraction.user.id}> has stopped the game.`, embeds: [], components: [] });
                    XO.InGame.splice(XO.InGame.indexOf(playerX.user.id));
                    XO.InGame.splice(XO.InGame.indexOf(playerO.user.id));
                    client.removeListener('interactionCreate', listener);
                    break;
            }
        };
        client.on('interactionCreate', listener);

        return msg.url;
    }

    /**
     * Changes XO Human VS Human game embed message.
     * @param {Discord.ButtonInteraction} interaction Game message.
     * @param {Discord.GuildMember} playerX Player who plays as X.
     * @param {Discord.GuildMember} playerO Player who plays as O.
     * @param {Number[]} gameTable Game table (Values format - CellState).
     * @param {Point} cursor Current cell selection cursor position.
     * @param {Number} currentTurn Current game turn (Format - CurrentTurn).
     * @param {Number} gameTableSide Size of a game table side.
     * @param {Number} gameState Current game state (Format - GameState).
     */
    static async UpdateEmbed_HumanVSHuman(interaction, playerX, playerO, gameTable, cursor, currentTurn, gameTableSide, gameState = XO.GameState_Playing) {
        // Get game status and char dictionaries for embed
        let status = `<@!${currentTurn == XO.CurrentTurn_X ? playerX.user.id : playerO.user.id}>'s turn!`;
        // Set Turn Status to Win Status if needed
        if (gameState != XO.GameState_Playing) {
            switch (gameState) {
                case XO.GameState_XWon:
                    status = `Game Ended! <@!${playerX.user.id}> won!`
                    break;
                case XO.GameState_OWon:
                    status = `Game Ended! <@!${playerO.user.id}> won!`
                    break;
                case XO.GameState_Draw:
                    status = 'Game Ended! Draw :/';
                    break;
            }
        }
        // Edit embed
        interaction.update({
            embeds: [new Discord.MessageEmbed()
                .setColor('#0099ff')
                .setTitle(`Tic-Tac-Toe${gameTableSide == 3 ? '!' : '?'}`)
                .setDescription(`**<@!${playerX.user.id}> VS <@!${playerO.user.id}>**\n\n${status}\n\n` +
                    `${ArrayLogic.Stringify(gameTable, [cursor.Get1DIndexFrom2D(gameTableSide)], gameTableSide, XO.CellState_CharDictionary, XO.CellState_OverlayCharDictionary, true)}`)
                .setTimestamp()
                .setFooter({ text: interaction.guild.name, iconURL: interaction.guild.iconURL() })
            ],
            components: gameState != XO.GameState_Playing ? [] : undefined
        });
    }

    /**
     * Checks the game state and returns it (Format - XO.GameState).
     * @param {Number[]} gameTable Game table (Values format - XO.CellState).
     * @param {Point} lastMove Last move done in the game.
     * @param {Number} gameTableSide Size of a side in a game table.
     * @returns {Number} Current game state.
     */
    static CheckGameState(gameTable, lastMove, gameTableSide) {
        let gameTableSize = Size.GetSizeFromSide(gameTableSide);
        // Check if every cell is filled
        let gameTableFilled = true;
        let moveSign = gameTable[lastMove.Get1DIndexFrom2D(gameTableSide)];
        for (let i = 0; i < gameTable.length; i++)
            if (gameTable[i] == 0) gameTableFilled = false;
            // Check if there is any win combination (Shoot 4 rays)
        if (ArrayLogic.ShootCheckerRay2(lastMove, Point.DirectionLeft, gameTable, gameTableSize, [moveSign], gameTableSide) ||
            ArrayLogic.ShootCheckerRay2(lastMove, Point.DirectionUpLeft, gameTable, gameTableSize, [moveSign], gameTableSide) ||
            ArrayLogic.ShootCheckerRay2(lastMove, Point.DirectionUp, gameTable, gameTableSize, [moveSign], gameTableSide) ||
            ArrayLogic.ShootCheckerRay2(lastMove, Point.DirectionUpRight, gameTable, gameTableSize, [moveSign], gameTableSide)) {
            database.query('UPDATE statistics SET xo_gamesplayed = xo_gamesplayed + 1;');
            return moveSign == XO.CellState_X ? XO.GameState_XWon : XO.GameState_OWon; // If there is/are a win combination(s), some player won
        } else if (gameTableFilled) { // If there are no win combinations, but the game table is filled, it is a draw
            database.query('UPDATE statistics SET xo_gamesplayed = xo_gamesplayed + 1;');
            return XO.GameState_Draw;
        } else return XO.GameState_Playing;
    }

    //#endregion
}

module.exports = XO;