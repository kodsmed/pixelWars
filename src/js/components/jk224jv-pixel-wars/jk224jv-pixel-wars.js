/**
 * The pixel-wars web component module.
 *
 * @author Jimmy Karlsson <jk224jv@student.lnu.se>
 * @license CC-BY-NC4.0 https://creativecommons.org/licenses/by-nc/4.0/
 * @version 2.1.1
 */

// Define template.
const template = document.createElement('template')
template.innerHTML = `
  <style>
    :host {
      font-size: 1.2em;
      color:black;
      overflow:hidden;
      width:750px;
    }
    div {
      width:750px;
      display:flex;
      flex-direction:column;
    }

    canvas {
      width:750px;
      height:750px;
    }
  </style>
  <canvas part="canvas" id="canvas"></canvas>
  <div class="buttonSpace" part="buttonSpace">
  <p part="instructions">Hold mouse to shoot. Aim with mouse.<br>
  Upgrades cost 100 * number of upgrades bought score.</p><hr>
  <button part="button" id="upgradeSpeed">++Firespeed++</button>
  <button part="button" id="upgradeBullet">++Bullet size++</button>
  <button part="button" id="upgradeRestoreHp">++Restore Tower++</button>
  </div>
`

customElements.define('jk224jv-pixel-wars',
  /**
   * Represents a pixel-wars element.
   *
   * @typedef {HtmlElement} HtmlElement
   *
   * @typedef {object} Square
   * @property {number} xPos - Location of the square on the x-axis.
   * @property {number} yPos - Location of the square on the y-axis.
   * @property {number} dX - How much does it move on the x-axis?
   * @property {number} dY - How much does it move on the y-axis?
   * @property {number} size - How big is the square? = How many hitpoints?
   *
   * @typedef {object} Bullet
   * @property {number} xPos - Location of the bullet on the x-axis.
   * @property {number} yPos - Location of the bullet on the y-axis.
   * @property {number} size - How big is the radius? = How much damage does it do?
   * @property {number} dX - How much does it move on the x-axis?
   * @property {number} dY - How much does it move on the y-axis?
   *
   * @typedef {object} Tower
   * @property {number} xPos - Location of the Tower on the x-axis. 750 / 2
   * @property {number} yPos - Location of the Tower on the y-axis. 750 / 2
   * @property {number} size - How big is the Tower radius? = How many hitpoints?
   * @property {number} fireSize - How big bullets does the tower shoot?
   * @property {number} fireDelay - How long btw shooting?
   */
  class extends HTMLElement {
    /**
     * Element representing the game board and rendering.
     */
    #canvas
    #ctx

    /**
     * Keeps track of "enemies"
     */
    #squares

    /**
     * Keeps track of "bullets"
     */
    #bullets

    /**
     * keeps track of the tower's (players) state
     */
    #tower

    /**
     * Keeps track of the gameEngine timeout-id
     */
    #gameEngineTimeOut

    /**
     * Keeps track of the shootings intervall-id
     */
    #shootingIntervalId

    /**
     * Keep track of settings.
     */
    #settings

    /**
     * Keep track of the current game-level.
     */
    #level

    /**
     * Keeps track of where the mouse is.
     */
    #mouseLocation

    /**
     * Creates an instance of the current type.
     */
    constructor () {
      super()

      // Attach a shadow DOM tree to this element and
      // append the template to the shadow root.
      this.attachShadow({ mode: 'open' })
        .appendChild(template.content.cloneNode(true))

      // Get the canvas element.
      this.#canvas = this.shadowRoot.querySelector('canvas')
      this.#ctx = this.#canvas.getContext('2d')

      // Get the DPR and size of the canvas
      const dpr = window.devicePixelRatio
      const rect = this.#canvas.getBoundingClientRect()

      // Set the "actual" size of the canvas
      this.#canvas.width = rect.width * dpr
      this.#canvas.height = rect.height * dpr

      // Set the "drawn" size of the canvas
      this.#canvas.style.width = `${rect.width}px`
      this.#canvas.style.height = `${rect.height}px`

      this.#ctx.fillStyle = 'red'

      // Set and store settings.
      this.#settings = {
        tickTime: 10,
        tickNumber: 0,
        backgroundColor: 'white',
        fillColor: 'red',
        color: 'black'
      }

      this.#bullets = []
      this.#squares = []

      this.#level = 1

      this.#tower = {
        xPos: Math.floor(750 / 2),
        yPos: Math.floor(750 / 2),
        size: 50,
        fireSize: 5,
        fireDelay: 300,
        score: 0,
        squaresDestroyed: 0,
        upgradesBought: 0
      }

      this.#drawCircle(this.#tower)
    }

    /**
     * Watches the attributes for changes on the element.
     *
     * @returns {string[]} attributes.
     */
    static get observedAttributes () {
      return ['startlevel']
    }

    /**
     * Called by the browser engine when an attribute changes.
     *
     * @param {string} name of the attribute.
     * @param {any} oldValue the old attribute value.
     * @param {any} newValue the new attribute value.
     */
    attributeChangedCallback (name, oldValue, newValue) {
      if (name === 'startlevel' && oldValue !== newValue) {
        this.#level = newValue
      }
    }

    /**
     * Called after the element is inserted into the DOM.
     */
    connectedCallback () {
      const canvas = this.shadowRoot.getElementById('canvas')
      canvas.addEventListener('mousedown', (event) => this.#startShooting())
      canvas.addEventListener('mousemove', (event) => this.#mouseTracker(event))
      canvas.addEventListener('mouseup', (event) => this.#stopShooting())
      canvas.addEventListener('mouseleave', (event) => this.pause())
      canvas.addEventListener('mouseenter', (event) => this.#gameEngineLoop())
      this.addEventListener('gameOver', (event) => this.#gameOver())

      const speedUpgrade = this.shadowRoot.getElementById('upgradeSpeed')
      const bulletUpgrade = this.shadowRoot.getElementById('upgradeBullet')
      const resterTowerHp = this.shadowRoot.getElementById('upgradeRestoreHp')
      speedUpgrade.addEventListener('click', (event) => this.#buyUpgrade('speed'))
      bulletUpgrade.addEventListener('click', (event) => this.#buyUpgrade('bullet'))
      resterTowerHp.addEventListener('click', (event) => this.#buyUpgrade('hp'))
    }

    /**
     * Buys tower upgrades.
     *
     * @param {string} event - what are we buying?.
     */
    #buyUpgrade (event) {
      // is there enough score to buy anything?
      if (this.#tower.score >= (100 + 100 * this.#tower.upgradesBought)) {
        switch (event) {
          case 'speed':
            this.#tower.fireDelay -= 50
            break
          case 'bullet':
            this.#tower.fireSize += 5
            break
          case 'hp':
            this.#tower.size = 50
            break
        }
        this.#tower.score -= (100 + 100 * this.#tower.upgradesBought)
        if (this.#tower.fireDelay === 50) {
          this.shadowRoot.getElementById('upgradeSpeed').disabled = true
        }
      }
      this.#render()
    }

    /**
     * Save the mouse position so its usable to all methods.
     *
     * @param {event} event - event.
     */
    #mouseTracker (event) {
      this.#mouseLocation = { x: event.pageX, y: event.pageY }
    }

    /**
     * Game Engine Loop. This runs the game.
     */
    #gameEngineLoop () {
      this.#gameEngineTimeOut = window.setTimeout(this.#gameEngineLoop.bind(this), this.#settings.tickTime)
      this.#settings.tickNumber++

      // if there is fewer squares than the current level says it should be, make a new one.
      if (this.#squares.length < this.#level) {
        this.#squares.push(this.#newSquare())
      }
      // move bullets every tick.
      this.#moveBullets()

      // move squares every 10 ticks
      if (this.#settings.tickNumber % 5 === 0) {
        this.#moveSquares()
      }

      this.#render()
      this.#checkHits()

      // check if its time to increase the level
      if (this.#tower.squaresDestroyed >= this.#level) {
        this.#level++
        this.#tower.squaresDestroyed = 0
      }
    }

    /**
     * Render the gameboard.
     */
    #render () {
      this.#clear()
      this.#drawCircle(this.#tower)
      for (let bullet = 0; bullet < this.#bullets.length; bullet++) {
        this.#drawCircle(this.#bullets[bullet])
      }
      for (let square = 0; square < this.#squares.length; square++) {
        this.#drawSquare(this.#squares[square])
      }
      this.#drawScore()
      this.#drawStatistics()
    }

    /**
     * Findout if any of the objects are coliding and deal with the result of that.
     */
    #checkHits () {
      for (let squareNr = 0; squareNr < this.#squares.length; squareNr++) {
        // squares pos is topleft
        const square = this.#squares[squareNr]

        // is the square at the tower ?
        if (this.#overlaps(this.#tower, square)) {
          // make the hit count.
          // will there be a tower left?
          if (this.#tower.size - square.size > 0) {
            this.#tower.size -= square.size // reduce the hitpoints
            this.#squares.splice(squareNr, 1) // remove the square
            squareNr-- // this square is no more
            continue // so skip checking if bullets hits it.
          } else { // no more tower... game over!
            this.dispatchEvent(new window.CustomEvent('gameOver'))
            break
          }
        }

        // check where bullets are
        for (let index = 0; index < this.#bullets.length; index++) {
          const bullet = this.#bullets[index]
          // if the bullet is out of bounds -> remove it.
          if (bullet.xPos < 0 || bullet.xPos > 750 || bullet.yPos < 0 || bullet.yPos > 750) {
            this.#bullets.splice(index, 1)
            index--
            // this bullet was pointless so no need to check if it hits a square.
            continue // skips to next index.
          }

          // if (!(bulletLeftOfSquare || bulletRightOfSquare || bulletAboveSquare || bulletBelowSquare)) {
          if (this.#overlaps(bullet, square)) {
            // make the hit count.
            // will there be a square left?
            if (square.size - bullet.size > 1) {
              square.size = square.size - bullet.size // reduce the hitpoints
              this.#bullets.splice(index, 1) // delete the bullet
              this.#tower.score += bullet.size // add the hit to score
              index--
            } else { // otherwise
              this.#squares.splice(squareNr, 1) // remove the square
              if (bullet.size - square.size >= 1) {
                bullet.size -= square.size // shrink the bullet
              } else { // or
                this.#bullets.splice(index, 1) // delete the bullet
              }
              this.#tower.score += square.size // add the hit to score
              this.#tower.squaresDestroyed++
              index--
            }
          }
        }
      }
    }

    /**
     * Check if two bodies intersects.
     *
     * @param {bullet} circle - bullet or tower.
     * @param {square} square - square.
     * @returns {boolean} intersects? true or false
     */
    #overlaps (circle, square) {
    // Find the nearest point on the
    // rectangle to the center of
    // the circle
      const Xn = Math.max(square.xPos, Math.min(circle.xPos, square.xPos + square.size))
      const Yn = Math.max(square.yPos, Math.min(circle.yPos, square.yPos + square.size))

      // Find the distance between the
      // nearest point and the center
      // of the circle
      // Distance between 2 points,
      // (x1, y1) & (x2, y2) in
      // 2D Euclidean space is
      // ((x1-x2)**2 + (y1-y2)**2)**0.5
      const Dx = Xn - circle.xPos
      const Dy = Yn - circle.yPos
      return (Dx * Dx + Dy * Dy) <= circle.size * circle.size
    }

    /**
     * Moves bullets allong their trejectory.
     */
    #moveBullets () {
      for (let index = 0; index < this.#bullets.length; index++) {
        const bullet = this.#bullets[index]
        bullet.xPos += bullet.dX
        bullet.yPos += bullet.dY
      }
    }

    /**
     * Moves squares allong their trejectory.
     */
    #moveSquares () {
      for (let index = 0; index < this.#squares.length; index++) {
        const square = this.#squares[index]
        square.xPos += square.dX
        square.yPos += square.dY
      }
    }

    /**
     * Creates new bullets.
     */
    #shoot () {
      this.#bullets.push(this.#newBullet(this.#tower.fireSize))
    }

    /**
     * Creates new bullets.
     */
    #startShooting () {
      this.#shootingIntervalId = window.setInterval(this.#shoot.bind(this), this.#tower.fireDelay)
    }

    /**
     * Stops the shooting interval.
     */
    #stopShooting () {
      window.clearInterval(this.#shootingIntervalId)
    }

    /**
     * Makes squares.
     *
     * @returns {Square} - a square object.
     */
    #newSquare () {
      // pick spawnside
      const sideNr = (Math.random() * 40)
      let x = 0
      let y = 0

      if (sideNr >= 0 && sideNr < 10) {
        x = 0
        y = Math.floor(Math.random() * 750 + 1)
      }
      if (sideNr >= 10 && sideNr < 20) {
        x = 750
        y = Math.floor(Math.random() * 750 + 1)
      }
      if (sideNr >= 20 && sideNr < 30) {
        x = Math.floor(Math.random() * 750 + 1)
        y = 0
      }
      if (sideNr >= 30 && sideNr <= 40) {
        x = Math.floor(Math.random() * 750 + 1)
        y = 750
      }

      const side = 10 + (10 * Math.floor(this.#level / 10))

      // find the angle btw spawninglocation and tower
      const dy = y - this.#tower.yPos
      const dx = x - this.#tower.xPos
      let angle = Math.atan2(dy, dx) // range (-PI, PI]
      angle *= 180 / Math.PI // rads to degs, range (-180, 180]
      if (angle < 0) {
        angle = 360 + angle // range [0, 360)
      }

      // find the movingspeed in x and y
      const deltaX = 0 - (Math.cos(angle * Math.PI / 180) * (Math.floor(this.#level / 10) + 1))
      const deltaY = 0 - (Math.sin(angle * Math.PI / 180) * (Math.floor(this.#level / 10) + 1))
      return { xPos: x, yPos: y, dX: deltaX, dY: deltaY, size: side }
    }

    /**
     * Makes a new bullet.
     *
     * @param {number} radius - how big is the bullet radius?
     * @returns {Bullet} - a bullet object.
     */
    #newBullet (radius) {
      const x = parseFloat(this.#tower.xPos)
      const y = parseFloat(this.#tower.yPos)

      // find the angle btw mouselocation and tower
      const dy = this.#mouseLocation.y - this.#tower.yPos
      const dx = this.#mouseLocation.x - this.#tower.xPos
      let angle = Math.atan2(dy, dx) // range (-PI, PI)
      angle *= 180 / Math.PI // rads to degs, range (-180, 180)
      if (angle < 0) {
        angle = 360 + angle // range (0, 360)
      }

      const deltaX = (Math.cos(angle * Math.PI / 180) * 10)
      const deltaY = (Math.sin(angle * Math.PI / 180) * 10)
      return { xPos: x, yPos: y, size: radius, dX: deltaX, dY: deltaY }
    }

    /**
     * Draws a circle at object xPos, objeckt yPos.
     *
     * @param {Bullet} bullet - the object to draw.
     */
    #drawCircle (bullet) {
      this.#ctx.beginPath()
      this.#ctx.arc(bullet.xPos, bullet.yPos, Math.floor(bullet.size / 2), 0, 2 * Math.PI)
      this.#ctx.stroke()
    }

    /**
     * Draws a square at objecty xPos, object yPos.
     *
     * @param {Square} square - a Square object.
     */
    #drawSquare (square) {
      this.#ctx.fillStyle = 'red'
      this.#ctx.fillRect(square.xPos, square.yPos, square.size, square.size)
    }

    /**
     * Draws the score at x, y.
     *
     * @param {number} x - location on the x-axis. default = 10
     * @param {number} y - location on the y-axis. default = 10
     */
    #drawScore (x = 10, y = 10) {
      const str = `Score: ${this.#tower.score}`
      const strWidth = this.#ctx.measureText(str).width
      this.#ctx.fillStyle = this.#settings.backgroundColor
      this.#ctx.fillRect(x, 0, strWidth, 30)
      this.#ctx.fillStyle = this.#settings.fillColor
      this.#ctx.fillText(str, x, y)
      this.#ctx.fillText(`Level: ${this.#level}`, x, y + 15)
    }

    /**
     * Draws statistics.
     */
    #drawStatistics () {
      const str = `Firedelay: ${this.#tower.fireDelay}   Bullet-size: ${this.#tower.fireSize}   Upgrade cost:${100 + (100 * this.#tower.upgradesBought)}`
      const strWidth = this.#ctx.measureText(str).width
      this.#ctx.fillStyle = this.#settings.backgroundColor
      this.#ctx.fillRect(10, 730, strWidth, 15)
      this.#ctx.fillStyle = this.#settings.fillColor
      this.#ctx.fillText(str, 10, 740)
    }

    /**
     * Clear the canvas.
     *
     * @returns {HtmlElement} The current instance.
     */
    #clear () {
      this.#ctx.clearRect(0, 0, 750, 750)
      return this
    }

    /**
     * Pause. Stops the gameEngine.
     *
     * @returns {HtmlElement} The current instance.
     */
    pause () {
      window.clearTimeout(this.#gameEngineTimeOut)
      this.#stopShooting()
      return this
    }

    /**
     * Game over! End timeout and interval.
     * Write score and credits.
     */
    #gameOver () {
      this.#clear()
      window.clearTimeout(this.#gameEngineTimeOut)
      window.clearInterval(this.#shootingIntervalId)
      console.log('gamemove fires')
      this.#clear()
      this.#ctx.shadowColor = '#dddddd'
      this.#ctx.shadowBlur = 15
      this.#ctx.fillStyle = 'black'
      const xOrigin = Math.floor(this.#canvas.width / 2)
      const yOringin = Math.floor(this.#canvas.height / 5)
      this.#ctx.font = '18px monospace'
      this.#ctx.textAlign = 'center'
      this.#ctx.fillText('++ Thank you for playing ++', xOrigin, yOringin)
      this.#ctx.lineWidth = 5
      this.#ctx.lineCap = 'round'
      this.#ctx.beginPath()
      this.#ctx.moveTo(Math.floor(this.#canvas.width * 0.2), yOringin + 35)
      this.#ctx.lineTo(Math.floor(this.#canvas.width * 0.8), yOringin + 35)
      this.#ctx.stroke()

      this.#ctx.font = '36px monospace'
      this.#ctx.lineWidth = 1
      this.#ctx.strokeText('Pixel Wars!', xOrigin, yOringin + 85)
      this.#ctx.font = '18px monospace'
      this.#ctx.fillText('by', xOrigin, yOringin + 110)
      this.#ctx.font = 'italic 24px monospace'
      this.#ctx.fillText('Jimmy Karlsson', xOrigin, yOringin + 140)
      this.#ctx.font = ' 18px monospace'
      this.#ctx.strokeText('codesmith - junior apprentice grade', xOrigin, yOringin + 165)
      this.#ctx.fillText('Schoolarium : Linnéuniversitetet', xOrigin, yOringin + 190)
      this.#ctx.fillText('Holy Terra', xOrigin, yOringin + 210)
      this.#ctx.fillText('++ Praise the Omnissiah! ++', xOrigin, yOringin + 290)
      this.#ctx.lineWidth = 5
      this.#ctx.lineCap = 'round'
      this.#ctx.beginPath()
      this.#ctx.moveTo(Math.floor(this.#canvas.width * 0.2), yOringin + 240)
      this.#ctx.lineTo(Math.floor(this.#canvas.width * 0.8), yOringin + 240)
      this.#ctx.stroke()
      this.#ctx.fillText(`Final score: ${this.#tower.score}`, xOrigin, yOringin + 260)
    }

    /**
     * Called after the element has been removed from the DOM.
     */
    disconnectedCallback () {
      window.clearTimeout(this.#gameEngineTimeOut)
      window.clearInterval(this.#shootingIntervalId)
    }
  }
)
