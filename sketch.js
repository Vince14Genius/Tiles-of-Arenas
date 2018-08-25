/* 
Known bugs:
-currently none-

Features to implement: 
0. Renew resources
1. King Tiles
2. Ranking System
3. Intro Screen
4. Tile Descriptions
5. Animations for Collecting Resources
6. End Screen
7. Zoom in/out
8. Death/respawn/kill loot
*/

// Variables used for fps
let frameTime = 0 // Time at which the current frame is updated
let oldTime = 0 // Time at which the previous frame is updated
let fpsCooldown = 0 // When fpsCooldown <= 0, set displayFPS = fps
let fps = 1 // Ratio of (1000ms) to (difference between frameTime and oldTime)
let displayFPS = 0 // fps displayed on screen, updated every second

var miniMapMinX = 10
var miniMapMinY = 88

var TileTypes = {
    obstacle: 81001,
    objective: 81002,
    skipTile: 81003,
    dominanceTile: 81004,
    durableTile: 81005,
    regularTile: 81006,
    kingObjective: 81007
}
Object.freeze(TileTypes)

var Cycle = {
    numberOfSteps: 2,
    PLACE_BLOCKS: 0,
    REMOVE_BLOCK: 1
}
Object.freeze(Cycle)

var ScrollEngine = {
    scale: 50,
    targetX: undefined,
    targetY: undefined,
    x: 0,
    y: 0,
    previousX: null,
    previousY: null,
    isDraggingMinimap: false,
    isDraggingMap: false,
    miniMapMaxX: undefined,
    miniMapMaxY: undefined,
    mapSize: undefined,

    setPosition: function (x, y) {
        this.targetX = x
        this.targetY = y

        if (this.targetX < 0) {
            this.targetX = 0
        }
        if (this.targetY < 0) {
            this.targetY = 0
        }
        if (this.targetX > this.mapSize) {
            this.targetX = this.mapSize
        }
        if (this.targetY > this.mapSize) {
            this.targetY = this.mapSize
        }
    },

    changePositionBy: function (x, y) {
        this.setPosition(x + this.targetX, y + this.targetY)
    },

    update: function () {
        var deltaX = this.targetX - this.x
        var deltaY = this.targetY - this.y
        this.x += deltaX * 0.3
        this.y += deltaY * 0.3
        if (Math.abs(deltaX) < 0.1) {
            this.x = this.targetX
        }
        if (Math.abs(deltaY) < 0.1) {
            this.y = this.targetY
        }
    },

    processDrag: function (x, y) {
        if (this.isDraggingMinimap) {
            this.setPosition((x - miniMapMinX) / 5, (y - miniMapMinY) / 5)
        } else if (this.isDraggingMap) {
            if (this.previousX !== null) {
                this.changePositionBy((this.previousX - x) / this.scale, (this.previousY - y) / this.scale)
            }
            this.previousX = x
            this.previousY = y
        } else if (this.isHoveringOnMinimap(x, y)) {
            this.isDraggingMinimap = true
        } else {
            this.isDraggingMap = true
        }
    },

    endDrag: function () {
        this.isDraggingMinimap = false
        this.isDraggingMap = false
        this.previousX = null
        this.previousY = null
    },

    isHoveringOnMinimap: function (x, y) {
        return miniMapMinX <= x && x <= this.miniMapMaxX && miniMapMinY <= y && y <= this.miniMapMaxY
    }
}

function getRandomTileType() {
    var type
    var randomPick = Math.random()
    if (randomPick < 0.6) {
        type = TileTypes.regularTile
    } else if (randomPick < 0.8) {
        type = TileTypes.obstacle
    } else if (randomPick < 0.85) {
        type = TileTypes.objective
    } else if (randomPick < 0.88) {
        type = TileTypes.skipTile
    } else if (randomPick < 0.95) {
        type = TileTypes.durableTile
    } else if (randomPick < 1.0) {
        type = TileTypes.dominanceTile
    }
    return type
}

