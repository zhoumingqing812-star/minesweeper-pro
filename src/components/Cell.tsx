import { useRef } from 'react'
import { motion } from 'framer-motion'
import { Bomb, Flag } from 'lucide-react'
import { cn } from '../lib/utils'
import { soundEffects } from '../lib/sounds'
import type { Cell as CellType } from '../hooks/useMinesweeper'

interface CellProps {
  cell: CellType
  onOpen: () => void
  onFlag: () => void
  onChord: () => void
  gameOver: boolean
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

const LONG_PRESS_DURATION = 500

export function Cell({ cell, onOpen, onFlag, onChord, gameOver }: CellProps) {
  const { isOpen, isFlagged, isMine, neighborCount } = cell
  const longPressTimer = useRef<number | null>(null)
  const isLongPress = useRef(false)

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
  const handleTouchStart = () => {
    if (gameOver || isOpen) return
    isLongPress.current = false
    longPressTimer.current = window.setTimeout(() => {
      isLongPress.current = true
      onFlag()
      soundEffects.playFlag()
    }, LONG_PRESS_DURATION)
  }

  const handleTouchEnd = () => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current)
      longPressTimer.current = null
    }
  }

  const handleTouchMove = () => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current)
      longPressTimer.current = null
    }
  }

  return (
    <motion.button
      className={cn(
        'relative w-7 h-7 xs:w-8 xs:h-8 sm:w-10 sm:h-10 rounded-md sm:rounded-lg',
        'text-xs xs:text-sm sm:text-base font-bold',
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
      onClick={handleClick}
      onContextMenu={handleContextMenu}
      onDoubleClick={handleDoubleClick}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      onTouchMove={handleTouchMove}
      whileHover={!isOpen && !gameOver ? { scale: 1.05 } : {}}
      whileTap={!isOpen && !gameOver ? { scale: 0.95 } : {}}
      disabled={gameOver && !isOpen}
    >
      {/* 旗帜 */}
      {!isOpen && isFlagged && (
        <motion.div
          initial={{ scale: 0, y: -20 }}
          animate={{
            scale: [0, 1.3, 1],
            y: [-20, 2, 0],
          }}
          exit={{ scale: 0, y: -10 }}
          transition={{
            duration: 0.4,
            ease: [0.34, 1.56, 0.64, 1],
          }}
        >
          <Flag
            className="w-3.5 h-3.5 xs:w-4 xs:h-4 sm:w-5 sm:h-5 text-red-400 drop-shadow-[0_0_8px_rgba(248,113,113,0.8)]"
            fill="currentColor"
          />
        </motion.div>
      )}

      {/* 地雷 */}
      {isOpen && isMine && (
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1, rotate: [0, -10, 10, -10, 10, 0] }}
          transition={{
            scale: { type: 'spring', stiffness: 500, damping: 25 },
            rotate: { duration: 0.5, delay: 0.1 },
          }}
        >
          <Bomb className="w-3.5 h-3.5 xs:w-4 xs:h-4 sm:w-5 sm:h-5 text-red-500 drop-shadow-[0_0_10px_rgba(239,68,68,0.8)]" />
        </motion.div>
      )}

      {/* 数字 */}
      {isOpen && !isMine && neighborCount > 0 && (
        <motion.span
          className={cn('font-mono', NUMBER_COLORS[neighborCount])}
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: 'spring', stiffness: 500, damping: 25 }}
        >
          {neighborCount}
        </motion.span>
      )}
    </motion.button>
  )
}
