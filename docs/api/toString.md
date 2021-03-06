## `toString`

`toString` can be called on any observable object to serialize it.

```javascript
import { createObservable, number } from 'fnx'

class State {
  num = number
}

const initialState = {
  num: 1
}

const state = createObservable(State, initialState)

state.toString() // '{"num":1}'
```

**Important** Any value set to undefined is serialized as null due to how JSON.stringify behaves.
