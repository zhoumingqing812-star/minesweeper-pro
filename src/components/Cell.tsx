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
  const pointerStartTimeRef = useRef<number>(0)
  const pointerStartPosRef = useRef<{ x: number; y: number } | null>(null)
  const hasLongPressedRef = useRef(false)
  const buttonRef = useRef<HTMLButtonElement>(null)
  const isPointerDownRef = useRef(false)
  const isNativeTouchHandledRef = useRef(false)
  
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

  // 处理指针按下（支持鼠标和触摸）
  const handlePointerDown = (e: React.PointerEvent) => {
    // 只处理鼠标左键或触摸事件，过滤鼠标右键和中键
    if (e.pointerType === 'mouse' && e.button !== 0) return
    
    // 如果原生触摸事件已经处理，跳过（避免重复处理）
    if (e.pointerType === 'touch' && isNativeTouchHandledRef.current) {
      return
    }
    
    // 如果格子已打开或游戏结束，不处理
    if (gameOver || isOpen) return

    // 立即阻止默认行为，防止滚动和文本选择
    e.preventDefault()
    e.stopPropagation()

    // 记录开始时间和位置
    pointerStartTimeRef.current = Date.now()
    pointerStartPosRef.current = { x: e.clientX, y: e.clientY }
    hasLongPressedRef.current = false
    isPointerDownRef.current = true

    // 如果是触摸，设置按钮为捕获状态（必须在 preventDefault 之后）
    if (e.pointerType === 'touch' && buttonRef.current) {
      try {
        buttonRef.current.setPointerCapture(e.pointerId)
        // 标记原生触摸事件不应该处理（因为 pointer 事件已经处理了）
        isNativeTouchHandledRef.current = false
      } catch (err) {
        // 某些浏览器可能不支持，忽略错误
        console.debug('setPointerCapture failed:', err)
      }
    }

    // 启动长按定时器
    longPressTimerRef.current = window.setTimeout(() => {
      // 再次检查位置，确保手指没有移动太多
      if (pointerStartPosRef.current) {
        hasLongPressedRef.current = true
        onFlag()
        soundEffects.playFlag()
        clearLongPressTimer()
      }
    }, LONG_PRESS_DURATION)
  }

  // 处理指针移动
  const handlePointerMove = (e: React.PointerEvent) => {
    if (!pointerStartPosRef.current) return

    // 如果是触摸事件，阻止默认行为（防止滚动）
    if (e.pointerType === 'touch') {
      e.preventDefault()
    }

    const moveDistance = Math.sqrt(
      Math.pow(e.clientX - pointerStartPosRef.current.x, 2) +
      Math.pow(e.clientY - pointerStartPosRef.current.y, 2)
    )

    // 如果移动超过阈值，取消长按
    if (moveDistance > MOVE_THRESHOLD) {
      clearLongPressTimer()
      pointerStartPosRef.current = null
      pointerStartTimeRef.current = 0
    }
  }

  // 处理指针抬起
  const handlePointerUp = (e: React.PointerEvent) => {
    isPointerDownRef.current = false

    // 释放捕获
    if (e.pointerType === 'touch' && buttonRef.current) {
      try {
        buttonRef.current.releasePointerCapture(e.pointerId)
      } catch (err) {
        // 忽略错误
        console.debug('releasePointerCapture failed:', err)
      }
    }

    // 如果触发了长按，阻止所有后续事件
    if (hasLongPressedRef.current) {
      e.preventDefault()
      e.stopPropagation()
      // 延迟重置，防止触发点击
      setTimeout(() => {
        hasLongPressedRef.current = false
      }, 300)
      pointerStartPosRef.current = null
      pointerStartTimeRef.current = 0
      return
    }

    // 清除长按定时器
    clearLongPressTimer()

    // 检查是否是短按（快速触摸）
    const touchDuration = Date.now() - pointerStartTimeRef.current
    const startPos = pointerStartPosRef.current
    if (startPos) {
      const moveDistance = Math.sqrt(
        Math.pow(e.clientX - startPos.x, 2) +
        Math.pow(e.clientY - startPos.y, 2)
      )

      // 如果触摸时间短且移动距离小，触发点击
      if (touchDuration < LONG_PRESS_DURATION && moveDistance < MOVE_THRESHOLD && touchDuration > 0) {
        // 延迟触发，确保不会与长按冲突
        setTimeout(() => {
          if (!hasLongPressedRef.current && !gameOver && !isFlagged) {
            if (isOpen && neighborCount > 0) {
              onChord()
              soundEffects.playClick()
            } else if (!isOpen) {
              onOpen()
              soundEffects.playClick()
            }
          }
        }, 50)
      }
    }

    pointerStartPosRef.current = null
    pointerStartTimeRef.current = 0
  }

  // 处理指针取消（触摸被中断）
  const handlePointerCancel = (e: React.PointerEvent) => {
    isPointerDownRef.current = false
    clearLongPressTimer()
    pointerStartPosRef.current = null
    pointerStartTimeRef.current = 0
    hasLongPressedRef.current = false
    
    // 释放捕获
    if (e.pointerType === 'touch' && buttonRef.current) {
      try {
        buttonRef.current.releasePointerCapture(e.pointerId)
      } catch (err) {
        // 忽略错误
      }
    }
  }

  // 添加原生事件监听器作为后备（某些浏览器对 React 合成事件支持不够好）
  useEffect(() => {
    const button = buttonRef.current
    if (!button) return

    // 原生触摸事件处理（作为后备，在 pointer 事件不可用时使用）
    const handleTouchStart = (e: TouchEvent) => {
      // 如果已经通过 pointer 事件处理，则跳过
      if (isPointerDownRef.current) return
      
      const touch = e.touches[0]
      if (!touch) return

      const { gameOver, isOpen } = callbacksRef.current
      if (gameOver || isOpen) return

      e.preventDefault()
      e.stopPropagation()

      isNativeTouchHandledRef.current = true
      pointerStartTimeRef.current = Date.now()
      pointerStartPosRef.current = { x: touch.clientX, y: touch.clientY }
      hasLongPressedRef.current = false

      longPressTimerRef.current = window.setTimeout(() => {
        if (pointerStartPosRef.current) {
          hasLongPressedRef.current = true
          callbacksRef.current.onFlag()
          soundEffects.playFlag()
          clearLongPressTimer()
        }
      }, LONG_PRESS_DURATION)
    }

    const handleTouchMove = (e: TouchEvent) => {
      if (!pointerStartPosRef.current) return

      const touch = e.touches[0]
      if (!touch) return

      e.preventDefault()

      const moveDistance = Math.sqrt(
        Math.pow(touch.clientX - pointerStartPosRef.current.x, 2) +
        Math.pow(touch.clientY - pointerStartPosRef.current.y, 2)
      )

      if (moveDistance > MOVE_THRESHOLD) {
        clearLongPressTimer()
        pointerStartPosRef.current = null
        pointerStartTimeRef.current = 0
      }
    }

    const handleTouchEnd = (e: TouchEvent) => {
      // 如果不是原生触摸处理的，跳过
      if (!isNativeTouchHandledRef.current) return
      
      isNativeTouchHandledRef.current = false

      if (hasLongPressedRef.current) {
        e.preventDefault()
        e.stopPropagation()
        setTimeout(() => {
          hasLongPressedRef.current = false
        }, 300)
        pointerStartPosRef.current = null
        pointerStartTimeRef.current = 0
        return
      }

      clearLongPressTimer()

      const touchDuration = Date.now() - pointerStartTimeRef.current
      const startPos = pointerStartPosRef.current
      if (startPos && e.changedTouches[0]) {
        const touch = e.changedTouches[0]
        const moveDistance = Math.sqrt(
          Math.pow(touch.clientX - startPos.x, 2) +
          Math.pow(touch.clientY - startPos.y, 2)
        )

        const { gameOver, isFlagged, isOpen, neighborCount } = callbacksRef.current
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

      pointerStartPosRef.current = null
      pointerStartTimeRef.current = 0
    }

    const handleTouchCancel = () => {
      if (!isNativeTouchHandledRef.current) return
      
      isNativeTouchHandledRef.current = false
      clearLongPressTimer()
      pointerStartPosRef.current = null
      pointerStartTimeRef.current = 0
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
  }, []) // 不依赖任何 props，使用 ref 存储最新值

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
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerCancel}
      onClick={handleClick}
      onContextMenu={handleContextMenu}
      onDoubleClick={handleDoubleClick}
      style={{
        width: `${size}px`,
        height: `${size}px`,
        minWidth: `${size}px`,
        minHeight: `${size}px`,
        touchAction: 'none', // 完全控制触摸行为，防止浏览器默认行为
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