function getColorForTypeInTile(tile) {
    if (tile.type === TileTypes.obstacle) {
        return [50, 50, 50]
    } else if (tile.owner === null && tile.type === TileTypes.objective) {
        return [60, 0, 60]
    } else if (tile.owner === null && tile.type === TileTypes.regularTile) {
        return [35, 35, 35]
    } else if (tile.owner === null)
        return [0, 60, 0]
    else if (tile.owner === Game.currentCyclePlayer)
        return [0, 200, 255]
    else
        return [255, 0, 0]
}

var Game = {
    players: [],
    tiles: [],
    currentCyclePlayer: undefined,
    currentCyclePlayerIndex: 0,
    currentStepInCycle: 0,
    currentCycleConfirmable: false,
    currentPlayerTilesToPlace: null,
    isClicking: false,

    startGame: function (mapSize, playerNames) {
        this.players = []
        this.tiles = []

        // Generate tiles
        for (var x = 0; x < mapSize; x++) {
            var column = []
            for (var y = 0; y < mapSize; y++) {
                column.push(new Tile(getRandomTileType(), x, y))
            }
            this.tiles.push(column)
        }

        // Create players
        for (i in playerNames) {
            var newPlayer = new Player(i, playerNames[i], false)
            this.players.push(newPlayer)
        }

        ScrollEngine.setPosition(mapSize / 2, mapSize / 2)
        ScrollEngine.mapSize = mapSize

        this.currentCyclePlayer = this.players[0]
        this.moveToPlayerCenter()
    },

    stepCycle: function () {
        this.currentStepInCycle += 1
        if (this.currentStepInCycle >= Cycle.numberOfSteps) {
            // Step index
            this.currentStepInCycle = 0
            this.currentCyclePlayerIndex += 1
            // Reset index when over last player
            if (this.currentCyclePlayerIndex >= this.players.length) {
                this.currentCyclePlayerIndex = 0
            }
            // Set player to player at index
            this.currentCyclePlayer = this.players[this.currentCyclePlayerIndex]
            this.moveToPlayerCenter()
        }
    },

    runCycle: function () {
        ScrollEngine.update()
        this.renderMap()
        if (this.currentCyclePlayer.useAIInsteadOfControls) {
            /* Code for AI */
        } else {
            /* Normal gameplay loop */
            if (!ScrollEngine.isHoveringOnMinimap(mouseX, mouseY)) {
                var mouseXToTiles = Math.floor((mouseX - windowWidth / 2) / ScrollEngine.scale + ScrollEngine.x)
                var mouseYToTiles = Math.floor((mouseY - windowHeight / 2) / ScrollEngine.scale + ScrollEngine.y)

                if (0 <= mouseXToTiles && mouseXToTiles < this.tiles.length && 0 <= mouseYToTiles && mouseYToTiles < this.tiles.length) {
                    var thisTile = this.tiles[mouseXToTiles][mouseYToTiles]
                    switch (this.currentStepInCycle) {
                        case (Cycle.PLACE_BLOCKS):
                            // Set extraCount if it was null
                            if (this.currentPlayerTilesToPlace === null) {
                                this.currentPlayerTilesToPlace = 2 + this.currentCyclePlayer.extraCount
                            }
                            // Highlight hovered available tile
                            if (thisTile.owner !== this.currentCyclePlayer && thisTile.type !== TileTypes.obstacle && this.checkReachability(thisTile)) {
                                noStroke()
                                fill(255, 255, 255, 75)
                                rect((mouseXToTiles - ScrollEngine.x) * ScrollEngine.scale + windowWidth / 2,
                                    (mouseYToTiles - ScrollEngine.y) * ScrollEngine.scale + windowHeight / 2,
                                    ScrollEngine.scale,
                                    ScrollEngine.scale)
                            } else if (this.currentCyclePlayer.dominanceCount > 0 && thisTile.type === TileTypes.obstacle && this.checkReachability(thisTile)) {
                                noStroke()
                                fill(255, 255, 255, 75)
                                rect((mouseXToTiles - ScrollEngine.x) * ScrollEngine.scale + windowWidth / 2,
                                    (mouseYToTiles - ScrollEngine.y) * ScrollEngine.scale + windowHeight / 2,
                                    ScrollEngine.scale,
                                    ScrollEngine.scale)
                            }
                            break
                        case (Cycle.REMOVE_BLOCK):
                            // Set extraCount 
                            this.currentPlayerTilesToPlace = null
                            // Highlight hovered available tile
                            if (thisTile.owner === this.currentCyclePlayer) {
                                noStroke()
                                fill(255, 255, 255, 75)
                                rect((mouseXToTiles - ScrollEngine.x) * ScrollEngine.scale + windowWidth / 2,
                                    (mouseYToTiles - ScrollEngine.y) * ScrollEngine.scale + windowHeight / 2,
                                    ScrollEngine.scale,
                                    ScrollEngine.scale)
                            }
                            break
                    }
                }
            }
        }
        this.renderOverlayUI()
    },

    renderMap: function () {
        for (var x = 0; x < this.tiles.length; x++) {
            for (var y = 0; y < this.tiles.length; y++) {
                this.tiles[x][y].render()
            }
        }
    },

    renderMinimap: function () {
        // Draw base
        fill(0)
        noStroke()
        var frameSize = this.tiles.length * 5 + 19
        rect(miniMapMinX, miniMapMinY, frameSize, frameSize)

        // Give some values to ScrollEngine
        ScrollEngine.miniMapMaxX = miniMapMinX + frameSize
        ScrollEngine.miniMapMaxY = miniMapMinY + frameSize

        // Render small tiles
        for (var x = 0; x < this.tiles.length; x++) {
            for (var y = 0; y < this.tiles.length; y++) {
                var tile = this.tiles[x][y]
                var color = getColorForTypeInTile(tile)
                fill(color[0], color[1], color[2])
                rect(miniMapMinX + 10 + x * 5, miniMapMinY + 10 + y * 5, 4, 4)
            }
        }

        // Draw frame
        noFill()
        stroke(255, 255, 255, 100)
        strokeWeight(2)
        var tilizedWindowWidth = windowWidth * 5 / ScrollEngine.scale
        var tilizedWindowHeight = windowHeight * 5 / ScrollEngine.scale
        rect(miniMapMinX + 10 + ScrollEngine.x * 5 - tilizedWindowWidth * 0.5, miniMapMinY + 10 + ScrollEngine.y * 5 - tilizedWindowHeight * 0.5, tilizedWindowWidth, tilizedWindowHeight)
    },

    renderOverlayUI: function () {
        this.renderMinimap()
        /* Render instructions */
        if (!this.currentCyclePlayer.useAIInsteadOfControls) {
            noStroke()
            fill(0, 0, 0, 150)
            rect(0, 0, windowWidth, 68)
            fill(200)
            textSize(28)
            textAlign(CENTER, TOP)
            switch (this.currentStepInCycle) {
                case (Cycle.PLACE_BLOCKS):
                    text(`Please click on an available tile to occupy it. (${this.currentPlayerTilesToPlace} left)`, windowWidth / 2, 20)
                    textSize(14)
                    text(`Domi: ${this.currentCyclePlayer.dominanceCount}\nSkip: ${this.currentCyclePlayer.skipCount}\nDura: ${this.currentCyclePlayer.durableCount}\nExtr: ${this.currentCyclePlayer.extraCount}`, windowWidth / 2, 88)
                    break
                case (Cycle.REMOVE_BLOCK):
                    text(`Please click and remove one of your occupied tiles to proceed. `, windowWidth / 2, 20)
                    break
            }
        }
    },

    processPress: function (x, y) {
        if (ScrollEngine.isHoveringOnMinimap(x, y)) {
            this.isClicking = false
        } else {
            this.isClicking = true
        }
    },

    processDrag: function (x, y) {
        this.isClicking = false
    },

    processReleased: function (x, y) {
        if (this.isClicking && !ScrollEngine.isHoveringOnMinimap(mouseX, mouseY)) {
            var mouseXToTiles = Math.floor((mouseX - windowWidth / 2) / ScrollEngine.scale + ScrollEngine.x)
            var mouseYToTiles = Math.floor((mouseY - windowHeight / 2) / ScrollEngine.scale + ScrollEngine.y)

            if (0 <= mouseXToTiles && mouseXToTiles < this.tiles.length && 0 <= mouseYToTiles && mouseYToTiles < this.tiles.length) {
                var thisTile = this.tiles[mouseXToTiles][mouseYToTiles]
                switch (this.currentStepInCycle) {
                    case (Cycle.PLACE_BLOCKS):
                        if (thisTile.type !== TileTypes.obstacle && this.checkReachability(thisTile)) {
                            if (thisTile.owner === this.currentCyclePlayer) {
                                if (thisTile.type === TileTypes.regularTile) {
                                    // Do the durable tile override thing
                                    if (this.currentCyclePlayer.durableCount > 0) {
                                        thisTile.type = TileTypes.durableTile
                                        this.currentCyclePlayer.durableCount -= 1
                                        // No need to increment because it never decreased
                                    }
                                }
                            } else {
                                if (this.currentCyclePlayer.skipCount > 0) {
                                    this.currentCyclePlayer.skipCount -= 1
                                }
                                if (thisTile.owner === null) {
                                    // Give tile to current player
                                    thisTile.owner = this.currentCyclePlayer
                                    if (this.currentCyclePlayer.durableCount > 0 && thisTile.type !== TileTypes.objective) {
                                        this.currentCyclePlayer.gainTile(thisTile)
                                        thisTile.type = TileTypes.durableTile
                                        this.currentCyclePlayer.durableCount -= 1
                                    } else {
                                        this.currentCyclePlayer.gainTile(thisTile)
                                    }
                                } else {
                                    // Check if current player has dominance tiles
                                    if (this.currentCyclePlayer.dominanceCount > 0) {
                                        thisTile.owner.loseTile(thisTile)
                                        // Check if target tile is a durable tile
                                        if (thisTile.type === TileTypes.durableTile) {
                                            thisTile.owner = null
                                            thisTile.type === TileTypes.regularTile
                                        } else {
                                            thisTile.owner = this.currentCyclePlayer
                                            if (this.currentCyclePlayer.durableCount > 0 && thisTile.type !== TileTypes.objective) {
                                                this.currentCyclePlayer.gainTile(thisTile)
                                                thisTile.type = TileTypes.durableTile
                                                this.currentCyclePlayer.durableCount -= 1
                                            } else {
                                                this.currentCyclePlayer.gainTile(thisTile)
                                            }
                                        }
                                        this.currentCyclePlayer.dominanceCount -= 1
                                    } else {
                                        // Damage enemy tile
                                        thisTile.owner.damageTile(thisTile)
                                    }
                                }
                                this.currentPlayerTilesToPlace -= 1
                            }
                            // Step cycle
                            if (this.currentPlayerTilesToPlace <= 0) {
                                this.stepCycle()
                            }
                        } else if (thisTile.type === TileTypes.obstacle && this.checkReachability(thisTile)) {
                            // Dominance over obstacle
                            if (this.currentCyclePlayer.dominanceCount > 0) {
                                thisTile.type = TileTypes.regularTile
                                thisTile.owner = this.currentCyclePlayer
                                this.currentCyclePlayer.gainTile(thisTile)
                                this.currentCyclePlayer.dominanceCount -= 1
                            }
                        }
                        break
                    case (Cycle.REMOVE_BLOCK):
                        if (thisTile.owner === this.currentCyclePlayer) {
                            this.currentCyclePlayer.damageTile(thisTile)
                            this.stepCycle()
                        }
                        break
                }
            }
        }
        this.isClicking = false
    },

    checkReachTile: function (tile, deltas) {
        for (delta of deltas) {
            var reachX = tile.x + delta[0]
            var reachY = tile.y + delta[1]
            if (0 <= reachX && reachX < this.tiles.length && 0 <= reachY && reachY < this.tiles.length && this.tiles[reachX][reachY].owner === this.currentCyclePlayer) {
                return true
            }
        }
        return false
    },

    checkReachability: function (tile) {
        var reachDeltas = [[-1, -1], [-1, 0], [-1, 1], [0, -1], [0, 1], [1, -1], [1, 0], [1, 1]]
        if (this.currentCyclePlayer.skipCount > 0) {
            var skipDeltas = [
                /* left */[-2, -1], [-2, 0], [-2, 1],
                /* top */[-1, -2], [0, -2], [1, -2],
                /* down */[-1, 2], [0, 2], [1, 2],
                /* right */[2, -1], [2, 0], [2, 1]
            ]
            if (this.checkReachTile(tile, reachDeltas)) {
                return true
            }
            return this.checkReachTile(tile, skipDeltas)
        } else {
            return this.checkReachTile(tile, reachDeltas)
        }
    },

    moveToPlayerCenter: function () {
        var xMin = Infinity
        var yMin = Infinity
        var xMax = -1
        var yMax = -1
        for (tile of this.currentCyclePlayer.tiles) {
            if (tile.x < xMin) {
                xMin = tile.x
            }
            if (tile.x > xMax) {
                xMax = tile.x
            }
            if (tile.y < yMin) {
                yMin = tile.y
            }
            if (tile.y > yMax) {
                yMax = tile.y
            }
        }
        ScrollEngine.setPosition((xMax + xMin) / 2, (yMax + yMin) / 2)
    }
}

