import { useRef, useMemo, memo } from 'react'
import { motion } from 'framer-motion'
import { Bomb, Flag } from 'lucide-react'
import { cn } from '../lib/utils'
import { soundEffects } from '../lib/sounds'
import type { Cell as CellType } from '../hooks/useMinesweeper'

interface CellProps {
  cell: CellType
  cellSize: number
  onOpen: () => void
  onFlag: () => void
  onChord: () => void
  gameOver: boolean
  reduceMotion: boolean
}

// 数字颜色映射 - 霓虹色系
const NUMBER_COLORS: Record<number, string> = {
  1: 'text-blue-400 drop-shadow-[0_0_8px_rgba(96,165,250,0.8)]',
  2: 'text-green-400 drop-shadow-[0_0_8px_rgba(74,222,128,0.8)]',
  3: 'text-red-400 drop-shadow-[0_0_8px_rgba(248,113,113,0.8)]',
  4: 'text-purple-400 drop-shadow-[0_0_8px_rgba(192,132,252,0.8)]',
  5: 'text-orange-400 drop-shadow-[0_0_8px_rgba(251,146,60,0.8)]',
  6: 'text-cyan-400 drop-shadow-[0_0_8px_rgba(34,211,238,0.8)]',
  7: 'text-pink-400 drop-shadow-[0_0_8px_rgba(244,114,182,0.8)]',
  8: 'text-yellow-400 drop-shadow-[0_0_8px_rgba(250,204,21,0.8)]',
}

const LONG_PRESS_DURATION = 400 // 减少长按时间以提高响应性
const LONG_PRESS_RESET_DELAY = 150

