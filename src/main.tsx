// Learn more at developers.reddit.com/docs
import { Devvit, useState, useForm, useAsync, Scheduler } from '@devvit/public-api';
import {
  sudokuarr,
  fillsudokuarr,
  hideSudoku,
  hiddenSudokuarr
} from './sudokuhelper.js';

Devvit.configure({
  redis: true,
  redditAPI: true
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

Devvit.addSchedulerJob({
  name: 'period_sudoku_quiz',
  onRun: async (_, context) => {
    //console.log('daily_thread handler called');
    const subreddit = await context.reddit.getCurrentSubreddit();
    // Generate sudoku puzzle
    fillsudokuarr();
    hideSudoku(2); // Medium difficulty for quiz mode

    // Format the puzzle for display
    const puzzleDisplay = hiddenSudokuarr.map(row =>
      row.map(cell => cell === 0 ? '_' : cell).join(' ')
    ).join('\n');

    const puzzleText = `# Daily Sudoku Quiz Challenge!\n\n` +
      `Try to solve these 5 numbers in the puzzle below:\n\n` +
      '```\n' +
      puzzleDisplay +
      '\n```\n\n' +
      'Reply with your answers in the comments!';

    const resp = await context.reddit.submitPost({
      subredditName: subreddit.name,
      title: '🧩 Daily Sudoku Quiz Challenge',
      text: puzzleText,
    });
   // console.log('posted resp', JSON.stringify(resp));
  },
});

Devvit.addTrigger({
  event: 'AppInstall',
  onEvent: async (_, context) => {
    const jobId = await context.scheduler.runJob({
      name: 'period_sudoku_quiz',
      cron: '0 */6 * * * *',
    });
  },
});

// Add a post type definition
Devvit.addCustomPostType({
  name: 'Sudoku Post',
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
    // Quiz mode implementation
    const [gameMode, setGameMode] = useState<number>(0); // 0 for normal, 1 for quiz
    const [correctGuesses, setCorrectGuesses] = useState<number>(0);
    const [targetGuesses, setTargetGuesses] = useState<number>(5);
    //save game state
    const saveGameState = async (gameid: string, sud: number[][], hidsud: number[][]) => {

      const puzzleData = {
        'gameID': gameid,
        'sudokuArr': sud,
        'hiddenSudokuArr': hidsud,
      };
      // Storing a puzzle 
      // console.log("Json stringify is ", JSON.stringify(puzzleData));
      // await redis.set(gameid, "test");
      await context.redis.set(gameid, JSON.stringify(puzzleData));
      // Set expiration for 30 days
      await context.redis.expire(gameid, 60 * 60 * 24 * 2);
      // Retrieving a puzzle
      // const puzzleData = JSON.parse(await redis.get('puzzle:123456'));
      //console.log("Saved game state",puzzleData);
      return true;
    };


  
    const startGame = async (difficulty: number) => {
      // Main start of the game intialize values and start new grid
      // Clear previous state first
      setUserInputGrid(Array(9).fill(null).map(() => Array(9).fill(0)));
      setSelectedCell(null);
      setIsGameWon(false);
      setInstructtxt("Select a Cell to fill");

      // Generate random game ID
      const randomGameId = Math.random().toString(36).substring(2, 8).toUpperCase();
      setGameId(randomGameId);

      // Generate Sudoku puzzle
      fillsudokuarr();
      hideSudoku(difficulty as 1 | 2 | 3);

      // Create deep copies to prevent reference issues
      const solutionGrid = JSON.parse(JSON.stringify(sudokuarr));
      const puzzleGrid = JSON.parse(JSON.stringify(hiddenSudokuarr));

      // Update state with copies
      setSudokuArr(solutionGrid);
      setSudokuGrid(puzzleGrid);
      setGameStarted(true);

      await saveGameState(randomGameId, solutionGrid, puzzleGrid);
    };

    // handle number selection
    const handleNumberSelect = (number: number) => {
      if (selectedCell) {
        const newGrid = [...userInputGrid];
        newGrid[selectedCell.row][selectedCell.col] = number;
        setUserInputGrid(newGrid);
        // console.log("New Grid", newGrid);
        if (gameMode === 1) { // Quiz Mode
          if (number === sudokuArr[selectedCell.row][selectedCell.col]) {
            const newCorrectGuesses = correctGuesses + 1;
            setCorrectGuesses(newCorrectGuesses);

            if (newCorrectGuesses >= targetGuesses) {
              setIsGameWon(true);
              setInstructtxt("Quiz Complete! You've won!");
              context.ui.showToast("🎉 Congratulations! You've completed the Quiz!"); // Added toast
            } else {
              context.ui.showToast(`Correct! ${targetGuesses - newCorrectGuesses} more to go!`);
            }
          } else {
            context.ui.showToast("Incorrect guess! Try again!");
          }
        } else { // Normal Mode
          // Check if the game is won
          if (checkWinCondition(newGrid)) {
            setIsGameWon(true);
            setInstructtxt("Congratulations! You've won!");
            context.ui.showToast("🎉 Congratulations! You've Won!"); // Added toast
          }
        }
        setSelectedCell(null);
      }
    };

    // function to check win condition
    const checkWinCondition = (grid: number[][]): boolean => {
      for (let i = 0; i < 9; i++) {
        for (let j = 0; j < 9; j++) {
          if (sudokuGrid[i][j] === 0) {  // Only check cells that were empty
            if (grid[i][j] !== sudokuArr[i][j]) {
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
      //console.log("Game ID entered is ", values.gameId);
      setGameId(values.gameId as string);
      const savedGame = await context.redis.get(values.gameId as string);
      if (!savedGame) {
        context.ui.showToast('Game not found. Please check the ID and try again.');
        return;
      }
      //console.log("Saved game is ", savedGame);
      const puzzleData = JSON.parse(savedGame);
      // Load the game state
      // Create deep copies
      const solutionGrid = JSON.parse(JSON.stringify(puzzleData.sudokuArr));
      const puzzleGrid = JSON.parse(JSON.stringify(puzzleData.hiddenSudokuArr));

      // Reset all state in proper order
      setUserInputGrid(Array(9).fill(null).map(() => Array(9).fill(0)));
      setSelectedCell(null);
      setIsGameWon(false);
      setInstructtxt("Select a Cell to fill");

      // Set up the game state
      // Update game state
      setSudokuArr(solutionGrid);
      setSudokuGrid(puzzleGrid);
      setGameId(values.gameId as string);
      setGameStarted(true);

      // Here you can add logic to load the game with the entered ID
    });

    // number picker component function
    const NumberPicker = ({ onSelect, onClose }: {
      onSelect: (n: number) => void,
      onClose: () => void
    }) => (
      <vstack gap="small" backgroundColor="white" padding="xsmall" border="thin">
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

          <button
            size="small"
            disabled={gameMode === 1}
            onPress={async () => {
              if (selectedCell) {
                // console.log("Hint selected cell", selectedCell.row, selectedCell.col);
                setInstructtxt(`Hint: number is ${sudokuArr[selectedCell.row][selectedCell.col]}`);
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

        {gameMode === 1 && (
          <text size="small" color="primary-background">
            {targetGuesses - correctGuesses} numbers remaining
          </text>
        )}

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
            <button appearance="primary" onPress={async () => {
              await startGame(1);
              setGameMode(0);
            }}>
              Easy
            </button>
            <button appearance="primary" onPress={async () => {
              await startGame(2);
              setGameMode(0);
            }}>
              Medium
            </button>
            <button appearance="primary" onPress={async () => {
              await startGame(3);
              setGameMode(0);
            }}>
              Hard
            </button>
          </hstack>
          <button onPress={async () => {
            context.ui.showToast("Quiz! Guess 5 numbers correctly");
            setGameMode(1);
            await startGame(2);
          }}>
            Quiz Mode
          </button>
          <button onPress={async () => {
            context.ui.showForm(gameIdForm);
            setGameMode(0);
          }}>
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
                          // console.log("Selected cell", row, col);
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
              // console.log("Number selected ", n);
              handleNumberSelect(n);
            } else {
              // console.log("Select a cell first");
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
