import * as core from '../core'

export type Diff = {
  path: string[]
  from: JSONValue
  to: JSONValue
}

export type JSONValue = string | number | boolean | JSONObject | JSONArray

export interface JSONObject {
  [key: string]: JSONValue
}

export interface JSONArray extends Array<JSONValue> { }

export function applyDiffs(observable: object, diffs: Diff[]) {
  console.log(observable, diffs)
  throw new Error('Apply Diffs is not yet implemented')
}

export function clearDiff() {
}

export function getDiff(): Diff[] {
  return []
}

let isCapturingCounter = 0
let startValue

export function startDiffCapture(parent: object, key: string) {
  if (isCapturingCounter === 0) {
    startValue = snapshot(parent, key)
  }
  isCapturingCounter++
}

export function endDiffCapture(parent: object, key: string, didChange: boolean, path: string[]) {
  isCapturingCounter--
  if (isCapturingCounter === 0) {
    const endValue = snapshot(parent, key)
    recordDiff(startValue, endValue, path, didChange)
  }
}

export function recordDiff(from: object, to: object, path: string[], didChange?: boolean) {
  if (isCapturingCounter === 0 && didChange && JSON.stringify(to) !== JSON.stringify(from)) {
    console.log('AT', path, 'FROM', from, 'TO', to)
  }
}

function snapshot(target, key) {
  core.incrementSnapshotAsJSON()
  let value = target[key]
  if (value != null && typeof value === 'object' && core.isObservable(value)) {
    value = value.getSnapshot({ asJSON: true })
  }
  core.decrementSnapshotAsJSON()
  return value
}