function CellComponent({ cell, cellSize, onOpen, onFlag, onChord, gameOver, reduceMotion }: CellProps) {
  const { isOpen, isFlagged, isMine, neighborCount } = cell
  const longPressTimer = useRef<number | null>(null)
  const isLongPress = useRef(false)
  const touchMoved = useRef(false)
  // 长按插旗保护：标记是否刚完成长按插旗，需要松手后才能再次长按取消
  const longPressGuard = useRef(false)
  const activeTouchId = useRef<number | null>(null)
  const touchStartPoint = useRef<{ x: number; y: number } | null>(null)
  const guardResetTimer = useRef<number | null>(null)

  // 根据cellSize动态调整字体和图标大小
  const fontSize = Math.max(12, Math.min(16, cellSize * 0.4))
  const iconSize = Math.max(14, Math.min(20, cellSize * 0.5))

  // 缓存 style 对象，避免每次渲染创建新对象
  const cellStyle = useMemo(
    () => ({
      width: `${cellSize}px`,
      height: `${cellSize}px`,
      fontSize: `${fontSize}px`,
      borderRadius: cellSize > 30 ? '8px' : '6px',
    }),
    [cellSize, fontSize]
  )

  const clearLongPressTimer = () => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current)
      longPressTimer.current = null
    }
  }

  const resetGuardWithDelay = () => {
    if (guardResetTimer.current) {
      clearTimeout(guardResetTimer.current)
    }

    guardResetTimer.current = window.setTimeout(() => {
      longPressGuard.current = false
      guardResetTimer.current = null
    }, LONG_PRESS_RESET_DELAY)
  }

  const handleClick = () => {
    if (isLongPress.current) {
      isLongPress.current = false
      return
    }
    if (gameOver || isFlagged) return
    if (isOpen && neighborCount > 0) {
      onChord()
      soundEffects.playClick()
    } else if (!isOpen) {
      onOpen()
      soundEffects.playClick()
    }
  }

  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault()
    if (gameOver || isOpen) return
    onFlag()
    soundEffects.playFlag()
  }

  const handleDoubleClick = () => {
    if (gameOver || !isOpen || neighborCount === 0) return
    onChord()
    soundEffects.playClick()
  }

  // 长按支持（移动端插旗）
  const handleTouchStart = (e: React.TouchEvent) => {
    if (gameOver || isOpen) return

    // 长按保护：如果刚完成长按插旗，阻止立即开始新的长按
    if (longPressGuard.current) {
      return
    }

    const touch = e.touches[0]
    if (!touch) return

    activeTouchId.current = touch.identifier
    touchStartPoint.current = { x: touch.clientX, y: touch.clientY }
    isLongPress.current = false
    touchMoved.current = false

    longPressTimer.current = window.setTimeout(() => {
      if (!touchMoved.current && !longPressGuard.current) {
        isLongPress.current = true
        onFlag()
        soundEffects.playFlag()
        if (navigator.vibrate) {
          navigator.vibrate(50)
        }
        longPressGuard.current = true
        clearLongPressTimer()
      }
    }, LONG_PRESS_DURATION)
  }

  const handleTouchEnd = (e: React.TouchEvent) => {
    const isTrackedTouch = Array.from(e.changedTouches).some(
      touch => touch.identifier === activeTouchId.current
    )

    if (!isTrackedTouch) {
      return
    }

    clearLongPressTimer()

    // 防止长按后触发点击
    if (isLongPress.current) {
      e.preventDefault()
    }

    touchMoved.current = false
    isLongPress.current = false
    activeTouchId.current = null
    touchStartPoint.current = null

    // 松手后延迟重置长按保护，确保一个触摸事件只触发一次插旗
    resetGuardWithDelay()
  }

  const handleTouchMove = (e: React.TouchEvent) => {
    if (activeTouchId.current === null || !touchStartPoint.current) {
      return
    }

    const trackedTouch = Array.from(e.touches).find(
      touch => touch.identifier === activeTouchId.current
    )
    if (!trackedTouch) {
      return
    }

    // 移动超过20px认为是滚动而非长按
    const dx = Math.abs(trackedTouch.clientX - touchStartPoint.current.x)
    const dy = Math.abs(trackedTouch.clientY - touchStartPoint.current.y)

    if (dx > 20 || dy > 20) {
      touchMoved.current = true
      clearLongPressTimer()
    }
  }

  return (
    <motion.button
      className={cn(
        'relative rounded-md font-bold',
        'flex items-center justify-center select-none',
        'transition-all duration-200',
        'focus:outline-none focus-visible:ring-2 focus-visible:ring-white/30',
        'touch-manipulation',
        isOpen
          ? [
              // 已翻开 - 更深更暗的背景，明显区分
              'bg-gray-900/90 border border-gray-800/80',
              'shadow-inner shadow-black/50',
              isMine && 'bg-red-950/80 border-red-500/50',
            ]
          : [
              // 未翻开 - 更亮的凸起效果
              'bg-gradient-to-br from-gray-500/90 to-gray-700/90',
              'backdrop-blur-md border border-gray-400/50',
              'shadow-lg shadow-black/30',
              'hover:from-gray-400/90 hover:to-gray-600/90',
              'hover:border-gray-300/60 hover:shadow-[0_0_15px_rgba(255,255,255,0.15)]',
              'active:scale-95',
            ]
      )}
      style={cellStyle}
      onClick={handleClick}
      onContextMenu={handleContextMenu}
      onDoubleClick={handleDoubleClick}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      onTouchMove={handleTouchMove}
      onTouchCancel={handleTouchEnd}
      whileHover={!reduceMotion && !isOpen && !gameOver ? { scale: 1.05 } : undefined}
      whileTap={!reduceMotion && !isOpen && !gameOver ? { scale: 0.95 } : undefined}
      disabled={gameOver && !isOpen}
    >
      {/* 旗帜 */}
      {!isOpen && isFlagged && (
        <motion.div
          initial={
            reduceMotion
              ? false
              : { scale: 0, y: -20 }
          }
          animate={
            reduceMotion
              ? { scale: 1, y: 0 }
              : {
                  scale: [0, 1.3, 1],
                  y: [-20, 2, 0],
                }
          }
          exit={reduceMotion ? { scale: 0, opacity: 0 } : { scale: 0, y: -10 }}
          transition={
            reduceMotion
              ? { duration: 0.15 }
              : { duration: 0.4, ease: [0.34, 1.56, 0.64, 1] }
          }
        >
          <Flag
            style={{ width: iconSize, height: iconSize }}
            className="text-red-400 drop-shadow-[0_0_8px_rgba(248,113,113,0.8)]"
            fill="currentColor"
          />
        </motion.div>
      )}

      {/* 地雷 */}
      {isOpen && isMine && (
        <motion.div
          initial={reduceMotion ? false : { scale: 0 }}
          animate={
            reduceMotion
              ? { scale: 1 }
              : { scale: 1, rotate: [0, -10, 10, -10, 10, 0] }
          }
          transition={
            reduceMotion
              ? { duration: 0.2 }
              : {
                  scale: { type: 'spring', stiffness: 500, damping: 25 },
                  rotate: { duration: 0.5, delay: 0.1 },
                }
          }
        >
          <Bomb
            style={{ width: iconSize, height: iconSize }}
            className="text-red-500 drop-shadow-[0_0_10px_rgba(239,68,68,0.8)]"
          />
        </motion.div>
      )}

      {/* 数字 */}
      {isOpen && !isMine && neighborCount > 0 && (
        <motion.span
          className={cn('font-mono', NUMBER_COLORS[neighborCount])}
          initial={reduceMotion ? { opacity: 0 } : { scale: 0, opacity: 0 }}
          animate={reduceMotion ? { opacity: 1 } : { scale: 1, opacity: 1 }}
          transition={
            reduceMotion
              ? { duration: 0.2 }
              : { type: 'spring', stiffness: 500, damping: 25 }
          }
        >
          {neighborCount}
        </motion.span>
      )}
    </motion.button>
  )
}

// 使用 memo 优化性能，只在关键属性变化时重渲染
export const Cell = memo(CellComponent, (prevProps, nextProps) => {
  // 自定义比较函数：只有这些属性变化时才重渲染
  return (
    prevProps.cell.isOpen === nextProps.cell.isOpen &&
    prevProps.cell.isFlagged === nextProps.cell.isFlagged &&
    prevProps.cell.isMine === nextProps.cell.isMine &&
    prevProps.cell.neighborCount === nextProps.cell.neighborCount &&
    prevProps.cellSize === nextProps.cellSize &&
    prevProps.gameOver === nextProps.gameOver
    // 注意：onOpen, onFlag, onChord 回调函数变化不触发重渲染（假设是稳定的）
  )
})

Cell.displayName = 'Cell'
