import { useState, useRef, useEffect } from 'react'
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

  // 拖动状态
  const [position, setPosition] = useState({ x: 0, y: 0 })
  const [isDragging, setIsDragging] = useState(false)
  const dragStart = useRef({ x: 0, y: 0 })
  const positionStart = useRef({ x: 0, y: 0 })
  const hasMoved = useRef(false)

  // 判断是否是大棋盘（需要拖动）
  const isLargeBoard = cols > 16 || rows > 16

  // 当棋盘大小改变时重置位置
  useEffect(() => {
    setPosition({ x: 0, y: 0 })
  }, [cols, rows])

  // 鼠标拖动 - 只在背景上启动拖动
  const handleMouseDown = (e: React.MouseEvent) => {
    if (!isLargeBoard || e.button !== 0) return

    // 检查是否点击在格子上
    const target = e.target as HTMLElement
    if (target.closest('button')) return

    dragStart.current = { x: e.clientX, y: e.clientY }
    positionStart.current = { ...position }
    hasMoved.current = false

    // 添加文档级别的监听
    document.addEventListener('mousemove', handleDocumentMouseMove)
    document.addEventListener('mouseup', handleDocumentMouseUp)

    e.preventDefault()
  }

  const handleDocumentMouseMove = (e: MouseEvent) => {
    const dx = e.clientX - dragStart.current.x
    const dy = e.clientY - dragStart.current.y

    // 只有移动距离超过阈值才认为是拖动
    if (!hasMoved.current && (Math.abs(dx) > 5 || Math.abs(dy) > 5)) {
      hasMoved.current = true
      setIsDragging(true)
    }

    if (hasMoved.current) {
      setPosition({
        x: positionStart.current.x + dx,
        y: positionStart.current.y + dy,
      })
    }
  }

  const handleDocumentMouseUp = () => {
    document.removeEventListener('mousemove', handleDocumentMouseMove)
    document.removeEventListener('mouseup', handleDocumentMouseUp)
    setIsDragging(false)
    hasMoved.current = false
  }

  // 触摸拖动
  const touchStart = useRef({ x: 0, y: 0 })
  const touchHasMoved = useRef(false)

  const handleTouchStart = (e: React.TouchEvent) => {
    if (!isLargeBoard || e.touches.length !== 1) return

    // 检查是否触摸在格子上
    const target = e.target as HTMLElement
    if (target.closest('button')) return

    const touch = e.touches[0]
    touchStart.current = { x: touch.clientX, y: touch.clientY }
    positionStart.current = { ...position }
    touchHasMoved.current = false
  }

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isLargeBoard || e.touches.length !== 1) return

    const touch = e.touches[0]
    const dx = touch.clientX - touchStart.current.x
    const dy = touch.clientY - touchStart.current.y

    // 移动距离超过阈值才认为是拖动
    if (!touchHasMoved.current && (Math.abs(dx) > 10 || Math.abs(dy) > 10)) {
      touchHasMoved.current = true
      setIsDragging(true)
    }

    if (touchHasMoved.current) {
      e.preventDefault()
      setPosition({
        x: positionStart.current.x + dx,
        y: positionStart.current.y + dy,
      })
    }
  }

  const handleTouchEnd = () => {
    setTimeout(() => {
      setIsDragging(false)
      touchHasMoved.current = false
    }, 50)
  }

  return (
    <div className="relative">
      <motion.div
        className={cn(
          "relative p-4 sm:p-5 md:p-6 lg:p-8 rounded-xl sm:rounded-2xl",
          "bg-gray-900/40 backdrop-blur-xl border border-gray-700/50",
          "shadow-2xl shadow-black/50",
          isLargeBoard ? "overflow-hidden" : "max-w-full overflow-auto w-full"
        )}
        style={{
          maxWidth: isLargeBoard ? '95vw' : '100%',
          maxHeight: isLargeBoard ? '75vh' : undefined,
          width: isLargeBoard ? undefined : '100%',
          cursor: isDragging ? 'grabbing' : (isLargeBoard ? 'grab' : 'default'),
        }}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: 'easeOut' }}
        onMouseDown={handleMouseDown}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        {/* 背景光晕效果 */}
        <div className="absolute inset-0 rounded-xl sm:rounded-2xl bg-gradient-to-br from-purple-500/10 via-transparent to-cyan-500/10 pointer-events-none" />

        {/* 棋盘网格 */}
        <div
          className="relative grid gap-1.5 xs:gap-2 sm:gap-2.5 md:gap-3"
          style={{
            gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))`,
            transform: isLargeBoard ? `translate(${position.x}px, ${position.y}px)` : undefined,
            transition: isDragging ? 'none' : 'transform 0.2s ease-out',
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
              />
            ))
          )}
        </div>
      </motion.div>

      {/* 操作提示 */}
      {isLargeBoard && (
        <p className="mt-2 text-xs text-gray-500 text-center">
          Drag the background to move • Click cells to play
        </p>
      )}
    </div>
  )
}
