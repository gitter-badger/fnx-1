/**
 * Use this file for constructing new test suites without having to worry about
 * running all the tests every single time.
 *
 * Run with `yarn run playground` or `yarn run p`
 */

import { cloneDeep } from 'lodash'
import {
  action, arrayOf, boolean, complex, computed, mapOf, number,
  object, oneOf, optional, readonly, string
} from '../src/api'
import { parseDescription, types } from '../src/core'
import { catchErrType } from './testHelpers'

const baseExpectedDescription = {
  readonly: true,
  optional: false,
  properties: { },
  type: types.object,
}

describe('parseDescription', () => {
  it('should parse empty description correctly', () => {
    class Description { }

    const actual = parseDescription(Description)
    const expected = cloneDeep(baseExpectedDescription)

    expect(actual).toEqual(expected)
  })

  it('should parse readonly properties correctly', () => {
    class Description {
      @readonly readonlyString = string
    }

    const actual = parseDescription(Description)
    const expected = cloneDeep(baseExpectedDescription)

    expected.properties = {
      readonlyString: {
        readonly: true,
        optional: false,
        type: types.string
      }
    }

    expect(actual).toEqual(expected)
  })

  it('should parse mixed readonly and non-readonly properties correctly', () => {
    class Description {
      @readonly readonlyString = string
      nonReadonlyString = string
    }

    const actual = parseDescription(Description)
    const expected = cloneDeep(baseExpectedDescription)

    expected.properties = {
      readonlyString: {
        readonly: true,
        optional: false,
        type: types.string,
      },
      nonReadonlyString: {
        readonly: false,
        optional: false,
        type: types.string,
      }
    }

    expect(actual).toEqual(expected)
  })

  it('should parse optional properties correctly', () => {
    class Description {
      @optional optionalString = string
    }

    const actual = parseDescription(Description)
    const expected = cloneDeep(baseExpectedDescription)

    expected.properties = {
      optionalString: {
        readonly: false,
        optional: true,
        type: types.string
      }
    }

    expect(actual).toEqual(expected)
  })

  it('should parse mixed optional and non-optional properties correctly', () => {
    class Description {
      @optional optionalString = string
      nonOptionalString = string
    }

    const actual = parseDescription(Description)
    const expected = cloneDeep(baseExpectedDescription)

    expected.properties = {
      optionalString: {
        readonly: false,
        optional: true,
        type: types.string,
      },
      nonOptionalString: {
        readonly: false,
        optional: false,
        type: types.string,
      }
    }

    expect(actual).toEqual(expected)
  })

  it('should throw when trying to parse a string', () => {
    const actual = catchErrType(() => (parseDescription as any)(''))
    const expected = Error

    expect(actual).toBe(expected)
  })

  it('should throw when trying to parse a number', () => {
    const actual = catchErrType(() => (parseDescription as any)(0))
    const expected = Error

    expect(actual).toBe(expected)
  })

  it('should throw when trying to parse a boolean', () => {
    const actual = catchErrType(() => (parseDescription as any)(false))
    const expected = Error

    expect(actual).toBe(expected)
  })

  it('should throw when trying to parse an object', () => {
    const actual = catchErrType(() => (parseDescription as any)({}))
    const expected = Error

    expect(actual).toBe(expected)
  })

  it('should throw when tyring to parse an arrow function that isn\'t a class', () => {
    const actual = catchErrType(() => (parseDescription as any)(() => 0))
    const expected = Error

    expect(actual).toBe(expected)
  })

  it('should parse action correctly', () => {
    const fn = _0 => _1 => 0
    class Description {
      firstName = string
      changeFirstName = action(fn)
    }

    const actual = parseDescription(Description)
    const expected = cloneDeep(baseExpectedDescription)

    expected.properties = {
      firstName: {
        readonly: false,
        optional: false,
        type: types.string,
      },
      changeFirstName: {
        type: types.action, fn
      }
    }

    expect(actual).toEqual(expected)
  })

  it('should parse arrayOf number correctly', () => {
    class Description {
      nums = arrayOf(number)
    }

    const actual = parseDescription(Description)
    const expected = cloneDeep(baseExpectedDescription)

    expected.properties = {
      nums: {
        type: types.arrayOf,
        readonly: false,
        optional: false,
        kind: {
          readonly: false,
          optional: false,
          type: types.number,
        }
      }
    }

    expect(actual).toEqual(expected)
  })

  it('should parse arrayOf object correctly', () => {
    class Person {
      firstName = string
    }
    class Description {
      people = arrayOf(object(Person))
    }

    const actual = parseDescription(Description)
    const expected = cloneDeep(baseExpectedDescription)

    expected.properties = {
      people: {
        type: types.arrayOf,
        readonly: false,
        optional: false,
        kind: {
          readonly: false,
          optional: false,
          type: types.object,
          properties: {
            firstName: {
              readonly: false,
              optional: false,
              type: types.string
            }
          }
        }
      }
    }

    expect(actual).toEqual(expected)
  })

  it('should parse boolean correctly', () => {
    class Description {
      bool = boolean
    }

    const actual = parseDescription(Description)
    const expected = cloneDeep(baseExpectedDescription)

    expected.properties = {
      bool: {
        readonly: false,
        optional: false,
        type: types.boolean
      }
    }

    expect(actual).toEqual(expected)
  })

  it('should parse complex correctly', () => {
    const serialize = (d: Date) => d.toUTCString()
    const deserialize = (v: string) => new Date(v)
    class Description {
      date = complex(serialize, deserialize)
    }

    const actual = parseDescription(Description)
    const expected = cloneDeep(baseExpectedDescription)

    expected.properties = {
      date: {
        readonly: false,
        optional: false,
        type: types.complex,
        serialize,
        deserialize
      }
    }

    expect(actual).toEqual(expected)
  })

  it('should parse computed correctly', () => {
    const fn = () => 0
    class Description {
      zero = computed(fn)
    }

    const actual = parseDescription(Description)
    const expected = cloneDeep(baseExpectedDescription)

    expected.properties = {
      zero: {
        type: types.computed,
        fn
      }
    }

    expect(actual).toEqual(expected)
  })

  it('should parse mapOf number correctly', () => {
    class Description {
      nums = mapOf(number)
    }

    const actual = parseDescription(Description)
    const expected = cloneDeep(baseExpectedDescription)

    expected.properties = {
      nums: {
        type: types.mapOf,
        readonly: false,
        optional: false,
        kind: {
          readonly: false,
          optional: false,
          type: types.number,
        }
      }
    }

    expect(actual).toEqual(expected)
  })

  it('should parse mapOf object correctly', () => {
    class Person {
      firstName = string
    }
    class Description {
      people = mapOf(object(Person))
    }

    const actual = parseDescription(Description)
    const expected = cloneDeep(baseExpectedDescription)

    expected.properties = {
      people: {
        type: types.mapOf,
        readonly: false,
        optional: false,
        kind: {
          readonly: false,
          optional: false,
          type: types.object,
          properties: {
            firstName: {
              readonly: false,
              optional: false,
              type: types.string
            }
          }
        }
      }
    }

    expect(actual).toEqual(expected)
  })

  it('should parse number correctly', () => {
    class Description {
      num = number
    }

    const actual = parseDescription(Description)
    const expected = cloneDeep(baseExpectedDescription)

    expected.properties = {
      num: {
        readonly: false,
        optional: false,
        type: types.number
      }
    }

    expect(actual).toEqual(expected)
  })

  it('should parse object correctly', () => {
    class Person {
      firstName = string
    }
    class Description {
      person = object(Person)
    }

    const actual = parseDescription(Description)
    const expected = cloneDeep(baseExpectedDescription)

    expected.properties = {
      person: {
        readonly: false,
        optional: false,
        type: types.object,
        properties: {
          firstName: {
            readonly: false,
            optional: false,
            type: types.string
          }
        }
      }
    }

    expect(actual).toEqual(expected)
  })

  it('should parse oneOf correctly', () => {
    class Person {
      firstName = string
    }
    class Description {
      one = oneOf(object(Person), number, string)
    }

    const actual = parseDescription(Description)
    const expected = cloneDeep(baseExpectedDescription)

    expected.properties = {
      one: {
        readonly: false,
        optional: false,
        type: types.oneOf,
        kinds: [
          {
            type: types.object,
            readonly: false,
            optional: false,
            properties: {
              firstName: {
                type: types.string,
                readonly: false,
                optional: false,
              }
            }
          },
          {
            type: types.number,
            readonly: false,
            optional: false,
          },
          {
            type: types.string,
            readonly: false,
            optional: false,
          }
        ]
      }
    }

    expect(actual).toEqual(expected)
  })

  it('should parse string correctly', () => {
    class Description {
      str = string
    }

    const actual = parseDescription(Description)
    const expected = cloneDeep(baseExpectedDescription)

    expected.properties = {
      str: {
        readonly: false,
        optional: false,
        type: types.string
      }
    }

    expect(actual).toEqual(expected)
  })

  it('should parse a mix of all types correctly', () => {
    const serialize = (d: Date) => d.toUTCString()
    const deserialize = (v: string) => new Date(v)

    const changeName = (user: User) => (firstName: string, lastName: string) => {
      user.firstName = firstName
      user.lastName = lastName
    }

    const author = (message: Message, state: State) => state.users[message.authorId]

    class User {
      @readonly id = string
      firstName = string
      @optional lastName = string
      favoriteColors = arrayOf(string)
      cool = boolean
      dateOfBirth = complex(serialize, deserialize)
      changeName = action(changeName)
    }

    class Message {
      @readonly id = string
      authorId = string
      contents = string
      @readonly @optional awesome = oneOf(string, boolean)
      author = computed(author)
      likes = number
    }

    class State {
      users = mapOf(object(User))
      messages = mapOf(object(Message))
    }

    const actual = parseDescription(State)
    const expected = cloneDeep(baseExpectedDescription)

    expected.properties = {
      messages: {
        type: types.mapOf,
        readonly: false,
        optional: false,
        kind: {
          type: types.object,
          readonly: false,
          optional: false,
          properties: {
            author: {
              type: types.computed,
              fn: author,
            },
            likes: {
              readonly: false,
              optional: false,
              type: types.number,
            },
            id: {
              readonly: true,
              optional: false,
              type: types.string
            },
            authorId: {
              readonly: false,
              optional: false,
              type: types.string
            },
            contents: {
              readonly: false,
              optional: false,
              type: types.string,
            },
            awesome: {
              readonly: true,
              optional: true,
              type: types.oneOf,
              kinds: [
                {
                  type: types.string,
                  readonly: false,
                  optional: false,
                },
                {
                  type: types.boolean,
                  readonly: false,
                  optional: false,
                }
              ]
            }

          }
        }
      },
      users: {
        type: types.mapOf,
        readonly: false,
        optional: false,
        kind: {
          type: types.object,
          readonly: false,
          optional: false,
          properties: {
            id: {
              readonly: true,
              optional: false,
              type: types.string,
            },
            firstName: {
              readonly: false,
              optional: false,
              type: types.string,
            },
            lastName: {
              readonly: false,
              optional: true,
              type: types.string,
            },
            favoriteColors: {
              readonly: false,
              optional: false,
              type: types.arrayOf,
              kind: {
                readonly: false,
                optional: false,
                type: types.string,
              },
            },
            cool: {
              readonly: false,
              optional: false,
              type: types.boolean,
            },
            dateOfBirth: {
              readonly: false,
              optional: false,
              type: types.complex,
              serialize,
              deserialize
            },
            changeName: {
              type: types.action,
              fn: changeName
            }
          }
        }
      }
    }

    expect(actual).toEqual(expected)
  })

  it('should parse circular references correct', () => {
    class C1 {
      c2 = object(C2)
    }

    class C2 {
      c1 = object(C1)
    }

    class Description {
      c1 = object(C1)
      c2 = object(C2)
    }

    const actual = parseDescription(Description)
    const expected = cloneDeep(baseExpectedDescription)

    expected.properties = {
    }

    expect(actual).toEqual(expected)
  })
})
