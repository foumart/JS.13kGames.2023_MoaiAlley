class Board {
	
	constructor(stageData) {

		this.boardWidth = stageData.size;
		this.boardHeight = stageData.size;
		this.map = stageData.map.split('');
		this.path = stageData.path.split('');
		this.data = stageData.data.split('');

		if (Board.instance) {
			return Board.instance;
		}

		Board.instance = this;

		this.scale = !state ? 0.01 : 0.8;
		this.tilt = !state ? 0.5 : 0.88;

		// used for data compression
		// TODO: use binary => hex, ex: "A8030600", instead of "9580033c000c"
		Board.pairs = [
			[0, 0], [0, 1], [0, 2], [0, 3],
			[1, 0], [1, 1], [1, 2], [1, 3],
			[2, 0], [2, 1], [2, 2], [2, 3],
			[3, 0], [3, 1], [3, 2], [3, 3]
		];

		this.mapData = [];
		this.unitsData = [];
		this.pathData = [];

		let x, y;
		for (y = 0; y < this.boardHeight; y++) {
			this.mapData.push([]);
			this.unitsData.push([]);
			this.pathData.push([]);
			for (x = 0; x < this.boardWidth; x++) {
				this.mapData[y].push(10);
				this.unitsData[y].push(0);
				this.pathData[y].push(-1);
			}
		}

		this.extractData(this.map, this.mapData);
		this.extractHex(this.path, this.pathData);
		this.extractData(this.data, this.unitsData);

		this.createPlayer(stageData.x, stageData.y);

		if (state) {
			console.log(this.mapData);
			console.log(this.unitsData);
			console.log(this.pathData);

			this.createButtons();
		}

		this.pattern = MapTile.buffer();

		this.clear();
	}

	createPlayer(x, y) {
		this.player = new Player(x, y);
	}

	extractData(map, data) {
		map.forEach((element, index) => {
			const tileData = Board.pairs[parseInt(element, 16)];
			const y = (index * 2) / this.boardHeight | 0;
			const x = index * 2 % this.boardHeight;
			data[y][x] = tileData[0];
			if (x < this.boardWidth - 1) data[y][x + 1] = tileData[1];
			else if (y < this.boardHeight - 1) data[y + 1][0] = tileData[1];
		});
	}

	extractHex(map, data) {
		map.forEach((element, index) => {
			if (element != ' ') data[index / this.boardHeight | 0][index % this.boardHeight] = parseInt(element, 16);
		});
	}

	createButtons() {
		this.buttons = [];
		this.buttonsArr = [];
		let x, y, arr, button;
		for(y = 0; y < this.boardHeight; y++) {
			arr = [];
			for(x = 0; x < this.boardWidth; x++) {
				button = new Button(x, y);
				button.btn.addEventListener("mouseover", this.buttonOver.bind(this));
				button.btn.addEventListener("mouseout", this.buttonOut.bind(this));
				button.btn.addEventListener(eventName, this.clickButton.bind(this));
				this.buttonsArr.push(button);
				arr.push(button);
			}
			this.buttons.push(arr);
		}
	}

	clear() {
		this.field = [];
		this.path = [];
		this.units = [];
		let x, y, tile, fieldArr, pathArr, mapType, unitType;
		for(y = 0; y < this.boardHeight; y++) {
			fieldArr = [];
			pathArr = [];
			for(x = 0; x < this.boardWidth; x++) {
				mapType = this.mapData[y][x];
				tile = new MapTile(x, y, mapType);
				if (!mapType) tile.frame = Math.random() * 2.9 | 0;
				fieldArr.push(tile);
				pathArr.push(new PathTile(x, y, this.pathData[y][x]));
				if (mapType == 3) {
					this.units.push(new Obstacle(x, y, 4));
				}

				unitType = this.unitsData[y][x];
				if (unitType > 0) {
					// on the initial level make sure to place moai instead of rocks
					// (because level compression only records 2 bits of data: empty, palm, tree, rock)
					if (mapType == 1 && unitType == 3 && !state) unitType = 5;

					this.units.push(new Unit(x, y, unitType));
				}
			}
			this.field.push(fieldArr);
			this.path.push(pathArr);
		}
	}

	// reposition buttons
	resize() {
		if (this.buttonsArr) for (let i = 0; i < this.buttonsArr.length; i ++) {
			this.buttonsArr[i].resize();
		}
	}

	// draw the board grid frames and the unit selection stroke on the canvas
	draw() {
		gameContext.clearRect(0, 0, gameCanvas.width, gameCanvas.height);
		if (state) {
			gameContext.fillStyle = "#28f";
			gameContext.fillRect(0, 0, gameCanvas.width, gameCanvas.height);
		}

		for(let y = 0; y < this.boardHeight; y++) {
			for(let x = 0; x < this.boardWidth; x++) {
				//this.buttons[y][x].hilight();
				this.field[y][x].resize();
				this.path[y][x].resize();
			}
		}

		let drawn;
		for (let i = 0; i < this.units.length; i ++) {
			if (!drawn && this.player.y < this.units[i].y) {
				drawn = true;
				this.player.resize();
			}
			this.units[i].resize();
		}

		// TODO: remove
		//drawFPS();
	}

	buttonOver(event) {
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
	}

	destroy() {
		Board.instance = null;

	}

	/*updateStageData(stageData) {
		
	}*/
}