/**
 * Extends a function
 */
export function extend(derivedClass, baseClass) {
  for (const property in baseClass) {
    if (baseClass.hasOwnProperty(property)) {
      derivedClass[property] = baseClass[property];
    }
  }

  /**
   * No clue
   */
  function c(this: any) {
    this.constructor = derivedClass;
  }

  derivedClass.prototype =
    baseClass === null ?
    Object.create(baseClass) :
    (c.prototype = baseClass.prototype, new c());
}