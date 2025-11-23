import { useState, useCallback } from 'react'

// 类型定义
export interface Cell {
  row: number
  col: number
  isOpen: boolean
  isFlagged: boolean
  isMine: boolean
  neighborCount: number
}

export type GameStatus = 'idle' | 'playing' | 'won' | 'lost'

export interface GameConfig {
  rows: number
  cols: number
  mines: number
}

export interface MinesweeperState {
  board: Cell[][]
  status: GameStatus
  flagCount: number
  config: GameConfig
}

// 预设难度
export const DIFFICULTY_PRESETS = {
  beginner: { rows: 9, cols: 9, mines: 10 },
  intermediate: { rows: 16, cols: 16, mines: 40 },
  expert: { rows: 16, cols: 30, mines: 99 },
} as const

// 八个方向的偏移量
const DIRECTIONS = [
  [-1, -1], [-1, 0], [-1, 1],
  [0, -1],          [0, 1],
  [1, -1],  [1, 0], [1, 1],
]

export function useMinesweeper(initialConfig: GameConfig = DIFFICULTY_PRESETS.beginner) {
  const [state, setState] = useState<MinesweeperState>(() => ({
    board: createEmptyBoard(initialConfig.rows, initialConfig.cols),
    status: 'idle',
    flagCount: 0,
    config: initialConfig,
  }))

  // 创建空白棋盘
  function createEmptyBoard(rows: number, cols: number): Cell[][] {
    return Array.from({ length: rows }, (_, row) =>
      Array.from({ length: cols }, (_, col) => ({
        row,
        col,
        isOpen: false,
        isFlagged: false,
        isMine: false,
        neighborCount: 0,
      }))
    )
  }

  // 检查坐标是否在棋盘范围内
  function isValidCell(row: number, col: number, rows: number, cols: number): boolean {
    return row >= 0 && row < rows && col >= 0 && col < cols
  }

  // 获取相邻格子
  function getNeighbors(row: number, col: number, board: Cell[][]): Cell[] {
    const neighbors: Cell[] = []
    const rows = board.length
    const cols = board[0].length

    for (const [dr, dc] of DIRECTIONS) {
      const newRow = row + dr
      const newCol = col + dc
      if (isValidCell(newRow, newCol, rows, cols)) {
        neighbors.push(board[newRow][newCol])
      }
    }

    return neighbors
  }

  // 放置地雷（避开第一次点击的位置及其周围）
  function placeMines(
    board: Cell[][],
    excludeRow: number,
    excludeCol: number,
    mineCount: number
  ): void {
    const rows = board.length
    const cols = board[0].length

    // 创建排除区域（第一次点击的格子及其周围）
    const excludeSet = new Set<string>()
    excludeSet.add(`${excludeRow},${excludeCol}`)
    for (const [dr, dc] of DIRECTIONS) {
      const newRow = excludeRow + dr
      const newCol = excludeCol + dc
      if (isValidCell(newRow, newCol, rows, cols)) {
        excludeSet.add(`${newRow},${newCol}`)
      }
    }

    // 收集所有可放置地雷的位置
    const availablePositions: [number, number][] = []
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        if (!excludeSet.has(`${r},${c}`)) {
          availablePositions.push([r, c])
        }
      }
    }

    // 随机选择地雷位置
    const actualMineCount = Math.min(mineCount, availablePositions.length)
    for (let i = 0; i < actualMineCount; i++) {
      const randomIndex = Math.floor(Math.random() * availablePositions.length)
      const [r, c] = availablePositions[randomIndex]
      board[r][c].isMine = true
      availablePositions.splice(randomIndex, 1)
    }

    // 计算每个格子周围的地雷数
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        if (!board[r][c].isMine) {
          const neighbors = getNeighbors(r, c, board)
          board[r][c].neighborCount = neighbors.filter(n => n.isMine).length
        }
      }
    }
  }

  // Flood Fill 算法：递归打开空白格子
  function floodFill(board: Cell[][], row: number, col: number): void {
    const cell = board[row][col]

    // 如果已经打开或已插旗，则不处理
    if (cell.isOpen || cell.isFlagged) return

    // 打开当前格子
    cell.isOpen = true

    // 如果周围没有地雷，递归打开相邻格子
    if (cell.neighborCount === 0 && !cell.isMine) {
      const neighbors = getNeighbors(row, col, board)
      for (const neighbor of neighbors) {
        floodFill(board, neighbor.row, neighbor.col)
      }
    }
  }

  // 检查是否胜利
  function checkWin(board: Cell[][]): boolean {
    for (const row of board) {
      for (const cell of row) {
        // 如果存在未打开且不是地雷的格子，则未胜利
        if (!cell.isOpen && !cell.isMine) {
          return false
        }
      }
    }
    return true
  }

  // 打开格子
  const openCell = useCallback((row: number, col: number) => {
    setState(prevState => {
      const { board, status, config } = prevState

      // 游戏已结束则不处理
      if (status === 'won' || status === 'lost') return prevState

      const cell = board[row][col]

      // 已打开或已插旗则不处理
      if (cell.isOpen || cell.isFlagged) return prevState

      // 深拷贝棋盘
      const newBoard = board.map(r => r.map(c => ({ ...c })))

      // 第一次点击：放置地雷
      if (status === 'idle') {
        placeMines(newBoard, row, col, config.mines)
      }

      const targetCell = newBoard[row][col]

      // 点到地雷，游戏结束
      if (targetCell.isMine) {
        targetCell.isOpen = true
        // 显示所有地雷
        for (const r of newBoard) {
          for (const c of r) {
            if (c.isMine) c.isOpen = true
          }
        }
        return {
          ...prevState,
          board: newBoard,
          status: 'lost',
        }
      }

      // 使用 Flood Fill 打开格子
      floodFill(newBoard, row, col)

      // 检查胜利
      const won = checkWin(newBoard)

      return {
        ...prevState,
        board: newBoard,
        status: won ? 'won' : 'playing',
      }
    })
  }, [])

  // 切换旗帜
  const toggleFlag = useCallback((row: number, col: number) => {
    setState(prevState => {
      const { board, status } = prevState

      // 游戏未开始或已结束则不处理
      if (status === 'idle' || status === 'won' || status === 'lost') return prevState

      const cell = board[row][col]

      // 已打开则不处理
      if (cell.isOpen) return prevState

      // 深拷贝棋盘
      const newBoard = board.map(r => r.map(c => ({ ...c })))
      const targetCell = newBoard[row][col]

      targetCell.isFlagged = !targetCell.isFlagged

      return {
        ...prevState,
        board: newBoard,
        flagCount: prevState.flagCount + (targetCell.isFlagged ? 1 : -1),
      }
    })
  }, [])

  // 快速打开（双击已打开的数字格，如果周围旗帜数等于数字，则打开周围未打开的格子）
  const chordOpen = useCallback((row: number, col: number) => {
    setState(prevState => {
      const { board, status } = prevState

      // 游戏未开始或已结束则不处理
      if (status !== 'playing') return prevState

      const cell = board[row][col]

      // 未打开或没有相邻地雷则不处理
      if (!cell.isOpen || cell.neighborCount === 0) return prevState

      const neighbors = getNeighbors(row, col, board)
      const flaggedCount = neighbors.filter(n => n.isFlagged).length

      // 旗帜数不等于数字则不处理
      if (flaggedCount !== cell.neighborCount) return prevState

      // 深拷贝棋盘
      const newBoard = board.map(r => r.map(c => ({ ...c })))

      let hitMine = false

      // 打开所有未插旗的相邻格子
      for (const neighbor of neighbors) {
        if (!neighbor.isFlagged && !neighbor.isOpen) {
          const targetCell = newBoard[neighbor.row][neighbor.col]
          if (targetCell.isMine) {
            hitMine = true
            targetCell.isOpen = true
          } else {
            floodFill(newBoard, neighbor.row, neighbor.col)
          }
        }
      }

      // 如果踩到地雷
      if (hitMine) {
        for (const r of newBoard) {
          for (const c of r) {
            if (c.isMine) c.isOpen = true
          }
        }
        return {
          ...prevState,
          board: newBoard,
          status: 'lost',
        }
      }

      // 检查胜利
      const won = checkWin(newBoard)

      return {
        ...prevState,
        board: newBoard,
        status: won ? 'won' : 'playing',
      }
    })
  }, [])

  // 重新开始游戏
  const reset = useCallback((newConfig?: GameConfig) => {
    const config = newConfig || state.config
    setState({
      board: createEmptyBoard(config.rows, config.cols),
      status: 'idle',
      flagCount: 0,
      config,
    })
  }, [state.config])

  // 计算剩余地雷数
  const remainingMines = state.config.mines - state.flagCount

  return {
    board: state.board,
    status: state.status,
    flagCount: state.flagCount,
    remainingMines,
    config: state.config,
    openCell,
    toggleFlag,
    chordOpen,
    reset,
  }
}
