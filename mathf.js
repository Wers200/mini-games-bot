/**
 * Addon to native JS class `Math`.
 */
module.exports = class Mathf {
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