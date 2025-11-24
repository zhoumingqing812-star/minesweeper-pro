import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { RotateCcw, Bomb, Timer, Trophy, Skull, Volume2, VolumeX } from 'lucide-react'
import confetti from 'canvas-confetti'
import { useMinesweeper, DEFAULT_CONFIG, type GameConfig } from './hooks/useMinesweeper'
import { Board } from './components/Board'
import { cn } from './lib/utils'
import { soundEffects } from './lib/sounds'

const MIN_ROWS = 5
const MAX_ROWS = 30
const MIN_COLS = 5
const MAX_COLS = 40

const clampNumber = (value: number, min: number, max: number) => {
  if (Number.isNaN(value)) return min
  return Math.min(max, Math.max(min, value))
}

const clampMines = (value: number, rows: number, cols: number) => {
  const maxMines = Math.max(1, rows * cols - 1)
  return clampNumber(value, 1, maxMines)
}

// 根据棋盘大小推荐地雷数（参考经典扫雷的分段密度）
const getRecommendedMines = (rows: number, cols: number) => {
  const total = rows * cols
  const density = total <= 100 ? 0.15 : total <= 300 ? 0.17 : 0.20
  return clampMines(Math.round(total * density), rows, cols)
}

function App() {
  const [config, setConfig] = useState<GameConfig>(DEFAULT_CONFIG)
  const [rowsInput, setRowsInput] = useState(String(DEFAULT_CONFIG.rows))
  const [colsInput, setColsInput] = useState(String(DEFAULT_CONFIG.cols))
  const [minesInput, setMinesInput] = useState(String(DEFAULT_CONFIG.mines))
  const [time, setTime] = useState(0)
  const [soundEnabled, setSoundEnabled] = useState(true)
  const timerRef = useRef<number | null>(null)
  const confettiTriggered = useRef(false)
  const prevStatus = useRef<string>('idle')

  const {
    board,
    status,
    remainingMines,
    openCell,
    toggleFlag,
    chordOpen,
    reset,
  } = useMinesweeper(config)

  const rowsValue = clampNumber(rowsInput === '' ? DEFAULT_CONFIG.rows : Number(rowsInput), MIN_ROWS, MAX_ROWS)
  const colsValue = clampNumber(colsInput === '' ? DEFAULT_CONFIG.cols : Number(colsInput), MIN_COLS, MAX_COLS)
  const recommendedMines = getRecommendedMines(rowsValue, colsValue)
  const minesValue = clampMines(minesInput === '' ? recommendedMines : Number(minesInput), rowsValue, colsValue)

  // 计时器逻辑
  useEffect(() => {
    if (status === 'playing') {
      timerRef.current = window.setInterval(() => {
        setTime(t => Math.min(t + 1, 999))
      }, 1000)
    } else {
      if (timerRef.current) {
        clearInterval(timerRef.current)
        timerRef.current = null
      }
    }

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current)
      }
    }
  }, [status])

  // 游戏结束音效和彩带
  useEffect(() => {
    if (status === 'won' && prevStatus.current !== 'won') {
      soundEffects.playVictory()

      if (!confettiTriggered.current) {
        confettiTriggered.current = true

        const duration = 3000
        const animationEnd = Date.now() + duration
        const defaults = { startVelocity: 30, spread: 360, ticks: 60, zIndex: 100 }

        const randomInRange = (min: number, max: number) =>
          Math.random() * (max - min) + min

        const interval = window.setInterval(() => {
          const timeLeft = animationEnd - Date.now()

          if (timeLeft <= 0) {
            clearInterval(interval)
            return
          }

          const particleCount = 50 * (timeLeft / duration)

          confetti({
            ...defaults,
            particleCount,
            origin: { x: randomInRange(0.1, 0.3), y: Math.random() - 0.2 },
          })
          confetti({
            ...defaults,
            particleCount,
            origin: { x: randomInRange(0.7, 0.9), y: Math.random() - 0.2 },
          })
        }, 250)
      }
    } else if (status === 'lost' && prevStatus.current !== 'lost') {
      soundEffects.playExplosion()
    }

    prevStatus.current = status
  }, [status])

  // 切换音效
  const toggleSound = () => {
    const newState = !soundEnabled
    setSoundEnabled(newState)
    soundEffects.setEnabled(newState)
  }

  // 重置游戏
  const handleReset = () => {
    setTime(0)
    confettiTriggered.current = false
    reset()
  }

  const handleRowsChange = (value: string) => {
    if (value === '') {
      setRowsInput('')
      return
    }

    const numeric = Number(value)
    if (Number.isNaN(numeric)) return

    setRowsInput(String(Math.min(MAX_ROWS, Math.max(0, numeric))))
  }

  const handleColsChange = (value: string) => {
    if (value === '') {
      setColsInput('')
      return
    }

    const numeric = Number(value)
    if (Number.isNaN(numeric)) return

    setColsInput(String(Math.min(MAX_COLS, Math.max(0, numeric))))
  }

  const handleMinesChange = (value: string) => {
    if (value === '') {
      setMinesInput('')
      return
    }

    const numeric = Number(value)
    if (Number.isNaN(numeric)) return

    const maxMines = rowsValue * colsValue - 1
    setMinesInput(String(Math.min(maxMines, Math.max(0, numeric))))
  }

  // 应用自定义设置
  const handleApplySettings = () => {
    const nextConfig: GameConfig = {
      rows: rowsValue,
      cols: colsValue,
      mines: minesValue,
    }

    setRowsInput(String(nextConfig.rows))
    setColsInput(String(nextConfig.cols))
    setMinesInput(String(nextConfig.mines))
    setConfig(nextConfig)
    setTime(0)
    confettiTriggered.current = false
    reset(nextConfig)
  }

  const handleUseRecommendation = () => {
    setMinesInput(String(recommendedMines))
  }

  // 格式化数字为 LED 显示格式
  const formatLED = (num: number) => {
    return num.toString().padStart(3, '0')
  }

  return (
    <div
      className={cn(
        'min-h-screen w-full flex flex-col items-center justify-center p-2 sm:p-4 md:p-8',
        'bg-gradient-to-br from-gray-900 via-purple-900/20 to-gray-900',
        'transition-all duration-500',
        status === 'lost' && 'animate-shake bg-gradient-to-br from-red-900/50 via-gray-900 to-red-900/50'
      )}
    >
      {/* 动态背景 */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-1/2 -left-1/2 w-full h-full bg-gradient-to-br from-purple-500/10 to-transparent rounded-full blur-3xl animate-pulse" />
        <div className="absolute -bottom-1/2 -right-1/2 w-full h-full bg-gradient-to-tl from-cyan-500/10 to-transparent rounded-full blur-3xl animate-pulse [animation-delay:1s]" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-1/2 h-1/2 bg-gradient-to-r from-pink-500/5 to-blue-500/5 rounded-full blur-3xl animate-pulse [animation-delay:2s]" />
      </div>

      {/* 主容器 */}
      <motion.div
        className="relative z-10 flex flex-col items-center gap-3 sm:gap-4 md:gap-6 w-full max-w-fit"
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5 }}
      >
        {/* 标题 */}
        <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-purple-400 via-pink-400 to-cyan-400">
          Minesweeper Pro
        </h1>

        {/* 自定义棋盘设置 */}
        <motion.div
          className="w-full max-w-2xl p-3 sm:p-4 rounded-xl bg-gray-900/50 border border-gray-700/60 backdrop-blur-xl shadow-inner shadow-black/40"
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <label className="flex flex-col gap-1 text-xs uppercase tracking-wide text-gray-400">
              高度（行）
              <input
                type="number"
                min={MIN_ROWS}
                max={MAX_ROWS}
                value={rowsInput}
                onChange={(e) => handleRowsChange(e.target.value)}
                className="rounded-lg border border-gray-600 bg-gray-800/60 px-3 py-2 text-sm text-gray-100 focus:border-purple-400 focus:ring-1 focus:ring-purple-400 outline-none"
              />
              <span className="text-[11px] text-gray-500">{MIN_ROWS}-{MAX_ROWS}</span>
            </label>

            <label className="flex flex-col gap-1 text-xs uppercase tracking-wide text-gray-400">
              宽度（列）
              <input
                type="number"
                min={MIN_COLS}
                max={MAX_COLS}
                value={colsInput}
                onChange={(e) => handleColsChange(e.target.value)}
                className="rounded-lg border border-gray-600 bg-gray-800/60 px-3 py-2 text-sm text-gray-100 focus:border-purple-400 focus:ring-1 focus:ring-purple-400 outline-none"
              />
              <span className="text-[11px] text-gray-500">{MIN_COLS}-{MAX_COLS}</span>
            </label>

            <label className="flex flex-col gap-1 text-xs uppercase tracking-wide text-gray-400">
              地雷数量
              <input
                type="number"
                min={1}
                max={rowsValue * colsValue - 1}
                value={minesInput}
                onChange={(e) => handleMinesChange(e.target.value)}
                className="rounded-lg border border-gray-600 bg-gray-800/60 px-3 py-2 text-sm text-gray-100 focus:border-purple-400 focus:ring-1 focus:ring-purple-400 outline-none"
              />
              <span className="text-[11px] text-gray-500">最多 {rowsValue * colsValue - 1}</span>
            </label>
          </div>

          <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="text-sm text-gray-400">
              推荐地雷数：{' '}
              <span className="font-mono text-purple-300">{recommendedMines}</span>
              <span className="text-gray-500">（约 {Math.round((recommendedMines / (rowsValue * colsValue)) * 100)}% 密度）</span>
            </div>

            <div className="flex gap-2">
              <button
                onClick={handleUseRecommendation}
                className="px-3 py-1.5 rounded-lg border border-purple-500/40 text-xs sm:text-sm text-purple-200 hover:bg-purple-500/10 transition-colors"
              >
                使用推荐值
              </button>
              <button
                onClick={handleApplySettings}
                className="px-3 sm:px-4 py-1.5 sm:py-2 rounded-lg bg-gradient-to-r from-purple-500/70 to-cyan-500/70 text-xs sm:text-sm font-semibold text-white shadow-lg shadow-purple-500/30 hover:shadow-cyan-500/30 transition-transform hover:-translate-y-0.5"
              >
                应用设置
              </button>
            </div>
          </div>

          <p className="mt-2 text-xs text-gray-500">
            当前棋盘：{config.rows} × {config.cols} ，地雷 {config.mines} 枚
          </p>
        </motion.div>

        {/* 状态栏 */}
        <div className="flex items-center gap-2 sm:gap-4 md:gap-6 p-2 sm:p-3 md:p-4 rounded-lg sm:rounded-xl bg-gray-900/60 backdrop-blur-lg border border-gray-700/50">
          {/* 剩余地雷数 */}
          <div className="flex items-center gap-1.5 sm:gap-2">
            <Bomb className="w-4 h-4 sm:w-5 sm:h-5 text-red-400" />
            <span className="font-mono text-base sm:text-xl md:text-2xl text-red-400 tracking-wider drop-shadow-[0_0_10px_rgba(248,113,113,0.6)]">
              {formatLED(Math.max(0, remainingMines))}
            </span>
          </div>

          {/* 重置按钮 */}
          <motion.button
            onClick={handleReset}
            className="p-1.5 sm:p-2 md:p-3 rounded-md sm:rounded-lg bg-gray-800/80 border border-gray-600/50 hover:bg-gray-700/80 hover:border-gray-500/50 transition-colors"
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9, rotate: -180 }}
            transition={{ type: 'spring', stiffness: 400, damping: 17 }}
          >
            <RotateCcw className="w-4 h-4 sm:w-5 sm:h-5 md:w-6 md:h-6 text-gray-300" />
          </motion.button>

          {/* 音效开关 */}
          <motion.button
            onClick={toggleSound}
            className="p-1.5 sm:p-2 md:p-3 rounded-md sm:rounded-lg bg-gray-800/80 border border-gray-600/50 hover:bg-gray-700/80 hover:border-gray-500/50 transition-colors"
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
          >
            {soundEnabled ? (
              <Volume2 className="w-4 h-4 sm:w-5 sm:h-5 md:w-6 md:h-6 text-cyan-400" />
            ) : (
              <VolumeX className="w-4 h-4 sm:w-5 sm:h-5 md:w-6 md:h-6 text-gray-500" />
            )}
          </motion.button>

          {/* 计时器 */}
          <div className="flex items-center gap-1.5 sm:gap-2">
            <Timer className="w-4 h-4 sm:w-5 sm:h-5 text-cyan-400" />
            <span className="font-mono text-base sm:text-xl md:text-2xl text-cyan-400 tracking-wider drop-shadow-[0_0_10px_rgba(34,211,238,0.6)]">
              {formatLED(time)}
            </span>
          </div>
        </div>

        {/* 游戏棋盘 */}
        <Board
          board={board}
          status={status}
          onOpenCell={openCell}
          onFlagCell={toggleFlag}
          onChordCell={chordOpen}
        />

        {/* 移动端提示 */}
        <p className="text-xs text-gray-500 text-center sm:hidden">
          Long press to flag
        </p>

        {/* 游戏结果弹窗 */}
        <AnimatePresence>
          {(status === 'won' || status === 'lost') && (
            <motion.div
              className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={handleReset}
            >
              <motion.div
                className={cn(
                  'p-6 sm:p-8 md:p-12 rounded-xl sm:rounded-2xl text-center max-w-sm w-full',
                  'backdrop-blur-xl border shadow-2xl',
                  status === 'won'
                    ? 'bg-green-900/40 border-green-500/50 shadow-green-500/20'
                    : 'bg-red-900/40 border-red-500/50 shadow-red-500/20'
                )}
                initial={{ scale: 0.5, opacity: 0, y: 50 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                exit={{ scale: 0.5, opacity: 0, y: 50 }}
                transition={{ type: 'spring', stiffness: 300, damping: 25 }}
                onClick={(e) => e.stopPropagation()}
              >
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ delay: 0.2, type: 'spring', stiffness: 400, damping: 20 }}
                >
                  {status === 'won' ? (
                    <Trophy className="w-12 h-12 sm:w-16 sm:h-16 md:w-20 md:h-20 mx-auto text-yellow-400 drop-shadow-[0_0_20px_rgba(250,204,21,0.8)]" />
                  ) : (
                    <Skull className="w-12 h-12 sm:w-16 sm:h-16 md:w-20 md:h-20 mx-auto text-red-400 drop-shadow-[0_0_20px_rgba(248,113,113,0.8)]" />
                  )}
                </motion.div>

                <motion.h2
                  className={cn(
                    'mt-3 sm:mt-4 text-2xl sm:text-3xl md:text-4xl font-bold',
                    status === 'won'
                      ? 'text-green-400 drop-shadow-[0_0_20px_rgba(74,222,128,0.8)]'
                      : 'text-red-400 drop-shadow-[0_0_20px_rgba(248,113,113,0.8)]'
                  )}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 }}
                >
                  {status === 'won' ? 'Victory!' : 'Game Over'}
                </motion.h2>

                <motion.p
                  className="mt-2 text-sm sm:text-base text-gray-400"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.4 }}
                >
                  {status === 'won'
                    ? `Completed in ${time} seconds`
                    : 'Better luck next time!'}
                </motion.p>

                <motion.button
                  className={cn(
                    'mt-4 sm:mt-6 px-4 sm:px-6 py-2 rounded-lg text-sm sm:text-base font-medium',
                    'transition-colors duration-200',
                    status === 'won'
                      ? 'bg-green-500/20 text-green-300 border border-green-500/50 hover:bg-green-500/30'
                      : 'bg-red-500/20 text-red-300 border border-red-500/50 hover:bg-red-500/30'
                  )}
                  onClick={handleReset}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.5 }}
                >
                  Play Again
                </motion.button>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  )
}

export default App
