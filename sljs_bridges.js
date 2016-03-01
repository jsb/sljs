'use strict';

var waterTile    = { type: 'water',    color: '#08a', walkable: false };
var landTile     = { type: 'land',     color: '#3a0', walkable: true  };
var cliffTile    = { type: 'cliff',    color: '#888', walkable: false };
var bridgeHTile  = { type: 'bridgeH',  color: '#860', walkable: true  };
var bridgeVTile  = { type: 'bridgeV',  color: '#860', walkable: true  };
var nothingTile  = { type: 'nothing',  color: '#000', walkable: false };

function isBridgeTile(tile) {
    return tile.type == 'bridgeH' || tile.type == 'bridgeV';
}

function bridgeTileForFacing(facing) {
    if (facing == 'n') return bridgeVTile;
    if (facing == 's') return bridgeVTile;
    if (facing == 'e') return bridgeHTile;
    if (facing == 'w') return bridgeHTile;
    return nothingTile;
}

function Grid(width, height) {
    this.width = width;
    this.height = height;
    this.data = new Array(width * height);
}
Grid.prototype.get = function(x, y) {
    if (x < 0) return nothingTile;
    if (x >= this.width) return nothingTile;
    if (y < 0) return nothingTile;
    if (y >= this.height) return nothingTile;

    return this.data[y * this.width + x];
}
Grid.prototype.set = function(x, y, value) {
    this.data[y * this.width + x] = value;
}

function parseMapToken(token) {
    if (token == '#') {
        return waterTile;
    }
    else if (token == '-') {
        return bridgeHTile;
    }
    else if (token == '|') {
        return bridgeVTile;
    }
    else if (token == '*') {
        return cliffTile;
    }
    else {
        return landTile;
    }
}

function facingToOffset(facing) {
    if (facing == 'n') {
        return { x: 0, y: -1 };
    }
    if (facing == 's') {
        return { x: 0, y: 1 };
    }
    if (facing == 'w') {
        return { x: -1, y: 0 };
    }
    if (facing == 'e') {
        return { x: 1, y: 0 };
    }
}

