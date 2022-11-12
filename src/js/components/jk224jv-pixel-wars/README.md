# &lt;Pixel Wars&gt;

A web component is providing a small game where the player controls the central tower shooting the evil squares trying to destroy is.

Shooting is aimed with the mouse pointer location, hold a mouse button to fire.
The game pause if the mousepointer is brought outside of the canvas.

## Attributes

### `startlevel`

Designate what level the game will start on.
Default value: `1`, ballaned around 1, only change if you want it Hard!

### `backgroundcolor`

Sets the background color of the component.
Personal suggestion : '#eeeeee'
Default value: 'white'

### `friendlycolor`

Sets the color of the central tower and the bullets.
Personal suggestion: 'green'
Default value: 'black'

### `enemycolor`

Sets the color of the Eeeevil squares.
Personal suggestion: 'red'
Default value: 'black'

### `textcolor`

Sets the color of the text for the score, statistics, instructions and credits.
Personal suggestion: 'black'
Default value: 'black'

## Public Methods

### `pause()`
Returns: Reference to self.


## Events

| Event Name | Fired When |
|------------|------------|
| `gameOver` | The tower size = Hp is reduced to <= 0.

## Styling with CSS

The text (p element) is styleable using the part `instructions` *note: this is affected by the textcolor attribute*.

The (div element) holding the buttons is styleable using the part `buttonSpace`

The buttons is styleable using the part `buttons`


## Example

```html
   <body>
  <jk224jv-pixel-wars startlevel="1" backgroundcolor="#eeeeee" friendlycolor="green" enemycolor="red" textcolor="black"></jk224jv-pixel-wars>
</body>
```

![Example of the game](./.readme/screenshot.png)
