
export type Role = "agent" | "chaos";
export type MissionStatus = "active" | "completed" | "guessed" | "cancelled" | "failed";

export type AssignedMission = {
  missionId: string;
  text: string;
  points: number;
  x?: string;
  y?: string;
  status: MissionStatus;
  assignedAt: number;
};

export type Player = {
  id: string;
  name: string;
  role: Role;
  score: number;
  accusationTokens: number;
  completedMissionCount?: number;
  currentMission?: AssignedMission;
  chaosSince?: number;
  chaosActivatesAt?: number;
  isHost?: boolean;
};

export type GameLog = {
  id: string;
  time: number;
  text: string;
};

export type GameState = {
  players: Player[];
  logs: GameLog[];
  usedMissionIds: string[];
  startedAt?: number;
};
