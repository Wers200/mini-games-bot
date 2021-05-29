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


// Global Variables
const Discord = require('discord.js');
const client = new Discord.Client();
const { Client } = require('pg');
const psql_client = new Client({
  connectionString: process.env.DATABASE_URL
})

//#region Helper classes

class Mathf {
  /**
   * 
   * @param {Number} min The lower bound float value.
   * @param {Number} max The upper bound float value.
   * @returns {Number} The random float value between min and max.
   */
  static random(min, max) {
    return Math.random() * (max - min) + min;
  }
  
  /**
   * 
   * @param {Number} min The lower bound floating point value.
   * @param {Number} max The upper bound floating point value.
   * @returns {Number} The random integer value between min and max.
   */
  static randomInt(min, max) {
    return Math.floor(Math.random() * (max - min)) + min;
  }

  /**
   * 
   * @returns {Boolean} Pseudorandom boolean value.
   */
  static randomBool() {
    return Math.random() > 0.5 ? true : false;
  }
  
  /**
   * 
   * @param {Number} value The float value to restrict inside the range defined by the `min` and `max` values.
   * @param {Number} min The minimum float value to compare against.
   * @param {Number} max The maximum float value to compare against.
   * @returns {Number} The float value restricted inside the range defined by the `min` and `max` values.
   */
  static clamp(value, min, max) {
    return Math.max(min, Math.min(value, max));
  }

  /**
   * 
   * @param {Number} a The start value.
   * @param {Number} b The end value.
   * @param {Number} t The interpolation value between the two float values.
   * @returns {Number} The interpolated float result between two float values.
   */
  static lerp(a, b, t) {
    return a + (b - a) * t;
  }
}

class Optimized2DArrayLogic { 
  static InfoRayReturn_Points = Object.freeze(0); // Return only points passed by ray
  static InfoRayReturn_ValuesInfoInfo = Object.freeze(1); // Return only info about numbers encountered by ray
  static InfoRayReturn_Both = Object.freeze(2); // Return both of above

  /**
   * Creates new Optimized 2D array (shorthand).
   * @param {Size} size The size of new array.
   * @param {Number} fill The number to fill new array with.
   * @returns {Number[]} New Optimized 2D array.
   */
  static CreateArray(size, fill = 0) {
    /**@type {Number[]} array */
    let array = new Array(size.Area);
    array.fill(fill);
    return array;
  }

  /**
   * Stringifies your Optimized 2D array.
   * @param {Number[]} array Array of numbers to stringify.
   * @param {Number[]} overlay The array of indexes, that will make overlayed string used instead of original string if they match an array's index.
   * @param {Number} arrayWidth The array width value.
   * @param {Array} charDictionary Dictionary containing array's values and their string representations (Format: Key - String, Value - Number)
   * @param {Array} overlayCharDictionary Dictionary, used to overlay `charDictionary` via `overlay` (Format: Key - Original, Value - Overlay)
   * @param {Boolean} putNewLine Makes algorithm put new line before new row.
   * @returns {String} Stringified version of `array`.
   */
  static Stringify(array, overlay, arrayWidth, charDictionary, overlayCharDictionary, putNewLine) {
    let stringifiedArray = '';
    for(let i = 0; i < array.length; i++) {
      // Add new line if before writing new row.
      if(i % arrayWidth == 0 && putNewLine && i > 0) stringifiedArray += '\n';
      // Get the next char/string
      const currentChar = Object.keys(charDictionary).find(key => charDictionary[key] === array[i]);
      // Place the next char/string
      if(overlay.includes(i)) stringifiedArray += overlayCharDictionary[currentChar];
      else stringifiedArray += currentChar;
    }
    return stringifiedArray;
  }

  /** 
   * Checks if there is `requiredLength` of `requiredNumbers` in a row (1 Ray).
   * @param {Point} position The point where ray spawns.
   * @param {Point} move The point added to current ray position each cycle.
   * @param {Number[]} array The Optimized 2D array for moving the ray.
   * @param {Size} arraySize The size of Optimized 2D array.
   * @param {Number[]} requiredNumbers Number(s) allowing ray to not break.
   * @param {Number} requiredLength Length ray needs to pass.
   * @param {Boolean} bounce Should ray bounce after breaking once.
   * @returns {Boolean} Did ray pass `requiredLength`.
   */
  static ShootCheckerRay(position, move, array, arraySize, requiredNumbers, requiredLength, bounce) {
    for(let i = 0; i < requiredLength; i++) {
      if(i == requiredLength - 1) return true; // If needed length is passed, return true
      const nextPosition = new Point(position.X + move.X, position.Y + move.Y);
      const isRequiredNumberOnNextPosition = requiredNumbers.includes(array[nextPosition.Get1DIndexFrom2D(arraySize.Width)]);
      const moveConditions = !nextPosition.IsOutOfBounds(arraySize) && isRequiredNumberOnNextPosition;
      if(moveConditions) position = nextPosition; // Move ray if certain conditions are met
      else if(bounce) return this.ShootCheckerRay(position, lifetime, new Point(-move.X , -move.Y), 
        array, arraySize, requiredNumbers, requiredLength, false); // Make ray bounce (spawn it with inverted direction)
      else return false;
    }
  }

