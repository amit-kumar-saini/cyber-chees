import { useState, useRef, useEffect } from "react";
import { Chess, Square } from "chess.js";
import { ChessBoard } from "./ChessBoard";
import { Button } from "@/components/ui/button";
import { ArrowLeft, RotateCcw } from "lucide-react";
import { toast } from "sonner";
import { AlertDialog, AlertDialogAction, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { supabase } from "@/integrations/supabase/client";
import { useOnlinePresence } from "@/hooks/useOnlinePresence";
import { useAdMob } from "@/hooks/useAdMob";
import { useAIProgress } from "@/hooks/useAIProgress";

// Stockfish engine type
type StockfishEngine = Worker & {
  postMessage: (message: string) => void;
};
interface GameInterfaceProps {
  mode: "ai" | "online" | "local";
  difficulty?: "easy" | "medium" | "hard";
  onBack: () => void;
  gameId?: string;
  playerColor?: "white" | "black";
}
export const GameInterface = ({
  mode,
  difficulty,
  onBack,
  gameId,
  playerColor = "white"
}: GameInterfaceProps) => {
  console.log("GameInterface render - mode:", mode, "gameId:", gameId, "playerColor:", playerColor);
  const [game, setGame] = useState(new Chess());
  const [position, setPosition] = useState(game.board());
  const [selectedSquare, setSelectedSquare] = useState<Square | null>(null);
  const [possibleMoves, setPossibleMoves] = useState<Square[]>([]);
  const [showGameOverDialog, setShowGameOverDialog] = useState(false);
  const [gameResult, setGameResult] = useState<{
    winner: string;
    message: string;
  } | null>(null);
  const [moveHistory, setMoveHistory] = useState<string[]>([]);
  const [fullGameHistory, setFullGameHistory] = useState<Chess[]>([new Chess()]);
  const [reviewMoveIndex, setReviewMoveIndex] = useState<number>(0);
  const [showMoveHistory, setShowMoveHistory] = useState(false);
  const [isReviewing, setIsReviewing] = useState(false);
  
  const audioContextRef = useRef<AudioContext | null>(null);
  const stockfishRef = useRef<StockfishEngine | null>(null);
  const [isOnlineGameReady, setIsOnlineGameReady] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | undefined>(undefined);
  const [opponentId, setOpponentId] = useState<string | undefined>(undefined);
  const { onlineUsers } = useOnlinePresence(currentUserId);
  const { showInterstitialAd } = useAdMob();
  const { recordWin } = useAIProgress();

  // Initialize Stockfish engine
  useEffect(() => {
    if (mode === "ai" && !stockfishRef.current) {
      try {
        const stockfish = new Worker('/stockfish/stockfish.js') as StockfishEngine;

        stockfish.onmessage = (e) => {
          console.log('Stockfish response:', e.data);
        };

        stockfish.onerror = (e) => {
          console.error('Stockfish error:', e);
          toast.error("AI engine failed to load");
        };

        stockfish.postMessage('uci');
        stockfish.postMessage('setoption name Threads value 1');
        stockfish.postMessage('setoption name Hash value 16');
        const skill = difficulty === "easy" ? 5 : difficulty === "medium" ? 12 : 20;
        stockfish.postMessage('setoption name Skill Level value ' + skill);
        
        // Hard mode: disable skill level limitations for maximum strength
        if (difficulty === "hard") {
          stockfish.postMessage('setoption name UCI_LimitStrength value false');
        }

        stockfishRef.current = stockfish;

        // Ensure engine is ready
        stockfish.postMessage('isready');

        toast.success("AI engine loaded successfully");
      } catch (error) {
        console.error('Failed to initialize Stockfish:', error);
        toast.error("Failed to initialize AI engine");
      }
    } else if (mode === "ai" && stockfishRef.current) {
      // Update skill when difficulty changes
      const skill = difficulty === "easy" ? 5 : difficulty === "medium" ? 12 : 20;
      stockfishRef.current.postMessage('setoption name Skill Level value ' + skill);
      
      // Hard mode: disable skill level limitations for maximum strength
      if (difficulty === "hard") {
        stockfishRef.current.postMessage('setoption name UCI_LimitStrength value false');
      }
      
      stockfishRef.current.postMessage('isready');
    }

    return () => {
      if (stockfishRef.current) {
        stockfishRef.current.terminate();
        stockfishRef.current = null;
      }
    };
  }, [mode, difficulty]);

  // Initialize online game and sync
  useEffect(() => {
    if (mode !== "online" || !gameId) return;

    // Get current user and load initial game state
    const loadGameState = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      
      setCurrentUserId(user.id);

      const { data, error } = await supabase
        .from('games')
        .select('*')
        .eq('id', gameId)
        .single();

      if (error || !data) {
        toast.error("Failed to load game");
        return;
      }

      // Set opponent ID
      const opponent = data.white_player_id === user.id ? data.black_player_id : data.white_player_id;
      if (opponent && opponent !== 'ai') {
        setOpponentId(opponent);
      }

      // Check if opponent is AI and initialize Stockfish
      const isPlayingAgainstAI = data.black_player_id === 'ai' || data.white_player_id === 'ai';
      if (isPlayingAgainstAI && !stockfishRef.current) {
        try {
          const stockfish = new Worker('/stockfish/stockfish.js') as StockfishEngine;
          stockfish.postMessage('uci');
          stockfish.postMessage('setoption name Skill Level value 12');
          stockfish.postMessage('isready');
          stockfishRef.current = stockfish;
          console.log("AI opponent initialized for online game");
        } catch (error) {
          console.error('Failed to initialize AI:', error);
        }
      }

      const chess = new Chess(data.current_fen);
      setGame(chess);
      setPosition(chess.board());
      setIsOnlineGameReady(true);
    };

    loadGameState();

    // Subscribe to real-time updates
    const channel = supabase
      .channel(`game:${gameId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'games',
          filter: `id=eq.${gameId}`
        },
        (payload: any) => {
          const newData = payload.new;
          
          // Update game state
          const chess = new Chess(newData.current_fen);
          setGame(chess);
          setPosition(chess.board());

          // Check for game over
          if (newData.status === 'completed') {
            const winner = newData.winner === playerColor ? 'You win!' : 'Opponent wins!';
            setGameResult({ winner, message: `Game over: ${winner}` });
            setShowGameOverDialog(true);
          }

          // Play move sound if it's opponent's move
          if (newData.current_turn !== playerColor) {
            playMoveSound();
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [mode, gameId, playerColor]);

  // Monitor opponent connection status
  useEffect(() => {
    if (mode !== "online" || !opponentId || !gameId) return;

    // Check if opponent is still online
    const checkOpponentConnection = async () => {
      if (!onlineUsers.has(opponentId)) {
        // Opponent disconnected, terminate game
        const { error } = await supabase
          .from('games')
          .update({ 
            status: 'completed',
            winner: playerColor 
          })
          .eq('id', gameId);

        if (!error) {
          toast.error("Opponent disconnected. You win!");
          setGameResult({
            winner: 'You win!',
            message: 'Opponent disconnected from the game'
          });
          setShowGameOverDialog(true);
        }
      }
    };

    checkOpponentConnection();
  }, [onlineUsers, opponentId, mode, gameId, playerColor]);

  // Initialize audio context
  const getAudioContext = () => {
    if (!audioContextRef.current) {
      audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    return audioContextRef.current;
  };

  // Sound effect functions
  const playMoveSound = () => {
    const audioContext = getAudioContext();
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();
    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);
    oscillator.frequency.value = 400;
    oscillator.type = 'sine';
    gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.1);
    oscillator.start(audioContext.currentTime);
    oscillator.stop(audioContext.currentTime + 0.1);
  };
  const playCaptureSound = () => {
    const audioContext = getAudioContext();
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();
    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);
    oscillator.frequency.value = 300;
    oscillator.type = 'sawtooth';
    gainNode.gain.setValueAtTime(0.4, audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.15);
    oscillator.start(audioContext.currentTime);
    oscillator.stop(audioContext.currentTime + 0.15);
  };
  const playCheckSound = () => {
    const audioContext = getAudioContext();
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();
    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);
    oscillator.frequency.value = 800;
    oscillator.type = 'triangle';
    gainNode.gain.setValueAtTime(0.5, audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.3);
    oscillator.start(audioContext.currentTime);
    oscillator.stop(audioContext.currentTime + 0.3);

    // Second tone for check
    setTimeout(() => {
      const osc2 = audioContext.createOscillator();
      const gain2 = audioContext.createGain();
      osc2.connect(gain2);
      gain2.connect(audioContext.destination);
      osc2.frequency.value = 1000;
      osc2.type = 'triangle';
      gain2.gain.setValueAtTime(0.5, audioContext.currentTime);
      gain2.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.2);
      osc2.start(audioContext.currentTime);
      osc2.stop(audioContext.currentTime + 0.2);
    }, 100);
  };
  const playCheckmateSound = () => {
    const audioContext = getAudioContext();
    const frequencies = [523, 659, 784, 1047]; // C, E, G, C (victory chord)

    frequencies.forEach((freq, index) => {
      setTimeout(() => {
        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();
        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);
        oscillator.frequency.value = freq;
        oscillator.type = 'sine';
        gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.5);
        oscillator.start(audioContext.currentTime);
        oscillator.stop(audioContext.currentTime + 0.5);
      }, index * 100);
    });
  };
  
  const makeAIMove = () => {
    if (!stockfishRef.current) {
      console.error('Stockfish not initialized');
      toast.error("AI engine not ready. Please refresh the page.");
      return;
    }
    
    console.log('Making AI move with difficulty:', difficulty);

    const engine = stockfishRef.current;
    let bestMove = '';
    let messageHandlerAdded = false;

    // Optimize Stockfish settings for speed and strength
    engine.postMessage('setoption name Hash value 256');
    engine.postMessage('setoption name Threads value 2');
    
    // Set difficulty level - Hard mode uses maximum strength
    const depth = difficulty === "easy" ? 8 : difficulty === "medium" ? 14 : 22;
    const moveTime = difficulty === "easy" ? 400 : difficulty === "medium" ? 800 : 2000;

    // Fallback timeout
    const fallbackTimer = setTimeout(() => {
      if (!bestMove) {
        console.warn('Stockfish timeout, using random move');
        const legal = game.moves({ verbose: true });
        if (legal.length) {
          const m = legal[Math.floor(Math.random() * legal.length)];
          const res = game.move({ from: m.from as Square, to: m.to as Square, promotion: (m.promotion as any) });
          if (res) {
            const newGameState = new Chess(game.fen());
            setPosition(game.board());
            setMoveHistory(prev => [...prev, res.san]);
            setFullGameHistory(prev => [...prev, newGameState]);
            res.captured ? playCaptureSound() : playMoveSound();
            if (game.isGameOver()) { handleGameOver(); } else if (game.isCheck()) { playCheckSound(); }
          }
        }
      }
    }, moveTime + 1500);

    // Handler for Stockfish messages
    const handleMessage = (e: MessageEvent) => {
      const message = e.data;
      console.log('Stockfish message:', message);
      
      if (typeof message === 'string' && message.startsWith('bestmove')) {
        const move = message.split(' ')[1];
        if (!move || move === '(none)') {
          clearTimeout(fallbackTimer);
          return;
        }
        
        bestMove = move;
        clearTimeout(fallbackTimer);

        setTimeout(() => {
          try {
            const from = move.substring(0, 2) as Square;
            const to = move.substring(2, 4) as Square;
            const promotion = move.length > 4 ? (move[4] as any) : undefined;

            const moveResult = game.move({ from, to, promotion });
            if (moveResult) {
              const newGameState = new Chess(game.fen());
              setPosition(game.board());
              setMoveHistory(prev => [...prev, moveResult.san]);
              setFullGameHistory(prev => [...prev, newGameState]);
              moveResult.captured ? playCaptureSound() : playMoveSound();
              if (game.isGameOver()) { handleGameOver(); } else if (game.isCheck()) { playCheckSound(); }
            }
          } catch (error) {
            console.error('Error making AI move:', error);
          }
        }, 200);
      }
    };

    // Wait for ready confirmation
    const handleReady = (e: MessageEvent) => {
      if (typeof e.data === 'string' && e.data.trim() === 'readyok') {
        if (!messageHandlerAdded) {
          messageHandlerAdded = true;
          engine.addEventListener('message', handleMessage);
        }
        
        // Send position and calculate
        engine.postMessage('position fen ' + game.fen());
        
        // Use both depth and time for hard mode
        if (difficulty === "hard") {
          engine.postMessage(`go depth ${depth} movetime ${moveTime}`);
        } else {
          engine.postMessage(`go depth ${depth}`);
        }
      }
    };

    engine.addEventListener('message', handleReady);
    engine.postMessage('isready');
  };
  const handleGameOver = async () => {
    if (game.isCheckmate()) {
      playCheckmateSound();
      const winner = game.turn() === 'w' ? 'Black' : 'White';
      
      // Record AI win if player won against AI
      if (mode === "ai" && winner === "White" && difficulty) {
        await recordWin(difficulty);
      }
      
      setGameResult({
        winner,
        message: `Checkmate! ${winner} wins!`
      });
      setShowGameOverDialog(true);
      // Show ad after game ends
      showInterstitialAd();
    } else if (game.isDraw()) {
      setGameResult({
        winner: 'Draw',
        message: 'Game drawn!'
      });
      setShowGameOverDialog(true);
      showInterstitialAd();
    } else if (game.isStalemate()) {
      setGameResult({
        winner: 'Draw',
        message: 'Stalemate!'
      });
      setShowGameOverDialog(true);
      showInterstitialAd();
    }
  };
  const handleSquareClick = async (square: Square) => {
    if (isReviewing) return; // Disable moves during review

    // For online mode, check if it's player's turn
    if (mode === "online") {
      const currentTurn = game.turn() === 'w' ? 'white' : 'black';
      if (currentTurn !== playerColor) {
        toast.error("It's not your turn!");
        return;
      }
    }

    if (!selectedSquare) {
      const piece = game.get(square);
      if (piece && piece.color === game.turn()) {
        setSelectedSquare(square);
        const moves = game.moves({
          square,
          verbose: true
        });
        setPossibleMoves(moves.map(m => m.to as Square));
      }
    } else {
      if (square === selectedSquare) {
        setSelectedSquare(null);
        setPossibleMoves([]);
        return;
      }
      try {
        // Check if this is a pawn promotion move
        const piece = game.get(selectedSquare);
        const isPromotion = piece?.type === 'p' && (piece.color === 'w' && square[1] === '8' || piece.color === 'b' && square[1] === '1');
        const move = isPromotion ? game.move({
          from: selectedSquare,
          to: square,
          promotion: "q"
        }) : game.move({
          from: selectedSquare,
          to: square
        });
        if (move) {
          const newGameState = new Chess(game.fen());
          setPosition(game.board());
          setMoveHistory(prev => [...prev, move.san]);
          setFullGameHistory(prev => [...prev, newGameState]);
          setSelectedSquare(null);
          setPossibleMoves([]);

          // Play appropriate sound
          if (move.captured) {
            playCaptureSound();
          } else {
            playMoveSound();
          }

          // Update online game state
          if (mode === "online" && gameId) {
            const nextTurn = game.turn() === 'w' ? 'white' : 'black';
            const updateData: any = {
              current_fen: game.fen(),
              current_turn: nextTurn,
              last_move_from: selectedSquare,
              last_move_to: square,
            };

            // Check if game is over
            if (game.isGameOver()) {
              updateData.status = 'completed';
              if (game.isCheckmate()) {
                updateData.winner = playerColor;
              } else {
                updateData.winner = 'draw';
              }
            }

            const { error } = await supabase
              .from('games')
              .update(updateData)
              .eq('id', gameId);

            if (error) {
              console.error('Failed to update game:', error);
              toast.error("Failed to sync move");
            }
          }

          if (game.isGameOver()) {
            handleGameOver();
          } else if (game.isCheck()) {
            playCheckSound();
            if (mode === "ai") {
              makeAIMove();
            }
          } else if (mode === "ai") {
            makeAIMove();
          }
        } else {
          const piece = game.get(square);
          if (piece && piece.color === game.turn()) {
            setSelectedSquare(square);
            const moves = game.moves({
              square,
              verbose: true
            });
            setPossibleMoves(moves.map(m => m.to as Square));
          }
        }
      } catch (error) {
        const piece = game.get(square);
        if (piece && piece.color === game.turn()) {
          setSelectedSquare(square);
          const moves = game.moves({
            square,
            verbose: true
          });
          setPossibleMoves(moves.map(m => m.to as Square));
        } else {
          setSelectedSquare(null);
          setPossibleMoves([]);
        }
      }
    }
  };
  const resetGame = () => {
    const newGame = new Chess();
    setGame(newGame);
    setPosition(newGame.board());
    setSelectedSquare(null);
    setPossibleMoves([]);
    setShowGameOverDialog(false);
    setGameResult(null);
    setMoveHistory([]);
    setFullGameHistory([new Chess()]);
    setReviewMoveIndex(0);
    setShowMoveHistory(false);
    setIsReviewing(false);

    // Inform Stockfish about new game
    if (stockfishRef.current) {
      stockfishRef.current.postMessage('ucinewgame');
      stockfishRef.current.postMessage('isready');
    }

    toast.success("Game reset!");
  };
  const handleReview = () => {
    setShowGameOverDialog(false);
    setShowMoveHistory(true);
    setIsReviewing(true);
    setReviewMoveIndex(fullGameHistory.length - 1);
    toast.info("Use arrows to navigate through moves");
  };
  const goToPreviousMove = () => {
    if (reviewMoveIndex > 0) {
      const newIndex = reviewMoveIndex - 1;
      setReviewMoveIndex(newIndex);
      const gameState = fullGameHistory[newIndex];
      setPosition(gameState.board());
    }
  };
  const goToNextMove = () => {
    if (reviewMoveIndex < fullGameHistory.length - 1) {
      const newIndex = reviewMoveIndex + 1;
      setReviewMoveIndex(newIndex);
      const gameState = fullGameHistory[newIndex];
      setPosition(gameState.board());
    }
  };
  const exitReview = () => {
    setIsReviewing(false);
    setShowMoveHistory(false);
    setReviewMoveIndex(fullGameHistory.length - 1);
    const currentGame = fullGameHistory[fullGameHistory.length - 1];
    setPosition(currentGame.board());
  };
  const boardPosition = position.reduce((acc, row, rowIndex) => {
    row.forEach((piece, colIndex) => {
      if (piece) {
        const file = String.fromCharCode(97 + colIndex);
        const rank = 8 - rowIndex;
        const square = file + rank as Square;
        acc[square] = piece;
      }
    });
    return acc;
  }, {} as any);
  return <div className="min-h-screen flex flex-col justify-center py-2 px-1 sm:p-4 sm:items-center">
      <div className="w-full max-w-full sm:max-w-[650px] relative">
        
        <div className="flex flex-col sm:flex-row sm:justify-between items-center gap-2 sm:gap-0 mb-2 sm:mb-4 px-2 sm:px-0">
          {/* Back button */}
          <div className="w-full sm:w-auto flex justify-start">
            <Button variant="ghost" className="text-foreground hover:text-accent text-xs sm:text-base p-2 sm:p-4 h-8 sm:h-10" onClick={onBack}>
              <ArrowLeft className="w-3 h-3 sm:w-4 sm:h-4" />
              <span className="ml-1 sm:ml-2">Back</span>
            </Button>
          </div>

          {/* Title in center */}
          <div className="text-center flex-1">
            <h2 className="text-sm sm:text-xl md:text-2xl font-bold text-primary leading-tight">
              {mode === "ai" ? "vs AI" : mode === "local" ? "2P Local" : "Online"}
            </h2>
            <p className="text-muted-foreground text-[10px] sm:text-sm md:text-base">
              {isReviewing ? `Reviewing: Move ${reviewMoveIndex}` : `${game.turn() === 'w' ? 'White' : 'Black'} to move`}
            </p>
          </div>

          {/* Reset button */}
          <div className="w-full sm:w-auto flex justify-end sm:justify-center">
            <Button variant="ghost" className="text-foreground hover:text-accent text-xs sm:text-base p-2 sm:p-4 h-8 sm:h-10" onClick={resetGame}>
              <RotateCcw className="w-3 h-3 sm:w-4 sm:h-4" />
              <span className="ml-1 sm:ml-2">Reset</span>
            </Button>
          </div>
        </div>

        <ChessBoard position={boardPosition} onSquareClick={handleSquareClick} selectedSquare={selectedSquare} possibleMoves={possibleMoves} />

        {game.isCheck() && !game.isGameOver() && !isReviewing && <div className="mt-2 sm:mt-4 mx-1 sm:mx-2 p-2 sm:p-4 glass rounded-lg text-center glow-secondary">
            <p className="text-secondary font-bold text-sm sm:text-base md:text-xl">
              CHECK! - {game.turn() === 'w' ? 'White' : 'Black'} King in danger
            </p>
          </div>}

        {showMoveHistory && moveHistory.length > 0 && <div className="mt-4 mx-2 sm:mx-0 p-4 glass rounded-lg">
            <div className="flex justify-between items-center mb-3">
              <h3 className="text-lg sm:text-xl font-bold text-primary">Move History</h3>
              <Button variant="ghost" size="sm" onClick={exitReview} className="text-xs">
                Exit Review
              </Button>
            </div>
            
            {/* Navigation Controls */}
            <div className="flex justify-center gap-2 mb-3">
              <Button variant="outline" size="sm" onClick={goToPreviousMove} disabled={reviewMoveIndex === 0} className="text-xs">
                ← Previous
              </Button>
              <span className="text-sm self-center text-muted-foreground">
                Move {reviewMoveIndex} of {fullGameHistory.length - 1}
              </span>
              <Button variant="outline" size="sm" onClick={goToNextMove} disabled={reviewMoveIndex === fullGameHistory.length - 1} className="text-xs">
                Next →
              </Button>
            </div>

            <div className="grid grid-cols-2 gap-2 max-h-[200px] overflow-y-auto">
              {moveHistory.map((move, index) => <div key={index} className={`text-sm sm:text-base p-2 rounded cursor-pointer transition-colors ${index === reviewMoveIndex - 1 ? 'bg-primary/30 border-2 border-primary' : index % 2 === 0 ? 'bg-card/50' : 'bg-card/30'}`} onClick={() => {
            setReviewMoveIndex(index + 1);
            setPosition(fullGameHistory[index + 1].board());
          }}>
                  <span className="text-muted-foreground mr-2">
                    {Math.floor(index / 2) + 1}{index % 2 === 0 ? '.' : '...'}
                  </span>
                  <span className="text-foreground font-medium">{move}</span>
                </div>)}
            </div>
          </div>}
      </div>

      <AlertDialog open={showGameOverDialog} onOpenChange={setShowGameOverDialog}>
        <AlertDialogContent className="max-w-[90vw] sm:max-w-md">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-xl sm:text-2xl text-center">
              {gameResult?.message}
            </AlertDialogTitle>
            <AlertDialogDescription className="text-center text-base sm:text-lg pt-2">
              {gameResult?.winner !== 'Draw' && <span className="font-semibold text-primary">
                  {gameResult?.winner} is victorious!
                </span>}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex-col sm:flex-row gap-2">
            <Button variant="outline" onClick={handleReview} className="w-full sm:w-auto">
              Review Game
            </Button>
            <AlertDialogAction onClick={resetGame} className="w-full sm:w-auto">
              Restart Game
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>;
};