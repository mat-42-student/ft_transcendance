# About Gameobjects

What I call 'Gameobjects' are just [ThreeJS Object3D's](https://threejs.org/docs/index.html?q=scene#api/en/scenes/Scene).
(or any child class, from ThreeJS itself or this codebase)

Engine.js looks for the presence of these _optional_ methods, which it calls automatically:


## `onAdded(): void`

**Called when:** ThreeJS's [`'childadded'`](https://threejs.org/docs/index.html?q=scene#api/en/core/Object3D)
event fires.

This provides an alternative method of initialization _after_ the JS constructor,
where the Object3D can find itself already in its parent Object3D.

For the root scene (child classes of `LevelBase`), this should be used for adding child objects,
since the necessary methods wont be automatically injected in its constructor.


## `onFrame(delta: number, time: DOMHighResTimestamp): void`

**Called when:** Before calling `Engine.#renderer.render()` (check source code).
`Engine.render()` is called by [`requestAnimationFrame()`](https://developer.mozilla.org/en-US/docs/Web/API/Window/requestAnimationFrame).

The time interval between calls is variable and depends on what the browser decides, and what the hardware can manage.
This is why `delta` and `time` are provided, to allow for framerate independent logic.

`delta` is the time in seconds (float) since the previous frame.

`time` is the current timestamp.


## `dispose(): void`

**Called when:** ThreeJS's [`'removed'`](https://threejs.org/docs/index.html?q=scene#api/en/core/Object3D)
event fires.

This means removing an Object3D from a parent automatically calls `dispose()`,
whether it's a ThreeJS function or your own custom code.

A Gameobject can opt out of this behaviour by defining the member `noAutoDispose = true;`.
