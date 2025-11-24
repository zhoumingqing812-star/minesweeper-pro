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
  size?: number // 固定大小，确保所有模式格子一致
}

// 数字颜色映射 - 增强的霓虹色系
const NUMBER_COLORS: Record<number, string> = {
  1: 'text-blue-400 drop-shadow-[0_0_12px_rgba(96,165,250,1),0_2px_4px_rgba(0,0,0,0.5)]',
  2: 'text-green-400 drop-shadow-[0_0_12px_rgba(74,222,128,1),0_2px_4px_rgba(0,0,0,0.5)]',
  3: 'text-red-400 drop-shadow-[0_0_12px_rgba(248,113,113,1),0_2px_4px_rgba(0,0,0,0.5)]',
  4: 'text-purple-400 drop-shadow-[0_0_12px_rgba(192,132,252,1),0_2px_4px_rgba(0,0,0,0.5)]',
  5: 'text-orange-400 drop-shadow-[0_0_12px_rgba(251,146,60,1),0_2px_4px_rgba(0,0,0,0.5)]',
  6: 'text-cyan-400 drop-shadow-[0_0_12px_rgba(34,211,238,1),0_2px_4px_rgba(0,0,0,0.5)]',
  7: 'text-pink-400 drop-shadow-[0_0_12px_rgba(244,114,182,1),0_2px_4px_rgba(0,0,0,0.5)]',
  8: 'text-yellow-400 drop-shadow-[0_0_12px_rgba(250,204,21,1),0_2px_4px_rgba(0,0,0,0.5)]',
}

const LONG_PRESS_DURATION = 500

