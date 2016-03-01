'use strict';

var waterTile   = { type: 'water',   color: '#08a', walkable: false };
var landTile    = { type: 'land',    color: '#3a0', walkable: true  };
var cliffTile   = { type: 'cliff',   color: '#888', walkable: false };
var bridgeTile  = { type: 'bridge',  color: '#860', walkable: true  };
var nothingTile = { type: 'nothing', color: '#000', walkable: false };

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
    else if (token == '=') {
        return bridgeTile;
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
        bridges: 0
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
Game.prototype.split = function(splitX, splitY) {
    var w = this.map.width;
    var h = this.map.height;
    var newMap = new Grid(w, h);
    for (var y = 0; y < h; ++y) {
        for (var x = 0; x < w; ++x) {
            newMap.set(x, y, this.map.get((x + splitX) % w, (y + splitY) % h));
        }
    }
    this.map = newMap;
    // objects
    this.player.x = (this.player.x + w - splitX) % w;
    this.player.y = (this.player.y + h - splitY) % h;
    for (var i = 0; i < this.items.length; ++i) {
        this.items[i].x = (this.items[i].x + w - splitX) % w;
        this.items[i].y = (this.items[i].y + h - splitY) % h;
    }
}
Game.prototype.tryBuildBridge = function() {
    if (this.player.bridges > 0) {
        var d = facingToOffset(this.player.facing);
        // trace out bridge until we hit something
        var bridgePositions = [];
        var currentX = this.player.x + d.x;
        var currentY = this.player.y + d.y;
        var currentTile = this.map.get(currentX, currentY);
        while(currentTile.type == 'water') {
            bridgePositions.push({ x: currentX, y: currentY });
            currentX += d.x;
            currentY += d.y;
            var currentTile = this.map.get(currentX, currentY);
        }
        if (currentTile.type == 'land') {
            // bridge connects! build it
            this.player.bridges -= 1;
            for (var i = 0; i < bridgePositions.length; ++i) {
                var pos = bridgePositions[i];
                this.map.set(pos.x, pos.y, bridgeTile);
            }
        }
    }
}
Game.prototype.tryCollapseBridge = function() {
    var d = facingToOffset(this.player.facing);
    // trace out bridge until we hit something
    var bridgePositions = [];
    var currentX = this.player.x + d.x;
    var currentY = this.player.y + d.y;
    var currentTile = this.map.get(currentX, currentY);
    while(currentTile.type == 'bridge') {
        bridgePositions.push({ x: currentX, y: currentY });
        currentX += d.x;
        currentY += d.y;
        var currentTile = this.map.get(currentX, currentY);
    }
    if (currentTile.type == 'land') {
        // bridge connects! destroy it
        this.player.bridges += 1;
        for (var i = 0; i < bridgePositions.length; ++i) {
            var pos = bridgePositions[i];
            this.map.set(pos.x, pos.y, waterTile);
        }
    }
}
Game.prototype.tryToggleBridge = function() {
    var d = facingToOffset(this.player.facing);
    var targetX = this.player.x + d.x;
    var targetY = this.player.y + d.y;
    var playerTile = this.map.get(this.player.x, this.player.y);
    var targetTile = this.map.get(targetX, targetY);
    
    if (playerTile.type == 'land' && targetTile.type == 'water') {
        this.tryBuildBridge();
    }
    else if (playerTile.type == 'land' && targetTile.type == 'bridge') {
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
        '# P =====   #',
        '#   #####   #',
        '#############',
        '#############',
        '#   #####   #',
        '#   #####   #',
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
