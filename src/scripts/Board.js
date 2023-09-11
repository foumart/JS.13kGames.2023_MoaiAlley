class Board {
	
	constructor(stageData) {

		this.boardWidth = stageData.size + 2;
		this.boardHeight = stageData.size + 2;
		this.map = stageData.map.split('');
		this.path = stageData.path.split('');
		this.data = stageData.data.split('');

		if (Board.instance) {
			return Board.instance;
		}

		Board.instance = this;

		this.scale = !state ? 1 : 1;
		this.tilt = !state ? 0.8 : 0.88;

		// Used for map data compression
		// TODO: use binary => hex, ex: "A8030600", instead of "9580033c000c"
		Board.pairs = [
			[0, 0],// 0
			[0, 1],// 1
			[0, 2],// 2
			[0, 3],// 3
			[1, 0],// 4
			[1, 1],// 5
			[1, 2],// 6
			[1, 3],// 7
			[2, 0],// 8
			[2, 1],// 9
			[2, 2],// 10 A
			[2, 3],// 11 B
			[3, 0],// 12 C
			[3, 1],// 13 D
			[3, 2],// 14 E
			[3, 3]//  15 F
		];

		this.mapData = [];
		this.unitsData = [];
		this.pathData = [];

		let x, y;
		for (y = 0; y < this.boardHeight - 2; y++) {
			this.mapData.push([]);
			this.unitsData.push([]);
			this.pathData.push([]);
			for (x = 0; x < this.boardWidth - 2; x++) {
				this.mapData[y].push(3);
				this.unitsData[y].push(0);
				this.pathData[y].push(-1);
			}
		}

		this.extractData(this.map, this.mapData);
		this.extractHex(this.path, this.pathData);
		this.extractData(this.data, this.unitsData);

		// Adding tiles on each side of the map in order to have space for coasts
		this.mapData.push([]);
		this.unitsData.push([]);
		this.pathData.push([]);
		this.mapData.unshift([]);
		this.unitsData.unshift([]);
		this.pathData.unshift([]);

		for (y = 0; y < this.boardHeight; y++) {
			if (!y || y == this.boardHeight - 1) {
				for (x = 0; x < this.boardWidth; x++) {
					this.mapData[y].push(3);
					this.unitsData[y].push(0);
					this.pathData[y].push(-1);
				}
			} else {
				this.mapData[y].push(3);
				this.unitsData[y].push(0);
				this.pathData[y].push(-1);
				this.mapData[y].unshift(3);
				this.unitsData[y].unshift(0);
				this.pathData[y].unshift(-1);
			}
		}

		// Walk through all water tiles to convert into coastal edges
		for (y = 0; y < this.boardHeight; y++) {
			for (x = 0; x < this.boardWidth; x++) {
				if (this.mapData[y][x] == 3) {
					if (y < this.boardHeight-1 && this.mapData[y + 1][x] < 3) {
						if (this.mapData[y][x] < 4) {
							this.mapData[y][x] = 4;
							if (x < this.boardWidth-1 && y < this.boardHeight-1 && this.mapData[y + 1][x + 1] == 3) {
								this.mapData[y][x + 1] = 8;
							}
							if (x && y < this.boardHeight-1 && this.mapData[y + 1][x - 1] == 3) {
								this.mapData[y][x - 1] = 11;
							}
						}

						if (x && this.mapData[y][x - 1] < 3) {
							this.mapData[y][x] = 12;
						}

						if (x < this.boardWidth-1 && this.mapData[y][x + 1] < 3) {
							this.mapData[y][x] = 15;
						}
					} else if (y && this.mapData[y - 1][x] < 3) {
						if (this.mapData[y][x] < 4) {
							this.mapData[y][x] = 6;
							if (x < this.boardWidth-1 && y && this.mapData[y - 1][x + 1] > 2) {
								this.mapData[y][x + 1] = 9;
							}
							if (x && y && this.mapData[y - 1][x - 1] > 2) {
								this.mapData[y][x - 1] = 10;
							}
						}

						if (x && this.mapData[y][x - 1] < 3) {
							this.mapData[y][x] = 13;
						}

						if (x < this.boardWidth-1 && this.mapData[y][x + 1] < 3) {
							this.mapData[y][x] = 14;
						}
					} else if (x < this.boardWidth-1 && this.mapData[y][x + 1] < 3) {
						this.mapData[y][x] = 7;
					} else if (x && this.mapData[y][x - 1] < 3) {
						this.mapData[y][x] = 5;
					}
				}
			}
		}

		this.createPlayer(stageData.x, stageData.y);

		//if (state) this.createButtons();

		// Generate field - add MapTiles, PathTiles and Units
		this.field = [];
		this.path = [];
		this.units = [];
		let tile, fieldArr, pathArr, mapType, unitType;
		for(y = 0; y < this.boardHeight; y++) {
			fieldArr = [];
			pathArr = [];
			for(x = 0; x < this.boardWidth; x++) {
				mapType = this.mapData[y][x];
				tile = new MapTile(x, y, mapType);
				if (!mapType) tile.frame = Math.random() * 5.5 | 0;
				fieldArr.push(tile);
				pathArr.push(new PathTile(x, y, this.pathData[y][x]));
				if (mapType == 2) {
					this.units.push(new Obstacle(x, y, 4));
				}

				unitType = this.unitsData[y][x];
				if (unitType > 0) {
					// On the initial level make sure to place Moai instead of rocks
					// (because level compression only records 2 bits of data: empty, palm, tree, rock)
					if (mapType == 1 && unitType == 3) unitType = 5;

					this.units.push(new Unit(x, y, unitType));
				}
			}
			this.field.push(fieldArr);
			this.path.push(pathArr);
		}
	}

	extractData(map, data) {
		map.forEach((element, index) => {
			const tileData = Board.pairs[parseInt(element, 16)];
			const y = (index * 2) / (this.boardHeight - 2) | 0;
			const x = index * 2 % (this.boardHeight - 2);
			data[y][x] = tileData[0];
			if (x < this.boardWidth - 3) data[y][x + 1] = tileData[1];
			else if (y < this.boardHeight - 3) data[y + 1][0] = tileData[1];
		});
	}

	extractHex(map, data) {
		map.forEach((element, index) => {
			if (element != ' ') data[index / (this.boardHeight - 2) | 0][index % (this.boardHeight - 2)] = parseInt(element, 16);
		});
	}

	/*createButtons() {
		this.buttons = [];
		this.buttonsArr = [];
		let x, y, arr, button;
		for(y = 0; y < this.boardHeight - 2; y++) {
			arr = [];
			for(x = 0; x < this.boardWidth - 2; x++) {
				button = new Button(x, y);
				button.btn.addEventListener("mouseover", this.buttonOver.bind(this));
				button.btn.addEventListener("mouseout", this.buttonOut.bind(this));
				button.btn.addEventListener(eventName, this.clickButton.bind(this));
				this.buttonsArr.push(button);
				arr.push(button);
			}
			this.buttons.push(arr);
		}
	}*/

	createPlayer(x, y) {
		player = new Player(x, y);
	}

	isPassable(x, y) {
		return !this.mapData[y][x] && this.unitsData[y][x] < 3;
	}

	getUnit(x, y) {
		let id = -1;
		this.units.forEach((unit, index) => {
			if (unit.x == x && unit.y == y) {
				id = index;
			}
		});

		return id;
	}

	// Perform action (chop, pave, carve, etc.)
	doAction() {
		//console.log(action, this.mapData[player.y][player.x], this.unitsData[player.y][player.x], this.pathData[player.y][player.x]);
		let unit;

		if (action == 1) {
			this.placeRoad(player.x, player.y);
			
		} else if (action == 2) {
			unit = this.getUnit(player.x, player.y);
			
			if (unit > -1) {
				this.units.splice(unit, 1);
				this.unitsData[player.y][player.x] = 0;
				
			}
		}

		updateInGameUI();
	}

	// Place a Road tile with regards to all adjacent Road tiles
	placeRoad(x, y, after) {
		if (this.pathData[y][x + 1] > -1 && this.pathData[y][x - 1] > -1 && this.pathData[y + 1][x] > -1 && this.pathData[y - 1][x] > -1) {
			// ╬
			this.pathData[y][x] = 15;
		} else if (this.pathData[y][x + 1] > -1 && this.pathData[y][x - 1] > -1 && this.pathData[y + 1][x] > -1) {
			// ╦
			this.pathData[y][x] = 8;
		} else if (this.pathData[y][x + 1] > -1 && this.pathData[y][x - 1] > -1 && this.pathData[y - 1][x] > -1) {
			// ╩
			this.pathData[y][x] = 10;
		} else if (this.pathData[y][x - 1] > -1 && this.pathData[y + 1][x] > -1 && this.pathData[y - 1][x] > -1) {
			// ╣
			this.pathData[y][x] = 9;
		} else if (this.pathData[y][x + 1] > -1 && this.pathData[y + 1][x] > -1 && this.pathData[y - 1][x] > -1) {
			// ╠
			this.pathData[y][x] = 7;
		} else if (this.pathData[y][x + 1] > -1 && this.pathData[y][x - 1] > -1) {
			// =
			this.pathData[y][x] = 6;
		} else if (this.pathData[y + 1][x] > -1 && this.pathData[y - 1][x] > -1) {
			// ||
			this.pathData[y][x] = 5;
		} else if (this.pathData[y][x + 1] > -1 && this.pathData[y + 1][x] > -1) {
			// ╔
			this.pathData[y][x] = 11;
		} else if (this.pathData[y][x + 1] > -1 && this.pathData[y - 1][x] > -1) {
			// ╚
			this.pathData[y][x] = 14;
		} else if (this.pathData[y][x - 1] > -1 && this.pathData[y + 1][x] > -1) {
			// ╔
			this.pathData[y][x] = 12;
		} else if (this.pathData[y][x - 1] > -1 && this.pathData[y - 1][x] > -1) {
			// ╚
			this.pathData[y][x] = 13;
		} else if (this.pathData[y][x - 1] > -1) {
			// ]
			this.pathData[y][x] = 4;
		} else if (this.pathData[y][x + 1] > -1) {
			// [
			this.pathData[y][x] = 2;
		} else if (this.pathData[y + 1][x] > -1) {
			// п
			this.pathData[y][x] = 3;
		} else if (this.pathData[y - 1][x] > -1) {
			// u
			this.pathData[y][x] = 1;
		} else {
			// o
			this.pathData[y][x] = 0;
		}

		this.path[y][x].type = this.pathData[y][x];

		// update the adjacent road tile as well
		if (!after) {
			if (this.pathData[y][x + 1] > -1 && !this.mapData[y][x + 1]) this.placeRoad(x + 1, y, 1);
			if (this.pathData[y][x - 1] > -1 && !this.mapData[y][x - 1]) this.placeRoad(x - 1, y, 1);
			if (this.pathData[y + 1][x] > -1 && !this.mapData[y + 1][x]) this.placeRoad(x, y + 1, 1);
			if (this.pathData[y - 1][x] > -1 && !this.mapData[y - 1][x]) this.placeRoad(x, y - 1, 1);
		}
	}
	
	actionUp() {
		if (!this.isPassable(player.x, player.y - 1)) {
			console.log(this.mapData[player.y - 1][player.x], this.unitsData[player.y - 1][player.x], this.pathData[player.y - 1][player.x]);
		} else if (player.offsetY == -0.5) {
			this.moveUp();
		}
	}
	
	actionDown() {
		if (!this.isPassable(player.x, player.y + 1)) {
			const unit = this.getUnit(player.x, player.y + 1);
			if (this.units[unit].type == 3) {
				this.units[unit].highlighted = true;
				hilight = this.units[unit];
				action = 5;
			}
			updateInGameUI();
		} else if (player.offsetY == -0.5) {
			this.moveDown();
		}
	}
	
	actionLeft() {
		if (!this.isPassable(player.x - 1, player.y)) {
	
		} else if (!player.offsetX) {
			this.moveLeft();
		}
	}
	
	actionRight() {
		if (!this.isPassable(player.x + 1, player.y)) {
	
		} else if (!player.offsetX) {
			this.moveRight();
		}
	}
	
	moveUp() {
		if (hilight) hilight.highlighted = false;
		player.y --;
		player.offsetY = 0.5;
		TweenFX.to(player, 8, {offsetY: -0.5}, 2);
		updateInGameUI();
	}
	
	moveDown() {
		if (hilight) hilight.highlighted = false;
		player.y ++;
		player.offsetY = -1.5;
		TweenFX.to(player, 8, {offsetY: -0.5}, 2);
		updateInGameUI();
	}
	
	moveLeft() {
		if (hilight) hilight.highlighted = false;
		player.x --;
		player.offsetX = 1;
		TweenFX.to(player, 8, {offsetX: 0}, 2);
		updateInGameUI();
	}
	
	moveRight() {
		if (hilight) hilight.highlighted = false;
		player.x ++;
		player.offsetX = -1;
		TweenFX.to(player, 8, {offsetX: 0}, 2);
		updateInGameUI();
	}





	// reposition buttons
	resize() {
		/*if (this.buttonsArr) for (let i = 0; i < this.buttonsArr.length; i ++) {
			this.buttonsArr[i].resize();
		}*/
	}

	// Draw the board
	draw() {
		// TODO: Check if necessarry
		/*gameContext.clearRect(0, 0, gameCanvas.width, gameCanvas.height);
		if (state) {
			gameContext.fillStyle = "#0078d7";
			gameContext.fillRect(0, 0, gameCanvas.width, gameCanvas.height);
		}*/

		for(let y = 0; y < this.boardHeight; y++) {
			for(let x = 0; x < this.boardWidth; x++) {
				//this.buttons[y][x].hilight();
				this.field[y][x].resize();
				this.path[y][x].resize();
			}
		}

		// Draw units from top to bottom inserting the player in the proper depth position
		let drawn;
		for (let i = 0; i < this.units.length; i ++) {
			if (!drawn && player.y < this.units[i].y) {
				drawn = true;
				player.resize();
			}
			this.units[i].resize();
		}

		if (!drawn) {
			player.resize();
		}

		// TODO: remove
		//drawFPS();
	}

	/*buttonOver(event) {
		let unit = this.field[event.target.y][event.target.x];
		let btn = this.buttons[event.target.y][event.target.x];
	}

	buttonOut(event){
		let unit = this.field[event.target.y][event.target.x];
		let btn = this.buttons[event.target.y][event.target.x];
	}

	clickButton(event){
		let unit = this.field[event.target.y][event.target.x];
		console.log(unit);
	}*/

	destroy() {
		Board.instance = null;
	}
}