export function Cell({ cell, onOpen, onFlag, onChord, gameOver, size = 36 }: CellProps) {
  const { isOpen, isFlagged, isMine, neighborCount } = cell
  const longPressTimer = useRef<number | null>(null)
  const isLongPress = useRef(false)
  const touchStartPos = useRef<{ x: number; y: number } | null>(null)
  const hasTriggeredLongPress = useRef(false)

  const handleClick = (e?: React.MouseEvent) => {
    // 如果是触摸触发的点击，且已经触发了长按，则忽略
    if (isLongPress.current || hasTriggeredLongPress.current) {
      isLongPress.current = false
      hasTriggeredLongPress.current = false
      if (e) {
        e.preventDefault()
        e.stopPropagation()
      }
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
    
    // 阻止默认行为，防止滚动和选择文本
    e.preventDefault()
    e.stopPropagation()
    
    isLongPress.current = false
    hasTriggeredLongPress.current = false
    
    // 记录触摸起始位置
    const touch = e.touches[0]
    touchStartPos.current = { x: touch.clientX, y: touch.clientY }
    
    longPressTimer.current = window.setTimeout(() => {
      isLongPress.current = true
      hasTriggeredLongPress.current = true
      onFlag()
      soundEffects.playFlag()
      // 清除定时器
      if (longPressTimer.current) {
        clearTimeout(longPressTimer.current)
        longPressTimer.current = null
      }
    }, LONG_PRESS_DURATION)
  }

  const handleTouchEnd = (e: React.TouchEvent) => {
    // 阻止默认行为，防止触发点击事件
    if (hasTriggeredLongPress.current) {
      e.preventDefault()
      e.stopPropagation()
    }
    
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current)
      longPressTimer.current = null
    }
    
    // 如果不是长按，且没有移动太多，则触发点击
    if (!hasTriggeredLongPress.current && touchStartPos.current) {
      const touch = e.changedTouches[0]
      const moveDistance = Math.sqrt(
        Math.pow(touch.clientX - touchStartPos.current.x, 2) +
        Math.pow(touch.clientY - touchStartPos.current.y, 2)
      )
      // 如果移动距离小于 10px，认为是点击
      if (moveDistance < 10) {
        // 延迟触发点击，确保长按逻辑完成
        setTimeout(() => {
          if (!hasTriggeredLongPress.current) {
            handleClick()
          }
        }, 50)
      }
    }
    
    touchStartPos.current = null
    // 延迟重置标志，确保点击事件不会触发
    setTimeout(() => {
      hasTriggeredLongPress.current = false
    }, 100)
  }

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!touchStartPos.current) return
    
    const touch = e.touches[0]
    const moveDistance = Math.sqrt(
      Math.pow(touch.clientX - touchStartPos.current.x, 2) +
      Math.pow(touch.clientY - touchStartPos.current.y, 2)
    )
    
    // 如果移动距离超过 10px，取消长按
    if (moveDistance > 10) {
      if (longPressTimer.current) {
        clearTimeout(longPressTimer.current)
        longPressTimer.current = null
      }
      touchStartPos.current = null
    }
  }

  // 根据 size 计算字体大小
  const fontSize = size <= 30 ? 'text-xs' : size <= 36 ? 'text-sm' : 'text-base'
  const iconSize = size <= 30 ? 'w-4 h-4' : size <= 36 ? 'w-5 h-5' : 'w-6 h-6'
  const roundedSize = size <= 30 ? 'rounded-md' : size <= 36 ? 'rounded-lg' : 'rounded-xl'

  return (
    <motion.button
      data-cell
      className={cn(
        'relative rounded-md',
        fontSize,
        'font-bold',
        'flex items-center justify-center select-none',
        'transition-all duration-200',
        'focus:outline-none focus-visible:ring-2 focus-visible:ring-white/30',
        roundedSize,
        isOpen
          ? [
              // 已翻开 - 精致的凹陷效果
              'bg-gradient-to-br from-gray-800/95 via-gray-900/95 to-gray-800/95',
              'border-t border-l border-gray-700/60',
              'border-b border-r border-gray-950/80',
              'shadow-[inset_2px_2px_4px_rgba(0,0,0,0.5),inset_-1px_-1px_2px_rgba(255,255,255,0.1)]',
              isMine && [
                'bg-gradient-to-br from-red-950/90 via-red-900/90 to-red-950/90',
                'border-red-600/50',
                'shadow-[inset_2px_2px_4px_rgba(0,0,0,0.6),0_0_8px_rgba(239,68,68,0.4)]',
              ],
            ]
          : [
              // 未翻开 - 精美的3D凸起效果
              'bg-gradient-to-br from-gray-400 via-gray-500 to-gray-600',
              'border-t border-l border-gray-300/80',
              'border-b border-r border-gray-700/80',
              'shadow-[0_2px_4px_rgba(0,0,0,0.4),inset_-1px_-1px_2px_rgba(255,255,255,0.2)]',
              'hover:from-gray-300 hover:via-gray-400 hover:to-gray-500',
              'hover:border-t-gray-200/90 hover:border-l-gray-200/90',
              'hover:shadow-[0_3px_6px_rgba(0,0,0,0.5),inset_-1px_-1px_2px_rgba(255,255,255,0.3),0_0_12px_rgba(255,255,255,0.1)]',
              'active:shadow-[inset_2px_2px_4px_rgba(0,0,0,0.5),inset_-1px_-1px_2px_rgba(255,255,255,0.05)]',
              'active:border-t-gray-600/80 active:border-l-gray-600/80',
              'active:border-b-gray-300/60 active:border-r-gray-300/60',
            ]
      )}
      onClick={handleClick}
      onContextMenu={handleContextMenu}
      onDoubleClick={handleDoubleClick}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      onTouchMove={handleTouchMove}
      style={{
        width: `${size}px`,
        height: `${size}px`,
        minWidth: `${size}px`,
        minHeight: `${size}px`,
        touchAction: 'none', // 完全控制触摸行为，防止浏览器默认行为
      }}
      whileHover={!isOpen && !gameOver ? { scale: 1.02, y: -1 } : {}}
      whileTap={!isOpen && !gameOver ? { scale: 0.98, y: 0 } : {}}
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
          className="relative"
        >
          <Flag
            className={cn(iconSize, "text-red-500 drop-shadow-[0_0_10px_rgba(248,113,113,0.9),0_2px_4px_rgba(0,0,0,0.5)]")}
            fill="currentColor"
            strokeWidth={1.5}
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
          className="relative"
        >
          <Bomb className={cn(iconSize, "text-red-500 drop-shadow-[0_0_12px_rgba(239,68,68,0.9),0_2px_4px_rgba(0,0,0,0.5)]")} />
        </motion.div>
      )}

      {/* 数字 */}
      {isOpen && !isMine && neighborCount > 0 && (
        <motion.span
          className={cn('font-mono font-extrabold tracking-tight', NUMBER_COLORS[neighborCount])}
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
