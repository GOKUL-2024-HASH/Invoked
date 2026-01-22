
export interface PedagogicalGuidance {
  doNow: string;
  timeEstimate: string;
  explainLikeThis: string;
  tryThisActivity: string;
  rationale: string;
  badges: string[];
  alternativeStrategy: string;
  reinforcingAction: string;
  backupAction: string;
}

export type AppState = 'IDLE' | 'LOADING' | 'SUCCESS' | 'FALLBACK';
