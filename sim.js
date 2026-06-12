let ANIMALS = {
    rabbit: {
        diet: "herbivore",
        reproductionFactor: 1,
    }
};
const GRID_COLS = 169;
const GRID_ROWS = 117;
const TIME_STEP = 1;
class Cell {
    constructor(row, col, isLand) {
        this.row = row;
        this.col = col;
        this.isLand = isLand;
        this.population = {};
        this.totalAnimals = 0;
        this.carryingCapacity = 10_000;
    }
    clicked() {
        this.setPopulation("rabbit",3)
    }
    getPopulation(animal) {
        return this.population[animal] || 0;
    }
    setPopulation(animal,amount) {
        this.totalAnimals += amount - this.getPopulation(animal);
        if (amount < 1) {
            if (animal in this.population) delete this.population[animal];
        }
        else this.population[animal] = amount;
    }
    addPopulation(animal,amount) {
        this.setPopulation(animal,this.getPopulation(animal) + amount)
    }
    derivatives(animalsKey,state) {
        console.log(animalsKey,state)
        const cc = this.carryingCapacity;
        const out = Array.from({length: 12}).fill(0);
        for (let i = animalsKey.length-1;i>=0;i--) {
            if (ANIMALS[animalsKey[i]].diet == "herbivore") {
                out[i] += ANIMALS[animalsKey[i]].reproductionFactor * state[i] * (1 - state[i]/cc); // could probably make a big array, struct of arrays
            }
            for (let j = i-1;j>=0;j--) {
                // do predation stuff
            }
        }
        return out;
    }
    calculateNextPopulations() {
        if (this.totalAnimals == 0) return;
        const animalsKey = Object.keys(this.population);
        const currentState = Object.values(this.population);
        const derivatives = this.derivatives(animalsKey,currentState); // Euler's rn, fix later. RK4
        for (let i = 0;i<animalsKey.length;i++) {
            this.addPopulation(animalsKey[i],Math.floor(derivatives[i]*TIME_STEP))
        }
    }

}

function buildWorld() {
  const cells= [];
  for (let r = 0; r < GRID_ROWS; r++) {
    cells[r] = [];
    for (let c = 0; c < GRID_COLS; c++) {
      cells[r][c] = new Cell(r, c, DEFAULT_LAND[r][c]);
    }
  }
  return cells;
}
const cells = buildWorld();

window.onSimStep = function () {
    for (let r = 0; r < GRID_ROWS;r++) {
        for (let c = 0;c < GRID_COLS;c++) {
            cells[r][c].calculateNextPopulations();
        }
    }
}