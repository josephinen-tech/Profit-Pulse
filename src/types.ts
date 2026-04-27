export interface Project {
  id: string;
  uid?: string;
  name: string;
  client: string;
  budget: number;
  estimatedHours: number;
  actualHours: number;
  status: 'active' | 'completed' | 'on-hold';
  deadline?: number;
  createdAt: number;
  githubRepo?: string; // e.g. "owner/repo"
  resourceCosts?: ResourceCost[];
  achievements?: string;
  paymentStatus: 'unpaid' | 'paid' | 'partially-paid';
}

export interface ResourceCost {
  id: string;
  name: string;
  amount: number;
}

export interface TimeEntry {
  id: string;
  uid?: string;
  projectId: string;
  hours: number;
  date: number;
  description: string;
}

export interface Transaction {
  id: string;
  uid: string;
  amount: number;
  date: number;
  description: string;
  type: 'mpesa' | 'manual';
  projectId?: string;
}

export interface DashboardStats {
  totalEarned: number;
  totalHours: number;
  avgHourlyRate: number;
  projectCount: number;
}
