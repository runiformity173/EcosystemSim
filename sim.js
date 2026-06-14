let ANIMALS = {
    rabbit: {
        diet: "herbivore",
        reproductionFactor: 0.7,
        size: 10,
        stratum: "ground",
    },
    fox: {
        diet: "carnivore",
        size: 24,
        stratum: "ground",
    },
    snake: {
        diet: "carnivore",
        size: 6,
        stratum: "water",
    },
    owl: {
        diet: "carnivore",
        size: 14,
        stratum: "air",
    },
    lizard: {
        diet: "herbivore",
        size: 2,
        reproductionFactor: 0.4,
        stratum: "climbing"
    },
    toad: {
        diet: "carnivore",
        size: 4,
        stratum: "ground"
    },
    griffon: {
        diet: "carnivore",
        size: 100,
        stratum: "air"
    },
    dragon: {
        diet: "carnivore",
        size: 1000,
        stratum: "air"
    },
    worm: {
        diet: "herbivore",
        reproductionFactor:0.5,
        size: 1.5,
        stratum: "underground"
    },
    wren: {
        diet: "carnivore",
        size: 2.0,
        stratum: "air"
    }
};
let aName = [];
let aN = 0;
let aDiet = [];
let aSize = [];
let aStratum = [];
let aReproduction = [];
const stratums = ["ground","air","water","underwater","underground","climbing"]; // plants can be perching or climbing
const stratumMatchupPenalty = [
    [1, 2, 1.2, 2, 1.5, 1.3],
    [1, 1.5, 1.2, 1.2, 1.5, 1],
    [1, 2, 1, 1, 2, 3.5],
    [2.5, 2, 1.2, 1, Infinity, Infinity],
    [1, 3, 1.3, Infinity, 1.2, 3], // might need to make them cull themselves, swap ground and underground
    [1.2, 1.2, 1.5, Infinity, 2.5, 1],
];
const GRID_COLS = 169;
const GRID_ROWS = 117;
let TIME_STEP = 1;
const ALLOWED_SIZE_STEPUP_FACTOR = 1.0;
const FOOD_REQ_CONSTANT = 0.2;//0.56;
const BASE_ESCAPE_RATE = 0.75; // escape rate for equal size hunt
const TROPHIC_LOSS = 0.1;

