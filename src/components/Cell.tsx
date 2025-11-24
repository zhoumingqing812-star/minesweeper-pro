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

export function Cell({ cell, onOpen, onFlag, onChord, gameOver, size = 36 }: CellProps) {
  const { isOpen, isFlagged, isMine, neighborCount } = cell
  const buttonRef = useRef<HTMLButtonElement>(null)

  const longPressTimer = useRef<number | null>(null)
  const isLongPress = useRef(false)
  const touchStartPos = useRef<{ x: number; y: number } | null>(null)
  const justFlaggedByLongPress = useRef(false) // 标记是否刚刚通过长按插旗
  const isLongPressing = useRef(false) // 标记是否正在长按中（已触发长按但未松手）

  const handleClick = () => {
    // 如果是长按触发的点击，忽略它
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

  // 处理右键和长按（移动端长按会触发 contextmenu）
  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault()
    // 如果刚刚通过长按插旗，忽略这个 contextmenu 事件（防止重复切换）
    if (justFlaggedByLongPress.current) {
      justFlaggedByLongPress.current = false
      return
    }
    if (gameOver || isOpen) return
    onFlag()
    soundEffects.playFlag()
  }

  const handleTouchStart = (e: React.TouchEvent) => {
    if (gameOver || isOpen) return

    // 如果正在长按中（已触发长按但未松手），不启动新的长按计时器
    if (isLongPressing.current) {
      return
    }

    isLongPress.current = false
    touchStartPos.current = {
      x: e.touches[0].clientX,
      y: e.touches[0].clientY
    }

    longPressTimer.current = window.setTimeout(() => {
      isLongPress.current = true
      isLongPressing.current = true // 标记正在长按中
      justFlaggedByLongPress.current = true // 标记刚刚通过长按插旗
      onFlag()
      soundEffects.playFlag()
      // 触发震动反馈
      if (navigator.vibrate) {
        navigator.vibrate(50)
      }
      // 延迟重置标志，防止后续的 contextmenu 事件触发
      setTimeout(() => {
        justFlaggedByLongPress.current = false
      }, 300) // 300ms 内忽略 contextmenu 事件
    }, 400) // 400ms 长按判定，更灵敏
  }

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!touchStartPos.current) return

    const moveX = e.touches[0].clientX
    const moveY = e.touches[0].clientY
    const diffX = Math.abs(moveX - touchStartPos.current.x)
    const diffY = Math.abs(moveY - touchStartPos.current.y)

    // 如果移动超过 20px，取消长按（增加容错）
    if (diffX > 20 || diffY > 20) {
      if (longPressTimer.current) {
        clearTimeout(longPressTimer.current)
        longPressTimer.current = null
      }
      // 如果已经触发了长按，也重置标志
      if (isLongPress.current) {
        isLongPress.current = false
        justFlaggedByLongPress.current = false
      }
      // 重置长按状态，允许重新开始长按
      isLongPressing.current = false
    }
  }

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current)
      longPressTimer.current = null
    }

    // 如果触发了长按，阻止默认事件（防止触发点击和 contextmenu）
    if (isLongPress.current) {
      e.preventDefault()
      e.stopPropagation()
      // 阻止后续可能触发的 contextmenu 事件
      const preventContextMenu = (ev: Event) => {
        ev.preventDefault()
        ev.stopPropagation()
        // 移除监听器，只阻止一次
        window.removeEventListener('contextmenu', preventContextMenu, true)
      }
      // 短暂监听 contextmenu 事件并阻止它
      window.addEventListener('contextmenu', preventContextMenu, true)
      setTimeout(() => {
        window.removeEventListener('contextmenu', preventContextMenu, true)
      }, 300)
    }

    // 松手时重置长按状态，允许下次长按操作
    isLongPressing.current = false
    isLongPress.current = false
    touchStartPos.current = null
  }

  const handleDoubleClick = () => {
    if (gameOver || !isOpen || neighborCount === 0) return
    onChord()
    soundEffects.playClick()
  }

  // 根据 size 计算字体大小
  const fontSize = size <= 30 ? 'text-xs' : size <= 36 ? 'text-sm' : 'text-base'
  const iconSize = size <= 30 ? 'w-4 h-4' : size <= 36 ? 'w-5 h-5' : 'w-6 h-6'
  const roundedSize = size <= 30 ? 'rounded-md' : size <= 36 ? 'rounded-lg' : 'rounded-xl'

  return (
    <motion.button
      ref={buttonRef}
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
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      onDoubleClick={handleDoubleClick}
      style={{
        width: `${size}px`,
        height: `${size}px`,
        minWidth: `${size}px`,
        minHeight: `${size}px`,
        touchAction: 'manipulation', // 优化触摸体验，允许滚动但禁用双击缩放
        WebkitTouchCallout: 'none', // 禁用 iOS 长按菜单（但保留 contextmenu 事件）
        WebkitUserSelect: 'none', // 禁用选择
        userSelect: 'none',
        WebkitTapHighlightColor: 'transparent', // 禁用点击高亮
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
