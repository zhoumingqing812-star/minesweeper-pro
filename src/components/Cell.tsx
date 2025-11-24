import { useRef, useEffect } from 'react'
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

const LONG_PRESS_DURATION = 500 // 500ms 长按时间
const MOVE_THRESHOLD = 25 // 增加移动阈值到25px，防止手指轻微移动取消长按

export function Cell({ cell, onOpen, onFlag, onChord, gameOver, size = 36 }: CellProps) {
  const { isOpen, isFlagged, isMine, neighborCount } = cell
  const longPressTimerRef = useRef<number | null>(null)
  const touchStartTimeRef = useRef<number>(0)
  const touchStartPosRef = useRef<{ x: number; y: number } | null>(null)
  const hasLongPressedRef = useRef(false)
  const buttonRef = useRef<HTMLButtonElement>(null)
  const isTouchActiveRef = useRef(false)
  
  // 使用 ref 存储回调，避免在 useEffect 中依赖它们
  const callbacksRef = useRef({ onOpen, onFlag, onChord, gameOver, isOpen, isFlagged, neighborCount })
  useEffect(() => {
    callbacksRef.current = { onOpen, onFlag, onChord, gameOver, isOpen, isFlagged, neighborCount }
  }, [onOpen, onFlag, onChord, gameOver, isOpen, isFlagged, neighborCount])

  // 清除长按定时器
  const clearLongPressTimer = () => {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current)
      longPressTimerRef.current = null
    }
  }

  // 处理鼠标按下（仅用于桌面端）
  const handleMouseDown = (e: React.MouseEvent) => {
    if (gameOver || isOpen) return
    
    // 鼠标右键直接插旗
    if (e.button === 2) {
      e.preventDefault()
      onFlag()
      soundEffects.playFlag()
      return
    }
  }

  // 处理指针事件（作为触摸的后备，主要用于鼠标）
  const handlePointerDown = (e: React.PointerEvent) => {
    // 触摸事件由原生事件处理，这里只处理鼠标
    if (e.pointerType === 'touch') return
    if (e.button !== 0) return
    if (gameOver || isOpen) return
  }

  // 使用原生触摸事件处理（更可靠）
  useEffect(() => {
    const button = buttonRef.current
    if (!button) return

    const handleTouchStart = (e: TouchEvent) => {
      const touch = e.touches[0]
      if (!touch) return

      const { gameOver, isOpen } = callbacksRef.current
      if (gameOver || isOpen) return

      // 阻止默认行为，防止滚动
      e.preventDefault()
      e.stopPropagation()

      // 记录开始状态
      isTouchActiveRef.current = true
      touchStartTimeRef.current = Date.now()
      touchStartPosRef.current = { x: touch.clientX, y: touch.clientY }
      hasLongPressedRef.current = false

      // 启动长按定时器
      longPressTimerRef.current = window.setTimeout(() => {
        // 检查是否仍在触摸且未移动太多
        if (isTouchActiveRef.current && touchStartPosRef.current) {
          hasLongPressedRef.current = true
          callbacksRef.current.onFlag()
          soundEffects.playFlag()
          clearLongPressTimer()
        }
      }, LONG_PRESS_DURATION)
    }

    const handleTouchMove = (e: TouchEvent) => {
      if (!isTouchActiveRef.current || !touchStartPosRef.current) return

      const touch = e.touches[0]
      if (!touch) return

      const moveDistance = Math.sqrt(
        Math.pow(touch.clientX - touchStartPosRef.current.x, 2) +
        Math.pow(touch.clientY - touchStartPosRef.current.y, 2)
      )

      // 如果移动距离小（仍在按钮上），阻止滚动以支持长按
      // 如果移动距离大（可能是在滚动），允许滚动
      if (moveDistance < MOVE_THRESHOLD) {
        e.preventDefault()
      }

      // 如果移动超过阈值，取消长按
      if (moveDistance > MOVE_THRESHOLD) {
        clearLongPressTimer()
        touchStartPosRef.current = null
        touchStartTimeRef.current = 0
        isTouchActiveRef.current = false
      }
    }

    const handleTouchEnd = (e: TouchEvent) => {
      if (!isTouchActiveRef.current) return
      
      isTouchActiveRef.current = false

      // 如果已经触发了长按，阻止后续点击
      if (hasLongPressedRef.current) {
        e.preventDefault()
        e.stopPropagation()
        setTimeout(() => {
          hasLongPressedRef.current = false
        }, 300)
        touchStartPosRef.current = null
        touchStartTimeRef.current = 0
        return
      }

      clearLongPressTimer()

      // 处理短按
      const touchDuration = Date.now() - touchStartTimeRef.current
      const startPos = touchStartPosRef.current
      
      if (startPos && e.changedTouches[0]) {
        const touch = e.changedTouches[0]
        const moveDistance = Math.sqrt(
          Math.pow(touch.clientX - startPos.x, 2) +
          Math.pow(touch.clientY - startPos.y, 2)
        )

        const { gameOver, isFlagged, isOpen, neighborCount } = callbacksRef.current
        
        // 短按：时间短、移动小
        if (touchDuration < LONG_PRESS_DURATION && moveDistance < MOVE_THRESHOLD && touchDuration > 0) {
          setTimeout(() => {
            if (!hasLongPressedRef.current && !gameOver && !isFlagged) {
              if (isOpen && neighborCount > 0) {
                callbacksRef.current.onChord()
                soundEffects.playClick()
              } else if (!isOpen) {
                callbacksRef.current.onOpen()
                soundEffects.playClick()
              }
            }
          }, 50)
        }
      }

      touchStartPosRef.current = null
      touchStartTimeRef.current = 0
    }

    const handleTouchCancel = () => {
      isTouchActiveRef.current = false
      clearLongPressTimer()
      touchStartPosRef.current = null
      touchStartTimeRef.current = 0
      hasLongPressedRef.current = false
    }

    // 使用 passive: false 以便可以 preventDefault
    button.addEventListener('touchstart', handleTouchStart, { passive: false, capture: true })
    button.addEventListener('touchmove', handleTouchMove, { passive: false, capture: true })
    button.addEventListener('touchend', handleTouchEnd, { passive: false, capture: true })
    button.addEventListener('touchcancel', handleTouchCancel, { passive: false, capture: true })

    return () => {
      clearLongPressTimer()
      button.removeEventListener('touchstart', handleTouchStart, { capture: true } as EventListenerOptions)
      button.removeEventListener('touchmove', handleTouchMove, { capture: true } as EventListenerOptions)
      button.removeEventListener('touchend', handleTouchEnd, { capture: true } as EventListenerOptions)
      button.removeEventListener('touchcancel', handleTouchCancel, { capture: true } as EventListenerOptions)
    }
  }, [])

  const handleClick = (e: React.MouseEvent) => {
    // 如果是触摸触发的点击，且已经触发了长按，则忽略
    if (hasLongPressedRef.current) {
      e.preventDefault()
      e.stopPropagation()
      return
    }
    // 触摸事件由 pointer 事件处理，这里只处理鼠标点击
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
      onPointerDown={handlePointerDown}
      onMouseDown={handleMouseDown}
      onClick={handleClick}
      onContextMenu={handleContextMenu}
      onDoubleClick={handleDoubleClick}
      style={{
        width: `${size}px`,
        height: `${size}px`,
        minWidth: `${size}px`,
        minHeight: `${size}px`,
        touchAction: 'manipulation', // 允许滚动，但禁用双击缩放
        WebkitTouchCallout: 'none', // 禁用 iOS 长按菜单
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