  /**
   * Checks if there is `requiredLength` of `requiredNumbers` in a row (2 Rays).
   * @param {Point} position The point where rays spawn.
   * @param {Point} move The point added to current ray position each cycle.
   * @param {Number[]} array The Optimized 2D array for moving the ray.
   * @param {Size} arraySize The size of Optimized 2D array.
   * @param {Number[]} requiredNumbers Number(s) allowing rays to not break.
   * @param {Number} requiredLength How many numbers in a row need to be hit.
   * @returns {Boolean} Did rays pass needed length.
   */
  static ShootCheckerRay2(position, move, array, arraySize, requiredNumbers, requiredLength) {
    let firstRayPassed = -1; // How much did first (non-inverted direction) ray passed
    let secondRayPassed = -1; // How much did second (inverted direction) ray passed
    let currentOffset = Point.Zero;
    for(let currentLength = 0; currentLength < requiredLength; currentLength++) {
      // Adjust Current Offset
      if(firstRayPassed == -1 || secondRayPassed == -1) currentOffset = new Point(currentOffset.X + move.X, currentOffset.Y + move.Y);
      // Check First Ray
      if(firstRayPassed == -1) {
        const currentPosition = new Point(position.X + currentOffset.X, position.Y + currentOffset.Y);
        const isRequiredNumberOnCurrentPosition = requiredNumbers.includes(array[currentPosition.Get1DIndexFrom2D(arraySize.Width)]);
        const moveConditions = !currentPosition.IsOutOfBounds(arraySize) && isRequiredNumberOnCurrentPosition;
        if(!moveConditions) firstRayPassed = currentLength; // If need to break first ray, write how much it passed
      }
      // Check Second Ray
      if(secondRayPassed == -1) {
        const currentPosition = new Point(position.X - currentOffset.X, position.Y - currentOffset.Y);
        const isRequiredNumberOnCurrentPosition = requiredNumbers.includes(array[currentPosition.Get1DIndexFrom2D(arraySize.Width)]);
        const moveConditions = !currentPosition.IsOutOfBounds(arraySize) && isRequiredNumberOnCurrentPosition;
        if(!moveConditions) secondRayPassed = currentLength; // If need to break second ray, write how much it passed
      }
      // Return result if both rays broke
      if(firstRayPassed != -1 && secondRayPassed != -1) return (firstRayPassed + secondRayPassed) + 1 == requiredLength;
    } 
  }

  /**
   * Shoots ray, which returns info about the passed path.
   * 
   * Info return formats:
   * 
   * `InfoRayReturn_Points`: Returns points array.
   * 
   * `InfoRayReturn_ValuesInfo`: Returns array values info (Format - Value: How many times encountered).
   * 
   * `InfoRayReturn_Both`: Returns both (Format - [Points, Number Info]).
   * @param {Point} position The point where ray spawns.
   * @param {Number} lifetime How many iterations ray can pass.
   * @param {Point} move The value added to current ray position each cycle.
   * @param {Number[]} array The Optimized 2D array for moving ray.
   * @param {Size} arraySize The size of Optimized 2D array.
   * @param {Number[]} requiredNumbers Number(s) allowing ray to not break.
   * @param {Boolean} bounce Should ray bounce after breaking once.
   * @param {Number} returnType What to return (Format - InfoRayReturn)
   * @returns Array of points the ray passed, `move` variable and how many cells the ray have passed.
   */
  static ShootInfoRay(position, lifetime, move, array, arraySize, requiredNumbers, bounce, returnType) {
    // Add info/other variables
    /**@type {Point[]} path */
    let path = [];
    let numberInfo = {};
    requiredNumbers.forEach(number => numberInfo[number] = 0);
    let numberOnStartPosition = array[position.Get1DIndexFrom2D(arraySize.Width)];
    // Check if start position is meeting needed conditions
    if(requiredNumbers.includes(numberOnStartPosition) && !position.IsOutOfBounds(arraySize)) {
      if(returnType != this.InfoRayReturn_ValuesInfo) path.push(position); // Add start position to the path
      if(returnType != this.InfoRayReturn_Points) numberInfo[numberOnStartPosition]++; // Add start position's number to the numberInfo
      for(let i = 0; i <= lifetime; i++) { 
        // Make conditions for moving & some variables
        const nextPosition = new Point(position.X + move.X, position.Y + move.Y);
        const numberOnNextPosition = array[nextPosition.Get1DIndexFrom2D(arraySize.Width)];
        const isRequiredNumberOnNextPosition = requiredNumbers.includes(numberOnNextPosition);
        const moveConditions = !nextPosition.IsOutOfBounds(arraySize) && isRequiredNumberOnNextPosition;
        if(moveConditions) { // If the next position is meeting needed conditions, move the ray
          if(returnType != this.InfoRayReturn_ValuesInfo) path.push(nextPosition); // Add position to the path
          if(returnType != this.InfoRayReturn_Points) numberInfo[numberOnNextPosition]++;
          position = nextPosition; // Move ray if next position is not out of bounds
        }
        else if(bounce) return this.ShootInfoRay(position, lifetime, new Point(-move.X , -move.Y), 
          array, arraySize, requiredNumbers, false, returnType); // Make ray bounce (spawn it with inverted direction)
        else return returnType == this.InfoRayReturn_Points ? path : returnType == this.InfoRayReturn_ValuesInfo ? numberInfo : [path, numberInfo];
      }
    } else return undefined;
  }
}

class Point {
  // Directions
  static DirectionLeft = Object.freeze(new Point(-1, 0));
  static DirectionUpLeft = Object.freeze(new Point(-1, -1));
  static DirectionUp = Object.freeze(new Point(0, -1));
  static DirectionUpRight = Object.freeze(new Point(1, -1));
  static DirectionRight = Object.freeze(new Point(1, 0));
  static DirectionDownRight = Object.freeze(new Point(1, 1));
  static DirectionDown = Object.freeze(new Point(0, 1));
  static DirectionDownLeft = Object.freeze(new Point(-1, 1));

  // Other shorthands
  static Zero = Object.freeze(new Point(0, 0));
  static One = Object.freeze(new Point(1, 1));
  static OneInverted = Object.freeze(new Point(-1, -1));
  static Empty = Object.freeze(new Point(null, null));

  /**
   * 
   * @param {Number} x The horizontal position of your point.
   * @param {Number} y The vertical position of your point.
   */
  constructor(x, y) {
    this.X = x;
    this.Y = y;
  }

  /**
   * @param {Number} arrayWidth The array width value.
   * @returns {Number} Index of your point in 1D array.
   */
  Get1DIndexFrom2D(arrayWidth) {
    return Math.floor(this.Y * arrayWidth + this.X);
  }