function Game(mapString) {
    var width = mapString[0].length;
    var height = mapString.length;

    this.player = {
        x: 0,
        y: 0,
        facing: 'n',
        bridges: 0,
        maxBridges: 1
    };
    this.items = [];

    this.map = new Grid(width, height);
    for (var y = 0; y < height; ++y) {
        for (var x = 0; x < width; ++x) {
            var token = mapString[y][x];
            this.map.set(x, y, parseMapToken(token));
            if (token == 'P') {
                this.player.x = x;
                this.player.y = y;
            }
            if (token == 'H') {
                this.items.push({ type: 'bridge', 'x': x, 'y': y });
            }
        }
    }
}
Game.prototype.collectItems = function() {
    var remainingItems = [];
    for (var i = 0; i < this.items.length; ++i) {
        var item = this.items[i];
        if (item.x == this.player.x && item.y == this.player.y) {
            // player collects this item
            if (item.type = 'bridge') {
                this.player.bridges += 1;
            }
        }
        else {
            remainingItems.push(item);
        }
    }
    this.items = remainingItems;
}
Game.prototype.tryMove = function(direction) {
    if (this.player.facing != direction) {
        this.player.facing = direction;
    }
    else {
        var newX = this.player.x;
        var newY = this.player.y;
        if (this.player.facing == 'w') { newX -= 1; }
        if (this.player.facing == 'e') { newX += 1; }
        if (this.player.facing == 'n') { newY -= 1; }
        if (this.player.facing == 's') { newY += 1; }
        if (this.map.get(newX, newY).walkable) {
            // move player to new pos
            this.player.x = newX;
            this.player.y = newY;
            this.collectItems();
        }
    }
}
Game.prototype.findTileStreak = function() {
    var d = facingToOffset(this.player.facing);
    var streakPositions = [];
    var currentX = this.player.x + d.x;
    var currentY = this.player.y + d.y;
    var streakTile = this.map.get(currentX, currentY);
    var currentTile = streakTile;
    while(currentTile.type == streakTile.type) {
        streakPositions.push({ x: currentX, y: currentY });
        currentX += d.x;
        currentY += d.y;
        currentTile = this.map.get(currentX, currentY);
    }
    var endTile = currentTile;
    return {
        'positions': streakPositions,
        'streakTile': streakTile,
        'endTile': endTile
    };
}
Game.prototype.replaceTiles = function(tilePositions, tileType) {
    for (var i = 0; i < tilePositions.length; ++i) {
        var tilePos = tilePositions[i];
        this.map.set(tilePos.x, tilePos.y, tileType);
    }
}
Game.prototype.tryBuildBridge = function() {
    if (this.player.bridges > 0) {
        var currentTile = this.map.get(this.player.x, this.player.y);
        var streak = this.findTileStreak();

        if (streak.streakTile.type == 'water' && streak.endTile.walkable) {
            this.player.bridges -= 1;
            var orientedBridgeTile = bridgeTileForFacing(this.player.facing);
            this.replaceTiles(streak.positions, orientedBridgeTile);
        }
    }
}
Game.prototype.tryCollapseBridge = function() {
    if (this.player.bridges < this.player.maxBridges) {
        var currentTile = this.map.get(this.player.x, this.player.y);
        var streak = this.findTileStreak();

        if (isBridgeTile(streak.streakTile) && streak.endTile.walkable) {
            this.player.bridges += 1;
            this.replaceTiles(streak.positions, waterTile);
        }
    }
}
Game.prototype.tryToggleBridge = function() {
    var d = facingToOffset(this.player.facing);
    var targetX = this.player.x + d.x;
    var targetY = this.player.y + d.y;
    var playerTile = this.map.get(this.player.x, this.player.y);
    var targetTile = this.map.get(targetX, targetY);
    
    if (targetTile.type == 'water') {
        this.tryBuildBridge();
    }
    else if (isBridgeTile(targetTile)) {
        this.tryCollapseBridge();
    }
}
Game.prototype.draw = function(ctx, options) {
    // Map
    for (var y = 0; y < this.map.height; ++y) {
        for (var x = 0; x < this.map.width; ++x) {
            var tileX = x * options.tileSize;
            var tileY = y * options.tileSize;
            ctx.fillStyle = this.map.get(x, y).color;
            ctx.fillRect(tileX, tileY, options.tileSize, options.tileSize);

            // special bridge rendering. TODO: use tile bitmaps
            var margin = options.tileSize * 0.15;
            if (this.map.get(x, y).type == 'bridgeH') {
                ctx.fillStyle = 'rgba(255,255,255, 0.1)';
                ctx.fillRect(tileX, tileY + margin, options.tileSize, options.tileSize - 2 * margin);                
            }
            if (this.map.get(x, y).type == 'bridgeV') {
                ctx.fillStyle = 'rgba(255,255,255, 0.1)';
                ctx.fillRect(tileX + margin, tileY, options.tileSize - 2 * margin, options.tileSize);                
            }
        }
    }
    
    // Items
    for (var i = 0; i < this.items.length; ++i) {
        var item = this.items[i];
        var screenX = (item.x + 0.5) * options.tileSize;
        var screenY = (item.y + 0.5) * options.tileSize;
        if (item.type == 'bridge') {
            var radius = 0.3 * options.tileSize;
            ctx.beginPath();
            ctx.arc(screenX, screenY, radius, 0, 2 * Math.PI);
            ctx.fillStyle = bridgeTile.color;
            ctx.fill();
        }
    }
    
    // Player
    ctx.save();
    ctx.translate((this.player.x + 0.5) * options.tileSize, (this.player.y + 0.5) * options.tileSize);
    if (this.player.facing == 'n') ctx.rotate(0.0  * 2 * Math.PI);
    if (this.player.facing == 'e') ctx.rotate(0.25 * 2 * Math.PI);
    if (this.player.facing == 's') ctx.rotate(0.5  * 2 * Math.PI);
    if (this.player.facing == 'w') ctx.rotate(0.75 * 2 * Math.PI);
    ctx.beginPath();
    ctx.moveTo(0, -options.tileSize * 0.4);
    ctx.lineTo(options.tileSize * 0.4, options.tileSize * 0.4);
    ctx.lineTo(-options.tileSize * 0.4, options.tileSize * 0.4);
    ctx.closePath();
    ctx.fillStyle = '#0f0';
    ctx.fill();
    ctx.restore();

    // Inventory
    document.getElementById('inventoryBridges').innerHTML = this.player.bridges;
    document.getElementById('inventoryMaxBridges').innerHTML = this.player.maxBridges;
};
Game.prototype.onKeyDown = function(event) {
    var code = event.keyCode;
    switch (code) {
        case 37:
            this.tryMove('w');
            break;
        case 38:
            this.tryMove('n');
            break;
        case 39:
            this.tryMove('e');
            break;
        case 40:
            this.tryMove('s');
            break;
        case 32:
            this.tryToggleBridge();
            break;
    }
};

var game = null;
function initGame() {
    var drawOptions = { tileSize: 32 };
    var testMap = [
        '#############',
        '#   #####   #',
        '# P -----   #',
        '#   #####   #',
        '#############',
        '###### ######',
        '#############',
        '#   #####   #',
        '#   -----   #',
        '#   #####   #',
        '#############'
    ];
    game = new Game(testMap);
    
    var canvasWidth  = game.map.width  * drawOptions.tileSize;
    var canvasHeight = game.map.height * drawOptions.tileSize;
    
    var canvas = document.getElementById('canvas');
    canvas.width  = canvasWidth;
    canvas.height = canvasHeight;
    var ctx = canvas.getContext('2d');

    var render = function(event) {
        game.draw(ctx, drawOptions);
    };
    var onKeyDown = function(event) {
        game.onKeyDown(event);
        render();
    };
    window.addEventListener('keydown', onKeyDown, false);
    render();
}
