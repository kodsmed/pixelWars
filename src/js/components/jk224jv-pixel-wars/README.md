# &lt;Pixel Wars&gt;

A web component is providing a small game where the player controls the central tower shooting the evil squares trying to destroy is. 

Shooting is aimed with the mouse pointer location, hold a mouse button to fire.

## Attributes

### `level`

Designate what level the game will start on.

Default value: `1`

## Methods

### `pause()`


Returns: Reference to self.



## Events

| Event Name | Fired When |
|------------|------------|
| `filled`| The board is filled with text.

## Styling with CSS

The text (p element) is styleable using the part `text`

## Example

```html
   <bart-board text="This is the text that will be written" speed="50"></bart-board>
```

![Example of the functions of the bart-board](./.readme/example.gif)
