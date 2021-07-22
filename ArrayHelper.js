class Point {
  //#region Direction shorthands
  static DirectionLeft = Object.freeze(new Point(-1, 0));
  static DirectionUpLeft = Object.freeze(new Point(-1, -1));
  static DirectionUp = Object.freeze(new Point(0, -1));
  static DirectionUpRight = Object.freeze(new Point(1, -1));
  static DirectionRight = Object.freeze(new Point(1, 0));
  static DirectionDownRight = Object.freeze(new Point(1, 1));
  static DirectionDown = Object.freeze(new Point(0, 1));
  static DirectionDownLeft = Object.freeze(new Point(-1, 1));
  //#endregion

  //#region Position shorthands
  static Zero = Object.freeze(new Point(0, 0));
  static One = Object.freeze(new Point(1, 1));
  static OneInverted = Object.freeze(new Point(-1, -1));
  static Empty = Object.freeze(new Point(null, null));
  //#endregion

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
  static Get2DIndexFrom1D(index, arraySize) {
    return new Point(index % arraySize.Width, Math.floor(index / arraySize.Width));
  }

  /**
   * 
   * @param {Size} arraySize Size of array.
   * @returns {Boolean} Is your point out of array bounds.
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

class ArrayLogic { 
  static InfoRayReturn = Object.freeze({
    Points: 0,
    Values: 1,
    Both: 2
  });

  /**
   * Creates a new 2D array (shorthand).
   * @param {Size} size The size of a new array.
   * @param {Number} fill The number to fill a new array with.
   * @returns {Number[]} A new array.
   */
  static CreateArray(size, fill = 0) {
    let array = new Array(size.Area);
    array.fill(fill);
    return array;
  }

  /**
   * Stringifies your 2D array.
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
      // Add new line if before writing new row
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
   * @param {Number[]} array The 2D array for moving the ray.
   * @param {Size} arraySize Size of the 2D array.
   * @param {Number[]} requiredNumbers Number(s) allowing ray to not break.
   * @param {Number} requiredLength Length ray needs to pass.
   * @param {Boolean} bounce Should ray bounce after breaking once.
   * @returns {Boolean} Did ray pass `requiredLength`.
   */
  static ShootCheckerRay(position, move, array, arraySize, requiredNumbers, requiredLength, bounce) {
    for(let i = 0; i < requiredLength; i++) {
      if(i == requiredLength - 1) return true;
      const nextPosition = new Point(position.X + move.X, position.Y + move.Y);
      const isRequiredNumberOnNextPosition = requiredNumbers.includes(array[nextPosition.Get1DIndexFrom2D(arraySize.Width)]);
      const moveConditions = !nextPosition.IsOutOfBounds(arraySize) && isRequiredNumberOnNextPosition;
      if(moveConditions) position = nextPosition;
      else if(bounce) return this.ShootCheckerRay(position, lifetime, new Point(-move.X , -move.Y), 
        array, arraySize, requiredNumbers, requiredLength, false); // Make ray bounce (spawn it with inverted direction)
      else return false;
    }
  }

  /**
   * Checks if there is `requiredLength` of `requiredNumbers` in a row (2 Rays).
   * @param {Point} position The point where rays spawn.
   * @param {Point} move The point added to current ray position each cycle.
   * @param {Number[]} array The 2D array for moving the ray.
   * @param {Size} arraySize Size of the 2D array.
   * @param {Number[]} requiredNumbers Number(s) allowing rays to not break.
   * @param {Number} requiredLength How many numbers in a row need to be hit.
   * @returns {Boolean} Did rays pass needed length.
   */
  static ShootCheckerRay2(position, move, array, arraySize, requiredNumbers, requiredLength) {
    let firstRayPassed = -1;
    let secondRayPassed = -1;
    let currentOffset = Point.Zero;
    for(let currentLength = 0; currentLength < requiredLength; currentLength++) {
      if(firstRayPassed == -1 || secondRayPassed == -1) currentOffset = new Point(currentOffset.X + move.X, currentOffset.Y + move.Y);
      if(firstRayPassed == -1) {
        const currentPosition = new Point(position.X + currentOffset.X, position.Y + currentOffset.Y);
        const isRequiredNumberOnCurrentPosition = requiredNumbers.includes(array[currentPosition.Get1DIndexFrom2D(arraySize.Width)]);
        const moveConditions = !currentPosition.IsOutOfBounds(arraySize) && isRequiredNumberOnCurrentPosition;
        if(!moveConditions) firstRayPassed = currentLength;
      }
      if(secondRayPassed == -1) {
        const currentPosition = new Point(position.X - currentOffset.X, position.Y - currentOffset.Y);
        const isRequiredNumberOnCurrentPosition = requiredNumbers.includes(array[currentPosition.Get1DIndexFrom2D(arraySize.Width)]);
        const moveConditions = !currentPosition.IsOutOfBounds(arraySize) && isRequiredNumberOnCurrentPosition;
        if(!moveConditions) secondRayPassed = currentLength;
      }

      if(firstRayPassed != -1 && secondRayPassed != -1) return (firstRayPassed + secondRayPassed) + 1 == requiredLength;
    } 
  }

  /**
   * Shoots ray, which returns info about the passed path.
   * 
   * Info return formats:
   * 
   * `InfoRayReturn.Points`: Returns passed points array.
   * 
   * `InfoRayReturn.Values`: Returns passed points values info array (Format - Value: How many times encountered).
   * 
   * `InfoRayReturn.Both`: Returns both (Format - [Points, Number Info]).
   * @param {Point} position The point where ray spawns.
   * @param {Number} lifetime How many iterations ray can pass.
   * @param {Point} move The value added to current ray position each cycle.
   * @param {Number[]} array The 2D array for moving ray.
   * @param {Size} arraySize Size of the 2D array.
   * @param {Number[]} requiredNumbers Number(s) allowing ray to not break.
   * @param {Boolean} bounce Should ray bounce after breaking once.
   * @param {Number} returnType What to return (Format - InfoRayReturn)
   * @returns The return type you selected via returnType.
   */
  static ShootInfoRay(position, lifetime, move, array, arraySize, requiredNumbers, bounce, returnType) {
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
        else return returnType == this.InfoRayReturn.Points ? path : returnType == this.InfoRayReturn.Values ? numberInfo : [path, numberInfo];
      }
    } else return undefined;
  }
}

module.exports = { Point: Point, Size: Size, ArrayLogic: ArrayLogic }