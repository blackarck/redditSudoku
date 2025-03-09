/***************
 * Developer: Vivek Sharma
 * Date: 17-Jun-21
 * For Sudoku program
 ***************/

// Initialize a 9x9 array
export let sudokuarr: number[][] = Array.from({ length: 9 }, () => new Array(9));
export let hiddenSudokuarr: number[][] = Array.from({ length: 9 }, () => new Array(9));
export let hiddenSudokuclone: number[][] = Array.from({ length: 9 }, () => new Array(9));

// Reset function to reinitialize arrays
const resetAll = (): void => {
    sudokuarr = Array.from({ length: 9 }, () => new Array(9));
    hiddenSudokuarr = Array.from({ length: 9 }, () => new Array(9));
    hiddenSudokuclone = Array.from({ length: 9 }, () => new Array(9));
};

// This function returns a jumbled number array
const funcjumbarr = (tstarr: number[]): number[] => {
    for (let i = 0; i < tstarr.length; i++) {
        let randpos = Math.trunc((Math.random() * 10) % 8);
        [tstarr[i], tstarr[randpos]] = [tstarr[randpos], tstarr[i]];
    }
    return tstarr;
};

// Print Sudoku array based on input selection
export const printSudoku = (whichOne: number): void => {
    const arrToPrint = whichOne === 1 ? hiddenSudokuarr : whichOne === 2 ? hiddenSudokuclone : sudokuarr;
    arrToPrint.forEach(row => console.log(row.toString()));
    console.log("******************");
};

// Hide Sudoku numbers based on game mode
export const hideSudoku = (gamemode: 1 | 2 | 3): void => {
    hiddenSudokuarr = sudokuarr.map(row => [...row]);
    
    const hideCounts = { 1: 26, 2: 23, 3: 19 };
    callHide(hideCounts[gamemode] || 26);
    
    hiddenSudokuclone = hiddenSudokuarr.map(row => [...row]);
};

// Function to randomly hide numbers in the Sudoku grid
const callHide = (numberofit: number): void => {
    let count = 81 - numberofit;
    while (count > 0) {
        let i = Math.floor(Math.random() * 9);
        let j = Math.floor(Math.random() * 9);
        if (hiddenSudokuarr[i][j] !== 0) {
            hiddenSudokuarr[i][j] = 0;
            count--;
        }
    }
};


// Main algorithm to start filling numbers
export const fillsudokuarr = (): void => {
    resetAll();
    let icnt = 0;
    for (let i = 0; i < 9; i++) {
        icnt++;
        if (icnt > 20) {
            console.log("Got stuck, redoing some steps.");
            icnt = 0;
            let reducer = i > 6 ? 4 : i > 4 ? 3 : i > 3 ? 2 : 0;
            for (let icl = i - reducer; icl <= i; icl++) {
                sudokuarr[icl].fill(0);
            }
            i -= reducer;
        }
        let tmpjumbarr = funcjumbarr([1, 2, 3, 4, 5, 6, 7, 8, 9]);
        let ranvaluepos = 0;
        for (let j = 0; j < 9; j++) {
            let notdone = true;
            let k = 0;
            while (notdone && k < 25) {
                if (checkrules(i, j, tmpjumbarr[ranvaluepos])) {
                    sudokuarr[i][j] = tmpjumbarr[ranvaluepos];
                    tmpjumbarr.shift();
                    notdone = false;
                    break;
                } else {
                    tmpjumbarr.push(tmpjumbarr.splice(ranvaluepos, 1)[0]);
                }
                k++;
            }
            if (notdone) {
                sudokuarr[i].fill(0);
                i--;
                break;
            }
        }
    }
    console.log("Done generating grid " + sudokuarr);
};

// Function to check Sudoku rules
const checkrules = (posi: number, posj: number, inpval: number): boolean => {
    for (let x = 0; x <= posi; x++) {
        if (sudokuarr[x][posj] === inpval) return false;
    }
    let startRow = Math.floor(posi / 3) * 3;
    let startCol = Math.floor(posj / 3) * 3;
    for (let i = startRow; i < startRow + 3; i++) {
        for (let j = startCol; j < startCol + 3; j++) {
            if (sudokuarr[i][j] === inpval) return false;
        }
    }
    return true;
};

export const process2darr = (valstr: string | number): string[][] => {
    // converts string to array
    let ret2darr: string[][] = [[]];
    valstr = valstr + "";
    valstr = valstr.replace("'", "").replace("'", "");
    const arr1d: string[] = valstr.split(",");

    ret2darr.pop();
    for (let i = 0; i <= 8; i++) {
        const arr1dd: string[] = arr1d.splice(0, 9);
        ret2darr.push(arr1dd);
    }
    return ret2darr;
};

export const printArray = (array2d: (string | number)[][]): void => {
    try {
        for (let i = 0; i < 9; i++) {
            for (let j = 0; j < 9; j++) {
                console.log("array check " + array2d[i][j]);
            }
        }
    } catch (err) {
        console.log("Error " + err);
    }
};