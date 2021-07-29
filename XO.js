const Discord = require('discord.js')
const { Point, Size, ArrayLogic } = require('./ArrayHelper.js')
const Mathf = require('./Mathf.js');
const database = require('./Database.js');

module.exports = class XO {
  //#region Enums

  static BotDifficulty = Object.freeze({
    Easy: 0,
    Normal: 1,
    Hard: 2
  });

  static CellState = Object.freeze({
    None: 0,
    X: 1,
    O: 2
  });

  static CurrentTurn = Object.freeze({
    X: 0,
    O: 1
  });

  static GameState = Object.freeze({
    XWon: 0,
    OWon: 1,
    Draw: 2,
    Playing: 3
  });

  static CellStateCharDictionary = Object.freeze({ 
    '<:XO_CellNone:843900699989114930>': XO.CellState.None, 
    '<:XO_CellX:843900699976269835>': XO.CellState.X, 
    '<:XO_CellO:843900699937996891>': XO.CellState.O 
  });
  static CellStateOverlayCharDictionary = Object.freeze({ 
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
   * @param {Number} playerSign Sign, that the player uses (Format - CurrentTurn).
   */
  static HumanVSBot(player, difficulty, channel, gameTableSide, playerSign) {
    gameTableSide = Mathf.clamp(gameTableSide, 3, 7);
    let gameTable = ArrayLogic.CreateArray(Size.GetSizeFromSide(gameTableSide), XO.CellState.None);
    let cursor = new Point(Math.floor((gameTableSide - 1) / 2), Math.floor((gameTableSide - 1) / 2));
    let lastBotMove = playerSign == XO.CurrentTurn.O ? XO.MakeABotMove(difficulty, gameTable, playerSign, gameTableSide, cursor, Point.OneInverted) : Point.OneInverted; 
    if(!XO.InGame.includes(player.user.id)) XO.InGame.push(player.user.id);
    // Send a game message
    channel.send(new Discord.MessageEmbed()
      .setColor('#0099ff')
      .setTitle(`Tic-Tac-Toe${gameTableSide == 3 ? '!' : '?'}`)
      .setDescription(`**<@!${player.user.id}> VS Bot (${difficulty == XO.BotDifficulty.Easy ? 'Easy' : difficulty == XO.BotDifficulty.Normal ? 'Normal' : 'Hard'})**\n\n` +
      `${ArrayLogic.Stringify(gameTable, [cursor.Get1DIndexFrom2D(gameTableSide)], gameTableSide, XO.CellStateCharDictionary, XO.CellStateOverlayCharDictionary, true)}`)
      .setTimestamp()
      .setFooter(channel.guild.name, channel.guild.iconURL()))
    .then(message => {
      //#region Add reactions
      message.react('⬅️');
      message.react('➡️');
      message.react('⬆️');
      message.react('⬇️');
      message.react('✅');
      message.react('🛑');
      //#endregion

      //#region Reaction events
      const filter = (reaction, user) => user.id === player.user.id;
      const collector = message.createReactionCollector(filter, { dispose: true });
      collector.on('collect', (reaction, user) => {
        switch(reaction.emoji.name) {
          // Controls (Arrows)
          case '⬅️':
            if(cursor.X > 0) {       
              cursor.X -= 1;
              XO.UpdateEmbed_HumanVSBot(message, player, playerSign, difficulty, gameTable, cursor, gameTableSide);
            }
            break;
          case '➡️':
            if(cursor.X < gameTableSide - 1) {             
              cursor.X += 1;
              XO.UpdateEmbed_HumanVSBot(message, player, playerSign, difficulty, gameTable, cursor, gameTableSide);
            }
            break;
          case '⬆️':
            if(cursor.Y > 0) {             
              cursor.Y -= 1;
              XO.UpdateEmbed_HumanVSBot(message, player, playerSign, difficulty, gameTable, cursor, gameTableSide);
            }
            break;
          case '⬇️':
            if(cursor.Y < gameTableSide - 1) {             
              cursor.Y += 1;
              XO.UpdateEmbed_HumanVSBot(message, player, playerSign, difficulty, gameTable, cursor, gameTableSide);
            }
            break;
          // Controls (Place Tile)
          case '✅':           
            if(gameTable[cursor.Get1DIndexFrom2D(gameTableSide)] == XO.CellState.None) {                     
              gameTable[cursor.Get1DIndexFrom2D(gameTableSide)] = playerSign == XO.CurrentTurn.X ? XO.CellState.X : XO.CellState.O;
              if(XO.CheckGameState(gameTable, cursor, gameTableSide) != XO.GameState.Playing) {
                message.reactions.removeAll();
                XO.UpdateEmbed_HumanVSBot(message, player, playerSign, difficulty, gameTable, Point.OneInverted, gameTableSide, XO.CheckGameState(gameTable, cursor, gameTableSide));
                XO.InGame.splice(XO.InGame.indexOf(player.user.id));
              } else {
                lastBotMove = XO.MakeABotMove(difficulty, gameTable, playerSign, gameTableSide, cursor, lastBotMove);        
                if(XO.CheckGameState(gameTable, cursor, gameTableSide) != XO.GameState.Playing) {
                  message.reactions.removeAll();
                  XO.InGame.splice(XO.InGame.indexOf(player.user.id));
                  XO.UpdateEmbed_HumanVSBot(message, player, playerSign, difficulty, gameTable, Point.OneInverted, gameTableSide, XO.CheckGameState(gameTable, cursor, gameTableSide));
                }
                XO.UpdateEmbed_HumanVSBot(message, player, playerSign, difficulty, gameTable, cursor, gameTableSide, XO.CheckGameState(gameTable, cursor, gameTableSide));          
              }
            }
            break;
          // Controls (Stop Game)
          case '🛑':
            message.delete();
            channel.send(`<@!${user.id}> has stopped the game.`);
            XO.InGame.splice(XO.InGame.indexOf(player.user.id));
            break;
        }
      });
      //#endregion

      collector.on('remove', (reaction, user) => {
        collector.handleCollect(reaction, user);
      });
    });
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
    let botCellState = playerSign == XO.CurrentTurn.X ? XO.CellState.O : XO.CellState.X;
    let gameTableSize = Size.GetSizeFromSide(gameTableSide);
    switch(difficulty) {
      case XO.BotDifficulty.Easy: 
        // Just do a random move
        let possibleMoves = XO.GetPossibleMoves(gameTable);
        let randomNumber = Mathf.randomInt(0, possibleMoves.length);
        gameTable[possibleMoves[randomNumber]] = botCellState;
        return Point.Get2DIndexFrom1D(possibleMoves[randomNumber], gameTableSize);
      case XO.BotDifficulty.Normal:
        // Get one-move win moves for the bot and human player
        let botWinMoves = XO.GetPotentionalWinMoves(gameTable, -playerSign, gameTableSide, lastBotMove, 1);
        let playerWinMoves = XO.GetPotentionalWinMoves(gameTable, playerSign, gameTableSide, lastPlayerMove, 1);
        if(botWinMoves.length > 0) { // If the bot can win in one move, do that move
          let randomNumber = Mathf.randomInt(0, botWinMoves.length);
          gameTable[botWinMoves[randomNumber][0].Get1DIndexFrom2D(gameTableSide)] = botCellState;
          return botWinMoves[randomNumber][0];
        } else if(playerWinMoves.length > 0) { // If player can win in one move, block the player         
          let randomNumber = Mathf.randomInt(0, playerWinMoves.length);
          gameTable[playerWinMoves[randomNumber][0].Get1DIndexFrom2D(gameTableSide)] = botCellState;
          return playerWinMoves[randomNumber][0];
        } else { // Else just do a random move
          let possibleMoves = XO.GetPossibleMoves(gameTable);
          let randomNumber = Mathf.randomInt(0, possibleMoves.length);
          gameTable[possibleMoves[randomNumber]] = botCellState;
          return Point.Get2DIndexFrom1D(possibleMoves[randomNumber], gameTableSize);
        }
      case XO.BotDifficulty.Hard:
        if(lastBotMove == Point.OneInverted) { // Do the first move, if not done yet
          let tableCenter = new Point(Math.floor((gameTableSide - 1) / 2), Math.floor((gameTableSide - 1) / 2));
          // Occupy the center if table size is even and if it is not occupied yet
          if(gameTableSide % 2 == 0 && gameTable[tableCenter.Get1DIndexFrom2D(gameTableSide)] == XO.CellState.None) {
            gameTable[tableCenter.Get1DIndexFrom2D(gameTableSide)] = botCellState;
            return tableCenter;
          } else { // Else occupy the corners
            let corner = new Point(Mathf.randomBool() ? 0 : gameTableSide - 1, Mathf.randomBool() ? 0 : gameTableSide - 1);
            gameTable[corner.Get1DIndexFrom2D(gameTableSide)] = botCellState;
            return corner;
          }
        } else {
          // Get prefferable moves for bot (that may lead to win), one-move wins for bot and one-move wins for player
          let botWinMoves = XO.GetPotentionalWinMoves(gameTable, -playerSign, gameTableSide, lastBotMove, 1);
          let botGoodMoves = XO.GetPotentionalWinMoves(gameTable, -playerSign, gameTableSide, lastBotMove, gameTableSide - 1);
          let playerWinMoves = XO.GetPotentionalWinMoves(gameTable, playerSign, gameTableSide, lastPlayerMove, 1);
          if(botWinMoves.length > 0) { // If the bot can win in one move, do that move
            let randomNumber = Mathf.randomInt(0, botWinMoves.length);
            gameTable[botWinMoves[randomNumber][0].Get1DIndexFrom2D(gameTableSide)] = botCellState;
            return botWinMoves[randomNumber][0];
          } else if(playerWinMoves.length > 0) { // If player can win in one move, block the player
            let randomNumber = Mathf.randomInt(0, playerWinMoves.length);
            gameTable[playerWinMoves[randomNumber][0].Get1DIndexFrom2D(gameTableSide)] = botCellState;
            return playerWinMoves[randomNumber][0];
          } else if(botGoodMoves.length > 0) { // If the bot have moves, that may lead to win, do the best move
            let currentBestMove = Point.OneInverted;
            let currentLowestCombinationLength = gameTableSide - 1;
            for(let i = 0; i < botGoodMoves.length; i++) {
              if(botGoodMoves[i].length > currentLowestCombinationLength) continue;
              else if(botGoodMoves[i].length < currentLowestCombinationLength) 
                currentLowestCombinationLength = botGoodMoves[i].length;
              for(let j = 0; j < botGoodMoves[i].length; j++)
                currentBestMove = botGoodMoves[i][Mathf.randomInt(0, botGoodMoves[i].length)];
            }
            gameTable[currentBestMove.Get1DIndexFrom2D(gameTableSide)] = botCellState;
            return currentBestMove;
          } else { // Else just do a random move
            let possibleMoves = XO.GetPossibleMoves(gameTable);
            let randomNumber = Mathf.randomInt(0, possibleMoves.length);
            gameTable[possibleMoves[randomNumber]] = botCellState;
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
    return gameTable.findIndexes(num => num == XO.CellState.None);
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
    let playerCellState = playerSign == XO.CurrentTurn.X ? XO.CellState.X : XO.CellState.O;
    let gameTableSize = Size.GetSizeFromSide(gameTableSide);
    let winCombinations = [];
    if(!lastMove.IsOutOfBounds(gameTableSize)) {
      for(let i = 0; i < 4; i++) { // Shoot info rays in a half of directions (note: they bounce)
        let direction = i == 0 ? Point.DirectionLeft : i == 1 ? Point.DirectionUpLeft : i == 2 ? Point.DirectionUp : Point.DirectionUpRight;
        let info = ArrayLogic.ShootInfoRay(lastMove, gameTableSide, direction, gameTable, gameTableSize, [playerCellState, XO.CellState.None], true, ArrayLogic.InfoRayReturn.Both);
        // Add point into movesToWin array if point is empty and meeting certain conditions
        if(info[1][XO.CellState.None] <= movesToWin && info[0].length == gameTableSide)
          winCombinations.push(info[0].filter(point => gameTable[point.Get1DIndexFrom2D(gameTableSide)] == XO.CellState.None));
      }
    }
    return winCombinations;
  }

  /**
   * Changes XO Human VS Bot game embed message.
   * @param {Discord.Message} message Game message.
   * @param {Discord.GuildMember} player The human player.
   * @param {Number} playerSign What sign player plays as (Format - CurrentTurn).
   * @param {Number} difficulty The bot's difficulty (Format - BotDifficulty).
   * @param {Number[]} gameTable Game table (Values format - CellState).
   * @param {Point} cursor Current cell selection cursor position.
   * @param {Number} gameTableSide Size of a game table side.
   * @param {Number} gameState Current game state (Format - GameState).
   */
  static UpdateEmbed_HumanVSBot(message, player, playerSign, difficulty, gameTable, cursor, gameTableSide, gameState = XO.GameState.Playing) {
    let status = ``;
    if(gameState != XO.GameState.Playing) {
      switch(gameState) {
        case playerSign == XO.CurrentTurn.X ? XO.GameState.XWon : XO.GameState.OWon:
          status = `\nGame Ended! <@!${player.user.id}> won!\n`
          break;
        case playerSign == XO.CurrentTurn.X ? XO.GameState.OWon : XO.GameState.XWon:
          status = `\nGame Ended! Bot (${difficulty == XO.BotDifficulty.Easy ? 'Easy' : difficulty == XO.BotDifficulty.Normal ? 'Normal' : 'Hard'}) won!\n`
          break;
        case XO.GameState.Draw:
          status = '\nGame Ended! Draw :/\n';
          break;
      }
    }
    message.edit(new Discord.MessageEmbed()
      .setColor('#0099ff') 
      .setTitle(`Tic-Tac-Toe${gameTableSide == 3 ? '!' : '?'}`)   
      .setDescription(`**<@!${player.user.id}> VS Bot (${difficulty == XO.BotDifficulty.Easy ? 'Easy' : difficulty == XO.BotDifficulty.Normal ? 'Normal' : 'Hard'})**\n${status}\n` +
      `${ArrayLogic.Stringify(gameTable, [cursor.Get1DIndexFrom2D(gameTableSide)], gameTableSide, XO.CellStateCharDictionary, XO.CellStateOverlayCharDictionary, true)}`)
      .setTimestamp()
      .setFooter(message.guild.name, message.guild.iconURL()));
  }

  /**
   * Starts a new Human VS Human XO Game.
   * @param {Discord.GuildMember} playerX Player who plays as X.
   * @param {Discord.GuildMember} playerO Player who plays as O.
   * @param {Discord.TextChannel} channel Text Channel, where the game will be.
   * @param {Discord.GuildMember} requestedPlayer Player who got the game request.
   * @param {Number} gameTableSide Size of a game table side.
   */
  static HumanVSHuman(playerX, playerO, requestedPlayer, channel, gameTableSide) {
    let currentTurn = XO.CurrentTurn.X;
    gameTableSide = Mathf.clamp(gameTableSide, 3, 7);
    let gameTable = ArrayLogic.CreateArray(Size.GetSizeFromSide(gameTableSide), XO.CellState.None);
    let cursor = new Point(Math.floor((gameTableSide - 1) / 2), Math.floor((gameTableSide - 1) / 2));
    if(!XO.InGame.includes(playerX.user.id)) XO.InGame.push(playerX.user.id);
    if(!XO.InGame.includes(playerO.user.id)) XO.InGame.push(playerO.user.id);
    // Send a game message
    channel.send(new Discord.MessageEmbed()
      .setColor('#0099ff') 
      .setTitle(`Tic-Tac-Toe${gameTableSide == 3 ? '!' : '?'}`)     
      .setDescription(`**<@!${playerX.user.id}> VS <@!${playerO.user.id}>**\n\n<@!${playerX.user.id}>'s turn!\n\n` +
      `${ArrayLogic.Stringify(gameTable, [cursor.Get1DIndexFrom2D(gameTableSide)], gameTableSide, XO.CellStateCharDictionary, XO.CellStateOverlayCharDictionary, true)}`)
      .setTimestamp()
      .setFooter(channel.guild.name, channel.guild.iconURL()))
    .then(message => {
      requestedPlayer.user.send('Game (message) link: ' + message.url);
      //#region Add reactions
      message.react('⬅️');
      message.react('➡️');
      message.react('⬆️');
      message.react('⬇️');
      message.react('✅');
      message.react('🛑');
      //#endregion

      //#region Reaction events
      const filter = (reaction, user) => user.id === playerX.user.id || user.id === playerO.user.id;
      const collector = message.createReactionCollector(filter, { dispose: true });
      collector.on('collect', (reaction, user) => {
        const isCorrectUserReacting = (currentTurn == XO.CurrentTurn.X && user.id === playerX.user.id) || (currentTurn == XO.CurrentTurn.O && user.id === playerO.user.id);
        switch(reaction.emoji.name) {
          // Controls (Arrows)
          case '⬅️':
            if(cursor.X > 0 && isCorrectUserReacting) {       
              cursor.X -= 1;
              XO.UpdateEmbed_HumanVSHuman(message, playerX, playerO, gameTable, cursor, currentTurn, gameTableSide); 
            }
            break;
          case '➡️':
            if(cursor.X < gameTableSide - 1 && isCorrectUserReacting) {             
              cursor.X += 1;
              XO.UpdateEmbed_HumanVSHuman(message, playerX, playerO, gameTable, cursor, currentTurn, gameTableSide);
            }
            break;
          case '⬆️':
            if(cursor.Y > 0 && isCorrectUserReacting) {             
              cursor.Y -= 1;
              XO.UpdateEmbed_HumanVSHuman(message, playerX, playerO, gameTable, cursor, currentTurn, gameTableSide);
            }
            break;
          case '⬇️':
            if(cursor.Y < gameTableSide - 1 && isCorrectUserReacting) {             
              cursor.Y += 1;
              XO.UpdateEmbed_HumanVSHuman(message, playerX, playerO, gameTable, cursor, currentTurn, gameTableSide);
            }
            break;
          // Controls (Place Tile)
          case '✅':           
            if(isCorrectUserReacting && gameTable[cursor.Get1DIndexFrom2D(gameTableSide)] == XO.CellState.None) {        
              gameTable[cursor.Get1DIndexFrom2D(gameTableSide)] = currentTurn == XO.CurrentTurn.X ? XO.CellState.X : XO.CellState.O;
              if(XO.CheckGameState(gameTable, cursor, gameTableSide) == XO.GameState.Playing) currentTurn = currentTurn == XO.CurrentTurn.X ? XO.CurrentTurn.O : XO.CurrentTurn.X;
              else {
                message.reactions.removeAll();     
                // Updating message including game state
                XO.UpdateEmbed_HumanVSHuman(message, playerX, playerO, gameTable, Point.OneInverted, currentTurn, gameTableSide, XO.CheckGameState(gameTable, cursor, gameTableSide));            
                XO.InGame.splice(XO.InGame.indexOf(playerX.user.id));
                XO.InGame.splice(XO.InGame.indexOf(playerO.user.id));
                break;
              }
              XO.UpdateEmbed_HumanVSHuman(message, playerX, playerO, gameTable, cursor, currentTurn, gameTableSide);
            }
            break;
          // Controls (Stop Game)
          case '🛑':
            message.delete();
            channel.send(`<@!${user.id}> has the stopped game.`);
            XO.InGame.splice(XO.InGame.indexOf(playerX.user.id));
            XO.InGame.splice(XO.InGame.indexOf(playerO.user.id));
            break;
        }
      });
      //#endregion

      collector.on('remove', (reaction, user) => {
        collector.handleCollect(reaction, user);
      });
    });
  }

  /**
  * Changes XO Human VS Human game embed message.
  * @param {Discord.Message} message Game message.
  * @param {Discord.GuildMember} playerX Player who plays as X.
  * @param {Discord.GuildMember} playerO Player who plays as O.
  * @param {Number[]} gameTable Game table (Values format - CellState).
  * @param {Point} cursor Current cell selection cursor position.
  * @param {Number} currentTurn Current game turn (Format - CurrentTurn).
  * @param {Number} gameTableSide Size of a game table side.
  * @param {Number} gameState Current game state (Format - GameState).
  */
  static UpdateEmbed_HumanVSHuman(message, playerX, playerO, gameTable, cursor, currentTurn, gameTableSide, gameState = XO.GameState.Playing) {
    let status = `<@!${currentTurn == XO.CurrentTurn.X ? playerX.user.id : playerO.user.id}>'s turn!`;
    if(gameState != XO.GameState.Playing) {
      switch(gameState) {
        case XO.GameState.XWon:
          status = `Game Ended! <@!${playerX.user.id}> won!`
          break;
        case XO.GameState.OWon:
          status = `Game Ended! <@!${playerO.user.id}> won!`
          break;
        case XO.GameState.Draw:
          status = 'Game Ended! Draw :/';
          break;
      }
    }
    message.edit(new Discord.MessageEmbed()
      .setColor('#0099ff') 
      .setTitle(`Tic-Tac-Toe${gameTableSide == 3 ? '!' : '?'}`)
      .setDescription(`**<@!${playerX.user.id}> VS <@!${playerO.user.id}>**\n\n${status}\n\n` +
      `${ArrayLogic.Stringify(gameTable, [cursor.Get1DIndexFrom2D(gameTableSide)], gameTableSide, XO.CellStateCharDictionary, XO.CellStateOverlayCharDictionary, true)}`)
      .setTimestamp()
      .setFooter(message.guild.name, message.guild.iconURL()));
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
    let gameTableFilled = true;
    let moveSign = gameTable[lastMove.Get1DIndexFrom2D(gameTableSide)];
    for(let i = 0; i < gameTable.length; i++) if(gameTable[i] == 0) gameTableFilled = false;
    // Check if there are any win combinations
    if(ArrayLogic.ShootCheckerRay2(lastMove, Point.DirectionLeft, gameTable, gameTableSize, [moveSign], gameTableSide)
    || ArrayLogic.ShootCheckerRay2(lastMove, Point.DirectionUpLeft, gameTable, gameTableSize, [moveSign], gameTableSide)
    || ArrayLogic.ShootCheckerRay2(lastMove, Point.DirectionUp, gameTable, gameTableSize, [moveSign], gameTableSide)
    || ArrayLogic.ShootCheckerRay2(lastMove, Point.DirectionUpRight, gameTable, gameTableSize, [moveSign], gameTableSide)) {
      // Update the database GAMESPLAYED and LASTGAME values
      database.query(`UPDATE statistics SET xo_gamesplayed = xo_gamesplayed + 1; UPDATE statistics SET xo_lastgame = ${new Date().getTime() };`);
      return moveSign == XO.CellState.X ? XO.GameState.XWon : XO.GameState.OWon;
    }
    else if(gameTableFilled) {
      // Update the database GAMESPLAYED and LASTGAME values
      database.query(`UPDATE statistics SET xo_gamesplayed = xo_gamesplayed + 1; UPDATE statistics SET xo_lastgame = ${new Date().getTime() };`);
      return XO.GameState.Draw;
    }
    else return XO.GameState.Playing;
  }

  //#endregion
}