class Player {
    constructor(id, name, useAIInsteadOfControls) {
        this.id = id
        this.name = name
        this.useAIInsteadOfControls = useAIInsteadOfControls

        this.skipCount = 0
        this.extraCount = 0
        this.durableCount = 0
        this.dominanceCount = 0

        this.tiles = []

        var didDeployFirstTiles = false
        while (!didDeployFirstTiles) {
            var startX = Math.floor(Math.random() * (Game.tiles.length - 1))
            var startY = Math.floor(Math.random() * (Game.tiles.length - 1))

            // Get the four tiles
            var t1 = Game.tiles[startX][startY]
            var t2 = Game.tiles[startX + 1][startY]
            var t3 = Game.tiles[startX][startY + 1]
            var t4 = Game.tiles[startX + 1][startY + 1]

            if (t1.owner === null && t2.owner === null && t3.owner === null && t4.owner === null) {
                // Set ownership of the tiles
                t1.owner = this
                t2.owner = this
                t3.owner = this
                t4.owner = this

                // Make the tiles regular
                t1.type = TileTypes.regularTile
                t2.type = TileTypes.regularTile
                t3.type = TileTypes.regularTile
                t4.type = TileTypes.regularTile

                this.tiles = [t1, t2, t3, t4]
                didDeployFirstTiles = true
            }
        }
    }