const foodRates = []; // change to food per energy?
const initialCosts = [];
function calculatePredationMatchups() {
    for (let i = 0;i<aN;i++) {
        foodRates[i] = Array.from({length:aN}).fill(0);
        initialCosts[i] = Array.from({length:aN}).fill(0);
        if (aDiet[i] == "herbivore") continue;
        totalWeight = 0;
        for (let j = 0;j<aN;j++) {
            if (i == j || aSize[j] >= aSize[i]*ALLOWED_SIZE_STEPUP_FACTOR) continue; // prune bigger and no cannibalism.
            const sizeRatio = (aSize[j])/(aSize[i]*ALLOWED_SIZE_STEPUP_FACTOR);
            const cost = (
                (aSize[j]+aSize[i]/4) / // hunt energy
                Math.min(1,(1-(BASE_ESCAPE_RATE-(1-sizeRatio)))) // success chance
            ) * stratumMatchupPenalty[aStratum[i]][aStratum[j]];
            let favor = (
                aSize[j] ** 3 * TROPHIC_LOSS - // benefit
                cost // cost
            );
            if (favor <= 0) favor = 0; // not even worth hunting
            foodRates[i][j] = favor;
            initialCosts[i][j] = cost; // MAKE THIS WORK, UPDATE COST CALCULATIONS
            totalWeight += favor;
        }
        if (totalWeight == 0) console.warn("No prey viable for " + aName[i] + "!");
    }
}
function speciesSetup() {
    aN = 0;
    for (const [name,{diet, size, stratum, reproductionFactor}] of Object.entries(ANIMALS)) {
        aName.push(name);
        aDiet.push(diet);
        aSize.push(size);
        aStratum.push(stratums.indexOf(stratum));
        if (reproductionFactor) aReproduction[aN] = reproductionFactor;
        aN++;
    }
    calculatePredationMatchups();
}
speciesSetup();
class Cell {
    constructor(row, col, isLand) {
        this.row = row;
        this.col = col;
        this.isLand = isLand;
        this.population = [];
        this.totalAnimals = 0;
        this.carryingCapacity = 10_000;
    }
    clicked() {
        this.setPopulation(aName.indexOf("fox"),10);
        // this.setPopulation(aName.indexOf("snake"),2);
        // this.setPopulation(aName.indexOf("lizard"),10000);
        // this.setPopulation(aName.indexOf("owl"),30);
        // this.setPopulation(aName.indexOf("toad"),50);
        // this.setPopulation(aName.indexOf("griffon"),1);
        this.setPopulation(aName.indexOf("rabbit"),10000);
    }
    getPopulation(animal) {
        return this.population[animal] || 0;
    }
    setPopulation(animal,amount) {
        this.totalAnimals += amount - this.getPopulation(animal);
        if (amount < 1) {
            delete this.population[animal];
        }
        else this.population[animal] = amount;
    }
    addPopulation(animal,amount) {
        this.setPopulation(animal,this.getPopulation(animal) + amount)
    }
    derivatives(animalsKey,state) { // this function needs to be heavily optimized. Probably a global struct of arrays
        const cc = this.carryingCapacity;
        const out = Array.from({length: aN}).fill(0);
        const killAmount = [];
        for (const i of animalsKey) {
            if (!state[i] || state[i] <= 0) continue;
            if (aDiet[i] == "herbivore") {
                out[i] += TIME_STEP * aReproduction[i] * state[i] * (1 - state[i]/cc); // could probably make a big array, struct of arrays
            }
            else { // predation
                let totalFood = 0;
                const requiredFoodEach = FOOD_REQ_CONSTANT * aSize[i]**(9/4) * TIME_STEP;
                const requiredFood = requiredFoodEach * state[i];
                const foodQueue = new Heap(foodRates[i].map((o,i)=>[o,i]).filter(o=>o[0]>0),(a,b)=>(a[0]<b[0]));
                const killAmount = Array.from({length:aN}).fill(0);
                let eaten = 0;
                let lastRate = 0;
                let lastEaten = 0;
                while (foodQueue.size() > 0 && totalFood <= requiredFood*(1+0.1*TIME_STEP)) {
                    let [foodRate, j] = foodQueue.pop();
                    if (!state[j] || state[j] <= killAmount[j]+state[i]) continue;
                    // foodRate *= (1+killAmount[j]/state[i]);
                    lastEaten = j;
                    totalFood += foodRate*state[i]*(state[j]-killAmount[j]||0)/cc;
                    lastRate = foodRate;
                    foodRate -= initialCosts[i][j]*(killAmount[j]||0)/state[j];
                    killAmount[j] += state[i];
                    // foodRate /= (1+killAmount[j]/state[i]);
                    eaten++;
                    if (foodRate > 0) {
                        foodQueue.push([foodRate,j]);
                    }
                }
                while (totalFood > requiredFood*(1+0.1*TIME_STEP)) {
                    totalFood -= lastRate;
                    killAmount[lastEaten]--;
                    console.log("took back a kill")
                }
                console.log(eaten); // UH OH
                for (const j of animalsKey) {
                    out[j] -= killAmount[j] || 0;
                }
                if (totalFood < requiredFood) {
                    out[i] += (totalFood-requiredFood)/requiredFood * state[i];
                }
                else {
                    out[i] += (totalFood-requiredFood)/requiredFood * state[i];
                }
            }
        }
        return out;
    }
    calculateNextPopulations() {
        if (this.totalAnimals == 0) return;
        const animalsKey = this.population.map((o,i)=>[o,i]).filter(o=>o[0]).map(o=>o[1]);
        const currentState = [];
        for (const animal of animalsKey) currentState[animal] = this.population[animal];
        const derivatives1 = this.derivatives(animalsKey,currentState);
        const state2 = arrayAdd(arrayMult(derivatives1,TIME_STEP/2),currentState);
        const derivatives2 = this.derivatives(animalsKey,state2);
        const state3 = arrayAdd(arrayMult(derivatives2,TIME_STEP/2),currentState);
        const derivatives3 = this.derivatives(animalsKey,state3);
        const state4 = arrayAdd(arrayMult(derivatives3,TIME_STEP),currentState);
        const derivatives4 = this.derivatives(animalsKey,state4);
        const finalDerivatives = arrayMult(arrayAdd(arrayAdd(arrayMult(derivatives2,2),derivatives1),arrayAdd(arrayMult(derivatives3,2),derivatives4)),1/6)
        for (const i of animalsKey) {
            this.addPopulation(i,roundRandom(finalDerivatives[i]*TIME_STEP)); // finalDerivatives
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

let updates = 0;
function simStep() {
    for (let r = 0; r < GRID_ROWS;r++) {
        for (let c = 0;c < GRID_COLS;c++) {
            cells[r][c].calculateNextPopulations();
        }
    }
    for (let r = 0; r < GRID_ROWS;r++) {
        for (let c = 0;c < GRID_COLS;c++) {
            const cell = cells[r][c];
            if (cell.totalAnimals == 0) continue;
            for (const [r2, c2] of shuffle(getNeighbors(r,c))) {
                if (cells[r2][c2].isLand != cell.isLand || !cells[r2][c2].isLand) continue; // when adding ocean ecosystems, modify
                for (let i = 0;i<aN;i++) {
                    if (cell.getPopulation(i) < 1 || Math.random() > 0.2) continue;
                    cells[r2][c2].addPopulation(i,1);
                    cell.addPopulation(i,-1);
                }
            }
        }
    }
    window.EcosimUI.partialRedraw();
    if (simRunning) requestAnimationFrame(simStep);
}
window.onSimStep = simStep;
window.onSimPlay = function(isRunning) {
    if (isRunning) {
        updates = 0;
        requestAnimationFrame(simStep)
    }
}