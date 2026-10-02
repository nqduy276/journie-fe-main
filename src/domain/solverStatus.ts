import type { SolverStatus } from './types'

/** The solver's verdicts as people read them; the raw enum (`FEASIBLE`) is only for the data layer. */
export const SOLVER_STATUS_LABEL: Record<SolverStatus, [vi: string, en: string]> = {
  OPTIMAL: ['Tối ưu', 'Optimal'],
  FEASIBLE: ['Khả thi', 'Feasible'],
  INFEASIBLE: ['Không khả thi', 'Infeasible'],
}