    gainTile(tile) {
        tile.owner = this
        this.tiles.push(tile)
        switch (tile.type) {
            case (TileTypes.dominanceTile):
                this.dominanceCount += 1
                tile.type = TileTypes.regularTile
                break
            case (TileTypes.durableTile):
                this.durableCount += 1
                tile.type = TileTypes.regularTile
                break
            case (TileTypes.skipTile):
                this.skipCount += 1
                tile.type = TileTypes.regularTile
                break
            case (TileTypes.objective):
                this.extraCount += 1
                if (this === Game.currentCyclePlayer) {
                    Game.currentPlayerTilesToPlace += 1
                }
                break
        }
    }

    damageTile(tile) {
        if (tile.type === TileTypes.durableTile) {
            tile.type = TileTypes.regularTile
        } else {
            this.loseTile(tile)
        }
    }

    loseTile(tile) {
        for (var index in this.tiles) {
            if (this.tiles[index] === tile) {
                this.removeTileByIndex(index)
                tile.owner = null
                switch (tile.type) {
                    case (TileTypes.objective):
                        this.extraCount -= 1
                        break
                }
                return
            }
        }
        console.log(`Error: Cannot find tile in Player${this.id}'s tile inventory. `)
    }

    removeTileByIndex(index) {
        this.tiles.splice(index, 1)
    }
}

