import * as core from '../../core'
import { ObjectKeyWeakMap } from '../../utils'

const skipInit = new ObjectKeyWeakMap<object, boolean>()

export function skipPropertyInitialization(target, property) {
  skipInit.set(target, property, true)
}

export const objectProperty: core.Property = {
  set(target, key, value, description: core.ParsedObjectDescriptor<any>, root, parentObservable,
      path: string[] = []) {
    if (typeof value !== 'object') {
      throw new Error('tried to set object to non-object value')
    }

    const proxy = new Proxy(value, {
      setPrototypeOf(): boolean {
        throw new Error('setPrototypeOf is disabled for fnx objects')
      },
      defineProperty(): boolean {
        throw new Error('Define property is disabled for fnx objects')
      },
      deleteProperty(t, k: string): boolean {
        if (!description.properties[k].optional) {
          throw new Error('Only optional properties may be deleted from an object')
        }
        if (Reflect.has(t, k)) {
          core.startDiffCapture(proxy, k)
          Reflect.deleteProperty(t, k)
          core.endDiffCapture(proxy, k, true, path.concat([ k ]))
          core.markObservablesComputationsAsStale(proxy, key)
          core.addObservablesReactionsToPendingReactions(proxy, key)
        }
        return true
      },
      get(t, k) {
        if (core.isObservableDesignatorKey(k)) {
          return true
        }

        if (core.isParentDesignatorKey(k)) {
          return parentObservable
        }

        if (core.isPathDesignatorKey(k)) {
          return path
        }

        const method = core.virtualObjectMethods[k]
        if (method != null) {
          return method({ proxy, root: root || proxy })
        }

        if (typeof description.properties[k] === 'function') {
          return description.properties[k]
        }
        return core.getProperty(t, k, description.properties[k], root || proxy, proxy)
      },
      set(t, k, v) {
        if (skipInit.get(proxy, k)) {
          return skipInit.set(proxy, k, false)
        }
        if (!core.isActionInProgress(root || proxy)) {
          throw new Error(`You cannot mutate state outside of an action "${k.toString()}"`)
        }
        if (!Reflect.has(description.properties, k)) {
          throw new Error(`The description for this object does not include ${key}`)
        }
        if (core.virtualObjectMethods[k] != null) {
          throw new Error(`The '${k}' key is reserved by fnx`)
        }
        if (description.properties[k].readonly) {
          throw new Error('Tried to mutate readonly value')
        }
        if (typeof k !== 'string') {
          throw new Error('Keys should only be of type string')
        }
        return core.setProperty(
          t, k, v, description.properties[k], root || proxy, proxy, path.concat([ k ])
        )
      }
    })

    if (Object.getOwnPropertySymbols(value).length > 0) {
      throw new Error(
        'Symbols are not serializable and therefore you can\'t use them as a key on your state'
      )
    }

    const hasExtraneousProperties = Object.getOwnPropertyNames(value)
        .some(k => Object.getOwnPropertyNames(description.properties).indexOf(k) === -1)

    if (hasExtraneousProperties) {
      throw new Error('Extraneous properties on object')
    }

    Object.getOwnPropertyNames(description.properties).forEach(k => {
      if (Object.getOwnPropertyNames(value).indexOf(k) >= 0) {
        core.setProperty(
          value, k, value[k], description.properties[k], root || proxy,
          proxy, path.concat([ k ])
        )
      } else if (
        typeof description.properties[k] !== 'function' &&
        description.properties[k].optional !== true &&
        description.properties[k].type !== core.descriptionTypes.action &&
        description.properties[k].type !== core.descriptionTypes.computed
      ) {
        throw new Error('required property not on object')
      }
    })

    return {
      didChange: true, result: Reflect.set(target, key, proxy)
    }
  },

  get(target, key) {
    return target[key]
  }
}
