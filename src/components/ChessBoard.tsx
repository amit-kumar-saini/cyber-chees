import { Square } from "chess.js";

interface ChessBoardProps {
  position: any;
  onSquareClick: (square: Square) => void;
  selectedSquare: Square | null;
  possibleMoves: Square[];
}

const PIECES: { [key: string]: string } = {
  'wp': '♙', 'wn': '♘', 'wb': '♗', 'wr': '♖', 'wq': '♕', 'wk': '♔',
  'bp': '♟︎', 'bn': '♞', 'bb': '♝', 'br': '♜', 'bq': '♛', 'bk': '♚'
};

export const ChessBoard = ({ position, onSquareClick, selectedSquare, possibleMoves }: ChessBoardProps) => {
  const files = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];
  const ranks = ['8', '7', '6', '5', '4', '3', '2', '1'];

  const getPiece = (square: Square) => {
    const piece = position[square];
    if (!piece) return null;
    return PIECES[piece.color + piece.type];
  };

  const isLightSquare = (file: string, rank: string) => {
    const fileIndex = files.indexOf(file);
    const rankIndex = ranks.indexOf(rank);
    return (fileIndex + rankIndex) % 2 === 0;
  };

  const isSelected = (square: Square) => selectedSquare === square;
  const isPossibleMove = (square: Square) => possibleMoves.includes(square);

  return (
    <div className="w-full flex items-center justify-center px-1 sm:px-4">
      {/* Wooden frame container */}
      <div className="w-full max-w-[95vw] sm:max-w-[600px] p-2 sm:p-4 md:p-6 rounded-xl sm:rounded-2xl shadow-2xl"
        style={{
          background: 'linear-gradient(135deg, #8B5A3C 0%, #6B4423 50%, #5C3A1F 100%)',
          boxShadow: '0 10px 40px rgba(0,0,0,0.4), inset 0 2px 4px rgba(255,255,255,0.1)'
        }}>
        
        {/* Board container with coordinates */}
        <div className="grid grid-cols-[20px_1fr_20px] sm:grid-cols-[28px_1fr_28px] gap-1">
          {/* Left rank labels */}
          <div className="flex flex-col justify-around">
            {ranks.map((rank) => (
              <div key={rank} className="flex items-center justify-center text-amber-100 text-[10px] sm:text-sm font-bold" 
                style={{ textShadow: '0 1px 2px rgba(0,0,0,0.5)' }}>
                {rank}
              </div>
            ))}
          </div>

          {/* Chess board */}
          <div>
            <div className="grid grid-cols-8 gap-0 aspect-square rounded overflow-hidden border-2 border-amber-950/50"
              style={{
                boxShadow: 'inset 0 2px 8px rgba(0,0,0,0.3), 0 4px 12px rgba(0,0,0,0.2)'
              }}>
              {ranks.map((rank) =>
                files.map((file) => {
                  const square = (file + rank) as Square;
                  const piece = getPiece(square);
                  const isLight = isLightSquare(file, rank);
                  const selected = isSelected(square);
                  const canMove = isPossibleMove(square);

                  return (
                    <button
                      key={square}
                      onClick={() => onSquareClick(square)}
                      className={`
                        aspect-square flex items-center justify-center 
                        text-2xl sm:text-4xl md:text-5xl lg:text-6xl
                        transition-all duration-200 hover:brightness-110 relative
                        ${selected ? 'z-10 scale-105' : ''}
                        cursor-pointer select-none
                      `}
                      style={{
                        background: isLight 
                          ? '#F0D9B5'
                          : '#7A9B6F',
                        boxShadow: selected
                          ? '0 0 0 3px rgba(255, 215, 0, 0.8), inset 0 1px 2px rgba(0,0,0,0.1)'
                          : 'inset 0 1px 2px rgba(0,0,0,0.1)',
                      }}
                    >
                      {piece && (
                        <span className={`
                          transition-all duration-300 select-none pointer-events-none
                          ${selected ? 'scale-110 drop-shadow-[0_0_8px_rgba(255,215,0,0.8)]' : ''}
                          ${piece.includes('♔') || piece.includes('♚') ? 'drop-shadow-[0_0_6px_rgba(255,215,0,0.7)]' : 'drop-shadow-[0_2px_3px_rgba(0,0,0,0.5)]'}
                        `}
                        style={{
                          filter: piece.charAt(0) === 'w' 
                            ? 'drop-shadow(0 2px 3px rgba(0,0,0,0.4))'
                            : 'drop-shadow(0 0 1.5px rgba(255,255,255,1)) drop-shadow(0 0 3px rgba(255,255,255,0.7)) drop-shadow(0 2px 4px rgba(0,0,0,0.8))',
                          color: piece.charAt(0) === 'w' ? '#FFFFFF' : '#000000',
                          WebkitTextStroke: piece.charAt(0) === 'b' ? '0.8px rgba(255,255,255,0.5)' : 'none'
                        }}>
                          {piece}
                        </span>
                      )}
                      {canMove && !piece && (
                        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                          <div className="w-2 h-2 sm:w-3 sm:h-3 md:w-4 md:h-4 rounded-full bg-yellow-400/90 shadow-[0_0_8px_rgba(255,215,0,0.8)]" />
                        </div>
                      )}
                      {canMove && piece && (
                        <div className="absolute inset-0 bg-yellow-400/30 pointer-events-none"
                          style={{
                            boxShadow: 'inset 0 0 0 3px rgba(255, 215, 0, 0.6)'
                          }} />
                      )}
                    </button>
                  );
                })
              )}
            </div>
            
            {/* Bottom file labels */}
            <div className="grid grid-cols-8 mt-1">
              {files.map((file) => (
                <div key={file} className="text-center text-amber-100 text-[10px] sm:text-sm font-bold"
                  style={{ textShadow: '0 1px 2px rgba(0,0,0,0.5)' }}>
                  {file}
                </div>
              ))}
            </div>
          </div>

          {/* Right rank labels */}
          <div className="flex flex-col justify-around">
            {ranks.map((rank) => (
              <div key={rank} className="flex items-center justify-center text-amber-100 text-[10px] sm:text-sm font-bold"
                style={{ textShadow: '0 1px 2px rgba(0,0,0,0.5)' }}>
                {rank}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
