// Avoid the web page scrolling up and down when user is using arrow keys to play the game.
// Thanks for Zeta's answer in 
// stackoverflow.com/questions/8916620/disable-arrow-key-scrolling-in-users-browser
window.addEventListener("keydown", function(e) {
    if(["Space","ArrowUp","ArrowDown","ArrowLeft","ArrowRight"].indexOf(e.code) > -1) {
        e.preventDefault();
    }
}, false);

var maze = new Vue({
    el:"#main",
    data: {
        rowNum: 20,
        columnNum: 20,
        // used for search algorithms,
        // contains objects: {cell: index, neighbors: {left: {neighborIndex:..., connection:...}...}}
        workList: [],
        // records whether each cell is already been searched(true) or not (false), and if it is in solution path
        searchMap: [],
        // records paths that have taken during the search for the exit so that when maze is complete,
        // we are able to backtrack the correct way to reach from the entrance to the exit
        pathsSearched: [],
        manhattanDistanceMap: [],
        // 0: not in any search mode, 1: DFS, 2: BFS, 3: player is manually playing the maze
        // 4: A* search
        mode: 0
    },
    created(){
        this.selectPaths();
        this.initializeSearchMap();
        window.addEventListener('keydown', (event)=>{this.keyPressHandler(event.key)});
    },
    mounted() {
        this.$refs['cell1_1'][0].style.backgroundColor = "lightcoral";
        this.$refs['cell' + this.rowNum + '_' + this.columnNum][0].style.backgroundColor = "lightcoral";
    },
    computed: {
        mazeSize() {
            return parseInt(this.rowNum) * parseInt(this.columnNum);
        },

        // this list contains information about all cells in the maze including the cell id for each of their neighbors
        // in each direction, if there isn't a neighbor in a direction, the cell id will be labeled as -1,
        // and whether 2 specific cells have connection
        mazeCellMap() {
            return this.generateCells();
        },

        // calculates cell size
        cellSize() {
            let maxSize = Math.max(this.rowNum, this.columnNum);
            return Math.min(20, Math.floor(500 / maxSize));
        }
    },
    methods: {
        // generates all the cells in the maze
        generateCells: function() {
            let cellMap = [];

            for(let i = 0; i < this.mazeSize; i++) {
                let cell = {};

                // determines whether this cell has a left neighbor
                if (i % parseInt(this.columnNum) != 0) {
                    cell.left = {neighborIndex: i - 1, connection: false};
                } else {
                    cell.left = {neighborIndex: -1, connection: false};
                }

                let rightIndex = i + 1;
                // determines whether this cell has a right neighbor
                if (rightIndex % parseInt(this.columnNum) != 0) {
                    cell.right = {neighborIndex: rightIndex, connection: false};
                } else {
                    cell.right = {neighborIndex: -1, connection: false};
                }

                let topIndex = i - parseInt(this.columnNum);
                // determines whether this cell has a top neighbor
                if (topIndex >= 0) {
                    cell.top = {neighborIndex: topIndex, connection: false};
                } else {
                    cell.top = {neighborIndex: -1, connection: false};
                }

                let bottomIndex = i + parseInt(this.columnNum);
                // determines whether this cell has a bottom neighbor
                if (bottomIndex < this.mazeSize) {
                    cell.bottom = {neighborIndex: bottomIndex, connection: false};
                } else {
                    cell.bottom = {neighborIndex: -1, connection: false};
                }

                cellMap.push(cell);
            }
            return cellMap;
        },

        // returns a list of all the possible connections between cells with a random weight assigned to them
        findAllPaths: function() {
            let allPaths = [];
            // connects all neighbor cells by connecting each cell with their right and bottom neighbor
            for(let i = 0; i < this.mazeSize; i++) {
                let rightIndex = this.mazeCellMap[i].right.neighborIndex;
                if (rightIndex != -1) {
                    let weight = Math.floor(Math.random() * 100);
                    let path = {cell1: i, cell2: rightIndex, weight: weight};

                    allPaths.push(path);
                }

                let bottomIndex = this.mazeCellMap[i].bottom.neighborIndex;
                if (bottomIndex != -1) {
                    let weight = Math.floor(Math.random() * 100);
                    let path = {cell1: i, cell2: bottomIndex, weight: weight};

                    allPaths.push(path);
                }
            }
            return allPaths;
        },

        // selects the paths that this maze will use, using Kruskal’s Algorithm and Union/Find
        selectPaths: function() {
            let allPaths = this.findAllPaths();
            // sorts the all paths list in ascending order
            allPaths.sort(function(cell1, cell2) { return cell1.weight - cell2.weight });

            // create a list represents each maze cell's representative for Union/Find, the list is initialized so that
            // each cell has itself as its representative in the beginning
            let representatives = [];
            for (let i = 0; i < this.mazeSize; i++) {
                representatives.push(i);
            }

            // continues to add path into the maze until all cells have the same representative
            // meaning that all cells can be reached
            while(!this.checkAllSame(representatives)) {
                let path = allPaths.shift();
                // if they don't have the same representative
                if(representatives[path.cell1] != representatives[path.cell2]) {
                    this.buildPath(path.cell1, path.cell2);

                    // change all cells that have the same representative as cell1 to be changed to cell2's representative
                    let cell1Rep = representatives[path.cell1];
                    let cell2Rep = representatives[path.cell2];
                    for (let i = 0; i < representatives.length; i++) {
                        if (representatives[i] == cell1Rep) {
                            representatives[i] = cell2Rep;
                        }
                    }
                }
            }
        },

        // builds the path between 2 cells by setting their connection to each other as true
        buildPath: function(cell1, cell2) {
            // if cell2 is cell1's right neighbor
            if (cell2 - cell1 == 1) {
                this.mazeCellMap[cell1].right.connection = true;
                this.mazeCellMap[cell2].left.connection = true;
            }
            // if cell2 is cell1's bottom neighbor
            else if (cell2 - cell1 == parseInt(this.columnNum)) {
                this.mazeCellMap[cell1].bottom.connection = true;
                this.mazeCellMap[cell2].top.connection = true;
            }
        },

        // checks if every item in the given list has the same value
        checkAllSame: function(list) {
            let firstItem = list[0];
            for (let i = 1; i < list.length; i++) {
                if (list[i] != firstItem) {
                    return false;
                }
            }
            return true;
        },

        // determines if the cell of the given row and column has a wall on the left(i.e. no connection to its left neighbor)
        hasLeftWall: function(row, column) {
            let cellIndex = this.cellIndexOf(row, column);
            // when the cell is the top left cell (entrance cell), there shouldn't be a left wall
            return !(cellIndex == 0) && !this.mazeCellMap[cellIndex].left.connection;
        },

        // determines if the cell of the given row and column has a wall on the right(i.e. no connection to its right neighbor)
        hasRightWall: function(row, column) {
            let cellIndex = this.cellIndexOf(row, column);
            return !this.mazeCellMap[cellIndex].right.connection;
        },

        // determines if the cell of the given row and column has a wall on the top(i.e. no connection to its top neighbor)
        hasTopWall: function(row, column) {
            let cellIndex = this.cellIndexOf(row, column);
            return !this.mazeCellMap[cellIndex].top.connection;
        },

        // determines if the cell of the given row and column has a wall on the bottom(i.e. no connection to its bottom neighbor)
        hasBottomWall: function(row, column) {
            let cellIndex = this.cellIndexOf(row, column);
            // when the cell is the bottom right cell (exit cell), there shouldn't be a bottom wall
            return !(cellIndex == this.mazeSize - 1) && !this.mazeCellMap[cellIndex].bottom.connection;
        },

        // solves the game using Depth-First Search algorithm
        depthFirstSearch: function() {
            this.resetBeforeSearch();
            this.mode = 1;
            this.searchHelper();

        },

        // solves the game using Breadth-First Search algorithm
        breadthFirstSearch: function() {
            this.resetBeforeSearch();
            this.mode = 2;
            this.searchHelper();
        },

        // search helper function for Depth-First Search and Breadth-First Search
        searchHelper: function() {
            if (this.workList.length > 0 && (this.mode == 1 || this.mode == 2)) {
                let currentCell;
                if (this.mode == 1) {
                    currentCell = this.workList.pop();
                } else if (this.mode == 2) {
                    currentCell = this.workList.shift();
                }

                let currentCellIndex = currentCell.cell;

                // algorithms have not found the exit and this cell haven't been searched yet
                if (!this.ifFoundExit(currentCellIndex) && !this.searchMap[currentCellIndex].searched) {
                    let neighbors = currentCell.neighbors;

                    let left = neighbors.left;
                    this.addToWorkList(currentCellIndex, left.neighborIndex, left.connection);

                    let right = neighbors.right;
                    this.addToWorkList(currentCellIndex, right.neighborIndex, right.connection);

                    let top = neighbors.top;
                    this.addToWorkList(currentCellIndex, top.neighborIndex, top.connection);

                    let bottom = neighbors.bottom;
                    this.addToWorkList(currentCellIndex, bottom.neighborIndex, bottom.connection);
                }
                this.markCellSearched(currentCellIndex);
                setTimeout(()=>this.searchHelper(), 15);
            }
        },

        // initializes the work list used by search algorithms
        initializeWorkList: function() {
            this.workList = [];
            this.workList.push({cell: 0, neighbors: this.mazeCellMap[0]});
        },

        // initializes search map to make all cells be labeled as not been searched yet and not in solution path
        initializeSearchMap: function() {
            this.searchMap = [];
            while(this.searchMap.length < this.mazeSize) {
                this.searchMap.push({ searched: false, inSolution: false });
            }
        },

        // if the given index is not -1 then adds the cell with the given index to the work list
        // returns whether the cell is added to the work list
        addToWorkList: function (currentCellIndex, neighborIndex, connection) {
            if (neighborIndex != -1 && connection) {
                this.workList.push({cell: neighborIndex, neighbors: this.mazeCellMap[neighborIndex]});
                this.pathsSearched.push({from: currentCellIndex, to: neighborIndex});
                return true;
            }
            return false;
        },

        // backtrack the correct way back from the exit to the entrance
        backtrack: function(index) {
            // we haven't back track to the entrance yet
            if (index != 0) {
                // find we went from which cell to the cell of the given index
                for (let i = 0; i < this.pathsSearched.length; i++) {
                    if (this.pathsSearched[i].to == index) {
                        this.searchMap[this.pathsSearched[i].from].inSolution = true;
                        this.$forceUpdate();
                        this.backtrack(this.pathsSearched[i].from);
                        break;
                    }
                }
            }
        },

        // returns whether the cell with given row and column is in searched list
        cellSearched: function(row, column) {
            let cellIndex = this.cellIndexOf(row, column);
            return this.searchMap[cellIndex].searched;
        },

        // returns whether the cell with given row and column is in solution path
        cellInSolution: function(row, column) {
            let cellIndex = this.cellIndexOf(row, column);
            return this.searchMap[cellIndex].inSolution;
        },

        // returns the index of the cell specified by the given row and column
        cellIndexOf: function (row, column) {
            return (row - 1) * parseInt(this.columnNum) + column - 1;
        },

        // handles a key press
        keyPressHandler: function(key) {
            if (this.mode != 3) {
                this.resetBeforeSearch();
                this.searchMap[0].searched = true;
                this.mode = 3;
            }

            let exitCellIndex = this.mazeSize - 1;

            let lastCell = this.workList[this.workList.length - 1];
            let lastCellIndex = lastCell.cell;
            let lastCellNeighbors = lastCell.neighbors;
            if ((key == "ArrowUp" || key == "w") && lastCellNeighbors.top.connection) {
                let topNeighborIndex = lastCellIndex - parseInt(this.columnNum);
                this.playerSearchHelper(lastCellIndex, topNeighborIndex);
            } else if ((key == "ArrowLeft" || key == "a") && lastCellNeighbors.left.connection) {
                let leftNeighborIndex = lastCellIndex - 1;
                this.playerSearchHelper(lastCellIndex, leftNeighborIndex);
            } else if ((key == "ArrowDown" || key == "s") && lastCellNeighbors.bottom.connection) {
                let bottomNeighborIndex = lastCellIndex + parseInt(this.columnNum);
                this.playerSearchHelper(lastCellIndex, bottomNeighborIndex);
                // the exit is reached!
                if (bottomNeighborIndex == exitCellIndex) {
                    this.searchMap[exitCellIndex].inSolution = true;
                    this.backtrack(exitCellIndex);
                    this.mode = 0;
                }
            } else if ((key == "ArrowRight" || key == "d") && lastCellNeighbors.right.connection) {
                let rightNeighborIndex = lastCellIndex + 1;
                this.playerSearchHelper(lastCellIndex, rightNeighborIndex);
                // the exit is reached!
                if (rightNeighborIndex == exitCellIndex) {
                    this.searchMap[exitCellIndex].inSolution = true;
                    this.backtrack(exitCellIndex);
                    this.mode = 0;
                }
            }
            this.$forceUpdate();
        },

        // search helper function for player's manual playing
        playerSearchHelper: function(lastCellIndex, neighborIndex) {
            if (this.searchMap[neighborIndex].searched) {
                this.searchMap[lastCellIndex].searched = false;
                // this.searchMap[neighborIndex].searched = false;
                this.workList = this.workList.slice(0, -1);
            } else {
                this.searchMap[neighborIndex].searched = true;
                this.addToWorkList(lastCellIndex, neighborIndex, true);
            }
        },

        // uses A* Search Algorithm to find the way to the end cell
        aStarSearch: function(choice) {
            this.resetBeforeSearch();
            this.initManhattanDistMap();
            this.mode = 4;
            this.aStarSearchHelper(choice);
        },

        // search helper function for A* Search Algorithm
        aStarSearchHelper: function(choice) {
            if (this.workList.length != 0 && this.mode == 4) {
                let smallestDistCell = this.workList[0];
                let smallestDistIdx = smallestDistCell.cell;
                let smallestDistCellCost;
                if (choice == 1) {
                    // use the total Manhattan distance
                    smallestDistCellCost = this.manhattanDistanceMap[smallestDistIdx].costToArrive
                                               + this.manhattanDistanceMap[smallestDistIdx].costToExit;
                } else {
                    // use the Manhattan distance to the exit only
                    smallestDistCellCost = this.manhattanDistanceMap[smallestDistIdx].costToExit;
                }

                // find the cell in work list that has the least total cost
                for (let i = 1; i < this.workList.length; i++) {
                    let currentCell = this.workList[i];
                    let currentCellIndex = currentCell.cell;
                    let currentCellCost;
                    if (choice == 1) {
                        currentCellCost = this.manhattanDistanceMap[currentCellIndex].costToArrive
                                              + this.manhattanDistanceMap[currentCellIndex].costToExit;
                    } else {
                        currentCellCost = this.manhattanDistanceMap[currentCellIndex].costToExit;
                    }
                    if (currentCellCost < smallestDistCellCost) {
                        smallestDistCell = currentCell
                        smallestDistIdx = currentCellIndex;
                        smallestDistCellCost = currentCellCost;
                    }
                }
                this.workList.splice(this.workList.indexOf(smallestDistCell), 1);

                // algorithms have not found the exit and this cell haven't been searched yet
                if (!this.ifFoundExit(smallestDistIdx) && !this.searchMap[smallestDistIdx].searched) {
                    let neighbors = this.mazeCellMap[smallestDistIdx];

                    let left = neighbors.left;
                    this.addToWorkListAStar(smallestDistIdx, left);

                    let right = neighbors.right;
                    this.addToWorkListAStar(smallestDistIdx, right);

                    let top = neighbors.top;
                    this.addToWorkListAStar(smallestDistIdx, top);

                    let bottom = neighbors.bottom;
                    this.addToWorkListAStar(smallestDistIdx, bottom);
                }

                this.markCellSearched(smallestDistIdx);
                setTimeout(()=>this.aStarSearchHelper(choice), 15);
            }
        },

        // adds the given cell to the work list for A* Search algorithm if it can be reached and
        // the given way to reach that cell has less cost than before
        addToWorkListAStar: function(currentCellIdx, neighborCell) {
            if (neighborCell.neighborIndex != -1) {
                let currentCellCostToArrive = this.manhattanDistanceMap[currentCellIdx].costToArrive;
                let neighborCellCostToArrive = this.manhattanDistanceMap[neighborCell.neighborIndex].costToArrive;
                if((neighborCellCostToArrive == -1 || neighborCellCostToArrive > currentCellCostToArrive + 1)
                   && this.addToWorkList(currentCellIdx, neighborCell.neighborIndex, neighborCell.connection)) {
                    this.manhattanDistanceMap[neighborCell.neighborIndex].costToArrive = currentCellCostToArrive + 1;
                }
            }
        },

        // initializes manhattanDistanceMap, records the manhattan distance cost of each cell,
        // both cost to arrive that cell and estimated cost from that cell to the exit
        initManhattanDistMap: function() {
            this.manhattanDistanceMap = [];
            for (let i = 0; i < this.rowNum; i++) {
                for (let j = 0; j < this.columnNum; j++) {
                    // all cells have an unknown cost to arrive(-1)
                    this.manhattanDistanceMap.push({costToArrive: -1,
                                                    costToExit: this.rowNum - i + this.columnNum - j - 2});
                }
            }
            // the start cell is known to have a 0 cost to arrive
            this.manhattanDistanceMap[0].costToArrive = 0;
        },

        // reset the maze back to empty before a new search method is applied
        resetBeforeSearch: function() {
            this.initializeWorkList();
            this.initializeSearchMap();
            this.pathsSearched = [];
        },

        // determines if the given cell is the exit cell of the maze, if so, backtrack and end the game then returns true
        // if not, returns false
        ifFoundExit: function(cellIndex) {
            // algorithms have found the exit!!
            let exitCellIndex = this.mazeSize - 1;
            if (cellIndex == exitCellIndex) {
                this.mode = 0;
                this.searchMap[cellIndex].inSolution = true;
                this.backtrack(exitCellIndex);
                return true;
            }
            return false;
        },

        // mark the cell of the given cell index as searched
        markCellSearched: function(cellIndex) {
            this.searchMap[cellIndex].searched = true;
            // this.$forceUpdate();
            let row = Math.floor(cellIndex / this.columnNum) + 1;
            let column = cellIndex % this.columnNum + 1;
            this.$refs['cell' + row + '_' + column][0].style.class = "searched";
        },

        // resets the game (restart a new maze)
        reset: function() {
            this.resetMazeCellMap();
            this.selectPaths();
            this.initializeSearchMap();
            this.workList = [];
            this.pathsSearched = [];
            this.mode = 0;
            // this code can't be put here because right now, the this.$refs haven't been updated yet,
            // so this.$refs['cell' + i + '_' + j] can't be reached if we are setting the maze size larger than before,
            // can be solved by seperating it into another helper function then use setTimeout to call it.
            /*
            for (let i = 1; i <= this.rowNum; i++) {
                for (let j = 2; j <= this.columnNum; j++) {
                    this.$refs['cell' + i + '_' + j][0].style.backgroundColor = "white";
                }
            }
            this.$refs['cell' + this.rowNum + '_' + this.columnNum][0].style.backgroundColor = "lightcoral";
             */
            setTimeout(()=>{this.resetCellColorHelper()}, 0);
        },

        // reset mazeCellMap
        resetMazeCellMap: function() {
            for (let i = 0; i < this.mazeSize; i++) {
                this.mazeCellMap[i].left.connection = false;
                this.mazeCellMap[i].right.connection = false;
                this.mazeCellMap[i].top.connection = false;
                this.mazeCellMap[i].bottom.connection = false;
            }
        },

        // helps to reset maze cell color
        resetCellColorHelper: function() {
            for (let i = 1; i <= this.rowNum; i++) {
                for (let j = 2; j <= this.columnNum; j++) {
                    this.$refs['cell' + i + '_' + j][0].style.backgroundColor = "";
                }
            }
            this.$refs['cell' + this.rowNum + '_' + this.columnNum][0].style.backgroundColor = "lightcoral";
        }
    }
});