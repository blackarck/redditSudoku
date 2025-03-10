// Learn more at developers.reddit.com/docs
import { Devvit, useState } from '@devvit/public-api';
import {
  sudokuarr,
  fillsudokuarr,
  printSudoku,
  hideSudoku,
  hiddenSudokuarr,
  hiddenSudokuclone,
  process2darr,
  printArray
} from './sudokuhelper';
 
import { KVStore } from '@devvit/public-api';

Devvit.configure({
  redditAPI: true,
});

// Add a menu item to the subreddit menu  
Devvit.addMenuItem({
  label: 'Sudoku Game',
  location: 'subreddit',
  forUserType: 'moderator',
  onPress: async (_event, context) => {
    const { reddit, ui } = context;
    ui.showToast("Generating Game - upon completion you'll navigate there.");

    const subreddit = await reddit.getCurrentSubreddit();
    const post = await reddit.submitPost({
      title: 'Sudoku Game',
      subredditName: subreddit.name,
      // The preview appears while the post loads
      preview: (
        <vstack height="100%" width="100%" alignment="middle center">
          <text size="large">Loading ...</text>
        </vstack>
      ),
    });
    ui.navigateTo(post);
  },
}
);

// Add a post type definition
Devvit.addCustomPostType({
  name: 'Experience Post',
  height: 'regular',
  render: (context) => {
    const [gameStarted, setGameStarted] = useState(false);
    const [sudokuGrid, setSudokuGrid] = useState<number[][]>([]); 
    const [selectedCell, setSelectedCell] = useState<{ row: number; col: number } | null>(null);
    const [userInputGrid, setUserInputGrid] = useState<number[][]>(Array(9).fill(null).map(() => Array(9).fill(0)));
    const [instructtxt,setInstructtxt] = useState<string>("Select a Cell to fill");
    const [isGameWon, setIsGameWon] = useState(false);

    const startGame = () => {
      // Main start of the game intialize values and start new grid
      console.log("****************");
      fillsudokuarr();
      hideSudoku(2);
      setSudokuGrid(hiddenSudokuarr);
      setGameStarted(true);
    };

    // handle number selection
const handleNumberSelect = (number: number) => {
  if (selectedCell) {
    const newGrid = [...userInputGrid];
    newGrid[selectedCell.row][selectedCell.col] = number;
    setUserInputGrid(newGrid);
    console.log("New Grid", newGrid);

        // Check if the game is won
        if (checkWinCondition(newGrid)) {
          setIsGameWon(true);
          setInstructtxt("Congratulations! You've won!");
        }

    setSelectedCell(null);
  }
};

// function to check win condition
const checkWinCondition = (grid: number[][]) => {
  for (let i = 0; i < 9; i++) {
    for (let j = 0; j < 9; j++) {
      if (hiddenSudokuarr[i][j] === 0) {  // Only check cells that were empty
        if (grid[i][j] !== sudokuarr[i][j]) {
          return false;
        }
      }
    }
  }
  return true;
};

    // number picker component function
    const NumberPicker = ({ onSelect, onClose }: { 
      onSelect: (n: number) => void, 
      onClose: () => void  }) => (
      <vstack gap="small" backgroundColor="white" padding="small" border="thin">
        <hstack gap="small">
          {[1, 2, 3].map(num => (
            <button key={"" + num} onPress={() => onSelect(num)} width="24px" height="24px">{num}</button>
          ))}
        </hstack>
        <hstack gap="small">
          {[4, 5, 6].map(num => (
            <button key={"" + num} onPress={() => onSelect(num)} width="24px" height="24px">{num}</button>
          ))}
        </hstack>
        <hstack gap="small">
          {[7, 8, 9].map(num => (
            <button key={"" + num} onPress={() => onSelect(num)} width="24px" height="24px">{num}</button>
          ))}
        </hstack>
        <text color="Black">{instructtxt}</text>
        <hstack gap="small">
          <button  size="small" onPress={() => {
            setUserInputGrid(Array(9).fill(null).map(() => Array(9).fill(0)));
            setInstructtxt("Game reset! Start fresh");
            setIsGameWon(false);
          }}>
            Reset
          </button>
          <button  size="small" onPress={async () => {
            if (selectedCell) {
              setInstructtxt(`Hint: The correct number is ${sudokuarr[selectedCell.row][selectedCell.col]}`);
            } else {
              setInstructtxt("Select a cell for a hint");
            }
          }}>
            Hint
          </button>
        </hstack>
      </vstack>
    );

    if (!gameStarted) {
      return (
        <vstack height="100%" width="100%" gap="medium" alignment="center middle">
          <image
            url="logo.png"
            description="logo"
            imageHeight={256}
            imageWidth={256}
            height="48px"
            width="48px"
          />
          <text size="large">Sudoku Game</text>
          <button appearance="primary" onPress={startGame}>
            Start Game
          </button>
        </vstack>
      );
    }

    return (
      <vstack height="100%" width="100%" gap="medium" padding="medium" alignment="center middle">
         <text size="large">{isGameWon ? "Sudoku Solved!" : "Solve Sudoku !"}</text>
        <hstack gap="small">
           <vstack gap="small" alignment="center middle">
            {Array.from({ length: 9 }, (_, row) => (
              <hstack key={`row-${row}`} gap="small">
                {Array.from({ length: 9 }, (_, col) => {
                  const index = row * 9 + col;
                  const cell = sudokuGrid[row]?.[col];

                  const blockColor = Math.floor(row / 3) % 2 === Math.floor(col / 3) % 2
                    ? "#E8EEF2" // light silver
                    : "#B4D4F7"; // light blue
                  const isPrefilled = cell !== 0;

                  return (
                    <hstack
                      key={`cell-${index}`}
                      backgroundColor={blockColor}
                      padding="small"
                      alignment="center middle"
                      height="22px"
                      width="22px"
                      onPress={() => {
                        if (!isPrefilled) {
                          setSelectedCell({ row, col });
                          console.log("Selected cell", row, col);
                        }
                      }}
                    >
                      <text color={isPrefilled ? "#4B6792" : "black"}  
                            weight={isPrefilled ? "bold" : "regular"}
                            size={isPrefilled ? "small" : "medium"}
                            >
                        {isPrefilled ? cell : (userInputGrid[row][col] || '')}
                      </text>
                    </hstack>
                  );
                })}
              </hstack>

            ))}
          </vstack>
          <NumberPicker onSelect={function (n: number): void {
            if (selectedCell) {
              console.log("Number selected ", n);
              handleNumberSelect(n);
            }else{
              console.log("Select a cell first");
              setInstructtxt("Select a cell first");
            }
          }} onClose={function (): void {
            //not implemented
          }}
          />

        </hstack>

      </vstack>
    );
  },

});



export default Devvit;
