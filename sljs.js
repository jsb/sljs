'use strict';

function Grid(width, height) {
    this.width = width;
    this.height = height;
    this.data = new Array(width * height);
}
Grid.prototype.get = function(x, y) {
    var nothing = { color: '#000', solid: true };
    if (x < 0) return nothing;
    if (x >= this.width) return nothing;
    if (y < 0) return nothing;
    if (y >= this.height) return nothing;

    return this.data[y * this.width + x];
}
Grid.prototype.set = function(x, y, value) {
    this.data[y * this.width + x] = value;
}

var brushDownColor = '#faa';
var brushUpColor = '#888';

function parseMapToken(token) {
    if (token == '#') {
        return { color: '#333', solid: true };
    }
    else {
        return { color: brushUpColor, solid: false };
    }
}

function Game(mapString) {
    var width = mapString[0].length;
    var height = mapString.length;

    this.player = { x: 0, y: 0, facing: 'n' };
    this.goals = [];

    this.map = new Grid(width, height);
    for (var y = 0; y < height; ++y) {
        for (var x = 0; x < width; ++x) {
            var token = mapString[y][x];
            this.map.set(x, y, parseMapToken(token));
            if (token == 'P') {
                this.player.x = x;
                this.player.y = y;
            }
            if (token == 'G') {
                this.goals.push({ 'x': x, 'y': y });
            }
        }
    }
}
Game.prototype.tryMove = function(direction) {
    if (this.player.facing != direction) {
        this.player.facing = direction;
    }
    if (true) {
        var newX = this.player.x;
        var newY = this.player.y;
        if (this.player.facing == 'w') { newX -= 1; }
        if (this.player.facing == 'e') { newX += 1; }
        if (this.player.facing == 'n') { newY -= 1; }
        if (this.player.facing == 's') { newY += 1; }
        if (!this.map.get(newX, newY).solid) {
            // brush current tile
            var currentTile = this.map.get(this.player.x, this.player.y);
            if (this.player.facing == 's') {
                currentTile.color = brushDownColor;
            }
            if (this.player.facing == 'n') {
                currentTile.color = brushUpColor;
            }
            this.map.set(this.player.x, this.player.y, currentTile);
            
            // brush next tile
            var nextTile = this.map.get(newX, newY);
            if (this.player.facing == 's') {
                nextTile.color = brushDownColor;
            }
            if (this.player.facing == 'n') {
                nextTile.color = brushUpColor;
            }
            this.map.set(newX, newY, nextTile);
            
            // move player to new pos
            this.player.x = newX;
            this.player.y = newY;
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
    for (var i = 0; i < this.goals.length; ++i) {
        this.goals[i].x = (this.goals[i].x + w - splitX) % w;
        this.goals[i].y = (this.goals[i].y + h - splitY) % h;
    }
}
Game.prototype.shoot = function() {
    if (this.player.facing == 'n') {
        var dx = 0; var dy = -1;
    }
    if (this.player.facing == 's') {
        var dx = 0; var dy = 1;
    }
    if (this.player.facing == 'w') {
        var dx = -1; var dy = 0;
    }
    if (this.player.facing == 'e') {
        var dx = 1; var dy = 0;
    }

    var x = this.player.x;
    var y = this.player.y;
    while (!this.map.get(x + dx, y + dy).solid) {
        x += dx;
        y += dy;
    }
    
    if (this.player.facing == 'n') {
        this.split(0, y);
    }
    if (this.player.facing == 's') {
        this.split(0, y+1);
    }
    if (this.player.facing == 'w') {
        this.split(x, 0);
    }
    if (this.player.facing == 'e') {
        this.split(x+1, 0);
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
    
    // Goals
    for (var i = 0; i < this.goals.length; ++i) {
        var goalX = (this.goals[i].x + 0.5) * options.tileSize;
        var goalY = (this.goals[i].y + 0.5) * options.tileSize;
        var goalRadius = 0.3 * options.tileSize;
        ctx.beginPath();
        ctx.arc(goalX, goalY, goalRadius, 0, 2 * Math.PI);
        ctx.fillStyle = '#ff0';
        ctx.fill();
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
            //this.shoot();
            break;
    }
};

var game = null;
function initGame() {
    var drawOptions = { tileSize: 32 };
    var testMap = [
        '######   ####',
        '         #   ',
        '  P  ## ## G ',
        '  #  #       ',
        '  #  # G     ',
        '######       ',
        '         #   ',
        '         ####'
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
