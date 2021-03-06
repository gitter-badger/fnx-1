import * as core from '../core'
import { Diff } from '../core'
import { ObjectKeyWeakMap } from '../utils'

export type Property = {
  set: (target?: object, key?: PropertyKey, value?: any,
        description?: core.Descriptor, root?: object,
        parentObservable?: object, path?: string[]) => { didChange: boolean, result: boolean }
  get: (target?: object, key?: PropertyKey, description?: core.Descriptor,
        root?: object, proxy?: object) => any
}

// Map of all of the observables in the app. Uses both the object and it's key
// to designate a particular observable. Is held in memory as a weak map so it
// can be garbage collected.
const observablesReactions = new ObjectKeyWeakMap<any, Map<symbol, {
  reactionId: symbol
  roundAdded: number
}>>()

const observablesComputations = new ObjectKeyWeakMap<any, Map<symbol, {
  computation: core.Computation
  roundSet: number
}>>()

const PARENT_DESIGNATOR = Symbol('PARENT_DESIGNATOR')
const PATH_DESIGNATOR = Symbol('PATH_DESIGNATOR')
const OBSERVABLE_DESIGNATOR = Symbol('OBSERVABLE_DESIGNATOR')

export interface IVirtualMethodFactoryArgs {
  proxy: object
  root: object
  key: string
}

const getSnapshotAsString = Symbol('getSnapshotAsString')
const getSnapshotAsJSON = Symbol('getSnapshotAsJSON')

export const virtualCollectionMethods = {
  getSnapshot({ proxy }: IVirtualMethodFactoryArgs) {
    return (options?: { asString?: boolean, asJSON?: boolean }) => {
      if (options && options.asString) {
        return core.wrapComputation(proxy, getSnapshotAsString, () => {
          return core.getSnapshotAsString(proxy)
        })()
      } else if (options && options.asJSON) {
        return core.wrapComputation(proxy, getSnapshotAsJSON, () => {
          return core.getSnapshot(proxy, { asJSON: true })
        })()
      } else {
        return core.wrapComputation(proxy, 'getSnapshot', () => {
          return core.getSnapshot(proxy)
        })()
      }
    }
  },
  applySnapshot({ root, proxy, key }) {
    return core.wrapAction((snapshot, options?: { asJSON: boolean }) => {
      core.applySnapshot(snapshot, proxy, options)
    }, root, proxy, key)
  },
  applyDiffs({ root, proxy, key }) {
    return core.wrapAction((diffs: Diff[]) => {
      core.applyDiffs(proxy, diffs)
    }, root, proxy, key)
  },
  use({ proxy }) {
    return (middleware: core.Middleware) => {
      return core.use(proxy, middleware)
    }
  }
}

export const virtualObjectMethods = {
  getRoot({ root }: IVirtualMethodFactoryArgs) {
    return () => root
  },
  ...virtualCollectionMethods
}

/**
 * Test an object to see if it's an observable
 * @param object The object in question
 */
export function isObservable(object) {
  return object[OBSERVABLE_DESIGNATOR]
}

/**
 * Returns whether or not this key is the special OBSERVABLE_DESIGNATOR key
 * @param key The key that you are testing
 */
export function isObservableDesignatorKey(key) {
  return key === OBSERVABLE_DESIGNATOR
}

export function isParentDesignatorKey(key) {
  return key === PARENT_DESIGNATOR
}

export function isPathDesignatorKey(key) {
  return key === PATH_DESIGNATOR
}

export function getParent(observable) {
  return observable[PARENT_DESIGNATOR]
}

export function getPath(observable) {
  return observable[PATH_DESIGNATOR]
}

const setMap = {
  [core.descriptionTypes.action]: core.actionProperty.set,
  [core.descriptionTypes.arrayOf]: core.arrayOfProperty.set,
  [core.descriptionTypes.boolean]: core.booleanProperty.set,
  [core.descriptionTypes.complex]: core.complexProperty.set,
  [core.descriptionTypes.computed]: core.computedProperty.set,
  [core.descriptionTypes.mapOf]: core.mapOfProperty.set,
  [core.descriptionTypes.number]: core.numberProperty.set,
  [core.descriptionTypes.object]: core.objectProperty.set,
  [core.descriptionTypes.oneOf]: core.oneOfProperty.set,
  [core.descriptionTypes.string]: core.stringProperty.set,
}

const getMap = {
  [core.descriptionTypes.action]: core.actionProperty.get,
  [core.descriptionTypes.arrayOf]: core.arrayOfProperty.get,
  [core.descriptionTypes.boolean]: core.booleanProperty.get,
  [core.descriptionTypes.complex]: core.complexProperty.get,
  [core.descriptionTypes.computed]: core.computedProperty.get,
  [core.descriptionTypes.mapOf]: core.mapOfProperty.get,
  [core.descriptionTypes.number]: core.numberProperty.get,
  [core.descriptionTypes.object]: core.objectProperty.get,
  [core.descriptionTypes.oneOf]: core.oneOfProperty.get,
  [core.descriptionTypes.string]: core.stringProperty.get,
}

