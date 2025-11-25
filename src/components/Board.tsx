import { useState, useRef, useEffect, useCallback } from 'react'
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
}

// 单元格大小配置
const MIN_CELL_SIZE = 20
const MAX_CELL_SIZE = 40
const CELL_GAP = 4

// 计算自适应单元格大小
const computeCellSize = (cols: number, availableWidth: number): number => {
  const totalGap = CELL_GAP * (cols - 1)
  const usableWidth = Math.max(availableWidth - totalGap - 48, MIN_CELL_SIZE * cols) // 48px for padding
  const size = Math.floor(usableWidth / cols)
  return Math.min(MAX_CELL_SIZE, Math.max(MIN_CELL_SIZE, size))
}

export function Board({
  board,
  status,
  onOpenCell,
  onFlagCell,
  onChordCell,
}: BoardProps) {
  const gameOver = status === 'won' || status === 'lost'
  const cols = board[0]?.length || 0
  const rows = board.length
  const boardRef = useRef<HTMLDivElement>(null)
  const [cellSize, setCellSize] = useState(MAX_CELL_SIZE)
  const [scrollState, setScrollState] = useState({
    maxScrollLeft: 0,
    maxScrollTop: 0,
    scrollLeft: 0,
    scrollTop: 0,
  })

  // 判断是否是大棋盘（需要滚动）
  const isLargeBoard = cols > 16 || rows > 16
  const shouldReduceMotion = rows * cols >= 256
  const SLIDER_PRECISION = 1000

  const updateScrollMetrics = useCallback(() => {
    const container = boardRef.current
    if (!container) return

    const maxScrollLeft = Math.max(0, container.scrollWidth - container.clientWidth)
    const maxScrollTop = Math.max(0, container.scrollHeight - container.clientHeight)

    setScrollState({
      maxScrollLeft,
      maxScrollTop,
      scrollLeft: container.scrollLeft,
      scrollTop: container.scrollTop,
    })
  }, [])

  const handleHorizontalSliderChange = (value: number) => {
    const container = boardRef.current
    if (!container || scrollState.maxScrollLeft === 0) return

    const target = (scrollState.maxScrollLeft * value) / SLIDER_PRECISION
    container.scrollTo({ left: target, behavior: 'smooth' })
    setScrollState(prev => ({ ...prev, scrollLeft: target }))
  }

  const handleVerticalSliderChange = (value: number) => {
    const container = boardRef.current
    if (!container || scrollState.maxScrollTop === 0) return

    const target = (scrollState.maxScrollTop * value) / SLIDER_PRECISION
    container.scrollTo({ top: target, behavior: 'smooth' })
    setScrollState(prev => ({ ...prev, scrollTop: target }))
  }

  // 计算自适应单元格大小
  useEffect(() => {
    const calculateCellSize = () => {
      const viewportWidth = window.innerWidth
      const maxBoardWidth = Math.min(viewportWidth * 0.9, 1200) // 最大宽度限制
      const newSize = computeCellSize(cols, maxBoardWidth)
      setCellSize(newSize)
    }

    calculateCellSize()
    window.addEventListener('resize', calculateCellSize)
    return () => window.removeEventListener('resize', calculateCellSize)
  }, [cols])

  // 同步滚动信息（用于滑动条）
  useEffect(() => {
    updateScrollMetrics()
  }, [rows, cols, cellSize, updateScrollMetrics])

  useEffect(() => {
    const container = boardRef.current
    if (!container) return

    const handleScroll = () => {
      setScrollState(prev => ({
        ...prev,
        scrollLeft: container.scrollLeft,
        scrollTop: container.scrollTop,
      }))
    }

    window.addEventListener('resize', updateScrollMetrics)
    container.addEventListener('scroll', handleScroll, { passive: true })

    return () => {
      window.removeEventListener('resize', updateScrollMetrics)
      container.removeEventListener('scroll', handleScroll)
    }
  }, [updateScrollMetrics])

  // 隐藏滑动条
  const showHorizontalSlider = false
  const showVerticalSlider = false

  return (
    <div className="relative">
      <motion.div
        ref={boardRef}
        className={cn(
          "relative p-3 sm:p-4 md:p-6 rounded-xl sm:rounded-2xl",
          "bg-gray-900/40 backdrop-blur-xl border border-gray-700/50",
          "shadow-2xl shadow-black/50",
          // 使用原生滚动
          isLargeBoard && "max-w-[90vw] max-h-[70vh] overflow-auto",
          !isLargeBoard && "max-w-full"
        )}
        style={{
          // 平滑滚动
          scrollBehavior: 'smooth',
          WebkitOverflowScrolling: 'touch', // iOS 平滑滚动
          touchAction: 'pan-x pan-y pinch-zoom', // 允许平移和双指缩放
          overscrollBehavior: 'contain',
        }}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: 'easeOut' }}
      >
        {/* 背景光晕效果 */}
        <div className="absolute inset-0 rounded-xl sm:rounded-2xl bg-gradient-to-br from-purple-500/10 via-transparent to-cyan-500/10 pointer-events-none" />

        {/* 棋盘网格 */}
        <div
          className="relative grid"
          style={{
            gridTemplateColumns: `repeat(${cols}, ${cellSize}px)`,
            gap: `${CELL_GAP}px`,
          }}
        >
          {board.map((row, rowIndex) =>
            row.map((cell, colIndex) => (
              <Cell
                key={`${rowIndex}-${colIndex}`}
                cell={cell}
                cellSize={cellSize}
                onOpen={() => onOpenCell(rowIndex, colIndex)}
                onFlag={() => onFlagCell(rowIndex, colIndex)}
                onChord={() => onChordCell(rowIndex, colIndex)}
                gameOver={gameOver}
                reduceMotion={shouldReduceMotion}
              />
            ))
          )}
        </div>

        {/* 纵向滑动条 */}
        {showVerticalSlider && (
          <div className="absolute top-1/2 -translate-y-1/2 right-1 flex flex-col items-center gap-1 bg-gray-900/50 rounded-full px-1 py-2 shadow-inner shadow-black/30">
            <span className="text-[10px] text-gray-200 tracking-widest">上下</span>
            <input
              type="range"
              min={0}
              max={SLIDER_PRECISION}
              value={
                scrollState.maxScrollTop === 0
                  ? 0
                  : (scrollState.scrollTop / scrollState.maxScrollTop) * SLIDER_PRECISION
              }
              onChange={(event) => handleVerticalSliderChange(Number(event.target.value))}
              className="scroll-slider scroll-slider--vertical"
            />
          </div>
        )}
      </motion.div>

      {/* 横向滑动条 */}
      {showHorizontalSlider && (
        <div className="mt-3 flex items-center gap-2 px-2">
          <span className="text-[11px] text-gray-200 tracking-widest">左右</span>
          <input
            type="range"
            min={0}
            max={SLIDER_PRECISION}
            value={
              scrollState.maxScrollLeft === 0
                ? 0
                : (scrollState.scrollLeft / scrollState.maxScrollLeft) * SLIDER_PRECISION
            }
            onChange={(event) => handleHorizontalSliderChange(Number(event.target.value))}
            className="scroll-slider flex-1"
          />
        </div>
      )}

      {/* 操作提示 */}
      {isLargeBoard && (
        <p className="mt-2 text-xs text-gray-300 text-center">
          Scroll to view the entire board • Long press to flag on mobile
        </p>
      )}
    </div>
  )
}
