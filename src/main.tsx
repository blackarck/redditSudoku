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
// Add this to your imports
import { KVStore } from '@devvit/public-api';

Devvit.configure({
  redditAPI: true,
});

// Add a menu item to the subreddit menu for instantiating the new experience post
Devvit.addMenuItem({
  label: 'Add my post',
  location: 'subreddit',
  forUserType: 'moderator',
  onPress: async (_event, context) => {
    const { reddit, ui } = context;
    ui.showToast("Submitting your post - upon completion you'll navigate there.");

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
});

// Add a post type definition
Devvit.addCustomPostType({
  name: 'Experience Post',
  height: 'regular',
  render: (_context) => {
    const [gameStarted, setGameStarted] = useState(false);
    const [sudokuGrid, setSudokuGrid] = useState<number[][]>([]);
    // Add these state variables in your render function
    const [selectedCell, setSelectedCell] = useState<{ row: number; col: number } | null>(null);
    const [userInputGrid, setUserInputGrid] = useState<number[][]>(Array(9).fill(null).map(() => Array(9).fill(0)));

    //delievered example
    //const [counter, setCounter] = useState(0);

    const startGame = () => {

      console.log("****************");
      fillsudokuarr();
      hideSudoku(2);
      setSudokuGrid(hiddenSudokuarr);
      setGameStarted(true);
      //main array
      //sudokuarr
      //hidden - hiddenSudokuarr
      //hiddenclone - hiddenSudokuclone 
    };

    // Add this number picker component function
    const NumberPicker = ({ onSelect, onClose }: { onSelect: (n: number) => void, onClose: () => void }) => (
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
        <text size="large">Solve Sudoku !</text>
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
                    padding="xsmall"
                    alignment="center middle"
                    height="22px"
                    width="22px"
                    onPress={() => {
                      if (!isPrefilled) {
                        setSelectedCell({ row, col });
                      }
                    }}
                  >
                    <text color={isPrefilled ? "#1B4079" : "neutral"}>
                      {isPrefilled ? cell : (userInputGrid[row][col] || '')}
                    </text>
                    {selectedCell?.row === row && selectedCell?.col === col && (
                      <NumberPicker
                        onSelect={(num) => {
                          const newGrid = [...userInputGrid];
                          newGrid[row][col] = num;
                          setUserInputGrid(newGrid);
                          setSelectedCell(null);
                        }}
                        onClose={() => setSelectedCell(null)}
                      />
                    )}
                  </hstack>
                );
              })}
            </hstack>
          ))}
        </vstack>
      </vstack>
    );
  },

});



export default Devvit;