/**
 * Sets a property on an object
 * @param target The target you are setting the property on
 * @param key The key of the property you are setting
 * @param value The value you are setting
 * @param description A description of this property key
 * @param root The root of the state tree
 */
export function setProperty(
  target, key, value, description: core.Descriptor, root, parentObservable, path: string[]
) {
  if (value === undefined) {
    throw new Error('Only null is a valid bottom value to make sure things are JSON compatible')
  }

  if (core.isComputationInProgress()) {
    throw new Error('You cannot mutate stuff inside of a computed property')
  }

  if (typeof description === 'function') {
    throw new Error('You cannot re-assign a class method')
  }

  const set = setMap[description.type]
  if (set == null) {
    throw new Error(`Unrecognized property type: ${description.type.toString()}`)
  }

  core.startDiffCapture(parentObservable, key)
  const setResult = set(target, key, value, description, root, parentObservable, path)
  core.endDiffCapture(parentObservable, key, setResult.didChange, path)

  if (setResult.didChange) {
    markObservablesComputationsAsStale(target, key)
    core.addObservablesReactionsToPendingReactions(target, key)
  }

  return setResult.result
}

/**
 * Mark this computation and all of it's parent computations as stale and setup the reactions to
 * trigger
 */
export function markObservablesComputationsAsStale(target, key) {
  getComputationsOfObservable(target, key).forEach(({ computation, roundSet }) => {
    if (computation.round !== roundSet) {
      removeComputationFromObservable(target, key, computation.id)
    } else if (computation.stale === false) {
      computation.stale = true
      // Include some way to throw away observables that are not part of it's calculation anymore
      core.addObservablesReactionsToPendingReactions(computation.object, computation.key)
      markObservablesComputationsAsStale(computation.object, computation.key)
    }
  })
}

/**
 * Get property
 */
export function getProperty(target, key, description: core.Descriptor, root, proxy) {
  // If there is no description then this key doesn't exist on the
  // description - try to return it anyhow.
  if (description == null) {
    return target[key]
  }

  const get = getMap[description.type]

  if (get == null) {
    throw new Error(`Unrecognized property type: ${description.type.toString()}`)
  }

  if (description.type !== core.descriptionTypes.action &&
      description.type !== core.descriptionTypes.computed) {
    if (core.isReactionInProgress()) {
      const reaction = core.getActiveReaction()
      addReactionToObservable(target, key, reaction.id, reaction.round)
    }

    if (core.isComputationInProgress()) {
      const computation = core.getActiveComputation()
      addComputationToObservable(target, key, computation)
    }
  }

  return get(target, key, description, root, proxy)
}

/**
 * Registers a reaction with an observable so when the observable is mutated it
 * can know to trigger this reaction.
 */
export function addReactionToObservable(
  object: any, key: PropertyKey, reactionId: symbol, roundAdded: number
) {
  if (observablesReactions.has(object, key)) {
    observablesReactions.get(object, key).set(reactionId, { reactionId, roundAdded })
  } else {
    observablesReactions.set(object, key, new Map([[reactionId, { reactionId, roundAdded }]]))
  }
}

export function addComputationToObservable(
  object, key: PropertyKey, computation: core.Computation
) {
  if (observablesComputations.has(object, key)) {
    observablesComputations.get(object, key)
      .set(computation.id, { computation, roundSet: computation.round })
  } else {
    observablesComputations.set(object, key, new Map(
      [[computation.id, { computation, roundSet: computation.round }]]
    ))
  }
}

/**
 * Returns all reactions attached to specified observable.
 */
export function getReactionsOfObservable(object: any, key: PropertyKey) {
  if (!observablesReactions.has(object, key)) {
    observablesReactions.set(object, key, new Map())
  }
  return observablesReactions.get(object, key)
}

export function getComputationsOfObservable(
  object: object, key: PropertyKey
): Map<symbol, { computation: core.Computation, roundSet: number }> {
  if (!observablesComputations.has(object, key)) {
    observablesComputations.set(object, key, new Map())
  }
  return observablesComputations.get(object, key)
}

/**
 * Removes the reaction from the observable's collections of reactions.
 */
export function removeReactionFromObservable(
  object: object, key: PropertyKey, reactionId: symbol,
) {
  if (observablesReactions.has(object, key)) {
    observablesReactions.get(object, key).delete(reactionId)
  }
}

export function removeComputationFromObservable(
  object: object, key: PropertyKey, computationId: symbol
) {
  if (observablesComputations.has(object, key)) {
    observablesComputations.get(object, key).delete(computationId)
  }
}
