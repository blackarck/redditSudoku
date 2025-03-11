// Learn more at developers.reddit.com/docs
import { Devvit, useState ,useForm} from '@devvit/public-api';
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
 
Devvit.configure({
  redditAPI: true,
  redis: true,
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
    const [sudokuArr, setSudokuArr] = useState<number[][]>([]);
    const [selectedCell, setSelectedCell] = useState<{ row: number; col: number } | null>(null);
    const [userInputGrid, setUserInputGrid] = useState<number[][]>(Array(9).fill(null).map(() => Array(9).fill(0)));
    const [instructtxt, setInstructtxt] = useState<string>("Select a Cell to fill");
    const [isGameWon, setIsGameWon] = useState(false);
    const [gameId, setGameId] = useState<string>("");

    //save game state
    const saveGameState = async () => {
      // Save the game state
      const { redis } = context;
      let puzzleData = {
        gameID:gameId,
        sudokuArr:sudokuarr,
        hiddenSudokuArr:hiddenSudokuarr,
      };
      // Storing a puzzle
      await redis.set( gameId, JSON.stringify(puzzleData));
      // Set expiration for 30 days
      await redis.expire(gameId, 60 * 60 * 24 * 2);

      // Retrieving a puzzle
      // const puzzleData = JSON.parse(await redis.get('puzzle:123456'));
    };

    const startGame = (difficulty: number) => {
      // Main start of the game intialize values and start new grid
      console.log("****************");
      // Generate random game ID
      const randomGameId = Math.random().toString(36).substring(2, 8).toUpperCase();
      setGameId(randomGameId);

      fillsudokuarr();
      hideSudoku(difficulty);
      setSudokuGrid(hiddenSudokuarr);
      setSudokuArr(sudokuarr);
      setGameStarted(true);
      saveGameState(context);
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

    //game load logic
    const gameIdForm = useForm({
      fields: [
        { 
          name: 'gameId', 
          label: 'Enter Game ID', 
          type: 'string'
        }
      ]
    }, async (values) => {
      setGameId(values.gameId as string);
      const savedGame = await context.redis.get(gameId);
      if (!savedGame) {
        context.ui.showToast('Game not found. Please check the ID and try again.');
        return;
      }
      const puzzleData = JSON.parse(savedGame);
       // Load the game state
    Object.assign(sudokuarr, puzzleData.sudokuArr);
    Object.assign(hiddenSudokuarr, puzzleData.hiddenSudokuArr);
    // Set up the game state
    setGameId(gameId);
    setSudokuGrid(puzzleData.hiddenSudokuArr);
    setSudokuArr(puzzleData.sudokuArr);
    setGameStarted(true);
    setUserInputGrid(Array(9).fill(null).map(() => Array(9).fill(0)));
      // Here you can add logic to load the game with the entered ID
    });


    // number picker component function
    const NumberPicker = ({ onSelect, onClose }: {
      onSelect: (n: number) => void,
      onClose: () => void
    }) => (
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
        <text color="Black" size="small">{instructtxt}</text>
        <hstack gap="small">


          {/* clear button */}
          <button size="small" onPress={() => {
            if (selectedCell) {
              const isPrefilled = sudokuGrid[selectedCell.row][selectedCell.col] !== 0;
              if (!isPrefilled) {
                const newGrid = [...userInputGrid];
                newGrid[selectedCell.row][selectedCell.col] = 0;
                setUserInputGrid(newGrid);
                setInstructtxt("Cell cleared!");
                setSelectedCell(null);
              } else {
                //  do nothing
              }
            } else {
              setInstructtxt("Select a cell to clear");
            }
          }}>
            Clear
          </button>

          <button size="small" onPress={async () => {
            if (selectedCell) {
              console.log("Hint selected cell", selectedCell.row, selectedCell.col);
              setInstructtxt(`Hint: number is ${sudokuarr[selectedCell.row][selectedCell.col]}`);
            } else {
              setInstructtxt("Select a cell for a hint");
            }
          }}>
            Hint
          </button>
        </hstack>
        <button size="small" onPress={() => {
          setUserInputGrid(Array(9).fill(null).map(() => Array(9).fill(0)));
          setInstructtxt("Reset! Start fresh");
          setIsGameWon(false);
        }}>
          Reset
        </button>

        <button size="small" onPress={() => {
          setGameStarted(false);
          setUserInputGrid(Array(9).fill(null).map(() => Array(9).fill(0)));
          setSudokuGrid([]);
          setSelectedCell(null);
          setIsGameWon(false);
          setInstructtxt("Select a Cell to fill");
          setGameId("");
        }}>
          New Game
        </button>
       
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
          <hstack gap="small">
            <button appearance="primary" onPress={() => startGame(1)}>
              Easy
            </button>
            <button appearance="primary" onPress={() => startGame(2)}>
              Medium
            </button>
            <button appearance="primary" onPress={() => startGame(3)}>
              Hard
            </button>
          </hstack>
          <button onPress={() => { context.ui.showForm(gameIdForm) }}>
          Enter Game ID
        </button>
        </vstack>
      );
    }

    return (
      <vstack height="100%" width="100%" gap="medium" padding="medium" alignment="center middle">
        <text size="large">{isGameWon ? "Sudoku Solved!" : `Solve Sudoku! (Game ID: ${gameId})`}</text>
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
                      <text color={isPrefilled ? "#861E1F" : "black"}
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
            } else {
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