class Tile {
    constructor(type, x, y) {
        this.x = x
        this.y = y
        this.type = type
        this.owner = null
    }

    render() {
        /* Do not render if not visible */
        var tileXMin = (this.x - ScrollEngine.x) * ScrollEngine.scale + windowWidth / 2
        var tileXMax = tileXMin + ScrollEngine.scale
        var tileYMin = (this.y - ScrollEngine.y) * ScrollEngine.scale + windowHeight / 2
        var tileYMax = tileYMin + ScrollEngine.scale
        if (tileXMax < 0 || windowWidth < tileXMin || tileYMax < 0 || windowHeight < tileYMin) {
            return
        }

        /* Set the color */
        noStroke()
        var color = getColorForTypeInTile(this)

        if (Game.checkReachability(this) && Game.currentStepInCycle === Cycle.PLACE_BLOCKS && this.type !== TileTypes.obstacle && this.owner !== Game.currentCyclePlayer) {
            // highlight
            color[0] *= 2
            color[1] *= 2
            color[2] *= 2
        }

        /* Obstacle case: reduce draw calls */
        if (this.type === TileTypes.obstacle) {
            // highlight obstacle when dominant
            if (Game.checkReachability(this) && Game.currentStepInCycle === Cycle.PLACE_BLOCKS && Game.currentCyclePlayer.dominanceCount > 0 && this.owner !== Game.currentCyclePlayer) {
                color[0] *= 2
                color[1] *= 2
                color[2] *= 2
            }
            // draw
            fill(color[0], color[1], color[2])
            noStroke()
            rect(tileXMin,
                tileYMin,
                ScrollEngine.scale,
                ScrollEngine.scale)
            return
        }

        /* Draw the tile frame */
        fill(color[0], color[1], color[2])
        rect((this.x - ScrollEngine.x + 0.05) * ScrollEngine.scale + windowWidth / 2,
            (this.y - ScrollEngine.y + 0.05) * ScrollEngine.scale + windowHeight / 2,
            ScrollEngine.scale * 0.9,
            ScrollEngine.scale * 0.9)
        fill(0)
        rect((this.x - ScrollEngine.x + 0.15) * ScrollEngine.scale + windowWidth / 2,
            (this.y - ScrollEngine.y + 0.15) * ScrollEngine.scale + windowHeight / 2,
            ScrollEngine.scale * 0.7,
            ScrollEngine.scale * 0.7)

        /* Draw tile interiors */
        stroke(color[0], color[1], color[2])
        strokeWeight(ScrollEngine.scale * 0.1)
        noFill()
        switch (this.type) {
            case (TileTypes.dominanceTile):
                triangle((this.x - ScrollEngine.x + 0.15) * ScrollEngine.scale + windowWidth / 2,
                    (this.y - ScrollEngine.y + 0.7) * ScrollEngine.scale + windowHeight / 2,
                    (this.x - ScrollEngine.x + 0.85) * ScrollEngine.scale + windowWidth / 2,
                    (this.y - ScrollEngine.y + 0.7) * ScrollEngine.scale + windowHeight / 2,
                    (this.x - ScrollEngine.x + 0.5) * ScrollEngine.scale + windowWidth / 2,
                    (this.y - ScrollEngine.y + 0.15) * ScrollEngine.scale + windowHeight / 2)
                break
            case (TileTypes.durableTile):
                rect((this.x - ScrollEngine.x + 0.25) * ScrollEngine.scale + windowWidth / 2,
                    (this.y - ScrollEngine.y + 0.25) * ScrollEngine.scale + windowHeight / 2,
                    ScrollEngine.scale * 0.5,
                    ScrollEngine.scale * 0.5)
                break
            case (TileTypes.objective):
                ellipse((this.x - ScrollEngine.x + 0.5) * ScrollEngine.scale + windowWidth / 2,
                    (this.y - ScrollEngine.y + 0.5) * ScrollEngine.scale + windowHeight / 2,
                    ScrollEngine.scale * 0.5,
                    ScrollEngine.scale * 0.5)
                break
            case (TileTypes.skipTile):
                line((this.x - ScrollEngine.x + 0.15) * ScrollEngine.scale + windowWidth / 2,
                    (this.y - ScrollEngine.y + 0.65) * ScrollEngine.scale + windowHeight / 2,
                    (this.x - ScrollEngine.x + 0.85) * ScrollEngine.scale + windowWidth / 2,
                    (this.y - ScrollEngine.y + 0.65) * ScrollEngine.scale + windowHeight / 2)
                line((this.x - ScrollEngine.x + 0.15) * ScrollEngine.scale + windowWidth / 2,
                    (this.y - ScrollEngine.y + 0.35) * ScrollEngine.scale + windowHeight / 2,
                    (this.x - ScrollEngine.x + 0.85) * ScrollEngine.scale + windowWidth / 2,
                    (this.y - ScrollEngine.y + 0.35) * ScrollEngine.scale + windowHeight / 2)
                break
        }

        /* Display player name */
        if (this.owner !== null) {
            textAlign(CENTER, CENTER)
            textSize(ScrollEngine.scale * 0.4)
            noStroke()
            fill(color[0], color[1], color[2])
            text(this.owner.name,
                (this.x - ScrollEngine.x + 0.5) * ScrollEngine.scale + windowWidth / 2,
                (this.y - ScrollEngine.y + 0.5) * ScrollEngine.scale + windowHeight / 2)
        }
    }
}