  /**
   * @param {Number} index Index of your point in 1D array.
   * @param {Size} arraySize Size of array.
   * @returns {Point} Index of your point in 2D array.
   */
  static Get2DIndexFrom1D(index, arraySize) { // Another utility function
    return new Point(index % arraySize.Width, Math.floor(index / arraySize.Width));
  }

  /**
   * 
   * @param {Size} arraySize Size of array.
   * @returns {Boolean} Is your point out of array's bounds.
   */
  IsOutOfBounds(arraySize) {
    const IsSmallerThanRange = this.X < 0 || this.Y < 0;
    const IsBiggerThanRange = this.X > (arraySize.Width - 1) || this.Y > (arraySize.Height - 1);
    return IsSmallerThanRange || IsBiggerThanRange;
  }
}

class Size {
  /**
   * 
   * @param {Number} width The width value.
   * @param {Number} height The height value.
   */
  constructor(width, height) {
    this.Width = width;
    this.Height = height;
  }

  /**
   * Returns area of this size rectangle.
   */
  get Area() {
    return this.Width * this.Height;
  }

  /**
   * Shorthand for writing `new Size(side, side)`.
   * @param {Number} side The width & height value.
   * @returns {Size}
   */
  static GetSizeFromSide(side) {
    return new Size(side, side);
  }
}

//#endregion

//#region Game classes

//#region Tic-Tac-Toe

//#region Variables

/**@type {Number[]} XO_InGame */
let XO_InGame = [];

//#endregion

//#region Constants

const XO_BotDifficulty_Easy = 0;
const XO_BotDifficulty_Normal = 1;
const XO_BotDifficulty_Hard = 2;

const XO_CellState_None = 0;
const XO_CellState_X = 1;
const XO_CellState_O = 2;

const XO_CurrentTurn_X = -1;
const XO_CurrentTurn_O = 1;

const XO_GameState_XWon = 0;
const XO_GameState_OWon = 1;
const XO_GameState_Draw = 2;
const XO_GameState_Playing = 3;

const XO_CellState_CharDictionary = { '<:XO_CellNone:843900699989114930>': XO_CellState_None, '<:XO_CellX:843900699976269835>': 
  XO_CellState_X, '<:XO_CellO:843900699937996891>': XO_CellState_O };
const XO_CellState_OverlayCharDictionary = { '<:XO_CellNone:843900699989114930>': '<:XO_CellNone_S:843905503872155669>', '<:XO_CellX:843900699976269835>': 
  '<:XO_CellX_S:843905503868223558>', '<:XO_CellO:843900699937996891>': '<:XO_CellO_S:843905503923142716>' };

//#endregion

class XO {
  /**
   * Starts new Human VS Bot XO Game.
   * @param {Discord.GuildMember} player The human player.
   * @param {Number} difficulty The bot's difficulty (Format - XO_BotDifficulty)
   * @param {Discord.TextChannel} channel Text Channel, where the game will be.
   * @param {Number} gameTableSide Size of a game table side.
   * @param {Number} playerSign Sign, that the player uses (Format - XO_CurrentTurn).
   */
  static HumanVSBot(player, difficulty, channel, gameTableSide, playerSign) {
    // Variables
    gameTableSide = Mathf.clamp(gameTableSide, 3, 7); // Clamp side size to minimum and maximum values
    let gameTable = Optimized2DArrayLogic.CreateArray(Size.GetSizeFromSide(gameTableSide), XO_CellState_None);
    let cursor = new Point(Math.floor((gameTableSide - 1) / 2), Math.floor((gameTableSide - 1) / 2));
    let lastBotMove = playerSign == XO_CurrentTurn_O ? XO.MakeABotMove(difficulty, gameTable, playerSign, gameTableSide, cursor, Point.OneInverted) : Point.OneInverted; 
    // Pushing player into in-game players list
    if(!XO_InGame.includes(player.user.id)) XO_InGame.push(player.user.id);
    // Send game message
    channel.send(new Discord.MessageEmbed()
      .setColor('#0099ff')
      .setTitle(`Tic-Tac-Toe${gameTableSide == 3 ? '!' : '?'}`)
      .setDescription(`**<@!${player.user.id}> VS Bot (${difficulty == XO_BotDifficulty_Easy ? 'Easy' : difficulty == XO_BotDifficulty_Normal ? 'Normal' : 'Hard'})**\n
      ${Optimized2DArrayLogic.Stringify(gameTable, [cursor.Get1DIndexFrom2D(gameTableSide)], gameTableSide, XO_CellState_CharDictionary, XO_CellState_OverlayCharDictionary, true)}`)
      .setTimestamp()
      .setFooter(channel.guild.name, channel.guild.iconURL()))
    .then(message => {
      // Adding Reactions (Controls)
      message.react('⬅️');
      message.react('➡️');
      message.react('⬆️');
      message.react('⬇️');
      message.react('✅');
      message.react('🛑');
      // Adding Reaction Collector
      const filter = (reaction, user) => user.id === player.user.id;
      const collector = message.createReactionCollector(filter, { dispose: true });
      collector.on('collect', (reaction, user) => {
        // Is it turn of user who reacts? Or not?
        switch(reaction.emoji.name) {
          // Controls (Arrows)
          case '⬅️':
            if(cursor.X > 0) {       
              cursor.X -= 1; // Moving cursor & updating message then
              XO.UpdateEmbed_HumanVSBot(message, player, playerSign, difficulty, gameTable, cursor, gameTableSide);
            }
            break;
          case '➡️':
            if(cursor.X < gameTableSide - 1) {             
              cursor.X += 1; // Moving cursor & updating message then
              XO.UpdateEmbed_HumanVSBot(message, player, playerSign, difficulty, gameTable, cursor, gameTableSide);
            }
            break;
          case '⬆️':
            if(cursor.Y > 0) {             
              cursor.Y -= 1; // Moving cursor & updating message then
              XO.UpdateEmbed_HumanVSBot(message, player, playerSign, difficulty, gameTable, cursor, gameTableSide);
            }
            break;
          case '⬇️':
            if(cursor.Y < gameTableSide - 1) {             
              cursor.Y += 1; // Moving cursor & updating message then
              XO.UpdateEmbed_HumanVSBot(message, player, playerSign, difficulty, gameTable, cursor, gameTableSide);
            }
            break;
          // Controls (Place Tile)
          case '✅':           
            if(gameTable[cursor.Get1DIndexFrom2D(gameTableSide)] == XO_CellState_None) {                     
              gameTable[cursor.Get1DIndexFrom2D(gameTableSide)] = playerSign == XO_CurrentTurn_X ? XO_CellState_X : XO_CellState_O;
              let state = XO.CheckGameState(gameTable, cursor, gameTableSide); // Get game state
              if(state != 3) { // If human made a move that changes game state
                message.reactions.removeAll();     
                // Updating message including game state
                XO.UpdateEmbed_HumanVSBot(message, player, playerSign, difficulty, gameTable, Point.OneInverted, gameTableSide, state);
                XO_InGame.splice(XO_InGame.indexOf(player.user.id));
              } else {
                lastBotMove = XO.MakeABotMove(difficulty, gameTable, playerSign, gameTableSide, cursor, lastBotMove);
                state = XO.CheckGameState(gameTable, lastBotMove, gameTableSide);               
                if(state != 3) { // If bot made a move that changes game state
                  message.reactions.removeAll();
                  XO_InGame.splice(XO_InGame.indexOf(player.user.id));
                }
                XO.UpdateEmbed_HumanVSBot(message, player, playerSign, difficulty, gameTable, state == 3 ? cursor : Point.OneInverted, gameTableSide, state);          
              }
            }
            break;
          // Controls (Stop Game)
          case '🛑':
            message.delete();
            channel.send(`<@!${user.id}> has stopped the game.`);
            XO_InGame.splice(XO_InGame.indexOf(player.user.id));
            break;
        }
      });
      collector.on('remove', (reaction, user) => {
        collector.handleCollect(reaction, user);
      }); // Make 'remove' event do the same thing 'collect' event does
    });
  }

