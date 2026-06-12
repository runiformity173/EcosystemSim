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
        stratum: "water"
    },
};
const stratums = ["ground","air","water","underwater","underground","climbing"]; // plants can be perching or climbing
const stratumMatchupPenalty = [
    [1, 2, 1.2, 2, 1.5, 1.3],
    [1, 1.5, 1.2, 1.2, 3, 1],
    [1, 2, 1, 1, 2, 3.5],
    [2.5, 2, 1.2, 1, Infinity, Infinity],
    [1, 3, 1.3, Infinity, 1.2, 3], // might need to make them cull themselves, swap ground and underground
    [1.2, 1.2, 1.5, Infinity, 2.5, 1],
];
const GRID_COLS = 169;
const GRID_ROWS = 117;
const TIME_STEP = 1;
const ALLOWED_SIZE_STEPUP_FACTOR = 1//1.2;
const FOOD_REQ_CONSTANT = 0.56;//0.56;
const ENCOUNTER_RATE = 500; // if two animals are on the same acre, how often will they encounter each other per week
const HANDLING_TIME = 0.05;
const BASE_ESCAPE_RATE = 0.75; // escape rate for equal size hunt
const TROPHIC_LOSS = 0.3;

const predationPreferences = {}
function calculatePredationMatchups() {
    for (const i in ANIMALS) {
        const predator = ANIMALS[i];
        if (predator.diet == "herbivore") continue;
        predationPreferences[i] = {};
        totalWeight = 0;
        let bestWeight = 0;
        for (const j in ANIMALS) {
            const prey = ANIMALS[j];
            if (i == j || prey.size >= predator.size*ALLOWED_SIZE_STEPUP_FACTOR) continue; // prune bigger and no cannibalism.
            const sizeRatio = (prey.size)/(predator.size*ALLOWED_SIZE_STEPUP_FACTOR);
            const cost = (
                (predator.size+prey.size) / // hunt energy
                Math.min(1,(1-(BASE_ESCAPE_RATE-(1-sizeRatio)))) // success chance
            ) * stratumMatchupPenalty[stratums.indexOf(predator.stratum)][stratums.indexOf(prey.stratum)];
            let favor = (
                prey.size ** 3 / // benefit
                cost // cost
            );
            if (favor == 0) favor = 0.00001; // not even worth hunting
            predationPreferences[i][j] = favor;
            totalWeight += favor;
            bestWeight = Math.max(bestWeight,favor);
        }
        for (const j in predationPreferences[i])
            predationPreferences[i][j] /= totalWeight;
    }
}
calculatePredationMatchups();
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
        this.setPopulation("fox",10);
        this.setPopulation("snake",2);
        this.setPopulation("lizard",10000);
        this.setPopulation("owl",30);
        this.setPopulation("toad",50);
        this.setPopulation("rabbit",10000);
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
    derivatives(animalsKey,state) { // this function needs to be heavily optimized. Probably a global struct of arrays
        const cc = this.carryingCapacity;
        const out = Array.from({length: animalsKey.length}).fill(0);
        const killAmount = [];
        for (let i = animalsKey.length-1;i>=0;i--) {
            if (state[i] <= 0) continue;
            const main = ANIMALS[animalsKey[i]];
            if (main.diet == "herbivore") {
                out[i] += TIME_STEP * main.reproductionFactor * state[i] * (1 - state[i]/cc); // could probably make a big array, struct of arrays
            }
            else { // predation
                let totalFood = 0;
                const requiredFoodEach = FOOD_REQ_CONSTANT * main.size**(9/4) * TIME_STEP;
                const requiredFood = requiredFoodEach * state[i];
                let restTime = 0;
                for (let j = animalsKey.length-1;j>=0;j--) {
                    killAmount[j] = 0;
                    if (j == i) continue; // again, prune cannibalism
                    const prey = ANIMALS[animalsKey[j]];
                    const processingTime = HANDLING_TIME * prey.size ** 3 * TROPHIC_LOSS / requiredFoodEach;
                    if (animalsKey[j] in predationPreferences[animalsKey[i]]) {
                        const pref = predationPreferences[animalsKey[i]][animalsKey[j]];
                        restTime += TIME_STEP*processingTime*pref*state[j]*ENCOUNTER_RATE/cc / stratumMatchupPenalty[stratums.indexOf(main.stratum)][stratums.indexOf(prey.stratum)];
                    }
                }
                for (let j = animalsKey.length-1;j>=0;j--) {
                    killAmount[j] = 0;
                    if (j == i) continue; // again, prune cannibalism
                    const prey = ANIMALS[animalsKey[j]];
                    if (animalsKey[j] in predationPreferences[animalsKey[i]]) {
                        const pref = predationPreferences[animalsKey[i]][animalsKey[j]];
                        let amountEncountered = Math.min(Math.max(state[j]/2,2) * TIME_STEP, state[j] , //* predationPreferences[animalsKey[i]][animalsKey[j]]
                            (ENCOUNTER_RATE * TIME_STEP * pref * Math.max(1,Math.log(state[i])) * state[j]/cc  / stratumMatchupPenalty[stratums.indexOf(main.stratum)][stratums.indexOf(prey.stratum)]) /
                            (1+Math.max(0,Math.log(restTime)))
                        );
                        killAmount[j] = amountEncountered;
                        totalFood += amountEncountered * prey.size ** 3 * TROPHIC_LOSS;
                    }
                }
                // continue;
                for (let j = 0; j < animalsKey.length; j++) {
                    out[j] -= killAmount[j];
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
        const animalsKey = Object.keys(this.population);
        const currentState = Object.values(this.population);
        const derivatives1 = this.derivatives(animalsKey,currentState);
        const state2 = arrayAdd(arrayMult(derivatives1,TIME_STEP/2),currentState);
        const derivatives2 = this.derivatives(animalsKey,state2);
        const state3 = arrayAdd(arrayMult(derivatives2,TIME_STEP/2),currentState);
        const derivatives3 = this.derivatives(animalsKey,state3);
        const state4 = arrayAdd(arrayMult(derivatives3,TIME_STEP),currentState);
        const derivatives4 = this.derivatives(animalsKey,state4);
        const finalDerivatives = arrayMult(arrayAdd(arrayAdd(arrayMult(derivatives2,2),derivatives1),arrayAdd(arrayMult(derivatives3,2),derivatives4)),1/6)
        for (let i = 0;i<animalsKey.length;i++) {
            this.addPopulation(animalsKey[i],roundRandom(finalDerivatives[i]*TIME_STEP));
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
                if (cells[r2][c2].isLand != cell.isLand) continue;
                for (const animal in cell.population) {
                    cells[r2][c2].addPopulation(animal,1);
                    cell.addPopulation(animal,-1);
                }
            }
        }
    }
    if (updates++ % FRAMES_PER_REDRAW == 0) window.EcosimUI.redraw();
    if (simRunning) requestAnimationFrame(simStep);
}
window.onSimStep = simStep;
window.onSimPlay = function(isRunning) {
    if (isRunning) {
        updates = 0;
        requestAnimationFrame(simStep)
    }
}