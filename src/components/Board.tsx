import { useState, useEffect, useRef } from 'react'
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

const CELL_GAP = 4
const MIN_CELL_SIZE = 20
const MAX_CELL_SIZE = 36

// 计算格子大小，根据可用宽度自适应
function computeCellSize(columns: number, containerRef: React.RefObject<HTMLDivElement | null>): number {
  if (columns === 0) return MAX_CELL_SIZE

  // 获取容器可用宽度
  const container = containerRef.current
  if (!container) {
    // 如果容器还未渲染，使用窗口宽度作为估算
    const availableWidth = Math.min(window.innerWidth * 0.95 - 64, 960) // 减去 padding
    const totalGap = CELL_GAP * (columns - 1)
    const usableWidth = Math.max(availableWidth - totalGap, MIN_CELL_SIZE * columns)
    const size = Math.floor(usableWidth / columns)
    return Math.max(MIN_CELL_SIZE, Math.min(size, MAX_CELL_SIZE))
  }

  // 获取容器的实际可用宽度（减去 padding）
  const containerStyle = window.getComputedStyle(container)
  const paddingLeft = parseFloat(containerStyle.paddingLeft) || 0
  const paddingRight = parseFloat(containerStyle.paddingRight) || 0
  const availableWidth = container.clientWidth - paddingLeft - paddingRight

  // 计算格子大小
  const totalGap = CELL_GAP * (columns - 1)
  const usableWidth = Math.max(availableWidth - totalGap, MIN_CELL_SIZE * columns)
  const size = Math.floor(usableWidth / columns)
  
  // 限制在最小和最大范围内
  return Math.max(MIN_CELL_SIZE, Math.min(size, MAX_CELL_SIZE))
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
  const containerRef = useRef<HTMLDivElement>(null)
  const [cellSizePx, setCellSizePx] = useState(MAX_CELL_SIZE)

  // 初始化时计算格子大小
  useEffect(() => {
    const newSize = computeCellSize(cols, containerRef)
    setCellSizePx(newSize)
  }, [cols])

  // 监听窗口大小变化
  useEffect(() => {
    const updateCellSize = () => {
      const newSize = computeCellSize(cols, containerRef)
      setCellSizePx(newSize)
    }

    const handleResize = () => {
      updateCellSize()
    }

    window.addEventListener('resize', handleResize)
    // 使用 ResizeObserver 监听容器大小变化（更精确）
    const resizeObserver = new ResizeObserver(() => {
      updateCellSize()
    })

    if (containerRef.current) {
      resizeObserver.observe(containerRef.current)
    }

    return () => {
      window.removeEventListener('resize', handleResize)
      resizeObserver.disconnect()
    }
  }, [cols])

  return (
    <div className="relative">
      <motion.div
        ref={containerRef}
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

        {/* 棋盘网格 - 自适应大小 */}
        <div
          className="relative grid justify-center"
          style={{
            gridTemplateColumns: `repeat(${cols}, ${cellSizePx}px)`,
            gridTemplateRows: `repeat(${rows}, ${cellSizePx}px)`,
            gap: `${CELL_GAP}px`,
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