  /**
   * Calculates... XO stuff and makes the bot do a move.
   * @param {Number} difficulty The bot's difficulty (Format - XO_BotDifficulty).
   * @param {Number[]} gameTable Game table (Values format - XO_CellState).
   * @param {Number} playerSign What sign human player plays as (Format - XO_CurrentTurn).
   * @param {Number} gameTableSide Size of a game table side.
   * @param {Point} lastPlayerMove Last move done in the game by human player.
   * @param {Point} lastBotMove Last move done in the game by bot.
   * @returns {Point} The bot's move position.
   */
  static MakeABotMove(difficulty, gameTable, playerSign, gameTableSide, lastPlayerMove, lastBotMove) {
    // Variables (shorthands in this case)
    let botCellState = playerSign == XO_CurrentTurn_X ? XO_CellState_O : XO_CellState_X;
    let gameTableSize = Size.GetSizeFromSide(gameTableSide);
    
    switch(difficulty) {
      case XO_BotDifficulty_Easy: // If easy mode, just pick a random move
        let possibleMoves = XO.GetPossibleMoves(gameTable);
        let randomNumber = Mathf.randomInt(0, possibleMoves.length);
        gameTable[possibleMoves[randomNumber]] = botCellState;
        return Point.Get2DIndexFrom1D(possibleMoves[randomNumber], gameTableSize);
      case XO_BotDifficulty_Normal:
        // Get one-move win moves for the bot and human player
        let botWinMoves = XO.GetPotentionalWinMoves(gameTable, -playerSign, gameTableSide, lastBotMove, 1);
        let playerWinMoves = XO.GetPotentionalWinMoves(gameTable, playerSign, gameTableSide, lastPlayerMove, 1);
        if(botWinMoves.length > 0) { // If the bot can win in one move, do that move
          let randomNumber = Mathf.randomInt(0, botWinMoves.length); // Get random bot win combination index
          gameTable[botWinMoves[randomNumber][0].Get1DIndexFrom2D(gameTableSide)] = botCellState;
          return botWinMoves[randomNumber][0]; // Do a move and return position
        } else if(playerWinMoves.length > 0) { // If player can win in one move, block the player         
          let randomNumber = Mathf.randomInt(0, playerWinMoves.length); // Get random player win combination index
          gameTable[playerWinMoves[randomNumber][0].Get1DIndexFrom2D(gameTableSide)] = botCellState;
          return playerWinMoves[randomNumber][0]; // Do a move and return position
        } else { // Else just do a random move
          let possibleMoves = XO.GetPossibleMoves(gameTable); // Get possible move positions
          let randomNumber = Mathf.randomInt(0, possibleMoves.length); // Get random move position (1D)
          gameTable[possibleMoves[randomNumber]] = botCellState; // Do a move and return position
          return Point.Get2DIndexFrom1D(possibleMoves[randomNumber], gameTableSize);
        }
      case XO_BotDifficulty_Hard:
        if(lastBotMove == Point.OneInverted) { // Do the first move, if not done yet
          let tableCenter = new Point(Math.floor((gameTableSide - 1) / 2), Math.floor((gameTableSide - 1) / 2));
          // Occupy the center if table size is even and if it is not occupied yet
          if(gameTableSide % 2 != 0 && gameTable[tableCenter.Get1DIndexFrom2D(gameTableSide)] == XO_CellState_None) {
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
          if(botWinMoves.length > 0) { // If the bot can win in one move, do that move
            let randomNumber = Mathf.randomInt(0, botWinMoves.length); // Get random bot win combination index
            gameTable[botWinMoves[randomNumber][0].Get1DIndexFrom2D(gameTableSide)] = botCellState;
            return botWinMoves[randomNumber][0]; // Do a move and return position
          } else if(playerWinMoves.length > 0) { // If player can win in one move, block the player
            let randomNumber = Mathf.randomInt(0, playerWinMoves.length); // Get random player win combination index
            gameTable[playerWinMoves[randomNumber][0].Get1DIndexFrom2D(gameTableSide)] = botCellState;
            return playerWinMoves[randomNumber][0]; // Do a move and return position
          } else if(botGoodMoves.length > 0) { // If the bot have moves, that may lead to win, do the best move
            let currentBestMove = Point.OneInverted;
            let currentLowestCombinationLength = gameTableSide - 1;
            for(let i = 0; i < botGoodMoves.length; i++) {
              // Check if the path is not longer than any of previous paths
              if(botGoodMoves[i].length > currentLowestCombinationLength) continue;
              else if(botGoodMoves[i].length < currentLowestCombinationLength) 
                currentLowestCombinationLength = botGoodMoves[i].length;
              for(let j = 0; j < botGoodMoves[i].length; j++) // Get the new best move (every time), because why not
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
   * @param {Number[]} gameTable Game table (Values format - XO_CellState).
   * @returns {Number[]} Empty cells in the `gameTable`.
   */
  static GetPossibleMoves(gameTable) {
    return gameTable.findIndexes(num => num == XO_CellState_None);
  }

  /**
   * Checks if player can win in `movesToWin` moves, and returns win combinations if yes.
   * @param {Number[]} gameTable Game table (Values format - XO_CellState).
   * @param {Number} playerSign What sign player plays as (Format - XO_CurrentTurn).
   * @param {Number} gameTableSide Size of a game table side.
   * @param {Point} lastPlayerMove Last player's move.
   * @param {Number} movesToWin In how many moves player should be able to win.
   * @returns {[Point[]]} Move combinations to win the game as the player.
   */
  static GetPotentionalWinMoves(gameTable, playerSign, gameTableSide, lastMove, movesToWin) {
    // Variables
    let playerCellState = playerSign == XO_CurrentTurn_X ? XO_CellState_X : XO_CellState_O;
    let gameTableSize = Size.GetSizeFromSide(gameTableSide);
    let winCombinations = [];
    if(!lastMove.IsOutOfBounds(gameTableSize)) { // If the placement of last move is incorrect, don't do the useless work and just return empty array then
      for(let i = 0; i < 4; i++) { // Shoot info rays in a half of directions
        let direction = i == 0 ? Point.DirectionLeft : i == 1 ? Point.DirectionUpLeft : i == 2 ? Point.DirectionUp : Point.DirectionUpRight;
        let info = Optimized2DArrayLogic.ShootInfoRay(lastMove, gameTableSide, direction, gameTable, gameTableSize, [playerCellState, XO_CellState_None], true, Optimized2DArrayLogic.InfoRayReturn_Both);
        // Add point into movesToWin array if point is empty and meeting certain conditions
        if(info[1][XO_CellState_None] <= movesToWin && info[0].length == gameTableSide)
          winCombinations.push(info[0].filter(point => gameTable[point.Get1DIndexFrom2D(gameTableSide)] == XO_CellState_None));
      }
    }
    return winCombinations;
  }

  /**
   * Changes XO Human VS Bot game embed message.
   * @param {Discord.Message} message Game message.
   * @param {Discord.GuildMember} player The human player.
   * @param {Number} playerSign What sign player plays as (Format - XO_CurrentTurn).
   * @param {Number} difficulty The bot's difficulty (Format - XO_BotDifficulty).
   * @param {Number[]} gameTable Game table (Values format - XO_CellState).
   * @param {Point} cursor Current cell selection cursor position.
   * @param {Number} gameTableSide Size of a game table side.
   * @param {Number} gameState Current game state (Format - XO_GameState).
   */
  static UpdateEmbed_HumanVSBot(message, player, playerSign, difficulty, gameTable, cursor, gameTableSide, gameState = XO_GameState_Playing) {
    let status = ``;
    // Set status if needed
    if(gameState != XO_GameState_Playing) {
      switch(gameState) {
        case playerSign == XO_CurrentTurn_X ? XO_GameState_XWon : XO_GameState_OWon:
          status = `\nGame Ended! <@!${player.user.id}> won!\n`
          break;
        case playerSign == XO_CurrentTurn_X ? XO_GameState_OWon : XO_GameState_XWon:
          status = `\nGame Ended! Bot (${difficulty == XO_BotDifficulty_Easy ? 'Easy' : difficulty == XO_BotDifficulty_Normal ? 'Normal' : 'Hard'}) won!\n`
          break;
        case XO_GameState_Draw:
          status = '\nGame Ended! Draw :/\n';
          break;
      }
    }
    // Edit embed
    message.edit(new Discord.MessageEmbed()
      .setColor('#0099ff') 
      .setTitle(`Tic-Tac-Toe${gameTableSide == 3 ? '!' : '?'}`)   
      .setDescription(`**<@!${player.user.id}> VS Bot (${difficulty == XO_BotDifficulty_Easy ? 'Easy' : difficulty == XO_BotDifficulty_Normal ? 'Normal' : 'Hard'})**\n${status}
      ${Optimized2DArrayLogic.Stringify(gameTable, [cursor.Get1DIndexFrom2D(gameTableSide)], gameTableSide, XO_CellState_CharDictionary, XO_CellState_OverlayCharDictionary, true)}`)
      .setTimestamp()
      .setFooter(message.guild.name, message.guild.iconURL()));
  }

  /**
   * Starts new Human VS Human XO Game.
   * @param {Discord.GuildMember} playerX Player who plays as X.
   * @param {Discord.GuildMember} playerO Player who plays as O.
   * @param {Discord.TextChannel} channel Text Channel, where the game will be.
   * @param {Discord.GuildMember} requestedPlayer Player who got the game request.
   * @param {Number} gameTableSide Size of a game table side.
   */
  static HumanVSHuman(playerX, playerO, requestedPlayer, channel, gameTableSide) {
    // Variables
    let currentTurn = XO_CurrentTurn_X;
    gameTableSide = Mathf.clamp(gameTableSide, 3, 7); // Clamp side size to minimum and maximum values
    let gameTable = Optimized2DArrayLogic.CreateArray(Size.GetSizeFromSide(gameTableSide), XO_CellState_None);
    let cursor = new Point(Math.floor((gameTableSide - 1) / 2), Math.floor((gameTableSide - 1) / 2));
    // Pushing players into in-game players list
    if(!XO_InGame.includes(playerX.user.id)) XO_InGame.push(playerX.user.id);
    if(!XO_InGame.includes(playerO.user.id)) XO_InGame.push(playerO.user.id);
    // Send game message
    channel.send(new Discord.MessageEmbed()
      .setColor('#0099ff') 
      .setTitle(`Tic-Tac-Toe${gameTableSide == 3 ? '!' : '?'}`)     
      .setDescription(`**<@!${playerX.user.id}> VS <@!${playerO.user.id}>**\n\n<@!${playerX.user.id}>'s turn!\n
      ${Optimized2DArrayLogic.Stringify(gameTable, [cursor.Get1DIndexFrom2D(gameTableSide)], gameTableSide, XO_CellState_CharDictionary, XO_CellState_OverlayCharDictionary, true)}`)
      .setTimestamp()
      .setFooter(channel.guild.name, channel.guild.iconURL()))
    .then(message => { // Game!
      // Sending game link to Player 2
      requestedPlayer.user.send('Game (message) link: ' + message.url);
      // Adding Reactions (Controls)
      message.react('⬅️');
      message.react('➡️');
      message.react('⬆️');
      message.react('⬇️');
      message.react('✅');
      message.react('🛑');
      // Adding Reaction Collector
      const filter = (reaction, user) => user.id === playerX.user.id || user.id === playerO.user.id;
      const collector = message.createReactionCollector(filter, { dispose: true });
      collector.on('collect', (reaction, user) => {
        // Is it turn of user who reacts? Or not?
        const isCorrectUserReacting = (currentTurn == XO_CurrentTurn_X && user.id === playerX.user.id) || (currentTurn == XO_CurrentTurn_O && user.id === playerO.user.id);
        switch(reaction.emoji.name) {
          // Controls (Arrows)
          case '⬅️':
            if(cursor.X > 0 && isCorrectUserReacting) {       
              cursor.X -= 1; // Moving cursor & updating message then
              XO.UpdateEmbed_HumanVSHuman(message, playerX, playerO, gameTable, cursor, currentTurn, gameTableSide); 
            }
            break;
          case '➡️':
            if(cursor.X < gameTableSide - 1 && isCorrectUserReacting) {             
              cursor.X += 1; // Moving cursor & updating message then
              XO.UpdateEmbed_HumanVSHuman(message, playerX, playerO, gameTable, cursor, currentTurn, gameTableSide);
            }
            break;
          case '⬆️':
            if(cursor.Y > 0 && isCorrectUserReacting) {             
              cursor.Y -= 1; // Moving cursor & updating message then
              XO.UpdateEmbed_HumanVSHuman(message, playerX, playerO, gameTable, cursor, currentTurn, gameTableSide);
            }
            break;
          case '⬇️':
            if(cursor.Y < gameTableSide - 1 && isCorrectUserReacting) {             
              cursor.Y += 1; // Moving cursor & updating message then
              XO.UpdateEmbed_HumanVSHuman(message, playerX, playerO, gameTable, cursor, currentTurn, gameTableSide);
            }
            break;
          // Controls (Place Tile)
          case '✅':           
            if(isCorrectUserReacting && gameTable[cursor.Get1DIndexFrom2D(gameTableSide)] == XO_CellState_None) {        
              gameTable[cursor.Get1DIndexFrom2D(gameTableSide)] = currentTurn == XO_CurrentTurn_X ? XO_CellState_X : XO_CellState_O;
              if(XO.CheckGameState(gameTable, cursor, gameTableSide) == XO_GameState_Playing) currentTurn *= -1; // :)
              else {
                message.reactions.removeAll();     
                // Updating message including game state
                XO.UpdateEmbed_HumanVSHuman(message, playerX, playerO, gameTable, Point.OneInverted, currentTurn, gameTableSide, 
                  XO.CheckGameState(gameTable, cursor, gameTableSide));            
                XO_InGame.splice(XO_InGame.indexOf(playerX.user.id));
                XO_InGame.splice(XO_InGame.indexOf(playerO.user.id));
                break;
              }
              XO.UpdateEmbed_HumanVSHuman(message, playerX, playerO, gameTable, cursor, currentTurn, gameTableSide);
            }
            break;
          // Controls (Stop Game)
          case '🛑':
            message.delete();
            channel.send(`<@!${user.id}> has the stopped game.`);
            XO_InGame.splice(XO_InGame.indexOf(playerX.user.id));
            XO_InGame.splice(XO_InGame.indexOf(playerO.user.id));
            break;
        }
      });
      collector.on('remove', (reaction, user) => {
        collector.handleCollect(reaction, user);
      }); // Make 'remove' event do the same thing 'collect' event does
    });
  }

  /**
  * Changes XO Human VS Human game embed message.
  * @param {Discord.Message} message Game message.
  * @param {Discord.GuildMember} playerX Player who plays as X.
  * @param {Discord.GuildMember} playerO Player who plays as O.
  * @param {Number[]} gameTable Game table (Values format - XO_CellState).
  * @param {Point} cursor Current cell selection cursor position.
  * @param {Number} currentTurn Current game turn (Format - XO_CurrentTurn).
  * @param {Number} gameTableSide Size of a game table side.
  * @param {Number} gameState Current game state (Format - XO_GameState).
  */
  static UpdateEmbed_HumanVSHuman(message, playerX, playerO, gameTable, cursor, currentTurn, gameTableSide, gameState = XO_GameState_Playing) {
    // Get game status and char dictionaries for embed
    let status = `<@!${currentTurn == XO_CurrentTurn_X ? playerX.user.id : playerO.user.id}>'s turn!`;
    // Set Turn Status to Win Status if needed
    if(gameState != XO_GameState_Playing) {
      switch(gameState) {
        case XO_GameState_XWon:
          status = `Game Ended! <@!${playerX.user.id}> won!`
          break;
        case XO_GameState_OWon:
          status = `Game Ended! <@!${playerO.user.id}> won!`
          break;
        case XO_GameState_Draw:
          status = 'Game Ended! Draw :/';
          break;
      }
    }
    // Edit embed
    message.edit(new Discord.MessageEmbed()
      .setColor('#0099ff') 
      .setTitle(`Tic-Tac-Toe${gameTableSide == 3 ? '!' : '?'}`)
      .setDescription(`**<@!${playerX.user.id}> VS <@!${playerO.user.id}>**\n\n${status}\n
      ${Optimized2DArrayLogic.Stringify(gameTable, [cursor.Get1DIndexFrom2D(gameTableSide)], gameTableSide, XO_CellState_CharDictionary, XO_CellState_OverlayCharDictionary, true)}`)
      .setTimestamp()
      .setFooter(message.guild.name, message.guild.iconURL()));
  }

  /**
  * Checks the game state and returns it (Format - XO_GameState).
  * @param {Number[]} gameTable Game table (Values format - XO_CellState).
  * @param {Point} lastMove Last move done in the game.
  * @param {Number} gameTableSide Size of a side in a game table.
  * @returns {Number} Current game state.
  */
  static CheckGameState(gameTable, lastMove, gameTableSide) {
    let gameTableSize = Size.GetSizeFromSide(gameTableSide);
    // Check if every cell is filled
    let gameTableFilled = true;
    let moveSign = gameTable[lastMove.Get1DIndexFrom2D(gameTableSide)];
    for(let i = 0; i < gameTable.length; i++) if(gameTable[i] == 0) gameTableFilled = false;
    // Check if there is any win combination (Shoot 4 rays)
    if(Optimized2DArrayLogic.ShootCheckerRay2(lastMove, Point.DirectionLeft, gameTable, gameTableSize, [moveSign], gameTableSide)
    || Optimized2DArrayLogic.ShootCheckerRay2(lastMove, Point.DirectionUpLeft, gameTable, gameTableSize, [moveSign], gameTableSide)
    || Optimized2DArrayLogic.ShootCheckerRay2(lastMove, Point.DirectionUp, gameTable, gameTableSize, [moveSign], gameTableSide)
    || Optimized2DArrayLogic.ShootCheckerRay2(lastMove, Point.DirectionUpRight, gameTable, gameTableSize, [moveSign], gameTableSide)) {
      psql_client.connect();
      psql_client.query(`UPDATE Statistics
      SET XO_GamesPlayed = XO_GamesPlayed + 1;`).then(result => psql_client.end());
      return moveSign == XO_CellState_X ? XO_GameState_XWon : XO_GameState_OWon; // If there is/are a win combination(s), some player won
    }
    else if(gameTableFilled) { // If no win combinations, but the game table is filled, it is a draw
      psql_client.connect();
      psql_client.query(`UPDATE Statistics
      SET XO_GamesPlayed = XO_GamesPlayed + 1;`).then(result => psql_client.end());
      return XO_GameState_Draw;
    }
    else return XO_GameState_Playing;
  }
}

//#endregion

//#endregion

//#region Discord

//#region Constants

const HelpType_HowToStartTheGame = 0;
const HelpType_HowToPlayTheGame = 1;
const HelpType_BotDifficultyExplanation = 2;
const HelpType_WhoMadeTheBotAndHow = 3;
const HelpType_BotStatistics = 4;

//#endregion

//#region Functions

/**
 * Sends reply (string) to your Discord slash command interaction.
 * @param {*} interaction Discord slash command interaction.
 * @param {String} answer Reply to an `interaction` (string).
 * @param {Discord.MessageEmbed[]} embeds Reply to an `interaction` (embed).
 */
function Discord_SendInteractionAnswer(interaction, answer, embeds = [], flags = 0) {
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

//#endregion

//#region Events

// React on slash command use
client.ws.on('INTERACTION_CREATE', async interaction => {
  // Variables
  const command = interaction.data.name.toLowerCase();
  const args = interaction.data.options;
  let channel = client.channels.cache.get(interaction.channel_id); // Getting current text channel
  let guild = client.guilds.cache.get(interaction.guild_id); // Getting current guild
  switch(command) {
    case 'tic-tac-toe':
      if(args[0].name == 'with-a-bot') {
        // Doing a basic check...
        if(XO_InGame.includes(interaction.member.user.id)) Discord_SendInteractionAnswer(interaction, 'You can\'t start game if you are already in one!');
        else { // If everything is ok, start the game!
          Discord_SendInteractionAnswer(interaction, 'Starting the game...');
          // Function argument variables
          let difficulty = args[0].options[0].value;
          let playerSign = args[0].options[1].value;
          // If side size is not entered, just make basic 3x3 game
          const tableSide = args[0].options[2] != undefined ? args[0].options[2].value : 3;
          // Start the game!
          XO.HumanVSBot(interaction.member, difficulty, channel, tableSide, playerSign)
        }
      }
      else {
        let member = guild.members.cache.get(args[0].options[0].value); // Getting Player 2 object
        // Doing VARIOUS checks
        if(XO_InGame.includes(interaction.member.user.id)) Discord_SendInteractionAnswer(interaction, 'You can\'t start game if you are already in one!');
        else if(member.user.bot) Discord_SendInteractionAnswer(interaction, 'You can\'t play with a bot!');
        else if(args[0].options[0].value == interaction.member.user.id) Discord_SendInteractionAnswer(interaction, 'You can\'t play with yourself!');
        else if(XO_InGame.includes(member.user.id)) Discord_SendInteractionAnswer(interaction, 'You can\'t play with a person in-game!');
        else if(!member.permissionsIn(channel).has([Discord.Permissions.FLAGS.SEND_MESSAGES, Discord.Permissions.FLAGS.VIEW_CHANNEL, Discord.Permissions.FLAGS.READ_MESSAGE_HISTORY])) 
          Discord_SendInteractionAnswer(interaction, 'This user can\'t play in this channel!');
        else { // If all checks were passed, then send request to Player 2
          member.user.send('Do you want to play Tic-Tac-Toe with <@!' + interaction.member.user.id + '>?\nReact to this message with :white_check_mark: if yes, and with :x: if no.')
          .then(message => {
            Discord_SendInteractionAnswer(interaction, 'Waiting for the request answer...');
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
              const playerX = args[0].options[1].value == XO_CurrentTurn_X ? interaction.member : member;
              const playerO = args[0].options[1].value == XO_CurrentTurn_X ? member : interaction.member;
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
          .catch(error => { if(error.code == 50007) { Discord_SendInteractionAnswer(interaction, 'Can\'t send request to the user!'); } }); // If bot can't DM Player 2
        }
      }
      break;
    case 'bot-help':
      let ticTacToeImageLink = 'https://external-content.duckduckgo.com/iu/?u=https%3A%2F%2Fwww.clipartkey.com%2Fmpngs%2Fm%2F110-1100210_tic-tac-toe-png.png&f=1&nofb=1';
      switch(args[0].value) {
        case HelpType_HowToStartTheGame:
          Discord_SendInteractionAnswer(interaction, undefined, [new Discord.MessageEmbed() // Sending response
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
            .setFooter(guild.name, guild.iconURL())], 64);
          break;
        case HelpType_HowToPlayTheGame:
          Discord_SendInteractionAnswer(interaction, undefined, [new Discord.MessageEmbed() // Sending response
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
            .setFooter(guild.name, guild.iconURL())], 64);
          break;
        case HelpType_BotDifficultyExplanation:
          Discord_SendInteractionAnswer(interaction, undefined, [new Discord.MessageEmbed() // Sending response
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
            .setFooter(guild.name, guild.iconURL())], 64);
          break;
        case HelpType_WhoMadeTheBotAndHow:
          Discord_SendInteractionAnswer(interaction, undefined, [new Discord.MessageEmbed() // Sending response
            .setColor('#fff50f')
            .setAuthor('Tic-Tac-Toe: Developers', ticTacToeImageLink)
            .setDescription('This  bot is made by **DV Game** using discord.js v12.5.3.\nThanks to **homvp** for several algorithm ideas and some code.')
            .setTimestamp()
            .setFooter(guild.name, guild.iconURL())], 64);
          break;
        case HelpType_BotStatistics:
          console.log("Here.");
          psql_client.query('SELECT XO_GamesPlayed FROM Statistics')
            .then(XO_GamesPlayed => {
              console.log(XO_GamesPlayed);
              Discord_SendInteractionAnswer(interaction, undefined, [new Discord.MessageEmbed() // Sending response
              .setColor('#fff50f')
              .setAuthor('Tic-Tac-Toe: Statistics', ticTacToeImageLink)
              .addFields({ name: 'Bot Statistics', value:`Server count: ${client.guilds.cache.size}\nMember count: ${client.users.cache.filter(user => !user.bot).size}`, inline: true }, 
                { name: 'Game Statistics', value: `Games played: ${XO_GamesPlayed}\nUsers playing: ${XO_InGame.length}`, inline: true }, 
                { name: 'Technical Statistics', value: `\`\`\`c++\nPing: ${client.ws.ping} ms\nUptime: ${(client.uptime/1000/60/60).toFixed(2)} h\nShard ID: ${guild.shardID}\`\`\``})
              .setTimestamp()
              .setFooter(guild.name, guild.iconURL())], 64);
            });
          break;
      }
      break;
    case 'invite-link':
      Discord_SendInteractionAnswer(interaction, `The invite link (developer): https://discord.com/api/oauth2/authorize?client_id=848174855982809118&permissions=330816&scope=bot%20applications.commands`, [], 64);
      break;
  }
});

client.on('ready', function() {
  // Set client special presence
  client.user.setStatus('idle');
  client.user.setActivity('Tic-Tac-Toe 2: Electric Boogaloo', { type: 'PLAYING' })
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
              value: XO_BotDifficulty_Easy
            }, {
              name: 'Normal',
              value: XO_BotDifficulty_Normal
            }, {
              name: 'Hard',
              value: XO_BotDifficulty_Hard
            }]
          }, {
            name: 'starting-player',
            description: 'Player who goes first',
            type: 4,
            required: true,
            choices: [{
              name: 'Player 1 (You)',
              value: XO_CurrentTurn_X
            }, {
              name: 'Player 2 (Bot)',
              value: XO_CurrentTurn_O
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
              value: XO_CurrentTurn_X
            }, {
              name: 'Player 2 (Your Opponent)',
              value: XO_CurrentTurn_O
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

client.on('message', function(message) {
  if(message.content.startsWith('/eval ') && message.author.id == '670559252456407070') {
    let code = message.content.substring(6); // Remove '/eval ' (7 characters) from message content and get code
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
client.on('guildCreate', function(guild) {
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
          value: XO_BotDifficulty_Easy
        }, {
          name: 'Normal',
          value: XO_BotDifficulty_Normal
        }, {
          name: 'Hard',
          value: XO_BotDifficulty_Hard
        }]
      }, {
        name: 'starting-player',
        description: 'Player who goes first',
        type: 4,
        required: true,
        choices: [{
          name: 'Player 1 (You)',
          value: XO_CurrentTurn_X
        }, {
          name: 'Player 2 (Bot)',
          value: XO_CurrentTurn_O
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
          value: XO_CurrentTurn_X
        }, {
          name: 'Player 2 (Your Opponent)',
          value: XO_CurrentTurn_O
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
client.on('guildDelete', function(guild) {
  client.api.applications(client.user.id).guilds(guild.id).commands.get().then(commands => {
    commands.forEach(command => {
      client.api.applications(client.user.id).guilds(guild.id).commands(command.id).delete();
    });
  });
});

client.login(process.env.token2);

//#endregion

//#endregion
