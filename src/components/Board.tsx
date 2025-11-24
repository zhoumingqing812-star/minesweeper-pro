import { motion } from 'framer-motion'
import { Cell } from './Cell'
import { cn } from '../lib/utils'
import type { Cell as CellType, GameStatus } from '../hooks/useMinesweeper'

interface BoardProps {
  board: CellType[][]
  status: GameStatus
  onOpenCell: (row: number, col: number) => void
  onFlagCell: (row: number, col: number) => void
  onChordCell: (row: number, col: number) => void
  difficulty?: 'beginner' | 'intermediate' | 'expert'
}

export function Board({
  board,
  status,
  onOpenCell,
  onFlagCell,
  onChordCell,
  difficulty: _difficulty = 'beginner',
}: BoardProps) {
  const gameOver = status === 'won' || status === 'lost'
  const cols = board[0]?.length || 0
  const rows = board.length

  // 统一的格子大小 - 所有模式都使用相同的方形格子（固定大小，不受响应式影响）
  const cellSizePx = 36 // 固定36px，确保所有模式格子大小一致
  const gapPx = 4 // 固定4px间距

  return (
    <div className="relative">
      <motion.div
        className={cn(
          "relative p-4 sm:p-5 md:p-6 lg:p-8 rounded-xl sm:rounded-2xl",
          "bg-gray-900/40 backdrop-blur-xl border border-gray-700/50",
          "shadow-2xl shadow-black/50",
          "overflow-auto custom-scrollbar" // 内容超出时显示滚动条
        )}
        style={{
          maxWidth: '95vw',
          maxHeight: '75vh',
        }}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: 'easeOut' }}
      >
        {/* 背景光晕效果 */}
        <div className="absolute inset-0 rounded-xl sm:rounded-2xl bg-gradient-to-br from-purple-500/10 via-transparent to-cyan-500/10 pointer-events-none" />

        {/* 棋盘网格 - 使用统一的方形格子大小 */}
        <div
          className="relative grid justify-center"
          style={{
            gridTemplateColumns: `repeat(${cols}, ${cellSizePx}px)`,
            gridTemplateRows: `repeat(${rows}, ${cellSizePx}px)`,
            gap: `${gapPx}px`,
            width: 'fit-content',
            margin: '0 auto',
          }}
        >
          {board.map((row, rowIndex) =>
            row.map((cell, colIndex) => (
              <Cell
                key={`${rowIndex}-${colIndex}`}
                cell={cell}
                onOpen={() => onOpenCell(rowIndex, colIndex)}
                onFlag={() => onFlagCell(rowIndex, colIndex)}
                onChord={() => onChordCell(rowIndex, colIndex)}
                gameOver={gameOver}
                size={cellSizePx}
              />
            ))
          )}
        </div>
      </motion.div>

      {/* 操作提示 */}
      <p className="mt-2 text-xs text-gray-500 text-center">
        使用滚动条移动棋盘 • 点击格子进行游戏
      </p>
    </div>
  )
}