function setup() {
    // setup() runs once. Put your setup code here.
    createCanvas(windowWidth, windowHeight)

    var playerNames = []

    var playerCount = NaN
    do {
        playerCount = Number.parseInt(prompt("Number of players: \n(Positive integer between 1 and 10)"))
    } while (isNaN(playerCount) || playerCount < 1 || playerCount > 10)

    for (var i = 1; i <= playerCount; i++) {
        var newPlayerName = null
        do {
            newPlayerName = prompt(`NAME of Player ${i}: \n(EXACTLY 2 characters)`).toUpperCase()
        } while (newPlayerName.length !== 2)
        playerNames.push(newPlayerName)
    }

    var baseArea = Math.pow(24, 2)
    var totalArea = baseArea + 90 * playerNames.length

    Game.startGame(Math.ceil(Math.sqrt(totalArea)), playerNames)
}

function draw() {
    // Time updates

    frameTime = millis()
    const timeDiff = frameTime - oldTime
    fps = 1000 / timeDiff
    textSize(32)
    fpsCooldown -= timeDiff

    // Update

    background(20)
    Game.runCycle()

    // Display FPS

    if (fpsCooldown <= 0) {
        displayFPS = fps
        fpsCooldown = 1000
    }

    noStroke()
    fill(80)
    textAlign(RIGHT, TOP) // Text alignment of the fps label
    textSize(24)
    text(`${Math.floor(displayFPS)} fps`, width - 16, 16) // Position of the fps label

    // Finalizing frame

    oldTime = millis()
}

function windowResized() {
    resizeCanvas(windowWidth, windowHeight)
}

function mousePressed() {
    Game.processPress(mouseX, mouseY)
}

function mouseDragged() {
    ScrollEngine.processDrag(mouseX, mouseY)
    Game.processDrag(mouseX, mouseY)
}

function mouseReleased() {
    ScrollEngine.endDrag()
    Game.processReleased(mouseX, mouseY)
}